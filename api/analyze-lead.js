// TNG Lead Scoring — backend relay
// Calls Apollo's REST API directly with a server-side key, then asks Claude
// to make the judgment calls (verticals, Fortune 1000 guess, best contact).
// Both API keys live only here, as environment variables — never in the browser.

export default async function handler(req, res) {
  // CORS: allow the frontend page to call this from any origin.
  // Tighten this to your actual domain once you're past testing.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const { domain, email } = req.body || {};
  if (!domain) {
    return res.status(400).json({ error: 'domain is required' });
  }

  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!APOLLO_API_KEY || !ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server is missing APOLLO_API_KEY or ANTHROPIC_API_KEY env vars' });
  }

  const cleanDomain = domain.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');

  try {
    // ---- 1. Apollo Organization Enrichment (costs 1 Apollo credit) ----
    let org = null;
    try {
      const enrichResp = await fetch(
        `https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(cleanDomain)}`,
        { headers: { 'x-api-key': APOLLO_API_KEY, accept: 'application/json' } }
      );
      const enrichData = await enrichResp.json();
      org = enrichData.organization || null;
    } catch (e) {
      console.error('Apollo enrich failed:', e);
    }

    // ---- 2. Apollo Job Postings (costs credits, needs org id from step 1) ----
    let jobPostings = [];
    if (org && org.id) {
      try {
        const jobsResp = await fetch(
          `https://api.apollo.io/api/v1/organizations/${org.id}/job_postings`,
          { headers: { 'x-api-key': APOLLO_API_KEY, accept: 'application/json' } }
        );
        const jobsData = await jobsResp.json();
        jobPostings = jobsData.job_postings || jobsData.organization_job_postings || [];
      } catch (e) {
        console.error('Apollo job postings failed:', e);
      }
    }

    // ---- 3. Apollo People Search (free, no credits) ----
    let people = [];
    try {
      const peopleResp = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
        method: 'POST',
        headers: {
          'x-api-key': APOLLO_API_KEY,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          q_organization_domains_list: [cleanDomain],
          person_titles: [
            'chief security officer', 'ciso', 'vp security', 'vice president security',
            'director of security', 'head of security', 'chief risk officer',
            'director of facilities', 'director of ehs', 'chief operating officer', 'coo',
          ],
          person_seniorities: ['c_suite', 'vp', 'director', 'head'],
          per_page: 10,
          page: 1,
        }),
      });
      const peopleData = await peopleResp.json();
      people = peopleData.people || [];
    } catch (e) {
      console.error('Apollo people search failed:', e);
    }

    // ---- 4. Hand the raw data to Claude for judgment calls ----
    const claudePrompt = buildClaudePrompt({ domain: cleanDomain, email, org, jobPostings, people });

    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: claudePrompt }],
      }),
    });

    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      throw new Error(`Claude API error ${claudeResp.status}: ${errText}`);
    }

    const claudeData = await claudeResp.json();
    const textBlock = (claudeData.content || []).find((b) => b.type === 'text');
    if (!textBlock) throw new Error('Claude returned no text content');

    const result = extractJson(textBlock.text);

    return res.status(200).json(result);
  } catch (err) {
    console.error('analyze-lead error:', err);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}

function buildClaudePrompt({ domain, email, org, jobPostings, people }) {
  return `You are scoring a lead for TNG (The North Group), a physical/executive security and intelligence firm. Its target verticals are: Healthcare (hospital systems, health networks, health insurers), Education (K-12 districts, universities), Government (public sector, municipal/federal agencies), Entertainment & Events (venues, sports teams, promoters, festivals), High-Net-Worth/Private (family offices, private wealth, estates), and general Corporate (any large enterprise needing executive protection, embedded security, or insider threat programs).

CRITICAL: A vertical match means the company's own core business or industry classification IS that vertical — it does NOT mean the company merely sells products/services INTO that vertical as a client segment. For example: an IT services vendor, staffing agency, or consultancy that has a "VP of Healthcare & Government Accounts" or job postings mentioning "supporting healthcare clients" is a Corporate/IT-services company, NOT a Healthcare or Government company itself — its own industry classification is what matters, not who it sells to. Only
