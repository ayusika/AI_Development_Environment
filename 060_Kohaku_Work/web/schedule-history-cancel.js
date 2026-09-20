(() => {
  "use strict";

  const API = "/api/v1/schedule.php";
  const S = window.KohakuWorkNextSchedule;
  const drawer = document.getElementById("nextScheduleDetailDrawer");
  const body = document.getElementById("nextScheduleDetailBody");
  const footer = drawer?.querySelector(".next-schedule-detail-footer");
  const editButton = footer?.querySelector("[data-next-schedule-edit-open]");

  if (!S || !S.state || !drawer || !body || !footer || !editButton) {
    console.error("NEXT history/cancel: required UI missing.");
    return;
  }

  const STORE = {1:"札幌",2:"千葉",3:"東京",4:"名古屋"};
  const STATUS = {
    new:"新規",
    repeat:"リピ",
    other_store_repeat:"他店リピ",
    repeat_unknown_id:"リピ・ID不明",
  };
  const TYPE = {
    datetime:"日時変更",
    course:"予約時間変更",
    store:"店舗変更",
    option:"OP変更",
    status:"区分変更",
    multiple:"複数変更",
    other:"その他変更",
  };

  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

  function visit() {
    const id = Number(drawer.dataset.visitId || 0);
    return id
      ? S.state.visits.find(item => Number(item.id) === id) || null
      : null;
  }

  function status(text, state="") {
    const el = document.getElementById("nextScheduleWriteStatus");
    if (!el) return;
    el.textContent = text;
    el.dataset.state = state;
  }

  function options(value) {
    if (!Array.isArray(value)) return [];
    return value.map(item => {
      if (typeof item === "string") return item.trim();
      return String(item?.name || item?.custom_name || "").trim();
    }).filter(Boolean);
  }

  function dateTime(value) {
    const text = String(value || "");
    if (!text) return "未設定";
    const d = text.slice(0,10).split("-").map(Number);
    const t = text.slice(11,16);
    return d.length === 3 && d[1] && d[2]
      ? `${d[1]}/${d[2]} ${t}`
      : text;
  }

  function diffRows(item) {
    const before = item?.before_data && typeof item.before_data === "object"
      ? item.before_data : {};
    const after = item?.after_data && typeof item.after_data === "object"
      ? item.after_data : {};
    const rows = [];

    if (String(before.started_at || "") !== String(after.started_at || "")) {
      rows.push(["日時", dateTime(before.started_at), dateTime(after.started_at)]);
    }

    if (Number(before.course_minutes || 0) !== Number(after.course_minutes || 0)) {
      rows.push([
        "予約時間",
        before.course_minutes ? `${Number(before.course_minutes)}分` : "未設定",
        after.course_minutes ? `${Number(after.course_minutes)}分` : "未設定",
      ]);
    }

    if (Number(before.store_id || 0) !== Number(after.store_id || 0)) {
      rows.push([
        "店舗",
        STORE[Number(before.store_id || 0)] || before.store_id || "未設定",
        STORE[Number(after.store_id || 0)] || after.store_id || "未設定",
      ]);
    }

    const bo = options(before.options);
    const ao = options(after.options);
    if (JSON.stringify(bo) !== JSON.stringify(ao)) {
      rows.push([
        "OP",
        bo.length ? bo.join("・") : "なし",
        ao.length ? ao.join("・") : "なし",
      ]);
    }

    if (String(before.customer_status || "") !== String(after.customer_status || "")) {
      rows.push([
        "区分",
        STATUS[before.customer_status] || before.customer_status || "未設定",
        STATUS[after.customer_status] || after.customer_status || "未設定",
      ]);
    }

    if (!rows.length) {
      rows.push(["変更内容", "記録あり", "詳細差分なし"]);
    }

    return rows;
  }

  function closePanels() {
    body.querySelector("[data-next-history-panel]")?.remove();
    body.querySelector("[data-next-cancel-panel]")?.remove();
  }

  async function toggleHistory() {
    const current = visit();
    if (!current) return;

    body.querySelector("[data-next-cancel-panel]")?.remove();

    const existing = body.querySelector("[data-next-history-panel]");
    if (existing) {
      existing.remove();
      return;
    }

    const panel = document.createElement("section");
    panel.className = "next-schedule-history-panel";
    panel.dataset.nextHistoryPanel = "true";
    panel.innerHTML = `
      <div class="next-schedule-history-head">
        <div>
          <p class="next-schedule-detail-section-label">CHANGE HISTORY</p>
          <strong>予約変更履歴</strong>
        </div>
        <button type="button" data-next-history-close>×</button>
      </div>
      <p class="next-schedule-history-state">変更履歴を読み込み中…</p>
    `;
    body.appendChild(panel);
    panel.scrollIntoView({block:"nearest",behavior:"smooth"});

    try {
      const res = await fetch(
        `${API}?visit_id=${encodeURIComponent(String(current.id))}`,
        {method:"GET",credentials:"same-origin",cache:"no-store"}
      );
      const data = await res.json();

      if (!res.ok || !data || data.success !== true) {
        throw new Error(data?.error || "予約変更履歴を取得できませんでした。");
      }

      const history = Array.isArray(data.history) ? data.history : [];
      const html = history.length
        ? history.map(item => {
            const rows = diffRows(item).map(([label,before,after]) => `
              <div class="next-schedule-history-change">
                <span>${esc(label)}</span>
                <div>
                  <s>${esc(before)}</s>
                  <b>→</b>
                  <strong>${esc(after)}</strong>
                </div>
              </div>
            `).join("");

            return `
              <article class="next-schedule-history-item">
                <div class="next-schedule-history-item-head">
                  <strong>${esc(TYPE[item.change_type] || "予約変更")}</strong>
                  <span>受付 ${esc(item.requested_at || "")}</span>
                </div>
                ${rows}
                ${item.note ? `<p class="next-schedule-history-note">${esc(item.note)}</p>` : ""}
              </article>
            `;
          }).join("")
        : `<p class="next-schedule-history-state">変更履歴はありません。</p>`;

      panel.innerHTML = `
        <div class="next-schedule-history-head">
          <div>
            <p class="next-schedule-detail-section-label">CHANGE HISTORY</p>
            <strong>予約変更履歴</strong>
          </div>
          <button type="button" data-next-history-close>×</button>
        </div>
        <div class="next-schedule-history-list">${html}</div>
      `;
    } catch (error) {
      panel.querySelector(".next-schedule-history-state").textContent =
        error.message || "予約変更履歴を取得できませんでした。";
      panel.classList.add("is-error");
    }
  }

  function toggleCancel() {
    const current = visit();
    if (!current) return;

    if (!current.customer_id && Number(current.customer_linked || 0) !== 1) {
      window.alert("お客様キャンセルは顧客紐付け済み予約で使えます。");
      return;
    }

    body.querySelector("[data-next-history-panel]")?.remove();

    const existing = body.querySelector("[data-next-cancel-panel]");
    if (existing) {
      existing.remove();
      return;
    }

    const panel = document.createElement("section");
    panel.className = "next-schedule-cancel-panel";
    panel.dataset.nextCancelPanel = "true";
    panel.innerHTML = `
      <p class="next-schedule-detail-section-label">CUSTOMER CANCELLATION</p>
      <div class="next-schedule-cancel-warning">
        <strong>お客様キャンセルとして記録します。</strong>
        <span>予約は削除せず、状態・取消日時・理由を本番DBに残します。</span>
      </div>
      <label class="next-schedule-cancel-field">
        <span>キャンセル理由</span>
        <textarea id="nextScheduleCustomerCancelReason" rows="4" maxlength="1000"
          placeholder="例：お客様都合によりキャンセル"></textarea>
      </label>
      <p class="next-schedule-cancel-message" id="nextScheduleCustomerCancelMessage"></p>
      <div class="next-schedule-cancel-actions">
        <button type="button" data-next-cancel-close>やめる</button>
        <button type="button" class="is-danger" data-next-cancel-confirm>
          お客様キャンセルとして記録
        </button>
      </div>
    `;
    body.appendChild(panel);
    panel.scrollIntoView({block:"nearest",behavior:"smooth"});
    panel.querySelector("textarea")?.focus({preventScroll:true});
  }

  async function cancelReservation() {
    const current = visit();
    if (!current) return;

    const reason = document
      .getElementById("nextScheduleCustomerCancelReason")
      ?.value?.trim() || "";
    const message = document.getElementById("nextScheduleCustomerCancelMessage");

    if (!reason) {
      if (message) {
        message.textContent = "キャンセル理由を入力してね。";
        message.classList.add("is-error");
      }
      return;
    }

    if (!window.confirm(
      "この予約を「お客様キャンセル」として記録する？\n\n予約そのものは削除しません。"
    )) return;

    const button = body.querySelector("[data-next-cancel-confirm]");
    if (button) {
      button.disabled = true;
      button.textContent = "記録中…";
    }
    if (message) {
      message.textContent = "本番DBへ記録しています…";
      message.classList.remove("is-error");
    }
    status("PRODUCTION DB / CANCELLING","writing");

    try {
      const res = await fetch(API,{
        method:"PATCH",
        credentials:"same-origin",
        cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          id:Number(current.id),
          status:"cancelled",
          cancelled_by:"customer",
          cancel_reason:reason,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data || data.success !== true || !data.visit) {
        throw new Error(data?.error || "お客様キャンセルを記録できませんでした。");
      }

      const index = S.state.visits.findIndex(
        item => Number(item.id) === Number(data.visit.id)
      );

      if (index >= 0) {
        S.state.visits[index] = data.visit;
      }

      S.closeDetail();
      S.render({preserveScroll:true});
      status("CUSTOMER CANCELLED / PRODUCTION","saved");
      window.alert("お客様キャンセルとして本番DBに記録しました。");
    } catch (error) {
      if (message) {
        message.textContent =
          error.message || "お客様キャンセルを記録できませんでした。";
        message.classList.add("is-error");
      }
      if (button) {
        button.disabled = false;
        button.textContent = "お客様キャンセルとして記録";
      }
      status("CANCEL ERROR / PRODUCTION","error");
    }
  }

  function sync() {
    const current = visit();
    const history = footer.querySelector("[data-next-history]");
    const cancel = footer.querySelector("[data-next-customer-cancel]");

    if (history) history.hidden = !current;

    if (cancel) {
      const linked = Boolean(
        current && (current.customer_id || Number(current.customer_linked || 0) === 1)
      );
      cancel.hidden = !linked || current?.status === "cancelled";
    }

    if (!current) closePanels();
  }

  function mount() {
    if (footer.querySelector("[data-next-history-cancel-actions]")) return;

    const wrap = document.createElement("div");
    wrap.className = "next-schedule-history-cancel-footer";
    wrap.dataset.nextHistoryCancelActions = "true";
    wrap.innerHTML = `
      <button type="button" class="next-schedule-history-button" data-next-history>
        🕘 変更履歴
      </button>
      <button type="button" class="next-schedule-customer-cancel-button"
        data-next-customer-cancel hidden>
        お客様キャンセル
      </button>
    `;

    const anchor =
      footer.querySelector("[data-next-schedule-delete]") || editButton;
    anchor.before(wrap);
    sync();
  }

  document.addEventListener("click", event => {
    if (event.target.closest("[data-next-history]")) {
      event.preventDefault();
      void toggleHistory();
      return;
    }
    if (event.target.closest("[data-next-history-close]")) {
      event.preventDefault();
      body.querySelector("[data-next-history-panel]")?.remove();
      return;
    }
    if (event.target.closest("[data-next-customer-cancel]")) {
      event.preventDefault();
      toggleCancel();
      return;
    }
    if (event.target.closest("[data-next-cancel-close]")) {
      event.preventDefault();
      body.querySelector("[data-next-cancel-panel]")?.remove();
      return;
    }
    if (event.target.closest("[data-next-cancel-confirm]")) {
      event.preventDefault();
      void cancelReservation();
    }
  });

  new MutationObserver(() => queueMicrotask(sync)).observe(drawer,{
    attributes:true,
    attributeFilter:["class","data-visit-id","data-detail-loaded-id"],
  });

  new MutationObserver(() => queueMicrotask(sync)).observe(body,{
    childList:true,
  });

  mount();

  window.KohakuWorkNextScheduleHistoryCancel = {
    verificationReadEnabled:false,
    verificationWriteEnabled:false,
    productionWriteEnabled:true,
  };
})();
