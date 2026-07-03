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

// ------------------------ Real sports data endpoints ------------------------
const SPORTS_CACHE = new Map();

function todayYMD(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

function normalizeDateParam(value) {
  const v = String(value || 'today').toLowerCase();
  if (v === 'today') return todayYMD(0);
  if (v === 'tomorrow') return todayYMD(1);
  if (v === 'yesterday') return todayYMD(-1);
  if (/^\d{8}$/.test(v)) return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return todayYMD(0);
}

function compactDate(value) {
  return String(value || '').replace(/-/g, '');
}

function sportsDbSportName(sport) {
  const map = {
    soccer: 'Soccer',
    football: 'American Football',
    basketball: 'Basketball',
    tennis: 'Tennis',
    hockey: 'Ice Hockey',
    baseball: 'Baseball',
    volleyball: 'Volleyball',
    handball: 'Handball'
  };
  return map[String(sport || 'soccer').toLowerCase()] || 'Soccer';
}

function espnConfig(sport) {
  const map = {
    soccer: { sport: 'soccer', league: 'all' },
    football: { sport: 'football', league: 'nfl' },
    basketball: { sport: 'basketball', league: 'nba' },
    hockey: { sport: 'hockey', league: 'nhl' },
    baseball: { sport: 'baseball', league: 'mlb' }
  };
  return map[String(sport || 'soccer').toLowerCase()] || map.soccer;
}

async function cachedJson(url, ttlMs = 60000) {
  const cached = SPORTS_CACHE.get(url);
  if (cached && cached.expires > Date.now()) return cached.data;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  const data = await response.json();
  SPORTS_CACHE.set(url, { data, expires: Date.now() + ttlMs });
  return data;
}

function americanToDecimal(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw || raw.toUpperCase() === 'OFF' || raw === '--') return null;
  const n = Number(raw.replace('+', ''));
  if (!Number.isFinite(n) || n === 0) return null;
  const decimal = n > 0 ? 1 + n / 100 : 1 + 100 / Math.abs(n);
  return decimal.toFixed(2);
}

function eventKey(home, away, date) {
  return `${String(date || '').slice(0, 10)}|${String(home || '').toLowerCase()}|${String(away || '').toLowerCase()}`;
}

function parseEspnEvents(data, sportKey, sourceName) {
  return (data.events || []).map((event) => {
    const competition = (event.competitions || [])[0] || {};
    const competitors = competition.competitors || [];
    const home = competitors.find(c => c.homeAway === 'home') || competitors[0] || {};
    const away = competitors.find(c => c.homeAway === 'away') || competitors[1] || {};
    const status = competition.status || event.status || {};
    const statusType = status.type || {};
    const odds = (competition.odds || []).find(Boolean) || null;
    const moneyline = odds && odds.moneyline;
    const pickOdds = (side) => side && ((side.current && side.current.odds) || (side.close && side.close.odds) || (side.open && side.open.odds));
    const homeOdds = pickOdds(moneyline && moneyline.home);
    const drawOdds = pickOdds(moneyline && moneyline.draw);
    const awayOdds = pickOdds(moneyline && moneyline.away);
    const markets = [
      { key: '1', label: '1', odds: americanToDecimal(homeOdds), sourceOdds: homeOdds },
      { key: 'X', label: 'X', odds: americanToDecimal(drawOdds), sourceOdds: drawOdds },
      { key: '2', label: '2', odds: americanToDecimal(awayOdds), sourceOdds: awayOdds }
    ];

    return {
      id: `espn:${event.id}`,
      source: sourceName || 'ESPN',
      sport: sportKey,
      league: (data.leagues && data.leagues[0] && (data.leagues[0].name || data.leagues[0].abbreviation)) || (sportKey === 'soccer' ? 'Football / Soccer' : sportKey),
      season: event.season && event.season.year,
      date: event.date || competition.date,
      timestamp: event.date || competition.date,
      status: statusType.description || statusType.name || status.displayClock || 'Scheduled',
      statusState: statusType.state || 'pre',
      statusDetail: statusType.detail || status.displayClock || '',
      venue: competition.venue && competition.venue.fullName,
      homeTeam: home.team && (home.team.displayName || home.team.name || home.team.shortDisplayName),
      awayTeam: away.team && (away.team.displayName || away.team.name || away.team.shortDisplayName),
      homeScore: home.score === undefined ? null : home.score,
      awayScore: away.score === undefined ? null : away.score,
      markets,
      oddsProvider: odds && odds.provider && (odds.provider.displayName || odds.provider.name),
      rawOdds: odds && odds.details,
      key: eventKey(home.team && (home.team.displayName || home.team.name), away.team && (away.team.displayName || away.team.name), event.date || competition.date)
    };
  }).filter(e => e.homeTeam && e.awayTeam);
}

