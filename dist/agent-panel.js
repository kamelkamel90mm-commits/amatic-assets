// Forzza - Agent Backend (dist/bakend/) connected to Supabase
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const fmt = (n) => Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc = (s) => String(s||'').replace(/[<>"']/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function getSession() { try { return JSON.parse(localStorage.getItem('forzza_session')||'null'); } catch(e){ return null; } }
  function requireAgent() {
    const s = getSession();
    if (!s || !s.userId) { window.location.href='/login.html'; return null; }
    if (!['agent','king','admin'].includes(s.role)) { alert('Agent only'); window.location.href='/index.html'; return null; }
    return s;
  }

  async function loadAgent() {
    const { data } = await window.supabase.from('profiles').select('id, username, balance, role').eq('id', getSession().userId).single();
    return data;
  }
  async function loadPlayers(agentId) {
    const { data } = await window.supabase.from('profiles').select('id, username, balance, role, last_seen').eq('parent_agent_id', agentId).eq('role','player').order('username');
    return data || [];
  }
  async function topUp(playerId, agentId, amount) {
    const { data: agent } = await window.supabase.from('profiles').select('balance').eq('id', agentId).single();
    if (Number(agent.balance) < Number(amount)) throw new Error('Insufficient credits: € '+fmt(agent.balance));
    const { data: player } = await window.supabase.from('profiles').select('balance').eq('id', playerId).single();
    const newA = Number(agent.balance) - Number(amount);
    const newP = Number(player.balance) + Number(amount);
    const { error: e1 } = await window.supabase.from('profiles').update({ balance: newA }).eq('id', agentId);
    if (e1) throw e1;
    const { error: e2 } = await window.supabase.from('profiles').update({ balance: newP }).eq('id', playerId);
    if (e2) throw e2;
    await window.supabase.from('transactions').insert({ user_id: playerId, type:'agent_topup', amount:Number(amount), from_agent_id: agentId, status:'approved' });
    return { newA, newP };
  }

  async function promptTopUp(username, players) {
    const amt = Number(prompt('Top up amount in EUR for '+username+':', '50'));
    if (!isFinite(amt) || amt <= 0) return;
    const session = getSession();
    const p = players.find(x => (x.username||'') === username);
    if (!p) return alert('Player not found');
    try {
      const r = await topUp(p.id, session.userId, amt);
      alert('OK!\n'+username+': € '+fmt(r.newP)+'\nYour credit: € '+fmt(r.newA));
      const agent = await loadAgent();
      const pls = await loadPlayers(session.userId);
      render(agent, pls);
    } catch (e) { alert(e.message||e); }
  }

  function render(agent, players) {
    const balEl = document.querySelector('.balance-amount'); if (balEl) balEl.textContent = fmt(agent.balance);
    const totalEl = document.querySelector('.total-players'); if (totalEl) totalEl.textContent = players.length;
    const list = document.getElementById('agent-players-list');
    if (list) {
      if (players.length === 0) {
        list.innerHTML = '<div class="p-4 text-center text-slate-400 text-sm">No players yet. Use "Create Player" to add one.</div>';
      } else {
        list.innerHTML = players.map(p => `
          <div class="p-3 border-b border-slate-800 flex justify-between items-center" data-player-id="${p.id}">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white"><i class="fa-solid fa-user"></i></div>
              <div>
                <div class="text-sm text-white font-medium">${esc(p.username || p.id.slice(0,8))}</div>
                <div class="text-[10px] text-accent">Bal: € ${fmt(p.balance)}</div>
              </div>
            </div>
            <button class="topup-btn bg-brand hover:bg-blue-600 text-white text-xs px-3 py-1 rounded" data-username="${esc(p.username||'')}">
              <i class="fa-solid fa-plus mr-1"></i> Top up
            </button>
          </div>
        `).join('');
        $$('.topup-btn').forEach(b => b.addEventListener('click', () => promptTopUp(b.dataset.username, players)));
      }
    }
  }

  async function init() {
    const s = requireAgent(); if (!s) return;
    const agent = await loadAgent();
    if (!agent) return alert('Could not load agent profile');
    const players = await loadPlayers(s.userId);
    render(agent, players);
    const headerP = document.querySelector('header p'); if (headerP) headerP.textContent = 'ID: '+(agent.username||s.userId.slice(0,8));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
