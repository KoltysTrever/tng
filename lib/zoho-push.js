// TNG Lead Scoring — "Push to Zoho": creates a lead's contact in Zoho CRM as a Contact
// (Contact Type: Prospect) with the opportunity-score note. Uses its own refresh token
// (ZOHO_PUSH_REFRESH_TOKEN, scopes: Contacts CREATE + READ, Accounts READ, Notes CREATE,
// users READ, field settings READ), separate from the read-only lookup token. It can't
// create Accounts or edit or delete anything.
//
// So far only the setup check exists: it reads, never writes.

import { getPushAccessToken } from './zoho.js';

async function zohoGet(path) {
  const { token, apiDomain } = await getPushAccessToken();
  const resp = await fetch(`${apiDomain}/crm/v8/${path}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  if (resp.status === 204) return {};
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`Zoho ${path.split('?')[0]} failed (${resp.status}): ${data.message || data.code || 'unknown error'}`);
  return data;
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
    const { fields = [] } = await zohoGet('settings/fields?module=Contacts');
    const type = fields.find((f) => /^contact type$/i.test(f.field_label || f.display_label || ''));
    out.contact_type = type
      ? { api_name: type.api_name, data_type: type.data_type, options: (type.pick_list_values || []).map((v) => v.actual_value || v.display_value) }
      : { error: 'No field labeled "Contact Type" on Contacts' };
    out.required_fields = fields.filter((f) => f.system_mandatory).map((f) => f.api_name);
  } catch (err) {
    out.contact_type = { error: err.message };
  }

  try {
    const { users = [] } = await zohoGet('users?type=ActiveUsers&per_page=200');
    const wanted = String(ownerEmail || '').trim().toLowerCase();
    const match = wanted ? users.find((u) => String(u.email || '').toLowerCase() === wanted) : null;
    // Names only: the check is about matching one email, not listing everyone's address.
    out.users = { count: users.length, names: users.map((u) => u.full_name).filter(Boolean), owner_match: match ? match.full_name : null };
  } catch (err) {
    out.users = { error: err.message };
  }
  return out;
}
