// TNG Lead Scoring — the nightly Watchlist check, run by Vercel Cron (vercel.json "crons").
// Each night it re-checks the watched companies whose last check is a week old or more,
// oldest first, two at a time, stopping in time to finish inside the function's limit.
// Vercel calls it with "Authorization: Bearer <CRON_SECRET>"; anything else is refused.
// Cost: about 7 cents of Claude per company checked (the news search); visits and Zoho are free.

import { timingSafeEqual } from 'node:crypto';
import { cacheConfigured, storeCommand } from '../lib/cache.js';
import { META, CHECK_EVERY_MS, getEntry, putEntry, checkEntry } from '../lib/watch.js';

const MAX_PER_RUN = 8;
const STOP_STARTING_AFTER_MS = 200 * 1000; // a check takes up to about a minute; the limit is 300 s
const CONCURRENCY = 2;

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(String(req.headers.authorization || ''));
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (!process.env.CRON_SECRET) return res.status(500).json({ error: 'Server is missing CRON_SECRET env var' });
  if (!authorized(req)) return res.status(401).json({ error: 'Not authorized' });
  if (!cacheConfigured()) return res.status(200).json({ checked: 0, reason: 'Saved-data store not configured' });

  const started = Date.now();
  const flat = (await storeCommand(['HGETALL', META])) || [];
  const due = [];
  for (let i = 0; i < flat.length; i += 2) {
    const m = JSON.parse(flat[i + 1]);
    const last = Date.parse(m.checked_at) || 0;
    if (m.watch && Date.now() - last >= CHECK_EVERY_MS - 3600 * 1000) due.push({ domain: flat[i], last });
  }
  due.sort((a, b) => a.last - b.last);
  const queue = due.slice(0, MAX_PER_RUN);

  const results = [];
  const worker = async () => {
    while (queue.length && Date.now() - started < STOP_STARTING_AFTER_MS) {
      const { domain } = queue.shift();
      try {
        const entry = await getEntry(domain);
        if (!entry || !entry.watch || !entry.watch.on) continue;
        const before = entry.watch.unseen || 0;
        await checkEntry(entry, process.env.ANTHROPIC_API_KEY, process.env.APOLLO_API_KEY);
        await putEntry(entry);
        results.push({ domain, new: entry.watch.unseen - before, error: entry.watch.error });
      } catch (err) {
        console.error('watch-check failed for', domain, err);
        results.push({ domain, error: err.message });
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log('watch-check', JSON.stringify({ due: due.length, results }));
  return res.status(200).json({ due: due.length, checked: results.length, results });
}
