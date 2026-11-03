// TNG Lead Scoring — Push to Zoho (see lib/zoho-push.js for the safeguards). No Apollo credits.
//   { "action": "check", "owner_email": "..." }  read-only setup check
//   { "action": "preview", ...contact }          what a push would create, and what blocks it; reads only
//   { "action": "create", ...contact, "confirm_warnings": true }  creates one Contact and its Note;
//                                                 refused unless ZOHO_PUSH_ENABLED=true

import { guard } from '../lib/guard.js';
import { zohoConfigured, zohoPushConfigured } from '../lib/zoho.js';
import { checkPushSetup, previewPush, createPush } from '../lib/zoho-push.js';

export default async function handler(req, res) {
  if (!guard(req, res)) return;

  const body = req.body || {};
  // Duplicate and Account checks use the read-only token, the write uses the push token.
  if (!zohoPushConfigured() || !zohoConfigured()) {
    return res.status(200).json({ configured: false });
  }
  try {
    if (body.action === 'check') {
      return res.status(200).json({ configured: true, ...(await checkPushSetup(body.owner_email)) });
    }
    if (body.action === 'preview') {
      const { view } = await previewPush(body);
      return res.status(200).json({ configured: true, ...view });
    }
    if (body.action === 'create') {
      const { status, body: out } = await createPush(body);
      return res.status(status).json(out);
    }
  } catch (err) {
    console.error('zoho-push error:', err);
    return res.status(500).json({ error: err.message || 'Push to Zoho failed' });
  }
  return res.status(400).json({ error: 'Unknown action' });
}
