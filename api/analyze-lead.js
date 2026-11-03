// TNG Lead Scoring — backend relay
// Calls Apollo's REST API directly with a server-side key, then asks Claude
// to make the judgment calls (verticals, Fortune 1000 guess, best contact).
// Both API keys live only here, as environment variables — never in the browser.

import { guard } from '../lib/guard.js';
import { getSiteVisits } from '../lib/apollo-visits.js';
import { researchCompany } from '../lib/web-research.js';
import { matchLicensedState } from '../lib/licensing.js';
import { extractJson } from '../lib/extract-json.js';
import { claudeErrorMessage } from '../lib/claude-error.js';
import { cacheGet, cacheSet } from '../lib/cache.js';

// A saved lookup is reused for a week: firmographics and job postings move slowly, and a
// repeat lookup then costs no Apollo credits or Claude call. Site visits are always fresh.
const CACHE_TTL_SECONDS = 7 * 24 * 3600;

const SCORING_MODEL = 'claude-sonnet-4-6';
const SCORING_MODELS = ['claude-sonnet-4-6', 'claude-sonnet-5-5', 'claude-haiku-5-5'];

export default async function handler(req, res) {
  if (!guard(req, res)) return;

  // refresh: true skips the saved lookup and spends credits on a fresh one.
  // debug + compare_models: scores the same Apollo data with each listed model and returns
  // them side by side, saving nothing (the page never sends these). It reuses this week's
  // saved scoring input when there is one, so a repeat comparison costs no Apollo credits.
  const { domain, email, refresh, debug, compare_models } = req.body || {};
  const compareModels = debug === true && Array.isArray(compare_models)
    ? compare_models.filter((m) => SCORING_MODELS.includes(m)).slice(0, 3) : null;
  if (!domain) {
    return res.status(400).json({ error: 'domain is required' });
  }

  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!APOLLO_API_KEY || !ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server is missing APOLLO_API_KEY or ANTHROPIC_API_KEY env vars' });
  }

  const cleanDomain = domain.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  const cacheKey = `analyze:v1:${cleanDomain.toLowerCase()}:${String(email || '').trim().toLowerCase()}`;
  const promptKey = `scoreinput:v1:${cleanDomain.toLowerCase()}:${String(email || '').trim().toLowerCase()}`;

  try {
    if (compareModels && compareModels.length && refresh !== true) {
      const savedPrompt = await cacheGet(promptKey);
      if (savedPrompt && savedPrompt.prompt) {
        return res.status(200).json(await compareScoring(ANTHROPIC_API_KEY, savedPrompt.prompt, compareModels, 'saved scoring input'));
      }
    }

    // ---- 0. Looked up this week already? Reuse it (free), with fresh site visits ----
    if (refresh !== true && !compareModels) {
      const saved = await cacheGet(cacheKey);
      if (saved && saved.result) {
        const result = saved.result;
        result.site_visits = await getSiteVisits(APOLLO_API_KEY, saved.org_id);
        result.cached_at = saved.saved_at;
        return res.status(200).json(result);
      }
    }

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

    // ---- 1b. tngdefense.com visits for this company (Apollo MCP; started now, awaited at the end) ----
    // Never throws: resolves to { available: false } on any failure, so scoring always continues.
    const siteVisitsPromise = getSiteVisits(APOLLO_API_KEY, org && org.id);

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
              'risk management director', 'director of risk management', 'risk director',
              'director of facilities', 'director of ehs', 'chief operating officer', 'coo',
              'vp human resources', 'vice president human resources', 'director of human resources',
              'chief people officer', 'chief human resources officer', 'chro',
              'general counsel', 'vp legal', 'vice president legal', 'chief legal officer',
              'chief administrative officer', 'cao',
              'executive assistant', 'assistant to the ceo', 'assistant to the founder',
              'chief executive officer', 'ceo', 'president', 'owner', 'founder', 'co-founder',
              'managing director', 'general manager', 'vp operations', 'vice president operations',
              'director of operations', 'head of operations',
            ],
            per_page: 25,
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

    // ---- 3b. Not in Apollo? Research the company on the public web instead ----
    // The profile is shaped like curated Apollo data, so the same scoring prompt and rules apply.
    let curatedOrg = curateOrgData(org);
    let research = null;
    if (!org) {
      research = await researchCompany(ANTHROPIC_API_KEY, cleanDomain, extractJson);
      if (research.found) {
        curatedOrg = profileToCuratedOrg(research.profile);
        people = research.leaders.map((l) => ({
          id: null, name: l.name, first_name: String(l.name).split(' ')[0], last_name: null,
          title: l.title || null, seniority: null, linkedin_url: l.linkedin_url || null,
        }));
      }
    }

    // ---- 4. Hand the raw data to Claude for judgment calls ----
    const claudePrompt = buildClaudePrompt({ domain: cleanDomain, email, org: curatedOrg, jobPostings, people });
    // Kept for a week so a scoring model can be compared later without new Apollo lookups.
    if (org || (research && research.found)) {
      await cacheSet(promptKey, { prompt: claudePrompt, saved_at: new Date().toISOString() }, CACHE_TTL_SECONDS);
    }
    if (compareModels && compareModels.length) {
      return res.status(200).json(await compareScoring(ANTHROPIC_API_KEY, claudePrompt, compareModels, 'fresh Apollo lookup'));
    }

    const { result } = await scoreLead(ANTHROPIC_API_KEY, claudePrompt);

    // Informational only — never affects scoring. Deterministic list match, not an LLM judgment call.
    const licensedStateName = matchLicensedState(curatedOrg && curatedOrg.state, curatedOrg && curatedOrg.country);
    result.licensed_state_match = !!licensedStateName;
    result.licensed_state_name = licensedStateName;

    // Deterministic data straight from Apollo — the page maps paths to its checklist.
    result.site_visits = await siteVisitsPromise;

    // Tells the page whether the profile came from Apollo or the web-research fallback.
    result.data_source = research && research.found ? 'web_research' : 'apollo';
    if (research) {
      result.research = { found: research.found, reason: research.reason || null, sources: research.sources || [] };
    }

    // Save it for next time, but not a lookup that found nothing to score (a typo, or a
    // failed web search) — that should be free to retry properly.
    if (org || (research && research.found)) {
      const { site_visits, ...toSave } = result;
      await cacheSet(cacheKey, { result: toSave, org_id: org ? org.id : null, saved_at: new Date().toISOString() }, CACHE_TTL_SECONDS);
    }
    result.cached_at = null;

    return res.status(200).json(result);
  } catch (err) {
    console.error('analyze-lead error:', err);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}

