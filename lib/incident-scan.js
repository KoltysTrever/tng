// TNG Lead Scoring — recent security incidents in the news.
// Claude searches public news for violence, weapons, lockdowns and threats at the
// organization's own sites (or against its executives) in the last 24 months. It's a
// public, factual reason a lead may need TNG — background for BD, never an opener.
//
// Never throws. Returns { available: true, organization, incidents, recent_count }
// or { available: false, reason }.

import { runNewsSearch, cleanNewsItems, DEFAULT_NEWS_MODEL } from './news-search.js';

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

// Also re-run on a saved result, so "recent" is always measured from today.
export function cleanIncidents(list, now) {
  return cleanNewsItems(list, now, {
    types: INCIDENT_TYPES, fallbackType: 'other', lookbackMonths: LOOKBACK_MONTHS, recentMonths: RECENT_MONTHS, max: 5,
  });
}

export async function scanIncidents(apiKey, domain, companyName, extractJson, { debug = false, model = DEFAULT_NEWS_MODEL } = {}) {
  const now = new Date();
  try {
    const prompt = buildScanPrompt(domain, companyName, now.toISOString().slice(0, 10));
    const run = await runNewsSearch(apiKey, prompt, extractJson, { label: 'News check', debug, model });
    if (!run.ok) return { available: false, reason: run.reason, ...run.debugInfo };

    const reported = Array.isArray(run.json && run.json.incidents) ? run.json.incidents : [];
    const incidents = cleanIncidents(reported, now);
    return {
      available: true,
      organization: (run.json && run.json.organization) || null,
      incidents,
      recent_count: incidents.filter((i) => i.recent).length,
      searches: run.searches,
      dropped: reported.length - incidents.length, // undated, unlinked or out of range
      ...run.debugInfo,
    };
  } catch (err) {
    console.error('scanIncidents error:', err);
    return { available: false, reason: err.message || 'News check failed' };
  }
}
