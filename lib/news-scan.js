// TNG Lead Scoring — security incidents and trigger events in one news search.
// The same checks as lib/incident-scan.js and lib/trigger-events.js, asked in a single
// Claude turn so the searches are shared instead of run twice (web search is billed per
// search). Results are cleaned with each check's own rules, so the page sees the same shapes.
//
// Never throws. Returns { available: true, organization, incidents: {...}, events: {...}, searches }
// or { available: false, reason }.

import { runNewsSearch, DEFAULT_NEWS_MODEL } from './news-search.js';
import { INCIDENT_TYPES, cleanIncidents } from './incident-scan.js';
import { EVENT_TYPES, cleanEvents } from './trigger-events.js';

// Six searches, half for each list: in testing, five unsplit searches leaned toward business
// news and missed a hospital gun incident the separate check found.
export const DEFAULT_NEWS_SEARCHES = 6;

function buildNewsPrompt(domain, companyName, today, maxUses) {
  const who = companyName
    ? `the organization "${companyName}" (website ${domain})`
    : `the organization that owns the website "${domain}"`;
  return `Today is ${today}. Using web search, find two kinds of news about ${who}.

A. Physical security incidents in the last 24 months at the organization's own sites (hospitals, clinics, campuses, offices, stores, plants) or aimed at its people: assaults on staff, shootings, stabbings, weapons brought on site, lockdowns, bomb threats, credible threats of violence, and threats or attacks against its executives. Large organizations run many sites under their own names, so search for the facility names too. For an insurer, bank, tech company or other office-based business, focus on threats against executives and incidents at its headquarters or offices.
Incident types: ${INCIDENT_TYPES.map((t) => `"${t}"`).join(', ')}.

B. Business events in the last 12 months of these kinds:
- "layoffs": layoffs, reductions in force, site or plant closures, or WARN notices (legally required notice of mass layoffs).
- "leadership_change": a new or departing CEO, president, chair, or head of security of the organization as a whole. Leave out appointments that lead only one facility, region or subsidiary (for example a new CEO of one hospital in a health system), and other C-suite or VP moves: large organizations make those routinely.
- "executive_exposure": a top executive facing threats, harassment, public anger, protests or intense negative media attention.
- "facility_expansion": a new or expanded facility, campus, hospital, headquarters, plant or store opening, under construction or announced.
- "labor_unrest": strikes, walkouts, protests or labor disputes at its sites.
- "major_event": a large event, conference or public gathering it is hosting.

Use up to ${maxUses} short, specific searches, split between the lists: ${Math.ceil(maxUses / 2)} for list A and ${Math.floor(maxUses / 2)} for list B. Pair the name (or, for a large system, one of its facility names) with one or two kinds each, for example: A: "<name> shooting OR gun", "<name> staff assaulted OR stabbing", "<name> lockdown OR bomb threat"; B: "<name> layoffs OR closure", "<name> new CEO OR new hospital OR expansion", "<name> strike OR protest". A single broad search misses most local news, so don't stop after one search that finds nothing.

Rules:
- Include an item only if a source names this organization, one of its facilities, or its executives. Same-named but unrelated organizations, suppliers and customers don't count.
- Leave out incidents that only passed through the organization (e.g. a hospital treating a victim hurt elsewhere), cyber attacks and data breaches, lawsuits about older events, and general crime statistics.
- Leave out routine business news: earnings, product launches, awards and partnerships. A security incident goes in list A only, never in list B.
- Use only real reporting: news outlets, police or prosecutor statements, court records, government notices (such as state WARN notices), or the organization's own statements. Ignore aggregator, scraped or spam pages.
- Use the date the item was reported or happened. Report only what the source says; never guess a date, place or detail. When only the month is known, use YYYY-MM.
- If nothing qualifies, return empty lists. That's a normal, useful answer.

Respond with ONLY a raw JSON object, no markdown fences or commentary, in exactly this shape. Every string must be on one line, with any double quote inside a string escaped as \\".
{
  "organization": string or null (the organization's name as you identified it),
  "incidents": array of up to 5 objects, newest first: {
    "date": string ("YYYY-MM-DD" or "YYYY-MM"),
    "site": string or null (facility or location name),
    "type": one of the incident types above,
    "summary": string (one plain factual sentence, no names of victims),
    "source_name": string (the outlet),
    "source_url": string (the article URL, copied exactly from a search result)
  },
  "events": array of up to 6 objects, newest first: {
    "date": string ("YYYY-MM-DD" or "YYYY-MM"),
    "type": one of ${EVENT_TYPES.map((t) => `"${t}"`).join(', ')},
    "site": string or null (facility or location, if the event is tied to one),
    "summary": string (one plain factual sentence; executives may be named, other people may not),
    "source_name": string (the outlet),
    "source_url": string (the article URL, copied exactly from a search result)
  }
}`;
}

export async function scanNews(apiKey, domain, companyName, extractJson, { debug = false, model = DEFAULT_NEWS_MODEL, maxUses = DEFAULT_NEWS_SEARCHES } = {}) {
  const now = new Date();
  try {
    const prompt = buildNewsPrompt(domain, companyName, now.toISOString().slice(0, 10), maxUses);
    const run = await runNewsSearch(apiKey, prompt, extractJson, { label: 'News check', debug, model, maxUses });
    if (!run.ok) return { available: false, reason: run.reason, ...run.debugInfo };

    const json = run.json || {};
    const reportedIncidents = Array.isArray(json.incidents) ? json.incidents : [];
    const reportedEvents = Array.isArray(json.events) ? json.events : [];
    const incidents = cleanIncidents(reportedIncidents, now);
    const events = cleanEvents(reportedEvents, now);
    const organization = json.organization || null;
    return {
      available: true,
      organization,
      // Each half in the same shape its own endpoint returns.
      incidents: { available: true, organization, incidents, recent_count: incidents.filter((i) => i.recent).length, dropped: reportedIncidents.length - incidents.length },
      events: { available: true, organization, events, recent_count: events.filter((e) => e.recent).length, dropped: reportedEvents.length - events.length },
      searches: run.searches,
      ...run.debugInfo,
    };
  } catch (err) {
    console.error('scanNews error:', err);
    return { available: false, reason: err.message || 'News check failed' };
  }
}
