// Cloudflare Worker backend for Poseidon ⇄ MegaNodes game launching.
// Deploy this separately from Surge. Keep MEGANODES_API_TOKEN as a Worker secret.
// Never put the token in public HTML/JS.

const MEGANODES_API_BASE = 'https://api-prd-v2.meganodes.net';

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers
    }
  });
}

function corsHeaders(request, env) {
  const requestOrigin = request.headers.get('Origin') || '*';
  const allowed = env.ALLOWED_ORIGIN || requestOrigin;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  };
}

function isSafeSymbol(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,100}$/.test(value);
}

async function callMegaNodes(path, payload, env) {
  const response = await fetch(`${MEGANODES_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.MEGANODES_API_TOKEN}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload || {})
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }

  if (!response.ok) {
    throw new Error(`MegaNodes HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  return data;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, service: 'poseidon-meganodes-launcher' }, 200, cors);
    }

    if (url.pathname !== '/launch-game') {
      return json({ error: 'Not found' }, 404, cors);
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, cors);
    }

    if (!env.MEGANODES_API_TOKEN) {
      return json({ error: 'Server is missing MEGANODES_API_TOKEN secret.' }, 500, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return json({ error: 'Invalid JSON body.' }, 400, cors);
    }

    const providerCode = Number(body.provider_code);
    const userCode = Number(body.user_code);
    const gameSymbol = String(body.game_symbol || '');
    const lang = String(body.lang || 'en').slice(0, 10);
    const returnUrl = body.return_url ? String(body.return_url).slice(0, 500) : undefined;

    if (!Number.isInteger(providerCode) || providerCode <= 0) {
      return json({ error: 'Invalid provider_code.' }, 400, cors);
    }
    if (!Number.isInteger(userCode) || userCode <= 0) {
      return json({ error: 'Invalid or missing user_code.' }, 400, cors);
    }
    if (!isSafeSymbol(gameSymbol)) {
      return json({ error: 'Invalid game_symbol.' }, 400, cors);
    }

    // PRODUCTION NOTE:
    // Do not trust user_code from the browser. Replace this demo input with your
    // own authentication/session lookup, then map the logged-in user to the
    // correct MegaNodes user_code on the server side.

    try {
      const mn = await callMegaNodes('/game/game-url', {
        user_code: userCode,
        provider_code: providerCode,
        game_symbol: gameSymbol,
        lang,
        return_url: returnUrl
      }, env);

      if (mn.code !== 0) {
        return json({ error: mn.message || 'MegaNodes returned an error.', meganodes_code: mn.code }, 400, cors);
      }

      return json({ launch_url: mn.data && mn.data.launch_url }, 200, cors);
    } catch (err) {
      return json({ error: String(err.message || err) }, 502, cors);
    }
  }
};
