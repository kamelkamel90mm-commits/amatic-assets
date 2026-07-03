// Forzza-compatible sports data layer.
// It keeps the original Forzza mobile shell/classes and injects real events into the existing listview layout.
(function () {
  'use strict';

  const BACKEND = (window.POSEIDON_CONFIG && window.POSEIDON_CONFIG.launchEndpoint)
    ? window.POSEIDON_CONFIG.launchEndpoint.replace(/\/launch-game\/?$/, '')
    : 'https://poseidon-meganodes-backend.onrender.com';

  const SPORT_MAP = {
    soccer: { label: 'Soccer', id: 1, icon: 'tw-sport-1', homeSelector: "a[href='#betting/sport/1']" },
    tennis: { label: 'Tennis', id: 5, icon: 'tw-sport-5', homeSelector: "a[href='#betting/sport/5']" },
    basketball: { label: 'Basketball', id: 2, icon: 'tw-sport-2', homeSelector: "a[href='#betting/sport/2']" },
    hockey: { label: 'Ice Hockey', id: 4, icon: 'tw-sport-4', homeSelector: "a[href='#betting/sport/4']" },
    football: { label: 'American Football', id: 20, icon: 'tw-sport-20', homeSelector: "a[href='#betting/sport/20']" },
    baseball: { label: 'Baseball', id: 3, icon: 'tw-sport-3', homeSelector: "a[href='#betting/sport/3']" }
  };
  const SPORTS = ['soccer', 'tennis', 'basketball', 'hockey', 'football', 'baseball'];

  const state = {
    sport: 'soccer',
    date: 'today',
    mode: detectMode(),
    events: [],
    q: '',
    originalHome: '',
    loading: false
  };

  function detectMode() {
    const p = location.pathname.toLowerCase();
    if (p.includes('live')) return 'live';
    if (p.includes('result')) return 'results';
    if (p.includes('highlight')) return 'highlights';
    return 'home';
  }
  function root() { return document.getElementById('twMainContentView') || document.getElementById('mobileMainContent') || document.body; }
  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
  function qsa(sel, r = document) { return Array.from(r.querySelectorAll(sel)); }

  function datePart(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso || '').slice(5, 10).replace('-', '.');
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
  }
  function timePart(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso || '').slice(11, 16);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function addStyle() {
    if (document.getElementById('forzzaSportsDataStyle')) return;
    const style = document.createElement('style');
    style.id = 'forzzaSportsDataStyle';
    style.textContent = `
      /* extra classes only fill the dynamic real-data parts; the shell remains original Forzza CSS */
      .real-sports-top{background:#073f69;border-bottom:1px solid #052f50;padding:6px 5px;}
      .real-sports-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#052d4c;margin-bottom:5px;}
      .real-sports-tabs a{display:block;background:#0b5f97;color:#fff!important;text-decoration:none!important;text-align:center;font-size:11px;padding:8px 2px;text-shadow:none!important;border:0!important;}
      .real-sports-tabs a.active{background:#0288c7;font-weight:bold;}
      .real-sports-filter{display:grid;grid-template-columns:1fr 88px;gap:5px;margin-bottom:5px;}
      .real-sports-filter input,.real-sports-filter select{height:32px;border:1px solid #0a6aa8;background:#052b49;color:#fff;padding:0 8px;border-radius:0;font-size:12px;}
      .real-date-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#052d4c;}
      .real-date-tabs button{height:31px;border:0;background:#0b5f97;color:#fff;font-size:11px;}
      .real-date-tabs button.active{background:#e7e7e7;color:#06466f;font-weight:bold;}
      .real-back{display:block!important;background:#063c63!important;color:#fff!important;text-decoration:none!important;padding:9px!important;font-size:12px!important;border-bottom:1px solid #03243d!important;}
      .real-loading,.real-empty{background:#0a5a8f;color:#d9f1ff;text-align:center;padding:14px 8px;font-size:12px;border-top:1px solid #0a659e;}
      .real-event-li{padding:0!important;background:#084772!important;border-bottom:1px solid #062f4c!important;}
      .real-event-li>a{padding:0!important;background:#0a5a8f!important;color:#fff!important;text-decoration:none!important;text-shadow:none!important;border:0!important;}
      .real-odds-row{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#06375b;padding:1px 6px 6px 102px;}
      .real-odd{border:0;background:#e9edf1;color:#07456d;min-height:34px;font-weight:bold;font-size:12px;}
      .real-odd span{display:block;font-size:9px;color:#60798c;font-weight:normal;}
      .real-odd:disabled{background:#2a6389;color:#9fc5dd;}
      .real-odd.selected{background:#ffd36a;color:#062f50;}
      .real-live-badge{display:inline-block;background:#e10000;color:#fff;font-size:9px;padding:1px 4px;margin-top:2px;border-radius:2px;animation:realblink 1.1s infinite;}
      @keyframes realblink{50%{opacity:.45}}
      .real-slip{position:fixed;left:0;right:0;bottom:54px;margin:auto;max-width:520px;z-index:99999;background:#031d31;color:#fff;border-top:2px solid #0096cf;box-shadow:0 -6px 18px rgba(0,0,0,.35);}
      .real-slip-head{display:flex;align-items:center;height:34px;background:#000;padding:0 9px;font-size:12px;font-weight:bold;}
      .real-slip-head button{margin-left:auto;border:0;background:#bd2222;color:#fff;border-radius:2px;padding:5px 8px;font-size:10px;}
      .real-slip-body{max-height:145px;overflow:auto;padding:6px 9px;font-size:11px;}
      .real-slip-item{border-bottom:1px solid rgba(255,255,255,.11);padding:5px 0;line-height:1.35;}
      @media(max-width:360px){.real-odds-row{padding-left:88px}.regular-date{width:48px!important}.tw-live-icon-container{width:32px!important}}
    `;
    document.head.appendChild(style);
  }

  function getModeLabel() {
    if (state.mode === 'live') return 'Live betting';
    if (state.mode === 'results') return 'Results';
    if (state.mode === 'highlights') return 'Highlights';
    return SPORT_MAP[state.sport].label;
  }

  function topControls() {
    return `
      <div class="real-sports-top">
        <div class="real-sports-tabs">
          <a data-ajax="false" href="sports.html" class="${state.mode === 'home' || state.mode === 'sport' ? 'active' : ''}">Sports betting</a>
          <a data-ajax="false" href="live.html" class="${state.mode === 'live' ? 'active' : ''}">Live betting</a>
          <a data-ajax="false" href="highlights.html" class="${state.mode === 'highlights' ? 'active' : ''}">Highlights</a>
          <a data-ajax="false" href="results.html" class="${state.mode === 'results' ? 'active' : ''}">Results</a>
        </div>
        <div class="real-sports-filter">
          <input id="realSportsSearch" type="search" placeholder="Search" value="${esc(state.q)}" />
          <select id="realSportsSelect">${SPORTS.map(k => `<option value="${k}" ${state.sport === k ? 'selected' : ''}>${esc(SPORT_MAP[k].label)}</option>`).join('')}</select>
        </div>
        <div class="real-date-tabs">
          <button type="button" data-date="yesterday" ${state.date === 'yesterday' ? 'class="active"' : ''}>Yesterday</button>
          <button type="button" data-date="today" ${state.date === 'today' ? 'class="active"' : ''}>Today</button>
          <button type="button" data-date="tomorrow" ${state.date === 'tomorrow' ? 'class="active"' : ''}>Tomorrow</button>
        </div>
      </div>`;
  }

  function sportHomeClickHandler(e) {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href === 'live.html' || href === 'highlights.html' || href === 'results.html') return;
    const found = Object.entries(SPORT_MAP).find(([, cfg]) => href === `#betting/sport/${cfg.id}`);
    if (found) {
      e.preventDefault();
      state.sport = found[0];
      state.mode = 'sport';
      state.date = 'today';
      loadAndRender();
      return;
    }
    if (href === '#betting/today' || href === '#betting/most-played' || href === '#betting/last-minute') {
      e.preventDefault();
      state.mode = 'sport';
      state.date = 'today';
      loadAndRender();
    }
  }

  function enhanceHome() {
    const r = root();
    if (!state.originalHome) state.originalHome = r.innerHTML;
    r.removeEventListener('click', sportHomeClickHandler);
    r.addEventListener('click', sportHomeClickHandler);
    updateHomeCounts();
  }

  async function updateHomeCounts() {
    // Keep the exact original home list, just refresh the count badges with real provider counts.
    await Promise.all(SPORTS.map(async (key) => {
      try {
        const data = await fetchEvents(key, 'today', 'upcoming');
        const a = document.querySelector(SPORT_MAP[key].homeSelector);
        const badge = a && a.querySelector('.ui-li-count');
        if (badge) badge.textContent = String(data.total || (data.events || []).length || 0);
      } catch (_) {}
    }));
  }

  function filteredEvents() {
    const q = state.q.trim().toLowerCase();
    return q ? state.events.filter(e => `${e.league} ${e.homeTeam} ${e.awayTeam} ${e.venue || ''}`.toLowerCase().includes(q)) : state.events.slice();
  }

  function groups(events) {
    const out = [];
    const map = new Map();
    events.forEach(e => {
      const k = e.league || 'Sports';
      if (!map.has(k)) { map.set(k, []); out.push([k, map.get(k)]); }
      map.get(k).push(e);
    });
    return out;
  }

  function eventMarkup(e) {
    const icon = SPORT_MAP[state.sport].icon || 'tw-sport-1';
    const live = e.statusState === 'in' || /live|in progress/i.test(`${e.status || ''} ${e.statusDetail || ''}`);
    const score = e.homeScore != null || e.awayScore != null ? `${e.homeScore || 0}<br>${e.awayScore || 0}` : ((e.markets || []).some(m => m.odds) ? '3' : '0');
    const markets = (e.markets || [{ label: '1' }, { label: 'X' }, { label: '2' }]).slice(0, 3);
    while (markets.length < 3) markets.push({ label: markets.length === 1 ? 'X' : '2' });
    return `
      <li class="real-event-li">
        <a data-ajax="false" href="javascript:void(0);">
          <table class="tw-match-table" width="100%" cellspacing="0" cellpadding="0">
            <tr><td colspan="4" class="tw-upcoming-description">${esc(e.league || '')}</td></tr>
            <tr>
              <td rowspan="2" class="regular-date"><span class="tw-booked-live-icon"></span>${datePart(e.timestamp)} ${timePart(e.timestamp)}${live ? '<br><span class="real-live-badge">LIVE</span>' : ''}</td>
              <td rowspan="2" class="tw-live-icon-container"><span class="menuBoxIconContainerMatchUpcoming ${icon}"></span></td>
              <td><div class="last-minute-team-details-title">${esc(e.homeTeam)}</div></td>
              <td rowspan="2" class="resultContainer"><span class="ui-li-count ui-body-inherit">${score}</span></td>
            </tr>
            <tr><td><div class="last-minute-team-details-title">${esc(e.awayTeam)}</div></td></tr>
          </table>
        </a>
        <div class="real-odds-row">${markets.map(marketMarkup(e)).join('')}</div>
      </li>`;
  }

  function marketMarkup(e) {
    return function (m) {
      const disabled = !m || !m.odds || m.odds === 'OFF';
      const id = `${e.id}:${m ? m.label : ''}`;
      const selected = getSlip().some(x => x.id === id);
      return `<button type="button" class="real-odd ${selected ? 'selected' : ''}" ${disabled ? 'disabled' : ''} data-event="${esc(e.id)}" data-market="${esc(m && m.label)}" data-odds="${esc(m && m.odds)}"><span>${esc(m && m.label)}</span>${esc((m && m.odds) || '—')}</button>`;
    };
  }

  function listMarkup(events) {
    if (!events.length) return `${topControls()}<div class="real-empty">No events found</div>`;
    const icon = SPORT_MAP[state.sport].icon || 'tw-sport-1';
    return `${topControls()}
      ${state.mode === 'sport' ? '<a href="sports.html" class="real-back" data-ajax="false">‹ Sports betting</a>' : ''}
      <ul data-role="listview" data-inset="false" class="ui-icon-alt" id="realSportsEvents">
        <li data-role="list-divider" data-theme="b" class="match-divider"><span class="menuBoxIconContainerMatch ${icon}"></span><span class="matchHeader">${esc(getModeLabel())}</span><span class="ui-li-count ui-body-inherit">${events.length}</span></li>
        ${groups(events).map(([league, rows]) => `
          <li data-role="list-divider" data-theme="b" class="match-divider"><span class="menuBoxIconContainerMatch ${icon}"></span><span class="matchHeader">${esc(league)}</span><span class="ui-li-count ui-body-inherit">${rows.length}</span></li>
          ${rows.map(eventMarkup).join('')}
        `).join('')}
      </ul>`;
  }

  function renderEvents() {
    root().innerHTML = listMarkup(filteredEvents());
    bindControls();
    bindOdds();
    updateSlip();
  }

  async function fetchEvents(sport, date, mode) {
    const apiMode = mode === 'home' || mode === 'sport' ? 'upcoming' : mode;
    const res = await fetch(`${BACKEND}/sports/events?sport=${encodeURIComponent(sport)}&date=${encodeURIComponent(date)}&mode=${encodeURIComponent(apiMode)}`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  async function loadAndRender() {
    root().innerHTML = `${topControls()}<div class="real-loading">Loading ${esc(getModeLabel())}...</div>`;
    bindControls();
    try {
      const data = await fetchEvents(state.sport, state.date, state.mode);
      state.events = data.events || [];
      renderEvents();
    } catch (err) {
      root().innerHTML = `${topControls()}<div class="real-empty">Data error: ${esc(err.message || err)}</div>`;
      bindControls();
    }
  }

  function bindControls() {
    const search = document.getElementById('realSportsSearch');
    if (search) search.oninput = () => { state.q = search.value; renderEvents(); };
    const select = document.getElementById('realSportsSelect');
    if (select) select.onchange = () => { state.sport = select.value; loadAndRender(); };
    qsa('.real-date-tabs button').forEach(btn => {
      btn.onclick = () => { state.date = btn.dataset.date; loadAndRender(); };
    });
  }

  function getSlip() { try { return JSON.parse(localStorage.getItem('poseidon_sports_slip') || '[]'); } catch (_) { return []; } }
  function saveSlip(slip) { localStorage.setItem('poseidon_sports_slip', JSON.stringify(slip.slice(-20))); }

  function bindOdds() {
    qsa('.real-odd:not([disabled])').forEach(btn => {
      btn.onclick = () => {
        const e = state.events.find(x => x.id === btn.dataset.event);
        if (!e) return;
        const id = `${e.id}:${btn.dataset.market}`;
        const slip = getSlip().filter(x => x.id !== id);
        slip.push({ id, event: `${e.homeTeam} vs ${e.awayTeam}`, league: e.league, market: btn.dataset.market, odds: btn.dataset.odds, time: e.timestamp });
        saveSlip(slip);
        renderEvents();
      };
    });
  }

  function updateSlip() {
    const count = getSlip().length;
    const fbs = document.getElementById('fbsCounter');
    if (fbs) fbs.textContent = String(count);
    let box = document.getElementById('realBetSlip');
    if (!count) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.id = 'realBetSlip'; box.className = 'real-slip'; document.body.appendChild(box); }
    const slip = getSlip();
    box.innerHTML = `<div class="real-slip-head"><span>Bet slip (${slip.length})</span><button type="button">Clear</button></div><div class="real-slip-body">${slip.map(i => `<div class="real-slip-item"><b>${esc(i.market)}</b> @ ${esc(i.odds)}<br>${esc(i.event)}<br><span>${esc(i.league)}</span></div>`).join('')}</div>`;
    box.querySelector('button').onclick = () => { localStorage.removeItem('poseidon_sports_slip'); updateSlip(); renderEvents(); };
  }

  function init() {
    addStyle();
    if (state.mode === 'home') {
      enhanceHome();
    } else {
      loadAndRender();
      if (state.mode === 'live') setInterval(loadAndRender, 45000);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
