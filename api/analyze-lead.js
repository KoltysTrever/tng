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
    // Only run this if org enrichment actually found a real company match —
    // otherwise a bad/non-domain input (e.g. a company name instead of a
    // domain) can return unrelated people with no real connection to the lead.
    let people = [];
    if (org) {
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
        const rawPeople = peopleData.people || [];
        // Cross-check: keep only results whose employer domain actually matches,
        // in case Apollo's domain filter loosely matches on a bad/partial input.
        people = rawPeople.filter((p) => {
          const empDomain = (p.organization && (p.organization.primary_domain || p.organization.website_url)) || '';
          return !empDomain || empDomain.toLowerCase().includes(cleanDomain.toLowerCase());
        });
      } catch (e) {
        console.error('Apollo people search failed:', e);
      }
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

CRITICAL: A vertical match means the company's own core business or industry classification IS that vertical — it does NOT mean the company merely sells products/services INTO that vertical as a client segment. For example: an IT services vendor, staffing agency, or consultancy that has a "VP of Healthcare & Government Accounts" or job postings mentioning "supporting healthcare clients" is a Corporate/IT-services company, NOT a Healthcare or Government company itself — its own industry classification is what matters, not who it sells to. Only mark a vertical true if the organization's actual industry/business (per the industry field, SIC/NAICS codes, and company description) IS that vertical — e.g. a hospital system's own industry is Healthcare; a company that sells software to hospitals is not.

Here is raw data already retrieved from Apollo for the domain "${domain}"${email ? ` (contact email: ${email})` : ''}. Use ONLY this data — do not invent facts not present here.

ORGANIZATION DATA:
${org ? JSON.stringify(org, null, 2).slice(0, 4000) : 'No organization match found.'}

JOB POSTINGS (up to first 30):
${jobPostings.length ? JSON.stringify(jobPostings.slice(0, 30).map((j) => ({ title: j.title || j.name, url: j.url })), null, 2).slice(0, 3000) : 'No job postings data.'}

PEOPLE SEARCH RESULTS (candidates for best first contact — note: last names may be partially masked by Apollo, and linkedin_url may be missing/null for some records, that is expected):
${people.length ? JSON.stringify(people.slice(0, 10).map((p) => ({
    name: p.name, first_name: p.first_name, last_name: p.last_name,
    title: p.title, seniority: p.seniority, linkedin_url: p.linkedin_url,
  })), null, 2).slice(0, 3000) : 'No people found.'}

Based on this data, respond with ONLY a raw JSON object, no markdown fences, no commentary, in exactly this shape:
{
  "company_name": string or null,
  "industry": string or null,
  "employee_count": number or null,
  "estimated_revenue": string or null,
  "likely_fortune1000": boolean,
  "fortune1000_reasoning": string (one short phrase),
  "vertical_healthcare": boolean,
  "vertical_education": boolean,
  "vertical_government": boolean,
  "vertical_entertainment": boolean,
  "vertical_high_net_worth": boolean,
  "vertical_reasoning": string (one short phrase explaining the vertical call, based on the company's OWN industry, not its client base),
  "hiring_security_leadership": boolean,
  "hiring_detail": string (one short phrase, e.g. the role title found, or "No matching postings"),
  "key_contact_name": string or null,
  "key_contact_title": string or null,
  "key_contact_linkedin_url": string or null (copy exactly from the linkedin_url field of the chosen person in PEOPLE SEARCH RESULTS; use null if that field was empty/missing for them — do not guess or construct a URL),
  "key_contact_reasoning": string (one short phrase)
}

For key_contact, prefer in order: CSO/CISO, VP/Director of Security, Chief Risk Officer, Director of Facilities/EHS, then senior ops/COO as a last resort. Pick exactly one person from the people search results, or null with an explanation if none are a reasonable fit. Mark likely_fortune1000 true only with reasonable confidence. Mark verticals true only when the company's own core industry is a clear match — a company can match more than one vertical, or none. Being a vendor, consultant, or staffing provider to a vertical does NOT count as matching that vertical.

IMPORTANT — hiring_security_leadership must be based ONLY on the JOB POSTINGS data (i.e. they are currently, actively recruiting for a security leadership role right now). The fact that a CISO or security director already works there (found via PEOPLE SEARCH RESULTS) does NOT make this true — an existing security leader is not a hiring signal, it's the opposite. If JOB POSTINGS contains no open security-leadership role, set hiring_security_leadership to false and hiring_detail to "No matching postings", even if a security leader was found elsewhere in the data.`;
}

function extractJson(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in Claude response');
  return JSON.parse(cleaned.slice(start, end + 1));
}
