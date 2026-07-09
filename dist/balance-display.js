// ============================================================
// Forzza / Poseidon - Balance display + auth guard
// ============================================================
(function () {
  'use strict';
  const STORAGE_KEY = 'forzza_session';
  function fmt(n) { return Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }

  function findSlot() {
    const cands = document.querySelectorAll('#bsMaxQuota, .topup-balance, #topupBalance, [data-balance]');
    for (const el of cands) return el;
    return null;
  }

  function injectBadge(balance, username) {
    if (document.getElementById('forzza-balance-badge')) return;
    const b = document.createElement('div');
    b.id = 'forzza-balance-badge';
    b.style.cssText = 'position:fixed;top:8px;right:8px;z-index:2000;background:#1678c3;color:#fff;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;gap:8px;font-family:Arial,sans-serif';
    b.innerHTML = '<span>👤 '+(username||'User')+'</span><span style="opacity:.85">|</span><span>€ '+fmt(balance)+'</span><button id="forzza-logout" style="background:#d93030;border:0;color:#fff;padding:2px 6px;border-radius:3px;cursor:pointer;font-size:11px;">Logout</button>';
    document.body.appendChild(b);
    document.getElementById('forzza-logout').addEventListener('click', async function(){
      try { if (window.supabase) await window.supabase.auth.signOut(); } catch(e){}
      localStorage.removeItem(STORAGE_KEY);
      window.location.href='login.html';
    });
  }

  async function loadProfile(userId) {
    if (!window.supabase) return null;
    try {
      const { data } = await window.supabase.from('profiles').select('balance, username, role, parent_agent_id').eq('id', userId).single();
      return data;
    } catch (e) { return null; }
  }

  async function init() {
    if (!window.supabase) return;
    let session = null;
    try { const { data } = await window.supabase.auth.getSession(); session = data && data.session; } catch(e){}
    if (!session) return;
    const userId = session.user.id;
    const email = session.user.email || '';
    const username = (email.split('@')[0]) || 'User';
    const profile = await loadProfile(userId);
    const balance = profile ? profile.balance : 0;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        userId: userId, username: username, balance: balance,
        role: profile ? profile.role : 'player',
        parent_agent_id: profile ? profile.parent_agent_id : null
      }));
    } catch(e){}
    const slot = findSlot();
    if (slot) slot.textContent = fmt(balance);
    injectBadge(balance, username);
    setInterval(async () => {
      const fresh = await loadProfile(userId);
      if (!fresh) return;
      const el = document.getElementById('forzza-balance-badge');
      if (el) { const span = el.querySelector('span:nth-child(3)'); if (span) span.textContent = '€ '+fmt(fresh.balance); }
      const s2 = findSlot();
      if (s2) s2.textContent = fmt(fresh.balance);
    }, 30000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
