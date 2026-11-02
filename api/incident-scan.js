// TNG Lead Scoring — recent security incidents check
// Searches the news for violence, weapons, lockdowns and threats at the company's sites
// in the last 24 months (see lib/incident-scan.js). No Apollo credits. Runs as its own
// endpoint so the page can call it alongside Analyze, and a slow search never blocks scoring.

import { guard } from '../lib/guard.js';
import { scanIncidents, cleanIncidents } from '../lib/incident-scan.js';
import { NEWS_MODELS } from '../lib/news-search.js';
import { extractJson } from '../lib/extract-json.js';
import { cacheGet, cacheSet } from '../lib/cache.js';

// A news check is reused for a week, then searched again.
const CACHE_TTL_SECONDS = 7 * 24 * 3600;

export default async function handler(req, res) {
  if (!guard(req, res)) return;

  // refresh: true searches again instead of reusing this week's result.
  // debug: true adds the searches Claude ran and its raw answer, and allows a `model`
  // override for comparing models (the page never sends either).
  const { domain, company_name, refresh, debug, model } = req.body || {};
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
  const cacheKey = `incidents:v1:${cleanDomain}`;

  if (refresh !== true && !isDebug) {
    const saved = await cacheGet(cacheKey);
    if (saved && saved.result) {
      const incidents = cleanIncidents(saved.result.incidents, new Date());
      return res.status(200).json({
        ...saved.result,
        incidents,
        recent_count: incidents.filter((i) => i.recent).length,
        cached_at: saved.saved_at,
      });
    }
  }

  // scanIncidents never throws; a failed search comes back as { available: false, reason }.
  const options = { debug: isDebug };
  if (isDebug && NEWS_MODELS.includes(model)) options.model = model;
  const result = await scanIncidents(ANTHROPIC_API_KEY, cleanDomain, name, extractJson, options);

  // Only real answers are saved; a failed search should be retried next time.
  if (result.available && !isDebug) {
    await cacheSet(cacheKey, { result, saved_at: new Date().toISOString() }, CACHE_TTL_SECONDS);
  }
  return res.status(200).json({ ...result, cached_at: null });
}
