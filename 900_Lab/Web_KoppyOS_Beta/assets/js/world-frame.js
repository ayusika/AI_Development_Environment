(() => {
  const app = document.getElementById('wfApp');
  if (!app) return;

  const streamsLayer = app.querySelector('[data-layer="streams"]');
  const logsLayer = app.querySelector('[data-layer="logs"]');
  const crystalsLayer = app.querySelector('[data-layer="crystals"]');
  const starsLayer = app.querySelector('[data-layer="stars"]');
  const fairyImage = document.getElementById('wfFairyImage');

  const motionMap = {
    calm:   { streams: 34, logs: 10, crystals: 28, stars: 70 },
    normal: { streams: 52, logs: 14, crystals: 40, stars: 96 },
    rich:   { streams: 72, logs: 18, crystals: 56, stars: 130 }
  };

  const logFragments = [
    'KOPPY_WORLD',
    'PRIVATE_LINK',
    'ACTIVE',
    'WORLD_FRAME',
    'DEPTH_MAP',
    'ICE_NETWORK',
    'MEMORY_CORE',
    'SYNC',
    'LOCAL_ACCESS',
    'READY',
    'WORLD_LAYER',
    'BINARY_STREAM',
    'SHELL_FRAME',
    'PARALLAX',
    'CRYSTAL_NODE',
    'WORLD_ONLINE',
    'LOG_ROUTE',
    'NODE_MAP'
  ];

  const streamAngles = [0, 0, 0, 8, -8, 16, -16, 26, -26, 36, -36, 52, -52, 90, -90, 118, -118, 146, -146];

  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function binaryString(len) {
    return Array.from({ length: len }, () => (Math.random() > 0.5 ? '1' : '0')).join('');
  }

  function buildStars(count) {
    starsLayer.innerHTML = '';
    const width = app.clientWidth;
    const height = app.clientHeight;

    for (let i = 0; i < count; i += 1) {
      const el = document.createElement('i');
      el.className = 'wf-star' + (Math.random() > 0.86 ? ' is-large' : '');
      el.style.left = `${rand(0, width)}px`;
      el.style.top = `${rand(0, height)}px`;
      el.style.setProperty('--duration', `${rand(4.5, 10.5)}s`);
      el.style.setProperty('--delay', `${rand(-7, 0)}s`);
      starsLayer.appendChild(el);
    }
  }

  function buildStreams(count) {
    streamsLayer.innerHTML = '';
    const width = app.clientWidth;
    const height = app.clientHeight;

    for (let i = 0; i < count; i += 1) {
      const el = document.createElement('div');

      const depthRoll = Math.random();

      if (depthRoll > 0.91) {
        el.className = 'wf-stream is-foreground';
      } else if (depthRoll > 0.70) {
        el.className = 'wf-stream is-near';
      } else if (depthRoll < 0.30) {
        el.className = 'wf-stream is-far';
      } else {
        el.className = 'wf-stream';
      }

      const angle = pick(streamAngles);
      const x0 = rand(-width * 0.15, width * 1.05);
      const y0 = rand(-height * 0.12, height * 1.08);

      const driftBase = rand(60, 260);
      const angleRad = angle * Math.PI / 180;
      const dx = Math.cos(angleRad) * driftBase;
      const dy = Math.sin(angleRad) * driftBase;

      const x1 = x0 + dx;
      const y1 = y0 + dy;

      el.textContent = binaryString(randInt(18, 52)) + '   ' + binaryString(randInt(10, 34));

      el.style.setProperty('--x0', `${x0}px`);
      el.style.setProperty('--y0', `${y0}px`);
      el.style.setProperty('--x1', `${x1}px`);
      el.style.setProperty('--y1', `${y1}px`);
      el.style.setProperty('--angle', `${angle}deg`);
      el.style.setProperty('--duration', `${rand(14, 34)}s`);
      el.style.setProperty('--pulse', `${rand(6, 12)}s`);
      el.style.setProperty('--delay', `${rand(-26, 0)}s`);
      el.style.setProperty('--o0', `${rand(0.18, 0.44)}`);
      el.style.setProperty('--o1', `${rand(0.52, 0.90)}`);

      streamsLayer.appendChild(el);
    }
  }

  function buildLogs(count) {
    logsLayer.innerHTML = '';
    const width = app.clientWidth;
    const height = app.clientHeight;

    for (let i = 0; i < count; i += 1) {
      const el = document.createElement('div');

      el.className =
        Math.random() > 0.54
          ? 'wf-log is-hudline'
          : 'wf-log';

      const lines = randInt(2, 4);
      const parts = [];
      for (let j = 0; j < lines; j += 1) {
        parts.push(`${pick(logFragments)} :: ${pick(logFragments)}`);
      }
      el.textContent = parts.join('\n');

      el.style.left = `${rand(24, width - 180)}px`;
      el.style.top = `${rand(24, height - 60)}px`;
      el.style.transform = `rotate(${pick([0, 0, 90, -90, 12, -12])}deg)`;
      el.style.setProperty('--duration', `${rand(12, 22)}s`);
      el.style.setProperty('--delay', `${rand(-14, 0)}s`);

      logsLayer.appendChild(el);
    }
  }

  function createWireCrystal() {
    const el = document.createElement('div');
    el.className = 'wf-crystal wf-crystal--wire';
    el.appendChild(document.createElement('span'));
    return el;
  }

  function createFacetCrystal() {
    const el = document.createElement('div');
    el.className = 'wf-crystal wf-crystal--facet';
    return el;
  }

  function createDustCrystal() {
    const el = document.createElement('div');
    el.className = 'wf-crystal wf-crystal--dust';
    return el;
  }

  function createFlareCrystal() {
    const el = document.createElement('div');
    el.className = 'wf-crystal wf-crystal--flare';

    for (let index = 0; index < 3; index += 1) {
      el.appendChild(
        document.createElement('span')
      );
    }

    return el;
  }

  function buildCrystals(count) {
    crystalsLayer.innerHTML = '';
    const width = app.clientWidth;
    const height = app.clientHeight;

    for (let i = 0; i < count; i += 1) {
      let el;
      const typeRoll = Math.random();

      if (typeRoll < 0.46) {
        el = createDustCrystal();
      } else if (typeRoll < 0.72) {
        el = createWireCrystal();
      } else if (typeRoll < 0.88) {
        el = createFacetCrystal();
      } else {
        el = createFlareCrystal();
      }

      if (
        !el.classList.contains('wf-crystal--dust') &&
        Math.random() > 0.88
      ) {
        el.classList.add(
          'is-near-crystal'
        );
      }

      el.style.left = `${rand(0, width)}px`;
      el.style.top = `${rand(0, height)}px`;
      el.style.setProperty('--duration', `${rand(10, 22)}s`);
      el.style.setProperty('--delay', `${rand(-14, 0)}s`);
      el.style.setProperty('--float-x', `${rand(-12, 12)}px`);
      el.style.setProperty('--float-y', `${rand(-14, 14)}px`);
      el.style.setProperty('--spin', `${rand(-24, 24)}deg`);
      crystalsLayer.appendChild(el);
    }
  }

  function rebuildScene() {
    const mode = app.dataset.motion || 'rich';
    const config = motionMap[mode] || motionMap.rich;
    buildStars(config.stars);
    buildStreams(config.streams);
    buildLogs(config.logs);
    buildCrystals(config.crystals);
  }

  function setActive(buttons, key, value) {
    buttons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset[key] === value);
    });
  }

  function setupLabFocus() {
    const lab = document.querySelector('.wf-lab');
    const enterButton = document.querySelector('[data-lab-focus]');
    const exitButton = document.querySelector('[data-lab-focus-exit]');

    if (!lab || !enterButton || !exitButton) {
      return;
    }

    const setFocus = (enabled) => {
      lab.classList.toggle('is-focus', enabled);
      document.body.classList.toggle('wf-focus-active', enabled);

      enterButton.setAttribute(
        'aria-pressed',
        enabled ? 'true' : 'false'
      );

      window.setTimeout(
        rebuildScene,
        100
      );
    };

    enterButton.addEventListener('click', () => {
      setFocus(
        !lab.classList.contains('is-focus')
      );
    });

    exitButton.addEventListener('click', () => {
      setFocus(false);
    });

    document.addEventListener('keydown', (event) => {
      const target = event.target;

      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if (isTyping) {
        return;
      }

      if (event.key === 'Escape') {
        setFocus(false);
        return;
      }

      if (
        event.key === 'f' ||
        event.key === 'F'
      ) {
        setFocus(
          !lab.classList.contains('is-focus')
        );
      }
    });
  }

  function setupControls() {
    const modeButtons = Array.from(document.querySelectorAll('[data-mode-set]'));
    const motionButtons = Array.from(document.querySelectorAll('[data-motion-set]'));
    const themeButtons = Array.from(document.querySelectorAll('[data-theme-set]'));

    modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.modeSet;
        app.dataset.mode = value;
        setActive(modeButtons, 'modeSet', value);
      });
    });

    motionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.motionSet;
        app.dataset.motion = value;
        setActive(motionButtons, 'motionSet', value);
        rebuildScene();
      });
    });

    themeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.themeSet;
        app.dataset.theme = value;
        setActive(themeButtons, 'themeSet', value);
      });
    });
  }

  function setupParallax() {
    const preview = document.querySelector('.wf-preview__frame');
    if (!preview) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    preview.addEventListener('pointermove', (event) => {
      const rect = preview.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      app.style.setProperty('--wf-parallax-x', `${px * 30}px`);
      app.style.setProperty('--wf-parallax-y', `${py * 20}px`);
    });

    preview.addEventListener('pointerleave', () => {
      app.style.setProperty('--wf-parallax-x', '0px');
      app.style.setProperty('--wf-parallax-y', '0px');
    });
  }

  function setupResizeRebuild() {
    let timer = null;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(rebuildScene, 120);
    });
  }

  function setupFairyFallback() {
    if (!fairyImage) return;
    fairyImage.addEventListener('error', () => {
      fairyImage.classList.add('wf-hidden');
      const visual = fairyImage.closest('.wf-shell__fairy');
      if (!visual) return;
      const note = document.createElement('div');
      note.style.color = 'rgba(239,247,255,.82)';
      note.style.fontWeight = '800';
      note.style.textAlign = 'center';
      note.style.lineHeight = '1.8';
      note.style.fontSize = '14px';
      note.innerHTML = 'Koppy image placeholder<br>あとで koopy.png を差し込み';
      visual.appendChild(note);
    });
  }

  setupControls();
  setupLabFocus();
  setupParallax();
  setupResizeRebuild();
  setupFairyFallback();
  rebuildScene();
})();
