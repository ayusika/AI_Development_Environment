(function(){
    const HOST_SELECTORS = [
        '.wf-stage',
        '.wf-focus-stage',
        '.world-frame-preview',
        '.world-frame-shell',
        '.world-frame-demo',
        '.world-frame-lab-preview',
        '.wfl-preview',
        '.wfl-stage',
        '.wfl-focus-stage',
        '.wfl-shell',
        '.wfl-demo',
        'main',
        'body'
    ];

    function pickHost(){
        for (const sel of HOST_SELECTORS){
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return document.body;
    }

    function make(tag, cls){
        const el = document.createElement(tag);
        if (cls) el.className = cls;
        return el;
    }

    function rand(min, max){
        return Math.random() * (max - min) + min;
    }

    function choice(arr){
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function binaryString(minRepeat = 14, maxRepeat = 42){
        const count = Math.floor(rand(minRepeat, maxRepeat));
        let out = [];
        for (let i = 0; i < count; i++){
            out.push(Math.random() > 0.5 ? '1' : '0');
        }
        return out.join(' ');
    }

    function crystalSVG(){
        return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <line x1="12" y1="2" x2="12" y2="22"></line>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <line x1="4.5" y1="4.5" x2="19.5" y2="19.5"></line>
            <line x1="19.5" y1="4.5" x2="4.5" y2="19.5"></line>

            <polyline points="12,2 10.3,4.6 13.7,4.6 12,2"></polyline>
            <polyline points="12,22 10.3,19.4 13.7,19.4 12,22"></polyline>

            <polyline points="2,12 4.6,10.3 4.6,13.7 2,12"></polyline>
            <polyline points="22,12 19.4,10.3 19.4,13.7 22,12"></polyline>

            <polyline points="4.5,4.5 6.9,5.2 5.2,6.9 4.5,4.5"></polyline>
            <polyline points="19.5,19.5 17.1,18.8 18.8,17.1 19.5,19.5"></polyline>

            <polyline points="19.5,4.5 18.8,6.9 17.1,5.2 19.5,4.5"></polyline>
            <polyline points="4.5,19.5 5.2,17.1 6.9,18.8 4.5,19.5"></polyline>
        </svg>
        `;
    }

    function build(){
        if (document.querySelector('.wf-polish-layer')) return;

        const host = pickHost();
        if (!host) return;

        host.classList.add('wf-polish-host');

        const far = make('div', 'wf-polish-layer wf-polish-far');
        const mid = make('div', 'wf-polish-layer wf-polish-mid');
        const near = make('div', 'wf-polish-layer wf-polish-near');
        const crystals = make('div', 'wf-polish-layer wf-polish-crystals');
        const nodes = make('div', 'wf-polish-layer wf-polish-nodes');

        host.prepend(nodes);
        host.prepend(crystals);
        host.prepend(near);
        host.prepend(mid);
        host.prepend(far);

        const hostRect = () => host.getBoundingClientRect();

        // FAR binary / cleaner structure
        for (let i = 0; i < 22; i++){
            const el = make('div', 'wf-polish-line');
            el.textContent = binaryString(12, 34);
            const r = hostRect();
            const rot = choice([-84, -72, -58, -36, -22, 0, 18, 32, 48, 64]);
            el.style.left = rand(-8, 92) + '%';
            el.style.top = rand(-6, 96) + '%';
            el.style.fontSize = rand(9, 15) + 'px';
            el.style.setProperty('--rot', rot + 'deg');
            el.style.setProperty('--tx', rand(-16, 16) + 'px');
            el.style.setProperty('--ty', rand(-14, 14) + 'px');
            el.style.setProperty('--op-a', rand(0.06, 0.14).toFixed(3));
            el.style.setProperty('--op-b', rand(0.18, 0.34).toFixed(3));
            el.style.animationDuration = rand(18, 34) + 's';
            el.style.animationDelay = (-rand(0, 16)).toFixed(2) + 's';
            far.appendChild(el);
        }

        // MID binary / most visible structure
        for (let i = 0; i < 18; i++){
            const el = make('div', 'wf-polish-line');
            el.textContent = binaryString(14, 28);
            const rot = choice([-78, -60, -42, -26, -12, 12, 22, 36, 58]);
            el.style.left = rand(-2, 88) + '%';
            el.style.top = rand(-2, 92) + '%';
            el.style.fontSize = rand(10, 17) + 'px';
            el.style.setProperty('--rot', rot + 'deg');
            el.style.setProperty('--tx', rand(-20, 20) + 'px');
            el.style.setProperty('--ty', rand(-18, 18) + 'px');
            el.style.setProperty('--op-a', rand(0.10, 0.18).toFixed(3));
            el.style.setProperty('--op-b', rand(0.24, 0.42).toFixed(3));
            el.style.animationDuration = rand(16, 28) + 's';
            el.style.animationDelay = (-rand(0, 18)).toFixed(2) + 's';
            mid.appendChild(el);
        }

        // NEAR binary / fewer, larger, blurred
        for (let i = 0; i < 7; i++){
            const el = make('div', 'wf-polish-line is-near');
            el.textContent = binaryString(9, 20);
            const rot = choice([-72, -48, -24, 0, 18, 38, 62]);
            el.style.left = rand(-10, 86) + '%';
            el.style.top = rand(-10, 92) + '%';
            el.style.fontSize = rand(22, 46) + 'px';
            el.style.setProperty('--rot', rot + 'deg');
            el.style.setProperty('--tx', rand(-12, 12) + 'px');
            el.style.setProperty('--ty', rand(-12, 12) + 'px');
            el.style.setProperty('--op-a', rand(0.04, 0.08).toFixed(3));
            el.style.setProperty('--op-b', rand(0.10, 0.18).toFixed(3));
            el.style.animationDuration = rand(20, 32) + 's';
            el.style.animationDelay = (-rand(0, 14)).toFixed(2) + 's';
            near.appendChild(el);
        }

        // Small logs
        const logPool = [
            "WORLD_LAYER :: MEMORY_CORE\nICE_NETWORK :: ONLINE",
            "LOCAL_ACCESS :: READY\nBINARY_STREAM :: ACTIVE",
            "KOPPY_WORLD :: WORLD_LAYER\nPRIVATE_LINK :: ACTIVE",
            "PARALLAX :: KOPPY_WORLD\nNODE_MAP :: ACTIVE",
            "SYNC :: MEMORY_CORE\nLOCAL_ACCESS :: READY",
            "DEPTH_MAP :: KOPPY_WORLD\nLOG_ROUTE :: BINARY_STREAM"
        ];

        for (let i = 0; i < 12; i++){
            const log = make('div', 'wf-polish-log');
            log.textContent = choice(logPool);
            log.style.left = rand(2, 88) + '%';
            log.style.top = rand(4, 92) + '%';
            log.style.transform = `rotate(${choice([-90,-68,-34,0,18,28])}deg)`;
            log.style.animationDelay = (-rand(0, 8)).toFixed(2) + 's';
            mid.appendChild(log);
        }

        // Glowing nodes
        for (let i = 0; i < 30; i++){
            const node = make('div', 'wf-polish-node');
            node.style.left = rand(0, 100) + '%';
            node.style.top = rand(0, 100) + '%';
            node.style.setProperty('--dur', rand(4.6, 9.8) + 's');
            node.style.animationDelay = (-rand(0, 8)).toFixed(2) + 's';
            nodes.appendChild(node);
        }

        // Ice crystals
        for (let i = 0; i < 8; i++){
            const crystal = make('div', 'wf-polish-crystal');
            crystal.innerHTML = crystalSVG();
            crystal.style.left = rand(4, 94) + '%';
            crystal.style.top = rand(6, 94) + '%';
            crystal.style.setProperty('--size', rand(14, 34) + 'px');
            crystal.style.setProperty('--alpha', rand(0.18, 0.46).toFixed(3));
            crystal.style.setProperty('--float', rand(8, 16) + 's');
            crystal.style.setProperty('--blink', rand(5, 11) + 's');
            crystal.style.animationDelay = (-rand(0, 9)).toFixed(2) + 's';
            crystals.appendChild(crystal);
        }
    }

    if (document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', build, { once: true });
    } else {
        build();
    }
})();
