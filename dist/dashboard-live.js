document.addEventListener('DOMContentLoaded', () => {
    // Number counter animation for dashboards
    const animateValue = (obj, start, end, duration) => {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = (progress * (end - start) + start).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    };

    // Find elements that look like balances and animate them initially
    const currencyElements = document.querySelectorAll('.text-accent, .text-white');
    currencyElements.forEach(el => {
        const text = el.innerText.trim();
        if (text.includes('€') || text.includes('.') || text.includes(',')) {
            const numStr = text.replace(/[^0-9.]/g, '');
            const num = parseFloat(numStr);
            if (!isNaN(num) && num > 10) { // arbitrary threshold to avoid animating small labels
                const prefix = text.includes('€') ? '€ ' : (text.includes('+') ? '+ ' : '');
                // Save original format, temporarily remove it
                el.innerText = prefix + '0.00';
                setTimeout(() => {
                    const tempSpan = document.createElement('span');
                    animateValue(tempSpan, 0, num, 2000);
                    
                    const updateInterval = setInterval(() => {
                        if(tempSpan.innerText) {
                           el.innerText = prefix + tempSpan.innerText;
                        }
                    }, 50);
                    
                    setTimeout(() => {
                        clearInterval(updateInterval);
                        el.innerText = text; // ensure final exact value
                    }, 2100);
                    
                }, 500);
            }
        }
    });

    // Simulate incoming toasts / notifications
    const createToast = (msg, type = 'success') => {
        const toast = document.createElement('div');
        const color = type === 'success' ? 'bg-accent' : (type === 'warning' ? 'bg-orange-500' : 'bg-alert');
        toast.className = `fixed top-20 left-1/2 transform -translate-x-1/2 ${color} text-white px-4 py-2 rounded shadow-xl z-50 text-xs font-bold transition-all duration-500`;
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -20px)';
        toast.innerHTML = `<i class="fa-solid fa-bell mr-2"></i> ${msg}`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translate(-50%, 0)';
        }, 100);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, -20px)';
            setTimeout(() => toast.remove(), 500);
        }, 3500);
    }

    // Trigger random notifications to make dashboards feel alive
    setInterval(() => {
        if (Math.random() > 0.6) {
            const users = ['player_hatem', 'ali_tunis', 'mohamed99', 'vip_kamel', 'agent_007'];
            const actions = ['deposited', 'withdrew', 'won a bet of', 'registered'];
            const amounts = [50, 100, 200, 500, 1000];
            
            const u = users[Math.floor(Math.random() * users.length)];
            const a = actions[Math.floor(Math.random() * actions.length)];
            
            let msg = '';
            let type = 'success';
            
            if (a === 'registered') {
                msg = `New user ${u} just registered!`;
                type = 'success';
            } else {
                const am = amounts[Math.floor(Math.random() * amounts.length)];
                msg = `${u} just ${a} €${am}`;
                type = a === 'withdrew' ? 'alert' : 'success';
            }
            
            createToast(msg, type);
        }
    }, 7000);
});
