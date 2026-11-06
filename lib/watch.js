// TNG Lead Scoring — saved companies and the Watchlist, shared by the whole team.
// A saved company is a Single Lead lookup kept for a year (reopened without credits); a
// watched one is also re-checked weekly by the nightly job (api/watch-check.js): a fresh
// news search, site visits and the Zoho check, compared with what the team has already seen.
//   savedco:v1:<domain>   the saved company, expiring a year after its last save or check
//   savedco:v1:meta       hash of domain → the short summary the Saved tab lists

import { storeCommand, cacheSet } from './cache.js';
import { scanNews } from './news-scan.js';
import { getSiteVisits } from './apollo-visits.js';
import { zohoConfigured, checkCrm } from './zoho.js';
import { extractJson } from './extract-json.js';

export const KEEP_SECONDS = 365 * 24 * 3600;
export const CHECK_EVERY_MS = 7 * 24 * 3600 * 1000;
export const MAX_WATCHED = 40;
export const MAX_BYTES = 900 * 1024; // Upstash's free tier refuses requests over 1 MB
const PREFIX = 'savedco:v1:';
export const META = PREFIX + 'meta';
const NEWS_TTL_SECONDS = 7 * 24 * 3600;
const KEEP_CHANGES = 25;

export const cleanDomain = (d) => String(d || '').trim().toLowerCase()
  .replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/?#]/)[0];
export const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export async function getEntry(domain) {
  const raw = await storeCommand(['GET', PREFIX + domain]);
  return raw ? JSON.parse(raw) : null;
}

// What the Saved tab lists for one company.
export function metaOf(e) {
  const w = e.watch && e.watch.on ? e.watch : null;
  const last = w && w.changes.length ? w.changes[0] : null;
  return {
    name: e.name, score: e.score, tier: e.tier, saved_at: e.saved_at,
    watch: !!w, watch_since: w ? w.since : null, checked_at: w ? w.checked_at : null,
    unseen: w ? w.unseen : 0, last_change: last ? { kind: last.kind, type: last.type || null, text: last.text, found_at: last.found_at } : null,
    // The new items themselves (up to 5), so the list can show what's new without opening it.
    new_items: w && w.unseen ? w.changes.slice(0, Math.min(w.unseen, 5)).map((c) => ({
      kind: c.kind, type: c.type || null, text: String(c.text || '').slice(0, 300), date: c.date || null, url: c.url || null,
    })) : [],
    check_error: w ? w.error || null : null,
  };
}

export async function putEntry(e) {
  const body = JSON.stringify(e);
  if (body.length > MAX_BYTES) throw new Error('This company is too large to save');
  await storeCommand(['SET', PREFIX + e.domain, body, 'EX', String(KEEP_SECONDS)]);
  await storeCommand(['HSET', META, e.domain, JSON.stringify(metaOf(e))]);
}

export async function removeEntry(domain) {
  await storeCommand(['DEL', PREFIX + domain]);
  await storeCommand(['HDEL', META, domain]);
}

// What the team has already seen, so a check only flags what's new: every news item's
// source link, the site-visit count and whether the company was in Zoho.
export function baselineFrom({ incidents, events, visits_total, in_zoho }) {
  const urls = [...(incidents || []), ...(events || [])].map((x) => x && x.source_url).filter(Boolean);
  return { urls: [...new Set(urls)], visits_total: Number(visits_total) || 0, in_zoho: !!in_zoho };
}

// One weekly check: a fresh news search (about 7 cents of Claude), site visits and the Zoho
// check (both free). Returns the updated entry; never throws on a failed lookup, it records it.
export async function checkEntry(e, anthropicKey, apolloKey) {
  const w = e.watch;
  const now = new Date();
  const [news, visits, crm] = await Promise.all([
    scanNews(anthropicKey, e.domain, e.name, extractJson).catch((err) => ({ available: false, reason: err.message })),
    e.org_id ? getSiteVisits(apolloKey, e.org_id).catch(() => null) : Promise.resolve(null),
    zohoConfigured() ? checkCrm(e.domain).catch(() => null) : Promise.resolve(null),
  ]);

  const found = [];
  const seenUrls = new Set(w.seen.urls);
  const foundAt = now.toISOString();
  if (news.available) {
    // Share the fresh search with Single Lead for the week, like any other news check.
    await cacheSet(`news:v1:${e.domain}`, { result: news, saved_at: foundAt }, NEWS_TTL_SECONDS);
    (news.events.events || []).filter((x) => x.recent && x.source_url && !seenUrls.has(x.source_url)).forEach((x) => found.push({
      kind: 'event', type: x.type, text: x.summary, date: x.date || null, url: x.source_url, source: x.source_name || null, found_at: foundAt,
    }));
    (news.incidents.incidents || []).filter((x) => x.recent && x.source_url && !seenUrls.has(x.source_url)).forEach((x) => found.push({
      kind: 'incident', type: x.type, text: x.summary, date: x.date || null, url: x.source_url, source: x.source_name || null, found_at: foundAt,
    }));
    [...news.events.events, ...news.incidents.incidents].forEach((x) => x.source_url && seenUrls.add(x.source_url));
  }
  if (visits && visits.available) {
    const total = Number(visits.total_visits) || 0;
    if (total > w.seen.visits_total) {
      const top = (visits.top_paths || [])[0];
      found.push({
        kind: 'visits', text: `${total - w.seen.visits_total} new visit${total - w.seen.visits_total === 1 ? '' : 's'} to tngdefense.com`
          + (top && top.url ? ` (top page: ${String(top.url).replace(/^https?:\/\/(www\.)?/, '')})` : ''),
        date: visits.last_visited_at || null, found_at: foundAt,
      });
    }
    w.seen.visits_total = total; // a rolling 90 days, so it can also drop; the next rise is new again
  }
  if (crm && crm.found && !w.seen.in_zoho) {
    found.push({ kind: 'zoho', text: 'Now in Zoho CRM', found_at: foundAt });
    w.seen.in_zoho = true;
  }

  w.seen.urls = [...seenUrls].slice(-200);
  w.changes = [...found, ...(w.changes || [])].slice(0, KEEP_CHANGES);
  w.unseen = (w.unseen || 0) + found.length;
  w.checked_at = foundAt;
  w.error = news.available ? null : `News search failed (${news.reason || 'unknown'})`;
  return e;
}
