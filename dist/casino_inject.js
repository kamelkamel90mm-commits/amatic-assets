document.addEventListener('DOMContentLoaded', () => {
    // Real playable demo links from Pragmatic Play
    const demoLinks = {
        'sweet_bonanza': 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?lang=en&cur=EUR&gameSymbol=vs20fruitsw',
        'gates_of_olympus': 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?lang=en&cur=EUR&gameSymbol=vs20olympgate',
        'the_dog_house': 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?lang=en&cur=EUR&gameSymbol=vs20doghouse',
        'wolf_gold': 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?lang=en&cur=EUR&gameSymbol=vs25wolfgold',
        'fruit_party': 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?lang=en&cur=EUR&gameSymbol=vs20fruitparty',
        'chilli_heat': 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?lang=en&cur=EUR&gameSymbol=vs25chilli',
        'mustang_gold': 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?lang=en&cur=EUR&gameSymbol=vs25mustang',
        'great_rhino': 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?lang=en&cur=EUR&gameSymbol=vs20greatrhino',
        'madame_destiny_megaways': 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?lang=en&cur=EUR&gameSymbol=vswaysmadame',
        'default': 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?lang=en&cur=EUR&gameSymbol=vs20olympgate' // Fallback to Gates of Olympus
    };

    const games = document.querySelectorAll('.cg-wrap');
    
    games.forEach(game => {
        const btns = game.querySelectorAll('.cg-btn');
        const gameNameRaw = game.querySelector('.cg-name');
        if(!gameNameRaw) return;
        
        const gameName = gameNameRaw.innerText.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
        
        btns.forEach(b => {
            b.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const overlay = document.getElementById('gameLaunchWrapper');
                const iframe = document.getElementById('gameIframe');
                
                if(overlay && iframe) {
                    overlay.classList.remove('fieldHide');
                    overlay.style.display = 'block';
                    
                    let targetUrl = demoLinks[gameName] || demoLinks['default'];
                    
                    // If it's the crash game
                    if(gameName.includes("crash")) {
                        targetUrl = "games/amatic/crash_test/index.html";
                    }
                    
                    // Load the game
                    iframe.src = targetUrl;
                }
            });
        });
    });

    // Override the close button to properly close the game overlay
    const closeBtn = document.getElementById('gamesLobbyLink');
    if(closeBtn) {
        closeBtn.removeAttribute('onclick'); // Remove Forzza's original broken JS
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const overlay = document.getElementById('gameLaunchWrapper');
            const iframe = document.getElementById('gameIframe');
            if(overlay) {
                overlay.classList.add('fieldHide');
                overlay.style.display = 'none';
                iframe.src = ''; // Stop the game audio
            }
        });
    }
});
