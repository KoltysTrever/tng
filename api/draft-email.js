// TNG Lead Scoring — drafts a short outreach email from what a lookup found, in the voice of
// TNG's CEO, for a person to read, edit and send themselves from Outlook. Nothing is sent from
// here. No Apollo credits; one Claude call (about 1 to 2 cents).
// Body: { angle, contact: { name, title }, company: {..., healthcare, licensed_state},
//         events: [...], in_zoho, brief: { opportunity, signal, why_tng, first_move, draft } }
// The page never sends site visits or security incidents: neither belongs in an email.

import { guard } from '../lib/guard.js';
import { claudeErrorMessage } from '../lib/claude-error.js';

const MODEL = 'claude-sonnet-5-5';
const ANGLES = {
  trigger: 'TRIGGER EVENT: open with the most relevant recent event from FACTS (what happened, with the specifics given: places, numbers, dates), then one short line on what it means for their security, and build the email from there.',
  intro: 'GENERAL INTRODUCTION: no news hook. Open with what is specific about the company from FACTS (what it runs, where, at what scale), then one short line on the security question that comes with that.',
  followup: 'FOLLOW-UP: a short follow-up to an earlier note they may have missed. 60 to 90 words, one or two paragraphs. Restate the one reason TNG is relevant in a sentence, and make the ask smaller.',
  reengage: "RE-ENGAGE: the company already has some relationship with TNG (it is in TNG's CRM). A short check-in that does not explain TNG from scratch and does not invent any history, meetings or names.",
};

// TNG's CEO wrote these. They set the voice. Every name, place, date and number of the
// companies they were written to is a [placeholder], so nothing from them can end up in a
// draft; only TNG's own facts (the proof point) are left as written.
const STYLE_EXAMPLES = `EXAMPLE 1
Dr. [Last name],

You are on the [conference] faculty on [date] for the [topic] update. [Group] now covers [number] emergency departments across [Hospital system A], [Hospital system B] and [Hospital system C], and every one of those contracts renews on the strength of your clinicians staying put.

The North Group builds resident security programs for the group, not just the hospital: threat management for named clinicians, a protective intelligence watch, de-escalation training and incident investigation, with an annual risk review your hospital partners can see. At a Level III trauma center ED with 72,000-plus annual visits, our embedded program has run since 2021 and cut workplace violence by 85 to 90 percent. That ED is staffed by an independent physician-owned group like yours.

Could I have 20 minutes after your session, or a coffee at [the next event they attend]?

EXAMPLE 2
Good morning,

The purchase agreement for up to [number] acres at [site] is now public, and [City]'s mayor has described the project as [project type]. A [type of facility] carries [the regulatory security requirements it brings], controlled-access zones, and a community that will watch the site from the first survey stake. Security decided at design is cheap. Security retrofitted after licensing is not.

The North Group is a service-disabled veteran-owned firm licensed in [state]. We deliver the threat and vulnerability assessment and security master plan at design, construction-site coverage during the build, and an embedded program with 24/7 operations center support once material arrives.

Our work ranges from executive protection for public-company principals to an embedded program at a regional medical center that cut workplace violence 85 to 90 percent. The common thread is discretion and documentation, not visible force.

Could we take 20 minutes to align the security plan with your site timeline before the layout is locked?

EXAMPLE 3 (its first line was cut off)
...on [newest location]. With [location A], [location B] and now [location C], [Group] has opened [number] emergency departments in [number] months, each with a new medical director and a recruiting push behind it. New contracts are kept on clinician retention, and retention is decided on the worst shift of the month.

The North Group builds clinician-safety programs that travel with a group from contract to contract: threat management for named clinicians, a protective intelligence watch, de-escalation training and incident investigation, with an annual risk review the hospital can see. At a Level III trauma center ED with 72,000-plus annual visits, our embedded program has run since 2021 and cut workplace violence by 85 to 90 percent. That ED is staffed by an independent physician-owned group.

I would like 20 minutes with you or your COO to show how a portfolio retainer would price across the [Group] family. Would the week of [suggested week] work?`;

