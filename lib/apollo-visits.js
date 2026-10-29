// TNG Lead Scoring — tngdefense.com visits for one company, via Apollo's MCP server.
// Apollo's REST API doesn't expose Website Visitor data, but its MCP server does, and it
// accepts the same *master* API key (X-Api-Key) for server-to-server calls. A scoped key
// is rejected with 403 API_INACCESSIBLE. This read appears to cost no Apollo credits.
//
// Returns { available: true, total_visits, unique_visitors, last_visited_at, top_paths }
// or { available: false, reason } — callers treat "unavailable" as "tick pages manually".

const MCP_URL = 'https://mcp.apollo.io/mcp';
const TRACKED_DOMAIN = 'tngdefense.com';
const PROTOCOL_VERSION = '2025-06-18';
const LOOKBACK_DAYS = 90; // matches Apollo's "Last 3 months" view

let rpcId = 0;

// MCP over streamable HTTP answers either plain JSON or a server-sent-event stream.
async function readRpcResponse(resp) {
  const type = resp.headers.get('content-type') || '';
  const text = await resp.text();
  if (!type.includes('text/event-stream')) return text ? JSON.parse(text) : null;
  const messages = text.split(/\r?\n\r?\n/)
    .map((evt) => evt.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join(''))
    .filter(Boolean)
    .map((d) => JSON.parse(d));
  return messages.find((m) => m.result !== undefined || m.error !== undefined) || null;
}

async function mcpPost(apiKey, sessionId, body) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'X-Api-Key': apiKey,
    'MCP-Protocol-Version': PROTOCOL_VERSION,
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const resp = await fetch(MCP_URL, {
    method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) {
    const detail = (await resp.text().catch(() => '')).slice(0, 200);
    throw new Error(`Apollo MCP ${resp.status}${detail ? ': ' + detail : ''}`);
  }
  return { resp, sessionId: resp.headers.get('mcp-session-id') || sessionId };
}

const yyyymmdd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

export async function getSiteVisits(apiKey, organizationId) {
  if (!organizationId) return { available: false, reason: 'No Apollo company match' };
  try {
    // Handshake: initialize, then the "initialized" notification, then the tool call.
    let { resp, sessionId } = await mcpPost(apiKey, null, {
      jsonrpc: '2.0', id: ++rpcId, method: 'initialize',
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'tng-lead-scoring', version: '1.0.0' } },
    });
    const init = await readRpcResponse(resp);
    if (init && init.error) throw new Error(`Apollo MCP initialize: ${init.error.message}`);
    await mcpPost(apiKey, sessionId, { jsonrpc: '2.0', method: 'notifications/initialized' });

    const to = new Date();
    const from = new Date(to.getTime() - LOOKBACK_DAYS * 86400000);
    ({ resp } = await mcpPost(apiKey, sessionId, {
      jsonrpc: '2.0', id: ++rpcId, method: 'tools/call',
      params: {
        name: 'apollo_website_visitors_domain_aggregates',
        arguments: { organization_id: organizationId, domain: TRACKED_DOMAIN, from: yyyymmdd(from), to: yyyymmdd(to) },
      },
    }));
    const msg = await readRpcResponse(resp);
    if (!msg || msg.error) throw new Error(`Apollo MCP tool call: ${msg && msg.error ? msg.error.message : 'empty response'}`);

    const text = ((msg.result && msg.result.content) || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    const data = JSON.parse(text || '{}');
    // "stats not found" just means this company hasn't visited in the window.
    if (data.error) return { available: true, total_visits: 0, unique_visitors: 0, last_visited_at: null, top_paths: [] };

    const agg = (data.domain_aggregates || []).find((a) => a.domain === TRACKED_DOMAIN) || {};
    return {
      available: true,
      total_visits: agg.total_visits || 0,
      unique_visitors: agg.unique_visitors || 0,
      last_visited_at: data.last_visited_at || null,
      top_paths: (agg.top_paths || []).map((p) => ({ url: String(p.url || ''), visits: p.total_visits || 0 })),
    };
  } catch (err) {
    console.error('getSiteVisits error:', err);
    return { available: false, reason: err.message || 'Apollo visitor lookup failed' };
  }
}
