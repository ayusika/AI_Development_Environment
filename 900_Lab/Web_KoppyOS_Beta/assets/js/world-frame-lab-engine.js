(() => {
  "use strict";

  const STORAGE_KEY =
    "koppy.world-frame.lab.v1";

  const DEFAULTS = {
    seed: 4812,
    density: 1,
    quality: "balanced",
    readable: true
  };

  const $ = (
    selector,
    context = document
  ) =>
    context.querySelector(
      selector
    );

  const $$ = (
    selector,
    context = document
  ) =>
    Array.from(
      context.querySelectorAll(
        selector
      )
    );

  const app = () =>
    $("#wfApp");

  const shell = () =>
    $("[data-wf-shell]");

  const frameApi = () =>
    window.KoppyWorldFrame;

  let restoring =
    false;

  let saveTimer =
    null;

  const safeStorage = {
    get() {
      try {
        const raw =
          localStorage.getItem(
            STORAGE_KEY
          );

        return raw
          ? JSON.parse(raw)
          : null;
      } catch {
        return null;
      }
    },

    set(value) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(value)
        );
      } catch {
        // Storage may be blocked.
      }
    },

    remove() {
      try {
        localStorage.removeItem(
          STORAGE_KEY
        );
      } catch {
        // Storage may be blocked.
      }
    }
  };

  const activeValue = (
    selector,
    datasetKey
  ) => {
    const active =
      $(
        selector +
        ".is-active"
      );

    return active
      ? active.dataset[datasetKey]
      : null;
  };

  const getShellMode = () => {
    const element =
      shell();

    if (!element) {
      return "frost";
    }

    for (
      const mode of
      [
        "clear",
        "frost",
        "dense"
      ]
    ) {
      if (
        element.classList.contains(
          "wf-shell-mode-" +
          mode
        )
      ) {
        return mode;
      }
    }

    return (
      element.dataset.wfShellMode ||
      "frost"
    );
  };

  const collect = () => {
    const targetApp =
      app();

    const targetShell =
      shell();

    const frameState =
      frameApi()
        ?.getState
        ?.() ||
      DEFAULTS;

    const opacity =
      targetShell
        ? Number.parseFloat(
            targetShell.style.getPropertyValue(
              "--wf-shell-opacity"
            ) ||
            targetShell.dataset.wfShellOpacity ||
            "0.20"
          )
        : .20;

    const blur =
      targetShell
        ? Number.parseFloat(
            targetShell.style.getPropertyValue(
              "--wf-shell-blur"
            ) ||
            targetShell.dataset.wfShellBlur ||
            "16"
          )
        : 16;

    return {
      seed:
        frameState.seed,

      density:
        frameState.density,

      quality:
        frameState.quality,

      readable:
        frameState.readable,

      theme:
        targetApp?.dataset.theme ||
        "ice",

      motion:
        targetApp?.dataset.motion ||
        "rich",

      previewMode:
        targetApp?.dataset.mode ||
        "sample",

      pageProfile:
        activeValue(
          "[data-wf-profile]",
          "wfProfile"
        ),

      shellMode:
        getShellMode(),

      opacity,

      blur
    };
  };

  const flashSaved = (
    text = "保存済み"
  ) => {
    const label =
      $("[data-wf-engine-saved]");

    if (!label) {
      return;
    }

    label.textContent =
      text;

    window.setTimeout(
      () => {
        if (
          label.textContent ===
          text
        ) {
          label.textContent =
            "自動保存";
        }
      },
      900
    );
  };

  const save = () => {
    if (restoring) {
      return;
    }

    safeStorage.set(
      collect()
    );

    flashSaved();
  };

  const scheduleSave = () => {
    window.clearTimeout(
      saveTimer
    );

    saveTimer =
      window.setTimeout(
        save,
        80
      );
  };

  const clickByData = (
    selector,
    value
  ) => {
    const target =
      $$(
        selector
      ).find(
        button =>
          Object
            .values(
              button.dataset
            )
            .includes(
              String(value)
            )
      );

    target?.click();

    return target;
  };

  const updateReadableButton = (
    enabled
  ) => {
    const button =
      $(
        "[data-wf-engine-readable]"
      );

    if (!button) {
      return;
    }

    button.classList.toggle(
      "is-active",
      enabled
    );

    button.textContent =
      enabled
        ? "有効"
        : "無効";
  };

  const updateQualityButtons = (
    quality
  ) => {
    $$(
      "[data-wf-engine-quality]"
    ).forEach(
      button => {
        button.classList.toggle(
          "is-active",
          button.dataset.wfEngineQuality ===
            quality
        );
      }
    );
  };

  const applyScene = ({
    seed,
    density,
    quality,
    readable
  }) => {
    const seedInput =
      $(
        "[data-wf-engine-seed]"
      );

    const densityInput =
      $(
        "[data-wf-engine-density]"
      );

    const densityValue =
      $(
        "[data-wf-engine-density-value]"
      );

    if (seedInput) {
      seedInput.value =
        String(seed);
    }

    if (densityInput) {
      densityInput.value =
        String(
          Math.round(
            density *
            100
          )
        );
    }

    if (densityValue) {
      densityValue.textContent =
        Math.round(
          density *
          100
        ) + "%";
    }

    updateReadableButton(
      readable
    );

    updateQualityButtons(
      quality
    );

    frameApi()
      ?.configure
      ?.({
        seed,
        density,
        quality,
        readable
      });
  };

  const restoreShell = (
    state
  ) => {
    const shellMode =
      $(
        `.wf-shell-mode-btn[data-mode="${state.shellMode}"]`
      );

    shellMode?.click();

    const opacityInput =
      $(
        "[data-wf-shell-opacity]"
      );

    const blurInput =
      $(
        "[data-wf-shell-blur]"
      );

    if (opacityInput) {
      opacityInput.value =
        String(
          Math.round(
            state.opacity *
            100
          )
        );

      opacityInput.dispatchEvent(
        new Event(
          "input",
          {
            bubbles: true
          }
        )
      );
    }

    if (blurInput) {
      blurInput.value =
        String(state.blur);

      blurInput.dispatchEvent(
        new Event(
          "input",
          {
            bubbles: true
          }
        )
      );
    }

    shellMode
      ?.classList
      .add(
        "is-active"
      );
  };

  const restore = () => {
    const state =
      safeStorage.get();

    if (!state) {
      return;
    }

    restoring =
      true;

    if (
      state.pageProfile
    ) {
      clickByData(
        "[data-wf-profile]",
        state.pageProfile
      );
    }

    if (
      state.theme
    ) {
      clickByData(
        "[data-theme-set]",
        state.theme
      );
    }

    if (
      state.motion
    ) {
      clickByData(
        "[data-motion-set]",
        state.motion
      );
    }

    if (
      state.previewMode
    ) {
      clickByData(
        "[data-mode-set]",
        state.previewMode
      );
    }

    restoreShell(
      state
    );

    applyScene({
      seed:
        state.seed ??
        DEFAULTS.seed,

      density:
        state.density ??
        DEFAULTS.density,

      quality:
        state.quality ??
        DEFAULTS.quality,

      readable:
        state.readable ??
        DEFAULTS.readable
    });

    restoring =
      false;

    flashSaved(
      "復元済み"
    );
  };

  const randomSeed = () => {
    if (
      window.crypto
        ?.getRandomValues
    ) {
      const values =
        new Uint32Array(1);

      window.crypto.getRandomValues(
        values
      );

      return (
        values[0] %
        999999
      ) + 1;
    }

    return (
      Date.now() %
      999999
    ) + 1;
  };

  const buildControls = () => {
    if (
      document.body.dataset.worldFrameLab !==
      "true"
    ) {
      return;
    }

    const host =
      $(".wf-shell-controls");

    if (!host) {
      window.setTimeout(
        buildControls,
        30
      );

      return;
    }

    if (
      $(
        "[data-wf-engine-controls]"
      )
    ) {
      return;
    }

    const block =
      document.createElement(
        "div"
      );

    block.className =
      "wf-engine-controls";

    block.dataset.wfEngineControls =
      "";

    block.innerHTML = `
      <div class="wf-engine-control">
        <label>背景の配置パターン</label>

        <div class="wf-engine-inline">
          <input
            class="wf-engine-input"
            type="number"
            min="1"
            max="4294967295"
            value="4812"
            data-wf-engine-seed
          >

          <button
            type="button"
            class="wf-engine-btn"
            data-wf-engine-reroll
          >
            別パターン
          </button>
        </div>
      </div>

      <div class="wf-engine-control">
        <label>背景の量</label>

        <div class="wf-engine-inline">
          <input
            type="range"
            min="45"
            max="145"
            step="5"
            value="100"
            data-wf-engine-density
          >

          <span
            class="wf-engine-value"
            data-wf-engine-density-value
          >
            100%
          </span>
        </div>
      </div>

      <div class="wf-engine-control">
        <label>文字まわりを見やすく</label>

        <button
          type="button"
          class="wf-engine-btn wf-engine-readable is-active"
          data-wf-engine-readable
        >
          有効
        </button>
      </div>

      <div class="wf-engine-control">
        <label>描画品質</label>

        <div class="wf-engine-quality">
          <button
            type="button"
            class="wf-engine-btn"
            data-wf-engine-quality="high"
          >
            高品質
          </button>

          <button
            type="button"
            class="wf-engine-btn is-active"
            data-wf-engine-quality="balanced"
          >
            標準
          </button>

          <button
            type="button"
            class="wf-engine-btn"
            data-wf-engine-quality="light"
          >
            軽量
          </button>
        </div>
      </div>

      <div class="wf-engine-state">
        <span
          class="wf-engine-saved"
          data-wf-engine-saved
        >
          自動保存
        </span>

        <button
          type="button"
          class="wf-engine-btn"
          data-wf-engine-reset
        >
          初期化
        </button>
      </div>
    `;

    host.appendChild(
      block
    );

    const seedInput =
      $(
        "[data-wf-engine-seed]"
      );

    const densityInput =
      $(
        "[data-wf-engine-density]"
      );

    const densityValue =
      $(
        "[data-wf-engine-density-value]"
      );

    seedInput.addEventListener(
      "change",
      () => {
        frameApi()
          ?.setSeed
          ?.(
            seedInput.value
          );

        scheduleSave();
      }
    );

    $(
      "[data-wf-engine-reroll]"
    ).addEventListener(
      "click",
      () => {
        const seed =
          randomSeed();

        seedInput.value =
          String(seed);

        frameApi()
          ?.setSeed
          ?.(seed);

        scheduleSave();
      }
    );

    densityInput.addEventListener(
      "input",
      () => {
        const density =
          Number(
            densityInput.value
          ) / 100;

        densityValue.textContent =
          densityInput.value +
          "%";

        frameApi()
          ?.setDensity
          ?.(density);

        scheduleSave();
      }
    );

    $(
      "[data-wf-engine-readable]"
    ).addEventListener(
      "click",
      event => {
        const enabled =
          !event
            .currentTarget
            .classList
            .contains(
              "is-active"
            );

        frameApi()
          ?.setReadable
          ?.(enabled);

        updateReadableButton(
          enabled
        );

        scheduleSave();
      }
    );

    $$(
      "[data-wf-engine-quality]"
    ).forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            const quality =
              button.dataset
                .wfEngineQuality;

            updateQualityButtons(
              quality
            );

            frameApi()
              ?.setQuality
              ?.(quality);

            scheduleSave();
          }
        );
      }
    );

    $(
      "[data-wf-engine-reset]"
    ).addEventListener(
      "click",
      () => {
        safeStorage.remove();

        flashSaved(
          "初期化"
        );

        window.setTimeout(
          () => {
            window.location.reload();
          },
          180
        );
      }
    );

    document.addEventListener(
      "input",
      event => {
        if (
          event.target.matches(
            "[data-wf-shell-opacity], [data-wf-shell-blur]"
          )
        ) {
          scheduleSave();
        }
      }
    );

    document.addEventListener(
      "click",
      event => {
        if (
          event.target.closest(
            "[data-theme-set], [data-motion-set], [data-mode-set], [data-wf-profile], .wf-shell-mode-btn"
          )
        ) {
          scheduleSave();
        }
      }
    );

    window.setTimeout(
      restore,
      20
    );
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      buildControls,
      {
        once: true
      }
    );
  } else {
    buildControls();
  }
})();
