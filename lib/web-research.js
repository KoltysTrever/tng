// TNG Lead Scoring — web-research fallback for companies Apollo doesn't know.
// When Apollo's organization enrichment finds no match, Claude researches the domain
// with its server-side web search tool and returns a factual company profile in the
// same shape analyze-lead feeds to the scoring prompt. It's public-web data, so the
// page labels it as unverified and lists the sources.
//
// Returns { found: true, profile, leaders, sources } or { found: false, reason }.

const MODEL = 'claude-opus-5-5';
const MAX_CONTINUATIONS = 3; // server-side web search can pause a long turn; resume at most this often

function buildResearchPrompt(domain) {
  return `Research the company that owns the website "${domain}" using web search. Look at the company's own website first, then sources like its LinkedIn page, news coverage, press releases, and business directories. Spend only a few searches: this is a quick profile, not a deep investigation.

Report only what the sources actually say. Never guess a number, date, or name — use null when a source doesn't state it. If you can't confidently identify which company owns this domain, set "found" to false.

Respond with ONLY a raw JSON object, no markdown fences or commentary, in exactly this shape. Every string must be on one line, with any double quote inside a string escaped as \\".
{
  "found": boolean,
  "name": string or null,
  "website_url": string or null,
  "linkedin_url": string or null (the company's own LinkedIn page, copied exactly from a source),
  "founded_year": number or null,
  "industry": string or null (the company's own core business, e.g. "Hospital & Health Care", "Commercial Real Estate"),
  "short_description": string or null (1-3 plain sentences on what the company does),
  "estimated_num_employees": number or null,
  "annual_revenue_printed": string or null (only a figure a source states, e.g. "$45M"),
  "city": string or null,
  "state": string or null (full US state name for US companies),
  "country": string or null,
  "total_funding_printed": string or null,
  "latest_funding_round_date": string or null (YYYY-MM-DD, or YYYY-MM-01 if only the month is known),
  "latest_funding_stage": string or null,
  "retail_location_count": number or null (count of stores, branches, clinics, hotels or other physical sites, if a source states it),
  "is_subsidiary": boolean,
  "parent_company": string or null (only if a source explicitly names the parent or acquirer),
  "leaders": array of up to 6 objects { "name": string, "title": string or null, "linkedin_url": string or null } — named leaders from the company's own site or reputable sources, most senior first,
  "sources": array of the URLs you relied on (up to 6)
}`;
}

// Claude's answer is split into several text blocks (citations break it up), so join them.
function collectText(content) {
  return (content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

export async function researchCompany(apiKey, domain, extractJson) {
  const headers = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    // Opt into server-side refusal fallbacks so a classifier false positive reroutes instead of failing.
    'anthropic-beta': 'server-side-fallback-2026-07-01',
  };
  const messages = [{ role: 'user', content: buildResearchPrompt(domain) }];

  try {
    let data;
    for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt++) {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(75000),
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 16000,
          fallbacks: 'default',
          // A quick lookup: low effort keeps searches few and the turn fast.
          output_config: { effort: 'low' },
          tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }],
          messages,
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Claude web research error ${resp.status}: ${errText.slice(0, 300)}`);
      }
      data = await resp.json();
      if (data.stop_reason !== 'pause_turn') break;
      // Long search turns pause; send the partial turn back and the server resumes it.
      messages.push({ role: 'assistant', content: data.content });
    }

    if (data.stop_reason === 'refusal') return { found: false, reason: 'Web research was declined' };
    if (data.stop_reason === 'pause_turn') return { found: false, reason: 'Web research ran too long' };

    const result = extractJson(collectText(data.content));
    if (!result || !result.found || !result.name) {
      return { found: false, reason: 'No reliable public information found for this domain' };
    }
    const { leaders, sources, found, ...profile } = result;
    return {
      found: true,
      profile,
      leaders: Array.isArray(leaders) ? leaders.filter((l) => l && l.name).slice(0, 6) : [],
      sources: Array.isArray(sources) ? sources.filter((s) => typeof s === 'string').slice(0, 6) : [],
    };
  } catch (err) {
    console.error('researchCompany error:', err);
    return { found: false, reason: err.message || 'Web research failed' };
  }
}
