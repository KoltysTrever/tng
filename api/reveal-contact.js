// TNG Lead Scoring — contact reveal relay
// Calls Apollo's People Enrichment (Match) endpoint to reveal a specific
// contact's full name and work email. This costs 1 Apollo credit per call —
// it is only ever triggered by an explicit user action on the frontend,
// never automatically as part of the main Analyze flow.
//
// Note: phone number reveal is intentionally NOT implemented here. Apollo
// only delivers phone numbers asynchronously via a webhook you must host
// separately — a real infrastructure addition beyond this simple relay.
// Name + email reveal is synchronous and returned directly below.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const { email, apollo_id, first_name, domain, title } = req.body || {};

  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
  if (!APOLLO_API_KEY) {
    return res.status(500).json({ error: 'Server is missing APOLLO_API_KEY env var' });
  }

  if (!email && !apollo_id && !(first_name && domain)) {
    return res.status(400).json({ error: 'Provide email, or apollo_id, or first_name + domain as a fallback.' });
  }

  try {
    const params = new URLSearchParams();
    params.set('reveal_personal_emails', 'false'); // false = prefer verified work email over personal email
    if (email) {
      params.set('email', email);
    } else if (apollo_id) {
      params.set('id', apollo_id);
    } else {
      params.set('first_name', first_name);
      params.set('domain', domain);
      if (title) params.set('title', title);
    }

    const matchResp = await fetch(`https://api.apollo.io/api/v1/people/match?${params.toString()}`, {
      method: 'POST',
      headers: { 'x-api-key': APOLLO_API_KEY, accept: 'application/json' },
    });

    if (!matchResp.ok) {
      const errText = await matchResp.text();
      throw new Error(`Apollo match failed (${matchResp.status}): ${errText}`);
    }

    const matchData = await matchResp.json();
    const person = matchData.person || null;

    if (!person) {
      return res.status(200).json({ revealed: false, message: 'Apollo could not confidently match this person to reveal full details.' });
    }

    return res.status(200).json({
      revealed: true,
      full_name: person.name || [person.first_name, person.last_name].filter(Boolean).join(' ') || null,
      email: person.email || null,
      title: person.title || null,
      linkedin_url: person.linkedin_url || null,
    });
  } catch (err) {
    console.error('reveal-contact error:', err);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
