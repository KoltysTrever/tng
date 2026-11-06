// TNG Lead Scoring — saved companies and the Watchlist (see lib/watch.js), for the whole team.
// Actions:
//   "list"                                   every saved company's summary
//   "get"   { domain }                       one saved company, to reopen without credits
//   "save"  { domain, name, score, tier, org_id, snapshot, watch?, baseline? }
//   "watch" { domain, on, baseline? }        start or stop watching (starting needs a saved company)
//   "seen"  { domain }                       the team has seen the new activity ("Got it")
//   "check" { domain }                       re-check one watched company now (about 7 cents)
//   "delete"{ domain }

import { guard } from '../lib/guard.js';
import { cacheConfigured, storeCommand } from '../lib/cache.js';
import {
  KEEP_SECONDS, MAX_WATCHED, META, DOMAIN, cleanDomain, getEntry, putEntry, removeEntry, metaOf, baselineFrom, checkEntry,
} from '../lib/watch.js';

const text = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

function startWatch(entry, baseline) {
  const now = new Date().toISOString();
  entry.watch = { on: true, since: now, checked_at: now, seen: baselineFrom(baseline || {}), changes: [], unseen: 0, error: null };
}

async function watchedCount() {
  const all = (await storeCommand(['HVALS', META])) || [];
  return all.filter((m) => JSON.parse(m).watch).length;
}

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  if (!cacheConfigured()) return res.status(200).json({ configured: false });

  const body = req.body || {};
  const { action } = body;
  const domain = cleanDomain(body.domain);
  if (action !== 'list' && !DOMAIN.test(domain)) return res.status(400).json({ error: 'A company website is required' });

  try {
    if (action === 'list') {
      const flat = (await storeCommand(['HGETALL', META])) || [];
      const companies = [];
      const stale = [];
      const cutoff = Date.now() - KEEP_SECONDS * 1000;
      for (let i = 0; i < flat.length; i += 2) {
        const m = JSON.parse(flat[i + 1]);
        const touched = Math.max(Date.parse(m.saved_at) || 0, Date.parse(m.checked_at) || 0);
        if (touched < cutoff) stale.push(flat[i]); // its saved copy has already expired
        else companies.push({ domain: flat[i], ...m });
      }
      if (stale.length) await storeCommand(['HDEL', META, ...stale]);
      return res.status(200).json({ configured: true, companies, max_watched: MAX_WATCHED });
    }

    if (action === 'get') {
      const entry = await getEntry(domain);
      if (!entry) {
        await storeCommand(['HDEL', META, domain]);
        return res.status(404).json({ error: 'That company is no longer saved' });
      }
      return res.status(200).json({ configured: true, company: entry });
    }

    if (action === 'save') {
      if (!body.snapshot || typeof body.snapshot !== 'object') return res.status(400).json({ error: 'Nothing to save: analyze the company first' });
      const existing = await getEntry(domain);
      const entry = {
        domain,
        name: text(body.name, 200) || domain,
        score: Number(body.score) || 0,
        tier: text(body.tier, 40),
        org_id: text(body.org_id, 64) || (existing && existing.org_id) || null,
        saved_at: new Date().toISOString(),
        snapshot: body.snapshot,
        watch: existing ? existing.watch || null : null,
      };
      if (body.watch === true && !(entry.watch && entry.watch.on)) {
        if ((await watchedCount()) >= MAX_WATCHED) return res.status(409).json({ error: `The Watchlist is full (${MAX_WATCHED} companies). Stop watching one first.` });
        startWatch(entry, body.baseline);
      }
      await putEntry(entry);
      return res.status(200).json({ configured: true, company: { domain, ...metaOf(entry) } });
    }

    const entry = await getEntry(domain);
    if (!entry) return res.status(404).json({ error: 'That company is no longer saved' });

    if (action === 'watch') {
      if (body.on === true) {
        if (!(entry.watch && entry.watch.on)) {
          if ((await watchedCount()) >= MAX_WATCHED) return res.status(409).json({ error: `The Watchlist is full (${MAX_WATCHED} companies). Stop watching one first.` });
          startWatch(entry, body.baseline || entry.snapshot.baseline);
        }
      } else if (entry.watch) {
        entry.watch.on = false;
      }
    } else if (action === 'seen') {
      if (entry.watch) entry.watch.unseen = 0;
    } else if (action === 'check') {
      if (!(entry.watch && entry.watch.on)) return res.status(400).json({ error: 'Watch this company first' });
      await checkEntry(entry, process.env.ANTHROPIC_API_KEY, process.env.APOLLO_API_KEY);
    } else if (action === 'delete') {
      await removeEntry(domain);
      return res.status(200).json({ configured: true, deleted: true });
    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }
    await putEntry(entry);
    return res.status(200).json({ configured: true, company: { domain, ...metaOf(entry) }, changes: entry.watch ? entry.watch.changes : [] });
  } catch (err) {
    console.error('saved-companies error:', err);
    return res.status(502).json({ error: err.message || 'Saved companies could not be reached' });
  }
}
