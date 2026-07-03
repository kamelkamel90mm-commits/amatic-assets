require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MEGANODES_API_BASE = process.env.MEGANODES_API_BASE || 'https://api-prd-v2.meganodes.net';
const TOKEN = process.env.MEGANODES_API_TOKEN || '';
const REQUIRE_AUTH = String(process.env.REQUIRE_AUTH || 'false').toLowerCase() === 'true';
const AUTO_CREATE_USERS = String(process.env.AUTO_CREATE_USERS || 'true').toLowerCase() !== 'false';
const DEFAULT_LANG = process.env.DEFAULT_LANG || 'en';
const DEFAULT_RETURN_URL = process.env.DEFAULT_RETURN_URL || 'https://poseidon-casino-kamel.surge.sh/casino.html';
const INITIAL_DEPOSIT = Number(process.env.MEGANODES_INITIAL_DEPOSIT || 0);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'users.json');

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://poseidon-casino-kamel.surge.sh,http://localhost:3000,http://localhost:8080')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify({ users: {}, created_at: new Date().toISOString() }, null, 2));
  }
}

function readStore() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.users) parsed.users = {};
    return parsed;
  } catch (_) {
    return { users: {}, created_at: new Date().toISOString() };
  }
}

function writeStore(store) {
  ensureDataDir();
  const tmp = STORE_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, STORE_PATH);
}

function hash(value, len = 16) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, len);
}

function sanitizeMegaNodesName(input, fallbackSeed) {
  let value = String(input || '').split('@')[0].replace(/[^a-zA-Z0-9_.]/g, '_').replace(/_+/g, '_');
  if (!/^[a-zA-Z]/.test(value)) value = 'p_' + value;
  if (value.length < 2) value = 'p_' + hash(fallbackSeed, 10);
  value = value.slice(0, 38);
  // Keep the name deterministic and unique enough. Max 50 chars in MegaNodes schema.
  return `${value}_${hash(fallbackSeed, 8)}`.slice(0, 50);
}

function corsOptionsDelegate(req, callback) {
  const origin = req.header('Origin');
  if (!origin) return callback(null, { origin: false });
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    return callback(null, { origin, credentials: true });
  }
  return callback(null, { origin: false });
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptionsDelegate));
app.options('*', cors(corsOptionsDelegate));
app.use(express.json({ limit: '1mb' }));

function publicError(message, status = 400, extra = {}) {
  const err = new Error(message);
  err.status = status;
  err.public = true;
  err.extra = extra;
  return err;
}

