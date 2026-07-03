// Real sports data UI for Poseidon/Forzza-style static pages.
// Uses the Render backend so browser CORS and provider changes are controlled server-side.
(function () {
  'use strict';

  const BACKEND = (window.POSEIDON_CONFIG && window.POSEIDON_CONFIG.launchEndpoint)
    ? window.POSEIDON_CONFIG.launchEndpoint.replace(/\/launch-game\/?$/, '')
    : 'https://poseidon-meganodes-backend.onrender.com';

  const SPORTS = [
    { key: 'soccer', label: 'Soccer' },
    { key: 'basketball', label: 'Basketball' },
    { key: 'tennis', label: 'Tennis' },
    { key: 'hockey', label: 'Ice Hockey' },
    { key: 'football', label: 'American Football' },
    { key: 'baseball', label: 'Baseball' }
  ];

  const state = {
    sport: 'soccer',
    date: 'today',
    mode: detectMode(),
    events: [],
    q: ''
  };

  function detectMode() {
    const path = location.pathname.toLowerCase();
    if (path.includes('live')) return 'live';
    if (path.includes('result')) return 'results';
    if (path.includes('highlight')) return 'highlights';
    return 'upcoming';
  }

  function $(id) { return document.getElementById(id); }
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function localTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso).slice(11, 16);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function localDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function addStyle() {
    if ($('psSportsStyle')) return;
    const s = document.createElement('style');
    s.id = 'psSportsStyle';
    s.textContent = `
      #psSports{background:#084772;color:#fff;font-family:Arial,Helvetica,sans-serif;min-height:60vh;padding-bottom:12px;}
      .ps-top{background:#063b62;padding:9px 8px;border-bottom:1px solid rgba(255,255,255,.18);position:sticky;top:44px;z-index:11;}
      .ps-title{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#d5efff;margin-bottom:8px;}
      .ps-title strong{font-size:15px;color:#fff;}
      .ps-nav{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:8px;}
      .ps-nav a{display:block;text-align:center;text-decoration:none;color:#fff;background:#126eb3;border-radius:7px;padding:8px 4px;font-size:11px;border:1px solid rgba(255,255,255,.12);}
      .ps-nav a.active{background:#11a7dd;color:#001827;font-weight:bold;}
      .ps-filter{display:grid;grid-template-columns:1fr .8fr;gap:6px;margin-bottom:7px;}
      .ps-filter select,.ps-filter input{width:100%;background:#052f51;color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:7px;padding:9px 8px;font-size:12px;outline:0;}
      .ps-dates{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;}
      .ps-dates button{border:0;border-radius:7px;padding:8px 5px;background:#0d5d97;color:#fff;font-size:11px;}
      .ps-dates button.active{background:#ffd36a;color:#06263f;font-weight:bold;}
      .ps-loading,.ps-empty{margin:10px;padding:14px;text-align:center;color:#d7efff;background:#063458;border-radius:9px;}
      .ps-league{background:#052f51;color:#e3f6ff;font-weight:bold;padding:8px 10px;font-size:12px;border-top:1px solid rgba(255,255,255,.12);border-bottom:1px solid rgba(255,255,255,.10);}
      .ps-match{background:#0a568b;margin:0 0 1px 0;padding:9px 7px;display:grid;grid-template-columns:54px 1fr 128px;gap:7px;align-items:center;}
      .ps-time{font-size:11px;color:#d7efff;text-align:center;line-height:1.35;}
      .ps-live{display:inline-block;background:#f33;color:#fff;border-radius:999px;padding:2px 5px;font-size:9px;margin-top:3px;animation:psPulse 1.3s infinite;}
      @keyframes psPulse{50%{opacity:.45}}
      .ps-team{display:flex;justify-content:space-between;gap:5px;font-size:12px;line-height:1.55;color:#fff;}
      .ps-team b{font-weight:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .ps-score{color:#ffd36a;font-weight:bold;min-width:18px;text-align:right;}
      .ps-markets{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;}
      .ps-odd{border:0;border-radius:5px;background:#e9f3f9;color:#043459;min-height:39px;font-size:10px;font-weight:bold;padding:3px 2px;}
      .ps-odd span{display:block;color:#60798c;font-weight:normal;font-size:9px;}
      .ps-odd:disabled{background:#2c6388;color:#9fc5dd;opacity:.8;}
      .ps-odd:not(:disabled):active{transform:scale(.94);}
      .ps-meta{font-size:9px;color:#b9dff5;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .ps-slip{position:fixed;left:8px;right:8px;bottom:60px;background:#001d32;color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.4);z-index:9999;max-width:504px;margin:0 auto;overflow:hidden;}
      .ps-slip-head{display:flex;justify-content:space-between;align-items:center;padding:9px 10px;background:#000;font-size:12px;font-weight:bold;}
      .ps-slip-body{max-height:160px;overflow:auto;padding:8px 10px;font-size:11px;}
      .ps-slip-item{border-bottom:1px solid rgba(255,255,255,.1);padding:5px 0;}
      .ps-clear{border:0;background:#d93030;color:#fff;border-radius:5px;padding:5px 8px;font-size:10px;}
      @media(max-width:360px){.ps-match{grid-template-columns:48px 1fr;}.ps-markets{grid-column:1/3}.ps-nav{grid-template-columns:repeat(2,1fr)}}
      @media(min-width:640px){#psSports{max-width:520px;margin:0 auto}.ps-slip{max-width:504px}.ps-match{grid-template-columns:62px 1fr 150px}}
    `;
    document.head.appendChild(s);
  }

  function pageTitle() {
    if (state.mode === 'live') return 'Live betting';
    if (state.mode === 'results') return 'Results';
    if (state.mode === 'highlights') return 'Highlights';
    return 'Sports betting';
  }

  function shell() {
    return `
      <div id="psSports">
        <div class="ps-top">
          <div class="ps-title"><strong>${pageTitle()}</strong><span id="psCount">Real data</span></div>
          <div class="ps-nav">
            <a href="sports.html" class="${state.mode === 'upcoming' ? 'active' : ''}">Sports</a>
            <a href="live.html" class="${state.mode === 'live' ? 'active' : ''}">Live</a>
            <a href="highlights.html" class="${state.mode === 'highlights' ? 'active' : ''}">Highlights</a>
            <a href="results.html" class="${state.mode === 'results' ? 'active' : ''}">Results</a>
          </div>
          <div class="ps-filter">
            <select id="psSport">${SPORTS.map(s => `<option value="${s.key}">${s.label}</option>`).join('')}</select>
            <input id="psSearch" type="search" placeholder="Search team / league...">
          </div>
          <div class="ps-dates">
            <button type="button" data-date="yesterday">Yesterday</button>
            <button type="button" data-date="today" class="active">Today</button>
            <button type="button" data-date="tomorrow">Tomorrow</button>
          </div>
        </div>
        <div id="psList"><div class="ps-loading">Loading real sports data...</div></div>
      </div>`;
  }

  function filteredEvents() {
    const q = state.q.toLowerCase();
    if (!q) return state.events;
    return state.events.filter(e => `${e.league} ${e.homeTeam} ${e.awayTeam}`.toLowerCase().includes(q));
  }

  function groupByLeague(events) {
    const groups = [];
    const map = new Map();
    events.forEach(e => {
      const league = e.league || 'Sports';
      if (!map.has(league)) { map.set(league, []); groups.push([league, map.get(league)]); }
      map.get(league).push(e);
    });
    return groups;
  }

  function marketButton(event, m) {
    const disabled = !m.odds || m.odds === 'OFF';
    const label = escapeHtml(m.label);
    const odds = escapeHtml(m.odds || '—');
    return `<button class="ps-odd" ${disabled ? 'disabled' : ''} data-event="${escapeHtml(event.id)}" data-market="${label}" data-odds="${odds}"><span>${label}</span>${odds}</button>`;
  }

  function render() {
    const events = filteredEvents();
    $('psCount').textContent = `${events.length} events`;
    if (!events.length) {
      $('psList').innerHTML = `<div class="ps-empty">No ${state.mode === 'live' ? 'live' : ''} real events found for this filter.</div>`;
      updateSlip();
      return;
    }
    $('psList').innerHTML = groupByLeague(events).map(([league, rows]) => `
      <div class="ps-league">${escapeHtml(league)}</div>
      ${rows.map(e => `
        <div class="ps-match" data-id="${escapeHtml(e.id)}">
          <div class="ps-time">
            <div>${localDate(e.timestamp)}</div>
            <div>${localTime(e.timestamp)}</div>
            ${e.statusState === 'in' ? '<span class="ps-live">LIVE</span>' : `<div>${escapeHtml(e.status || '')}</div>`}
          </div>
          <div>
            <div class="ps-team"><b>${escapeHtml(e.homeTeam)}</b><span class="ps-score">${e.homeScore == null ? '' : escapeHtml(e.homeScore)}</span></div>
            <div class="ps-team"><b>${escapeHtml(e.awayTeam)}</b><span class="ps-score">${e.awayScore == null ? '' : escapeHtml(e.awayScore)}</span></div>
            <div class="ps-meta">${escapeHtml(e.venue || e.source || '')}${e.oddsProvider ? ' · Odds: ' + escapeHtml(e.oddsProvider) : ''}</div>
          </div>
          <div class="ps-markets">${(e.markets || []).slice(0, 3).map(m => marketButton(e, m)).join('')}</div>
        </div>`).join('')}
    `).join('');
    bindMarketClicks();
    updateSlip();
  }

  function bindMarketClicks() {
    document.querySelectorAll('.ps-odd:not([disabled])').forEach(btn => {
      btn.onclick = () => {
        const event = state.events.find(e => e.id === btn.dataset.event);
        if (!event) return;
        const item = {
          id: `${event.id}:${btn.dataset.market}`,
          event: `${event.homeTeam} vs ${event.awayTeam}`,
          league: event.league,
          market: btn.dataset.market,
          odds: btn.dataset.odds,
          time: event.timestamp
        };
        const slip = getSlip().filter(x => x.id !== item.id);
        slip.push(item);
        localStorage.setItem('poseidon_sports_slip', JSON.stringify(slip.slice(-12)));
        updateSlip();
      };
    });
  }

  function getSlip() {
    try { return JSON.parse(localStorage.getItem('poseidon_sports_slip') || '[]'); }
    catch (_) { return []; }
  }

  function updateFooterCounter() {
    const count = getSlip().length;
    const fbs = document.getElementById('fbsCounter');
    if (fbs) fbs.textContent = String(count);
  }

  function updateSlip() {
    updateFooterCounter();
    let box = document.getElementById('psSlip');
    const slip = getSlip();
    if (!slip.length) { if (box) box.remove(); return; }
    if (!box) {
      box = document.createElement('div');
      box.id = 'psSlip';
      box.className = 'ps-slip';
      document.body.appendChild(box);
    }
    box.innerHTML = `
      <div class="ps-slip-head"><span>Bet slip (${slip.length})</span><button class="ps-clear" type="button">Clear</button></div>
      <div class="ps-slip-body">${slip.map(i => `<div class="ps-slip-item"><b>${escapeHtml(i.market)}</b> @ ${escapeHtml(i.odds)}<br>${escapeHtml(i.event)}<br><span>${escapeHtml(i.league)}</span></div>`).join('')}<div class="ps-meta">Selections are saved locally. Real-money betting needs a licensed sportsbook wallet.</div></div>`;
    box.querySelector('.ps-clear').onclick = () => { localStorage.removeItem('poseidon_sports_slip'); updateSlip(); };
  }

  async function load() {
    const list = $('psList');
    list.innerHTML = '<div class="ps-loading">Loading real sports data...</div>';
    const url = `${BACKEND}/sports/events?sport=${encodeURIComponent(state.sport)}&date=${encodeURIComponent(state.date)}&mode=${encodeURIComponent(state.mode)}`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      state.events = data.events || [];
      render();
    } catch (err) {
      list.innerHTML = `<div class="ps-empty">Sports data error: ${escapeHtml(err.message || err)}</div>`;
    }
  }

  function init() {
    const root = document.getElementById('twMainContentView') || document.getElementById('mobileMainContent') || document.body;
    addStyle();
    root.innerHTML = shell();
    $('psSport').value = state.sport;
    $('psSport').onchange = () => { state.sport = $('psSport').value; load(); };
    $('psSearch').oninput = () => { state.q = $('psSearch').value.trim(); render(); };
    document.querySelectorAll('.ps-dates button').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.ps-dates button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.date = btn.dataset.date;
        load();
      };
    });
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
