(() => {
  "use strict";

  const PROFILE_API =
    "/api/v1/customer-profile.php";

  const VISIT_NOTES_API =
    "/api/v1/visit-notes.php";

  const SCHEDULE_API =
    "/api/v1/schedule.php";

  const scheduleApi =
    window.KohakuWorkNextSchedule;

  const drawer =
    document.getElementById(
      "nextScheduleDetailDrawer"
    );

  const body =
    document.getElementById(
      "nextScheduleDetailBody"
    );

  if (
    !scheduleApi
    || !scheduleApi.state
    || !drawer
    || !body
  ) {
    console.error(
      "Kohaku Work NEXT mobile flow: required UI missing."
    );
    return;
  }

  const FEATURE_TYPES = [
    ["age_range", "年齢帯"],
    ["height", "身長"],
    ["body_type", "体型"],
    ["hair", "髪"],
    ["facial_hair", "ひげ"],
    ["glasses", "メガネ"],
    ["appearance", "外見"],
    ["lookalike", "似ている人"],
    ["occupation", "職業"],
    ["days_off", "休日"],
    ["voice_speech", "声・話し方"],
    ["hobby_topic", "趣味・話題"],
    ["other", "その他"],
  ];

  const MANAGED_TYPES = [
    "area",
    ...FEATURE_TYPES.map(
      ([type]) => type
    ),
  ];

  let profile = null;
  let profileCustomerId = 0;
  let profilePromise = null;
  let activeVisitId = 0;
  let mountQueued = false;

  const AUTOSAVE_DELAY = 800;

  let autosaveTimer = 0;
  let autosaveStatusVersion = 0;

  const pendingAutosaves =
    new Map();

  const autosaveProfileCache =
    new Map();

  let autosaveChain =
    Promise.resolve();

  const saveIndicatorSources =
    new Map([
      ["mobile", { state:"idle", detail:"" }],
      ["meta", { state:"idle", detail:"" }],
      ["schedule", { state:"idle", detail:"" }],
    ]);

  const saveIndicatorTimers =
    new Map();

  const SAVE_INDICATOR_VIEW = {
    idle:{ icon:"○", label:"保存待機" },
    pending:{ icon:"•", label:"保存待ち" },
    saving:{ icon:"↻", label:"DB保存中" },
    saved:{ icon:"✓", label:"DB保存" },
    error:{ icon:"!", label:"保存失敗" },
    offline:{ icon:"×", label:"回線なし" },
  };

  function aggregateSaveIndicatorState() {
    if (!navigator.onLine) {
      return {
        state:"offline",
        detail:"ネットワーク接続がありません。保存できていない可能性があります。",
      };
    }

    const entries =
      Array.from(
        saveIndicatorSources.values()
      );

    for (
      const state
      of [
        "error",
        "saving",
        "pending",
        "saved",
      ]
    ) {
      const match =
        entries.find(
          item =>
            item.state === state
        );

      if (match) {
        return {
          state,
          detail:
            match.detail
            || "",
        };
      }
    }

    return {
      state:"idle",
      detail:"",
    };
  }

  function positionFloatingSaveIndicator(
    indicator
  ) {
    if (!indicator) return;

    const mobile =
      window.matchMedia(
        "(max-width:768px)"
      ).matches;

    if (!mobile) {
      indicator.style.removeProperty(
        "top"
      );
      indicator.style.removeProperty(
        "left"
      );
      indicator.style.removeProperty(
        "right"
      );
      return;
    }

    const viewport =
      window.visualViewport;

    if (!viewport) {
      indicator.style.removeProperty(
        "top"
      );
      indicator.style.removeProperty(
        "left"
      );
      indicator.style.removeProperty(
        "right"
      );
      return;
    }

    const width =
      indicator.offsetWidth;

    const top =
      viewport.offsetTop
      + 8;

    const left =
      Math.max(
        viewport.offsetLeft + 8,
        viewport.offsetLeft
        + viewport.width
        - width
        - 10
      );

    indicator.style.top =
      `${top}px`;

    indicator.style.left =
      `${left}px`;

    indicator.style.right =
      "auto";
  }

  function mountHeaderSaveIndicator() {
    const header =
      drawer.querySelector(
        ".next-schedule-detail-header"
      );

    if (!header) return null;

    const mobile =
      window.matchMedia(
        "(max-width:768px)"
      ).matches;

    let indicator =
      document.querySelector(
        "[data-next-save-indicator]"
      );

    if (!indicator) {
      indicator =
        document.createElement("div");

      indicator.className =
        "next-save-indicator";

      indicator.dataset.nextSaveIndicator =
        "true";

      indicator.setAttribute(
        "role",
        "status"
      );

      indicator.setAttribute(
        "aria-live",
        "polite"
      );

      indicator.innerHTML = `
        <span
          class="next-save-indicator-icon"
          data-next-save-indicator-icon
          aria-hidden="true"
        ></span>
        <span
          class="next-save-indicator-label"
          data-next-save-indicator-label
        ></span>
      `;
    }

    const target =
      mobile
        ? document.body
        : header;

    if (
      indicator.parentElement
      !== target
    ) {
      target.append(indicator);
    }

    indicator.hidden =
      !drawer.classList.contains(
        "is-open"
      );

    positionFloatingSaveIndicator(
      indicator
    );

    return indicator;
  }

  function renderHeaderSaveIndicator() {
    const indicator =
      mountHeaderSaveIndicator();

    if (!indicator) return;

    const aggregate =
      aggregateSaveIndicatorState();

    const view =
      SAVE_INDICATOR_VIEW[
        aggregate.state
      ]
      || SAVE_INDICATOR_VIEW.idle;

    if (
      indicator.dataset.state
      !== aggregate.state
    ) {
      indicator.dataset.state =
        aggregate.state;
    }

    const icon =
      indicator.querySelector(
        "[data-next-save-indicator-icon]"
      );

    const label =
      indicator.querySelector(
        "[data-next-save-indicator-label]"
      );

    if (
      icon
      && icon.textContent
        !== view.icon
    ) {
      icon.textContent =
        view.icon;
    }

    if (
      label
      && label.textContent
        !== view.label
    ) {
      label.textContent =
        view.label;
    }

    const title =
      aggregate.detail
      || view.label;

    if (
      indicator.title
      !== title
    ) {
      indicator.title =
        title;
    }

    indicator.setAttribute(
      "aria-label",
      title
    );
  }

  function setHeaderSaveIndicator(
    source,
    state,
    detail = ""
  ) {
    if (
      !saveIndicatorSources.has(source)
    ) {
      return;
    }

    const oldTimer =
      saveIndicatorTimers.get(
        source
      );

    if (oldTimer) {
      window.clearTimeout(
        oldTimer
      );

      saveIndicatorTimers.delete(
        source
      );
    }

    saveIndicatorSources.set(
      source,
      {
        state,
        detail,
      }
    );

    renderHeaderSaveIndicator();

    if (state === "saved") {
      const timer =
        window.setTimeout(
          () => {
            const current =
              saveIndicatorSources.get(
                source
              );

            if (
              current?.state
              !== "saved"
            ) {
              return;
            }

            saveIndicatorSources.set(
              source,
              {
                state:"idle",
                detail:"",
              }
            );

            saveIndicatorTimers.delete(
              source
            );

            renderHeaderSaveIndicator();
          },
          1800
        );

      saveIndicatorTimers.set(
        source,
        timer
      );
    }
  }

  window.KohakuWorkNextSaveIndicator = {
    setState:
      setHeaderSaveIndicator,
    render:
      renderHeaderSaveIndicator,
  };

  window.addEventListener(
    "offline",
    () => {
      renderHeaderSaveIndicator();
    }
  );

  window.addEventListener(
    "online",
    () => {
      renderHeaderSaveIndicator();
    }
  );

  function syncSaveIndicatorViewport() {
    const indicator =
      document.querySelector(
        "[data-next-save-indicator]"
      );

    if (!indicator) return;

    mountHeaderSaveIndicator();
    positionFloatingSaveIndicator(
      indicator
    );
  }

  window.addEventListener(
    "resize",
    syncSaveIndicatorViewport
  );

  if (window.visualViewport) {
    window.visualViewport
      .addEventListener(
        "resize",
        syncSaveIndicatorViewport
      );

    window.visualViewport
      .addEventListener(
        "scroll",
        syncSaveIndicatorViewport
      );
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function currentVisit() {
    const visitId =
      Number(
        drawer.dataset.visitId
        || 0
      );

    if (!visitId) return null;

    return scheduleApi.state.visits
      .find(
        visit =>
          Number(visit.id)
          === visitId
      )
      || null;
  }

  function currentCustomerId() {
    return Number(
      currentVisit()?.customer_id
      || 0
    );
  }

  function setWriteStatus(
    text,
    state = ""
  ) {
    const target =
      document.getElementById(
        "nextScheduleWriteStatus"
      );

    if (!target) return;

    target.textContent = text;
    target.dataset.state = state;

    if (state === "writing") {
      setHeaderSaveIndicator(
        "mobile",
        "saving"
      );
    } else if (state === "saved") {
      setHeaderSaveIndicator(
        "mobile",
        "saved"
      );
    } else if (state === "error") {
      setHeaderSaveIndicator(
        "mobile",
        "error",
        text
      );
    } else if (!state) {
      setHeaderSaveIndicator(
        "mobile",
        "idle"
      );
    }
  }

  async function requestJson(
    url,
    options = {}
  ) {
    const response =
      await fetch(
        url,
        {
          credentials:"same-origin",
          cache:"no-store",
          ...options,
        }
      );

    let data;

    try {
      data =
        await response.json();
    } catch {
      throw new Error(
        "APIの応答を読めませんでした。"
      );
    }

    if (
      !response.ok
      || !data
      || data.success !== true
    ) {
      throw new Error(
        data?.error
        || "保存できませんでした。"
      );
    }

    return data;
  }

  function resetProfileIfNeeded() {
    const visitId =
      Number(
        drawer.dataset.visitId
        || 0
      );

    if (
      visitId
      === activeVisitId
    ) {
      return;
    }

    activeVisitId = visitId;
    profile = null;
    profileCustomerId = 0;
    profilePromise = null;
  }

  function recordsForType(
    type,
    source = profile
  ) {
    return (
      Array.isArray(
        source?.identity_features
      )
        ? source.identity_features
        : []
    ).filter(
      item =>
        item?.feature_type
        === type
    );
  }

  function recordForType(type) {
    return (
      recordsForType(type)[0]
      || null
    );
  }

  function assertUniqueManagedFeatures() {
    for (
      const type
      of MANAGED_TYPES
    ) {
      const records =
        recordsForType(type);

      if (records.length > 1) {
        const label =
          type === "area"
            ? "エリア"
            : (
              FEATURE_TYPES.find(
                ([value]) =>
                  value === type
              )?.[1]
              || type
            );

        throw new Error(
          `${label}に複数の登録があります。安全のため自動保存を停止しました。`
        );
      }
    }
  }

  async function ensureProfile(
    force = false
  ) {
    const customerId =
      currentCustomerId();

    if (!customerId) {
      profile = null;
      profileCustomerId = 0;
      profilePromise = null;
      return null;
    }

    if (
      !force
      && profile
      && profileCustomerId
        === customerId
    ) {
      return profile;
    }

    if (
      !force
      && profilePromise
    ) {
      return profilePromise;
    }

    profilePromise =
      requestJson(
        `${PROFILE_API}?id=${encodeURIComponent(
          String(customerId)
        )}`,
        {
          method:"GET",
        }
      )
      .then(data => {
        if (
          currentCustomerId()
          !== customerId
        ) {
          return null;
        }

        profile =
          data.customer
          || null;

        profileCustomerId =
          customerId;

        if (profile) {
          autosaveProfileCache.set(
            customerId,
            profile
          );
        }

        return profile;
      })
      .finally(() => {
        profilePromise = null;
      });

    return profilePromise;
  }

  function mountSaveAllButton() {
    const header =
      drawer.querySelector(
        ".next-schedule-detail-header"
      );

    if (
      !header
      || header.querySelector(
        "[data-next-save-all]"
      )
    ) {
      return;
    }

    const close =
      header.querySelector(
        "[data-next-schedule-detail-close]"
      );

    if (!close) return;

    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "next-detail-save-all";

    button.dataset.nextSaveAll =
      "true";

    button.textContent =
      "✓ 全部保存";

    button.title =
      "今回の予約メモ・顧客共通メモ・顧客特徴・エリアをまとめて保存";

    button.disabled = true;

    close.insertAdjacentElement(
      "beforebegin",
      button
    );
  }

  function mountHeaderEditButton() {
    const header =
      drawer.querySelector(
        ".next-schedule-detail-header"
      );

    if (
      !header
      || header.querySelector(
        "[data-next-header-edit]"
      )
    ) {
      return;
    }

    const save =
      header.querySelector(
        "[data-next-save-all]"
      );

    const close =
      header.querySelector(
        "[data-next-schedule-detail-close]"
      );

    const anchor =
      save || close;

    if (!anchor) return;

    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "next-detail-header-edit";

    button.dataset.nextHeaderEdit =
      "true";

    button.textContent =
      "予約を編集";

    button.title =
      "この予約を編集";

    anchor.insertAdjacentElement(
      "beforebegin",
      button
    );
  }

  function mountHeaderFeaturesButton() {
    const header =
      drawer.querySelector(
        ".next-schedule-detail-header"
      );

    if (
      !header
      || header.querySelector(
        "[data-next-header-features]"
      )
    ) {
      return;
    }

    const edit =
      header.querySelector(
        "[data-next-header-edit]"
      );

    const save =
      header.querySelector(
        "[data-next-save-all]"
      );

    const close =
      header.querySelector(
        "[data-next-schedule-detail-close]"
      );

    const anchor =
      edit || save || close;

    if (!anchor) return;

    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "next-detail-header-features";

    button.dataset.nextHeaderFeatures =
      "true";

    button.textContent =
      "特徴";

    button.title =
      "顧客の身長・見た目などの特徴を編集";

    button.setAttribute(
      "aria-label",
      "顧客特徴を編集"
    );

    button.disabled = true;

    anchor.insertAdjacentElement(
      "beforebegin",
      button
    );
  }

  function mountHeaderVisitNotesButton() {
    const header =
      drawer.querySelector(
        ".next-schedule-detail-header"
      );

    if (
      !header
      || header.querySelector(
        "[data-next-header-visit-notes]"
      )
    ) {
      return;
    }

    const features =
      header.querySelector(
        "[data-next-header-features]"
      );

    const edit =
      header.querySelector(
        "[data-next-header-edit]"
      );

    const save =
      header.querySelector(
        "[data-next-save-all]"
      );

    const close =
      header.querySelector(
        "[data-next-schedule-detail-close]"
      );

    const anchor =
      features
      || edit
      || save
      || close;

    if (!anchor) return;

    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "next-detail-header-notes";

    button.dataset.nextHeaderVisitNotes =
      "true";

    button.textContent =
      "個別予約メモ";

    button.title =
      "今回の予約メモを入力";

    button.disabled = true;

    anchor.insertAdjacentElement(
      "beforebegin",
      button
    );
  }

  function mountHeaderDeleteButton() {
    const header =
      drawer.querySelector(
        ".next-schedule-detail-header"
      );

    if (
      !header
      || header.querySelector(
        "[data-next-header-delete]"
      )
    ) {
      return;
    }

    const close =
      header.querySelector(
        "[data-next-schedule-detail-close]"
      );

    if (!close) return;

    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "next-detail-header-delete";

    button.dataset.nextHeaderDelete =
      "true";

    button.textContent =
      "削除";

    button.title =
      "この予約を削除";

    button.disabled = true;

    close.insertAdjacentElement(
      "beforebegin",
      button
    );
  }

  function syncHeaderVisitNotesButton() {
    const button =
      drawer.querySelector(
        "[data-next-header-visit-notes]"
      );

    if (!button) return;

    const source =
      body.querySelector(
        "[data-next-visit-notes-open]"
      );

    button.disabled =
      !source
      || Boolean(source.disabled);
  }

  function syncHeaderDeleteButton() {
    const button =
      drawer.querySelector(
        "[data-next-header-delete]"
      );

    if (!button) return;

    const source =
      drawer.querySelector(
        ".next-schedule-detail-footer [data-next-schedule-delete]"
      );

    button.disabled =
      !source
      || Boolean(source.disabled);
  }

  function syncHeaderFeaturesButton() {
    const button =
      drawer.querySelector(
        "[data-next-header-features]"
      );

    if (!button) return;

    const source =
      body.querySelector(
        "[data-next-customer-profile-open]"
      );

    button.disabled =
      !currentCustomerId()
      || !source
      || Boolean(source.disabled);
  }

  function syncHeaderEditButton() {
    const button =
      drawer.querySelector(
        "[data-next-header-edit]"
      );

    if (!button) return;

    const source =
      drawer.querySelector(
        ".next-schedule-detail-footer [data-next-schedule-edit-open]"
      );

    button.disabled =
      !source
      || Boolean(source.disabled);

    button.textContent =
      source?.disabled
        ? "読込中…"
        : "予約を編集";
  }

  function syncSaveAllButton() {
    const button =
      drawer.querySelector(
        "[data-next-save-all]"
      );

    if (!button) return;

    const visit =
      currentVisit();

    const ready =
      Boolean(
        visit
        && String(
          drawer.dataset.detailLoadedId
          || ""
        ) === String(visit.id)
      );

    if (
      button.dataset.saving
      !== "true"
    ) {
      button.disabled =
        !ready;

      if (!ready) {
        button.textContent =
          "✓ 全部保存";
      }
    }
  }

  function mountReservationToggle() {
    const label =
      body.querySelector(
        '[data-next-detail-heading="reservation"]'
      );

    const card =
      label?.nextElementSibling;

    if (
      !label
      || !card
      || !card.classList.contains(
        "next-detail-reservation-card"
      )
    ) {
      return;
    }

    if (
      label.dataset
        .nextReservationToggleReady
        === "true"
    ) {
      return;
    }

    label.dataset
      .nextReservationToggleReady =
      "true";

    label.classList.add(
      "next-detail-reservation-toggle"
    );

    label.setAttribute(
      "role",
      "button"
    );

    label.setAttribute(
      "tabindex",
      "0"
    );

    label.setAttribute(
      "aria-expanded",
      "false"
    );

    card.hidden = true;
  }

  function toggleReservation(label) {
    const card =
      label?.nextElementSibling;

    if (
      !card
      || !card.classList.contains(
        "next-detail-reservation-card"
      )
    ) {
      return;
    }

    const opening =
      card.hidden;

    card.hidden =
      !opening;

    label.classList.toggle(
      "is-expanded",
      opening
    );

    label.setAttribute(
      "aria-expanded",
      opening
        ? "true"
        : "false"
    );
  }

  function mountAreaInput() {
    const visitorCard =
      body.querySelector(
        ".next-detail-visitor-quick"
      );

    if (!visitorCard) return;

    let host =
      visitorCard.querySelector(
        "[data-next-area-note]"
      );

    if (!host) {
      host =
        document.createElement(
          "label"
        );

      host.className =
        "next-detail-area-note";

      host.dataset.nextAreaNote =
        "true";

      host.innerHTML = `
        <span>AREA / 顧客エリアメモ</span>
        <input
          type="text"
          data-next-customer-area-input
          placeholder="例：すすきの周辺、札幌駅によく来る"
        >
        <small>
          このお客さん共通の情報です。入力内容は自動保存されます。
        </small>
      `;

      const status =
        visitorCard.querySelector(
          "[data-next-detail-visitor-status]"
        );

      if (status) {
        status.insertAdjacentElement(
          "beforebegin",
          host
        );
      } else {
        visitorCard.append(host);
      }
    }

    const input =
      host.querySelector(
        "[data-next-customer-area-input]"
      );

    if (!input) return;

    const customerId =
      currentCustomerId();

    host.classList.remove(
      "is-required-missing"
    );

    if (!customerId) {
      input.disabled = true;
      input.value = "";
      input.placeholder =
        "顧客を紐付けると入力できます";
      delete input.dataset.seededCustomer;
      return;
    }

    if (
      !profile
      || profileCustomerId
        !== customerId
    ) {
      input.disabled = true;
      input.placeholder =
        "顧客情報を読み込み中…";
      return;
    }

    input.disabled = false;
    input.placeholder =
      "例：すすきの周辺、札幌駅によく来る";

    if (
      input.dataset.seededCustomer
      !== String(customerId)
    ) {
      input.value =
        recordForType("area")
          ?.feature_value
        || "";

      input.dataset.seededCustomer =
        String(customerId);
    }

    syncRequiredCustomerFields();
  }


  function syncRequiredCustomerFields() {
    const customerId =
      currentCustomerId();

    const ready =
      Boolean(
        customerId
        && profile
        && profileCustomerId
          === customerId
      );

    const areaInput =
      body.querySelector(
        "[data-next-customer-area-input]"
      );

    const areaHost =
      areaInput?.closest(
        "[data-next-area-note]"
      )
      || null;

    const areaValue =
      String(
        areaInput?.value
        ?? recordForType("area")
          ?.feature_value
        ?? ""
      ).trim();

    areaHost?.classList.toggle(
      "is-required-missing",
      ready
      && areaValue === ""
    );

    const daysOffInput =
      body.querySelector(
        '[data-next-batch-feature-type="days_off"]'
      );

    const daysOffValue =
      String(
        daysOffInput?.value
        ?? recordForType("days_off")
          ?.feature_value
        ?? ""
      ).trim();

    daysOffInput
      ?.closest(
        ".next-feature-batch-field"
      )
      ?.classList.toggle(
        "is-required-missing",
        ready
        && daysOffValue === ""
      );
  }


  function moveVisitorQuickToCustomerSummary() {
    const visitorCard =
      body.querySelector(
        ".next-detail-visitor-quick"
      );

    const summary =
      document.getElementById(
        "nextCustomerProfileSummary"
      );

    const featureList =
      summary?.querySelector(
        ".next-customer-feature-list"
      );

    if (
      !visitorCard
      || !summary
      || !featureList
    ) {
      return;
    }

    if (
      visitorCard.parentElement
        === summary
      && visitorCard.nextElementSibling
        === featureList
    ) {
      return;
    }

    featureList.insertAdjacentElement(
      "beforebegin",
      visitorCard
    );
  }


  function featureFieldHtml(
    type,
    label
  ) {
    const record =
      recordForType(type);

    return `
      <label class="next-feature-batch-field">
        <span>${escapeHtml(label)}</span>
        <input
          type="text"
          data-next-batch-feature-type="${escapeHtml(type)}"
          value="${escapeHtml(
            record?.feature_value
            || ""
          )}"
          placeholder="${escapeHtml(label)}"
        >
      </label>
    `;
  }

  function mountBatchFeatureEditor() {
    const editor =
      document.getElementById(
        "nextCustomerProfileEditor"
      );

    const form =
      editor?.querySelector(
        ".next-customer-feature-form"
      );

    const customerId =
      currentCustomerId();

    if (
      !editor
      || !form
      || !customerId
      || !profile
      || profileCustomerId
        !== customerId
    ) {
      return;
    }

    if (
      form.dataset
        .nextFeatureBatchReady
      === String(customerId)
    ) {
      return;
    }

    form.dataset
      .nextFeatureBatchReady =
      String(customerId);

    form.innerHTML = `
      <div class="next-feature-batch-head">
        <strong>顧客特徴</strong>
        <small>カテゴリを切り替えず、まとめて入力できます。</small>
      </div>

      <div class="next-feature-batch-grid">
        ${
          FEATURE_TYPES
            .map(
              ([type, label]) =>
                featureFieldHtml(
                  type,
                  label
                )
            )
            .join("")
        }
      </div>

      <small class="next-feature-batch-help">
        入力内容は自動保存されます。
      </small>
    `;

    const legacySave =
      editor.querySelector(
        "[data-next-feature-save]"
      );

    if (legacySave) {
      legacySave.hidden = true;
    }
  }

  function ensureCustomerPanelClose(
    panel
  ) {
    if (!panel) return;

    panel.querySelector(
      ":scope > [data-next-customer-panel-close]"
    )?.remove();
  }

  function ensureCustomerActionsClose(
    actions
  ) {
    if (!actions) return null;

    let close =
      actions.querySelector(
        ":scope > [data-next-customer-panel-close]"
      );

    if (!close) {
      close =
        document.createElement(
          "button"
        );

      close.type =
        "button";

      close.className =
        "next-customer-panel-close";

      close.dataset
        .nextCustomerPanelClose =
        "true";

      close.textContent =
        "閉じる";

      close.hidden = true;

      actions.prepend(
        close
      );
    }

    return close;
  }

  function wrapCustomerPanel(
    node,
    key
  ) {
    if (!node) return null;

    const existing =
      node.closest(
        `[data-next-customer-panel="${key}"]`
      );

    if (existing) {
      ensureCustomerPanelClose(
        existing
      );

      return existing;
    }

    const panel =
      document.createElement(
        "div"
      );

    panel.className =
      "next-customer-panel";

    panel.dataset.nextCustomerPanel =
      key;

    panel.hidden = true;

    node.insertAdjacentElement(
      "beforebegin",
      panel
    );

    panel.append(node);

    ensureCustomerPanelClose(
      panel
    );

    return panel;
  }

  function syncCustomerPanelButtons(
    editor
  ) {
    if (!editor) return;

    const openPanel =
      Array.from(
        editor.querySelectorAll(
          "[data-next-customer-panel]"
        )
      )
      .find(panel => !panel.hidden)
      || null;

    const openKey =
      openPanel
        ?.dataset
        ?.nextCustomerPanel
      || "";

    const buttonRoot =
      editor.closest(
        ".next-notes-write-card.is-customer-scope"
      )
      || editor;

    buttonRoot
      .querySelectorAll(
        "[data-next-customer-panel-toggle]"
      )
      .forEach(button => {
        const active =
          button.dataset
            .nextCustomerPanelToggle
          === openKey;

        button.classList.toggle(
          "is-active",
          active
        );

        button.setAttribute(
          "aria-expanded",
          active
            ? "true"
            : "false"
        );
      });

    const close =
      buttonRoot.querySelector(
        "[data-next-customer-panel-close]"
      );

    if (close) {
      close.hidden =
        !openKey;
    }
  }

  function toggleCustomerPanel(
    key,
    forceOpen = false
  ) {
    const editor =
      document.getElementById(
        "nextCustomerProfileEditor"
      );

    if (!editor) return;

    const target =
      editor.querySelector(
        `[data-next-customer-panel="${key}"]`
      );

    if (!target) return;

    const opening =
      forceOpen
      || target.hidden;

    editor
      .querySelectorAll(
        "[data-next-customer-panel]"
      )
      .forEach(panel => {
        panel.hidden =
          panel !== target
          || !opening;
      });

    syncCustomerPanelButtons(
      editor
    );
  }

  function mountCustomerPanels() {
    const editor =
      document.getElementById(
        "nextCustomerProfileEditor"
      );

    if (!editor) return;

    const card =
      editor.closest(
        ".next-notes-write-card.is-customer-scope"
      );

    const head =
      card?.querySelector(
        ".next-notes-write-head"
      );

    const source =
      head?.querySelector(
        "[data-next-customer-profile-open]"
      );

    if (source) {
      source.hidden = true;
    }

    const metaEditor =
      editor.querySelector(
        "[data-next-profile-meta-editor]"
      );

    const namesPanel =
      wrapCustomerPanel(
        metaEditor,
        "names"
      );

    const generalNotes =
      document.getElementById(
        "nextCustomerGeneralNotes"
      );

    const notesPanel =
      wrapCustomerPanel(
        generalNotes?.closest(
          ".next-notes-write-field"
        ),
        "notes"
      );

    const featureForm =
      editor.querySelector(
        ".next-customer-feature-form"
      );

    const featuresPanel =
      wrapCustomerPanel(
        featureForm,
        "features"
      );

    let actions =
      card?.querySelector(
        "[data-next-customer-panel-actions]"
      );

    if (
      !actions
      && head
    ) {
      actions =
        document.createElement(
          "div"
        );

      actions.className =
        "next-customer-panel-actions";

      actions.dataset
        .nextCustomerPanelActions =
        "true";

      actions.innerHTML = `
        <button
          type="button"
          data-next-customer-panel-toggle="names"
          aria-expanded="false"
        >
          名前を編集
        </button>

        <button
          type="button"
          data-next-customer-panel-toggle="notes"
          aria-expanded="false"
        >
          共通メモを編集
        </button>

        <button
          type="button"
          data-next-customer-panel-toggle="features"
          aria-expanded="false"
        >
          顧客特徴を編集
        </button>
      `;
    }

    ensureCustomerActionsClose(
      actions
    );

    if (
      actions
      && head
      && head.nextElementSibling
        !== actions
    ) {
      head.insertAdjacentElement(
        "afterend",
        actions
      );
    }

    if (namesPanel) {
      if (
        editor.firstElementChild
        !== namesPanel
      ) {
        editor.prepend(
          namesPanel
        );
      }

      if (
        notesPanel
        && namesPanel.nextElementSibling
          !== notesPanel
      ) {
        namesPanel.insertAdjacentElement(
          "afterend",
          notesPanel
        );
      }
    } else if (
      notesPanel
      && editor.firstElementChild
        !== notesPanel
    ) {
      editor.prepend(
        notesPanel
      );
    }

    if (
      notesPanel
      && featuresPanel
      && notesPanel.nextElementSibling
        !== featuresPanel
    ) {
      notesPanel.insertAdjacentElement(
        "afterend",
        featuresPanel
      );
    }

    const requested =
      editor.dataset
        .nextRequestedCustomerPanel
      || "";

    if (
      requested
      && editor.querySelector(
        `[data-next-customer-panel="${requested}"]`
      )
    ) {
      editor.hidden = false;

      toggleCustomerPanel(
        requested,
        true
      );

      delete editor.dataset
        .nextRequestedCustomerPanel;
    }

    syncCustomerPanelButtons(
      editor
    );
  }

  const SERVICE_PLACE_HISTORY_START =
    "2026-09-19";

  const DIARY_HISTORY_START =
    "2026-08-24";

  function pastVisitBusinessDate(value) {
    const text =
      String(value || "");

    const parts =
      text.slice(0, 10)
        .split("-")
        .map(Number);

    const hour =
      Number(
        text.slice(11, 13)
      );

    if (
      parts.length !== 3
      || !parts[0]
      || !parts[1]
      || !parts[2]
    ) {
      return text.slice(0, 10);
    }

    const date =
      new Date(
        parts[0],
        parts[1] - 1,
        parts[2],
        12,
        0,
        0,
        0
      );

    if (
      Number.isFinite(hour)
      && hour >= 0
      && hour < 3
    ) {
      date.setDate(
        date.getDate() - 1
      );
    }

    return [
      date.getFullYear(),
      String(
        date.getMonth() + 1
      ).padStart(2, "0"),
      String(
        date.getDate()
      ).padStart(2, "0"),
    ].join("-");
  }

  function pastVisitServicePlace(visit) {
    const value =
      String(
        visit?.service_place
        || ""
      ).trim();

    const label = ({
      hotel:"ホテル",
      room:"ルーム",
      home:"自宅",
    })[value];

    if (label) {
      return {
        label,
        shortLabel:label,
        isHistoricalGap:false,
      };
    }

    const businessDate =
      pastVisitBusinessDate(
        visit?.started_at
      );

    if (
      businessDate
      && businessDate
        < SERVICE_PLACE_HISTORY_START
    ) {
      return {
        label:
          "26.9.19より過去の予約のため履歴なし",
        shortLabel:"履歴なし",
        isHistoricalGap:true,
      };
    }

    return {
      label:"未登録",
      shortLabel:"未登録",
      isHistoricalGap:false,
    };
  }

  function pastVisitHasDiary(visit) {
    return Boolean(
      String(
        visit?.heaven_diary_body
        || visit?.diary_body
        || visit?.diary_note_body
        || ""
      ).trim()
    );
  }


  function pastVisitDiaryText(visit) {
    const diary =
      String(
        visit?.heaven_diary_body
        || visit?.diary_body
        || visit?.diary_note_body
        || ""
      ).trim();

    if (diary) {
      return {
        text:diary,
        isHistoricalGap:false,
      };
    }

    const businessDate =
      pastVisitBusinessDate(
        visit?.started_at
      );

    if (
      businessDate
      && businessDate
        < DIARY_HISTORY_START
    ) {
      return {
        text:
          "26.8.24より過去の予約のため履歴なし",
        isHistoricalGap:true,
      };
    }

    return {
      text:"日記なし",
      isHistoricalGap:false,
    };
  }

  function formatPastVisitDate(value) {
    const text =
      String(value || "");

    const date =
      pastVisitBusinessDate(
        text
      ).split("-");

    const time =
      text.slice(11, 16);

    if (
      date.length === 3
      && date[1]
      && date[2]
    ) {
      return `${Number(date[1])}/${Number(date[2])} ${time}`;
    }

    return text || "日時不明";
  }

  function formatPastVisitTimestamp(
    value
  ) {
    const text =
      String(value || "");

    const date =
      text.slice(0, 10)
        .split("-");

    const time =
      text.slice(11, 16);

    if (
      date.length === 3
      && date[1]
      && date[2]
    ) {
      return `${Number(date[1])}/${Number(date[2])} ${time}`;
    }

    return text || "日時不明";
  }

  function renderPastVisitHistory() {
    const tools =
      body.querySelector(
        "[data-next-notes-write-tools]"
      );

    const current =
      currentVisit();

    const old =
      tools?.querySelector(
        "[data-next-customer-past-visits]"
      );

    if (
      !tools
      || !current
      || !profile
      || profileCustomerId
        !== currentCustomerId()
    ) {
      old?.remove();
      return;
    }

    const currentStarted =
      String(
        current.started_at
        || ""
      );

    const visits =
      (
        Array.isArray(profile.visits)
          ? profile.visits
          : []
      )
      .filter(visit => {
        if (
          Number(visit.id)
          === Number(current.id)
        ) {
          return false;
        }

        if (
          currentStarted
          && String(
            visit.started_at || ""
          ) >= currentStarted
        ) {
          return false;
        }

        return true;
      })
      .slice(0, 5);

    if (!visits.length) {
      old?.remove();
      return;
    }

    const history =
      old
      || document.createElement(
        "section"
      );

    history.className =
      "next-customer-past-visits";

    history.dataset
      .nextCustomerPastVisits =
      "true";

    const renderKey =
      JSON.stringify(
        visits.map(visit => [
          visit.id,
          visit.started_at,
          visit.store_name,
          visit.course_minutes,
          visit.service_place,
          visit.status,
          visit.cancelled_at,
          visit.cancel_reason,
          visit.cancelled_by,
          visit.heaven_diary_body,
          visit.diary_body,
          visit.diary_note_body,
          visit.customer_features,
          visit.conversation_notes,
          visit.visit_notes,
        ])
      );

    const historyHtml = `
      <div class="next-past-visits-head">
        <span>PAST VISITS</span>
        <strong>過去の予約</strong>
      </div>

      <div class="next-past-visits-list">
        ${
          visits
            .map(visit => {
              const diary =
                pastVisitDiaryText(
                  visit
                );

              const servicePlace =
                pastVisitServicePlace(
                  visit
                );

              const canBackfillServicePlace =
                servicePlace.isHistoricalGap
                && pastVisitHasDiary(
                  visit
                );

              const cancelled =
                Boolean(
                  visit.status
                    === "cancelled"
                  || visit.cancelled_at
                );

              const cancelType =
                visit.cancelled_by
                  === "customer"
                  ? "お客様キャンセル"
                  : "キャンセル";

              const cancelReason =
                String(
                  visit.cancel_reason
                  || ""
                ).trim()
                || "理由なし";

              const cancellationHtml =
                cancelled
                  ? `
                    <article class="next-past-visit-cancellation">
                      <span>キャンセル</span>
                      <p>
                        <strong>${escapeHtml(
                          cancelType
                        )}</strong>
                        <span>${escapeHtml(
                          cancelReason
                        )}</span>
                        ${
                          visit.cancelled_at
                            ? `
                              <small>
                                取消:
                                ${escapeHtml(
                                  formatPastVisitTimestamp(
                                    visit.cancelled_at
                                  )
                                )}
                              </small>
                            `
                            : ""
                        }
                      </p>
                    </article>
                  `
                  : "";

              const memos = [
                [
                  "特徴メモ",
                  visit.customer_features,
                ],
                [
                  "会話メモ",
                  visit.conversation_notes,
                ],
                [
                  "来店メモ",
                  visit.visit_notes,
                ],
              ]
                .filter(
                  ([, value]) =>
                    String(
                      value || ""
                    ).trim()
                );

              const memoHtml =
                memos.length
                  ? memos
                      .map(
                        ([label, value]) => `
                          <p>
                            <strong>${escapeHtml(label)}</strong>
                            <span>${escapeHtml(value)}</span>
                          </p>
                        `
                      )
                      .join("")
                  : `
                    <p class="next-past-visit-empty">
                      予約メモなし
                    </p>
                  `;

              return `
                <details class="next-past-visit${cancelled ? " is-cancelled" : ""}">
                  <summary>
                    <span class="next-past-visit-date">
                      ${escapeHtml(
                        formatPastVisitDate(
                          visit.started_at
                        )
                      )}
                      ${
                        cancelled
                          ? `
                            <em class="next-past-visit-cancelled-badge">
                              キャンセル
                            </em>
                          `
                          : ""
                      }
                    </span>

                    <small>
                      ${escapeHtml(
                        visit.store_name
                        || ""
                      )}
                      ${
                        visit.course_minutes
                          ? ` / ${Number(visit.course_minutes)}分`
                          : ""
                      }
                      / ${escapeHtml(
                        servicePlace.shortLabel
                      )}
                    </small>
                  </summary>

                  <div class="next-past-visit-grid">
                    ${cancellationHtml}

                    <article class="next-past-visit-place">
                      <span>接客場所</span>
                      <p class="${
                        servicePlace.isHistoricalGap
                          ? "next-past-visit-empty"
                          : ""
                      }">
                        ${escapeHtml(
                          servicePlace.label
                        )}
                      </p>

                      ${
                        canBackfillServicePlace
                          ? `
                            <div
                              class="next-past-service-place-actions"
                              role="group"
                              aria-label="過去予約の接客場所"
                            >
                              <button
                                type="button"
                                data-next-past-service-place-visit="${Number(visit.id)}"
                                data-next-past-service-place-value="hotel"
                              >
                                ホテル
                              </button>

                              <button
                                type="button"
                                data-next-past-service-place-visit="${Number(visit.id)}"
                                data-next-past-service-place-value="room"
                              >
                                ルーム
                              </button>

                              <button
                                type="button"
                                data-next-past-service-place-visit="${Number(visit.id)}"
                                data-next-past-service-place-value="home"
                              >
                                自宅
                              </button>
                            </div>

                            <small
                              class="next-past-service-place-status"
                              data-next-past-service-place-status="${Number(visit.id)}"
                              aria-live="polite"
                            >
                              日記を確認して選択
                            </small>
                          `
                          : ""
                      }
                    </article>

                    <article>
                      <span>日記</span>
                      <p class="${
                        diary.isHistoricalGap
                          ? "next-past-visit-empty"
                          : ""
                      }">
                        ${escapeHtml(
                          diary.text
                        )}
                      </p>
                    </article>

                    <article>
                      <span>予約メモ</span>
                      ${memoHtml}
                    </article>
                  </div>
                </details>
              `;
            })
            .join("")
        }
      </div>
    `;

    if (
      history.dataset
        .nextPastVisitsRenderKey
      !== renderKey
    ) {
      history.innerHTML =
        historyHtml;

      history.dataset
        .nextPastVisitsRenderKey =
        renderKey;
    }

    const customerCard =
      tools.querySelector(
        ".next-notes-write-card.is-customer-scope"
      );

    if (
      !old
      && customerCard
    ) {
      customerCard.insertAdjacentElement(
        "afterend",
        history
      );
    }
  }

  async function savePastVisitServicePlace(
    visitId,
    value
  ) {
    const allowed =
      new Set([
        "hotel",
        "room",
        "home",
      ]);

    if (
      !Number.isInteger(visitId)
      || visitId <= 0
      || !allowed.has(value)
    ) {
      return;
    }

    const sourceVisit =
      (
        Array.isArray(
          profile?.visits
        )
          ? profile.visits
          : []
      )
      .find(
        visit =>
          Number(visit.id)
          === visitId
      )
      || null;

    if (
      !sourceVisit
      || !pastVisitHasDiary(
        sourceVisit
      )
      || !pastVisitServicePlace(
        sourceVisit
      ).isHistoricalGap
    ) {
      return;
    }

    const buttons =
      Array.from(
        body.querySelectorAll(
          `[data-next-past-service-place-visit="${visitId}"]`
        )
      );

    const status =
      body.querySelector(
        `[data-next-past-service-place-status="${visitId}"]`
      );

    buttons.forEach(button => {
      button.disabled = true;
    });

    if (status) {
      status.textContent =
        "保存中…";
    }

    setWriteStatus(
      "PRODUCTION DB / WRITING",
      "writing"
    );

    try {
      const data =
        await requestJson(
          SCHEDULE_API,
          {
            method:"PATCH",
            headers:{
              "Content-Type":
                "application/json",
            },
            body:JSON.stringify({
              id:visitId,
              service_place:value,
            }),
          }
        );

      const updated =
        data.visit
        || {};

      Object.assign(
        sourceVisit,
        updated
      );

      sourceVisit.service_place =
        value;

      const scheduleIndex =
        scheduleApi.state.visits
          .findIndex(
            visit =>
              Number(visit.id)
              === visitId
          );

      if (scheduleIndex >= 0) {
        scheduleApi.state.visits[
          scheduleIndex
        ] = {
          ...scheduleApi.state.visits[
            scheduleIndex
          ],
          ...updated,
          service_place:value,
        };
      }

      renderPastVisitHistory();

      setWriteStatus(
        "✓ SAVED / PRODUCTION",
        "saved"
      );

    } catch (error) {
      buttons.forEach(button => {
        button.disabled = false;
      });

      if (status) {
        status.textContent =
          error.message
          || "保存できませんでした。";
      }

      setWriteStatus(
        error.message
        || "接客場所を保存できませんでした。",
        "error"
      );
    }
  }


  function seedGeneralNotes() {
    const textarea =
      document.getElementById(
        "nextCustomerGeneralNotes"
      );

    const customerId =
      currentCustomerId();

    if (
      !textarea
      || !customerId
    ) {
      return;
    }

    const ready =
      Boolean(
        profile
        && profileCustomerId
          === customerId
      );

    textarea.disabled =
      !ready;

    if (!ready) {
      textarea.placeholder =
        "顧客情報を読み込み中…";
      return;
    }

    textarea.placeholder =
      "次回以降も覚えておきたいこと";

    if (
      textarea.dataset
        .nextMobileSeededCustomer
      === String(customerId)
    ) {
      return;
    }

    textarea.value =
      profile.general_notes
      || "";

    textarea.dataset
      .nextMobileSeededCustomer =
      String(customerId);
  }

  function hideLegacyAreaSummary() {
    body
      .querySelectorAll(
        ".next-customer-feature-item"
      )
      .forEach(item => {
        const label =
          item.querySelector("strong")
            ?.textContent
            ?.trim()
          || "";

        if (label === "エリア") {
          item.hidden = true;
        }
      });
  }

  function renderProfileSummary() {
    const summary =
      document.getElementById(
        "nextCustomerProfileSummary"
      );

    if (
      !summary
      || !profile
    ) {
      return;
    }

    const general =
      summary.querySelector(
        ".next-customer-profile-general"
      );

    if (general) {
      general.textContent =
        profile.general_notes
        || "顧客共通メモなし";
    }

    const list =
      summary.querySelector(
        ".next-customer-feature-list"
      );

    if (!list) return;

    const features =
      (
        Array.isArray(
          profile.identity_features
        )
          ? profile.identity_features
          : []
      )
      .filter(
        feature =>
          feature?.feature_type
          !== "area"
      );

    const daysOff =
      features.find(
        feature =>
          feature?.feature_type
          === "days_off"
      )
      || null;

    const daysOffMissing =
      String(
        daysOff?.feature_value
        || ""
      ).trim() === "";

    const missingDaysOffHtml =
      daysOffMissing
        ? `
          <article
            class="next-customer-feature-item is-required-missing"
            data-next-required-field="days_off"
          >
            <div>
              <strong>休日</strong>
              <span>未入力</span>
              <small>
                次回予約の確認用に入力してね
              </small>
            </div>
          </article>
        `
        : "";

    const featureHtml =
      features.length
        ? features
            .map(feature => {
              const label =
                FEATURE_TYPES.find(
                  ([type]) =>
                    type
                    === feature.feature_type
                )?.[1]
                || feature.feature_type
                || "特徴";

              return `
                <article class="next-customer-feature-item">
                  <div>
                    <strong>
                      ${escapeHtml(label)}
                    </strong>
                    <span>
                      ${escapeHtml(
                        feature.feature_value
                        || ""
                      )}
                    </span>
                    ${
                      feature.note
                        ? `
                          <small>
                            ${escapeHtml(feature.note)}
                          </small>
                        `
                        : ""
                    }
                  </div>
                </article>
              `;
            })
            .join("")
        : `
          <p class="next-customer-feature-empty">
            顧客特徴はまだ登録されていません。
          </p>
        `;

    list.innerHTML =
      missingDaysOffHtml
      + featureHtml;

    moveVisitorQuickToCustomerSummary();
    syncRequiredCustomerFields();
  }


  async function saveVisitNotes(
    visit
  ) {
    const feature =
      document.getElementById(
        "nextVisitCustomerFeatures"
      );

    const conversation =
      document.getElementById(
        "nextVisitConversationNotes"
      );

    const notes =
      document.getElementById(
        "nextVisitNotes"
      );

    if (
      !feature
      || !conversation
      || !notes
    ) {
      return false;
    }

    const next = {
      customer_features:
        feature.value,
      conversation_notes:
        conversation.value,
      visit_notes:
        notes.value,
    };

    const same =
      String(
        visit.customer_features
        || ""
      ) === next.customer_features
      && String(
        visit.conversation_notes
        || ""
      ) === next.conversation_notes
      && String(
        visit.visit_notes
        || ""
      ) === next.visit_notes;

    if (same) {
      return false;
    }

    const data =
      await requestJson(
        VISIT_NOTES_API,
        {
          method:"PATCH",
          headers:{
            "Content-Type":
              "application/json",
          },
          body:JSON.stringify({
            id:Number(visit.id),
            ...next,
          }),
        }
      );

    const updated =
      data.visit
      || {};

    Object.assign(
      visit,
      {
        customer_features:
          updated.customer_features
          ?? null,
        conversation_notes:
          updated.conversation_notes
          ?? null,
        visit_notes:
          updated.visit_notes
          ?? null,
        updated_at:
          updated.updated_at
          || visit.updated_at,
      }
    );

    const values = {
      "今回の特徴メモ":
        visit.customer_features,
      "今回の会話メモ":
        visit.conversation_notes,
      "今回の来店メモ":
        visit.visit_notes,
    };

    body
      .querySelectorAll(
        ".next-schedule-complete-note"
      )
      .forEach(card => {
        const label =
          card.querySelector("span")
            ?.textContent
            ?.trim()
          || "";

        if (
          !Object.prototype
            .hasOwnProperty.call(
              values,
              label
            )
        ) {
          return;
        }

        const target =
          card.querySelector("p");

        if (target) {
          target.textContent =
            values[label]
            || "なし";
        }
      });

    return true;
  }

  async function saveGeneralNotes(
    customerId
  ) {
    const textarea =
      document.getElementById(
        "nextCustomerGeneralNotes"
      );

    if (!textarea) {
      return false;
    }

    const value =
      textarea.value.trim();

    const current =
      String(
        profile?.general_notes
        || ""
      ).trim();

    if (value === current) {
      return false;
    }

    const data =
      await requestJson(
        PROFILE_API,
        {
          method:"PATCH",
          headers:{
            "Content-Type":
              "application/json",
          },
          body:JSON.stringify({
            id:customerId,
            general_notes:value,
          }),
        }
      );

    profile =
      data.customer
      || profile;

    profileCustomerId =
      customerId;

    return true;
  }

  function inputForType(type) {
    if (type === "area") {
      return body.querySelector(
        "[data-next-customer-area-input]"
      );
    }

    return body.querySelector(
      `[data-next-batch-feature-type="${type}"]`
    );
  }

  async function saveFeatureType(
    customerId,
    type
  ) {
    const input =
      inputForType(type);

    if (!input) {
      return false;
    }

    const records =
      recordsForType(type);

    if (records.length > 1) {
      throw new Error(
        "同じ特徴カテゴリに複数の登録があるため保存を停止しました。"
      );
    }

    const record =
      records[0]
      || null;

    const value =
      input.value.trim();

    const current =
      String(
        record?.feature_value
        || ""
      ).trim();

    if (
      value === current
    ) {
      return false;
    }

    let payload;

    if (
      value === ""
      && record
    ) {
      payload = {
        id:customerId,
        feature_id:
          Number(record.id),
        delete_feature:true,
      };

    } else if (value !== "") {
      payload = {
        id:customerId,
        feature_type:type,
        feature_value:value,
        feature_note:
          record?.note
          || "",
      };

      if (record?.id) {
        payload.feature_id =
          Number(record.id);
      }

    } else {
      return false;
    }

    const data =
      await requestJson(
        PROFILE_API,
        {
          method:"PATCH",
          headers:{
            "Content-Type":
              "application/json",
          },
          body:JSON.stringify(
            payload
          ),
        }
      );

    profile =
      data.customer
      || profile;

    profileCustomerId =
      customerId;

    return true;
  }

  function storeAutosaveProfile(
    customerId,
    nextProfile
  ) {
    if (!nextProfile) return;

    autosaveProfileCache.set(
      customerId,
      nextProfile
    );

    if (
      currentCustomerId()
      === customerId
    ) {
      profile =
        nextProfile;

      profileCustomerId =
        customerId;
    }
  }

  async function profileForAutosave(
    customerId
  ) {
    if (
      profile
      && profileCustomerId
        === customerId
    ) {
      return profile;
    }

    if (
      autosaveProfileCache.has(
        customerId
      )
    ) {
      return autosaveProfileCache.get(
        customerId
      );
    }

    const data =
      await requestJson(
        `${PROFILE_API}?id=${encodeURIComponent(
          String(customerId)
        )}`,
        {
          method:"GET",
        }
      );

    const value =
      data.customer
      || null;

    if (value) {
      autosaveProfileCache.set(
        customerId,
        value
      );
    }

    return value;
  }

  function captureAutosaveTask(
    target
  ) {
    if (
      !(target instanceof Element)
    ) {
      return null;
    }

    const visit =
      currentVisit();

    if (!visit) {
      return null;
    }

    const visitId =
      Number(
        visit.id
        || 0
      );

    if (
      target.matches(
        "#nextVisitCustomerFeatures,"
        + "#nextVisitConversationNotes,"
        + "#nextVisitNotes"
      )
    ) {
      const feature =
        document.getElementById(
          "nextVisitCustomerFeatures"
        );

      const conversation =
        document.getElementById(
          "nextVisitConversationNotes"
        );

      const notes =
        document.getElementById(
          "nextVisitNotes"
        );

      if (
        !feature
        || !conversation
        || !notes
      ) {
        return null;
      }

      return {
        key:`visit:${visitId}`,
        kind:"visit",
        visit,
        visitId,
        values:{
          customer_features:
            feature.value,
          conversation_notes:
            conversation.value,
          visit_notes:
            notes.value,
        },
      };
    }

    const customerId =
      Number(
        visit.customer_id
        || 0
      );

    if (!customerId) {
      return null;
    }

    if (
      target.matches(
        "#nextCustomerGeneralNotes"
      )
    ) {
      return {
        key:
          `customer:${customerId}:general`,
        kind:"general",
        customerId,
        value:
          target.value.trim(),
      };
    }

    if (
      target.matches(
        "[data-next-customer-area-input]"
      )
    ) {
      return {
        key:
          `customer:${customerId}:feature:area`,
        kind:"feature",
        customerId,
        type:"area",
        value:
          target.value.trim(),
      };
    }

    if (
      target.matches(
        "[data-next-batch-feature-type]"
      )
    ) {
      const type =
        target.dataset
          .nextBatchFeatureType
        || "";

      if (!type) return null;

      return {
        key:
          `customer:${customerId}:feature:${type}`,
        kind:"feature",
        customerId,
        type,
        value:
          target.value.trim(),
      };
    }

    return null;
  }

  async function saveVisitAutosaveTask(
    task
  ) {
    const next =
      task.values;

    const same =
      String(
        task.visit.customer_features
        || ""
      ) === next.customer_features
      && String(
        task.visit.conversation_notes
        || ""
      ) === next.conversation_notes
      && String(
        task.visit.visit_notes
        || ""
      ) === next.visit_notes;

    if (same) {
      return false;
    }

    const data =
      await requestJson(
        VISIT_NOTES_API,
        {
          method:"PATCH",
          headers:{
            "Content-Type":
              "application/json",
          },
          body:JSON.stringify({
            id:task.visitId,
            ...next,
          }),
        }
      );

    const updated =
      data.visit
      || {};

    Object.assign(
      task.visit,
      {
        customer_features:
          updated.customer_features
          ?? null,
        conversation_notes:
          updated.conversation_notes
          ?? null,
        visit_notes:
          updated.visit_notes
          ?? null,
        updated_at:
          updated.updated_at
          || task.visit.updated_at,
      }
    );

    if (
      Number(
        currentVisit()?.id
        || 0
      ) === task.visitId
    ) {
      const values = {
        "今回の特徴メモ":
          task.visit.customer_features,
        "今回の会話メモ":
          task.visit.conversation_notes,
        "今回の来店メモ":
          task.visit.visit_notes,
      };

      body
        .querySelectorAll(
          ".next-schedule-complete-note"
        )
        .forEach(card => {
          const label =
            card.querySelector("span")
              ?.textContent
              ?.trim()
            || "";

          if (
            !Object.prototype
              .hasOwnProperty.call(
                values,
                label
              )
          ) {
            return;
          }

          const target =
            card.querySelector("p");

          if (target) {
            target.textContent =
              values[label]
              || "なし";
          }
        });
    }

    return true;
  }

  async function saveGeneralAutosaveTask(
    task
  ) {
    const source =
      await profileForAutosave(
        task.customerId
      );

    const current =
      String(
        source?.general_notes
        || ""
      ).trim();

    if (
      current === task.value
    ) {
      return false;
    }

    const data =
      await requestJson(
        PROFILE_API,
        {
          method:"PATCH",
          headers:{
            "Content-Type":
              "application/json",
          },
          body:JSON.stringify({
            id:task.customerId,
            general_notes:
              task.value,
          }),
        }
      );

    storeAutosaveProfile(
      task.customerId,
      data.customer
      || source
    );

    return true;
  }

  async function saveFeatureAutosaveTask(
    task
  ) {
    const source =
      await profileForAutosave(
        task.customerId
      );

    const records =
      recordsForType(
        task.type,
        source
      );

    if (
      records.length > 1
    ) {
      throw new Error(
        "同じ特徴カテゴリに複数の登録があるため自動保存を停止しました。"
      );
    }

    const record =
      records[0]
      || null;

    const current =
      String(
        record?.feature_value
        || ""
      ).trim();

    if (
      current === task.value
    ) {
      return false;
    }

    let payload;

    if (
      task.value === ""
      && record
    ) {
      payload = {
        id:task.customerId,
        feature_id:
          Number(record.id),
        delete_feature:true,
      };

    } else if (
      task.value !== ""
    ) {
      payload = {
        id:task.customerId,
        feature_type:
          task.type,
        feature_value:
          task.value,
        feature_note:
          record?.note
          || "",
      };

      if (record?.id) {
        payload.feature_id =
          Number(record.id);
      }

    } else {
      return false;
    }

    const data =
      await requestJson(
        PROFILE_API,
        {
          method:"PATCH",
          headers:{
            "Content-Type":
              "application/json",
          },
          body:JSON.stringify(
            payload
          ),
        }
      );

    storeAutosaveProfile(
      task.customerId,
      data.customer
      || source
    );

    return true;
  }

  async function saveAutosaveBatch(
    tasks
  ) {
    if (!tasks.length) {
      return;
    }

    const currentVisitId =
      Number(
        currentVisit()?.id
        || 0
      );

    const currentCustomer =
      currentCustomerId();

    const relevant =
      tasks.some(task =>
        (
          task.visitId
          && task.visitId
            === currentVisitId
        )
        || (
          task.customerId
          && task.customerId
            === currentCustomer
        )
      );

    const statusVersion =
      ++autosaveStatusVersion;

    if (relevant) {
      setWriteStatus(
        "AUTO SAVE / WRITING",
        "writing"
      );
    }

    let changed = 0;

    try {
      for (
        const task
        of tasks
      ) {
        let didChange = false;

        if (
          task.kind === "visit"
        ) {
          didChange =
            await saveVisitAutosaveTask(
              task
            );

        } else if (
          task.kind === "general"
        ) {
          didChange =
            await saveGeneralAutosaveTask(
              task
            );

        } else if (
          task.kind === "feature"
        ) {
          didChange =
            await saveFeatureAutosaveTask(
              task
            );
        }

        if (didChange) {
          changed += 1;
        }
      }

      if (
        relevant
        && changed
      ) {
        renderProfileSummary();
        mountAreaInput();
        syncRequiredCustomerFields();

        setWriteStatus(
          "✓ AUTO SAVED / PRODUCTION",
          "saved"
        );

        window.setTimeout(
          () => {
            if (
              autosaveStatusVersion
                === statusVersion
            ) {
              setWriteStatus(
                "PRODUCTION DB / EDIT READY",
                ""
              );
            }
          },
          1600
        );
      } else if (relevant) {
        setWriteStatus(
          "PRODUCTION DB / EDIT READY",
          ""
        );
      }

    } catch (error) {
      console.error(
        "Kohaku autosave failed:",
        error
      );

      if (relevant) {
        setWriteStatus(
          error.message
          || "自動保存できませんでした。",
          "error"
        );
      }
    }
  }

  function queueAutosaveForTarget(
    target,
    delay = AUTOSAVE_DELAY
  ) {
    const task =
      captureAutosaveTask(
        target
      );

    if (!task) {
      return;
    }

    pendingAutosaves.set(
      task.key,
      task
    );

    setHeaderSaveIndicator(
      "mobile",
      "pending"
    );

    if (autosaveTimer) {
      window.clearTimeout(
        autosaveTimer
      );
    }

    autosaveTimer =
      window.setTimeout(
        () => {
          autosaveTimer = 0;
          void flushAutosaves();
        },
        delay
      );
  }

  function flushAutosaves() {
    if (autosaveTimer) {
      window.clearTimeout(
        autosaveTimer
      );

      autosaveTimer = 0;
    }

    if (
      pendingAutosaves.size
      === 0
    ) {
      return autosaveChain;
    }

    const tasks =
      Array.from(
        pendingAutosaves.values()
      );

    pendingAutosaves.clear();

    autosaveChain =
      autosaveChain
        .catch(() => {})
        .then(
          () =>
            saveAutosaveBatch(
              tasks
            )
        );

    return autosaveChain;
  }

  function mountEnhancements() {
    resetProfileIfNeeded();

    mountHeaderSaveIndicator();
    renderHeaderSaveIndicator();

    mountHeaderEditButton();
    mountHeaderVisitNotesButton();
    mountHeaderDeleteButton();
    mountReservationToggle();
    mountAreaInput();
    hideLegacyAreaSummary();
    mountCustomerPanels();
    renderProfileSummary();
    moveVisitorQuickToCustomerSummary();
    syncRequiredCustomerFields();
    renderPastVisitHistory();

    const customerId =
      currentCustomerId();

    if (customerId) {
      void ensureProfile()
        .then(() => {
          if (
            currentCustomerId()
            !== customerId
          ) {
            return;
          }

          mountAreaInput();
          seedGeneralNotes();
          mountBatchFeatureEditor();
          mountCustomerPanels();
          renderProfileSummary();
          moveVisitorQuickToCustomerSummary();
          syncRequiredCustomerFields();
          renderPastVisitHistory();
          hideLegacyAreaSummary();
        })
        .catch(error => {
          console.error(
            "Customer profile quick flow load failed:",
            error
          );
        });
    }

    syncHeaderEditButton();
    syncHeaderVisitNotesButton();
    syncHeaderDeleteButton();
  }

  function queueMount() {
    if (mountQueued) return;

    mountQueued = true;

    queueMicrotask(() => {
      mountQueued = false;
      mountEnhancements();
    });
  }

  document.addEventListener(
    "click",
    event => {
      const pastServicePlace =
        event.target.closest(
          "[data-next-past-service-place-value]"
        );

      if (pastServicePlace) {
        event.preventDefault();

        const visitId =
          Number(
            pastServicePlace.dataset
              .nextPastServicePlaceVisit
            || 0
          );

        const value =
          pastServicePlace.dataset
            .nextPastServicePlaceValue
          || "";

        void savePastVisitServicePlace(
          visitId,
          value
        );

        return;
      }

      const reservation =
        event.target.closest(
          '[data-next-detail-heading="reservation"]'
        );

      if (reservation) {
        event.preventDefault();
        toggleReservation(
          reservation
        );
        return;
      }

      const headerVisitNotes =
        event.target.closest(
          "[data-next-header-visit-notes]"
        );

      if (headerVisitNotes) {
        event.preventDefault();

        const source =
          body.querySelector(
            "[data-next-visit-notes-open]"
          );

        const editor =
          document.getElementById(
            "nextVisitNotesEditor"
          );

        if (
          !source
          || source.disabled
          || !editor
        ) {
          return;
        }

        if (editor.hidden) {
          source.click();
        }

        window.setTimeout(() => {
          editor.scrollIntoView({
            behavior:"smooth",
            block:"center",
          });
        }, 30);

        return;
      }

      const customerPanelClose =
        event.target.closest(
          "[data-next-customer-panel-close]"
        );

      if (customerPanelClose) {
        event.preventDefault();

        const card =
          customerPanelClose.closest(
            ".next-notes-write-card.is-customer-scope"
          );

        const editor =
          card?.querySelector(
            "#nextCustomerProfileEditor"
          );

        if (!editor) {
          return;
        }

        editor
          .querySelectorAll(
            "[data-next-customer-panel]"
          )
          .forEach(panel => {
            panel.hidden = true;
          });

        editor.hidden = true;

        syncCustomerPanelButtons(
          editor
        );

        return;
      }

      const customerPanelToggle =
        event.target.closest(
          "[data-next-customer-panel-toggle]"
        );

      if (customerPanelToggle) {
        event.preventDefault();

        const key =
          customerPanelToggle.dataset
            .nextCustomerPanelToggle
          || "";

        const source =
          body.querySelector(
            "[data-next-customer-profile-open]"
          );

        const editor =
          document.getElementById(
            "nextCustomerProfileEditor"
          );

        if (
          !key
          || !source
          || source.disabled
          || !editor
        ) {
          return;
        }

        editor.dataset
          .nextRequestedCustomerPanel =
          key;

        if (editor.hidden) {
          source.click();
        }

        mountCustomerPanels();

        customerPanelToggle
          .insertAdjacentElement(
            "afterend",
            editor
          );

        editor.hidden = false;

        void ensureProfile()
          .then(() => {
            seedGeneralNotes();
            mountBatchFeatureEditor();
            mountCustomerPanels();
            renderProfileSummary();
            moveVisitorQuickToCustomerSummary();
            syncRequiredCustomerFields();
          })
          .catch(error => {
            console.error(
              "Customer editor load failed:",
              error
            );
          });

        return;
      }

      const headerDelete =
        event.target.closest(
          "[data-next-header-delete]"
        );

      if (headerDelete) {
        event.preventDefault();

        const source =
          drawer.querySelector(
            ".next-schedule-detail-footer [data-next-schedule-delete]"
          );

        if (
          !source
          || source.disabled
        ) {
          return;
        }

        source.click();
        return;
      }

      const headerFeatures =
        event.target.closest(
          "[data-next-header-features]"
        );

      if (headerFeatures) {
        event.preventDefault();

        const source =
          body.querySelector(
            "[data-next-customer-profile-open]"
          );

        const editor =
          document.getElementById(
            "nextCustomerProfileEditor"
          );

        if (
          !source
          || source.disabled
          || !editor
        ) {
          return;
        }

        if (editor.hidden) {
          source.click();
        }

        void ensureProfile()
          .then(() => {
            mountBatchFeatureEditor();
            mountCustomerPanels();

            const featuresButton =
              body.querySelector(
                '[data-next-customer-panel-toggle="features"]'
              );

            if (featuresButton) {
              featuresButton
                .insertAdjacentElement(
                  "afterend",
                  editor
                );
            }

            editor.hidden = false;

            toggleCustomerPanel(
              "features",
              true
            );
          })
          .catch(error => {
            console.error(
              "Customer feature shortcut load failed:",
              error
            );
          });

        return;
      }

      const headerEdit =
        event.target.closest(
          "[data-next-header-edit]"
        );

      if (headerEdit) {
        event.preventDefault();

        const source =
          drawer.querySelector(
            ".next-schedule-detail-footer [data-next-schedule-edit-open]"
          );

        if (
          !source
          || source.disabled
        ) {
          return;
        }

        source.click();
        return;
      }

      // Customer/memo fields use autosave.
    }
  );

  document.addEventListener(
    "input",
    event => {
      if (event.isComposing) {
        return;
      }

      if (
        event.target.matches(
          "[data-next-customer-area-input],"
          + '[data-next-batch-feature-type="days_off"]'
        )
      ) {
        syncRequiredCustomerFields();
      }

      queueAutosaveForTarget(
        event.target,
        AUTOSAVE_DELAY
      );
    }
  );

  document.addEventListener(
    "compositionend",
    event => {
      queueAutosaveForTarget(
        event.target,
        AUTOSAVE_DELAY
      );
    }
  );

  document.addEventListener(
    "change",
    event => {
      queueAutosaveForTarget(
        event.target,
        0
      );
    }
  );

  document.addEventListener(
    "focusout",
    event => {
      queueAutosaveForTarget(
        event.target,
        0
      );

      void flushAutosaves();
    }
  );

  document.addEventListener(
    "pointerdown",
    event => {
      if (
        !drawer.classList.contains(
          "is-open"
        )
      ) {
        return;
      }

      const target =
        event.target;

      const closeRequest =
        target instanceof Element
        && Boolean(
          target.closest(
            "[data-next-schedule-detail-close]"
          )
          || target.id
            === "nextScheduleDetailBackdrop"
        );

      const outsideDrawer =
        target instanceof Node
        && !drawer.contains(target);

      if (
        closeRequest
        || outsideDrawer
      ) {
        void flushAutosaves();

        void window
          .KohakuWorkNextCustomerProfileFull
          ?.flushAutosave
          ?.();
      }
    },
    true
  );

  document.addEventListener(
    "keydown",
    event => {
      if (event.key === "Escape") {
        void flushAutosaves();

        void window
          .KohakuWorkNextCustomerProfileFull
          ?.flushAutosave
          ?.();
      }

      const reservation =
        event.target.closest(
          '[data-next-detail-heading="reservation"]'
        );

      if (
        !reservation
        || ![
          "Enter",
          " ",
        ].includes(event.key)
      ) {
        return;
      }

      event.preventDefault();

      toggleReservation(
        reservation
      );
    }
  );

  const bodyObserver =
    new MutationObserver(
      queueMount
    );

  bodyObserver.observe(
    body,
    {
      childList:true,
      subtree:true,
    }
  );

  const drawerObserver =
    new MutationObserver(
      queueMount
    );

  drawerObserver.observe(
    drawer,
    {
      attributes:true,
      attributeFilter:[
        "data-visit-id",
        "data-detail-loaded-id",
        "class",
      ],
    }
  );

  queueMount();

  window.KohakuWorkNextMobileFlow = {
    verificationReadEnabled:false,
    verificationWriteEnabled:false,
    productionWriteEnabled:true,
    autosaveEnabled:true,
    flushAutosaves,
  };
})();
