// TNG Lead Scoring — "Push to Zoho": creates one lead contact in Zoho CRM as a Contact
// (Contact Type: Prospect, owned by the person pushing) plus one Note with the
// opportunity score, and, when the person ticks it, the company as an Account. Uses its own
// refresh token (ZOHO_PUSH_REFRESH_TOKEN, scopes: Contacts CREATE + READ, Accounts CREATE +
// READ, Notes CREATE, users READ, field settings READ), separate from the read-only lookup
// token, so it can't edit or delete anything.
//
// Safeguards, each enforced here on the server whatever the page sends:
//   - off unless ZOHO_PUSH_ENABLED=true (the kill switch);
//   - every field checked: a real first and last name, a valid email or phone, a company,
//     the pusher's email matching an active Zoho user; text cleaned and length-capped;
//   - not created when Zoho already has the person (email in Contacts or Leads, or the same
//     name at the same company) or the tool pushed them before;
//   - a per-person lock (two clicks or two people at once create one Contact), one push per
//     10 seconds per person pushing, and daily caps (team and per person);
//   - exactly one create call: no loops, no automatic retry. When Zoho's answer is unclear
//     (a timeout), it looks the person up instead of trying again;
//   - Zoho workflows and approvals are not triggered (trigger: []), so a push can't email
//     the prospect or set off automations; every record says it came from the tool;
//   - an Account is created only when asked, only when no Account has the company's website
//     or exact name, and under its own lock, so two pushes never make the company twice.
// The locks, caps and push records live in Upstash; without it pushes are refused.

import { getPushAccessToken, findPerson, findAccount, findAccountByName } from './zoho.js';
import { cacheConfigured, cacheGet, cacheSet, cacheClaim, cacheCount, cacheRelease } from './cache.js';

export const CONTACT_TYPE_FIELD = 'Contact_Status'; // labeled "Contact Type" in Zoho
export const CONTACT_TYPE_VALUE = 'Prospect';
export const DAILY_CAP = 25;
export const PER_USER_DAILY_CAP = 10;
const MIN_SECONDS_BETWEEN = 10;
const LOCK_SECONDS = 300;
const PUSH_RECORD_SECONDS = 90 * 24 * 3600;
const CREATE_TIMEOUT_MS = 20000;

export const pushEnabled = () => String(process.env.ZOHO_PUSH_ENABLED || '').trim().toLowerCase() === 'true';

