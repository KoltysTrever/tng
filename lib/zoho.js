// TNG Lead Scoring — Zoho CRM lookup helpers.
// Uses a Zoho "Self Client" refresh token (read-only scopes) to answer one question:
// does this company already exist in our CRM as an Account, Contact, or Lead?
//
// Env vars (set in Vercel):
//   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN — required
//   ZOHO_ACCOUNTS_URL — optional, default https://accounts.zoho.com (US data center)
//   ZOHO_CRM_URL      — optional, default https://crm.zoho.com (used for record links)

const ACCOUNTS_URL = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';
const CRM_URL = process.env.ZOHO_CRM_URL || 'https://crm.zoho.com';

// Access tokens last an hour; reuse one per warm serverless instance instead of
// minting a new token on every lookup (Zoho rate-limits token generation).
// The in-flight promise is shared too, so the three parallel queries in checkCrm
// don't each request their own token on a cold start.
let cachedToken = null;
let pendingToken = null;

export function zohoConfigured() {
  return !!(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET && process.env.ZOHO_REFRESH_TOKEN);
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) return cachedToken;
  if (!pendingToken) {
    pendingToken = refreshAccessToken().finally(() => { pendingToken = null; });
  }
  return pendingToken;
}

async function refreshAccessToken() {
  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });
  const resp = await fetch(`${ACCOUNTS_URL}/oauth/v2/token?${params.toString()}`, { method: 'POST' });
  const data = await resp.json();
  if (!resp.ok || !data.access_token) {
    throw new Error(`Zoho token refresh failed: ${data.error || resp.status}`);
  }
  cachedToken = {
    token: data.access_token,
    apiDomain: data.api_domain || 'https://www.zohoapis.com',
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return cachedToken;
}

async function coql(module, query) {
  const { token, apiDomain } = await getAccessToken();
  const resp = await fetch(`${apiDomain}/crm/v8/coql`, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ select_query: query }),
  });
  // Zoho answers "no matching records" with 204 and an empty body.
  if (resp.status === 204) return [];
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`Zoho ${module} query failed (${resp.status}): ${data.message || data.code || 'unknown error'}`);
  }
  return data.data || [];
}

const recordUrl = (module, id) => `${CRM_URL}/crm/tab/${module}/${id}`;
const personName = (r) => [r.First_Name, r.Last_Name].filter(Boolean).join(' ') || null;

// Website values in the CRM are free text ("www.acme.com", "https://acme.com/about"),
// so the query matches loosely and this confirms the actual host is the domain.
function websiteMatches(website, domain) {
  const host = String(website || '').trim().toLowerCase()
    .replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/?#]/)[0];
  return host === domain || host.endsWith('.' + domain);
}

// Domain and email are interpolated into COQL, so only allow characters that can
// legitimately appear in them — this also rules out quotes breaking the query.
const SAFE_DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const SAFE_EMAIL = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export async function checkCrm(domain, email) {
  const cleanDomain = String(domain || '').trim().toLowerCase();
  if (!SAFE_DOMAIN.test(cleanDomain)) throw new Error('Invalid domain for CRM check');
  const cleanEmail = String(email || '').trim().toLowerCase();
  const typedEmail = SAFE_EMAIL.test(cleanEmail) ? cleanEmail : null;

  const [accountRows, contactRows, leadRows] = await Promise.all([
    coql('Accounts', `select Account_Name, Website from Accounts where Website like '%${cleanDomain}%' limit 25`),
    coql('Contacts', `select First_Name, Last_Name, Title, Email from Contacts where Email like '%@${cleanDomain}' limit 200`),
    coql('Leads', `select First_Name, Last_Name, Company, Email, Lead_Status from Leads where Email like '%@${cleanDomain}' limit 200`),
  ]);

  const accounts = accountRows
    .filter((a) => websiteMatches(a.Website, cleanDomain))
    .map((a) => ({ name: a.Account_Name || '(unnamed account)', url: recordUrl('Accounts', a.id) }));
  const contacts = contactRows.map((c) => ({
    name: personName(c), title: c.Title || null, email: c.Email || null, url: recordUrl('Contacts', c.id),
  }));
  const leads = leadRows.map((l) => ({
    name: personName(l), company: l.Company || null, email: l.Email || null,
    status: l.Lead_Status || null, url: recordUrl('Leads', l.id),
  }));

  // If the user typed a specific contact email, say whether that exact person is already in the CRM.
  let emailMatch = null;
  if (typedEmail) {
    const hit = contacts.find((c) => (c.email || '').toLowerCase() === typedEmail)
      || leads.find((l) => (l.email || '').toLowerCase() === typedEmail);
    if (hit) emailMatch = { module: contacts.includes(hit) ? 'Contact' : 'Lead', name: hit.name, url: hit.url };
  }

  return {
    found: accounts.length > 0 || contacts.length > 0 || leads.length > 0,
    accounts,
    contacts: { count: contacts.length, more: contactRows.length >= 200, sample: contacts.slice(0, 5) },
    leads: { count: leads.length, more: leadRows.length >= 200, sample: leads.slice(0, 5) },
    email_match: emailMatch,
  };
}
