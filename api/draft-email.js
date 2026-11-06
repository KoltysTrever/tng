// TNG Lead Scoring — drafts a short outreach email from what a lookup found: a calm, professional
// introduction (the team's own edited email is the model), for the sender to read, edit and send themselves
// from Outlook. Nothing is sent from here. No Apollo credits; one Claude call (about 1 to 2 cents).
// Body: { angle, contact: { name, title }, company: {..., healthcare, licensed_state},
//         events: [...], in_zoho, brief: { opportunity, signal, why_tng, first_move, draft } }
// The page never sends site visits or security incidents: neither belongs in an email.

import { guard } from '../lib/guard.js';
import { claudeErrorMessage } from '../lib/claude-error.js';

const MODEL = 'claude-sonnet-5-5';
const ANGLES = {
  trigger: 'TRIGGER EVENT: after saying who you are, connect the reason for writing to the most relevant recent event in FACTS, mentioned plainly and respectfully (e.g. "I saw the announcement about the new facility in ..."), and the security planning that kind of change usually involves.',
  intro: 'GENERAL INTRODUCTION: no news hook. After saying who you are, name the kind of situation TNG helps organizations like theirs prepare for, chosen for the contact\'s role.',
  followup: 'FOLLOW-UP: a short, courteous follow-up to an earlier introduction they may have missed. 40 to 70 words. Restate in one sentence what TNG helps with, and repeat the soft ask.',
  reengage: "RE-ENGAGE: the company already has some relationship with TNG (it is in TNG's CRM). A short, courteous check-in that doesn't explain TNG from scratch and doesn't invent any history, meetings or names.",
};

// The voice to write in: calm, courteous and professional. Example A is the team's own edit of a
// draft; company details are [placeholders], so nothing from the examples can end up in a draft.
const STYLE_EXAMPLES = `EXAMPLE A (general introduction, to an HR leader; written by the team)
Hi [First name],

I'm reaching out from The North Group regarding how organizations prepare for sensitive workplace situations, particularly those involving employee safety or potentially difficult separations.

We work with HR and leadership teams to help manage these situations through advance planning, on-site support when needed, and threat assessments when concerns arise involving employees or executives. Our goal is to provide experienced resources that complement existing HR procedures and help organizations respond appropriately.

I wanted to introduce our team and see whether these are areas [Company] currently manages internally or where outside support might be helpful.

Would you be open to a brief introductory conversation in the coming weeks?

EXAMPLE B (trigger event, to an operations leader at a company opening a new site)
Hi [First name],

I'm with The North Group, and I saw the announcement about [Company]'s new [site] in [city]. Projects like that usually bring a round of security planning, from access and staffing to how the site is covered while it's being built.

Our team supports operations and facilities leaders through that process with site assessments early on, security coverage during construction, and staffed or embedded programs once the site opens, designed to fit alongside the team you already have.

I'd like to learn how [Company] is approaching security for the new site and whether outside support would be useful.

Would you be open to a short introductory call in the coming weeks?`;

const TNG_SERVICES = [
  ['Executive Protection', 'principals and executives in the public eye: a new or high-profile CEO, layoffs or controversy aimed at leadership, executive travel and events'],
  ['Private Client Security Program', 'family offices, high-net-worth families and estates: residential and family security, household staff, travel'],
  ['Protective Intelligence', 'threats aimed at named people or the organization: a protective intelligence watch, threat management for named people, monitoring around a public announcement'],
  ['Embedded Services', 'a security program run inside the client: hospitals and clinician groups (workplace violence, de-escalation training, incident investigation, an annual risk review), new or growing sites once they open'],
  ['Security Guard Services', 'staffed coverage: a new or expanded facility, construction sites during the build, multi-site operations, strikes or protests'],
  ['Workplace Termination Support', 'layoffs, restructurings and high-risk terminations: planning and on-site security for the day'],
  ['Global Security Operations Center (GSOC)', '24/7 monitoring, travel tracking, alerts and incident management, often alongside an embedded program'],
  ['Risk Mitigation Strategies', 'threat and vulnerability assessments and security master plans, best done at design before a site is built or licensed'],
  ['Emergency Preparedness Exercises', 'tabletop and live exercises before an opening, a large event or a regulatory review'],
  ['Event Security', 'conferences, concerts, shareholder meetings and other large or public events'],
  ['Secure Asset Transport', 'armed transport of cash, valuables or sensitive material (banks, credit unions, high-value goods)'],
  ['Cybersecurity', 'only when FACTS point to a cyber or data-security need'],
];

// The only claims about TNG a draft may make, as TNG states them.
const TNG_FACTS = [
  'The North Group is a veteran-owned security and intelligence firm. Mention it only if it helps, in a few words. Say "licensed in <state>" only when FACTS.company.tng_licensed_state names the state and the email is about work there.',
  'Healthcare result, only for healthcare companies and only if it truly helps: TNG\'s embedded program at a Level III trauma center ED has cut workplace violence by 85 to 90 percent since 2021. One short sentence at most.',
];

const SCHEMA = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    body: { type: 'string' },
    why_now: { type: 'string' },
    services: { type: 'array', items: { type: 'string' } },
  },
  required: ['subject', 'body', 'why_now', 'services'],
  additionalProperties: false,
};

const clip = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const clipBlock = (v, max) => String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, max);

