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
      <button type="button" class="ncpf-save" data-next-profile-meta-save>
        名義・初回流入元を保存
      </button>
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

  async function saveMeta() {
    const customerId = currentCustomerId();
    if (!customerId) return;

    const button = document.querySelector("[data-next-profile-meta-save]");
    const message = document.getElementById("nextCustomerProfileMetaMessage");
    const names = {};

    NAME_TYPES.forEach(([type]) => {
      names[type] = document.querySelector(`[data-ncpf-name="${type}"]`)?.value?.trim() || "";
    });

    const sourceType = document.getElementById("nextCustomerAcquisitionSource")?.value || "unknown";
    const sourceDetail = document.getElementById("nextCustomerAcquisitionDetail")?.value?.trim() || "";

    if (button) {
      button.disabled = true;
      button.textContent = "保存中…";
    }

    if (message) {
      message.textContent = "検証DBへ保存しています…";
      message.classList.remove("is-error");
    }

    try {
      const data = await requestJson(META_API, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: customerId,
          names,
          acquisition_source: {
            source_type: sourceType,
            source_detail: sourceDetail,
          },
        }),
      });

      meta = data.customer || null;
      metaCustomerId = customerId;
      renderSummary();
      renderEditor();
      updateVisitNames(meta);

      const editorHost = document.querySelector("[data-next-profile-meta-editor]");
      if (editorHost) editorHost.dataset.renderedCustomerId = String(customerId);

      const nextMessage = document.getElementById("nextCustomerProfileMetaMessage");
      if (nextMessage) nextMessage.textContent = "名義・初回流入元を保存しました。";

    } catch (error) {
      if (message) {
        message.textContent = error.message || "名義・初回流入元を保存できませんでした。";
        message.classList.add("is-error");
      }
    } finally {
      const nextButton = document.querySelector("[data-next-profile-meta-save]");
      if (nextButton) {
        nextButton.disabled = false;
        nextButton.textContent = "名義・初回流入元を保存";
      }
    }
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

    if (event.target.closest("[data-next-profile-meta-save]")) {
      event.preventDefault();
      void saveMeta();
    }
  });

  window.KohakuWorkNextCustomerProfileFull = {
    verificationReadEnabled: true,
    verificationWriteEnabled: true,
    productionWriteEnabled: false,
    lazyMountEnabled: true,
  };
})();
