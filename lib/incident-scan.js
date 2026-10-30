// TNG Lead Scoring — recent security incidents in the news.
// Claude searches public news for violence, weapons, lockdowns and threats at the
// organization's own sites (or against its executives) in the last 24 months. It's a
// public, factual reason a lead may need TNG — background for BD, never an opener.
//
// Never throws. Returns { available: true, organization, incidents, recent_count }
// or { available: false, reason }.

const MODEL = 'claude-opus-5-5';
const MAX_CONTINUATIONS = 2; // server-side web search can pause a long turn; resume at most this often
const LOOKBACK_MONTHS = 24;
const RECENT_MONTHS = 12; // only incidents this recent earn points on the page

export const INCIDENT_TYPES = ['staff_assault', 'weapon', 'lockdown', 'threat', 'executive_threat', 'other'];

function buildScanPrompt(domain, companyName, today) {
  const who = companyName
    ? `the organization "${companyName}" (website ${domain})`
    : `the organization that owns the website "${domain}"`;
  return `Today is ${today}. Using web search, find physical security incidents reported in the news in the last ${LOOKBACK_MONTHS} months at ${who}.

Search for incidents at the organization's own sites (hospitals, clinics, campuses, offices, stores, plants) or aimed at its people: assaults on staff, shootings, stabbings, weapons brought on site, lockdowns, bomb threats, credible threats of violence, and threats or attacks against its executives. Large organizations run many sites under their own names, so search for the facility names too. For an insurer, bank, tech company or other office-based business, focus on threats against executives and incidents at its headquarters or offices.

Use up to 4 short, specific searches, each pairing the name with one kind of incident, for example: "<name> shooting", "<name> staff assaulted", "<name> lockdown", "<name> threat". A single broad search misses most local news, so don't stop after one search that finds nothing; stop early only once you've found 5 qualifying incidents.

Rules:
- Include an incident only if a source names this organization or one of its facilities as the place it happened, or names its people as the target. A same-named but unrelated organization doesn't count.
- Leave out events that only passed through the organization, e.g. a hospital treating a victim who was hurt elsewhere.
- Leave out cyber attacks and data breaches, lawsuits about older events, and general crime statistics.
- Use only real reporting: local or national news outlets, police or prosecutor statements, court records, or the organization's own statements. Ignore aggregator, scraped or spam pages.
- Report only what the source says. Never guess a date, place or detail. When only the month is known, use YYYY-MM.
- If nothing qualifies, return an empty list. That's a normal, useful answer.

Respond with ONLY a raw JSON object, no markdown fences or commentary, in exactly this shape. Every string must be on one line, with any double quote inside a string escaped as \\".
{
  "organization": string or null (the organization's name as you identified it),
  "incidents": array of up to 5 objects, newest first: {
    "date": string ("YYYY-MM-DD" or "YYYY-MM"),
    "site": string or null (facility or location name, e.g. "Henry Ford Warren Hospital, Warren, MI"),
    "type": one of ${INCIDENT_TYPES.map((t) => `"${t}"`).join(', ')},
    "summary": string (one plain factual sentence, no names of victims),
    "source_name": string (the outlet, e.g. "CBS Detroit"),
    "source_url": string (the article URL, copied exactly from a search result)
  }
}`;
}