// The scoring call: Claude reads the curated Apollo data and makes the judgment calls.
async function scoreLead(apiKey, prompt, model = SCORING_MODEL) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      // ~40 fields plus up to 3 contacts with reasoning — 1000 was cutting answers off mid-JSON.
      max_tokens: 3000,
      // Newer models take an effort setting; filling in fields from given data needs little thought.
      ...(model === 'claude-sonnet-4-6' ? {} : { output_config: { effort: 'low' } }),
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(claudeErrorMessage('Claude API error', resp.status, errText));
  }

  const data = await resp.json();
  if (data.stop_reason === 'max_tokens') {
    throw new Error('Claude response was cut off before finishing (hit max_tokens) — try again');
  }
  const textBlock = (data.content || []).find((b) => b.type === 'text');
  if (!textBlock) throw new Error('Claude returned no text content');
  return { result: extractJson(textBlock.text), usage: data.usage || null };
}

// Debug only: the same scoring input through each model, with its token use and time.
async function compareScoring(apiKey, prompt, models, source) {
  const runs = await Promise.all(models.map(async (model) => {
    const started = Date.now();
    try {
      const { result, usage } = await scoreLead(apiKey, prompt, model);
      return { model, ms: Date.now() - started, usage, result };
    } catch (err) {
      return { model, ms: Date.now() - started, error: err.message };
    }
  }));
  return { compare: runs, source, prompt_chars: prompt.length };
}

