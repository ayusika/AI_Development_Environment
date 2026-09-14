(() => {
  const far = document.getElementById('wfBinaryFar');
  const mid = document.getElementById('wfBinaryMid');
  const near = document.getElementById('wfBinaryNear');
  const logLayer = document.getElementById('wfLogLayer');

  if (!far || !mid || !near || !logLayer) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function binaryString(minLen, maxLen) {
    const len = Math.floor(rand(minLen, maxLen));
    let out = '';
    for (let i = 0; i < len; i += 1) {
      out += Math.random() > 0.48 ? '1' : '0';
      if (i % 4 === 3) out += ' ';
    }
    return out.trim();
  }

  const angles = [-68, -48, -32, -20, -10, 0, 12, 18, 26, 38, 52, 90];
  const logTexts = [
    'WORLD_FRAME :: ACTIVE\\nDEPTH_MAP :: ONLINE',
    'PRIVATE_OS :: READY\\nACCESS :: LOCAL',
    'MEMORY_CORE :: SYNC\\nARCHIVE :: READY',
    'HOME_LINK :: STABLE\\nDEVICE_MAP :: READY',
    'KOPPY_WORLD\\nPRIVATE_LINK :: ACTIVE',
    'NODE_MAP :: 05\\nROUTE :: OPEN',
    'ICE_NETWORK :: ONLINE\\nWORLD_LAYER :: 07'
  ];

  function spawnBinary(layer, count, opts = {}) {
    for (let i = 0; i < count; i += 1) {
      const el = document.createElement('div');
      el.className = 'wf-binary';
      el.textContent = binaryString(opts.minLen || 22, opts.maxLen || 52);

      const left = rand(-8, 88);
      const top = rand(-6, 94);
      const angle = pick(angles);
      const scale = rand(opts.minScale || 0.82, opts.maxScale || 1.18);
      const moveX = rand(-160, 160);
      const moveY = rand(-120, 120);
      const duration = reduceMotion ? 1 : rand(opts.minDur || 34, opts.maxDur || 68);
      const delay = reduceMotion ? 0 : rand(-42, 0);

      el.style.left = `${left}%`;
      el.style.top = `${top}%`;
      el.style.setProperty('--angle', `${angle}deg`);
      el.style.setProperty('--scale', scale.toFixed(3));
      el.style.setProperty('--tx-start', '0px');
      el.style.setProperty('--ty-start', '0px');
      el.style.setProperty('--tx-end', `${moveX}px`);
      el.style.setProperty('--ty-end', `${moveY}px`);
      el.style.setProperty('--duration', `${duration}s`);
      el.style.setProperty('--delay', `${delay}s`);

      layer.appendChild(el);
    }
  }

  function spawnLogs(count) {
    for (let i = 0; i < count; i += 1) {
      const el = document.createElement('div');
      el.className = 'wf-log';
      el.textContent = pick(logTexts);

      el.style.left = `${rand(4, 90)}%`;
      el.style.top = `${rand(4, 88)}%`;
      el.style.transform = `rotate(${pick([-90, -45, -20, 0, 18, 34, 90])}deg)`;
      el.style.animationDelay = `${rand(-8, 0)}s`;

      logLayer.appendChild(el);
    }
  }

  spawnBinary(far, 34, { minLen: 24, maxLen: 64, minScale: 0.78, maxScale: 1.02, minDur: 44, maxDur: 82 });
  spawnBinary(mid, 26, { minLen: 20, maxLen: 56, minScale: 0.88, maxScale: 1.12, minDur: 34, maxDur: 64 });
  spawnBinary(near, 16, { minLen: 16, maxLen: 42, minScale: 0.98, maxScale: 1.24, minDur: 26, maxDur: 52 });
  spawnLogs(11);

  if (!reduceMotion) {
    const bg = document.querySelector('.wf-bg');
    const shell = document.querySelector('.wf-shell');

    window.addEventListener('mousemove', (event) => {
      const x = (event.clientX / window.innerWidth - 0.5);
      const y = (event.clientY / window.innerHeight - 0.5);

      if (bg) {
        bg.style.transform = `translate3d(${x * -10}px, ${y * -8}px, 0)`;
      }

      if (shell) {
        shell.style.transform = `translate3d(${x * 6}px, ${y * 6}px, 0)`;
      }
    });
  }
})();
