(() => {
  "use strict";

  const DESKTOP_MEDIA = window.matchMedia(
    "(min-width:721px) and (pointer:fine) and (hover:hover)"
  );

  const SOURCE_SELECTOR =
    'input[type="date"], input[type="time"]';

  const TIME_SELECTOR =
    'input[type="time"]';

  const TIME_STEP_SECONDS = 300;

  const WHEEL_ITEM_HEIGHT = 52;

  let activePanel = null;
  let activeProxy = null;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function isDesktop() {
    return DESKTOP_MEDIA.matches;
  }

  function applyTimeStep(root) {
    const apply = (input) => {
      if (
        !(input instanceof HTMLInputElement)
        || !input.matches(TIME_SELECTOR)
      ) {
        return;
      }

      if (
        input.step
        !== String(TIME_STEP_SECONDS)
      ) {
        input.step =
          String(TIME_STEP_SECONDS);
      }
    };

    if (
      root instanceof HTMLInputElement
      && root.matches(TIME_SELECTOR)
    ) {
      apply(root);
    }

    if (
      root instanceof Element
      || root instanceof Document
    ) {
      root
        .querySelectorAll(
          TIME_SELECTOR
        )
        .forEach(
          apply
        );
    }
  }

  function snapTimeToFive(
    hour,
    minute
  ) {
    const total =
      Number(hour) * 60
      + Number(minute);

    const snapped =
      Math.max(
        0,
        Math.min(
          23 * 60 + 55,
          Math.round(
            total / 5
          ) * 5
        )
      );

    return {
      hour:
        Math.floor(
          snapped / 60
        ),

      minute:
        snapped % 60,
    };
  }

  function dateToIso(date) {
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ].join("-");
  }

  function parseIsoDate(value) {
    const match = String(value || "").match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);

    const date = new Date(
      year,
      month,
      day
    );

    if (
      date.getFullYear() !== year
      || date.getMonth() !== month
      || date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  function formatProxyValue(input) {
    const value = String(
      input.value || ""
    );

    if (!value) {
      return input.dataset.kdpType === "date"
        ? "日付を選択"
        : "時間を選択";
    }

    if (
      input.dataset.kdpType === "date"
      && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      return value.replaceAll("-", "/");
    }

    if (
      input.dataset.kdpType === "time"
      && /^\d{2}:\d{2}/.test(value)
    ) {
      return value.slice(0, 5);
    }

    return value;
  }

  function proxyLabel(input) {
    const explicit =
      input.getAttribute("aria-label");

    if (explicit) {
      return explicit;
    }

    const host = input.parentElement;

    if (host) {
      const span =
        host.querySelector(":scope > span");

      if (span?.textContent?.trim()) {
        return span.textContent.trim();
      }

      const text = Array
        .from(host.childNodes)
        .filter(
          (node) =>
            node.nodeType
            === Node.TEXT_NODE
        )
        .map(
          (node) =>
            node.textContent.trim()
        )
        .filter(Boolean)
        .join(" ");

      if (text) {
        return text;
      }
    }

    return input.dataset.kdpType === "date"
      ? "日付を選択"
      : "時間を選択";
  }

  function closePicker() {
    if (activePanel) {
      activePanel.remove();
    }

    activePanel = null;
    activeProxy = null;
  }

  function positionPanel(
    panel,
    proxy
  ) {
    panel.style.visibility =
      "hidden";

    panel.style.left = "12px";
    panel.style.top = "12px";

    const proxyRect =
      proxy.getBoundingClientRect();

    const panelRect =
      panel.getBoundingClientRect();

    const margin = 12;

    let left =
      proxyRect.left
      + proxyRect.width / 2
      - panelRect.width / 2;

    left = Math.max(
      margin,
      Math.min(
        left,
        window.innerWidth
        - panelRect.width
        - margin
      )
    );

    let top =
      proxyRect.bottom + 10;

    if (
      top + panelRect.height
      > window.innerHeight - margin
    ) {
      const above =
        proxyRect.top
        - panelRect.height
        - 10;

      top =
        above >= margin
          ? above
          : margin;
    }

    panel.style.left =
      `${Math.round(left)}px`;

    panel.style.top =
      `${Math.round(top)}px`;

    panel.style.visibility = "";
  }

  function syncProxyStyle(
    input,
    proxy
  ) {
    const style =
      getComputedStyle(input);

    const rect =
      input.getBoundingClientRect();

    const height =
      Math.max(
        36,
        rect.height
        || parseFloat(style.height)
        || 40
      );

    proxy.style.setProperty(
      "--kdp-source-height",
      `${height}px`
    );

    proxy.style.setProperty(
      "--kdp-padding-left",
      style.paddingLeft
    );

    proxy.style.setProperty(
      "--kdp-padding-right",
      style.paddingRight
    );

    proxy.style.setProperty(
      "--kdp-border",
      style.border
    );

    proxy.style.setProperty(
      "--kdp-radius",
      style.borderRadius
    );

    proxy.style.setProperty(
      "--kdp-color",
      style.color
    );

    proxy.style.setProperty(
      "--kdp-background",
      style.background
    );

    proxy.style.setProperty(
      "--kdp-font-size",
      style.fontSize
    );

    proxy.style.setProperty(
      "--kdp-font-weight",
      style.fontWeight
    );
  }

  function syncProxy(input) {
    const proxy =
      input._kdpProxy;

    if (!proxy) {
      return;
    }

    const value =
      proxy.querySelector(
        ".kdp-proxy-value"
      );

    if (value) {
      const nextValue =
        formatProxyValue(input);

      if (
        value.textContent
        !== nextValue
      ) {
        value.textContent =
          nextValue;
      }
    }

    syncProxyStyle(
      input,
      proxy
    );
  }

  function commitValue(
    input,
    value
  ) {
    if (
      String(input.value || "")
      === String(value || "")
    ) {
      syncProxy(input);
      return;
    }

    input.value = value;

    syncProxy(input);

    input.dispatchEvent(
      new Event(
        "input",
        {
          bubbles: true,
        }
      )
    );

    input.dispatchEvent(
      new Event(
        "change",
        {
          bubbles: true,
        }
      )
    );
  }

  function createPanel(
    className
  ) {
    closePicker();

    const panel =
      document.createElement("section");

    panel.className =
      `kdp-popover ${className}`;

    panel.setAttribute(
      "role",
      "dialog"
    );

    panel.setAttribute(
      "aria-modal",
      "false"
    );

    document.body.appendChild(panel);

    activePanel = panel;

    return panel;
  }

  function openDatePicker(
    input,
    proxy
  ) {
    const selected =
      parseIsoDate(input.value);

    const today =
      new Date();

    const start =
      selected || today;

    const state = {
      year: start.getFullYear(),
      month: start.getMonth(),
    };

    const panel =
      createPanel(
        "kdp-date-popover"
      );

    activeProxy = proxy;

    function render() {
      const selectedIso =
        String(input.value || "");

      const todayIso =
        dateToIso(today);

      const first =
        new Date(
          state.year,
          state.month,
          1
        );

      const firstVisible =
        new Date(
          state.year,
          state.month,
          1 - first.getDay()
        );

      const weekdays = [
        "日",
        "月",
        "火",
        "水",
        "木",
        "金",
        "土",
      ];

      const days = [];

      for (
        let index = 0;
        index < 42;
        index += 1
      ) {
        const date =
          new Date(
            firstVisible.getFullYear(),
            firstVisible.getMonth(),
            firstVisible.getDate()
            + index
          );

        const iso =
          dateToIso(date);

        const classes = [
          "kdp-day",
        ];

        if (
          date.getMonth()
          !== state.month
        ) {
          classes.push(
            "is-outside"
          );
        }

        if (iso === todayIso) {
          classes.push(
            "is-today"
          );
        }

        if (
          iso === selectedIso
        ) {
          classes.push(
            "is-selected"
          );
        }

        days.push(
          `<button
            type="button"
            class="${classes.join(" ")}"
            data-kdp-date="${iso}"
          >${date.getDate()}</button>`
        );
      }

      panel.innerHTML = `
        <div class="kdp-picker-head">
          <button
            type="button"
            class="kdp-nav-button"
            data-kdp-month="-1"
            aria-label="前の月"
          >‹</button>

          <div class="kdp-picker-title">
            ${state.year}年
            ${state.month + 1}月
          </div>

          <button
            type="button"
            class="kdp-nav-button"
            data-kdp-month="1"
            aria-label="次の月"
          >›</button>
        </div>

        <div class="kdp-weekdays">
          ${weekdays
            .map(
              (day) =>
                `<span class="kdp-weekday">${day}</span>`
            )
            .join("")}
        </div>

        <div class="kdp-days">
          ${days.join("")}
        </div>

        <div class="kdp-picker-footer">
          <div class="kdp-picker-footer-group">
            <button
              type="button"
              class="kdp-picker-button"
              data-kdp-clear
            >クリア</button>
          </div>

          <div class="kdp-picker-footer-group">
            <button
              type="button"
              class="kdp-picker-button"
              data-kdp-today
            >今日</button>

            <button
              type="button"
              class="kdp-picker-button"
              data-kdp-close
            >閉じる</button>
          </div>
        </div>
      `;

      panel
        .querySelectorAll(
          "[data-kdp-month]"
        )
        .forEach(
          (button) => {
            button.addEventListener(
              "click",
              () => {
                const move =
                  Number(
                    button.dataset.kdpMonth
                  );

                const next =
                  new Date(
                    state.year,
                    state.month + move,
                    1
                  );

                state.year =
                  next.getFullYear();

                state.month =
                  next.getMonth();

                render();
              }
            );
          }
        );

      panel
        .querySelectorAll(
          "[data-kdp-date]"
        )
        .forEach(
          (button) => {
            button.addEventListener(
              "click",
              () => {
                commitValue(
                  input,
                  button.dataset.kdpDate
                );

                closePicker();
              }
            );
          }
        );

      panel
        .querySelector(
          "[data-kdp-today]"
        )
        ?.addEventListener(
          "click",
          () => {
            commitValue(
              input,
              todayIso
            );

            closePicker();
          }
        );

      panel
        .querySelector(
          "[data-kdp-clear]"
        )
        ?.addEventListener(
          "click",
          () => {
            commitValue(
              input,
              ""
            );

            closePicker();
          }
        );

      panel
        .querySelector(
          "[data-kdp-close]"
        )
        ?.addEventListener(
          "click",
          closePicker
        );

      positionPanel(
        panel,
        proxy
      );
    }

    render();
  }

  function parseTime(value) {
    const match =
      String(value || "").match(
        /^(\d{2}):(\d{2})/
      );

    if (!match) {
      return null;
    }

    const hour =
      Number(match[1]);

    const minute =
      Number(match[2]);

    if (
      hour < 0
      || hour > 23
      || minute < 0
      || minute > 59
    ) {
      return null;
    }

    return {
      hour,
      minute,
    };
  }

  function openTimePicker(
    input,
    proxy
  ) {
    const now =
      new Date();

    const parsed =
      parseTime(input.value);

    const initial =
      snapTimeToFive(
        parsed?.hour
        ?? now.getHours(),

        parsed?.minute
        ?? now.getMinutes()
      );

    const state = {
      hour:
        initial.hour,

      minute:
        initial.minute,
    };

    const panel =
      createPanel(
        "kdp-time-popover"
      );

    activeProxy = proxy;

    panel.innerHTML = `
      <div class="kdp-picker-head">
        <div class="kdp-picker-title">
          時間を選択
        </div>
      </div>

      <div
        class="kdp-time-preview"
        data-kdp-time-preview
      ></div>

      <div class="kdp-wheels">
        <div class="kdp-wheel-wrap">
          <span class="kdp-wheel-label">
            時
          </span>

          <div
            class="kdp-wheel"
            data-kdp-wheel="hour"
          >
            ${Array
              .from(
                {
                  length: 24,
                },
                (_, index) =>
                  `<button
                    type="button"
                    class="kdp-wheel-option"
                    data-kdp-wheel-value="${index}"
                  >${pad(index)}</button>`
              )
              .join("")}
          </div>
        </div>

        <div class="kdp-wheel-separator">
          :
        </div>

        <div class="kdp-wheel-wrap">
          <span class="kdp-wheel-label">
            分
          </span>

          <div
            class="kdp-wheel"
            data-kdp-wheel="minute"
          >
            ${Array
              .from(
                {
                  length: 12,
                },
                (_, index) => {
                  const minute =
                    index * 5;

                  return `<button
                    type="button"
                    class="kdp-wheel-option"
                    data-kdp-wheel-value="${minute}"
                  >${pad(minute)}</button>`;
                }
              )
              .join("")}
          </div>
        </div>
      </div>

      <div class="kdp-picker-footer">
        <div class="kdp-picker-footer-group">
          <button
            type="button"
            class="kdp-picker-button"
            data-kdp-clear
          >クリア</button>
        </div>

        <div class="kdp-picker-footer-group">
          <button
            type="button"
            class="kdp-picker-button"
            data-kdp-close
          >キャンセル</button>

          <button
            type="button"
            class="kdp-picker-button is-primary"
            data-kdp-apply
          >決定</button>
        </div>
      </div>
    `;

    function updateView() {
      const preview =
        panel.querySelector(
          "[data-kdp-time-preview]"
        );

      if (preview) {
        preview.textContent =
          `${pad(state.hour)}:${pad(state.minute)}`;
      }

      panel
        .querySelectorAll(
          "[data-kdp-wheel]"
        )
        .forEach(
          (wheel) => {
            const key =
              wheel.dataset.kdpWheel;

            const selected =
              state[key];

            wheel
              .querySelectorAll(
                "[data-kdp-wheel-value]"
              )
              .forEach(
                (button) => {
                  button.classList.toggle(
                    "is-selected",
                    Number(
                      button.dataset.kdpWheelValue
                    ) === selected
                  );
                }
              );
          }
        );
    }

    function bindWheel(
      wheel
    ) {
      const key =
        wheel.dataset.kdpWheel;

      const maxIndex =
        key === "hour"
          ? 23
          : 11;

      let frame = 0;

      wheel.addEventListener(
        "scroll",
        () => {
          cancelAnimationFrame(
            frame
          );

          frame =
            requestAnimationFrame(
              () => {
                const index =
                  Math.max(
                    0,
                    Math.min(
                      maxIndex,
                      Math.round(
                        wheel.scrollTop
                        / WHEEL_ITEM_HEIGHT
                      )
                    )
                  );

                state[key] =
                  key === "minute"
                    ? index * 5
                    : index;

                updateView();
              }
            );
        },
        {
          passive: true,
        }
      );

      wheel
        .querySelectorAll(
          "[data-kdp-wheel-value]"
        )
        .forEach(
          (button) => {
            button.addEventListener(
              "click",
              () => {
                const value =
                  Number(
                    button.dataset.kdpWheelValue
                  );

                state[key] =
                  value;

                const wheelIndex =
                  key === "minute"
                    ? value / 5
                    : value;

                wheel.scrollTo({
                  top:
                    wheelIndex
                    * WHEEL_ITEM_HEIGHT,
                  behavior: "smooth",
                });

                updateView();
              }
            );
          }
        );
    }

    panel
      .querySelectorAll(
        "[data-kdp-wheel]"
      )
      .forEach(
        bindWheel
      );

    panel
      .querySelector(
        "[data-kdp-apply]"
      )
      ?.addEventListener(
        "click",
        () => {
          commitValue(
            input,
            `${pad(state.hour)}:${pad(state.minute)}`
          );

          closePicker();
        }
      );

    panel
      .querySelector(
        "[data-kdp-clear]"
      )
      ?.addEventListener(
        "click",
        () => {
          commitValue(
            input,
            ""
          );

          closePicker();
        }
      );

    panel
      .querySelector(
        "[data-kdp-close]"
      )
      ?.addEventListener(
        "click",
        closePicker
      );

    updateView();

    requestAnimationFrame(
      () => {
        const hourWheel =
          panel.querySelector(
            '[data-kdp-wheel="hour"]'
          );

        const minuteWheel =
          panel.querySelector(
            '[data-kdp-wheel="minute"]'
          );

        if (hourWheel) {
          hourWheel.scrollTop =
            state.hour
            * WHEEL_ITEM_HEIGHT;
        }

        if (minuteWheel) {
          minuteWheel.scrollTop =
            (
              state.minute / 5
            )
            * WHEEL_ITEM_HEIGHT;
        }

        positionPanel(
          panel,
          proxy
        );
      }
    );
  }

  function openPicker(
    input,
    proxy
  ) {
    if (!isDesktop()) {
      return;
    }

    syncProxy(input);

    if (
      input.dataset.kdpType
      === "date"
    ) {
      openDatePicker(
        input,
        proxy
      );

      return;
    }

    openTimePicker(
      input,
      proxy
    );
  }

  function enhanceInput(
    input
  ) {
    if (
      !isDesktop()
      || !(input instanceof HTMLInputElement)
      || input.dataset.kdpEnhanced === "1"
    ) {
      return;
    }

    const type =
      input.getAttribute("type");

    if (
      type !== "date"
      && type !== "time"
    ) {
      return;
    }

    const host =
      input.parentElement;

    if (!host) {
      return;
    }

    const proxy =
      document.createElement(
        "button"
      );

    proxy.type = "button";
    proxy.className =
      "kdp-proxy";

    proxy.innerHTML = `
      <span class="kdp-proxy-value"></span>
      <span
        class="kdp-proxy-icon"
        aria-hidden="true"
      >▾</span>
    `;

    proxy.setAttribute(
      "aria-label",
      proxyLabel(input)
    );

    input.dataset.kdpEnhanced =
      "1";

    input.dataset.kdpType =
      type;

    input.classList.add(
      "kdp-source"
    );

    input.tabIndex = -1;

    input.setAttribute(
      "aria-hidden",
      "true"
    );

    host.classList.add(
      "kdp-host"
    );

    input.insertAdjacentElement(
      "afterend",
      proxy
    );

    input._kdpProxy =
      proxy;

    proxy.addEventListener(
      "click",
      () => {
        openPicker(
          input,
          proxy
        );
      }
    );

    input.addEventListener(
      "input",
      () => syncProxy(input)
    );

    input.addEventListener(
      "change",
      () => syncProxy(input)
    );

    input.addEventListener(
      "invalid",
      (event) => {
        if (!isDesktop()) {
          return;
        }

        event.preventDefault();

        openPicker(
          input,
          proxy
        );
      }
    );

    syncProxy(input);
  }

  function scan(root) {
    if (!isDesktop()) {
      return;
    }

    if (
      root instanceof HTMLInputElement
      && root.matches(
        SOURCE_SELECTOR
      )
    ) {
      enhanceInput(root);
    }

    if (
      root instanceof Element
      || root instanceof Document
    ) {
      root
        .querySelectorAll(
          SOURCE_SELECTOR
        )
        .forEach(
          enhanceInput
        );
    }
  }

  function syncAll() {
    document
      .querySelectorAll(
        '[data-kdp-enhanced="1"]'
      )
      .forEach(
        syncProxy
      );
  }

  const observer =
    new MutationObserver(
      (records) => {
        for (
          const record
          of records
        ) {
          for (
            const node
            of record.addedNodes
          ) {
            applyTimeStep(node);

            if (isDesktop()) {
              scan(node);
            }
          }
        }

        if (isDesktop()) {
          syncAll();
        }
      }
    );

  function start() {
    if (!document.body) {
      return;
    }

    applyTimeStep(document);

    scan(document);

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      }
    );

    document.addEventListener(
      "pointerdown",
      (event) => {
        if (!activePanel) {
          return;
        }

        if (
          activePanel.contains(
            event.target
          )
          || activeProxy?.contains(
            event.target
          )
        ) {
          return;
        }

        closePicker();
      },
      true
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape"
          && activePanel
        ) {
          closePicker();
        }
      }
    );

    document.addEventListener(
      "focusin",
      syncAll
    );

    window.addEventListener(
      "resize",
      () => {
        if (activePanel) {
          closePicker();
        }

        syncAll();
      }
    );
  }

  if (
    document.readyState
    === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      {
        once: true,
      }
    );
  } else {
    start();
  }
})();
