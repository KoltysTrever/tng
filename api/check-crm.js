// TNG Lead Scoring — Zoho CRM check
// Answers "is this company already in our Zoho CRM?" (Accounts by website, Contacts
// and Leads by email domain). Read-only, no Apollo credits. Runs as its own endpoint
// so the frontend can call it alongside Analyze, and a Zoho hiccup never blocks scoring.

import { guard } from '../lib/guard.js';
import { zohoConfigured, checkCrm } from '../lib/zoho.js';

export default async function handler(req, res) {
  if (!guard(req, res)) return;

  const { domain, email } = req.body || {};
  if (!domain) {
    return res.status(400).json({ error: 'domain is required' });
  }

  // Not set up yet → tell the frontend to fall back to a manual check, rather than erroring.
  if (!zohoConfigured()) {
    return res.status(200).json({ configured: false });
  }

  const cleanDomain = String(domain).trim().toLowerCase()
    .replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/?#]/)[0];

  try {
    const result = await checkCrm(cleanDomain, email);
    return res.status(200).json({ configured: true, ...result });
  } catch (err) {
    console.error('check-crm error:', err);
    return res.status(502).json({ error: err.message || 'Unknown error' });
  }
}
