(() => {
  "use strict";

  const SALES_API = "/api/v1/visit-sales.php";
  const S = window.KohakuWorkNextSchedule;
  const drawer = document.getElementById("nextScheduleDetailDrawer");
  const body = document.getElementById("nextScheduleDetailBody");

  if (!S || !drawer || !body) {
    console.error("Kohaku Work NEXT sales panel: schedule UI missing.");
    return;
  }

  const state = {
    visitId: 0,
    token: 0,
    result: null,
    editing: false,
  };

  function formatMoney(value) {
    if (value === null || value === undefined || value === "") return "¥ −";
    return `¥ ${Number(value).toLocaleString("ja-JP")}`;
  }

  function panelTemplate() {
    return `
      <section class="next-sales-panel" data-next-sales-panel>
        <div class="next-sales-panel-head">
          <div>
            <p class="next-sales-kicker">SALES / PRODUCTION DB</p>
            <h3>売上確認</h3>
          </div>
          <span class="next-sales-state" data-next-sales-state>READING</span>
        </div>

        <div class="next-sales-metrics">
          <article><span>コース手取り</span><strong data-next-sales-value="course">¥ −</strong></article>
          <article><span>指名料</span><strong data-next-sales-value="nomination">¥ −</strong></article>
          <article><span>OP手取り</span><strong data-next-sales-value="option">¥ −</strong></article>
          <article><span>チップ</span><strong data-next-sales-value="tip">¥ −</strong></article>
          <article><span>調整</span><strong data-next-sales-value="adjustment">¥ −</strong></article>
          <article><span>客支払額</span><strong data-next-sales-value="payment">¥ −</strong></article>
          <article class="is-highlight"><span>合計手取り</span><strong data-next-sales-value="take-home">¥ −</strong></article>
        </div>

        <div class="next-sales-form-grid">
          <label>
            <span>チップ</span>
            <input type="number" min="0" step="1" inputmode="numeric" data-next-sales-input="tip" placeholder="0">
          </label>

          <label>
            <span>値引き</span>
            <input type="number" min="0" step="1" inputmode="numeric" data-next-sales-input="discount" placeholder="0">
          </label>

          <label>
            <span>調整</span>
            <input type="number" step="1" inputmode="numeric" data-next-sales-input="adjustment" placeholder="0">
          </label>

          <label>
            <span>値引き理由</span>
            <select data-next-sales-input="discount-reason">
              <option value="">なし</option>
              <option value="coupon">クーポン</option>
              <option value="early">早割</option>
              <option value="store">店舗調整</option>
              <option value="campaign">キャンペーン</option>
              <option value="other">その他</option>
            </select>
          </label>
        </div>

        <label class="next-sales-note-field">
          <span>値引きメモ</span>
          <input type="text" maxlength="300" autocomplete="off" data-next-sales-input="discount-note" placeholder="必要な場合だけ">
        </label>

        <div class="next-sales-actions">
          <button type="button" class="next-sales-action is-primary" data-next-sales-confirm>この売上を確定</button>
          <button type="button" class="next-sales-action" data-next-sales-edit hidden>売上を修正</button>
          <button type="button" class="next-sales-action" data-next-sales-recalculate hidden>予約内容から売上を再計算</button>
        </div>

        <p class="next-sales-message" data-next-sales-message hidden></p>
        <p class="next-sales-safety">この売上操作は本番DBへ保存します。確定内容を確認してから操作してください。</p>
      </section>
    `;
  }

  function ensurePanel() {
    let panel = body.querySelector("[data-next-sales-panel]");
    if (panel) return panel;

    const progress = body.querySelector(".next-schedule-detail-progress");
    if (progress) {
      progress.insertAdjacentHTML("afterend", panelTemplate());
    } else {
      body.insertAdjacentHTML("beforeend", panelTemplate());
    }

    return body.querySelector("[data-next-sales-panel]");
  }

  function getPanel() {
    return body.querySelector("[data-next-sales-panel]");
  }

  function input(name) {
    return getPanel()?.querySelector(`[data-next-sales-input="${name}"]`) || null;
  }

  function setMessage(message, isError = false) {
    const node = getPanel()?.querySelector("[data-next-sales-message]");
    if (!node) return;
    node.hidden = !message;
    node.textContent = message || "";
    node.classList.toggle("is-error", Boolean(isError));
  }

  function setStateLabel(message, isError = false) {
    const node = getPanel()?.querySelector("[data-next-sales-state]");
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("is-error", Boolean(isError));
  }

  function setMetric(name, value) {
    const node = getPanel()?.querySelector(`[data-next-sales-value="${name}"]`);
    if (node) node.textContent = formatMoney(value);
  }

  function fillInputs(result) {
    const preview = result?.preview || {};
    const sales = result?.sales || {};

    const tip = input("tip");
    const discount = input("discount");
    const adjustment = input("adjustment");
    const reason = input("discount-reason");
    const note = input("discount-note");

    if (tip) tip.value = String(Number(preview.tip_amount || 0));
    if (discount) discount.value = String(Number(preview.discount_amount || 0));
    if (adjustment) adjustment.value = String(Number(preview.adjustment_amount || 0));
    if (reason) reason.value = String(sales.discount_reason_type || "");
    if (note) note.value = String(sales.discount_reason_note || "");
  }

  function renderResult(result) {
    state.result = result;
    state.editing = false;

    const preview = result?.preview || {};
    const sales = result?.sales || {};
    const confirmed = Boolean(sales.confirmed_at);

    setMetric("course", preview.course_take_home_total);
    setMetric("nomination", preview.nomination_fee_amount);
    setMetric("option", preview.option_take_home_total);
    setMetric("tip", preview.tip_amount);
    setMetric("adjustment", preview.adjustment_amount);
    setMetric("payment", preview.customer_payment_total);
    setMetric("take-home", preview.take_home_total);
    fillInputs(result);

    const confirm = getPanel()?.querySelector("[data-next-sales-confirm]");
    const edit = getPanel()?.querySelector("[data-next-sales-edit]");
    const recalculate = getPanel()?.querySelector("[data-next-sales-recalculate]");

    if (confirm) {
      confirm.hidden = confirmed;
      confirm.disabled = confirmed;
      confirm.textContent = "この売上を確定";
    }

    if (edit) {
      edit.hidden = !confirmed;
      edit.disabled = false;
      edit.textContent = "売上を修正";
      edit.classList.remove("is-editing");
    }

    if (recalculate) {
      recalculate.hidden = !confirmed;
      recalculate.disabled = false;
      recalculate.textContent = "予約内容から売上を再計算";
    }

    setStateLabel(confirmed ? "CONFIRMED" : "PREVIEW");
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("売上APIの応答を読めませんでした。");
    }

    if (!response.ok || !data || data.success !== true) {
      throw new Error(data?.error || "売上データを処理できませんでした。");
    }

    return data;
  }

  function selectedVisit() {
    const visitId = Number(state.visitId || drawer.dataset.visitId || 0);
    return S.state?.visits?.find(visit => Number(visit.id) === visitId) || null;
  }

  function updateProgress(result) {
    const visit = selectedVisit();
    if (visit) {
      visit.sales_entered = 1;
      visit.sales_detail = result?.sales || null;
    }

    const progress = body.querySelector('[data-next-progress-jump="sales"]');
    if (progress) {
      progress.classList.add("is-complete");
      const strong = progress.querySelector("strong");
      if (strong) strong.textContent = "入力済";
    }

    const event = document.querySelector(`[data-next-schedule-event="${Number(state.visitId)}"]`);
    const eventProgress = event?.querySelector(".next-schedule-event-progress");
    eventProgress?.children?.[2]?.classList.remove("is-incomplete");
  }

  function readInteger(element, { minimum = null } = {}) {
    if (!element) return 0;
    const value = String(element.value || "").trim();
    if (value === "") return 0;
    if (!/^-?\d+$/.test(value)) throw new Error("金額は整数で入力してください。");

    const amount = Number(value);
    if (minimum !== null && amount < minimum) {
      throw new Error("チップ・値引きは0以上で入力してください。");
    }
    return amount;
  }

  function formPayload() {
    return {
      tip_amount: readInteger(input("tip"), { minimum: 0 }),
      discount_amount: readInteger(input("discount"), { minimum: 0 }),
      adjustment_amount: readInteger(input("adjustment")),
      discount_reason_type: input("discount-reason")?.value || "",
      discount_reason_note: input("discount-note")?.value.trim() || "",
    };
  }

  function setActionBusy(button, label) {
    if (!button) return;
    button.disabled = true;
    button.dataset.nextSalesOriginalLabel = button.textContent;
    button.textContent = label;
  }

  function clearActionBusy(button, fallback) {
    if (!button) return;
    button.disabled = false;
    button.textContent = button.dataset.nextSalesOriginalLabel || fallback;
    delete button.dataset.nextSalesOriginalLabel;
  }

  async function submit(mode, button) {
    const visitId = Number(state.visitId || 0);
    if (!visitId) throw new Error("売上対象の予約を確認できませんでした。");

    const payload = {
      visit_id: visitId,
      ...formPayload(),
    };

    if (mode === "revise") {
      payload.mode = "revise";
      payload.change_reason = "manual_correction";
    }

    if (mode === "recalculate") {
      payload.mode = "recalculate";
      payload.change_reason = "reservation_recalculation";
      delete payload.tip_amount;
      delete payload.discount_amount;
      delete payload.adjustment_amount;
      delete payload.discount_reason_type;
      delete payload.discount_reason_note;
    }

    setActionBusy(button, mode === "recalculate" ? "再計算中…" : "保存中…");
    setMessage(
      mode === "recalculate"
        ? "予約内容から売上を再計算しています…"
        : (mode === "revise" ? "売上の修正を保存しています…" : "売上を確定しています…")
    );

    try {
      const result = await requestJson(SALES_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      renderResult(result);
      updateProgress(result);
      setMessage(
        mode === "recalculate"
          ? "✓ 予約内容から売上を再計算しました。"
          : (mode === "revise" ? "✓ 売上を修正しました。" : "✓ 売上を確定しました。")
      );
      return result;
    } catch (error) {
      setMessage(error.message || "売上を保存できませんでした。", true);
      throw error;
    } finally {
      clearActionBusy(
        button,
        mode === "recalculate"
          ? "予約内容から売上を再計算"
          : (mode === "revise" ? "修正を保存" : "この売上を確定")
      );
    }
  }

  async function load(visitId, token) {
    try {
      const result = await requestJson(
        `${SALES_API}?visit_id=${encodeURIComponent(String(visitId))}`,
        { method: "GET" }
      );

      if (token !== state.token || Number(drawer.dataset.visitId || 0) !== visitId) return;
      renderResult(result);
      setMessage("");
    } catch (error) {
      if (token !== state.token || Number(drawer.dataset.visitId || 0) !== visitId) return;
      setStateLabel("ERROR", true);
      setMessage(error.message || "売上データの取得に失敗しました。", true);
    }
  }

  function open(visit) {
    const visitId = Number(visit?.id || drawer.dataset.visitId || 0);
    if (!visitId) {
      window.alert("売上対象の予約を確認できませんでした。");
      return;
    }

    state.visitId = visitId;
    state.result = null;
    state.editing = false;
    const token = ++state.token;

    const panel = ensurePanel();
    if (!panel) {
      window.alert("売上パネルを開けませんでした。");
      return;
    }

    panel.hidden = false;
    setStateLabel("READING");
    setMessage("売上データを読み込んでいます…");
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    void load(visitId, token);
  }

  body.addEventListener("click", event => {
    if (!event.target.closest("[data-next-sales-panel]")) return;

    const confirm = event.target.closest("[data-next-sales-confirm]");
    if (confirm) {
      event.preventDefault();
      void submit("confirm", confirm).catch(() => {});
      return;
    }

    const edit = event.target.closest("[data-next-sales-edit]");
    if (edit) {
      event.preventDefault();

      if (!state.editing) {
        state.editing = true;
        edit.textContent = "修正を保存";
        edit.classList.add("is-editing");
        setMessage("チップ・値引き・調整を修正して保存できます。");
        input("adjustment")?.focus();
        return;
      }

      void submit("revise", edit).catch(() => {});
      return;
    }

    const recalculate = event.target.closest("[data-next-sales-recalculate]");
    if (recalculate) {
      event.preventDefault();
      const ok = window.confirm(
        "予約内容から確定済み売上を再計算する？\n"
        + "コース・延長・OP・指名料を現在の予約内容で更新します。\n"
        + "チップ・値引き・調整は現在の確定値を維持します。"
      );
      if (!ok) return;
      void submit("recalculate", recalculate).catch(() => {});
    }
  });

  window.KohakuWorkNextScheduleSalesPanel = {
    open,
    verificationReadEnabled: false,
    verificationWriteEnabled: false,
    productionWriteEnabled: true,
  };
})();