// TNG's services, as named on tngdefense.com (the same list the tool scores site visits by),
// each with the situations it answers. The draft names only these.
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
  'The North Group is a service-disabled veteran-owned firm. Say "licensed in <state>" only when FACTS.company.tng_licensed_state names the state, and then use exactly that state.',
  'Healthcare proof point, only when FACTS.company.healthcare is true: "At a Level III trauma center ED with 72,000-plus annual visits, our embedded program has run since 2021 and cut workplace violence by 85 to 90 percent." For a physician group you may add: "That ED is staffed by an independent physician-owned group."',
  'General proof point, any company: "Our work ranges from executive protection for public-company principals to an embedded program at a regional medical center that cut workplace violence 85 to 90 percent. The common thread is discretion and documentation, not visible force."',
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
  return `You are drafting a first-touch business email from The North Group (TNG), a security and intelligence firm, in the voice of its CEO. The sender will read and edit it in Outlook and send it themselves; Outlook adds their signature.

VOICE: follow the CEO's emails below closely: their cadence, structure, length and tone. They are style templates only: each [bracket] stands for a fact that, in a real email, comes from FACTS. Never reuse their sentences or near-copies of them (for example, no "... is cheap. ... is not."): write fresh lines in the same rhythm. Every name, place, date and number in your email must come from FACTS, the TNG FACTS, or FACTS.suggested_week.

${STYLE_EXAMPLES}

What makes that voice:
- Greeting line: the contact's first name followed by a comma (e.g. "Dana,"), or "Good morning," when no name is known. No "Hi", no pleasantries, no "I hope", no "I wanted to reach out".
- Paragraph 1: the specific, public facts about them, stated plainly with their specifics, then one short, sharp line on what is at stake for their security (like "Security decided at design is cheap. Security retrofitted after licensing is not."). That line is reasoning, not a new fact.
- Paragraph 2: what TNG delivers for exactly that situation, as concrete program pieces (often by phase: before, during, after), drawn from TNG SERVICES below. Not adjectives.
- Optional paragraph 3: one proof point from TNG FACTS, only when it clearly strengthens this email (it fits their sector or situation). Leave it out of follow-ups, out of emails to companies under about 200 employees, and whenever the email is already near the word limit. Most emails don't need it.
- Last line: one specific, short ask: 20 minutes for a concrete purpose tied to their situation or timeline, as a question. When no better timing exists, you may propose the week in FACTS.suggested_week (e.g. "Would the week of ${input.suggested_week} work?").
- No sign-off and no name after the ask: the signature follows.
- 110 to 170 words in the body, never more (60 to 90 for a follow-up). Count before you answer and cut if over. Plain, confident, informational. No hype, no superlatives, no exclamation marks.

ANGLE: ${ANGLES[input.angle]}

FACTS (the only facts about the company and contact you may use; anything not here is unknown):
${facts}

TNG SERVICES (the only services you may offer, with the situations each answers). Pick the one to three that fit THIS company's situation, the reason for writing and the contact's role, and describe them as concrete work the way the examples do; you may use the service names, but do not list services that don't fit:
${TNG_SERVICES.map(([name, fit]) => `- ${name}: ${fit}`).join('\n')}

Role fit: an executive's Chief of Staff, Executive Assistant or House/Estate Manager points to Executive Protection or the Private Client Security Program; HR points to Workplace Termination Support or workplace-violence prevention (Embedded Services); security, risk or facilities leaders point to Embedded Services, Risk Mitigation Strategies or the GSOC; a CEO or COO can hear the program as a whole.

TNG FACTS (the only claims about TNG you may make):
${TNG_FACTS.map((f) => '- ' + f).join('\n')}

Hard rules:
- Never invent facts, figures, events, clients, dates, or anything about the contact beyond their name and title.
- Never claim anything about the sender: where they will be, what they attended, who they know.
- Never mention website visits, tracking, data providers, CRMs, scores, rankings, a "pipeline", or that they are a "lead". Never mention security incidents at their company.
- If brief.draft is given, it is a colleague's earlier draft: use its facts only if they are also in FACTS, and write in the voice above.
- Subject: under 8 words, specific to them, plain, no question marks, no clickbait.
- why_now: one short internal note (not part of the email) saying what the email is based on: the fact from FACTS and, if FACTS give one, its date.
- services: the TNG SERVICES names the email offers, exactly as listed.

Return JSON with subject, body (plain text with \\n line breaks), why_now and services.`;
}

// The Monday at least a week away (e.g. "Nov 16"), worked out from today, for an ask that needs a date.
function suggestedWeek(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7));
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
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
    suggested_week: suggestedWeek(),
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
