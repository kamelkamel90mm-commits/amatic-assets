// MegaNodes catalog injection for the existing Poseidon/Forzza static pages.
// This keeps the original site shell from dist/ and replaces only the game grid.
// Important: no API token is stored here. Game launching must go through a secure backend.
(function () {
  'use strict';

  const state = {
    all: [],
    filtered: [],
    providers: [],
    visible: 80,
    batch: 80,
    provider: '',
    category: '',
    q: ''
  };

  const pageIsLive = /live-casino/i.test(location.pathname) || !!document.getElementById('live-casino');
  if (pageIsLive) state.category = 'Live';

  function $(selector, root = document) { return root.querySelector(selector); }
  function $all(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function fallbackImage(title) {
    const short = String(title || 'Game').slice(0, 2).toUpperCase();
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">' +
      '<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#084772"/><stop offset="1" stop-color="#1678c3"/></linearGradient></defs>' +
      '<rect width="320" height="220" rx="20" fill="url(#g)"/>' +
      '<text x="160" y="125" text-anchor="middle" font-family="Arial" font-size="56" fill="white" font-weight="700">' + escapeHtml(short) + '</text>' +
      '</svg>'
    );
  }

  function normalizeGame(g) {
    const title = g.localized_title || g.game_name || g.game_symbol || 'Game';
    return {
      provider_code: Number(g.provider_code),
      provider_name: g.provider_name || g.provider_title || ('Provider ' + g.provider_code),
      category: g.category || 'Slot',
      game_symbol: g.game_symbol,
      game_name: g.game_name || title,
      localized_title: title,
      game_image: g.game_image || fallbackImage(title),
      launch_enable: g.launch_enable !== false,
      under_maintenance: g.under_maintenance === true
    };
  }

  function addStyles() {
    if ($('#meganodes-style')) return;
    const style = document.createElement('style');
    style.id = 'meganodes-style';
    style.textContent = `
      #meganodesToolbar{padding:8px;background:#073d66;border-bottom:1px solid rgba(255,255,255,.16);}
      #meganodesToolbar .mn-row{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:7px;}
      #meganodesToolbar select,#meganodesToolbar button{width:100%;border:0;border-radius:7px;padding:9px 8px;background:#126eb3;color:#fff;font-size:12px;}
      #meganodesToolbar .mn-count{font-size:12px;color:#d7efff;text-align:center;padding:4px 0;}
      #meganodesLoadMore{display:block;width:calc(100% - 16px);margin:8px;border:0;border-radius:8px;padding:12px;background:#1678c3;color:#fff;font-weight:bold;}
      #meganodesEmpty{margin:10px;padding:14px;text-align:center;color:#d7efff;background:#063458;border-radius:9px;}
      #gamesResultWrap .provider-games{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:8px!important;padding:8px!important;}
      #gamesResultWrap .cg-wrap{min-width:0!important;margin:0!important;background:#126eb3;border-radius:8px;overflow:hidden;box-shadow:0 3px 9px rgba(0,0,0,.25);}
      #gamesResultWrap .cg-details{position:relative!important;}
      #gamesResultWrap .cg-thumb{width:100%!important;aspect-ratio:1.32/1!important;object-fit:cover!important;display:block!important;background:#082f50;}
      #gamesResultWrap .cg-title{padding:6px 5px!important;min-height:42px!important;background:#126eb3!important;}
      #gamesResultWrap .cg-name{font-size:11px!important;line-height:14px!important;color:#fff!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}
      #gamesResultWrap .mn-provider{display:block;font-size:9px;color:#bee6ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
      #gamesResultWrap .cg-launch{display:flex!important;position:absolute!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;background:linear-gradient(transparent,rgba(0,0,0,.78))!important;align-items:flex-end!important;justify-content:center!important;padding:20px 4px 5px!important;gap:4px!important;opacity:0;transition:opacity .18s;}
      #gamesResultWrap .cg-wrap:hover .cg-launch,#gamesResultWrap .cg-wrap:active .cg-launch{opacity:1;}
      #gamesResultWrap .cg-btn{border:0!important;border-radius:5px!important;padding:6px 8px!important;background:#11a7dd!important;color:#fff!important;font-size:10px!important;font-weight:bold!important;}
      #gamesResultWrap .mn-maint{position:absolute;top:5px;right:5px;background:#d93030;color:#fff;border-radius:999px;padding:3px 6px;font-size:9px;}
      @media (min-width:600px){#gamesResultWrap .provider-games{grid-template-columns:repeat(4,1fr)!important;}}
    `;
    document.head.appendChild(style);
  }

  function ensureToolbar() {
    let toolbar = $('#meganodesToolbar');
    if (toolbar) return toolbar;

    const filterWrap = $('#casinoFilterWrap') || $('#gamesFilterForm') || $('#mobileMainContent');
    toolbar = document.createElement('div');
    toolbar.id = 'meganodesToolbar';
    toolbar.innerHTML = `
      <div class="mn-row">
        <select id="mnProvider"><option value="">All providers</option></select>
        <select id="mnCategory"><option value="">All categories</option><option value="Slot">Slot</option><option value="Live">Live</option></select>
      </div>
      <div class="mn-count" id="mnCount">Loading MegaNodes games...</div>
    `;
    if (filterWrap && filterWrap.parentNode) {
      filterWrap.parentNode.insertBefore(toolbar, filterWrap.nextSibling);
    } else {
      document.body.insertBefore(toolbar, document.body.firstChild);
    }

    $('#mnProvider').addEventListener('change', function () {
      state.provider = this.value;
      state.visible = state.batch;
      applyFilters();
    });
    $('#mnCategory').addEventListener('change', function () {
      state.category = this.value;
      state.visible = state.batch;
      applyFilters();
    });
    $('#mnCategory').value = state.category;

    const search = $('#gamesSearchField');
    if (search) {
      search.addEventListener('input', function () {
        state.q = this.value.trim().toLowerCase();
        state.visible = state.batch;
        applyFilters();
      });
      search.placeholder = pageIsLive ? 'Search live games...' : 'Search games...';
    }

    $all('.games-action-tab').forEach((btn) => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        $all('.games-action-tab').forEach(b => b.classList.remove('game-action-selected'));
        this.classList.add('game-action-selected');
        state.visible = state.batch;
        applyFilters();
      });
    });

    return toolbar;
  }

  function populateProviders() {
    const select = $('#mnProvider');
    if (!select) return;
    select.innerHTML = '<option value="">All providers</option>' + state.providers.map(p => {
      const code = escapeHtml(p.provider_code);
      const title = escapeHtml(p.localized_title || p.provider_name || ('Provider ' + p.provider_code));
      const count = state.all.filter(g => String(g.provider_code) === String(p.provider_code)).length;
      return `<option value="${code}">${title} (${count})</option>`;
    }).join('');
  }

  function applyFilters() {
    state.filtered = state.all.filter(g => {
      if (state.provider && String(g.provider_code) !== String(state.provider)) return false;
      if (state.category && g.category !== state.category) return false;
      if (g.under_maintenance || !g.launch_enable) return false;
      if (state.q) {
        const text = (g.localized_title + ' ' + g.game_name + ' ' + g.game_symbol + ' ' + g.provider_name).toLowerCase();
        if (!text.includes(state.q)) return false;
      }
      return true;
    });
    render();
  }

  function gameHtml(g, index) {
    const title = escapeHtml(g.localized_title);
    const provider = escapeHtml(g.provider_name);
    const symbol = escapeHtml(g.game_symbol);
    const img = escapeHtml(g.game_image || fallbackImage(g.localized_title));
    const disabled = g.under_maintenance || !g.launch_enable;
    return `
      <div class="cg-wrap" data-provider="${g.provider_code}" data-symbol="${symbol}">
        <div class="cg-details">
          ${disabled ? '<span class="mn-maint">Maintenance</span>' : ''}
          <div id="mn-cg-${index}" class="cg-launch" data-provider-code="${g.provider_code}" data-game-symbol="${symbol}" data-title="${title}">
            <button type="button" class="cg-btn cg-real" data-mode="real">Play</button>
            <button type="button" class="cg-btn cg-fun" data-mode="fun">Fun</button>
          </div>
          <img src="${img}" class="cg-thumb" alt="${title}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImage(g.localized_title)}';" />
        </div>
        <div class="cg-title cgp-${g.provider_code}">
          <div class="cg-name">${title}</div>
          <span class="mn-provider">${provider}</span>
        </div>
      </div>`;
  }

  function render() {
    const wrap = $('#gamesResultWrap');
    if (!wrap) return;
    let grid = $('#gamesResultWrap .provider-games');
    if (!grid) {
      grid = document.createElement('div');
      grid.className = 'provider-games';
      wrap.prepend(grid);
    }

    const items = state.filtered.slice(0, state.visible);
    grid.innerHTML = items.map(gameHtml).join('');

    let empty = $('#meganodesEmpty');
    if (!empty) {
      empty = document.createElement('div');
      empty.id = 'meganodesEmpty';
      empty.textContent = 'No games found.';
      wrap.appendChild(empty);
    }
    empty.style.display = state.filtered.length ? 'none' : 'block';

    let loadMore = $('#meganodesLoadMore');
    if (!loadMore) {
      loadMore = document.createElement('button');
      loadMore.id = 'meganodesLoadMore';
      loadMore.type = 'button';
      loadMore.addEventListener('click', () => {
        state.visible += state.batch;
        render();
      });
      wrap.appendChild(loadMore);
    }
    const remaining = Math.max(0, state.filtered.length - state.visible);
    loadMore.style.display = remaining > 0 ? 'block' : 'none';
    loadMore.textContent = 'Load more (' + remaining.toLocaleString() + ' left)';

    const pager = $('.games-pager-wrap');
    if (pager) pager.style.display = 'none';

    const count = $('#mnCount');
    if (count) {
      const slots = state.all.filter(g => g.category === 'Slot').length;
      const live = state.all.filter(g => g.category === 'Live').length;
      count.textContent = `${state.filtered.length.toLocaleString()} shown / ${state.all.length.toLocaleString()} total — Slots ${slots.toLocaleString()} — Live ${live.toLocaleString()}`;
    }
  }

  function launchGame(g) {
    const title = encodeURIComponent(g.localized_title || g.game_symbol || 'Game');
    const url = `game-launch.html?provider_code=${encodeURIComponent(g.provider_code)}&game_symbol=${encodeURIComponent(g.game_symbol)}&title=${title}&category=${encodeURIComponent(g.category || '')}`;
    const overlay = $('#gameLaunchWrapper');
    const iframe = $('#gameIframe');
    if (overlay && iframe) {
      overlay.classList.remove('fieldHide');
      overlay.style.display = 'block';
      iframe.src = url;
    } else {
      window.location.href = url;
    }
  }

  function bindLaunchEvents() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.cg-btn');
      if (!btn) return;
      const launch = btn.closest('.cg-launch');
      if (!launch || !launch.dataset.gameSymbol) return;
      e.preventDefault();
      e.stopPropagation();
      launchGame({
        provider_code: launch.dataset.providerCode,
        game_symbol: launch.dataset.gameSymbol,
        localized_title: launch.dataset.title,
        category: state.category || ''
      });
    });

    const closeBtn = $('#gamesLobbyLink');
    if (closeBtn) {
      closeBtn.removeAttribute('onclick');
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        const overlay = $('#gameLaunchWrapper');
        const iframe = $('#gameIframe');
        if (overlay) {
          overlay.classList.add('fieldHide');
          overlay.style.display = 'none';
        }
        if (iframe) iframe.src = '';
      });
    }
  }

  async function init() {
    addStyles();
    ensureToolbar();
    bindLaunchEvents();

    try {
      const res = await fetch('meganodes_games.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('Cannot load meganodes_games.json: HTTP ' + res.status);
      const data = await res.json();
      state.providers = data.providers || [];
      state.all = (data.games || []).map(normalizeGame);
      populateProviders();
      applyFilters();
    } catch (err) {
      const count = $('#mnCount');
      if (count) count.textContent = 'MegaNodes games load error: ' + (err.message || err);
      console.error(err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
