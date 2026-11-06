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
(Sonnet 5.5 with the basic server-side web search tool, low effort, at most 5 searches)
to build a factual profile from public sources — see `lib/web-research.js`. The
profile is mapped onto the same curated shape as Apollo data, so the normal
scoring prompt and rules run on it. The response carries
`data_source: "web_research"` plus `research.sources`, and the page shows a
"Not in Apollo" notice with those links. Costs roughly the web search fee plus
one Sonnet call, only on lookups Apollo can't match. `vercel.json` raises
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

## Who can be reached (email on file)

Apollo's free People Search says for each person whether Apollo holds an email
(`has_email`) and a direct phone (`has_direct_phone`: yes / maybe / no). `analyze-lead`
passes the email flag to the scoring prompt (between close fits, the person Apollo can
reach ranks first), copies both flags onto each recommended contact, and returns
`more_people`: up to 10 other people at the company from the same search, ordered by role
(security, risk, HR, legal, facilities, operations, executives) and then email on file.
Lookups saved before these flags existed get them from the free search on their next read.
For EP-type leads (high-net-worth/private, or under 200 employees) the Chief of Staff, Executive
Assistant and House or Estate Manager rank first, in the scoring prompt's contact order and in
`more_people`; other leads keep security leaders first. The search asks for up to 50 people.
The page shows "Email on file" / "No email in Apollo" badges, warns before revealing
someone with no email on file, and lists the more people under the contacts; revealing
one (1 credit) adds them to the contacts, so exports and Push to Zoho include them.

## Push to Zoho

A **Push to Zoho** button on each vetted Hunter Brief lead (and on the Single Lead contact
card) creates **one Contact** in Zoho CRM: Contact Type (`Contact_Status`) = Prospect,
owned by the person pushing (matched by the work email they enter, remembered in their
browser), linked to the company's Account only when exactly one Account already has its
website (or, failing that, exactly its name), plus one Note with the opportunity score.
When the company isn't in Zoho, the push window offers **Also create [company] as an
Account** (ticked to start with for Heating up and Spicy leads): the Account gets the name,
website, owner, employee count and location from Apollo, and Account Type = Prospect when
that option exists in this Zoho. It can't edit or delete anything. `/api/zoho-push` takes `action: "check"` (setup check),
`"preview"` (what would be created and what blocks it; reads only) and `"create"`.

Setup: `ZOHO_PUSH_REFRESH_TOKEN`, a second refresh token from the same Self Client with
scopes `ZohoCRM.modules.contacts.CREATE`, `ZohoCRM.modules.contacts.READ`,
`ZohoCRM.modules.accounts.READ`, `ZohoCRM.modules.accounts.CREATE` (only needed for the
Account option), `ZohoCRM.modules.notes.CREATE`, `ZohoCRM.users.READ`,
`ZohoCRM.settings.fields.READ`. Pushing stays off until `ZOHO_PUSH_ENABLED=true` is set
(and redeployed); set it back to `false` to switch pushing off again (the kill switch).

Safeguards, all on the server (`lib/zoho-push.js`), whatever the page sends:
- every field checked: a real first and last name (no masked Apollo names or
  placeholders), a valid email or phone, a company, an active Zoho user as owner; text
  cleaned and length-capped; shared inboxes (info@, procurement@...) need a confirmation;
- not created when Zoho already has the person (same email in Contacts or Leads, or the
  same name at the same company; checked with the read-only token) or the tool pushed
  them in the last 90 days;
- a 5-minute lock per person (two clicks or two people at once create one Contact), one
  push per 10 seconds per person, and daily caps of 25 for the team and 10 per person;
- exactly one create call, never retried; on a timeout it looks the person up instead;
- an Account only when asked, only when no Account has the website or exact name, under
  its own 5-minute lock per company; if Zoho refuses it, nothing at all is created;
- Zoho workflows and approvals aren't triggered (`trigger: []`); every Contact's
  Description says it was added by the tool, on what date and by whom;
- if Zoho or the Upstash store can't be checked, nothing is created.

## Saved lookups (cache)

`analyze-lead`, `news-scan` and `parse-brief` save results for 7 days in Upstash
Redis (`lib/cache.js`), so looking the same company up again — a re-run, "Open in
Single Lead" from a brief, the same organization in the next brief — costs no Apollo
credits and no Claude call. Site visits and the Zoho check always run live. The page
says when a result was saved and offers "Refresh", which sends `refresh: true` and
spends credits on a fresh lookup. Lookups that found nothing (no Apollo match and no
web profile, or a failed news search) aren't saved, so a retry does real work.

