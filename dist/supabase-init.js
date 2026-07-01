// Initialize Supabase Client
const supabaseUrl = 'https://ynsjeihnqixqvkyzzpsz.supabase.co';
const supabaseKey = 'sb_publishable_fmL7mrm1-LV4jFtqRa_SZw_mqaip_X8';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Auth logic for Login Page
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginSubmit');
    if(loginBtn) {
        loginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('pswd').value;
            
            if(!username || !password) {
                alert("Please enter username and password");
                return;
            }

            // Fake email formatting using a valid domain structure
            const email = username.toLowerCase() + '@kamelcasino.com';

            try {
                // Attempt login
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) {
                    // If user not found, try registering them automatically
                    if (error.message.includes("Invalid login")) {
                        const { data: regData, error: regError } = await supabase.auth.signUp({
                            email: email,
                            password: password,
                            options: {
                                data: { username: username }
                            }
                        });
                        
                        if (regError) {
                            alert("Notice: " + regError.message);
                        } else {
                            alert("Account created successfully! Welcome " + username);
                            window.location.href = "index.html";
                        }
                    } else {
                        alert("Error: " + error.message);
                    }
                } else {
                    alert("Welcome back, " + username + "!");
                    window.location.href = "index.html";
                }
            } catch (err) {
                console.error(err);
            }
        });
    }
});
