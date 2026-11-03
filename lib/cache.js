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

// The two helpers below guard writes (Push to Zoho), so unlike the ones above they throw
// on any problem: a safeguard that can't be checked must stop the write, never wave it through.

// Sets the key only if it doesn't exist yet. true = this caller got it.
export async function cacheClaim(key, value, ttlSeconds) {
  if (!config()) throw new Error('Saved-data store (Upstash) is not configured');
  return (await command(['SET', key, JSON.stringify(value), 'NX', 'EX', String(ttlSeconds)])) === 'OK';
}

// Frees a claim early. Never throws: a claim that isn't freed simply expires.
export async function cacheRelease(key) {
  try {
    await command(['DEL', key]);
  } catch (err) {
    console.error('cacheRelease failed:', err.message);
  }
}

// Adds 1 to a counter that expires ttlSeconds after it was first used; returns the new count.
export async function cacheCount(key, ttlSeconds) {
  if (!config()) throw new Error('Saved-data store (Upstash) is not configured');
  const n = Number(await command(['INCR', key]));
  if (n === 1) await command(['EXPIRE', key, String(ttlSeconds)]);
  return n;
}
