// Initialize Supabase Client
const supabaseUrl = 'https://ynsjeihnqixqvkyzzpsz.supabase.co';
const supabaseKey = 'sb_publishable_fmL7mrm1-LV4jFtqRa_SZw_mqaip_X8';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
window.supabase = supabase;

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginSubmit');
    if(loginBtn) {
        loginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('pswd').value;
            if(!username || !password) { alert("Please enter username and password"); return; }
            const email = username.toLowerCase() + '@kamelcasino.com';
            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    if (error.message.includes("Invalid login")) {
                        const { data: regData, error: regError } = await supabase.auth.signUp({
                            email, password,
                            options: { data: { username, role: 'player' } }
                        });
                        if (regError) { alert("Notice: " + regError.message); return; }
                        const newUser = regData && regData.user;
                        if (newUser) {
                            await supabase.from('profiles').insert({ id: newUser.id, username, balance: 0, role: 'player' });
                        }
                        alert("Account created! Welcome " + username);
                        persistAndRedirect(newUser, username, 'player', 0);
                    } else {
                        alert("Error: " + error.message);
                    }
                } else {
                    const userId = data.user.id;
                    const { data: profile } = await supabase.from('profiles').select('username, role, balance').eq('id', userId).single();
                    const role = (profile && profile.role) || 'player';
                    const uname = (profile && profile.username) || username;
                    const bal = (profile && profile.balance) || 0;
                    persistAndRedirect(data.user, uname, role, bal);
                }
            } catch (err) { console.error(err); }
        });
    }

    function persistAndRedirect(user, username, role, balance) {
        try {
            localStorage.setItem('forzza_session', JSON.stringify({
                userId: user.id, username, balance, role
            }));
        } catch(_) {}
        if (role === 'king' || role === 'admin') window.location.href = 'admin/';
        else if (role === 'agent') window.location.href = 'bakend/';
        else if (role === 'cashier') window.location.href = 'cashir/';
        else window.location.href = 'index.html';
    }
});
