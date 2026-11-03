// TNG Lead Scoring — Push to Zoho (see lib/zoho-push.js). Being built in steps; for now
// it answers only { "action": "check", "owner_email": "optional" }: a read-only check
// that the push token works and what this Zoho org's Contacts need. No Apollo credits.

import { guard } from '../lib/guard.js';
import { zohoPushConfigured } from '../lib/zoho.js';
import { checkPushSetup } from '../lib/zoho-push.js';

export default async function handler(req, res) {
  if (!guard(req, res)) return;

  const { action, owner_email } = req.body || {};
  if (!zohoPushConfigured()) {
    return res.status(200).json({ configured: false });
  }
  if (action === 'check') {
    return res.status(200).json({ configured: true, ...(await checkPushSetup(owner_email)) });
  }
  return res.status(400).json({ error: 'Unknown action' });
}
