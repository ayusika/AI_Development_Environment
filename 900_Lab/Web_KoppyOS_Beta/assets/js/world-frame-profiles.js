(() => {
  "use strict";

  const PROFILES = {
    world: {
      label: "WORLD",
      theme: "ice",
      motion: "rich",
      shellMode: "frost",
      opacity: 0.20,
      blur: 16,
      seed: 4812,
      density: 1.00,
      quality: "balanced",
      readable: true,
      atmosphere: "normal"
    },

    work: {
      label: "WORK",
      theme: "electric",
      motion: "normal",
      shellMode: "dense",
      opacity: 0.28,
      blur: 22,
      seed: 7301,
      density: 0.78,
      quality: "balanced",
      readable: true,
      atmosphere: "subtle"
    },

    home: {
      label: "HOME",
      theme: "aqua",
      motion: "calm",
      shellMode: "clear",
      opacity: 0.14,
      blur: 10,
      seed: 2190,
      density: 1.08,
      quality: "high",
      readable: false,
      atmosphere: "rich"
    },

    brain: {
      label: "BRAIN",
      theme: "violet",
      motion: "normal",
      shellMode: "frost",
      opacity: 0.22,
      blur: 18,
      seed: 8821,
      density: 0.90,
      quality: "balanced",
      readable: true,
      atmosphere: "subtle"
    },

    koppy: {
      label: "KOPPY",
      theme: "pink",
      motion: "calm",
      shellMode: "clear",
      opacity: 0.16,
      blur: 12,
      seed: 5427,
      density: 1.02,
      quality: "high",
      readable: false,
      atmosphere: "normal"
    },

    tools: {
      label: "TOOLS",
      theme: "electric",
      motion: "rich",
      shellMode: "frost",
      opacity: 0.24,
      blur: 16,
      seed: 3141,
      density: 0.86,
      quality: "balanced",
      readable: true,
      atmosphere: "subtle"
    }
  };

  const MODES = [
    "clear",
    "frost",
    "dense"
  ];

  const clamp = (
    value,
    min,
    max
  ) => Math.max(
    min,
    Math.min(
      max,
      Number(value)
    )
  );

  const getApp = () =>
    document.querySelector(
      "#wfApp"
    );

  const getShell = () =>
    document.querySelector(
      "[data-wf-shell]"
    ) ||
    document.querySelector(
      ".wf-shell-surface"
    );

  const getAtmosphereHost = () =>
    document.querySelector(
      "[data-wf-atmosphere-host]"
    ) ||
    getShell();

  const updateShellControls = (
    opacity,
    blur,
    mode
  ) => {
    const opacityInput =
      document.querySelector(
        "[data-wf-shell-opacity]"
      );

    const blurInput =
      document.querySelector(
        "[data-wf-shell-blur]"
      );

    const opacityValue =
      document.querySelector(
        ".wf-shell-opacity-value"
      );

    const blurValue =
      document.querySelector(
        ".wf-shell-blur-value"
      );

    if (opacityInput) {
      opacityInput.value =
        String(
          Math.round(
            opacity * 100
          )
        );
    }

    if (blurInput) {
      blurInput.value =
        String(blur);
    }

    if (opacityValue) {
      opacityValue.textContent =
        Math.round(
          opacity * 100
        ) + "%";
    }

    if (blurValue) {
      blurValue.textContent =
        blur + "px";
    }

    document
      .querySelectorAll(
        ".wf-shell-mode-btn"
      )
      .forEach(button => {
        button.classList.toggle(
          "is-active",
          button.dataset.mode === mode
        );
      });
  };

  const apply = (name) => {
    const profile =
      PROFILES[name];

    if (!profile) {
      return;
    }

    const app =
      getApp();

    const shell =
      getShell();

    const atmosphereHost =
      getAtmosphereHost();

    /*
       Profile/theme configuration belongs to #wfApp.

       A glass shell is optional so App Mode can use the
       World Frame theme without surrendering application
       layout ownership.
    */

    if (!app) {
      return;
    }

    /*
       Reuse the existing Lab controls when available,
       so world-frame.js can rebuild motion density too.
    */

    const themeButton =
      document.querySelector(
        `[data-theme-set="${profile.theme}"]`
      );

    const motionButton =
      document.querySelector(
        `[data-motion-set="${profile.motion}"]`
      );

    if (themeButton) {
      themeButton.click();
    } else {
      app.dataset.theme =
        profile.theme;
    }

    if (motionButton) {
      motionButton.click();
    } else {
      app.dataset.motion =
        profile.motion;
    }

    app.dataset.wfPage =
      name;

    const atmosphere =
      profile.atmosphere ||
      "normal";

    if (atmosphereHost) {
      atmosphereHost.dataset.wfAtmosphere =
        atmosphere;

      window
        .KoppyWorldAtmosphere
        ?.setMode
        ?.(
          atmosphere,
          {
            silent: true
          }
        );
    }

    if (
      window
        .KoppyWorldFrame
        ?.configure
    ) {
      window
        .KoppyWorldFrame
        .configure({
          seed:
            profile.seed,

          density:
            profile.density,

          quality:
            profile.quality,

          readable:
            profile.readable
        });
    } else {
      app.dataset.wfSeed =
        String(profile.seed);

      app.dataset.wfDensity =
        String(profile.density);

      app.dataset.wfQuality =
        profile.quality;

      app.dataset.wfReadableZone =
        profile.readable
          ? "on"
          : "off";
    }

    /*
       Shell styling is applied only when the page explicitly
       has a World Frame shell.
    */

    if (shell) {
      MODES.forEach(mode => {
        shell.classList.remove(
          "wf-shell-mode-" + mode
        );
      });

      shell.classList.add(
        "wf-shell-mode-" +
        profile.shellMode
      );

      const opacity =
        clamp(
          profile.opacity,
          0,
          0.55
        );

      const blur =
        clamp(
          profile.blur,
          0,
          40
        );

      shell.style.setProperty(
        "--wf-shell-opacity",
        String(opacity)
      );

      shell.style.setProperty(
        "--wf-shell-blur",
        blur + "px"
      );

      shell.dataset.wfShellMode =
        profile.shellMode;

      shell.dataset.wfShellOpacity =
        String(opacity);

      shell.dataset.wfShellBlur =
        String(blur);

      updateShellControls(
        opacity,
        blur,
        profile.shellMode
      );
    }

    document
      .querySelectorAll(
        "[data-wf-profile]"
      )
      .forEach(button => {
        button.classList.toggle(
          "is-active",
          button.dataset.wfProfile === name
        );
      });
  };

  const buildLabControls = () => {
    if (
      document.body.dataset.worldFrameLab !== "true"
    ) {
      return;
    }

    const controls =
      document.querySelector(
        ".wf-shell-controls"
      );

    if (
      !controls ||
      controls.querySelector(
        "[data-wf-profile]"
      )
    ) {
      return;
    }

    const block =
      document.createElement(
        "div"
      );

    block.className =
      "wf-shell-control wf-shell-profile-control";

    const label =
      document.createElement(
        "label"
      );

    label.textContent =
      "ページ用プリセット";

    const group =
      document.createElement(
        "div"
      );

    group.className =
      "wf-shell-profile-group";

    Object
      .entries(PROFILES)
      .forEach(
        ([name, profile]) => {
          const button =
            document.createElement(
              "button"
            );

          button.type =
            "button";

          button.className =
            "wf-shell-profile-btn";

          button.dataset.wfProfile =
            name;

          button.textContent =
            profile.label;

          button.addEventListener(
            "click",
            () => {
              apply(name);
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

    controls.appendChild(
      block
    );

    apply("world");
  };

  window.KoppyWorldProfiles = {
    profiles: PROFILES,
    apply
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      buildLabControls,
      {
        once: true
      }
    );
  } else {
    buildLabControls();
  }
})();
