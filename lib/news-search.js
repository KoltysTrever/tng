// TNG Lead Scoring — shared plumbing for the news checks (security incidents, trigger
// events): one Claude call with the server-side web search tool, plus the date handling
// and cleanup both checks need. Each check supplies its own prompt and item types.

import { claudeErrorMessage } from './claude-error.js';

// Haiku: the job is reading news results and pulling out dated facts, and in a live
// comparison it found as much as Opus at a fraction of the cost. The debug option can
// still try another model.
export const DEFAULT_NEWS_MODEL = 'claude-haiku-5-5';
export const NEWS_MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'];
const MAX_CONTINUATIONS = 2; // server-side web search can pause a long turn; resume at most this often

// Claude's answer is split into several text blocks (citations break it up), so join them.
function collectText(content) {
  return (content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// An item's date as "YYYY-MM-DD" or "YYYY-MM". Accepts what the prompts ask for and the
// wordier forms a model sometimes writes anyway ("June 3, 2026", "June 2026").
function normalizeDate(date) {
  const s = String(date || '').trim();
  let m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/.exec(s);
  if (!m) {
    const w = /^([a-z]{3})[a-z]*\.?\s+(?:(\d{1,2}),?\s+)?(\d{4})$/i.exec(s);
    const month = w ? MONTH_NAMES.indexOf(w[1].toLowerCase()) + 1 : 0;
    if (!month) return null;
    m = [null, w[3], String(month), w[2]];
  }
  const pad = (n) => String(n).padStart(2, '0');
  return m[3] ? `${m[1]}-${pad(m[2])}-${pad(m[3])}` : `${m[1]}-${pad(m[2])}`;
}

// "2026-06" or "2026-06-03" → whole months before today (null if in the future).
function monthsAgo(date, now) {
  const [y, mo] = date.split('-').map(Number);
  const months = (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - mo);
  return months >= 0 ? months : null;
}

// Keeps items with a real link, a summary and a readable date inside the lookback window,
// newest first, and marks the ones recent enough to score. Also re-run on a saved result,
// so "recent" is always measured from today. An unknown type becomes `fallbackType`, or
// the item is dropped when there is none.
export function cleanNewsItems(list, now, { types, fallbackType = null, lookbackMonths, recentMonths, max }) {
  return (Array.isArray(list) ? list : [])
    .filter((i) => i && /^https?:\/\//i.test(String(i.source_url || '')) && i.summary)
    .map((i) => {
      const date = normalizeDate(i.date);
      const age = date ? monthsAgo(date, now) : null;
      return {
        date,
        site: i.site ? String(i.site).slice(0, 200) : null,
        type: types.includes(i.type) ? i.type : fallbackType,
        summary: String(i.summary).slice(0, 400),
        source_name: i.source_name ? String(i.source_name).slice(0, 100) : null,
        source_url: String(i.source_url),
        months_ago: age,
        recent: age !== null && age <= recentMonths,
      };
    })
    .filter((i) => i.type && i.months_ago !== null && i.months_ago <= lookbackMonths)
    .sort((a, b) => a.months_ago - b.months_ago)
    .slice(0, max);
}

// What each response block did, for the access-code-only debug option: the searches run,
// the results they returned, and anything else the model called along the way.
function traceBlocks(content) {
  return (content || []).map((b) => {
    if (b.type === 'server_tool_use') return { call: b.name, input: b.input };
    if (b.type === 'web_search_tool_result') {
      return Array.isArray(b.content)
        ? { results: b.content.map((r) => ({ title: r.title, url: r.url, page_age: r.page_age || null })) }
        : { results_error: b.content && b.content.error_code };
    }
    if (b.type === 'text') return null;
    return { block: b.type };
  }).filter(Boolean);
}

// Runs one news search turn. Returns { ok: true, json, searches, debugInfo } or
// { ok: false, reason, debugInfo }; throws on API or JSON errors (callers catch).
export async function runNewsSearch(apiKey, prompt, extractJson, { label, debug = false, model = DEFAULT_NEWS_MODEL, maxUses = 4 }) {
  // Server-side refusal fallbacks (a classifier false positive reroutes instead of failing)
  // exist for Opus; Haiku has none, so the option is only sent where it applies.
  const useFallbacks = model.startsWith('claude-opus');
  const headers = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    ...(useFallbacks ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {}),
  };
  const messages = [{ role: 'user', content: prompt }];

  let data;
  let searches = 0; // reported back so a thin answer can be told apart from a thin search
  const trace = [];
  for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt++) {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(70000),
      body: JSON.stringify({
        model,
        max_tokens: 16000,
        ...(useFallbacks ? { fallbacks: 'default' } : {}),
        // A quick check: low effort keeps searches few and the turn fast.
        output_config: { effort: 'low' },
        // The basic search tool, on purpose: the newer one filters results through code
        // execution, and at low effort a failed filter step left Claude answering "no
        // incidents" with the right articles already in its search results.
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: maxUses }],
        messages,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(claudeErrorMessage(`Claude ${label} error`, resp.status, errText));
    }
    data = await resp.json();
    searches += (data.content || []).filter((b) => b.type === 'server_tool_use' && b.name === 'web_search').length;
    if (debug) trace.push(...traceBlocks(data.content));
    if (data.stop_reason !== 'pause_turn') break;
    // Long search turns pause; send the partial turn back and the server resumes it.
    messages.push({ role: 'assistant', content: data.content });
  }

  const debugInfo = debug
    ? { debug: { model, stop_reason: data.stop_reason, usage: data.usage || null, trace, answer: collectText(data.content).slice(0, 6000) } }
    : {};
  if (data.stop_reason === 'refusal') return { ok: false, reason: `${label} was declined`, debugInfo };
  if (data.stop_reason === 'pause_turn') return { ok: false, reason: `${label} ran too long`, debugInfo };
  return { ok: true, json: extractJson(collectText(data.content)), searches, debugInfo };
}
