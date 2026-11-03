// TNG Lead Scoring — Zoho CRM lookup helpers.
// Uses a Zoho "Self Client" refresh token (read-only scopes) to answer one question:
// does this company already exist in our CRM as an Account, Contact, or Lead?
//
// Env vars (set in Vercel):
//   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN — required
//   ZOHO_PUSH_REFRESH_TOKEN — optional: a second token from the same Self Client with the
//                             "Push to Zoho" scopes (create Contacts and Notes; see lib/zoho-push.js)
//   ZOHO_ACCOUNTS_URL — optional, default https://accounts.zoho.com (US data center)
//   ZOHO_CRM_URL      — optional, default https://crm.zoho.com (used for record links)

const ACCOUNTS_URL = (process.env.ZOHO_ACCOUNTS_URL || '').trim() || 'https://accounts.zoho.com';
export const CRM_URL = (process.env.ZOHO_CRM_URL || '').trim() || 'https://crm.zoho.com';

// After a failed refresh, don't ask Zoho again for a minute — repeated bad attempts
// trip Zoho's lockout ("Access Denied") for 10+ minutes even once the values are fixed.
const FAILURE_BACKOFF_MS = 60000;

// Values pasted into Vercel can carry an invisible trailing space or newline,
// which Zoho rejects as invalid_client / invalid_code.
const env = (name) => (process.env[name] || '').trim();

export function zohoConfigured() {
  return !!(env('ZOHO_CLIENT_ID') && env('ZOHO_CLIENT_SECRET') && env('ZOHO_REFRESH_TOKEN'));
}

export function zohoPushConfigured() {
  return !!(env('ZOHO_CLIENT_ID') && env('ZOHO_CLIENT_SECRET') && env('ZOHO_PUSH_REFRESH_TOKEN'));
}

// One access-token source per refresh token (read-only lookups, Push to Zoho), each with
// its own reuse and back-off. Access tokens last an hour; reuse one per warm serverless
// instance instead of minting a new token on every lookup (Zoho rate-limits token
// generation). The in-flight promise is shared too, so the three parallel queries in
// checkCrm don't each request their own token on a cold start.
function tokenSource(refreshVar) {
  let cached = null;
  let pending = null;
  let lastFailure = null;

  async function refresh() {
    const params = new URLSearchParams({
      refresh_token: env(refreshVar),
      client_id: env('ZOHO_CLIENT_ID'),
      client_secret: env('ZOHO_CLIENT_SECRET'),
      grant_type: 'refresh_token',
    });
    const resp = await fetch(`${ACCOUNTS_URL}/oauth/v2/token?${params.toString()}`, { method: 'POST' });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.access_token) {
      const message = `Zoho token refresh failed: ${data.error || resp.status}`;
      lastFailure = { at: Date.now(), message };
      throw new Error(message);
    }
    lastFailure = null;
    cached = {
      token: data.access_token,
      apiDomain: data.api_domain || 'https://www.zohoapis.com',
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      scope: typeof data.scope === 'string' ? data.scope : null, // when Zoho reports it
    };
    return cached;
  }

  async function getAccessToken() {
    if (cached && cached.expiresAt > Date.now() + 60000) return cached;
    if (lastFailure && Date.now() - lastFailure.at < FAILURE_BACKOFF_MS) {
      throw new Error(`${lastFailure.message} (waiting a minute before retrying Zoho)`);
    }
    if (!pending) {
      pending = refresh().finally(() => { pending = null; });
    }
    return pending;
  }
  // The scopes of the current token, or null when Zoho didn't say (or no token yet).
  getAccessToken.scopes = () => (cached && cached.scope) || null;
  return getAccessToken;
}

const getAccessToken = tokenSource('ZOHO_REFRESH_TOKEN');
export const getPushAccessToken = tokenSource('ZOHO_PUSH_REFRESH_TOKEN');

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

// ---- For Push to Zoho, still with the read-only token: who and what already exists ----

