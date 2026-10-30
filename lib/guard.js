// TNG Lead Scoring — shared request guard for every /api endpoint.
// Handles CORS, method checks, the shared access code, and a basic rate limit.
// Returns true if the handler may continue; otherwise it has already responded.

import { timingSafeEqual } from 'node:crypto';

// The frontend is a local HTML file (no website origin to lock CORS to), so the
// access code is what actually keeps strangers from spending Apollo credits.
// Set TNG_ACCESS_CODE in Vercel's Environment Variables, and the same value as
// ACCESS_CODE in tng_lead_scoring.html. Rotate both if the HTML file ever leaks.
const ACCESS_HEADER = 'x-tng-access-code';

// Best-effort only: Vercel can run several instances, each with its own counter,
// so this caps runaway loops and abuse bursts rather than enforcing an exact quota.
const RATE_LIMIT_PER_MINUTE = 30;
const hitsByIp = new Map();

export function guard(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', `Content-Type, ${ACCESS_HEADER}`);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return false;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return false;
  }

  const expected = process.env.TNG_ACCESS_CODE;
  if (!expected) {
    res.status(500).json({ error: 'Server is missing TNG_ACCESS_CODE env var' });
    return false;
  }
  if (!codesMatch(req.headers[ACCESS_HEADER], expected)) {
    res.status(401).json({ error: 'Access code missing or incorrect — get the current copy of the tool' });
    return false;
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (isRateLimited(ip)) {
    res.status(429).json({ error: `Too many requests — limit is ${RATE_LIMIT_PER_MINUTE} per minute` });
    return false;
  }

  return true;
}

function codesMatch(provided, expected) {
  const a = Buffer.from(String(provided || ''));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hitsByIp.get(ip) || []).filter((t) => now - t < 60000);
  recent.push(now);
  hitsByIp.set(ip, recent);
  return recent.length > RATE_LIMIT_PER_MINUTE;
}