function parseSportsDbEvents(data, sportKey) {
  return (data.events || []).map((event) => {
    const homeScore = event.intHomeScore == null || event.intHomeScore === '' ? null : String(event.intHomeScore);
    const awayScore = event.intAwayScore == null || event.intAwayScore === '' ? null : String(event.intAwayScore);
    const dt = event.strTimestamp || `${event.dateEvent || todayYMD()}T${event.strTime || '00:00:00'}`;
    const hasScore = homeScore !== null || awayScore !== null;
    const eventTime = new Date(dt).getTime();
    const state = hasScore ? 'post' : (eventTime < Date.now() - 3 * 3600000 ? 'post' : 'pre');
    return {
      id: `sportsdb:${event.idEvent}`,
      source: 'TheSportsDB',
      sport: sportKey,
      league: event.strLeague || sportsDbSportName(sportKey),
      season: event.strSeason,
      date: dt,
      timestamp: dt,
      status: hasScore ? 'Final / Result' : 'Scheduled',
      statusState: state,
      statusDetail: event.strStatus || '',
      venue: event.strVenue || '',
      homeTeam: event.strHomeTeam,
      awayTeam: event.strAwayTeam,
      homeScore,
      awayScore,
      markets: [
        { key: '1', label: '1', odds: null },
        { key: 'X', label: 'X', odds: null },
        { key: '2', label: '2', odds: null }
      ],
      oddsProvider: null,
      key: eventKey(event.strHomeTeam, event.strAwayTeam, dt)
    };
  }).filter(e => e.homeTeam && e.awayTeam);
}

function filterSportsMode(events, mode) {
  const normalized = String(mode || 'all').toLowerCase();
  if (normalized === 'live') return events.filter(e => e.statusState === 'in' || /live|in progress|half|quarter|period/i.test(`${e.status} ${e.statusDetail}`));
  if (normalized === 'results') return events.filter(e => e.statusState === 'post' || e.homeScore !== null || e.awayScore !== null);
  if (normalized === 'upcoming' || normalized === 'highlights') return events.filter(e => e.statusState !== 'post');
  return events;
}

async function getSportsEvents({ sport = 'soccer', date = 'today', mode = 'all' }) {
  const sportKey = String(sport || 'soccer').toLowerCase();
  const ymd = normalizeDateParam(date);
  const tasks = [];

  const espn = espnConfig(sportKey);
  if (espn) {
    const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/${espn.sport}/${espn.league}/scoreboard?dates=${compactDate(ymd)}`;
    tasks.push(cachedJson(espnUrl, 45000).then(data => parseEspnEvents(data, sportKey, 'ESPN')).catch(() => []));
  }

  const sportsDbUrl = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${ymd}&s=${encodeURIComponent(sportsDbSportName(sportKey))}`;
  tasks.push(cachedJson(sportsDbUrl, 180000).then(data => parseSportsDbEvents(data, sportKey)).catch(() => []));

  const lists = await Promise.all(tasks);
  const merged = [];
  const seen = new Set();
  for (const event of lists.flat()) {
    const key = event.key || event.id;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(event);
  }

  merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const filtered = filterSportsMode(merged, mode);
  return {
    code: 0,
    source: 'ESPN + TheSportsDB',
    note: 'Schedules, scores and available odds are sourced from public sports data providers. Odds appear only when a provider publishes them.',
    sport: sportKey,
    date: ymd,
    mode,
    total: filtered.length,
    events: filtered
  };
}

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'poseidon-meganodes-backend', dashboard: 'MegaNodes', time: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ ok: true, token_configured: Boolean(TOKEN), data_dir: DATA_DIR, time: new Date().toISOString() });
});


app.get('/sports/events', async (req, res, next) => {
  try {
    const data = await getSportsEvents({
      sport: req.query.sport || 'soccer',
      date: req.query.date || 'today',
      mode: req.query.mode || 'all'
    });
    res.json(data);
  } catch (e) { next(e); }
});

app.get('/sports/live', async (req, res, next) => {
  try {
    const data = await getSportsEvents({ sport: req.query.sport || 'soccer', date: req.query.date || 'today', mode: 'live' });
    res.json(data);
  } catch (e) { next(e); }
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
