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

## Endpoint

Once deployed on Vercel, the live endpoint is:

`https://YOUR-PROJECT-NAME.vercel.app/api/analyze-lead`

Send a POST request with JSON body `{ "domain": "example.com", "email": "optional@example.com" }`.

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
- The CORS header is currently open (`*`) so the frontend can call it from
  anywhere during testing. Restrict `Access-Control-Allow-Origin` in
  `api/analyze-lead.js` to your exact frontend domain once testing is done.
