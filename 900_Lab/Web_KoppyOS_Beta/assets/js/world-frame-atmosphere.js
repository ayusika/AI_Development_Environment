(() => {
  "use strict";

  const MODES = {
    off: {
      code: 0,
      dust: 0
    },

    subtle: {
      code: 6,
      dust: 8
    },

    normal: {
      code: 11,
      dust: 15
    },

    rich: {
      code: 17,
      dust: 24
    }
  };

  const LABELS = {
    off: "なし",
    subtle: "控えめ",
    normal: "標準",
    rich: "多め"
  };

  const THEME_COLORS = {
    ice: "#9bdfff",
    aqua: "#7ff5ef",
    violet: "#c2b6ff",
    pink: "#ffb8e1",
    electric: "#83ddff",
    ember: "#ffc27c",
    rose: "#ff9bd6",
    crimson: "#ff8995",
    aurora: "#81ffd0"
  };

  const atmosphereHost = () =>
    document.querySelector(
      "[data-wf-atmosphere-host]"
    ) ||
    document.querySelector(
      "[data-wf-shell]"
    );

  const app = () =>
    document.querySelector(
      "#wfApp"
    );

  let resizeTimer = null;

  const randFactory = () =>
    window
      .KoppyWorldFrame
      ?.createRandom
      ?.("shell-atmosphere") ||
    Math.random;

  const clamp = (
    value,
    min,
    max
  ) =>
    Math.max(
      min,
      Math.min(
        max,
        value
      )
    );

  const qualityFactor = () => {
    const quality =
      app()
        ?.dataset
        .wfQuality ||
      "balanced";

    if (quality === "high") {
      return 1;
    }

    if (quality === "light") {
      return .58;
    }

    return .82;
  };

  const responsiveFactor = () => {
    const width =
      atmosphereHost()
        ?.clientWidth ||
      window.innerWidth;

    if (width <= 680) {
      return .58;
    }

    if (width <= 980) {
      return .76;
    }

    return 1;
  };

  const getMode = () => {
    const target =
      atmosphereHost();

    if (!target) {
      return "normal";
    }

    const mode =
      target.dataset
        .wfAtmosphere ||
      "normal";

    return MODES[mode]
      ? mode
      : "normal";
  };

  const binaryText = (
    random,
    length
  ) => {
    const result = [];

    for (
      let index = 0;
      index < length;
      index += 1
    ) {
      result.push(
        random() > .5
          ? "1"
          : "0"
      );
    }

    return result.join(" ");
  };

  const syncTheme = () => {
    const target =
      atmosphereHost();

    if (!target) {
      return;
    }

    const theme =
      app()?.dataset.theme ||
      "ice";

    target.style.setProperty(
      "--wf-atmosphere-color",
      THEME_COLORS[theme] ||
      THEME_COLORS.ice
    );
  };

  const getLayer = () => {
    const target =
      atmosphereHost();

    if (!target) {
      return null;
    }

    let layer =
      target.querySelector(
        ":scope > .wf-shell-atmosphere"
      );

    if (!layer) {
      layer =
        document.createElement(
          "div"
        );

      layer.className =
        "wf-shell-atmosphere";

      layer.setAttribute(
        "aria-hidden",
        "true"
      );

      target.insertBefore(
        layer,
        target.firstChild
      );
    }

    return layer;
  };

  const rebuild = () => {
    const target =
      atmosphereHost();

    const layer =
      getLayer();

    if (
      !target ||
      !layer
    ) {
      return;
    }

    syncTheme();

    layer.replaceChildren();

    const mode =
      getMode();

    if (mode === "off") {
      return;
    }

    const config =
      MODES[mode];

    const factor =
      qualityFactor() *
      responsiveFactor();

    const codeCount =
      Math.max(
        2,
        Math.round(
          config.code *
          factor
        )
      );

    const dustCount =
      Math.max(
        3,
        Math.round(
          config.dust *
          factor
        )
      );

    const random =
      randFactory();

    const height =
      Math.max(
        target.scrollHeight,
        target.clientHeight,
        window.innerHeight
      );

    const distance =
      height + 420;

    for (
      let index = 0;
      index < codeCount;
      index += 1
    ) {
      const code =
        document.createElement(
          "span"
        );

      const roll =
        random();

      code.className =
        "wf-atmosphere-code" +
        (
          roll < .26
            ? " is-soft"
            : roll > .82
              ? " is-near"
              : ""
        );

      code.textContent =
        binaryText(
          random,
          Math.floor(
            9 +
            random() *
            18
          )
        );

      code.style.left =
        (
          3 +
          random() *
          94
        ) + "%";

      code.style.setProperty(
        "--wf-atmosphere-size",
        (
          7 +
          random() *
          5
        ).toFixed(1) +
        "px"
      );

      code.style.setProperty(
        "--wf-atmosphere-opacity",
        (
          .10 +
          random() *
          .18
        ).toFixed(3)
      );

      code.style.setProperty(
        "--wf-atmosphere-duration",
        (
          11 +
          random() *
          13
        ).toFixed(2) +
        "s"
      );

      code.style.setProperty(
        "--wf-atmosphere-delay",
        (
          -random() *
          22
        ).toFixed(2) +
        "s"
      );

      code.style.setProperty(
        "--wf-atmosphere-drift",
        (
          -22 +
          random() *
          44
        ).toFixed(1) +
        "px"
      );

      code.style.setProperty(
        "--wf-atmosphere-distance",
        distance + "px"
      );

      layer.appendChild(
        code
      );
    }

    for (
      let index = 0;
      index < dustCount;
      index += 1
    ) {
      const dust =
        document.createElement(
          "i"
        );

      dust.className =
        "wf-atmosphere-dust" +
        (
          random() > .76
            ? " is-diamond"
            : ""
        );

      dust.style.left =
        (
          2 +
          random() *
          96
        ) + "%";

      dust.style.setProperty(
        "--wf-dust-size",
        (
          1.5 +
          random() *
          3.5
        ).toFixed(1) +
        "px"
      );

      dust.style.setProperty(
        "--wf-dust-opacity",
        (
          .16 +
          random() *
          .42
        ).toFixed(3)
      );

      dust.style.setProperty(
        "--wf-dust-duration",
        (
          9 +
          random() *
          16
        ).toFixed(2) +
        "s"
      );

      dust.style.setProperty(
        "--wf-dust-delay",
        (
          -random() *
          20
        ).toFixed(2) +
        "s"
      );

      dust.style.setProperty(
        "--wf-dust-drift",
        (
          -34 +
          random() *
          68
        ).toFixed(1) +
        "px"
      );

      dust.style.setProperty(
        "--wf-atmosphere-distance",
        distance + "px"
      );

      layer.appendChild(
        dust
      );
    }
  };

  const updateControls = (
    mode
  ) => {
    document
      .querySelectorAll(
        "[data-wf-atmosphere-set]"
      )
      .forEach(
        button => {
          button.classList.toggle(
            "is-active",
            button.dataset
              .wfAtmosphereSet ===
              mode
          );
        }
      );
  };

  const setMode = (
    mode,
    {
      silent = false
    } = {}
  ) => {
    const target =
      atmosphereHost();

    if (!target) {
      return;
    }

    const safeMode =
      MODES[mode]
        ? mode
        : "normal";

    target.dataset.wfAtmosphere =
      safeMode;

    updateControls(
      safeMode
    );

    rebuild();

    if (!silent) {
      window.dispatchEvent(
        new CustomEvent(
          "wf:atmosphere-change",
          {
            detail: {
              mode: safeMode
            }
          }
        )
      );
    }
  };

  const buildLabControl = () => {
    if (
      document.body.dataset
        .worldFrameLab !==
      "true"
    ) {
      return;
    }

    const host =
      document.querySelector(
        ".wf-shell-controls"
      );

    if (!host) {
      window.setTimeout(
        buildLabControl,
        40
      );

      return;
    }

    if (
      host.querySelector(
        "[data-wf-atmosphere-control]"
      )
    ) {
      return;
    }

    const block =
      document.createElement(
        "div"
      );

    block.className =
      "wf-shell-control wf-atmosphere-control";

    block.dataset.wfAtmosphereControl =
      "";

    const label =
      document.createElement(
        "label"
      );

    label.textContent =
      "ガラス内の雪コード";

    const group =
      document.createElement(
        "div"
      );

    group.className =
      "wf-atmosphere-mode-group";

    Object
      .keys(MODES)
      .forEach(
        mode => {
          const button =
            document.createElement(
              "button"
            );

          button.type =
            "button";

          button.className =
            "wf-atmosphere-mode-btn";

          button.dataset.wfAtmosphereSet =
            mode;

          button.textContent =
            LABELS[mode];

          button.addEventListener(
            "click",
            () => {
              setMode(mode);
            }
          );

          group.appendChild(
            button
          );
        }
      );

    block.append(
      label,
      group
    );

    host.appendChild(
      block
    );

    updateControls(
      getMode()
    );
  };

  const observeApp = () => {
    const target =
      app();

    if (!target) {
      return;
    }

    const observer =
      new MutationObserver(
        mutations => {
          if (
            mutations.some(
              mutation =>
                mutation.attributeName ===
                  "data-theme" ||
                mutation.attributeName ===
                  "data-wf-quality"
            )
          ) {
            rebuild();
          }
        }
      );

    observer.observe(
      target,
      {
        attributes: true,
        attributeFilter: [
          "data-theme",
          "data-wf-quality"
        ]
      }
    );
  };

  const init = () => {
    const target =
      atmosphereHost();

    if (!target) {
      return;
    }

    if (
      !target.dataset.wfAtmosphere
    ) {
      target.dataset.wfAtmosphere =
        "normal";
    }

    getLayer();
    syncTheme();
    rebuild();
    buildLabControl();
    observeApp();

    window.addEventListener(
      "resize",
      () => {
        window.clearTimeout(
          resizeTimer
        );

        resizeTimer =
          window.setTimeout(
            rebuild,
            140
          );
      }
    );
  };

  window.KoppyWorldAtmosphere = {
    setMode,
    getMode,
    rebuild
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );
  } else {
    init();
  }
})();
