// Forzza-style real sports section for Poseidon.
// Data comes from the Render backend; layout is intentionally close to the original mobile Forzza sports pages.
(function () {
  'use strict';

  const BACKEND = (window.POSEIDON_CONFIG && window.POSEIDON_CONFIG.launchEndpoint)
    ? window.POSEIDON_CONFIG.launchEndpoint.replace(/\/launch-game\/?$/, '')
    : 'https://poseidon-meganodes-backend.onrender.com';

  const SPORTS = [
    { key: 'soccer', label: 'Soccer', icon: 'tw-sport-1000004' },
    { key: 'basketball', label: 'Basketball', icon: 'tw-sport-1000003' },
    { key: 'tennis', label: 'Tennis', icon: 'tw-sport-1000001' },
    { key: 'hockey', label: 'Ice Hockey', icon: 'tw-sport-1000002' },
    { key: 'football', label: 'American Football', icon: 'tw-sport-1000004' },
    { key: 'baseball', label: 'Baseball', icon: 'tw-sport-1000005' }
  ];

  const state = {
    sport: 'soccer',
    date: 'today',
    mode: detectMode(),
    events: [],
    q: '',
    loading: false,
    counts: {}
  };

  function detectMode() {
    const p = location.pathname.toLowerCase();
    if (p.includes('live')) return 'live';
    if (p.includes('result')) return 'results';
    if (p.includes('highlight')) return 'highlights';
    return 'upcoming';
  }

  function qs(id) { return document.getElementById(id); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

  function dateLabel(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso || '').slice(5, 10).replace('-', '.');
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
  }
  function timeLabel(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso || '').slice(11, 16);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function pageTitle() {
    if (state.mode === 'live') return 'Live betting';
    if (state.mode === 'results') return 'Results';
    if (state.mode === 'highlights') return 'Highlights';
    return 'Sports betting';
  }

  function addStyles() {
    if (qs('fzSportsStyle')) return;
    const s = document.createElement('style');
    s.id = 'fzSportsStyle';
    s.textContent = `
      #fzSports{background:#084772;color:#fff;min-height:65vh;font-family:Arial,Helvetica,sans-serif;padding-bottom:8px;}
      #fzSports *{box-sizing:border-box;}
      .fz-home{margin:0;padding:0;list-style:none;background:#084772;border-top:1px solid #0b5d93;}
      .fz-home li{height:46px;border-bottom:1px solid #063c63;background:#0a5a8f;}
      .fz-home a{display:flex!important;align-items:center;height:46px;padding:0 9px!important;text-decoration:none!important;color:#fff!important;text-shadow:none!important;font-size:13px!important;font-weight:normal!important;background:linear-gradient(#0b68a5,#075184)!important;border:0!important;box-shadow:none!important;}
      .fz-home .homeBox-span{flex:1;display:block;}
      .fz-home .menuBoxIconContainer{width:30px;height:30px;background-size:contain;background-position:center;background-repeat:no-repeat;margin-right:10px;}
      .fz-panel{background:#063e68;border-top:1px solid rgba(255,255,255,.12);border-bottom:1px solid rgba(0,0,0,.35);position:sticky;top:44px;z-index:12;}
      .fz-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#052f50;padding:1px;}
      .fz-tabs a{display:block;text-align:center;background:#0a5b91;color:#d9f1ff;text-decoration:none;padding:9px 3px;font-size:11px;border:0;text-shadow:none;}
      .fz-tabs a.active{background:#0096cf;color:#fff;font-weight:bold;}
      .fz-date{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#052f50;padding:1px;}
      .fz-date button{border:0;background:#0d6099;color:#fff;padding:8px 3px;font-size:11px;}
      .fz-date button.active{background:#e7e7e7;color:#0b4772;font-weight:bold;}
      .fz-search{display:flex;gap:6px;padding:7px;background:#073a62;}
      .fz-search input{flex:1;border:1px solid #0a6aa8;background:#052b49;color:#fff;border-radius:0;padding:8px 9px;font-size:12px;outline:0;}
      .fz-search button{border:0;background:#0b7dbe;color:#fff;padding:0 10px;font-size:12px;}
      .fz-sport-list{margin:0;padding:0;list-style:none;background:#084772;}
      .fz-sport-list li{border-bottom:1px solid #06395e;}
      .fz-sport{display:flex;align-items:center;width:100%;height:42px;border:0;background:#0a5a8f;color:#fff;padding:0 9px;text-align:left;}
      .fz-sport.active{background:#0875b8;}
      .fz-sport .ico{width:27px;height:27px;background-size:contain;background-position:center;background-repeat:no-repeat;margin-right:8px;}
      .fz-sport .name{flex:1;font-size:13px;}
      .fz-sport .count{min-width:35px;text-align:right;color:#d4edff;font-size:12px;}
      .fz-titlebar{height:31px;display:flex;align-items:center;background:#052f50;color:#e9f7ff;border-top:1px solid #0b659c;border-bottom:1px solid #031d31;padding:0 8px;font-size:12px;font-weight:bold;}
      .fz-titlebar .right{margin-left:auto;color:#b8def5;font-size:11px;font-weight:normal;}
      .fz-odds-head{display:grid;grid-template-columns:1fr 46px 46px 46px;gap:1px;background:#0a3150;color:#d9f1ff;font-size:10px;text-align:center;padding:0 6px 1px;}
      .fz-odds-head span{background:#063e68;padding:5px 0;}
      .fz-league{display:flex;align-items:center;min-height:34px;background:#063558;color:#fff;border-top:1px solid #0a6399;border-bottom:1px solid #02182a;padding:0 7px;font-size:12px;font-weight:bold;}
      .fz-league .ball{width:18px;height:18px;background-size:contain;background-repeat:no-repeat;background-position:center;margin-right:6px;}
      .fz-league .cnt{margin-left:auto;color:#c4e3f8;font-size:11px;font-weight:normal;}
      .fz-event{display:grid;grid-template-columns:1fr 46px 46px 46px;gap:1px;background:#0b4168;border-bottom:1px solid #062f4c;padding:0 6px;color:#fff;}
      .fz-event-main{display:grid;grid-template-columns:48px 1fr;min-height:58px;background:#0a5a8f;align-items:center;}
      .fz-time{text-align:center;color:#d7efff;font-size:10px;line-height:1.35;border-right:1px solid rgba(255,255,255,.12);padding:4px 2px;}
      .fz-live{display:inline-block;margin-top:2px;background:#e60000;color:#fff;border-radius:2px;padding:1px 4px;font-size:9px;animation:fzBlink 1.2s infinite;}
      @keyframes fzBlink{50%{opacity:.45}}
      .fz-teams{padding:5px 7px;min-width:0;}
      .fz-team{display:flex;align-items:center;justify-content:space-between;gap:5px;line-height:18px;font-size:12px;white-space:nowrap;overflow:hidden;}
      .fz-team b{font-weight:normal;overflow:hidden;text-overflow:ellipsis;}
      .fz-score{color:#ffd36a;font-weight:bold;font-size:12px;min-width:20px;text-align:right;}
      .fz-meta{font-size:9px;color:#b8ddf3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
      .fz-odd{border:0;border-radius:0;background:#e9edf1;color:#07456d;min-height:58px;font-size:12px;font-weight:bold;text-shadow:none;}
      .fz-odd span{display:block;font-size:9px;color:#57738a;font-weight:normal;margin-bottom:3px;}
      .fz-odd:disabled{background:#2a6289;color:#9dc5de;}
      .fz-odd:not(:disabled):active,.fz-odd.selected{background:#ffd36a;color:#052f50;}
      .fz-loading,.fz-empty{margin:0;padding:16px 10px;background:#0a5a8f;color:#d9f1ff;text-align:center;font-size:12px;border-top:1px solid #0a6399;}
      .fz-note{padding:7px 8px;color:#b8ddf3;background:#052f50;font-size:10px;border-top:1px solid #0b659c;line-height:1.35;}
      .fz-slip{position:fixed;left:0;right:0;bottom:54px;margin:auto;max-width:520px;z-index:99999;background:#031d31;color:#fff;border-top:2px solid #0096cf;box-shadow:0 -6px 18px rgba(0,0,0,.35);}
      .fz-slip-head{height:34px;display:flex;align-items:center;background:#000;padding:0 9px;font-size:12px;font-weight:bold;}
      .fz-slip-head button{margin-left:auto;border:0;background:#bd2222;color:#fff;border-radius:2px;padding:5px 8px;font-size:10px;}
      .fz-slip-body{max-height:150px;overflow:auto;padding:6px 9px;font-size:11px;}
      .fz-slip-item{border-bottom:1px solid rgba(255,255,255,.10);padding:5px 0;line-height:1.35;}
      @media(max-width:360px){.fz-event{grid-template-columns:1fr 42px 42px 42px;padding:0 3px}.fz-event-main{grid-template-columns:42px 1fr}.fz-odd{font-size:11px}.fz-home a{font-size:12px!important}}
    `;
    document.head.appendChild(s);
  }

  function shell() {
    const showHome = state.mode === 'upcoming';
    return `
      <div id="fzSports">
        ${showHome ? `
        <ul class="fz-home">
          <li><a href="live.html"><span class="menuBoxIconContainer tw-sport-1000000"></span><span class="homeBox-span">Live betting</span></a></li>
          <li><a href="highlights.html"><span class="menuBoxIconContainer tw-sport-1000002"></span><span class="homeBox-span">Highlights</span></a></li>
          <li><a href="#fzEvents"><span class="menuBoxIconContainer tw-sport-1000004"></span><span class="homeBox-span">Today</span></a></li>
        </ul>` : ''}
        <div class="fz-panel">
          <div class="fz-tabs">
            <a href="sports.html" class="${state.mode === 'upcoming' ? 'active' : ''}">Sports betting</a>
            <a href="live.html" class="${state.mode === 'live' ? 'active' : ''}">Live betting</a>
            <a href="highlights.html" class="${state.mode === 'highlights' ? 'active' : ''}">Highlights</a>
            <a href="results.html" class="${state.mode === 'results' ? 'active' : ''}">Results</a>
          </div>
          <div class="fz-date">
            <button type="button" data-date="yesterday">Yesterday</button>
            <button type="button" data-date="today" class="active">Today</button>
            <button type="button" data-date="tomorrow">Tomorrow</button>
          </div>
          <div class="fz-search">
            <input id="fzSearch" type="search" placeholder="Search" autocomplete="off">
            <button type="button" id="fzRefresh">Refresh</button>
          </div>
        </div>
        <div class="fz-titlebar">Sports <span class="right" id="fzTotal">Loading...</span></div>
        <ul class="fz-sport-list" id="fzSportList">
          ${SPORTS.map(s => sportButtonHtml(s)).join('')}
        </ul>
        <div class="fz-titlebar" id="fzEvents">${pageTitle()} <span class="right" id="fzSource">Real data</span></div>
        <div class="fz-odds-head"><span></span><span>1</span><span>X</span><span>2</span></div>
        <div id="fzList"><div class="fz-loading">Loading events...</div></div>
      </div>`;
  }

  function sportButtonHtml(s) {
    const count = state.counts[s.key];
    return `<li><button type="button" class="fz-sport ${state.sport === s.key ? 'active' : ''}" data-sport="${s.key}"><span class="ico ${s.icon}"></span><span class="name">${s.label}</span><span class="count">${count == null ? '' : count}</span></button></li>`;
  }

  function filteredEvents() {
    const q = state.q.toLowerCase();
    const list = q ? state.events.filter(e => `${e.league} ${e.homeTeam} ${e.awayTeam} ${e.venue || ''}`.toLowerCase().includes(q)) : state.events.slice();
    return list;
  }

  function groupByLeague(events) {
    const out = [];
    const map = new Map();
    events.forEach(e => {
      const k = e.league || 'Sports';
      if (!map.has(k)) { map.set(k, []); out.push([k, map.get(k)]); }
      map.get(k).push(e);
    });
    return out;
  }

  function marketHtml(event, m) {
    const disabled = !m || !m.odds || m.odds === 'OFF';
    const id = `${event.id}:${m ? m.label : ''}`;
    const selected = getSlip().some(x => x.id === id);
    return `<button type="button" class="fz-odd ${selected ? 'selected' : ''}" ${disabled ? 'disabled' : ''} data-event="${esc(event.id)}" data-market="${esc(m && m.label)}" data-odds="${esc(m && m.odds)}"><span>${esc(m && m.label)}</span>${esc((m && m.odds) || '—')}</button>`;
  }

  function eventHtml(e) {
    const live = e.statusState === 'in' || /live|in progress/i.test(`${e.status || ''} ${e.statusDetail || ''}`);
    const markets = (e.markets && e.markets.length ? e.markets : [{ label: '1' }, { label: 'X' }, { label: '2' }]).slice(0, 3);
    while (markets.length < 3) markets.push({ label: markets.length === 1 ? 'X' : '2' });
    return `<div class="fz-event" data-id="${esc(e.id)}">
      <div class="fz-event-main">
        <div class="fz-time"><div>${dateLabel(e.timestamp)}</div><div>${timeLabel(e.timestamp)}</div>${live ? '<span class="fz-live">LIVE</span>' : ''}</div>
        <div class="fz-teams">
          <div class="fz-team"><b>${esc(e.homeTeam)}</b><span class="fz-score">${e.homeScore == null ? '' : esc(e.homeScore)}</span></div>
          <div class="fz-team"><b>${esc(e.awayTeam)}</b><span class="fz-score">${e.awayScore == null ? '' : esc(e.awayScore)}</span></div>
          <div class="fz-meta">${esc(e.status || '')}${e.oddsProvider ? ' · ' + esc(e.oddsProvider) : ''}${e.venue ? ' · ' + esc(e.venue) : ''}</div>
        </div>
      </div>
      ${markets.map(m => marketHtml(e, m)).join('')}
    </div>`;
  }

  function render() {
    const list = filteredEvents();
    const total = qs('fzTotal');
    if (total) total.textContent = `${list.length} events`;
    const sportList = qs('fzSportList');
    if (sportList) sportList.innerHTML = SPORTS.map(s => sportButtonHtml(s)).join('');
    bindSportButtons();
    const source = qs('fzSource');
    if (source) source.textContent = list.length ? 'ESPN / TheSportsDB' : 'Real data';
    const root = qs('fzList');
    if (!root) return;
    if (!list.length) {
      root.innerHTML = `<div class="fz-empty">No ${state.mode === 'live' ? 'live ' : ''}events found.</div><div class="fz-note">Real sports data is shown only when available from providers.</div>`;
      updateSlip();
      return;
    }
    root.innerHTML = groupByLeague(list).map(([league, rows]) => `
      <div class="fz-league"><span class="ball tw-sport-1000004"></span><span>${esc(league)}</span><span class="cnt">${rows.length}</span></div>
      ${rows.map(eventHtml).join('')}
    `).join('') + `<div class="fz-note">Events, scores and available odds are real provider data. Empty odds mean the provider has not published a price.</div>`;
    bindOdds();
    updateSlip();
  }

  function getSlip() {
    try { return JSON.parse(localStorage.getItem('poseidon_sports_slip') || '[]'); } catch (_) { return []; }
  }

  function saveSlip(slip) { localStorage.setItem('poseidon_sports_slip', JSON.stringify(slip.slice(-20))); }

  function bindOdds() {
    qsa('.fz-odd:not([disabled])').forEach(btn => {
      btn.onclick = () => {
        const e = state.events.find(x => x.id === btn.dataset.event);
        if (!e) return;
        const id = `${e.id}:${btn.dataset.market}`;
        let slip = getSlip().filter(x => x.id !== id);
        slip.push({ id, event: `${e.homeTeam} vs ${e.awayTeam}`, league: e.league, market: btn.dataset.market, odds: btn.dataset.odds, time: e.timestamp });
        saveSlip(slip);
        render();
      };
    });
  }

  function updateFooterCounter() {
    const n = getSlip().length;
    const fbs = document.getElementById('fbsCounter');
    if (fbs) fbs.textContent = String(n);
  }

  function updateSlip() {
    updateFooterCounter();
    let slipBox = qs('fzSlip');
    const slip = getSlip();
    if (!slip.length) { if (slipBox) slipBox.remove(); return; }
    if (!slipBox) {
      slipBox = document.createElement('div');
      slipBox.id = 'fzSlip';
      slipBox.className = 'fz-slip';
      document.body.appendChild(slipBox);
    }
    slipBox.innerHTML = `<div class="fz-slip-head"><span>Bet slip (${slip.length})</span><button type="button">Clear</button></div><div class="fz-slip-body">${slip.map(i => `<div class="fz-slip-item"><b>${esc(i.market)}</b> @ ${esc(i.odds)}<br>${esc(i.event)}<br><span>${esc(i.league)}</span></div>`).join('')}</div>`;
    slipBox.querySelector('button').onclick = () => { localStorage.removeItem('poseidon_sports_slip'); render(); };
  }

  async function load() {
    state.loading = true;
    const root = qs('fzList');
    if (root) root.innerHTML = '<div class="fz-loading">Loading events...</div>';
    const url = `${BACKEND}/sports/events?sport=${encodeURIComponent(state.sport)}&date=${encodeURIComponent(state.date)}&mode=${encodeURIComponent(state.mode)}`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      state.events = data.events || [];
      state.counts[state.sport] = state.events.length;
      render();
    } catch (err) {
      if (root) root.innerHTML = `<div class="fz-empty">Data error: ${esc(err.message || err)}</div>`;
    } finally {
      state.loading = false;
    }
  }

  function bindSportButtons() {
    qsa('.fz-sport').forEach(btn => {
      btn.onclick = () => {
        state.sport = btn.dataset.sport;
        load();
      };
    });
  }

  function bindGlobal() {
    const search = qs('fzSearch');
    if (search) search.oninput = () => { state.q = search.value.trim(); render(); };
    const refresh = qs('fzRefresh');
    if (refresh) refresh.onclick = () => load();
    qsa('.fz-date button').forEach(btn => {
      btn.onclick = () => {
        qsa('.fz-date button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.date = btn.dataset.date;
        load();
      };
    });
    bindSportButtons();
  }

  function init() {
    const root = document.getElementById('twMainContentView') || document.getElementById('mobileMainContent') || document.body;
    addStyles();
    root.innerHTML = shell();
    bindGlobal();
    load();
    setInterval(() => { if (!state.loading && state.mode === 'live') load(); }, 45000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
