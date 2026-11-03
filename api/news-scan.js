// TNG Lead Scoring — security incidents and trigger events in one news search (see
// lib/news-scan.js). Being tested against the two separate checks; the page doesn't call
// it yet. No Apollo credits.

import { guard } from '../lib/guard.js';
import { scanNews, DEFAULT_NEWS_SEARCHES } from '../lib/news-scan.js';
import { cleanIncidents } from '../lib/incident-scan.js';
import { cleanEvents } from '../lib/trigger-events.js';
import { NEWS_MODELS } from '../lib/news-search.js';
import { extractJson } from '../lib/extract-json.js';
import { cacheGet, cacheSet } from '../lib/cache.js';

// A news check is reused for a week, then searched again.
const CACHE_TTL_SECONDS = 7 * 24 * 3600;

export default async function handler(req, res) {
  if (!guard(req, res)) return;

  // refresh: true searches again instead of reusing this week's result.
  // debug: true adds the searches Claude ran and its raw answer, and allows `model` and
  // `max_uses` overrides for comparing settings (the page never sends either).
  const { domain, company_name, refresh, debug, model, max_uses } = req.body || {};
  if (!domain) {
    return res.status(400).json({ error: 'domain is required' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY env var' });
  }

  const cleanDomain = String(domain).trim().toLowerCase()
    .replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/?#]/)[0];
  const name = company_name ? String(company_name).trim().slice(0, 200) : null;
  const isDebug = debug === true;
  const cacheKey = `news:v1:${cleanDomain}`;

  if (refresh !== true && !isDebug) {
    const saved = await cacheGet(cacheKey);
    if (saved && saved.result) {
      const now = new Date();
      const r = saved.result;
      const incidents = cleanIncidents(r.incidents.incidents, now);
      const events = cleanEvents(r.events.events, now);
      return res.status(200).json({
        ...r,
        incidents: { ...r.incidents, incidents, recent_count: incidents.filter((i) => i.recent).length, cached_at: saved.saved_at },
        events: { ...r.events, events, recent_count: events.filter((e) => e.recent).length, cached_at: saved.saved_at },
        cached_at: saved.saved_at,
      });
    }
  }

  // scanNews never throws; a failed search comes back as { available: false, reason }.
  const options = { debug: isDebug };
  if (isDebug && NEWS_MODELS.includes(model)) options.model = model;
  options.maxUses = isDebug && Number.isInteger(max_uses) && max_uses >= 2 && max_uses <= 8 ? max_uses : DEFAULT_NEWS_SEARCHES;
  const result = await scanNews(ANTHROPIC_API_KEY, cleanDomain, name, extractJson, options);

  // Only real answers are saved; a failed search should be retried next time.
  if (result.available && !isDebug) {
    await cacheSet(cacheKey, { result, saved_at: new Date().toISOString() }, CACHE_TTL_SECONDS);
  }
  return res.status(200).json({
    ...result,
    ...(result.available ? { incidents: { ...result.incidents, cached_at: null }, events: { ...result.events, cached_at: null } } : {}),
    cached_at: null,
  });
}
