// TNG Lead Scoring — saved lookups, so looking up the same company again doesn't spend
// Apollo credits or Claude calls a second time. Backed by Upstash Redis (free tier, added
// to the Vercel project from the Marketplace); its REST API needs nothing but fetch.
//
// Optional, like Zoho: with no Redis env vars every read is a miss and every write is
// skipped. Never throws — a cache problem must never break a lookup.

const URL_VARS = ['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL'];
const TOKEN_VARS = ['KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN'];

function config() {
  const url = URL_VARS.map((v) => process.env[v]).find(Boolean);
  const token = TOKEN_VARS.map((v) => process.env[v]).find(Boolean);
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

export function cacheConfigured() {
  return !!config();
}

async function command(args) {
  const cfg = config();
  if (!cfg) return null;
  const resp = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(3000),
  });
  if (!resp.ok) throw new Error(`Redis ${resp.status}`);
  return (await resp.json()).result;
}

// The saved value, or null on a miss, an expired entry, or any error.
export async function cacheGet(key) {
  try {
    const raw = await command(['GET', key]);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('cacheGet failed:', err.message);
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds) {
  try {
    await command(['SET', key, JSON.stringify(value), 'EX', String(ttlSeconds)]);
  } catch (err) {
    console.error('cacheSet failed:', err.message);
  }
}