// Apollo's raw organization object can exceed 250,000 characters (technology_names
// alone can have 1,000+ entries), which silently buried funding/growth/tech fields
// past any reasonable truncation cutoff. Instead of truncating blindly, pull out
// exactly the fields that matter (confirmed against real Apollo API responses) and
// pre-filter the huge tech list down to only security-relevant hits.
const SECURITY_TECH_KEYWORDS = [
  'genetec', 'verkada', 'lenel', 'milestone', 'avigilon', 'axis communications',
  'openpath', 'kisi', 'brivo', 'rhombus', 'honeywell security', 'bosch security',
  'hikvision', 'dahua', 'pelco', 'salto', 'hid global', 'suprema', 'gallagher security',
  'johnson controls', 'adt', 'stanley security', 'convergint', 'paxton',
];

function curateOrgData(org) {
  if (!org) return null;
  const techList = Array.isArray(org.technology_names) ? org.technology_names : [];
  const matchedSecurityTech = techList.filter((t) =>
    SECURITY_TECH_KEYWORDS.some((kw) => String(t).toLowerCase().includes(kw))
  );

  return {
    name: org.name,
    website_url: org.website_url,
    linkedin_url: org.linkedin_url,
    founded_year: org.founded_year,
    industry: org.industry,
    industries: org.industries,
    secondary_industries: org.secondary_industries,
    keywords: Array.isArray(org.keywords) ? org.keywords.slice(0, 15) : org.keywords,
    estimated_num_employees: org.estimated_num_employees,
    organization_revenue_printed: org.organization_revenue_printed,
    annual_revenue_printed: org.annual_revenue_printed,
    city: org.city,
    state: org.state,
    country: org.country,
    short_description: org.short_description,
    total_funding_printed: org.total_funding_printed,
    latest_funding_round_date: org.latest_funding_round_date,
    latest_funding_stage: org.latest_funding_stage,
    funding_events: Array.isArray(org.funding_events) ? org.funding_events.slice(0, 5) : org.funding_events,
    organization_headcount_six_month_growth: org.organization_headcount_six_month_growth,
    organization_headcount_twelve_month_growth: org.organization_headcount_twelve_month_growth,
    organization_headcount_twenty_four_month_growth: org.organization_headcount_twenty_four_month_growth,
    matched_security_relevant_technologies: matchedSecurityTech,
    total_technologies_count: techList.length,
    is_subsidiary: !!org.owned_by_organization_id,
    num_suborganizations: org.num_suborganizations || 0,
    retail_location_count: org.retail_location_count || 0,
    sic_codes: Array.isArray(org.sic_codes) ? org.sic_codes : [],
    naics_codes: Array.isArray(org.naics_codes) ? org.naics_codes : [],
    suborganization_names: Array.isArray(org.suborganizations)
      ? org.suborganizations.slice(0, 5).map((s) => s.name).filter(Boolean)
      : [],
  };
}

// Maps a web-research profile (lib/web-research.js) onto the curated Apollo shape the
// scoring prompt expects. Fields web research can't supply stay empty, so their signals
// (security tech, headcount growth, SIC/NAICS) simply come out false.
function profileToCuratedOrg(p) {
  const parentNote = p.parent_company ? ` It is part of ${p.parent_company}.` : '';
  return {
    data_source: 'public web research (Apollo had no record) — less reliable than Apollo data',
    name: p.name,
    website_url: p.website_url,
    linkedin_url: p.linkedin_url,
    founded_year: p.founded_year,
    industry: p.industry,
    industries: [],
    secondary_industries: [],
    keywords: [],
    estimated_num_employees: p.estimated_num_employees,
    organization_revenue_printed: null,
    annual_revenue_printed: p.annual_revenue_printed,
    city: p.city,
    state: p.state,
    country: p.country,
    short_description: p.short_description ? p.short_description + parentNote : parentNote.trim() || null,
    total_funding_printed: p.total_funding_printed,
    latest_funding_round_date: p.latest_funding_round_date,
    latest_funding_stage: p.latest_funding_stage,
    funding_events: [],
    organization_headcount_six_month_growth: null,
    organization_headcount_twelve_month_growth: null,
    organization_headcount_twenty_four_month_growth: null,
    matched_security_relevant_technologies: [],
    total_technologies_count: 0,
    is_subsidiary: !!p.is_subsidiary,
    num_suborganizations: 0,
    retail_location_count: p.retail_location_count || 0,
    sic_codes: [],
    naics_codes: [],
    suborganization_names: [],
  };
}