const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const NAME = /^[\p{L}][\p{L} .'-]{0,59}$/u;
const PLACEHOLDER = /^(unknown|n\/?a|na|none|null|tbd|tba|test|contact|security contact|procurement|buyer|first|last|name|first name|last name)$/i;
const MASKED = /\*|^\p{L}\.?$/u; // Apollo hides last names as "K." or "K***" until revealed
const GENERIC_INBOX = /^(info|sales|contact|contactus|procurement|purchasing|bid|bids|rfp|admin|office|hello|support|security|hr|careers|jobs|media|press|marketing)@/i;

// One line of plain text: tags, control characters and extra spaces removed, length capped.
function oneLine(value, max) {
  return String(value ?? '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, max);
}
// The note keeps its line breaks.
function noteText(value, max) {
  return String(value ?? '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ')
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}

export function validatePush(body = {}) {
  const domain = oneLine(body.website, 200).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/?#\s]/)[0];
  const person = {
    firstName: oneLine(body.first_name, 40),
    lastName: oneLine(body.last_name, 60),
    title: oneLine(body.title, 100),
    email: oneLine(body.email, 100).toLowerCase(),
    phone: oneLine(body.phone, 30),
    company: oneLine(body.company, 200),
    domain: DOMAIN.test(domain) ? domain : '',
    ownerEmail: oneLine(body.owner_email, 100).toLowerCase(),
    noteTitle: oneLine(body.note_title, 120),
    note: noteText(body.note, 6000),
    createAccount: body.create_account === true,
    industry: oneLine(body.account_info && body.account_info.industry, 120),
    employees: Math.max(0, Math.min(10000000, Math.round(Number(body.account_info && body.account_info.employees) || 0))),
    headquarters: oneLine(body.account_info && body.account_info.headquarters, 200),
  };
  const errors = [];
  const warnings = [];
  if (!NAME.test(person.firstName) || PLACEHOLDER.test(person.firstName)) errors.push('A real first name is required.');
  if (!NAME.test(person.lastName) || PLACEHOLDER.test(person.lastName) || MASKED.test(person.lastName) || person.lastName.length < 2) {
    errors.push('A real last name is required. Reveal the contact in Apollo first, or type the full name.');
  }
  if (person.email && !EMAIL.test(person.email)) errors.push(`"${person.email}" isn't a valid email address.`);
  const phoneDigits = person.phone.replace(/\D/g, '').length;
  if (person.phone && (phoneDigits < 7 || phoneDigits > 15)) errors.push(`"${person.phone}" isn't a valid phone number.`);
  if (!person.email && !person.phone) errors.push('An email or phone number is required.');
  if (!person.company) errors.push('The company name is required.');
  if (!EMAIL.test(person.ownerEmail)) errors.push('Your work email is required, so the Contact is assigned to you.');
  if (person.email && GENERIC_INBOX.test(person.email)) warnings.push(`${person.email} is a shared inbox, not a person.`);
  return { person, errors, warnings };
}

// Who a push is about, for the lock and the push record: the email, else name + company.
const identityOf = (p) => (p.email || `${p.firstName} ${p.lastName}|${p.domain || p.company}`).toLowerCase();
const dayKey = () => new Date().toISOString().slice(0, 10);

async function zohoRequest(path, { method = 'GET', body, timeoutMs } = {}) {
  const { token, apiDomain } = await getPushAccessToken();
  const resp = await fetch(`${apiDomain}/crm/v8/${path}`, {
    method,
    headers: { Authorization: `Zoho-oauthtoken ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
  });
  if (resp.status === 204) return {};
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(`Zoho ${path.split('?')[0]} failed (${resp.status}): ${data.message || data.code || (data.data && data.data[0] && data.data[0].message) || 'unknown error'}`);
    err.zohoAnswered = true; // Zoho replied with a clear refusal, so nothing was created
    throw err;
  }
  return data;
}

// Active Zoho users, kept for 10 minutes per warm instance.
let usersCache = null;
async function activeUsers() {
  if (usersCache && usersCache.at > Date.now() - 600000) return usersCache.users;
  const { users = [] } = await zohoRequest('users?type=ActiveUsers&per_page=200');
  usersCache = { at: Date.now(), users };
  return users;
}

// Whether this Zoho's Account Type list has "Prospect" (it's set only when it does).
let accountTypeCache = null;
async function accountTypeProspect() {
  if (accountTypeCache && accountTypeCache.at > Date.now() - 600000) return accountTypeCache.ok;
  let ok = false;
  try {
    const { fields = [] } = await zohoRequest('settings/fields?module=Accounts');
    const type = fields.find((f) => f.api_name === 'Account_Type');
    ok = !!(type && (type.pick_list_values || []).some((v) => (v.actual_value || v.display_value) === 'Prospect'));
  } catch (err) {
    console.error('zoho account fields failed:', err.message);
  }
  accountTypeCache = { at: Date.now(), ok };
  return ok;
}

// The token may create Accounts: true, false, or null when Zoho didn't report its scopes.
function canCreateAccounts() {
  const scopes = getPushAccessToken.scopes && getPushAccessToken.scopes();
  if (!scopes) return null;
  return /ZohoCRM\.modules\.(ALL|accounts\.(ALL|CREATE))/i.test(scopes);
}

// Everything a push would do, and everything that would stop it. Reads only.
// `internal` carries the Zoho ids createPush needs; the page only ever sees `view`.
export async function previewPush(body) {
  const { person, errors, warnings } = validatePush(body);
  const view = {
    enabled: pushEnabled(),
    errors, warnings,
    existing: [], possible: [], already_pushed: null,
    owner: null, account: null, account_create: null,
    caps: { today: 0, limit: DAILY_CAP, yours: 0, your_limit: PER_USER_DAILY_CAP },
    contact: {
      first_name: person.firstName, last_name: person.lastName, title: person.title, email: person.email,
      phone: person.phone, company: person.company, website: person.domain, contact_type: CONTACT_TYPE_VALUE,
    },
    note_title: person.noteTitle, note: person.note,
  };
  const internal = { person, ownerId: null, accountId: null, identity: identityOf(person), createAccount: false, accountType: null };
  if (!cacheConfigured()) {
    errors.push('Pushing needs the saved-data store (Upstash), which holds the duplicate locks and daily limits.');
    return { view, internal };
  }

  try {
    if (EMAIL.test(person.ownerEmail)) {
      const owner = (await activeUsers()).find((u) => String(u.email || '').toLowerCase() === person.ownerEmail);
      if (owner) { view.owner = owner.full_name; internal.ownerId = owner.id; }
      else errors.push(`${person.ownerEmail} isn't an active Zoho CRM user.`);
    }
    let websiteMatches = 0;
    if (person.domain) {
      const { account, matches } = await findAccount(person.domain);
      websiteMatches = matches;
      if (account) { view.account = { name: account.name, url: account.url }; internal.accountId = account.id; }
      else if (matches > 1) warnings.push(`${matches} Accounts in Zoho use ${person.domain}, so the Contact won't be linked to one.`);
    }
    // No Account has the website: one with exactly the company's name is still the company.
    if (!internal.accountId && !websiteMatches && person.company) {
      const { account } = await findAccountByName(person.company);
      if (account) { view.account = { name: account.name, url: account.url, by_name: true }; internal.accountId = account.id; }
    }
    // Still none: the person may ask for the company to be created with the Contact.
    if (!internal.accountId && !websiteMatches && person.company) {
      const allowed = canCreateAccounts();
      view.account_create = { possible: true, allowed: allowed !== false, name: person.company, website: person.domain, will: false };
      if (person.createAccount) {
        if (allowed === false) {
          errors.push('Creating the company needs one more Zoho permission (create Accounts). Untick "Also create" to push just the contact.');
        } else {
          view.account_create.will = true;
          internal.createAccount = true;
          internal.accountType = (await accountTypeProspect()) ? 'Prospect' : null;
        }
      }
    }
    if (person.lastName && person.firstName) {
      const { found, possible } = await findPerson({ ...person, accountId: internal.accountId });
      view.existing = found;
      view.possible = possible;
      if (found.length) errors.push(`Already in Zoho: ${found.map((f) => `${f.name} (${f.module}, ${f.why})`).join('; ')}.`);
      if (possible.length) warnings.push(`Zoho has someone with the same name at another company: ${possible.map((f) => f.name).join(', ')}.`);
    }
  } catch (err) {
    // A check that can't run blocks the push; it never lets one through.
    errors.push(`Couldn't check Zoho before pushing: ${err.message}`);
  }

  const pushed = await cacheGet(`zohopush:done:${internal.identity}`);
  if (pushed) {
    view.already_pushed = pushed;
    errors.push(`Already pushed from the tool on ${String(pushed.at).slice(0, 10)} by ${pushed.by}.`);
  }
  const day = dayKey();
  view.caps.today = Number(await cacheGet(`zohopush:day:${day}`)) || 0;
  view.caps.yours = Number(await cacheGet(`zohopush:day:${day}:${person.ownerEmail}`)) || 0;
  if (view.caps.today >= DAILY_CAP) errors.push(`The team's daily limit of ${DAILY_CAP} pushes is reached. It resets at midnight UTC.`);
  else if (view.caps.yours >= PER_USER_DAILY_CAP) errors.push(`Your daily limit of ${PER_USER_DAILY_CAP} pushes is reached. It resets at midnight UTC.`);
  return { view, internal };
}

function contactRecord({ person, ownerId, accountId }) {
  const today = dayKey();
  return {
    First_Name: person.firstName,
    Last_Name: person.lastName,
    ...(person.title ? { Title: person.title } : {}),
    ...(person.email ? { Email: person.email } : {}),
    ...(person.phone ? { Phone: person.phone } : {}),
    [CONTACT_TYPE_FIELD]: CONTACT_TYPE_VALUE,
    Owner: { id: ownerId },
    ...(accountId ? { Account_Name: { id: accountId } } : {}),
    Description: `Added by the TNG lead tool on ${today} by ${person.ownerEmail}. Company: ${person.company}`
      + `${person.domain ? ` (${person.domain})` : ''}.${accountId ? '' : ' Not linked to an Account yet.'}`,
  };
}

function accountRecord({ person, ownerId, accountType }) {
  const [city, state, country] = person.headquarters.split(',').map((x) => x.trim());
  return {
    Account_Name: person.company,
    ...(person.domain ? { Website: `https://${person.domain}` } : {}),
    Owner: { id: ownerId },
    ...(accountType ? { Account_Type: accountType } : {}),
    ...(person.employees ? { Employees: person.employees } : {}),
    ...(city ? { Billing_City: city } : {}),
    ...(state ? { Billing_State: state } : {}),
    ...(country ? { Billing_Country: country } : {}),
    Description: `Added by the TNG lead tool on ${dayKey()} by ${person.ownerEmail}`
      + `${person.industry ? `. Industry: ${person.industry}` : ''}. Details from Apollo.`,
  };
}

// The write. Returns { status, body } for the endpoint to send.
export async function createPush(body) {
  if (!pushEnabled()) return { status: 403, body: { error: 'Pushing to Zoho is switched off.' } };

  // Every check runs again here: the page's earlier preview proves nothing.
  const { view, internal } = await previewPush(body);
  if (view.errors.length) return { status: 409, body: { ...view, error: view.errors[0] } };
  if (view.warnings.length && body.confirm_warnings !== true) {
    return { status: 409, body: { ...view, error: 'Confirm the warnings before pushing.' } };
  }
  const { person } = internal;

  try {
    if (!(await cacheClaim(`zohopush:pace:${person.ownerEmail}`, 1, MIN_SECONDS_BETWEEN))) {
      return { status: 429, body: { error: `One push every ${MIN_SECONDS_BETWEEN} seconds. Try again in a moment.` } };
    }
    if (!(await cacheClaim(`zohopush:lock:${internal.identity}`, { by: person.ownerEmail, at: new Date().toISOString() }, LOCK_SECONDS))) {
      return { status: 409, body: { error: 'This person is being pushed right now (maybe by someone else). Check Zoho in a few minutes.' } };
    }
    const day = dayKey();
    const total = await cacheCount(`zohopush:day:${day}`, 2 * 86400);
    const mine = await cacheCount(`zohopush:day:${day}:${person.ownerEmail}`, 2 * 86400);
    if (total > DAILY_CAP || mine > PER_USER_DAILY_CAP) {
      return { status: 429, body: { error: 'The daily push limit is reached. It resets at midnight UTC.' } };
    }
  } catch (err) {
    return { status: 503, body: { error: `Couldn't check the push limits, so nothing was sent: ${err.message}` } };
  }

  // The company first, when asked: one create call under its own lock, never retried.
  let accountCreated = null;
  if (internal.createAccount) {
    const acctLock = `zohopush:acct:${person.domain || person.company.toLowerCase()}`;
    try {
      if (!(await cacheClaim(acctLock, { by: person.ownerEmail, at: new Date().toISOString() }, LOCK_SECONDS))) {
        await cacheRelease(`zohopush:lock:${internal.identity}`);
        return { status: 409, body: { error: `${person.company} is being added to Zoho right now (maybe by someone else). Try again in a few minutes.` } };
      }
    } catch (err) {
      await cacheRelease(`zohopush:lock:${internal.identity}`);
      return { status: 503, body: { error: `Couldn't check the push limits, so nothing was sent: ${err.message}` } };
    }
    try {
      const data = await zohoRequest('Accounts', { method: 'POST', body: { data: [accountRecord(internal)], trigger: [] }, timeoutMs: CREATE_TIMEOUT_MS });
      const row = data.data && data.data[0];
      if (!row || row.code !== 'SUCCESS' || !row.details || !row.details.id) {
        await cacheRelease(acctLock);
        await cacheRelease(`zohopush:lock:${internal.identity}`);
        return { status: 502, body: { error: `Zoho didn't create the company: ${(row && (row.message || row.code)) || 'no answer'}. Nothing was created. Untick "Also create" to push just the contact.` } };
      }
      internal.accountId = row.details.id;
    } catch (err) {
      if (err.zohoAnswered) {
        await cacheRelease(acctLock);
        await cacheRelease(`zohopush:lock:${internal.identity}`);
        const scope = /scope/i.test(err.message) ? ' The push token needs the "create Accounts" permission.' : '';
        return { status: 502, body: { error: `Couldn't create the company in Zoho (${err.message}).${scope} Nothing was created. Untick "Also create" to push just the contact.` } };
      }
      // A timeout: the Account may exist now. Look, don't retry.
      const after = person.domain ? await findAccount(person.domain).catch(() => null) : null;
      if (!after || !after.account) {
        return { status: 502, body: { error: `Zoho didn't confirm creating ${person.company} (${err.message}). Nothing else was sent; check Zoho for the company before trying again.` } };
      }
      internal.accountId = after.account.id;
    }
    accountCreated = { name: person.company, url: `${(process.env.ZOHO_CRM_URL || '').trim() || 'https://crm.zoho.com'}/crm/tab/Accounts/${internal.accountId}`, created: true };
  }
  const accountNote = accountCreated ? ` The company Account was created: ${accountCreated.url}` : '';

  // Exactly one create call. Never retried automatically.
  let contactId;
  try {
    const data = await zohoRequest('Contacts', { method: 'POST', body: { data: [contactRecord(internal)], trigger: [] }, timeoutMs: CREATE_TIMEOUT_MS });
    const row = data.data && data.data[0];
    if (!row || row.code !== 'SUCCESS' || !row.details || !row.details.id) {
      await cacheRelease(`zohopush:lock:${internal.identity}`);
      return { status: 502, body: { error: `Zoho didn't create the Contact: ${(row && (row.message || row.code)) || 'no answer'}. Nothing else was sent.${accountNote}`, account: accountCreated } };
    }
    contactId = row.details.id;
  } catch (err) {
    if (err.zohoAnswered) {
      // A clear refusal created nothing, so the person can be pushed again once it's fixed.
      await cacheRelease(`zohopush:lock:${internal.identity}`);
      return { status: 502, body: { error: `${err.message}. ${accountCreated ? `The Contact wasn't created.${accountNote}` : 'Nothing was created.'}`, account: accountCreated } };
    }
    // A timeout or dropped connection: the Contact may or may not exist. Look, don't retry.
    const after = await findPerson({ ...person, accountId: internal.accountId }).catch(() => null);
    const hit = after && after.found[0];
    if (!hit) {
      return { status: 502, body: { error: `Zoho didn't confirm the push (${err.message}). It wasn't retried. Check Zoho for ${person.firstName} ${person.lastName} before trying again.${accountNote}`, account: accountCreated } };
    }
    await cacheSet(`zohopush:done:${internal.identity}`, { url: hit.url, by: person.ownerEmail, at: new Date().toISOString() }, PUSH_RECORD_SECONDS);
    return { status: 200, body: { created: true, url: hit.url, note_added: false, account: accountCreated || view.account, warning: 'Zoho was slow to answer, but the Contact is there. The note wasn\'t added; add it by hand if needed.' } };
  }

  const url = `${(process.env.ZOHO_CRM_URL || '').trim() || 'https://crm.zoho.com'}/crm/tab/Contacts/${contactId}`;
  await cacheSet(`zohopush:done:${internal.identity}`, { url, by: person.ownerEmail, at: new Date().toISOString() }, PUSH_RECORD_SECONDS);

  // The note: one try. A failure leaves the Contact in place and says so.
  let noteAdded = false;
  if (person.note) {
    try {
      await zohoRequest(`Contacts/${contactId}/Notes`, {
        method: 'POST', timeoutMs: CREATE_TIMEOUT_MS,
        body: { data: [{ Note_Title: person.noteTitle || 'TNG Opportunity Score', Note_Content: person.note }] },
      });
      noteAdded = true;
    } catch (err) {
      console.error('zoho note failed:', err.message);
    }
  }
  return { status: 200, body: { created: true, url, note_added: noteAdded, owner: view.owner, account: accountCreated || view.account } };
}

// What the push will need, read from this Zoho org: the "Contact Type" field and its
// options, the Contact fields Zoho requires, and whether `ownerEmail` is an active user.
// Each part reports its own error, so one missing scope doesn't hide the rest.
export async function checkPushSetup(ownerEmail) {
  const out = { token: null, contact_type: null, required_fields: null, users: null };
  try {
    await getPushAccessToken();
    out.token = 'ok';
  } catch (err) {
    out.token = err.message;
    return out;
  }

  try {
    const { fields = [] } = await zohoRequest('settings/fields?module=Contacts');
    const type = fields.find((f) => /^contact type$/i.test(f.field_label || f.display_label || ''));
    out.contact_type = type
      ? { api_name: type.api_name, data_type: type.data_type, options: (type.pick_list_values || []).map((v) => v.actual_value || v.display_value) }
      : { error: 'No field labeled "Contact Type" on Contacts' };
    out.required_fields = fields.filter((f) => f.system_mandatory).map((f) => f.api_name);
  } catch (err) {
    out.contact_type = { error: err.message };
  }

  try {
    const users = await activeUsers();
    const wanted = String(ownerEmail || '').trim().toLowerCase();
    const match = wanted ? users.find((u) => String(u.email || '').toLowerCase() === wanted) : null;
    // Names only: the check is about matching one email, not listing everyone's address.
    out.users = { count: users.length, names: users.map((u) => u.full_name).filter(Boolean), owner_match: match ? match.full_name : null };
  } catch (err) {
    out.users = { error: err.message };
  }
  return out;
}
