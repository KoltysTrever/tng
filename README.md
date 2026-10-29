# TNG Lead Scoring — Backend Deployment

This is the small backend that lets the lead scoring tool work for anyone,
without needing Claude.ai or a personal MCP connection. It holds your Apollo
and Anthropic API keys server-side (never in the browser) and does 4 things
when called:

1. Calls Apollo Organization Enrichment (costs Apollo credits)
2. Calls Apollo Job Postings for that org (costs Apollo credits)
3. Calls Apollo People Search for a security-relevant contact (free, no credits)
4. Sends all that raw data to Claude, which does the judgment calls
   (Fortune 1000 guess, vertical matching, best-contact pick) and returns
   clean JSON back to the frontend page.

## Environment Variables (set these in Vercel, never in code)

- `APOLLO_API_KEY` — your Apollo API key
- `ANTHROPIC_API_KEY` — your Anthropic Console API key (starts with sk-ant-)
- `TNG_ACCESS_CODE` — shared code the frontend sends in the `x-tng-access-code`
  header; must match `ACCESS_CODE` in `tng_lead_scoring.html`. Requests without
  it are rejected with 401, so set it in Vercel *before* deploying this version.
- `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN` — a Zoho "Self
  Client" with read-only scopes `ZohoCRM.coql.READ`,
  `ZohoCRM.modules.accounts.READ`, `ZohoCRM.modules.contacts.READ`,
  `ZohoCRM.modules.leads.READ`. Optional: if any are missing, `/api/check-crm`
  answers `{ "configured": false }` and the page falls back to a manual check.
- `ZOHO_ACCOUNTS_URL`, `ZOHO_CRM_URL` — only if your Zoho account is not in the
  US data center (defaults `https://accounts.zoho.com` / `https://crm.zoho.com`).

## Companies Apollo doesn't know (web research fallback)

When Apollo's organization enrichment finds no match, `analyze-lead` asks Claude
(Opus 5.5 with the server-side web search tool, low effort, at most 5 searches)
to build a factual profile from public sources — see `lib/web-research.js`. The
profile is mapped onto the same curated shape as Apollo data, so the normal
scoring prompt and rules run on it. The response carries
`data_source: "web_research"` plus `research.sources`, and the page shows a
"Not in Apollo" notice with those links. Costs roughly the web search fee plus
one Opus call, only on lookups Apollo can't match. `vercel.json` raises
`analyze-lead`'s time limit to 120s to leave room for the research.

## Website visits (Apollo MCP)

`analyze-lead` also returns `site_visits`: the company's visits to tngdefense.com
over the last 90 days (total, unique visitors, last visit, top 5 pages), read
from Apollo's Website Visitors data. Apollo's REST API doesn't expose this, but
its MCP server (`https://mcp.apollo.io/mcp`) does, and it accepts the same
`APOLLO_API_KEY` in the `X-Api-Key` header — **only if it's a master key**
(scoped keys get 403). See `lib/apollo-visits.js`. If the lookup fails, Analyze
still succeeds with `site_visits: { available: false }` and the page falls back
to manual ticks.

## Zoho CRM check

`/api/check-crm` (same body and header as `analyze-lead`) looks the domain up in
Zoho CRM: Accounts whose Website matches, plus Contacts and Leads with an email
at that domain. It returns counts, a few linked records, and whether a typed
contact email is already in the CRM. Read-only, no Apollo credits. The page calls
it alongside Analyze and scores "Already in Zoho CRM" (+30) from the result.

## Endpoint

Once deployed on Vercel, the live endpoint is:

`https://YOUR-PROJECT-NAME.vercel.app/api/analyze-lead`

Send a POST request with JSON body `{ "domain": "example.com", "email": "optional@example.com" }`
and the `x-tng-access-code` header. All endpoints share `lib/guard.js`, which also
applies a best-effort limit of 20 requests per minute per IP (each Analyze click
uses two: `analyze-lead` and `check-crm`).

## Costs to expect

- Apollo: 2 credits per lookup (org enrichment + job postings). People
  search is free.
- Anthropic: roughly a fraction of a cent per lookup at Sonnet rates.
  Set a spend limit in the Anthropic Console as a safety net.
- Vercel: free tier covers this comfortably at low volume.

## Security notes

- Never commit real API keys into this repo. They belong only in Vercel's
  Environment Variables, which is what `api/analyze-lead.js` reads via
  `process.env`.
- The CORS header stays open (`*`) because the frontend is opened as a local
  file, which has no website origin to restrict to. The access code is what
  protects the endpoints (and your Apollo credits). Never commit the code
  itself — if the HTML file leaks, change `TNG_ACCESS_CODE` in Vercel and
  hand out an updated HTML file.