// Names go into COQL too, so only letters, spaces, dots and hyphens are allowed through;
// an apostrophe (O'Brien) becomes a wildcard so it can't end the quoted value.
const SAFE_NAME = /^[\p{L}][\p{L} .'-]{0,59}$/u;
const nameValue = (s) => s.replace(/'/g, '%');

// Contacts and Leads that are this person: the same email, or the same first and last name
// at the same company (its Account, or an email at its domain). A same-name match elsewhere
// is only "possible", since common names repeat.
export async function findPerson({ email, firstName, lastName, accountId, domain }) {
  const found = [];
  const possible = [];
  const cleanEmail = String(email || '').trim().toLowerCase();
  const queries = [];
  if (SAFE_EMAIL.test(cleanEmail)) {
    queries.push(coql('Contacts', `select First_Name, Last_Name, Email from Contacts where Email = '${cleanEmail}' limit 5`)
      .then((rows) => rows.forEach((r) => found.push({ module: 'Contact', name: personName(r), url: recordUrl('Contacts', r.id), why: 'same email' }))));
    queries.push(coql('Leads', `select First_Name, Last_Name, Email from Leads where Email = '${cleanEmail}' limit 5`)
      .then((rows) => rows.forEach((r) => found.push({ module: 'Lead', name: personName(r), url: recordUrl('Leads', r.id), why: 'same email' }))));
  }
  if (SAFE_NAME.test(firstName || '') && SAFE_NAME.test(lastName || '')) {
    const op = (s) => (s.includes("'") ? 'like' : '=');
    const where = `First_Name ${op(firstName)} '${nameValue(firstName)}' and Last_Name ${op(lastName)} '${nameValue(lastName)}'`;
    queries.push(coql('Contacts', `select First_Name, Last_Name, Email, Account_Name from Contacts where ${where} limit 10`)
      .then((rows) => rows.forEach((r) => {
        const atCompany = (accountId && r.Account_Name && r.Account_Name.id === accountId)
          || (domain && String(r.Email || '').toLowerCase().endsWith('@' + domain));
        const hit = { module: 'Contact', name: personName(r), url: recordUrl('Contacts', r.id), why: atCompany ? 'same name at this company' : 'same name' };
        (atCompany ? found : possible).push(hit);
      })));
  }
  await Promise.all(queries);
  // The lookups finish in any order; when one record matches both ways, report the email match.
  found.sort((a, b) => (a.why === 'same email' ? 0 : 1) - (b.why === 'same email' ? 0 : 1));
  const seen = new Set();
  const unique = (list) => list.filter((h) => !seen.has(h.url) && seen.add(h.url));
  return { found: unique(found), possible: unique(possible) };
}

// The company's Account, only when exactly one Account's website is this domain;
// with none (or several) the Contact is created without one.
export async function findAccount(domain) {
  const cleanDomain = String(domain || '').trim().toLowerCase();
  if (!SAFE_DOMAIN.test(cleanDomain)) return { account: null, matches: 0 };
  const rows = (await coql('Accounts', `select Account_Name, Website from Accounts where Website like '%${cleanDomain}%' limit 25`))
    .filter((a) => websiteMatches(a.Website, cleanDomain));
  const account = rows.length === 1
    ? { id: rows[0].id, name: rows[0].Account_Name || '(unnamed account)', url: recordUrl('Accounts', rows[0].id) }
    : null;
  return { account, matches: rows.length };
}

// An Account with exactly this name, for a company whose website isn't on its Account.
// Only names made of letters, digits, spaces and . , & ( ) - are looked up (they go into COQL).
const SAFE_COMPANY = /^[\p{L}\p{N}][\p{L}\p{N} .,&()-]{0,119}$/u;
export async function findAccountByName(name) {
  const clean = String(name || '').trim();
  if (!SAFE_COMPANY.test(clean)) return { account: null, matches: 0 };
  const rows = await coql('Accounts', `select Account_Name, Website from Accounts where Account_Name = '${clean}' limit 5`);
  const account = rows.length === 1
    ? { id: rows[0].id, name: rows[0].Account_Name || clean, url: recordUrl('Accounts', rows[0].id) }
    : null;
  return { account, matches: rows.length };
}

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