Set up once: Vercel → the project → Storage → add **Upstash for Redis** (free tier) and
connect it to the project. That adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` (the
`UPSTASH_REDIS_REST_*` names also work); redeploy. Without them nothing is saved and
every lookup is fresh, as before.

## Security incidents and trigger events (one news search)

`/api/news-scan` (body `{ "domain": "...", "company_name": "optional" }`, same header)
asks Claude (Haiku 5.5 with the basic server-side web search tool, low effort, at most
6 searches: 3 for incidents, 3 for business events) for two lists, and returns each in
the shape the page uses (`incidents: {...}`, `events: {...}`). See `lib/news-scan.js`.

- **Security incidents:** physical incidents in the news in the last 24 months at the
  company's own sites or against its executives (assaults on staff, weapons, lockdowns,
  threats). Those in the last 12 months tick "Recent security incident" (+20) and add +1
  to a Hunter Brief lead's priority.
- **Trigger events:** business news in the last 12 months that creates a need for a TNG
  service: layoffs or WARN notices (Workplace Termination Support), a new or exposed
  executive (Executive Protection), a new or expanded facility (guard services), strikes
  and protests, large events. Those in the last 6 months tick "Trigger event" (+15) and
  add +0.5 to a brief lead's priority; each names the service to pitch.

Only items with a real source link and a readable date are kept, and finding nothing
never costs points. It never fails the request: errors come back as
`{ "available": false, "reason": "..." }`. No Apollo credits; about 6 cents of web
search plus about 1 cent of Haiku per new company, saved for 7 days. In a test on five
health systems, one shared search found as much as the two separate checks did with 8
searches. The separate `/api/incident-scan` and `/api/trigger-events` endpoints
(`lib/incident-scan.js`, `lib/trigger-events.js`, which keep each check's rules and
cleanup) still work, but the page no longer calls them.

## The page (tool/app.js) and the SharePoint launcher

The tool's page lives in this repo as `tool/app.js` (styles, markup and logic in one
file) and Vercel serves it at `/tool/app.js` with `Cache-Control: no-cache`, so every
push reaches users the next time they open the tool. What people open from SharePoint,
`tng_lead_scoring.html`, is a small launcher kept **out of this repo**: it sets
`window.TNG_CONFIG = { accessCode: "..." }` and loads `/tool/app.js`. `app.js` is
public, so it must never contain the access code or any other secret. `vercel.json`
also redirects `/lib/*` so the backend's shared source files aren't served as static
files.

## Hunter Brief (batch vetting)

The page's **Hunter Brief** tab takes one of Steve's daily Client Hunter Brief
`.html` files, or a Word (`.docx`) copy (V.4.7: converted to HTML in the browser by `mammoth`
1.8.0 from jsDelivr, loaded on demand with a pinned SRI hash; old `.doc` files are refused
with a Save As tip). Outreach drafts are only set aside from the `.html` version. The page turns the brief into plain text (links kept, outreach
drafts set aside) and posts `{ "text": "..." }` to `/api/parse-brief`. Claude
(Sonnet 5.5, low effort, structured JSON output) returns each ranked and watchlist
lead with only the fields needed to work it, plus the buying organization's
website domain and the state where the work would be (`site_licensed` comes from
the same licensed-state list as `analyze-lead`, now in `lib/licensing.js`). No
Apollo credits; one Claude call per brief (about 8 cents), and the same brief uploaded
again within 7 days is served from the saved copy. `vercel.json` gives it up to 300s.

The page then runs each lead the user ticks through `analyze-lead` + `check-crm`
(2 Apollo credits per lead, two leads at a time, waiting and retrying on 429) and
ranks them: Steve's score is the base, adjusted for Zoho CRM, site visits,
firmographic fit, a security contact, licensing and passed deadlines.

**Executive Report** downloads an editable Word document (.docx) for leadership, in
TNG's document style (white pages, black title band with the white logo, TNG header
and footer, page numbers): a bottom line naming the lead to start with, six counts
(ranked, hot, in Zoho, site visitors, in the news, due in 14 days), the top 5
opportunities with why now, what to pitch, next step, contact and value or deadline,
"Act this week" / "Watch outs" lists, and a table of every ranked lead. It's built in
the browser with the `docx` library (9.8.0 from jsDelivr, loaded on click and checked
against a pinned SRI hash). **Save as PDF** prints the same summary in the tool's dark
style, followed by the full lead-by-lead cards. Both use only results already on
screen: no credits, no Claude.

Single Lead has its own **Executive Report** (V.4.6) from the same builder: page one
is a bottom line (verdict, why now, who to start with, what to lead with), six counts,
the best contact and what to pitch; the pages after hold the company facts, the score
breakdown, every trigger event and incident with sources, the Zoho result, site visits
and all contacts. Also built only from what's on screen.

While the brief is being read, the page shows the steps and a countdown. Reading the
brief is a single Claude call, so the middle steps are paced by the expected time
(the average of past reads, saved in the browser) rather than reported by the server;
the last step stays open until the answer arrives. While vetting, each lead's chip
shows which of its three lookups (Apollo, Zoho, news) have come back, and
the status line estimates the time left from the leads finished so far.

## Endpoint

Once deployed on Vercel, the live endpoint is:

`https://YOUR-PROJECT-NAME.vercel.app/api/analyze-lead`

Send a POST request with JSON body `{ "domain": "example.com", "email": "optional@example.com" }`
and the `x-tng-access-code` header. All endpoints share `lib/guard.js`, which also
applies a best-effort limit of 60 requests per minute per IP (each Analyze click
uses three: `analyze-lead`, `check-crm` and `news-scan`).

## Scoring model

`analyze-lead` scores with Haiku 5.5 at low effort. In a side-by-side test on five
health systems it matched Sonnet 4.6 on 89 of 90 signals at about 1/16 of the cost.
The one miss came from Apollo listing a $103.6M revenue for a 160,000-employee system, so
`applyRevenueFloor` now raises the revenue tier when the headcount makes the reported
figure impossible. Each fresh lookup also saves its scoring input for 7 days
(`scoreinput:v1:...`), so `{ "debug": true, "compare_models": [...] }` can compare
models on it later without new Apollo credits.

## Costs to expect

- Apollo: 2 credits per lookup (org enrichment + job postings). People
  search is free.
- Anthropic, per new company: about 6 cents of web search plus 1 cent of Haiku for the
  news check, and a fraction of a cent for scoring. About 8 cents per brief read.
  Repeat lookups within 7 days are free. Set a spend limit in the Anthropic Console as
  a safety net.
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