async function megaNodesPost(apiPath, payload = {}) {
  if (!TOKEN) throw publicError('Server missing MEGANODES_API_TOKEN environment variable.', 500);

  const response = await fetch(`${MEGANODES_API_BASE}${apiPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }

  if (!response.ok) {
    throw publicError(`MegaNodes HTTP ${response.status}`, 502, { details: data });
  }
  return data;
}

async function getSupabaseUser(accessToken) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!accessToken || !url || !key) return null;

  const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) return null;
  return res.json();
}

async function resolveIdentity(req) {
  const auth = req.headers.authorization || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';

  if (bearer) {
    const supabaseUser = await getSupabaseUser(bearer);
    if (supabaseUser && supabaseUser.id) {
      const meta = supabaseUser.user_metadata || {};
      return {
        key: `supabase:${supabaseUser.id}`,
        displayName: meta.username || meta.name || supabaseUser.email || `user_${supabaseUser.id}`,
        source: 'supabase'
      };
    }
  }

  if (REQUIRE_AUTH) {
    throw publicError('Login required.', 401);
  }

  const anonymousId = String(req.body.anonymous_id || req.headers['x-anonymous-id'] || '').trim();
  if (anonymousId && /^[a-zA-Z0-9_.:-]{8,100}$/.test(anonymousId)) {
    return {
      key: `anonymous:${anonymousId}`,
      displayName: req.body.player_name || `guest_${anonymousId.slice(0, 10)}`,
      source: 'anonymous'
    };
  }

  const fallback = req.ip || 'guest';
  return {
    key: `guest:${hash(fallback, 20)}`,
    displayName: 'guest_' + hash(fallback, 8),
    source: 'guest'
  };
}

async function getOrCreateMegaNodesUser(identity) {
  const store = readStore();
  if (store.users[identity.key] && store.users[identity.key].user_code) {
    return { ...store.users[identity.key], created_now: false };
  }

  if (!AUTO_CREATE_USERS) {
    throw publicError('User is not linked to MegaNodes and AUTO_CREATE_USERS=false.', 409);
  }

  const mnName = sanitizeMegaNodesName(identity.displayName, identity.key);
  const created = await megaNodesPost('/user/create', { name: mnName });
  if (created.code !== 0 || !created.data || !created.data.user_code) {
    // If the deterministic name already exists but local storage was lost, retry with a new unique suffix.
    const retryName = sanitizeMegaNodesName(`${identity.displayName}_${Date.now()}`, `${identity.key}:${Date.now()}`);
    const retry = await megaNodesPost('/user/create', { name: retryName });
    if (retry.code !== 0 || !retry.data || !retry.data.user_code) {
      throw publicError(created.message || retry.message || 'Could not create MegaNodes user.', 502, { meganodes: created });
    }
    store.users[identity.key] = {
      user_code: retry.data.user_code,
      meganodes_name: retryName,
      point: retry.data.point,
      source: identity.source,
      created_at: new Date().toISOString()
    };
  } else {
    store.users[identity.key] = {
      user_code: created.data.user_code,
      meganodes_name: mnName,
      point: created.data.point,
      source: identity.source,
      created_at: new Date().toISOString()
    };
  }

  writeStore(store);

  const user = { ...store.users[identity.key], created_now: true };

  if (INITIAL_DEPOSIT > 0) {
    try {
      const dep = await megaNodesPost('/wallet/deposit', {
        user_code: user.user_code,
        amount: INITIAL_DEPOSIT
      });
      user.initial_deposit = dep;
    } catch (e) {
      // Do not fail launch because of initial deposit; expose a warning.
      user.initial_deposit_warning = e.message;
    }
  }

  return user;
}

function validateLaunchBody(body) {
  const providerCode = Number(body.provider_code);
  const userCode = body.user_code ? Number(body.user_code) : null;
  const gameSymbol = String(body.game_symbol || '').trim();
  const lang = String(body.lang || DEFAULT_LANG).slice(0, 10);
  const returnUrl = String(body.return_url || DEFAULT_RETURN_URL).slice(0, 500);

  if (!Number.isInteger(providerCode) || providerCode <= 0) {
    throw publicError('Invalid provider_code.', 400);
  }
  if (!/^[a-zA-Z0-9_.:-]{1,120}$/.test(gameSymbol)) {
    throw publicError('Invalid game_symbol.', 400);
  }
  if (userCode !== null && (!Number.isInteger(userCode) || userCode <= 0)) {
    throw publicError('Invalid user_code.', 400);
  }

  return { providerCode, userCode, gameSymbol, lang, returnUrl };
}

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'poseidon-meganodes-backend', dashboard: 'MegaNodes', time: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ ok: true, token_configured: Boolean(TOKEN), data_dir: DATA_DIR, time: new Date().toISOString() });
});

app.get('/api/providers', async (req, res, next) => {
  try {
    const data = await megaNodesPost('/game/providers', { lang: String(req.query.lang || DEFAULT_LANG) });
    res.json(data);
  } catch (e) { next(e); }
});

app.post('/api/providers', async (req, res, next) => {
  try {
    const data = await megaNodesPost('/game/providers', { lang: String(req.body.lang || DEFAULT_LANG) });
    res.json(data);
  } catch (e) { next(e); }
});

app.get('/api/games', async (req, res, next) => {
  try {
    const providerCode = Number(req.query.provider_code);
    if (!Number.isInteger(providerCode) || providerCode <= 0) throw publicError('provider_code is required.', 400);
    const payload = {
      provider_code: providerCode,
      category: req.query.category || undefined,
      lang: String(req.query.lang || DEFAULT_LANG),
      offset: Number(req.query.offset || 0),
      limit: Math.min(1000, Math.max(10, Number(req.query.limit || 500)))
    };
    const data = await megaNodesPost('/game/games', payload);
    res.json(data);
  } catch (e) { next(e); }
});

app.post('/api/games', async (req, res, next) => {
  try {
    const providerCode = Number(req.body.provider_code);
    if (!Number.isInteger(providerCode) || providerCode <= 0) throw publicError('provider_code is required.', 400);
    const payload = {
      provider_code: providerCode,
      category: req.body.category || undefined,
      lang: String(req.body.lang || DEFAULT_LANG),
      offset: Number(req.body.offset || 0),
      limit: Math.min(1000, Math.max(10, Number(req.body.limit || 500)))
    };
    const data = await megaNodesPost('/game/games', payload);
    res.json(data);
  } catch (e) { next(e); }
});

app.post('/user/link', async (req, res, next) => {
  try {
    const identity = await resolveIdentity(req);
    const user = await getOrCreateMegaNodesUser(identity);
    res.json({ code: 0, user_code: user.user_code, meganodes_name: user.meganodes_name, created_now: user.created_now, source: identity.source });
  } catch (e) { next(e); }
});

app.post('/launch-game', async (req, res, next) => {
  try {
    const { providerCode, userCode, gameSymbol, lang, returnUrl } = validateLaunchBody(req.body || {});

    let finalUserCode = userCode;
    let linkedUser = null;
    if (!finalUserCode) {
      const identity = await resolveIdentity(req);
      linkedUser = await getOrCreateMegaNodesUser(identity);
      finalUserCode = linkedUser.user_code;
    }

    const mn = await megaNodesPost('/game/game-url', {
      user_code: finalUserCode,
      provider_code: providerCode,
      game_symbol: gameSymbol,
      lang,
      return_url: returnUrl,
      win_ratio: req.body.win_ratio == null ? undefined : Number(req.body.win_ratio)
    });

    if (mn.code !== 0 || !mn.data || !mn.data.launch_url) {
      throw publicError(mn.message || 'MegaNodes did not return launch_url.', 502, { meganodes: mn });
    }

    res.json({
      code: 0,
      launch_url: mn.data.launch_url,
      user_code: finalUserCode,
      linked_user: linkedUser ? { created_now: linkedUser.created_now, source: linkedUser.source } : null
    });
  } catch (e) { next(e); }
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const body = {
    error: err.public ? err.message : 'Internal server error',
    status
  };
  if (err.extra) body.details = err.extra;
  if (process.env.NODE_ENV !== 'production' && !err.public) body.debug = err.message;
  res.status(status).json(body);
});

app.listen(PORT, () => {
  ensureDataDir();
  console.log(`Poseidon MegaNodes backend listening on port ${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
