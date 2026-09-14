(() => {
  "use strict";

  const POSITION_KEY =
    "koppy.world-frame.refresh.position.v1";

  const RESTORE_KEY =
    "koppy.world-frame.refresh.restore.v1";

  const EDGE = 12;
  const DRAG_THRESHOLD = 6;
  const RESTORE_MAX_AGE = 15000;

  let button = null;
  let drag = null;
  let suppressClick = false;
  let busy = false;

  /* -------------------------------------------------------
     STORAGE
  ------------------------------------------------------- */

  const storageGet = (
    storage,
    key
  ) => {
    try {
      const raw =
        storage.getItem(key);

      return raw
        ? JSON.parse(raw)
        : null;
    } catch {
      return null;
    }
  };

  const storageSet = (
    storage,
    key,
    value
  ) => {
    try {
      storage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch {
      // Storage may be blocked.
    }
  };

  const storageRemove = (
    storage,
    key
  ) => {
    try {
      storage.removeItem(key);
    } catch {
      // Storage may be blocked.
    }
  };

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

  /* -------------------------------------------------------
     VIEWPORT / DRAG POSITION
  ------------------------------------------------------- */

  const viewport = () => {
    const vv =
      window.visualViewport;

    return {
      left:
        vv?.offsetLeft || 0,

      top:
        vv?.offsetTop || 0,

      width:
        vv?.width ||
        window.innerWidth,

      height:
        vv?.height ||
        window.innerHeight
    };
  };

  const bounds = () => {
    const rect =
      button.getBoundingClientRect();

    const view =
      viewport();

    const minX =
      view.left + EDGE;

    const minY =
      view.top + EDGE;

    const maxX =
      Math.max(
        minX,
        view.left +
        view.width -
        rect.width -
        EDGE
      );

    const maxY =
      Math.max(
        minY,
        view.top +
        view.height -
        rect.height -
        EDGE
      );

    return {
      minX,
      minY,
      maxX,
      maxY
    };
  };

  const place = (
    left,
    top
  ) => {
    const limit =
      bounds();

    button.style.left =
      clamp(
        left,
        limit.minX,
        limit.maxX
      ) + "px";

    button.style.top =
      clamp(
        top,
        limit.minY,
        limit.maxY
      ) + "px";

    button.style.right =
      "auto";

    button.style.bottom =
      "auto";
  };

  const savePosition = () => {
    const rect =
      button.getBoundingClientRect();

    const limit =
      bounds();

    const spanX =
      Math.max(
        1,
        limit.maxX -
        limit.minX
      );

    const spanY =
      Math.max(
        1,
        limit.maxY -
        limit.minY
      );

    storageSet(
      localStorage,
      POSITION_KEY,
      {
        x:
          clamp(
            (
              rect.left -
              limit.minX
            ) /
            spanX,
            0,
            1
          ),

        y:
          clamp(
            (
              rect.top -
              limit.minY
            ) /
            spanY,
            0,
            1
          )
      }
    );
  };

  const restorePosition = () => {
    const saved =
      storageGet(
        localStorage,
        POSITION_KEY
      );

    if (!saved) {
      return;
    }

    const limit =
      bounds();

    place(
      limit.minX +
      (
        limit.maxX -
        limit.minX
      ) *
      clamp(
        Number(saved.x) || 0,
        0,
        1
      ),

      limit.minY +
      (
        limit.maxY -
        limit.minY
      ) *
      clamp(
        Number(saved.y) || 0,
        0,
        1
      )
    );
  };

  /* -------------------------------------------------------
     SAME-SCREEN RESTORE
  ------------------------------------------------------- */

  const saveCurrentView = () => {
    storageSet(
      sessionStorage,
      RESTORE_KEY,
      {
        href:
          window.location.href,

        x:
          window.scrollX,

        y:
          window.scrollY,

        time:
          Date.now()
      }
    );
  };

  const restoreCurrentView = () => {
    const saved =
      storageGet(
        sessionStorage,
        RESTORE_KEY
      );

    storageRemove(
      sessionStorage,
      RESTORE_KEY
    );

    if (
      !saved ||
      saved.href !==
        window.location.href ||
      Date.now() -
        Number(saved.time || 0) >
        RESTORE_MAX_AGE
    ) {
      return;
    }

    const restore = () => {
      window.scrollTo(
        Number(saved.x) || 0,
        Number(saved.y) || 0
      );
    };

    requestAnimationFrame(
      () => {
        requestAnimationFrame(
          restore
        );
      }
    );

    window.setTimeout(
      restore,
      180
    );

    window.setTimeout(
      restore,
      600
    );
  };

  /* -------------------------------------------------------
     HARD-RELOAD-LIKE REFRESH

     Browser JavaScript cannot invoke the browser's native
     Cmd+Shift+R operation directly.

     Instead:
     1. Revalidate current same-origin static resources
        with cache:"reload".
     2. Reload the exact current URL.
  ------------------------------------------------------- */

  const collectReloadTargets = () => {
    const urls =
      new Set();

    const add = (
      value
    ) => {
      if (!value) {
        return;
      }

      try {
        const url =
          new URL(
            value,
            window.location.href
          );

        if (
          url.origin !==
          window.location.origin
        ) {
          return;
        }

        if (
          url.protocol !== "http:" &&
          url.protocol !== "https:"
        ) {
          return;
        }

        url.hash = "";

        urls.add(
          url.href
        );
      } catch {
        // Ignore invalid URLs.
      }
    };

    add(
      window.location.href
    );

    document
      .querySelectorAll(
        [
          'link[rel="stylesheet"][href]',
          'link[rel="preload"][href]',
          'script[src]',
          'img[src]',
          'source[src]'
        ].join(",")
      )
      .forEach(
        element => {
          add(
            element.href ||
            element.src
          );
        }
      );

    return [
      ...urls
    ];
  };

  const revalidateResources = async () => {
    const targets =
      collectReloadTargets();

    const controller =
      new AbortController();

    const timeout =
      window.setTimeout(
        () => {
          controller.abort();
        },
        3500
      );

    try {
      await Promise.allSettled(
        targets.map(
          url =>
            fetch(
              url,
              {
                method: "GET",
                cache: "reload",
                credentials: "same-origin",
                redirect: "follow",
                signal:
                  controller.signal
              }
            )
        )
      );
    } finally {
      window.clearTimeout(
        timeout
      );
    }
  };

  const hardRefresh = async () => {
    if (busy) {
      return;
    }

    busy = true;

    button.classList.add(
      "is-refreshing"
    );

    button.setAttribute(
      "aria-busy",
      "true"
    );

    button.setAttribute(
      "aria-label",
      "強制更新中"
    );

    saveCurrentView();

    try {
      await revalidateResources();
    } catch {
      // Reload anyway.
    }

    /*
       location.reload() preserves:
       - pathname
       - query string
       - hash

       It does not redirect to Home.
    */

    window.location.reload();
  };

  /* -------------------------------------------------------
     THEME ACCENT
  ------------------------------------------------------- */

  const syncAccent = () => {
    if (!button) {
      return;
    }

    const app =
      document.querySelector(
        "#wfApp"
      );

    if (!app) {
      return;
    }

    const accent =
      getComputedStyle(app)
        .getPropertyValue(
          "--wf-accent"
        )
        .trim();

    if (accent) {
      button.style.setProperty(
        "--wf-refresh-accent",
        accent
      );
    }
  };

  const watchTheme = () => {
    const app =
      document.querySelector(
        "#wfApp"
      );

    if (!app) {
      return;
    }

    const observer =
      new MutationObserver(
        syncAccent
      );

    observer.observe(
      app,
      {
        attributes: true,
        attributeFilter: [
          "data-theme"
        ]
      }
    );
  };

  /* -------------------------------------------------------
     DRAG
  ------------------------------------------------------- */

  const pointerDown = (
    event
  ) => {
    if (
      event.pointerType ===
        "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    const rect =
      button.getBoundingClientRect();

    drag = {
      pointerId:
        event.pointerId,

      startX:
        event.clientX,

      startY:
        event.clientY,

      startLeft:
        rect.left,

      startTop:
        rect.top,

      moved:
        false
    };

    suppressClick =
      false;

    button.setPointerCapture?.(
      event.pointerId
    );

    button.classList.add(
      "is-dragging"
    );
  };

  const pointerMove = (
    event
  ) => {
    if (
      !drag ||
      event.pointerId !==
        drag.pointerId
    ) {
      return;
    }

    const dx =
      event.clientX -
      drag.startX;

    const dy =
      event.clientY -
      drag.startY;

    if (
      !drag.moved &&
      Math.hypot(
        dx,
        dy
      ) <
        DRAG_THRESHOLD
    ) {
      return;
    }

    drag.moved =
      true;

    suppressClick =
      true;

    event.preventDefault();

    place(
      drag.startLeft + dx,
      drag.startTop + dy
    );
  };

  const finishDrag = (
    event
  ) => {
    if (
      !drag ||
      event.pointerId !==
        drag.pointerId
    ) {
      return;
    }

    if (drag.moved) {
      savePosition();
    }

    try {
      button.releasePointerCapture?.(
        event.pointerId
      );
    } catch {
      // Capture may already be released.
    }

    drag =
      null;

    button.classList.remove(
      "is-dragging"
    );
  };

  /* -------------------------------------------------------
     CREATE
  ------------------------------------------------------- */

  const createButton = () => {
    if (
      document.body.dataset
        .wfRefresh ===
      "off"
    ) {
      return;
    }

    if (
      document.querySelector(
        "[data-wf-refresh]"
      )
    ) {
      return;
    }

    button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      "wf-refresh-control";

    button.dataset.wfRefresh =
      "";

    button.setAttribute(
      "aria-label",
      "この画面を強制更新"
    );

    button.setAttribute(
      "title",
      "強制更新 / ドラッグで移動"
    );

    const icon =
      document.createElement(
        "span"
      );

    icon.className =
      "wf-refresh-control__icon";

    icon.setAttribute(
      "aria-hidden",
      "true"
    );

    icon.textContent =
      "↻";

    button.appendChild(
      icon
    );

    document.body.appendChild(
      button
    );

    button.addEventListener(
      "pointerdown",
      pointerDown
    );

    button.addEventListener(
      "pointermove",
      pointerMove
    );

    button.addEventListener(
      "pointerup",
      finishDrag
    );

    button.addEventListener(
      "pointercancel",
      finishDrag
    );

    button.addEventListener(
      "click",
      event => {
        if (suppressClick) {
          suppressClick =
            false;

          event.preventDefault();

          return;
        }

        hardRefresh();
      }
    );

    requestAnimationFrame(
      () => {
        restorePosition();
        syncAccent();
      }
    );

    watchTheme();

    const reflow = () => {
      restorePosition();
    };

    window.addEventListener(
      "resize",
      reflow
    );

    window.addEventListener(
      "orientationchange",
      reflow
    );

    window.visualViewport
      ?.addEventListener(
        "resize",
        reflow
      );

    restoreCurrentView();
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      createButton,
      {
        once: true
      }
    );
  } else {
    createButton();
  }
})();
