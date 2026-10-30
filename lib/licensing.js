// TNG's directly licensed states, per https://tngdefense.com/licensing/ (checked 2026-10-30:
// 12 states) — update this list whenever TNG adds a new state license. This is informational
// only, not scored: analyze-lead checks the company's headquarters, parse-brief checks where
// the work is.
const LICENSED_STATES = {
  california: 'California', ca: 'California',
  georgia: 'Georgia', ga: 'Georgia',
  indiana: 'Indiana', in: 'Indiana',
  michigan: 'Michigan', mi: 'Michigan',
  mississippi: 'Mississippi', ms: 'Mississippi',
  'new mexico': 'New Mexico', nm: 'New Mexico',
  'north carolina': 'North Carolina', nc: 'North Carolina',
  ohio: 'Ohio', oh: 'Ohio',
  tennessee: 'Tennessee', tn: 'Tennessee',
  texas: 'Texas', tx: 'Texas',
  washington: 'Washington', wa: 'Washington',
  wisconsin: 'Wisconsin', wi: 'Wisconsin',
};

export const LICENSED_STATE_NAMES = [...new Set(Object.values(LICENSED_STATES))];

export function matchLicensedState(stateField, countryField) {
  if (!stateField) return null;
  const isUS = !countryField || /united states|usa|u\.s\.a?\.?$/i.test(String(countryField).trim());
  if (!isUS) return null;
  const key = String(stateField).trim().toLowerCase();
  return LICENSED_STATES[key] || null;
}
