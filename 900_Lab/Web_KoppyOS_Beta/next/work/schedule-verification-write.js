(() => {
  "use strict";

  const SCHEDULE_API = "/api/next/v1/schedule.php";

  function api() {
    const value = window.KohakuWorkNextSchedule;
    if (
      !value
      || typeof value.openDetail !== "function"
      || typeof value.render !== "function"
      || !value.state
    ) {
      throw new Error("NEXT schedule module is not ready.");
    }
    return value;
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
    const drawer =
      document.getElementById("nextScheduleDetailDrawer");

    const visitId =
      Number(drawer?.dataset?.visitId || 0);

    if (!visitId) return null;

    return api().state.visits.find(
      visit => Number(visit.id) === visitId
    ) || null;
  }

  function startedParts(value) {
    const text = String(value || "");
    return {
      date: text.slice(0, 10),
      time: text.slice(11, 16),
    };
  }

  function bookedParts(value) {
    const text = String(value || "");
    if (!text) return { date:"", time:"" };
    return {
      date: text.slice(0, 10),
      time: text.slice(11, 16),
    };
  }

  function setWriteStatus(text, state = "") {
    const element =
      document.getElementById("nextScheduleWriteStatus");

    if (!element) return;

    element.textContent = text;
    element.dataset.state = state;

    if (state === "saved") {
      window.setTimeout(() => {
        if (element.dataset.state === "saved") {
          element.textContent =
            "VERIFICATION DB / EDIT READY";
          element.dataset.state = "";
        }
      }, 2600);
    }
  }

  function editMessage(text = "", isError = false) {
    const element =
      document.getElementById("nextScheduleEditMessage");

    if (!element) return;

    element.textContent = text;
    element.classList.toggle(
      "is-error",
      Boolean(isError)
    );
  }

  function renderEditForm(visit) {
    const body =
      document.getElementById("nextScheduleDetailBody");

    if (!body || !visit) return;

    const started =
      startedParts(visit.started_at);

    const booked =
      bookedParts(visit.booked_at);

    const salesConfirmed =
      Boolean(visit.sales_confirmed_at);

    body.innerHTML = `
      <form
        class="next-schedule-edit-form"
        id="nextScheduleEditForm"
        novalidate
      >
        <p class="next-schedule-detail-section-label">
          VERIFICATION EDIT / V1
        </p>

        <div class="next-schedule-edit-warning">
          <strong>検証DBだけを書き換えます。</strong>
          <span>本番DBには反映されません。</span>
        </div>

        <div class="next-schedule-edit-grid">
          <label>
            <span>予約日</span>
            <input
              id="nextScheduleEditDate"
              type="date"
              value="${escapeHtml(started.date)}"
              required
            >
          </label>

          <label>
            <span>開始時間</span>
            <input
              id="nextScheduleEditTime"
              type="time"
              value="${escapeHtml(started.time)}"
              required
            >
          </label>

          <label>
            <span>予約受付日</span>
            <input
              id="nextScheduleEditBookedDate"
              type="date"
              value="${escapeHtml(booked.date)}"
            >
          </label>

          <label>
            <span>予約受付時刻</span>
            <input
              id="nextScheduleEditBookedTime"
              type="time"
              value="${escapeHtml(booked.time)}"
            >
          </label>

          <label class="is-wide">
            <span>来訪タイプ</span>
            <select id="nextScheduleEditVisitorType">
              <option value="" ${!visit.visitor_type ? "selected" : ""}>不明</option>
              <option value="local" ${visit.visitor_type === "local" ? "selected" : ""}>地元</option>
              <option value="travel" ${visit.visitor_type === "travel" ? "selected" : ""}>旅行</option>
              <option value="business" ${visit.visitor_type === "business" ? "selected" : ""}>出張</option>
            </select>
          </label>

          <label>
            <span>チップ</span>
            <input
              id="nextScheduleEditTip"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              value="${escapeHtml(Number(visit.tip_amount || 0))}"
              ${salesConfirmed ? "disabled" : ""}
            >
          </label>

          <label>
            <span>調整分</span>
            <input
              id="nextScheduleEditAdjustment"
              type="number"
              step="1"
              inputmode="numeric"
              value="${escapeHtml(Number(visit.adjustment_amount || 0))}"
              ${salesConfirmed ? "disabled" : ""}
            >
          </label>
        </div>

        ${
          salesConfirmed
            ? `
              <p class="next-schedule-edit-lock-note">
                売上確定済みのため、チップ・調整分はこの画面では変更しません。
              </p>
            `
            : ""
        }

        <label class="next-schedule-edit-change-request">
          <input
            id="nextScheduleEditCustomerRequestedChange"
            type="checkbox"
          >
          <span>
            お客様都合の予約変更として履歴に記録する
          </span>
        </label>

        <p class="next-schedule-edit-scope">
          店舗・コース・顧客区分・OPは次フェーズで追加します。
        </p>

        <p
          class="next-schedule-edit-message"
          id="nextScheduleEditMessage"
          aria-live="polite"
        ></p>

        <div class="next-schedule-edit-actions">
          <button
            type="button"
            class="next-schedule-edit-cancel"
            data-next-schedule-edit-cancel
          >
            キャンセル
          </button>

          <button
            type="submit"
            class="next-schedule-edit-save"
            id="nextScheduleEditSave"
          >
            検証DBへ保存
          </button>
        </div>
      </form>
    `;

    body
      .querySelector("#nextScheduleEditDate")
      ?.focus({ preventScroll:true });
  }

  function readIntegerInput(id, { min = null } = {}) {
    const input =
      document.getElementById(id);

    if (!input || input.disabled) {
      return null;
    }

    const raw = input.value.trim();

    if (raw === "") return 0;

    const value = Number(raw);

    if (!Number.isSafeInteger(value)) {
      throw new Error("金額は1円単位の整数で入力してね。");
    }

    if (min !== null && value < min) {
      throw new Error("チップは0円以上で入力してね。");
    }

    return value;
  }

  async function saveEdit() {
    const visit =
      currentVisit();

    if (!visit) {
      throw new Error("編集対象の予約が見つかりません。");
    }

    const date =
      document.getElementById("nextScheduleEditDate")
        ?.value
        ?.trim()
      || "";

    const time =
      document.getElementById("nextScheduleEditTime")
        ?.value
        ?.trim()
      || "";

    if (!date || !time) {
      throw new Error("予約日と開始時間を入れてね。");
    }

    const bookedDate =
      document.getElementById("nextScheduleEditBookedDate")
        ?.value
        ?.trim()
      || "";

    const bookedTime =
      document.getElementById("nextScheduleEditBookedTime")
        ?.value
        ?.trim()
      || "";

    if (
      (bookedDate && !bookedTime)
      || (!bookedDate && bookedTime)
    ) {
      throw new Error(
        "予約受付日は日付と時刻を両方入れてね。"
      );
    }

    const visitorType =
      document.getElementById("nextScheduleEditVisitorType")
        ?.value
      || "";

    const payload = {
      id: Number(visit.id),
      started_at: `${date} ${time}`,
      booked_at:
        bookedDate && bookedTime
          ? `${bookedDate} ${bookedTime}`
          : null,
      visitor_type:
        visitorType || null,
      customer_requested_change:
        Boolean(
          document.getElementById(
            "nextScheduleEditCustomerRequestedChange"
          )?.checked
        ),
    };

    if (!visit.sales_confirmed_at) {
      payload.tip_amount =
        readIntegerInput(
          "nextScheduleEditTip",
          { min:0 }
        );

      payload.adjustment_amount =
        readIntegerInput(
          "nextScheduleEditAdjustment"
        );
    }

    const saveButton =
      document.getElementById("nextScheduleEditSave");

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "保存中…";
    }

    editMessage("検証DBへ保存しています…");
    setWriteStatus("VERIFICATION DB / WRITING", "writing");

    try {
      const response =
        await fetch(
          SCHEDULE_API,
          {
            method:"PATCH",
            credentials:"same-origin",
            cache:"no-store",
            headers:{
              "Content-Type":"application/json",
            },
            body:JSON.stringify(payload),
          }
        );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "予約編集APIの応答を読めませんでした。"
        );
      }

      if (
        !response.ok
        || !data
        || data.success !== true
        || !data.visit
      ) {
        throw new Error(
          data?.error
          || "予約を保存できませんでした。"
        );
      }

      const scheduleApi = api();
      const updatedVisit = data.visit;
      const index =
        scheduleApi.state.visits.findIndex(
          item =>
            Number(item.id)
            === Number(updatedVisit.id)
        );

      if (index >= 0) {
        scheduleApi.state.visits[index] =
          updatedVisit;
      }

      scheduleApi.render({
        preserveScroll:true,
      });

      scheduleApi.openDetail(
        updatedVisit,
        null
      );

      setWriteStatus(
        "SAVED / VERIFICATION ONLY",
        "saved"
      );

    } catch (error) {
      editMessage(
        error.message
        || "予約の保存に失敗しました。",
        true
      );

      setWriteStatus(
        "WRITE ERROR / VERIFICATION",
        "error"
      );

      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent =
          "検証DBへ保存";
      }
    }
  }

  document.addEventListener(
    "click",
    event => {
      if (
        event.target.closest(
          "[data-next-schedule-edit-open]"
        )
      ) {
        const visit =
          currentVisit();

        if (!visit) return;

        event.preventDefault();
        renderEditForm(visit);
        setWriteStatus(
          "VERIFICATION DB / EDITING",
          "editing"
        );
        return;
      }

      if (
        event.target.closest(
          "[data-next-schedule-edit-cancel]"
        )
      ) {
        const visit =
          currentVisit();

        if (!visit) return;

        event.preventDefault();
        api().openDetail(
          visit,
          null
        );

        setWriteStatus(
          "VERIFICATION DB / EDIT READY",
          ""
        );
      }
    }
  );

  document.addEventListener(
    "submit",
    event => {
      const form =
        event.target.closest(
          "#nextScheduleEditForm"
        );

      if (!form) return;

      event.preventDefault();

      void saveEdit().catch(error => {
        editMessage(
          error.message
          || "予約の保存に失敗しました。",
          true
        );

        setWriteStatus(
          "WRITE ERROR / VERIFICATION",
          "error"
        );
      });
    }
  );

  const scheduleApi = api();
  scheduleApi.verificationWriteEnabled = true;

  setWriteStatus(
    "VERIFICATION DB / EDIT READY",
    ""
  );
})();
