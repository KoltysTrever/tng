// TNG Lead Scoring — the Hunter Brief archive: vetted briefs saved for the whole team, so a
// past brief can be opened again later without re-running any lookups (no Apollo credits,
// no Claude calls). Stored in the same Upstash Redis as the saved lookups:
//   briefarchive:v1:<id>     the brief as the page holds it, expiring a year after its last save
//   briefarchive:v1:index    sorted set of ids by last save time (for the list)
//   briefarchive:v1:meta     hash of id → { title, date, leads, vetted, saved_at } (for the list)
// Actions: "list", "get" { id }, "save" { id?, brief }, "delete" { id }.

import { randomUUID } from 'node:crypto';
import { guard } from '../lib/guard.js';
import { cacheConfigured, storeCommand } from '../lib/cache.js';

const KEEP_SECONDS = 365 * 24 * 3600;
const MAX_BYTES = 900 * 1024; // Upstash's free tier refuses requests over 1 MB
const PREFIX = 'briefarchive:v1:';
const INDEX = PREFIX + 'index';
const META = PREFIX + 'meta';
const ID = /^[a-f0-9-]{36}$/;

const text = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

// Drops list entries older than a year (their briefs have already expired).
async function prune() {
  const cutoff = Date.now() - KEEP_SECONDS * 1000;
  const old = await storeCommand(['ZRANGEBYSCORE', INDEX, '-inf', String(cutoff)]);
  if (old && old.length) {
    await storeCommand(['ZREM', INDEX, ...old]);
    await storeCommand(['HDEL', META, ...old]);
  }
}

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  if (!cacheConfigured()) return res.status(200).json({ configured: false });

  const { action, id, brief } = req.body || {};
  if (id != null && !ID.test(String(id))) return res.status(400).json({ error: 'Bad brief id' });

  try {
    if (action === 'list') {
      await prune();
      const ids = (await storeCommand(['ZREVRANGE', INDEX, '0', '199'])) || [];
      const metas = ids.length ? await storeCommand(['HMGET', META, ...ids]) : [];
      const briefs = ids.map((bid, i) => (metas[i] ? { id: bid, ...JSON.parse(metas[i]) } : null)).filter(Boolean);
      return res.status(200).json({ configured: true, briefs });
    }

    if (action === 'get') {
      const raw = id && (await storeCommand(['GET', PREFIX + id]));
      if (!raw) return res.status(404).json({ error: 'That brief is no longer in the archive' });
      return res.status(200).json({ configured: true, id, brief: JSON.parse(raw) });
    }

    if (action === 'save') {
      if (!brief || !Array.isArray(brief.leads) || !brief.leads.length) {
        return res.status(400).json({ error: 'Nothing to save: the brief has no leads' });
      }
      const body = JSON.stringify(brief);
      if (body.length > MAX_BYTES) return res.status(413).json({ error: 'This brief is too large to archive' });
      const bid = id || randomUUID();
      const savedAt = new Date().toISOString();
      const meta = {
        title: text(brief.title, 200),
        date: text(brief.date, 60),
        leads: brief.leads.length,
        vetted: brief.leads.filter((l) => l && l.vetted && l.vetted.ok).length,
        saved_at: savedAt,
      };
      await storeCommand(['SET', PREFIX + bid, body, 'EX', String(KEEP_SECONDS)]);
      await storeCommand(['HSET', META, bid, JSON.stringify(meta)]);
      await storeCommand(['ZADD', INDEX, String(Date.now()), bid]);
      return res.status(200).json({ configured: true, id: bid, saved_at: savedAt });
    }

    if (action === 'delete') {
      if (!id) return res.status(400).json({ error: 'Bad brief id' });
      await storeCommand(['DEL', PREFIX + id]);
      await storeCommand(['ZREM', INDEX, id]);
      await storeCommand(['HDEL', META, id]);
      return res.status(200).json({ configured: true, deleted: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('brief-archive error:', err);
    return res.status(502).json({ error: err.message || 'The archive could not be reached' });
  }
}