// Claude's answer is split into several text blocks (citations break it up), so join them.
function collectText(content) {
  return (content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// The incident's date as "YYYY-MM-DD" or "YYYY-MM". Accepts what the prompt asks for
// and the wordier forms a model sometimes writes anyway ("June 3, 2026", "June 2026").
function normalizeDate(date) {
  const s = String(date || '').trim();
  let m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/.exec(s);
  if (!m) {
    const w = /^([a-z]{3})[a-z]*\.?\s+(?:(\d{1,2}),?\s+)?(\d{4})$/i.exec(s);
    const month = w ? MONTH_NAMES.indexOf(w[1].toLowerCase()) + 1 : 0;
    if (!month) return null;
    m = [null, w[3], String(month), w[2]];
  }
  const pad = (n) => String(n).padStart(2, '0');
  return m[3] ? `${m[1]}-${pad(m[2])}-${pad(m[3])}` : `${m[1]}-${pad(m[2])}`;
}

// "2026-06" or "2026-06-03" → whole months before today (null if in the future).
function monthsAgo(date, now) {
  const [y, mo] = date.split('-').map(Number);
  const months = (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - mo);
  return months >= 0 ? months : null;
}

function cleanIncidents(list, now) {
  return (Array.isArray(list) ? list : [])
    .filter((i) => i && /^https?:\/\//i.test(String(i.source_url || '')) && i.summary)
    .map((i) => {
      const date = normalizeDate(i.date);
      const age = date ? monthsAgo(date, now) : null;
      return {
        date,
        site: i.site ? String(i.site).slice(0, 200) : null,
        type: INCIDENT_TYPES.includes(i.type) ? i.type : 'other',
        summary: String(i.summary).slice(0, 400),
        source_name: i.source_name ? String(i.source_name).slice(0, 100) : null,
        source_url: String(i.source_url),
        months_ago: age,
        recent: age !== null && age <= RECENT_MONTHS,
      };
    })
    // Undated or older than the lookback window: drop rather than guess.
    .filter((i) => i.months_ago !== null && i.months_ago <= LOOKBACK_MONTHS)
    .sort((a, b) => a.months_ago - b.months_ago)
    .slice(0, 5);
}

// What each response block did, for the access-code-only debug option: the searches run,
// the results they returned, and anything else the model called along the way.
function traceBlocks(content) {
  return (content || []).map((b) => {
    if (b.type === 'server_tool_use') return { call: b.name, input: b.input };
    if (b.type === 'web_search_tool_result') {
      return Array.isArray(b.content)
        ? { results: b.content.map((r) => ({ title: r.title, url: r.url, page_age: r.page_age || null })) }
        : { results_error: b.content && b.content.error_code };
    }
    if (b.type === 'text') return null;
    return { block: b.type };
  }).filter(Boolean);
}

export async function scanIncidents(apiKey, domain, companyName, extractJson, debug) {
  const now = new Date();
  const headers = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    // Opt into server-side refusal fallbacks so a classifier false positive reroutes instead of failing.
    'anthropic-beta': 'server-side-fallback-2026-07-01',
  };
  const messages = [{ role: 'user', content: buildScanPrompt(domain, companyName, now.toISOString().slice(0, 10)) }];

  try {
    let data;
    let searches = 0; // reported back so a thin answer can be told apart from a thin search
    const trace = [];
    for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt++) {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(70000),
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 16000,
          fallbacks: 'default',
          // A quick check: low effort keeps searches few and the turn fast.
          output_config: { effort: 'low' },
          tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 4 }],
          messages,
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Claude incident scan error ${resp.status}: ${errText.slice(0, 300)}`);
      }
      data = await resp.json();
      searches += (data.content || []).filter((b) => b.type === 'server_tool_use' && b.name === 'web_search').length;
      if (debug) trace.push(...traceBlocks(data.content));
      if (data.stop_reason !== 'pause_turn') break;
      // Long search turns pause; send the partial turn back and the server resumes it.
      messages.push({ role: 'assistant', content: data.content });
    }

    const debugInfo = debug
      ? { debug: { stop_reason: data.stop_reason, usage: data.usage || null, trace, answer: collectText(data.content).slice(0, 6000) } }
      : {};
    if (data.stop_reason === 'refusal') return { available: false, reason: 'News check was declined', ...debugInfo };
    if (data.stop_reason === 'pause_turn') return { available: false, reason: 'News check ran too long', ...debugInfo };

    const result = extractJson(collectText(data.content));
    const reported = Array.isArray(result && result.incidents) ? result.incidents : [];
    const incidents = cleanIncidents(reported, now);
    return {
      available: true,
      organization: (result && result.organization) || null,
      incidents,
      recent_count: incidents.filter((i) => i.recent).length,
      searches,
      dropped: reported.length - incidents.length, // undated, unlinked or out of range
      ...debugInfo,
    };
  } catch (err) {
    console.error('scanIncidents error:', err);
    return { available: false, reason: err.message || 'News check failed' };
  }
}
