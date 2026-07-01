document.addEventListener('DOMContentLoaded', () => {
    // 1. Global CSS for animations
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes pulse-live {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; filter: drop-shadow(0 0 8px rgba(255,255,255,0.6)); }
            100% { transform: scale(1); opacity: 1; }
        }
        .animate-live {
            animation: pulse-live 1.5s infinite ease-in-out;
        }
        .flash-up {
            background-color: #079c20 !important;
            transition: background-color 0.4s ease;
        }
        .flash-down {
            background-color: #ef4444 !important;
            transition: background-color 0.4s ease;
        }
        .tw-grid .ui-btn {
            transition: all 0.3s ease;
        }
        .tw-grid .ui-btn:active {
            transform: scale(0.95);
            opacity: 0.8;
        }
        /* Casino game thumbnails hover/live effect */
        .cg-thumb {
            transition: transform 0.3s ease, filter 0.3s ease;
        }
        .cg-wrap:hover .cg-thumb {
            transform: scale(1.05);
            filter: brightness(1.2);
        }
        .badge {
            transition: transform 0.2s, color 0.5s;
        }
    `;
    document.head.appendChild(style);

    // 2. Animate Live Betting Icon
    const liveIcons = document.querySelectorAll('.icon-live, .tw-sport-1000000');
    liveIcons.forEach(icon => {
        icon.classList.add('animate-live');
    });

    // 3. Simulate Live Balance and Bet Slip Updates
    const balanceBadges = document.querySelectorAll('.badge-blue');
    const slipBadges = document.querySelectorAll('.badge-green');
    
    let currentBalance = 150.50;
    let slipCount = 0;

    if (balanceBadges.length > 0) {
        balanceBadges.forEach(b => b.innerText = currentBalance.toFixed(2));
        
        // Random balance updates (simulating live wins/bets)
        setInterval(() => {
            if (Math.random() > 0.6) {
                const change = (Math.random() * 20 - 5); // From -5 to +15
                currentBalance = Math.max(0, currentBalance + change);
                balanceBadges.forEach(b => {
                    b.innerText = currentBalance.toFixed(2);
                    b.style.color = change > 0 ? '#a7f3d0' : '#fca5a5';
                    setTimeout(() => b.style.color = 'white', 500);
                });
            }
        }, 4000);
    }

    if (slipBadges.length > 0) {
        // Randomly simulate adding a bet
        setInterval(() => {
            if (Math.random() > 0.8) {
                slipCount = (slipCount + 1) % 5; // loops 0-4
                slipBadges.forEach(b => {
                    b.innerText = slipCount;
                    b.style.transform = 'scale(1.5)';
                    setTimeout(() => b.style.transform = 'scale(1)', 200);
                });
            }
        }, 6000);
    }

    // 4. Random Flashing on Grid Elements to Simulate Live Activity (Odds Changing)
    const gridItems = document.querySelectorAll('.tw-grid .ui-block-a, .tw-grid .ui-block-b, .tw-grid .ui-block-c');
    setInterval(() => {
        if(gridItems.length > 0) {
            const randomItem = gridItems[Math.floor(Math.random() * gridItems.length)];
            const isUp = Math.random() > 0.5;
            randomItem.classList.add(isUp ? 'flash-up' : 'flash-down');
            setTimeout(() => {
                randomItem.classList.remove('flash-up', 'flash-down');
            }, 600);
        }
    }, 2500);
    
    // 5. Hamburger menu interaction
    const hamburger = document.querySelector('.hamburger');
    if(hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.style.opacity = '0.5';
            setTimeout(() => hamburger.style.opacity = '1', 200);
            
            // Toggle sliding menu
            let existingMenu = document.getElementById('temp-live-menu');
            if (existingMenu) {
                existingMenu.style.transform = 'translateX(100%)';
                setTimeout(() => existingMenu.remove(), 300);
            } else {
                const menu = document.createElement('div');
                menu.id = 'temp-live-menu';
                menu.style.cssText = 'position:fixed; top:44px; right:0; width:75%; max-width:300px; height:calc(100vh - 44px); background-color:#111; z-index:9999; box-shadow:-5px 0 25px rgba(0,0,0,0.8); color:#fff; transform:translateX(100%); transition:transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow-y:auto;';
                
                menu.innerHTML = `
                    <div style="padding:15px; border-bottom:1px solid #333; display:flex; align-items:center; gap:10px;">
                        <div style="width:30px; height:30px; background:#1678c3; border-radius:50%; display:flex; justify-content:center; align-items:center;">User</div>
                        <div><div style="font-weight:bold; font-size:14px;">kamel90</div><div style="color:#079c20; font-size:12px;">€ ${currentBalance.toFixed(2)}</div></div>
                    </div>
                    <ul style="list-style:none; padding:0; margin:0; font-size:14px;">
                        <li style="border-bottom:1px solid #222;"><a href="sports.html" style="display:block; padding:15px; color:#ccc; text-decoration:none;">Sports Betting</a></li>
                        <li style="border-bottom:1px solid #222;"><a href="live.html" style="display:block; padding:15px; color:#ccc; text-decoration:none;">Live Betting</a></li>
                        <li style="border-bottom:1px solid #222;"><a href="casino.html" style="display:block; padding:15px; color:#ccc; text-decoration:none;">Casino</a></li>
                        <li style="border-bottom:1px solid #222;"><a href="virtual-sports.html" style="display:block; padding:15px; color:#ccc; text-decoration:none;">Virtual Sports</a></li>
                        <li style="border-bottom:1px solid #222;"><a href="settings.html" style="display:block; padding:15px; color:#ccc; text-decoration:none;">Settings</a></li>
                    </ul>
                `;
                document.body.appendChild(menu);
                // Trigger reflow
                void menu.offsetWidth;
                menu.style.transform = 'translateX(0)';
                
                // close on click outside
                const closeMenu = (e) => {
                    if (!menu.contains(e.target) && !hamburger.contains(e.target)) {
                        menu.style.transform = 'translateX(100%)';
                        setTimeout(() => menu.remove(), 300);
                        document.removeEventListener('click', closeMenu);
                    }
                };
                setTimeout(() => document.addEventListener('click', closeMenu), 100);
            }
        });
    }
});
