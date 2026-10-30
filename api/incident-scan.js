// TNG Lead Scoring — recent security incidents check
// Searches the news for violence, weapons, lockdowns and threats at the company's sites
// in the last 24 months (see lib/incident-scan.js). No Apollo credits. Runs as its own
// endpoint so the page can call it alongside Analyze, and a slow search never blocks scoring.

import { guard } from '../lib/guard.js';
import { scanIncidents } from '../lib/incident-scan.js';
import { extractJson } from '../lib/extract-json.js';

export default async function handler(req, res) {
  if (!guard(req, res)) return;

  const { domain, company_name } = req.body || {};
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

  // scanIncidents never throws; a failed search comes back as { available: false, reason }.
  const result = await scanIncidents(ANTHROPIC_API_KEY, cleanDomain, name, extractJson);
  return res.status(200).json(result);
}