function buildClaudePrompt({ domain, email, org, jobPostings, people }) {
  return `You are scoring a lead for TNG (The North Group), a physical/executive security and intelligence firm. Its target verticals are: Healthcare (hospital systems, health networks, health insurers), Education (K-12 districts, universities), Government (public sector, municipal/federal agencies), Entertainment & Events (venues, sports teams, promoters, festivals), High-Net-Worth/Private (family offices, private wealth, estates), IT/Network Security (managed security providers, MSPs, data centers, cybersecurity firms, cloud infrastructure companies), Telecommunications (telecom carriers, connectivity/network providers, ISPs), Financial Services (banks, credit unions, investment firms, insurance companies — a strong fit for TNG's Secure Asset Transport / armed escort services), Manufacturing/Industrial (factories, industrial contractors, industrial engineering firms), Retail/Hospitality (hotels, casinos, large retail chains — a strong fit for Security Guard Services, especially multi-location operators), Energy/Utilities/Critical Infrastructure (oil & gas, electric/water utilities, renewables), Real Estate/Property Management (commercial real estate, property management firms with multiple managed sites), and general Corporate (any large enterprise needing executive protection, embedded security, or insider threat programs).

CRITICAL: A vertical match means the company's own core business or industry classification IS that vertical — it does NOT mean the company merely sells products/services INTO that vertical as a client segment. For example: an IT services vendor, staffing agency, or consultancy that has a "VP of Healthcare & Government Accounts" or job postings mentioning "supporting healthcare clients" is a Corporate/IT-services company, NOT a Healthcare or Government company itself — its own industry classification is what matters, not who it sells to. Only mark a vertical true if the organization's actual industry/business (per the industry field, SIC/NAICS codes, and company description) IS that vertical — e.g. a hospital system's own industry is Healthcare; a company that sells software to hospitals is not.

Here is data already retrieved ${org && org.data_source ? 'from public web research (Apollo had no record of this company)' : 'from Apollo'} for the domain "${domain}"${email ? ` (contact email: ${email})` : ''}. Use ONLY this data — do not invent facts not present here.

ORGANIZATION DATA (${org && org.data_source ? 'from public web research — fields a source didn\'t state are null or empty' : 'curated — funding, growth, and matched security-tech fields are pulled directly from Apollo, not truncated'}):
${org ? JSON.stringify(org, null, 2) : 'No organization match found.'}

JOB POSTINGS (up to first 30):
${jobPostings.length ? JSON.stringify(jobPostings.slice(0, 30).map((j) => ({ title: j.title || j.name, url: j.url })), null, 2).slice(0, 3000) : 'No job postings data.'}

PEOPLE SEARCH RESULTS (candidates for best first contact — note: last names may be partially masked by Apollo, and linkedin_url may be missing/null for some records, that is expected):
${people.length ? JSON.stringify(people.slice(0, 10).map((p) => ({
    id: p.id, name: p.name, first_name: p.first_name, last_name: p.last_name,
    title: p.title, seniority: p.seniority, linkedin_url: p.linkedin_url,
  })), null, 2).slice(0, 3000) : 'No people found.'}

Based on this data, respond with ONLY a raw JSON object, no markdown fences, no commentary, in exactly this shape. The output MUST be strictly valid JSON: every string value must be on a single line (replace any literal line break inside a string with a space instead), and any double-quote character that appears within a string's actual content (e.g. a nicknamed product or a quoted phrase from source text) must be properly backslash-escaped as \" — never leave a literal unescaped " inside a string value:
{
  "company_name": string or null,
  "industry": string or null,
  "employee_count": number or null,
  "estimated_revenue": string or null,
  "company_description": string or null (a 1-3 sentence plain-language summary of what the company actually does, based on the org data provided — do not invent facts not present in the data),
  "headquarters": string or null (e.g. "Chicago, Illinois" or "London, UK" — city/state/country from the org data, whatever is available),
  "founded_year": number or null,
  "company_linkedin_url": string or null (copy exactly from the organization's own linkedin_url field in ORGANIZATION DATA if present; use null if missing — do not guess or construct a URL),
  "is_subsidiary": boolean (copy directly from is_subsidiary in ORGANIZATION DATA),
  "parent_company_hint": string or null (ONLY if company_description or short_description text explicitly names the parent/acquiring company, e.g. "AOL was recently acquired by Bending Spoons" — extract that name; otherwise null. Never guess a parent company name that isn't explicitly stated in the text),
  "num_suborganizations": number (copy directly from num_suborganizations in ORGANIZATION DATA),
  "suborganization_names": array of strings (copy directly from suborganization_names in ORGANIZATION DATA, do not invent names),
  "revenue_tier": "unknown" | "under_10m" | "10m_100m" | "100m_500m" | "500m_plus",
  "revenue_tier_reasoning": string (one short phrase citing the actual revenue or employee-count figure used, e.g. "$220M annual revenue" or "No revenue data; estimated from ~1,200 employees"),
  "vertical_healthcare": boolean,
  "vertical_education": boolean,
  "vertical_government": boolean,
  "vertical_entertainment": boolean,
  "vertical_high_net_worth": boolean,
  "vertical_it_network_security": boolean,
  "vertical_telecom": boolean,
  "vertical_financial_services": boolean,
  "vertical_manufacturing": boolean,
  "vertical_retail_hospitality": boolean,
  "vertical_energy_utilities": boolean,
  "vertical_real_estate": boolean,
  "vertical_reasoning": string (one short phrase explaining the vertical call, based on the company's OWN industry, not its client base),
  "hiring_security_leadership": boolean,
  "hiring_detail": string (one short phrase, e.g. the role title found, or "No matching postings"),
  "recently_funded": boolean,
  "funding_detail": string (one short phrase, e.g. "$50M Series C, March 2025" or "No funding data found"),
  "headcount_growth_signal": boolean,
  "headcount_growth_detail": string (one short phrase describing the actual growth figure found, e.g. "+22% headcount YoY" or "No notable growth data found"),
  "uses_security_tech": boolean,
  "security_tech_detail": string (one short phrase naming the specific technology/vendor found, e.g. "Uses Genetec access control" or "No security/access-control tech found in stack"),
  "multi_site_signal": boolean,
  "multi_site_detail": string (one short phrase citing the actual retail_location_count figure, e.g. "142 retail locations" or "No multi-site retail footprint found in data"),
  "key_contacts": array of up to 3 objects, ranked best-first, each in exactly this shape: { "name": string, "title": string or null, "linkedin_url": string or null (copy exactly from that person's linkedin_url in PEOPLE SEARCH RESULTS, null if missing — never guess or construct a URL), "apollo_id": string or null (copy exactly from that person's id field, used later to precisely re-fetch this exact person — never guess or invent an id), "reasoning": string (one short phrase explaining why this person ranks where they do) } — return an empty array [] only if PEOPLE SEARCH RESULTS is genuinely empty
}

For key_contacts, rank candidates in this priority order: (1) CSO/CISO, (2) VP/Director of Security, (3) Chief Risk Officer, (4) VP/Director/Chief of HR or People — a strong fit since Workplace Termination Support is a named TNG service and HR typically initiates that kind of engagement, (5) General Counsel/VP Legal — often the actual gatekeeper for vendor/security decisions when there's no dedicated security function, (6) Director of Facilities/EHS, (7) Chief Administrative Officer, (8) senior Operations/COO/General Manager/Managing Director, (9) for very small or founder-led companies, an Executive Assistant to the CEO/Founder — often the real point of contact for personal/executive protection conversations at that size, (10) FINAL CATCH-ALL — if none of the above roles appear anywhere in the results, the single most senior person present regardless of their specific title or department (CEO, President, Owner, Founder, any VP, any Director, any "Head of" role, in roughly that order of seniority). Return up to 3 distinct people from the people search results in this ranked order as the key_contacts array — do not skip past an earlier, better-fitting match if one exists, and do not return duplicates. If fewer than 3 reasonable candidates exist, return fewer (even just 1) rather than padding with weak matches. IMPORTANT: if the PEOPLE SEARCH RESULTS list contains ANY person at all, key_contacts must not be empty — return at least the single most senior person available. Empty array is reserved strictly for when that list is genuinely empty.

For revenue_tier, base it primarily on annual_revenue_printed or organization_revenue_printed in ORGANIZATION DATA; if revenue data is missing, you may estimate from estimated_num_employees as a rough proxy but must say so plainly in revenue_tier_reasoning (e.g. "No revenue data; estimated from employee count") — never invent a specific dollar figure that isn't in the data. Use "unknown" if there's not enough information to make any reasonable estimate, and "under_10m" if the company is clearly smaller than $10M. Mark verticals true only when the company's own core industry is a clear match — a company can match more than one vertical, or none. Being a vendor, consultant, or staffing provider to a vertical does NOT count as matching that vertical. When available, cross-reference sic_codes and naics_codes in ORGANIZATION DATA alongside the industry/industries text fields — these are standardized classification codes and give a more reliable signal than free-text industry descriptions alone (e.g. SIC codes in the 6000-6300 range generally indicate banking/finance/insurance; 2000-3999 generally indicate manufacturing; 7000-7999 often indicate hospitality/retail/services; 1200-1499 and 4900-4999 often indicate energy/utilities/mining; 6500-6553 generally indicate real estate). Use these codes as supporting evidence, not the sole basis — the industry/description text and your own judgment still matter most.

IMPORTANT — hiring_security_leadership must be based ONLY on the JOB POSTINGS data (i.e. they are currently, actively recruiting for a security leadership role right now). The fact that a CISO or security director already works there (found via PEOPLE SEARCH RESULTS) does NOT make this true — an existing security leader is not a hiring signal, it's the opposite. If JOB POSTINGS contains no open security-leadership role, set hiring_security_leadership to false and hiring_detail to "No matching postings", even if a security leader was found elsewhere in the data.

IMPORTANT — recently_funded, headcount_growth_signal, and uses_security_tech must be based strictly on fields present in ORGANIZATION DATA — never invent a funding round, growth figure, or technology that isn't actually present in that JSON. For recently_funded: check total_funding_printed, latest_funding_round_date, latest_funding_stage, and funding_events — mark true only if latest_funding_round_date (or a date within funding_events) falls within roughly the last 18 months; if these fields are null/empty/absent, set it false and say "No recent funding event data found" (do not treat old historical funding as recent). For headcount_growth_signal: check organization_headcount_six_month_growth, organization_headcount_twelve_month_growth, and organization_headcount_twenty_four_month_growth — mark true only if at least one shows meaningfully positive growth (e.g. double-digit percentage), and state the actual figure in the detail; if all are null/zero/absent, set it false and say "No notable growth data found". For uses_security_tech: check the matched_security_relevant_technologies array — if it contains any entries, mark true and name them in the detail; if it's empty, set false and say "No security/access-control tech found in stack" (do not evaluate total_technologies_count or any other tech field for this signal — it exists only for your own context on how large the full stack is). For multi_site_signal: check retail_location_count — mark true only if it is 5 or greater (a handful of offices doesn't represent a meaningful multi-site guard/security services opportunity), and state the exact count in the detail (e.g. "142 retail locations"); if it's 0, null, or below 5, set false and say "No multi-site retail footprint found in data".`;
}