function buildPrompt(input) {
  const facts = JSON.stringify(input, null, 2);
  return `You are drafting a first-touch email from someone at The North Group (TNG), a security and intelligence firm, to a person at another company. The sender will read and edit it in Outlook and send it themselves; Outlook adds their signature.

VOICE: a calm, courteous, professional introduction, the way the team writes. The examples below show the tone and structure only; their [brackets] stand for facts that, in a real email, come from FACTS.

${STYLE_EXAMPLES}

Do not copy the examples. Write every sentence new for this contact and situation; never reuse a phrase of five or more words from them. Vary how you open, describe TNG and ask, while keeping the same tone and shape.

What makes that voice:
- Start with "Hi <first name>," on its own line.
- First paragraph: who is writing (from The North Group) and why, in one or two sentences, tied to a situation that fits the contact's role or, for a trigger event, the news.
- Second paragraph: how TNG helps with that, as the work itself (planning, on-site support, assessments, coverage), described in plain words, and framed as complementing their existing team and procedures.
- Third paragraph: a respectful question about how they handle this today (internally, or where outside support might help). Never imply they are unprepared or doing it wrong.
- Last line: a soft ask for a brief introductory conversation or call "in the coming weeks". Never propose a specific day, date or week unless it comes from FACTS.
- Measured language: nothing dramatic or alarming ("ugly", "crisis", "nightmare", "when it hits"), no hype, no superlatives, no exclamation marks, no buzzwords (leverage, robust, cutting-edge, seamless, best-in-class, game-changer, solutions).
- Never recite their headcount, headquarters, client list or service lines, and never name their job title back to them. Use a company detail only when it makes the email more relevant.
- No sign-off and no name at the end: the signature follows.
- 80 to 130 words in the body (40 to 70 for a follow-up). Count before you answer and cut if over.

ANGLE: ${ANGLES[input.angle]}

FACTS (the only facts about the company and contact you may use; anything not here is unknown):
${facts}

TNG SERVICES (the only services you may offer, with the situations each answers). Pick the one or two that fit THIS company's situation, the reason for writing and the contact's role, and describe them in plain words:
${TNG_SERVICES.map(([name, fit]) => `- ${name}: ${fit}`).join('\n')}

Role fit: an executive's Chief of Staff, Executive Assistant or House/Estate Manager points to Executive Protection or the Private Client Security Program; HR points to Workplace Termination Support and threat assessment (Protective Intelligence) or workplace-violence prevention (Embedded Services); security, risk or facilities leaders point to Embedded Services, Risk Mitigation Strategies or the GSOC; a CEO or COO can hear the whole picture briefly.

TNG FACTS (the only claims about TNG you may make, all optional):
${TNG_FACTS.map((f) => '- ' + f).join('\n')}

Hard rules:
- Every name, place, date and number in the email must come from FACTS or the TNG FACTS. Never invent facts, figures, events, clients, dates, or anything about the contact beyond their name and title.
- Never claim anything about the sender: where they will be, what they attended, who they know, what other clients they have.
- Never mention website visits, tracking, data providers, CRMs, scores, rankings, a "pipeline", or that they are a "lead". Never mention security incidents at their company.
- If brief.draft is given, it is a colleague's earlier draft: use its facts only if they are also in FACTS, and write in the voice above.
- Subject: 3 to 7 plain, professional words, no question marks, no clickbait.
- why_now: one short internal note (not part of the email) saying what the email is based on: the fact from FACTS and, if FACTS give one, its date.
- services: the TNG SERVICES names the email offers, exactly as listed.

Return JSON with subject, body (plain text with \\n line breaks), why_now and services.`;
}

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  const b = req.body || {};
  const angle = ANGLES[b.angle] ? b.angle : 'intro';
  const contact = b.contact || {};
  if (!clip(contact.name, 80)) return res.status(400).json({ error: 'Choose who the email is to' });
  const company = b.company || {};
  if (!clip(company.name, 200)) return res.status(400).json({ error: 'No company to write about' });

  const input = {
    angle,
    contact: { name: clip(contact.name, 80), title: clip(contact.title, 120) },
    company: {
      name: clip(company.name, 200), website: clip(company.domain, 120), industry: clip(company.industry, 120),
      employees: Number(company.employees) || null, headquarters: clip(company.headquarters, 160),
      description: clip(company.description, 900),
      healthcare: !!company.healthcare,
      tng_licensed_state: clip(company.licensed_state, 40) || null,
    },
    events: (Array.isArray(b.events) ? b.events : []).slice(0, 5).map((e) => ({
      date: clip(e.date, 20), kind: clip(e.kind, 60), summary: clip(e.summary, 400), suggested_service: clip(e.service, 120),
    })),
    already_known_to_tng: !!b.in_zoho,
    brief: b.brief ? {
      opportunity: clip(b.brief.opportunity, 300), signal: clip(b.brief.signal, 400), why_tng: clip(b.brief.why_tng, 400),
      first_move: clip(b.brief.first_move, 300), draft: clipBlock(b.brief.draft, 2500),
    } : null,
  };
  if (angle === 'trigger' && !input.events.length && !(input.brief && input.brief.signal)) {
    return res.status(400).json({ error: 'There is no recent trigger event to write about. Pick another angle.' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY env var' });

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      signal: AbortSignal.timeout(55000),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        messages: [{ role: 'user', content: buildPrompt(input) }],
      }),
    });
    if (!resp.ok) throw new Error(claudeErrorMessage('Claude API error', resp.status, await resp.text()));
    const data = await resp.json();
    if (data.stop_reason === 'refusal') throw new Error('Claude declined to write this email');
    const out = JSON.parse((data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(''));
    const known = new Set(TNG_SERVICES.map(([name]) => name));
    return res.status(200).json({
      subject: clip(out.subject, 150),
      body: clipBlock(out.body, 3000).replace(/\n{3,}/g, '\n\n'),
      why_now: clip(out.why_now, 200),
      services: (Array.isArray(out.services) ? out.services : []).filter((s) => known.has(s)).slice(0, 4),
    });
  } catch (err) {
    console.error('draft-email error:', err);
    return res.status(502).json({ error: err.message || "Couldn't write the draft" });
  }
}
