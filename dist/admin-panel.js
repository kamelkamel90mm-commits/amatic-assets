// Forzza - Master Admin (dist/admin/) connected to Supabase
(function () {
  'use strict';
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const fmt = (n) => Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc = (s) => String(s||'').replace(/[<>"']/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  function getSession() { try { return JSON.parse(localStorage.getItem('forzza_session')||'null'); } catch(e){ return null; } }
  function requireKing() {
    const s = getSession();
    if (!s || !s.userId) { window.location.href='/login.html'; return null; }
    if (!['king','admin'].includes(s.role)) { alert('Admin only'); window.location.href='/index.html'; return null; }
    return s;
  }
  async function loadStats() {
    const [{ count: u }, { count: a }, { data: txns }] = await Promise.all([
      window.supabase.from('profiles').select('id',{count:'exact',head:true}).eq('role','player'),
      window.supabase.from('profiles').select('id',{count:'exact',head:true}).in('role',['agent','king','admin']),
      window.supabase.from('transactions').select('amount, type')
    ]);
    let ggr = 0; (txns||[]).forEach(t => { if (t.type==='bet') ggr += Number(t.amount||0); });
    return { u: u||0, a: a||0, ggr };
  }
  async function loadAgents() {
    const { data } = await window.supabase.from('profiles').select('id, username, balance, role, created_at').in('role',['agent','king','admin']).order('created_at',{ascending:false});
    return data || [];
  }
  async function createAgent() {
    const username = prompt('Agent username:'); if (!username) return;
    const initialBal = Number(prompt('Initial credit EUR:','1000')||0);
    if (!isFinite(initialBal) || initialBal < 0) return alert('Invalid');
    const password = prompt('Password (min 6):','ChangeMe123!');
    if (!password || password.length < 6) return alert('Password too short');
    const email = username.toLowerCase()+'@kamelcasino.com';
    const { data: auth, error: aErr } = await window.supabase.auth.signUp({ email, password, options:{ data:{ username, role:'agent' } } });
    if (aErr) return alert(aErr.message);
    const userId = auth.user && auth.user.id;
    if (!userId) return alert('No user id');
    const { error: pErr } = await window.supabase.from('profiles').insert({ id: userId, username, balance: initialBal, role:'agent' });
    if (pErr) return alert(pErr.message);
    alert('Created!\nUsername: '+username+'\nEmail: '+email+'\nPassword: '+password);
    await init();
  }
  async function init() {
    const s = requireKing(); if (!s) return;
    const headerP = document.querySelector('header p'); if (headerP) headerP.textContent = 'King: '+(s.username||'admin');
    $$('button').forEach(btn => {
      const i = btn.querySelector('i.fa-user-plus');
      if (i) btn.addEventListener('click', e => { e.preventDefault(); createAgent(); });
    });
    try {
      const stats = await loadStats();
      const tiles = $$('.glass-panel .text-xl, .glass-panel .text-2xl');
      if (tiles.length >= 3) { tiles[0].textContent = stats.u.toLocaleString(); tiles[1].textContent = stats.a.toLocaleString(); tiles[2].textContent = '€ '+fmt(stats.ggr); }
      const agents = await loadAgents();
      const ac = document.querySelector('.glass-panel.rounded-xl.overflow-hidden');
      if (ac && agents.length) {
        ac.innerHTML = '<div class="p-3 text-xs text-slate-400 uppercase tracking-wider">All Agents</div>' + agents.map(a => `
          <div class="p-3 border-t border-slate-800 flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded bg-brand/20 text-brand flex items-center justify-center"><i class="fa-solid fa-user-tie"></i></div>
              <div>
                <div class="text-sm text-white">${esc(a.username||a.id.slice(0,8))}</div>
                <div class="text-xs text-accent">${a.role} • Bal: € ${fmt(a.balance)}</div>
              </div>
            </div>
            <span class="text-xs text-slate-400">${new Date(a.created_at).toLocaleDateString()}</span>
          </div>`).join('');
      }
    } catch(e){console.error(e);}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
