// TNG Lead Scoring — read a Client Hunter Brief (Steve's daily HTML lead report).
// The page turns the brief into plain text (links kept inline) and posts it here.
// Claude pulls out each ranked and watchlist lead with only the fields that help
// work the lead, and names the buying organization's website so the page can vet
// it with analyze-lead + check-crm. No Apollo credits; one Claude call per brief.

import { guard } from '../lib/guard.js';
import { matchLicensedState } from '../lib/licensing.js';

const MODEL = 'claude-opus-5-5';
const MAX_BRIEF_CHARS = 80000;

const str = { type: 'string' };
const LEAD_SCHEMA = {
  type: 'object',
  properties: {
    section: { type: 'string', enum: ['ranked', 'watchlist'] },
    rank: { type: 'integer' },
    organization: str,
    opportunity: str,
    lane: str,
    division: str,
    steve_score: { type: 'number' },
    score_parts: str,
    rmr: str,
    domain: str,
    domain_confidence: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
    vet: { type: 'boolean' },
    vet_note: str,
    signal: str,
    why_tng: str,
    first_move: str,
    buyers: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: str, title: str, email: str, phone: str },
        required: ['name', 'title', 'email', 'phone'],
        additionalProperties: false,
      },
    },
    value: str,
    deadline: str,
    deadline_date: str,
    site_location: str,
    site_state: str,
    caveats: str,
    sources: {
      type: 'array',
      items: {
        type: 'object',
        properties: { label: str, url: str },
        required: ['label', 'url'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'section', 'rank', 'organization', 'opportunity', 'lane', 'division', 'steve_score',
    'score_parts', 'rmr', 'domain', 'domain_confidence', 'vet', 'vet_note', 'signal',
    'why_tng', 'first_move', 'buyers', 'value', 'deadline', 'deadline_date',
    'site_location', 'site_state', 'caveats', 'sources',
  ],
  additionalProperties: false,
};

const BRIEF_SCHEMA = {
  type: 'object',
  properties: {
    brief_title: str,
    brief_date: str,
    leads: { type: 'array', items: LEAD_SCHEMA },
  },
  required: ['brief_title', 'brief_date', 'leads'],
  additionalProperties: false,
};

function buildPrompt(text) {
  return `Below is a TNG (The North Group, a security services firm) "Client Hunter Brief": a daily business-development report of sales leads. A BD rep will work these leads, and a separate tool will vet each one against Apollo, Zoho CRM and TNG's website traffic, using the buying organization's website domain.

Extract every lead from the ranked leads (table and lead cards together: one entry per lead) and from the watchlist. Skip pipeline updates on earlier leads, the BLUF/summary, run logs, delivery notes and outreach drafts.

For each lead:
- Copy names, titles, emails, phone numbers, dates, dollar figures and scores exactly as the brief states them. Never invent or guess any of these; use "" when the brief doesn't say.
- domain: the official website domain of the organization TNG would pitch or contract with (e.g. "electra.aero", "indygo.net", "va.gov"), not a news site, aggregator, procurement portal or LinkedIn. Prefer a domain the brief itself shows (an email address or the organization's own link). If the brief names a buyer at one company of several (e.g. a developer building for a tenant), use the buyer's company. Use what you know about well-known organizations; set domain_confidence to how sure you are.
- vet: false when there is no single organization to check (unnamed or masked issuer, an industry-wide event, a breach affecting many people) or you can't name its domain with at least medium confidence; say why in vet_note. Otherwise true, with vet_note "".
- signal: at most 2 short sentences: what happened and when, with the key numbers.
- why_tng and first_move: one sentence each.
- buyers: the named people the brief lists as buyers or contacts, with their email and phone when given.
- deadline: the brief's deadline wording ("" if none); deadline_date: that date as YYYY-MM-DD, or "" when there is no specific date.
- site_location: where the work would be (city and state); site_state: that US state's full name ("" if national, unknown or outside the US).
- caveats: anything that blocks or qualifies pursuit (licensing, partner needed, issuer unconfirmed, unverified), "" if none.
- sources: the brief's source links for this lead (label + url).
- For watchlist leads, rank is 0 and fields the brief doesn't give are "".
- steve_score is the brief's score for the lead (0 if none); score_parts is its breakdown text, e.g. "Need 8, Fit 8, Value 8, Access 4", or "".

brief_title and brief_date (YYYY-MM-DD) come from the brief's header.

<brief>
${text}
</brief>`;
}

// Domains arrive as Claude wrote them; keep only a bare hostname.
function cleanDomain(raw) {
  const d = String(raw || '').trim().toLowerCase()
    .replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/?#\s]/)[0];
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? d : '';
}

export default async function handler(req, res) {
  if (!guard(req, res)) return;

  const { text } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text (the brief as plain text) is required' });
  }
  if (text.length > MAX_BRIEF_CHARS) {
    return res.status(413).json({ error: `Brief is too long (${text.length} characters, limit ${MAX_BRIEF_CHARS})` });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY env var' });
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        // Opt into server-side refusal fallbacks so a classifier false positive reroutes instead of failing.
        'anthropic-beta': 'server-side-fallback-2026-07-01',
      },
      signal: AbortSignal.timeout(270000),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        fallbacks: 'default',
        // Extraction, not analysis: low effort keeps a ~16-lead brief well inside the time limit.
        output_config: { effort: 'low', format: { type: 'json_schema', schema: BRIEF_SCHEMA } },
        messages: [{ role: 'user', content: buildPrompt(text) }],
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Claude API error ${resp.status}: ${errText.slice(0, 300)}`);
    }
    const data = await resp.json();
    if (data.stop_reason === 'refusal') throw new Error('Claude declined to read this brief');
    if (data.stop_reason === 'max_tokens') throw new Error('The brief has too many leads to read in one pass');

    const textOut = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const brief = JSON.parse(textOut);

    brief.leads = (brief.leads || []).filter((l) => l && l.organization).map((l) => {
      const domain = cleanDomain(l.domain);
      const licensedState = matchLicensedState(l.site_state);
      return {
        ...l,
        domain,
        vet: !!(l.vet && domain),
        vet_note: l.vet && !domain ? 'No website found for this organization' : l.vet_note,
        // Only real web links survive; the page renders these as hrefs.
        sources: (l.sources || []).filter((s) => /^https?:\/\//i.test(s.url)),
        site_licensed: l.site_state ? !!licensedState : null,
      };
    });

    return res.status(200).json(brief);
  } catch (err) {
    console.error('parse-brief error:', err);
    return res.status(502).json({ error: err.message || 'Unknown error' });
  }
}
