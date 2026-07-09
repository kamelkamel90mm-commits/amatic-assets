// ============================================================
// Forzza - Home page: dynamic tiles + footer based on auth state
// Mirrors the original forzza1.com mobile layout:
//   - Logged in:
//       Grid row 4: Settings | Other | Log out
//       Footer (5 cols): Home | Account | My bets | Sports | Bet slip
//   - Logged out:
//       Grid row 4: Settings | Other | Login / Registration
//       Footer (4 cols): Home | Login | My bets | Sports | Bet slip
// ============================================================
(function () {
  'use strict';
  function getSession() { try { return JSON.parse(localStorage.getItem('forzza_session') || 'null'); } catch (e) { return null; } }

  function setGridForAuth(loggedIn) {
    // The 12th tile (last cell) toggles between Login/Registration and Log out
    const authTile = document.querySelector('[data-tile-role="auth"]');
    if (!authTile) return;
    if (loggedIn) {
      authTile.innerHTML = '<a href="#" id="home-logout-link" class="ui-btn" data-ajax="false"><div class="tw-icon icon-logout"></div><span>Log out</span></a>';
      const link = document.getElementById('home-logout-link');
      if (link) link.addEventListener('click', async (e) => {
        e.preventDefault();
        try { if (window.supabase) await window.supabase.auth.signOut(); } catch (err) {}
        localStorage.removeItem('forzza_session');
        window.location.href = 'login.html';
      });
    } else {
      authTile.innerHTML = '<a href="login.html" class="ui-btn" data-ajax="false"><div class="tw-icon icon-login"></div><span style="white-space: pre-wrap; line-height: 1.2;">Login /<br>Registration</span></a>';
    }
  }

  function setFooterForAuth(loggedIn) {
    const nav = document.getElementById('main_navbar');
    const grid = document.getElementById('main_navbar_grid');
    if (!nav || !grid) return;

    if (loggedIn) {
      // 5 columns: Home | Account | My bets | Sports | Bet slip
      nav.classList.add('ui-grid-5col');
      const accountCell = grid.querySelector('[data-footer-role="account"]');
      if (accountCell) accountCell.innerHTML = '<a href="account.html" class="ui-btn" data-ajax="false"><div class="badges"><div class="badge badge-green" id="acc-balance">0.00</div></div><div class="footer-icon icon-f-account"></div>Account setti...</a>';
    } else {
      // 4 columns: Home | Login | My bets | Sports | Bet slip
      nav.classList.remove('ui-grid-5col');
      const accountCell = grid.querySelector('[data-footer-role="account"]');
      if (accountCell) accountCell.innerHTML = '<a href="login.html" class="ui-btn" data-ajax="false"><div class="footer-icon icon-f-login"></div>Login</a>';
    }
  }

  async function init() {
    const session = getSession();
    const loggedIn = !!(session && session.userId);

    setGridForAuth(loggedIn);
    setFooterForAuth(loggedIn);

    if (loggedIn && session.balance != null) {
      const el = document.getElementById('acc-balance');
      if (el) el.textContent = Number(session.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
