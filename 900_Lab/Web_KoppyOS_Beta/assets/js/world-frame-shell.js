(function(){
    const ROOT = document.documentElement;
    const MODES = ['clear', 'frost', 'dense'];

    const MODE_LABELS = {
        clear: '薄い',
        frost: '標準',
        dense: '濃い'
    };

    const PRESETS = {
        clear: {
            opacity: 0.06,
            blur: 4
        },
        frost: {
            opacity: 0.20,
            blur: 16
        },
        dense: {
            opacity: 0.42,
            blur: 30
        }
    };

    function $(sel, ctx=document){
        return ctx.querySelector(sel);
    }

    function $all(sel, ctx=document){
        return Array.from(ctx.querySelectorAll(sel));
    }

    function create(tag, cls, text){
        const el = document.createElement(tag);
        if (cls) el.className = cls;
        if (typeof text === 'string') el.textContent = text;
        return el;
    }

    function pickControlHost(){
        return (
            $('.wfl-toolbar') ||
            $('.wfl-topbar') ||
            $('.wf-toolbar') ||
            $('.wf-topbar') ||
            $('.wfl-header-panel') ||
            $('.wfl-sidebar') ||
            $('header') ||
            $('main') ||
            document.body
        );
    }

    function score(el){
        const r = el.getBoundingClientRect();
        if (r.width < window.innerWidth * 0.45) return -1;
        if (r.height < window.innerHeight * 0.35) return -1;
        const style = getComputedStyle(el);
        const radius = parseFloat(style.borderTopLeftRadius || '0') || 0;
        let s = r.width * r.height;
        s += radius * 500;
        if (style.position !== 'static') s += 5000;
        if (el.closest('.wf-shell-controls')) s -= 999999;
        return s;
    }

    function pickShellTarget(){
        /*
           Production pages must explicitly opt into a
           World Frame shell.

           This prevents a large application from being
           auto-detected and unexpectedly DOM-wrapped.
        */

        const explicit =
            $('[data-wf-shell]');

        if (explicit){
            return explicit;
        }

        /*
           Automatic shell discovery remains a Lab-only
           convenience.
        */

        if (
            document.body.dataset.worldFrameLab
            !== 'true'
        ){
            return null;
        }

        const preferred = [
            '.wfl-focus-stage',
            '.wf-focus-stage',
            '.wfl-preview-stage',
            '.wf-preview-stage',
            '.wfl-shell',
            '.wf-shell',
            '.world-frame-shell',
            '.world-frame-preview',
            '.wfl-frame',
            '.wf-frame',
            '.wfl-inner-frame',
            '.wf-inner-frame'
        ];

        for (const sel of preferred){
            const hit = $(sel);
            if (hit) return hit;
        }

        const candidates = $all(
            'main div, main section, body > div, .container, .panel, .frame'
        );

        let best = null;
        let bestScore = -1;

        for (const el of candidates){
            const s = score(el);

            if (s > bestScore){
                bestScore = s;
                best = el;
            }
        }

        return best;
    }

    function ensureInnerWrap(target){
        if (!target) return null;
        if (target.querySelector(':scope > .wf-shell-inner')) return target.querySelector(':scope > .wf-shell-inner');

        const inner = create('div', 'wf-shell-inner');
        const children = Array.from(target.childNodes);
        children.forEach(node => inner.appendChild(node));
        target.appendChild(inner);
        return inner;
    }

    function clearModeActive(){
        document
            .querySelectorAll('.wf-shell-mode-btn')
            .forEach(btn => {
                btn.classList.remove('is-active');
            });
    }

    function applyOpacity(target, value){
        const v =
            Math.max(
                0,
                Math.min(
                    0.55,
                    Number(value)
                )
            );

        /*
           IMPORTANT:
           Write directly on the shell target.
           This beats the mode class custom properties.
        */
        target.style.setProperty(
            '--wf-shell-opacity',
            String(v)
        );

        const val =
            document.querySelector(
                '.wf-shell-opacity-value'
            );

        if (val){
            val.textContent =
                Math.round(v * 100) + '%';
        }
    }

    function applyBlur(target, value){
        const v =
            Math.max(
                0,
                Math.min(
                    40,
                    Number(value)
                )
            );

        target.style.setProperty(
            '--wf-shell-blur',
            v + 'px'
        );

        const val =
            document.querySelector(
                '.wf-shell-blur-value'
            );

        if (val){
            val.textContent =
                v + 'px';
        }
    }

    function applyMode(
        target,
        mode,
        opacityInput,
        blurInput
    ){
        const preset =
            PRESETS[mode] ||
            PRESETS.frost;

        MODES.forEach(m => {
            target.classList.remove(
                'wf-shell-mode-' + m
            );
        });

        target.classList.add(
            'wf-shell-mode-' + mode
        );

        document
            .querySelectorAll('.wf-shell-mode-btn')
            .forEach(btn => {
                btn.classList.toggle(
                    'is-active',
                    btn.dataset.mode === mode
                );
            });

        opacityInput.value =
            String(
                Math.round(
                    preset.opacity * 100
                )
            );

        blurInput.value =
            String(preset.blur);

        applyOpacity(
            target,
            preset.opacity
        );

        applyBlur(
            target,
            preset.blur
        );
    }

    function buildControls(target){
        if ($('.wf-shell-controls')) return;

        const host = pickControlHost();
        const box = create('section', 'wf-shell-controls');

        const opacityBlock = create('div', 'wf-shell-control');
        const opacityLabel = create('label', '', 'ガラス濃度');
        const opacityValue = create('div', 'wf-shell-value wf-shell-opacity-value', '20%');
        const opacityInput = create('input');
        opacityInput.type = 'range';
        opacityInput.dataset.wfShellOpacity = '';
        opacityInput.min = '0';
        opacityInput.max = '55';
        opacityInput.step = '1';
        opacityInput.value = '20';

        opacityInput.addEventListener(
            'input',
            () => {
                clearModeActive();

                applyOpacity(
                    target,
                    Number(
                        opacityInput.value
                    ) / 100
                );
            }
        );
        opacityBlock.append(opacityLabel, opacityInput, opacityValue);

        const blurBlock = create('div', 'wf-shell-control');
        const blurLabel = create('label', '', '背景ぼかし');
        const blurValue = create('div', 'wf-shell-value wf-shell-blur-value', '16px');
        const blurInput = create('input');
        blurInput.type = 'range';
        blurInput.dataset.wfShellBlur = '';
        blurInput.min = '0';
        blurInput.max = '40';
        blurInput.step = '1';
        blurInput.value = '16';

        blurInput.addEventListener(
            'input',
            () => {
                clearModeActive();

                applyBlur(
                    target,
                    Number(
                        blurInput.value
                    )
                );
            }
        );
        blurBlock.append(blurLabel, blurInput, blurValue);

        const modeBlock = create('div', 'wf-shell-control');
        const modeLabel = create('label', '', 'ガラス質感');
        const modeGroup = create('div', 'wf-shell-mode-group');
        for (const mode of MODES){
            const btn = create('button', 'wf-shell-mode-btn', MODE_LABELS[mode] || mode);
            btn.type = 'button';
            btn.dataset.mode = mode;
            btn.addEventListener(
                'click',
                () => {
                    applyMode(
                        target,
                        mode,
                        opacityInput,
                        blurInput
                    );
                }
            );
            modeGroup.appendChild(btn);
        }
        modeBlock.append(modeLabel, modeGroup);

        box.append(opacityBlock, blurBlock, modeBlock);

        host.appendChild(box);

        applyMode(
            target,
            'frost',
            opacityInput,
            blurInput
        );
    }

    function init(){
        const target = pickShellTarget();
        if (!target) return;

        target.classList.add('wf-shell-surface');
        ensureInnerWrap(target);

        const mode =
            target.dataset.wfShellMode ||
            'frost';

        const opacity =
            Number(
                target.dataset.wfShellOpacity ??
                PRESETS[mode]?.opacity ??
                PRESETS.frost.opacity
            );

        const blur =
            Number(
                target.dataset.wfShellBlur ??
                PRESETS[mode]?.blur ??
                PRESETS.frost.blur
            );

        MODES.forEach(m => {
            target.classList.remove(
                'wf-shell-mode-' + m
            );
        });

        target.classList.add(
            'wf-shell-mode-' + mode
        );

        applyOpacity(
            target,
            opacity
        );

        applyBlur(
            target,
            blur
        );

        /*
           Lab-only.
           Production pages will NOT grow sliders.
        */
        if (
            document.body.dataset.worldFrameLab === 'true'
        ){
            buildControls(target);
        }
    }

    if (document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
