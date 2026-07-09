// Forzza - Cashier POS (dist/cashir/) connected to Supabase
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const fmt = (n) => Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc = (s) => String(s||'').replace(/[<>"']/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function getSession() { try { return JSON.parse(localStorage.getItem('forzza_session')||'null'); } catch(e){ return null; } }
  function requireCashier() {
    const s = getSession();
    if (!s || !s.userId) { window.location.href='/login.html'; return null; }
    if (!['cashier','king','admin'].includes(s.role)) { alert('Cashier only'); window.location.href='/index.html'; return null; }
    return s;
  }
  async function searchPlayer(username) {
    const { data } = await window.supabase.from('profiles').select('id, username, balance, role').eq('username', username).maybeSingle();
    return data;
  }
  async function getPending() {
    const { data } = await window.supabase.from('transactions').select('id, user_id, type, amount, status, created_at, profiles:user_id (username)').eq('status','pending').order('created_at',{ascending:false}).limit(20);
    return data || [];
  }
  async function resolve(id, approved) {
    const { data: req } = await window.supabase.from('transactions').select('user_id, type, amount, status').eq('id', id).single();
    if (!req || req.status !== 'pending') throw new Error('Already processed');
    if (approved) {
      const { data: p } = await window.supabase.from('profiles').select('balance').eq('id', req.user_id).single();
      const delta = req.type==='deposit' ? Number(req.amount) : -Number(req.amount);
      const nb = Number(p.balance) + delta;
      if (nb < 0) throw new Error('Insufficient');
      const { error } = await window.supabase.from('profiles').update({ balance: nb }).eq('id', req.user_id);
      if (error) throw error;
    }
    const { error } = await window.supabase.from('transactions').update({ status: approved?'approved':'rejected' }).eq('id', id);
    if (error) throw error;
  }
  async function direct(playerId, type, amount) {
    const { data: p } = await window.supabase.from('profiles').select('balance').eq('id', playerId).single();
    const delta = type==='deposit' ? Number(amount) : -Number(amount);
    const nb = Number(p.balance) + delta;
    if (nb < 0) throw new Error('Insufficient');
    const { error } = await window.supabase.from('profiles').update({ balance: nb }).eq('id', playerId);
    if (error) throw error;
    await window.supabase.from('transactions').insert({ user_id: playerId, type, amount:Number(amount), status:'approved' });
  }

  function renderRequests(reqs) {
    const c = document.getElementById('cashier-requests'); if (!c) return;
    if (reqs.length === 0) { c.innerHTML = '<div class="text-center text-slate-400 text-sm py-4">No pending requests.</div>'; return; }
    c.innerHTML = reqs.map(r => {
      const u = (r.profiles && r.profiles.username) || (r.user_id||'').slice(0,8);
      const dep = r.type === 'deposit';
      const border = dep ? 'border-l-4 border-accent' : 'border-l-4 border-alert';
      const icon = dep ? 'fa-arrow-up text-accent' : 'fa-arrow-down text-alert';
      const label = dep ? 'Deposit' : 'Withdrawal';
      return `<div class="glass-panel p-3 rounded-xl ${border}" data-req-id="${r.id}">
        <div class="flex justify-between items-center mb-2">
          <div class="flex items-center gap-2"><i class="fa-solid ${icon}"></i><span class="text-sm font-bold text-white">${label}</span></div>
          <span class="text-xs text-slate-400">${new Date(r.created_at).toLocaleString()}</span>
        </div>
        <div class="flex justify-between items-end">
          <div>
            <div class="text-xs text-slate-300">User: <span class="font-medium text-white">${esc(u)}</span></div>
            <div class="text-lg font-bold text-white">€ ${fmt(r.amount)}</div>
          </div>
          <div class="flex gap-2">
            <button class="req-reject w-8 h-8 rounded bg-slate-700 text-white"><i class="fa-solid fa-xmark"></i></button>
            <button class="req-approve w-8 h-8 rounded bg-accent text-white"><i class="fa-solid fa-check"></i></button>
          </div>
        </div>
      </div>`;
    }).join('');
    $$('.req-approve').forEach(b => b.addEventListener('click', async () => { try { await resolve(b.closest('[data-req-id]').dataset.reqId, true); await reload(); } catch(e){alert(e.message||e);} }));
    $$('.req-reject').forEach(b => b.addEventListener('click', async () => { try { await resolve(b.closest('[data-req-id]').dataset.reqId, false); await reload(); } catch(e){alert(e.message||e);} }));
  }

  async function reload() {
    const reqs = await getPending();
    renderRequests(reqs);
    const badge = document.querySelector('.pending-count');
    if (badge) badge.textContent = reqs.length + ' New';
  }

  async function init() {
    const s = requireCashier(); if (!s) return;
    const findBtn = $('button.bg-brand');
    if (findBtn) findBtn.addEventListener('click', async () => {
      const u = $('input[placeholder*="username"]').value.trim();
      if (!u) return;
      const p = await searchPlayer(u);
      if (!p) return alert('Player not found');
      const action = confirm('Player: '+p.username+'\nBalance: € '+fmt(p.balance)+'\n\nOK=Deposit 50\nCancel=Withdraw 50');
      try { if (action) await direct(p.id, 'deposit', 50); else await direct(p.id, 'withdraw', 50); alert('OK'); } catch(e){alert(e.message||e);}
    });
    const bigBtns = $$('main button');
    if (bigBtns[0]) bigBtns[0].addEventListener('click', async () => {
      const u = prompt('Username:'); if (!u) return;
      const amt = Number(prompt('Amount EUR:','50')); if (!isFinite(amt)||amt<=0) return;
      const p = await searchPlayer(u); if (!p) return alert('Not found');
      try { await direct(p.id, 'deposit', amt); alert('OK: €'+amt+' to '+p.username); } catch(e){alert(e.message||e);}
    });
    await reload(); setInterval(reload, 30000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
