// TNG Lead Scoring — business events in the news that create a need for a TNG service:
// layoffs (Workplace Termination Support), a new or exposed executive (Executive
// Protection), new facilities (guard services), strikes and protests, large events. The
// page maps each event type to the service to pitch.
//
// Never throws. Returns { available: true, organization, events, recent_count }
// or { available: false, reason }.

import { runNewsSearch, cleanNewsItems, DEFAULT_NEWS_MODEL } from './news-search.js';

const LOOKBACK_MONTHS = 12;
const RECENT_MONTHS = 6; // only events this recent earn points on the page

export const EVENT_TYPES = ['layoffs', 'leadership_change', 'executive_exposure', 'facility_expansion', 'labor_unrest', 'major_event'];

function buildEventsPrompt(domain, companyName, today) {
  const who = companyName
    ? `the organization "${companyName}" (website ${domain})`
    : `the organization that owns the website "${domain}"`;
  return `Today is ${today}. Using web search, find business events reported in the news in the last ${LOOKBACK_MONTHS} months for ${who} of these kinds:
- "layoffs": layoffs, reductions in force, site or plant closures, or WARN notices (legally required notice of mass layoffs).
- "leadership_change": a new CEO, president or other top executive appointed or departing.
- "executive_exposure": a top executive facing threats, harassment, public anger, protests or intense negative media attention.
- "facility_expansion": a new or expanded facility, campus, hospital, headquarters, plant or store opening, under construction or announced.
- "labor_unrest": strikes, walkouts, protests or labor disputes at its sites.
- "major_event": a large event, conference or public gathering it is hosting.

Use up to 4 short, specific searches pairing the name with these kinds, for example: "<name> layoffs", "<name> new CEO", "<name> new facility", "<name> strike OR protest". A single broad search misses most local news, so don't stop after one search that finds nothing.

Rules:
- Include an event only if a source says it involves this organization itself (or one of its own facilities or executives). Same-named but unrelated organizations, suppliers and customers don't count.
- Use only real reporting: news outlets, government notices (such as state WARN notices), or the organization's own announcements. Ignore aggregator, scraped or spam pages.
- Use the date the event was reported or announced. Report only what the source says; never guess a date, place or detail. When only the month is known, use YYYY-MM.
- Leave out routine news: earnings, product launches, awards, partnerships, and security incidents (a separate check covers those).
- If nothing qualifies, return an empty list. That's a normal, useful answer.

Respond with ONLY a raw JSON object, no markdown fences or commentary, in exactly this shape. Every string must be on one line, with any double quote inside a string escaped as \\".
{
  "organization": string or null (the organization's name as you identified it),
  "events": array of up to 6 objects, newest first: {
    "date": string ("YYYY-MM-DD" or "YYYY-MM"),
    "type": one of ${EVENT_TYPES.map((t) => `"${t}"`).join(', ')},
    "site": string or null (facility or location, if the event is tied to one),
    "summary": string (one plain factual sentence; executives may be named, other people may not),
    "source_name": string (the outlet, e.g. "Detroit Free Press"),
    "source_url": string (the article URL, copied exactly from a search result)
  }
}`;
}

// Also re-run on a saved result, so "recent" is always measured from today.
export function cleanEvents(list, now) {
  return cleanNewsItems(list, now, {
    types: EVENT_TYPES, lookbackMonths: LOOKBACK_MONTHS, recentMonths: RECENT_MONTHS, max: 6,
  });
}

export async function scanEvents(apiKey, domain, companyName, extractJson, { debug = false, model = DEFAULT_NEWS_MODEL } = {}) {
  const now = new Date();
  try {
    const prompt = buildEventsPrompt(domain, companyName, now.toISOString().slice(0, 10));
    const run = await runNewsSearch(apiKey, prompt, extractJson, { label: 'Trigger events check', debug, model });
    if (!run.ok) return { available: false, reason: run.reason, ...run.debugInfo };

    const reported = Array.isArray(run.json && run.json.events) ? run.json.events : [];
    const events = cleanEvents(reported, now);
    return {
      available: true,
      organization: (run.json && run.json.organization) || null,
      events,
      recent_count: events.filter((e) => e.recent).length,
      searches: run.searches,
      dropped: reported.length - events.length, // undated, unlinked, unknown type or out of range
      ...run.debugInfo,
    };
  } catch (err) {
    console.error('scanEvents error:', err);
    return { available: false, reason: err.message || 'Trigger events check failed' };
  }
}
