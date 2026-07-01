document.addEventListener('DOMContentLoaded', () => {
    // Intercept clicks on Amatic games (pid="1")
    const amaticGames = document.querySelectorAll('.cg-wrap');
    
    amaticGames.forEach(game => {
        const launchBtn = game.querySelector('.cg-launch');
        if(launchBtn && launchBtn.getAttribute('data-pid') === "1") {
            const btns = game.querySelectorAll('.cg-btn');
            const gameName = game.querySelector('.cg-name').innerText.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
            
            btns.forEach(b => {
                b.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Show game overlay
                    const overlay = document.getElementById('gameLaunchWrapper');
                    const iframe = document.getElementById('gameIframe');
                    
                    if(overlay && iframe) {
                        overlay.classList.remove('fieldHide');
                        overlay.style.display = 'block';
                        
                        // Pick from our 10 downloaded games or fallback to a default
                        const available = ["admiral_nelson", "all_ways_candy", "all_ways_hot_fruits", "all_ways_joker", "all_ways_win", "allways_fruits", "anubis_gold", "aztec_emerald", "bells_on_fire", "book_of_aztec"];
                        let targetFolder = available.includes(gameName) ? gameName : "book_of_aztec";
                        
                        iframe.src = `games/amatic/${targetFolder}/index.html`;
                    }
                });
            });
        }
    });
});
