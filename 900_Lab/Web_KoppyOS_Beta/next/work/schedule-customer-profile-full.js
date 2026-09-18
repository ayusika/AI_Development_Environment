(() => {
  "use strict";

  const META_API = "/api/next/v1/customer-profile-meta.php";
  const S = window.KohakuWorkNextSchedule;
  const drawer = document.getElementById("nextScheduleDetailDrawer");
  const body = document.getElementById("nextScheduleDetailBody");

  if (!S || !S.state || !drawer || !body) {
    console.error("Kohaku Work NEXT full customer profile: required UI missing.");
    return;
  }

  const NAME_TYPES = [
    ["nickname", "呼び名"],
    ["kashikoi", "カシコイ"],
    ["okini_talk", "オキニトーク"],
    ["line", "LINE"],
    ["x", "X"],
    ["instagram", "Instagram"],
  ];

  const SOURCE_TYPES = [
    ["unknown", "不明"],
    ["heaven", "ヘブン"],
    ["x", "X"],
    ["instagram", "Instagram"],
    ["okini_talk", "オキニトーク"],
    ["store_site", "店舗サイト"],
    ["referral", "紹介"],
    ["review", "口コミ"],
    ["store_route", "店舗経由"],
    ["other", "その他"],
  ];

  let meta = null;
  let metaCustomerId = 0;
  let loadingCustomerId = 0;
  let failedCustomerId = 0;
  let loadToken = 0;

  const AUTOSAVE_DELAY = 800;

  let metaAutosaveTimer = 0;
  let pendingMetaDraft = null;

  let metaSaveChain =
    Promise.resolve();

  const metaCache =
    new Map();

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function currentVisit() {
    const visitId = Number(drawer.dataset.visitId || 0);
    if (!visitId) return null;
    return S.state.visits.find(visit => Number(visit.id) === visitId) || null;
  }

  function currentCustomerId() {
    return Number(currentVisit()?.customer_id || 0);
  }

  function sourceLabel(value) {
    return SOURCE_TYPES.find(([type]) => type === value)?.[1] || value || "不明";
  }

  function nameRecord(data, type) {
    const names = Array.isArray(data?.names) ? data.names : [];

    if (type === "nickname") {
      return names.find(item => item?.name_type === type && Number(item?.is_primary) === 1)
        || names.find(item => item?.name_type === type)
        || null;
    }

    return names.find(item => item?.name_type === type) || null;
  }

  function nameValue(data, type) {
    return String(nameRecord(data, type)?.name || "");
  }

  async function requestJson(url, options) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("顧客プロフィールAPIの応答を読めませんでした。");
    }

    if (!response.ok || !data || data.success !== true) {
      throw new Error(data?.error || "顧客プロフィールを処理できませんでした。");
    }

    return data;
  }

  function summaryHtml() {
    if (!meta) {
      return `<p class="ncpf-state">名義・初回流入元を読み込み中…</p>`;
    }

    const knownNames =
      NAME_TYPES
        .map(([type, label]) => ({
          type,
          label,
          value:nameValue(meta, type),
        }))
        .filter(item => item.value);

    const source =
      meta.acquisition_source || null;

    const hasSource =
      Boolean(
        source
        && (
          (
            source.source_type
            && source.source_type !== "unknown"
          )
          || source.source_detail
        )
      );

    const namesHtml =
      knownNames.length
        ? knownNames
            .map(item => `
              <span class="ncpf-summary-chip">
                <small>${escapeHtml(item.label)}</small>
                <strong>${escapeHtml(item.value)}</strong>
              </span>
            `)
            .join("")
        : `
          <span class="ncpf-summary-empty">
            名義情報はまだ登録されていません
          </span>
        `;

    return `
      <div class="ncpf-summary-compact">
        <div class="ncpf-summary-chips">
          ${namesHtml}
        </div>

        ${
          hasSource
            ? `
              <div class="ncpf-summary-source">
                <span>初回流入元</span>
                <strong>
                  ${escapeHtml(
                    sourceLabel(source?.source_type)
                  )}
                </strong>
                ${
                  source?.source_detail
                    ? `<small>${escapeHtml(source.source_detail)}</small>`
                    : ""
                }
              </div>
            `
            : ""
        }
      </div>
    `;
  }

  function renderSummary() {
    const host = document.querySelector("[data-next-profile-meta-summary]");
    if (!host) return;

    const html = summaryHtml();

    if (host.innerHTML === html) {
      return;
    }

    host.innerHTML = html;
  }

  function editorHtml() {
    const source = meta?.acquisition_source || null;

    const nameFields = NAME_TYPES.map(([type, label]) => `
      <label class="ncpf-field">
        <span>${escapeHtml(label)}</span>
        <input
          type="text"
          data-ncpf-name="${escapeHtml(type)}"
          value="${escapeHtml(nameValue(meta, type))}"
          placeholder="${escapeHtml(label)}"
        >
      </label>
    `).join("");

    const sourceOptions = SOURCE_TYPES.map(([value, label]) => `
      <option
        value="${escapeHtml(value)}"
        ${String(source?.source_type || "unknown") === value ? "selected" : ""}
      >${escapeHtml(label)}</option>
    `).join("");

    return `
      <div class="ncpf-section">
        <div class="ncpf-section-head">
          <div>
            <span>IDENTITY NAMES</span>
            <strong>名義情報</strong>
          </div>
          <small>呼び名・カシコイ・SNS名など</small>
        </div>
        <div class="ncpf-grid">${nameFields}</div>
      </div>

      <div class="ncpf-section">
        <div class="ncpf-section-head">
          <div>
            <span>ACQUISITION</span>
            <strong>初回流入元</strong>
          </div>
          <small>最初に知ったきっかけ</small>
        </div>
        <div class="ncpf-grid">
          <label class="ncpf-field">
            <span>きっかけ</span>
            <select id="nextCustomerAcquisitionSource">${sourceOptions}</select>
          </label>
          <label class="ncpf-field">
            <span>補足</span>
            <input
              id="nextCustomerAcquisitionDetail"
              type="text"
              value="${escapeHtml(source?.source_detail || "")}"
              placeholder="例：Xの投稿を見た、友人○○さんの紹介"
            >
          </label>
        </div>
      </div>

      <p class="ncpf-message" id="nextCustomerProfileMetaMessage" aria-live="polite"></p>
      <small class="ncpf-autosave-note">
        入力内容は自動保存されます。
      </small>
    `;
  }

  function renderEditor() {
    const host = document.querySelector("[data-next-profile-meta-editor]");
    if (host) host.innerHTML = editorHtml();
  }

  function updateVisitNames(data) {
    const visit = currentVisit();
    if (!visit) return;

    visit.customer_names = Array.isArray(data?.names) ? data.names : [];
    S.render({ preserveScroll: true });

    const title = document.getElementById("nextScheduleDetailTitle");
    if (!title) return;

    const names = NAME_TYPES.map(([type]) => {
      const value = nameValue(data, type);
      if (!value) return "";

      const prefix = type === "kashikoi"
        ? "カ:"
        : type === "okini_talk"
          ? "オ:"
          : type === "line"
            ? "L:"
            : type === "x"
              ? "X:"
              : type === "instagram"
                ? "I:"
                : "";

      return `${prefix}${value}`;
    }).filter(Boolean);

    if (names.length) title.textContent = names.join(" / ");
  }

  function mountHosts() {
    const customerId = currentCustomerId();
    const summary = document.getElementById("nextCustomerProfileSummary");
    const editor = document.getElementById("nextCustomerProfileEditor");

    if (!customerId || !summary || !editor) return;

    let summaryHost = summary.querySelector("[data-next-profile-meta-summary]");
    if (!summaryHost) {
      summaryHost = document.createElement("div");
      summaryHost.className = "ncpf-summary";
      summaryHost.dataset.nextProfileMetaSummary = "true";
      summary.prepend(summaryHost);
    }

    let editorHost = editor.querySelector("[data-next-profile-meta-editor]");
    if (!editorHost) {
      editorHost = document.createElement("div");
      editorHost.className = "ncpf-editor";
      editorHost.dataset.nextProfileMetaEditor = "true";
      editor.prepend(editorHost);
    }

    if (meta && metaCustomerId === customerId) {
      renderSummary();
      if (!editorHost.dataset.renderedCustomerId) {
        renderEditor();
        editorHost.dataset.renderedCustomerId = String(customerId);
      }
      return;
    }

    if (
      loadingCustomerId === customerId
      || failedCustomerId === customerId
    ) {
      return;
    }

    void loadMeta(customerId);
  }

  async function loadMeta(customerId) {
    const token = ++loadToken;
    loadingCustomerId = customerId;

    try {
      const data = await requestJson(
        `${META_API}?id=${encodeURIComponent(String(customerId))}`,
        { method: "GET" }
      );

      if (token !== loadToken || currentCustomerId() !== customerId) return;

      meta = data.customer || null;
      metaCustomerId = customerId;

      if (meta) {
        metaCache.set(
          customerId,
          meta
        );
      }

      renderSummary();
      renderEditor();

      const editorHost = document.querySelector("[data-next-profile-meta-editor]");
      if (editorHost) editorHost.dataset.renderedCustomerId = String(customerId);

    } catch (error) {
      failedCustomerId = customerId;

      const summaryHost = document.querySelector("[data-next-profile-meta-summary]");
      if (summaryHost) {
        const html = `<p class="ncpf-state is-error">${escapeHtml(error.message || "名義情報を取得できませんでした。")}</p>`;

        if (summaryHost.innerHTML !== html) {
          summaryHost.innerHTML = html;
        }
      }
    } finally {
      if (loadingCustomerId === customerId) loadingCustomerId = 0;
    }
  }

  function captureMetaDraft() {
    const customerId =
      currentCustomerId();

    if (!customerId) {
      return null;
    }

    const host =
      document.querySelector(
        "[data-next-profile-meta-editor]"
      );

    if (!host) {
      return null;
    }

    const names = {};

    NAME_TYPES.forEach(
      ([type]) => {
        names[type] =
          host.querySelector(
            `[data-ncpf-name="${type}"]`
          )?.value?.trim()
          || "";
      }
    );

    return {
      customerId,
      names,
      sourceType:
        host.querySelector(
          "#nextCustomerAcquisitionSource"
        )?.value
        || "unknown",
      sourceDetail:
        host.querySelector(
          "#nextCustomerAcquisitionDetail"
        )?.value?.trim()
        || "",
    };
  }

  function draftKey(draft) {
    if (!draft) return "";

    return JSON.stringify([
      draft.customerId,
      ...NAME_TYPES.map(
        ([type]) =>
          draft.names[type]
          || ""
      ),
      draft.sourceType,
      draft.sourceDetail,
    ]);
  }

  function metaKey(
    customerId,
    data
  ) {
    if (!data) return "";

    return JSON.stringify([
      customerId,
      ...NAME_TYPES.map(
        ([type]) =>
          nameValue(
            data,
            type
          )
      ),
      String(
        data.acquisition_source
          ?.source_type
        || "unknown"
      ),
      String(
        data.acquisition_source
          ?.source_detail
        || ""
      ).trim(),
    ]);
  }

  async function saveMetaDraft(
    draft
  ) {
    if (!draft) return false;

    const cached =
      (
        metaCustomerId
          === draft.customerId
        && meta
      )
        ? meta
        : (
          metaCache.get(
            draft.customerId
          )
          || null
        );

    if (
      cached
      && metaKey(
        draft.customerId,
        cached
      ) === draftKey(draft)
    ) {
      return false;
    }

    const current =
      currentCustomerId()
      === draft.customerId;

    const message =
      current
        ? document.getElementById(
            "nextCustomerProfileMetaMessage"
          )
        : null;

    if (message) {
      message.textContent =
        "自動保存中…";

      message.classList.remove(
        "is-error"
      );
    }

    const data =
      await requestJson(
        META_API,
        {
          method:"PATCH",
          headers:{
            "Content-Type":
              "application/json",
          },
          body:JSON.stringify({
            id:draft.customerId,
            names:
              draft.names,
            acquisition_source:{
              source_type:
                draft.sourceType,
              source_detail:
                draft.sourceDetail,
            },
          }),
        }
      );

    const next =
      data.customer
      || null;

    if (next) {
      metaCache.set(
        draft.customerId,
        next
      );
    }

    if (
      currentCustomerId()
      === draft.customerId
    ) {
      meta =
        next;

      metaCustomerId =
        draft.customerId;

      renderSummary();

      updateVisitNames(
        meta
      );

      const nextMessage =
        document.getElementById(
          "nextCustomerProfileMetaMessage"
        );

      if (nextMessage) {
        nextMessage.textContent =
          "✓ 保存済み";
      }
    }

    return true;
  }

  function queueMetaAutosave(
    delay = AUTOSAVE_DELAY
  ) {
    const draft =
      captureMetaDraft();

    if (!draft) return;

    pendingMetaDraft =
      draft;

    if (metaAutosaveTimer) {
      window.clearTimeout(
        metaAutosaveTimer
      );
    }

    metaAutosaveTimer =
      window.setTimeout(
        () => {
          metaAutosaveTimer = 0;
          void flushMetaAutosave();
        },
        delay
      );
  }

  function flushMetaAutosave() {
    if (metaAutosaveTimer) {
      window.clearTimeout(
        metaAutosaveTimer
      );

      metaAutosaveTimer = 0;
    }

    const draft =
      pendingMetaDraft;

    pendingMetaDraft =
      null;

    if (!draft) {
      return metaSaveChain;
    }

    metaSaveChain =
      metaSaveChain
        .catch(() => {})
        .then(
          () =>
            saveMetaDraft(
              draft
            )
        )
        .catch(error => {
          console.error(
            "Customer meta autosave failed:",
            error
          );

          if (
            currentCustomerId()
            === draft.customerId
          ) {
            const message =
              document.getElementById(
                "nextCustomerProfileMetaMessage"
              );

            if (message) {
              message.textContent =
                error.message
                || "自動保存できませんでした。";

              message.classList.add(
                "is-error"
              );
            }
          }
        });

    return metaSaveChain;
  }

  document.addEventListener("click", event => {
    if (
      event.target.closest(
        "[data-next-customer-profile-open]"
      )
    ) {
      const customerId =
        currentCustomerId();

      if (customerId) {
        failedCustomerId = 0;

        queueMicrotask(() => {
          if (
            currentCustomerId() === customerId
          ) {
            mountHosts();
          }
        });
      }

      return;
    }

  });

  function isMetaAutosaveTarget(
    target
  ) {
    return Boolean(
      target instanceof Element
      && target.matches(
        "[data-ncpf-name],"
        + "#nextCustomerAcquisitionSource,"
        + "#nextCustomerAcquisitionDetail"
      )
    );
  }

  document.addEventListener(
    "input",
    event => {
      if (
        event.isComposing
        || !isMetaAutosaveTarget(
          event.target
        )
      ) {
        return;
      }

      queueMetaAutosave(
        AUTOSAVE_DELAY
      );
    }
  );

  document.addEventListener(
    "compositionend",
    event => {
      if (
        isMetaAutosaveTarget(
          event.target
        )
      ) {
        queueMetaAutosave(
          AUTOSAVE_DELAY
        );
      }
    }
  );

  document.addEventListener(
    "change",
    event => {
      if (
        isMetaAutosaveTarget(
          event.target
        )
      ) {
        queueMetaAutosave(0);
      }
    }
  );

  document.addEventListener(
    "focusout",
    event => {
      if (
        isMetaAutosaveTarget(
          event.target
        )
      ) {
        queueMetaAutosave(0);
        void flushMetaAutosave();
      }
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
        void flushMetaAutosave();
      }
    },
    true
  );

  document.addEventListener(
    "keydown",
    event => {
      if (event.key === "Escape") {
        void flushMetaAutosave();
      }
    }
  );

  window.KohakuWorkNextCustomerProfileFull = {
    verificationReadEnabled: true,
    verificationWriteEnabled: true,
    productionWriteEnabled: false,
    lazyMountEnabled: true,
    autosaveEnabled: true,
    flushAutosave: flushMetaAutosave,
  };
})();
