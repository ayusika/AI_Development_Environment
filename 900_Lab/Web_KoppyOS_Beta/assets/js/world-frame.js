(() => {
  "use strict";

  const root = document.querySelector("[data-koppy-world-frame]");

  if (!root) {
    return;
  }

  const STREAM_COUNT = 44;
  const LOG_COUNT = 14;

  const angles = [
    -90,
    -72,
    -58,
    -44,
    -30,
    -16,
    -7,
    0,
    8,
    17,
    31,
    46,
    59,
    73,
    90
  ];

  const logAngles = [
    -90,
    -24,
    -13,
    -6,
    0,
    0,
    0,
    7,
    14,
    25,
    90
  ];

  const logMessages = [
    ["WORLD_LAYER / 07", "ICE_NETWORK :: ONLINE"],
    ["KOPPY_LINK :: ACTIVE", "SIGNAL :: STABLE"],
    ["MEMORY_CORE :: SYNC", "ARCHIVE :: READY"],
    ["PRIVATE_OS :: READY", "ACCESS :: LOCAL"],
    ["NODE_MAP :: 05", "ROUTE :: OPEN"],
    ["HOME_LINK :: STABLE", "DEVICE_MAP :: READY"],
    ["DEVELOPMENT_NODE", "BUILD_CHANNEL :: OPEN"],
    ["WORLD_FRAME :: ACTIVE", "DEPTH_MAP :: ONLINE"],
    ["BINARY_FIELD :: SYNC", "FLOW :: NOMINAL"],
    ["ICE_LAYER :: 01", "THERMAL :: STABLE"],
    ["GITHUB_BRAIN", "MEMORY_ROUTE :: OPEN"],
    ["KOPPY_WORLD", "PRIVATE_LINK :: ACTIVE"]
  ];

  const streamsLayer = document.createElement("div");
  streamsLayer.className = "kw-world-frame__streams";

  const logsLayer = document.createElement("div");
  logsLayer.className = "kw-world-frame__logs";

  const vignette = document.createElement("div");
  vignette.className = "kw-world-frame__vignette";

  root.replaceChildren(
    streamsLayer,
    logsLayer,
    vignette
  );

  const random = (min, max) =>
    min + Math.random() * (max - min);

  const pick = (items) =>
    items[
      Math.floor(
        Math.random() * items.length
      )
    ];

  const binary = (length) => {
    let result = "";

    for (let index = 0; index < length; index += 1) {
      result += Math.random() > 0.5 ? "1" : "0";

      if (
        index > 0 &&
        index % 8 === 7
      ) {
        result += " ";
      }
    }

    return result.trim();
  };

  const depthProfile = () => {
    const roll = Math.random();

    if (roll < 0.43) {
      return {
        name: "far",
        size: random(7, 9.2),
        opacity: random(0.07, 0.16),
        blur: random(0.45, 1.0),
        glow: random(4, 7),
        width: random(30, 52)
      };
    }

    if (roll < 0.79) {
      return {
        name: "mid",
        size: random(9, 12),
        opacity: random(0.13, 0.25),
        blur: random(0.10, 0.48),
        glow: random(6, 11),
        width: random(35, 62)
      };
    }

    return {
      name: "near",
      size: random(11.5, 15),
      opacity: random(0.18, 0.32),
      blur: random(0, 0.20),
      glow: random(8, 15),
      width: random(40, 70)
    };
  };

  const streamColor = () => {
    const roll = Math.random();

    if (roll < 0.65) {
      return "132, 216, 255";
    }

    if (roll < 0.88) {
      return "105, 177, 255";
    }

    return "171, 169, 255";
  };

  for (
    let index = 0;
    index < STREAM_COUNT;
    index += 1
  ) {
    const depth = depthProfile();

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "kw-world-frame__stream";

    wrapper.dataset.depth =
      depth.name;

    const angle =
      pick(angles) +
      random(-4.2, 4.2);

    const reverse =
      Math.random() > 0.5;

    const duration =
      random(26, 78);

    wrapper.style.setProperty(
      "--x",
      `${random(-3, 103).toFixed(2)}%`
    );

    wrapper.style.setProperty(
      "--y",
      `${random(-3, 103).toFixed(2)}%`
    );

    wrapper.style.setProperty(
      "--angle",
      `${angle.toFixed(2)}deg`
    );

    wrapper.style.setProperty(
      "--width",
      `${depth.width.toFixed(2)}vw`
    );

    wrapper.style.setProperty(
      "--size",
      `${depth.size.toFixed(2)}px`
    );

    wrapper.style.setProperty(
      "--opacity",
      depth.opacity.toFixed(3)
    );

    wrapper.style.setProperty(
      "--blur",
      `${depth.blur.toFixed(2)}px`
    );

    wrapper.style.setProperty(
      "--glow",
      `${depth.glow.toFixed(2)}px`
    );

    wrapper.style.setProperty(
      "--spacing",
      `${random(0.17, 0.40).toFixed(3)}em`
    );

    wrapper.style.setProperty(
      "--stream-rgb",
      streamColor()
    );

    wrapper.style.setProperty(
      "--duration",
      `${duration.toFixed(2)}s`
    );

    wrapper.style.setProperty(
      "--delay",
      `${(-random(0, duration)).toFixed(2)}s`
    );

    wrapper.style.setProperty(
      "--start",
      reverse ? "-18vw" : "18vw"
    );

    wrapper.style.setProperty(
      "--end",
      reverse ? "18vw" : "-18vw"
    );

    const track =
      document.createElement("span");

    track.className =
      "kw-world-frame__stream-track";

    const code = binary(
      Math.floor(
        random(34, 82)
      )
    );

    track.textContent =
      `${code}     ${code}`;

    wrapper.appendChild(track);
    streamsLayer.appendChild(wrapper);
  }

  for (
    let index = 0;
    index < LOG_COUNT;
    index += 1
  ) {
    const log =
      document.createElement("div");

    log.className =
      "kw-world-frame__log";

    const message =
      pick(logMessages);

    const rgb =
      Math.random() > 0.82
        ? "171, 169, 255"
        : "132, 216, 255";

    const duration =
      random(12, 28);

    log.style.setProperty(
      "--x",
      `${random(3, 97).toFixed(2)}%`
    );

    log.style.setProperty(
      "--y",
      `${random(4, 96).toFixed(2)}%`
    );

    log.style.setProperty(
      "--angle",
      `${(
        pick(logAngles) +
        random(-3, 3)
      ).toFixed(2)}deg`
    );

    log.style.setProperty(
      "--size",
      `${random(6.5, 9.2).toFixed(2)}px`
    );

    log.style.setProperty(
      "--opacity",
      random(0.20, 0.46).toFixed(3)
    );

    log.style.setProperty(
      "--blur",
      `${random(0, 0.45).toFixed(2)}px`
    );

    log.style.setProperty(
      "--rule",
      `${random(22, 58).toFixed(1)}px`
    );

    log.style.setProperty(
      "--log-rgb",
      rgb
    );

    log.style.setProperty(
      "--dx",
      `${random(-18, 18).toFixed(1)}px`
    );

    log.style.setProperty(
      "--dy",
      `${random(-14, 14).toFixed(1)}px`
    );

    log.style.setProperty(
      "--duration",
      `${duration.toFixed(2)}s`
    );

    log.style.setProperty(
      "--delay",
      `${(-random(0, duration)).toFixed(2)}s`
    );

    message.forEach((text) => {
      const row =
        document.createElement("span");

      row.textContent = text;

      log.appendChild(row);
    });

    logsLayer.appendChild(log);
  }
})();
