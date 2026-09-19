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

    const indicator =
      window.KohakuWorkNextSaveIndicator;

    if (state === "writing") {
      indicator
        ?.setState
        ?.(
          "schedule",
          "saving"
        );
    } else if (state === "saved") {
      indicator
        ?.setState
        ?.(
          "schedule",
          "saved"
        );
    } else if (state === "error") {
      indicator
        ?.setState
        ?.(
          "schedule",
          "error",
          text
        );
    }

    if (state === "saved") {
      window.setTimeout(() => {
        if (element.dataset.state === "saved") {
          element.textContent =
            "PRODUCTION DB / EDIT READY";
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

  const DETAIL_VISITOR_TYPES = [
    { value:"", label:"不明" },
    { value:"local", label:"地元" },
    { value:"travel", label:"旅行" },
    { value:"business", label:"出張" },
  ];

  function detailFooterEditButton() {
    return document.querySelector(
      ".next-schedule-detail-footer [data-next-schedule-edit-open]"
    );
  }

  function syncDetailQuickEditButton() {
    const quickButton =
      document.querySelector(
        "[data-next-detail-quick-edit]"
      );

    const footerButton =
      detailFooterEditButton();

    if (!quickButton || !footerButton) return;

    const disabled =
      Boolean(footerButton.disabled);

    if (quickButton.disabled !== disabled) {
      quickButton.disabled = disabled;
    }

    const text =
      footerButton.textContent?.trim()
      || "✎ 予約を編集";

    if (quickButton.textContent?.trim() !== text) {
      quickButton.textContent = text;
    }
  }

  function mountDetailQuickActions() {
    const body =
      document.getElementById("nextScheduleDetailBody");

    if (!body) return;

    if (
      body.querySelector(
        "#nextScheduleEditForm, #nextScheduleEditFormV2"
      )
    ) {
      return;
    }

    const visit = currentVisit();
    const reservationCard =
      body.querySelector(
        ".next-detail-reservation-card"
      );

    if (!visit || !reservationCard) return;

    const visitId =
      String(Number(visit.id));

    const current =
      String(visit.visitor_type || "");

    let host =
      body.querySelector(
        "[data-next-detail-quick-actions]"
      );

    let needsRender = false;

    if (!host) {
      host = document.createElement("section");
      host.className =
        "next-detail-quick-actions";
      host.dataset.nextDetailQuickActions = "true";

      reservationCard.insertAdjacentElement(
        "afterend",
        host
      );

      needsRender = true;
    }

    if (
      host.dataset.visitId !== visitId
      || host.dataset.visitorType !== current
    ) {
      needsRender = true;
    }

    if (needsRender) {
      host.dataset.visitId = visitId;
      host.dataset.visitorType = current;

      host.innerHTML = `
        <button
          type="button"
          class="next-schedule-edit-open next-detail-quick-edit"
          data-next-schedule-edit-open
          data-next-detail-quick-edit
        >
          ✎ 予約を編集
        </button>

        <div class="next-detail-visitor-quick">
          <div class="next-detail-visitor-quick-head">
            <div>
              <span>VISITOR TYPE</span>
              <strong>来訪タイプ</strong>
            </div>
            <small>タップで保存</small>
          </div>

          <div
            class="next-detail-visitor-options"
            role="group"
            aria-label="来訪タイプ"
          >
            ${
              DETAIL_VISITOR_TYPES
                .map(item => `
                  <button
                    type="button"
                    class="next-detail-visitor-option${item.value === current ? " is-selected" : ""}"
                    data-next-detail-visitor-type="${escapeHtml(item.value)}"
                    aria-pressed="${item.value === current ? "true" : "false"}"
                  >
                    ${escapeHtml(item.label)}
                  </button>
                `)
                .join("")
            }
          </div>

          <p
            class="next-detail-visitor-status"
            data-next-detail-visitor-status
            aria-live="polite"
          ></p>
        </div>
      `;
    }

    syncDetailQuickEditButton();
  }

  async function saveDetailVisitorType(value) {
    const visit = currentVisit();

    if (!visit) {
      throw new Error(
        "更新対象の予約が見つかりません。"
      );
    }

    const normalized =
      String(value || "");

    const current =
      String(visit.visitor_type || "");

    if (normalized === current) {
      return;
    }

    const host =
      document.querySelector(
        "[data-next-detail-quick-actions]"
      );

    const buttons =
      Array.from(
        host?.querySelectorAll(
          "[data-next-detail-visitor-type]"
        )
        || []
      );

    const status =
      host?.querySelector(
        "[data-next-detail-visitor-status]"
      );

    buttons.forEach(button => {
      button.disabled = true;
    });

    if (status) {
      status.textContent = "保存中…";
      status.dataset.state = "writing";
    }

    setWriteStatus(
      "VERIFICATION DB / WRITING",
      "writing"
    );

    try {
      const response = await fetch(
        SCHEDULE_API,
        {
          method:"PATCH",
          credentials:"same-origin",
          cache:"no-store",
          headers:{
            "Content-Type":"application/json",
          },
          body:JSON.stringify({
            id:Number(visit.id),
            visitor_type:
              normalized || null,
          }),
        }
      );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "来訪タイプ更新APIの応答を読めませんでした。"
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
          || "来訪タイプを保存できませんでした。"
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
        "SAVED / PRODUCTION",
        "saved"
      );

    } catch (error) {
      buttons.forEach(button => {
        button.disabled = false;
      });

      if (status) {
        status.textContent =
          error.message
          || "来訪タイプを保存できませんでした。";
        status.dataset.state = "error";
      }

      setWriteStatus(
        "WRITE ERROR / VERIFICATION",
        "error"
      );

      throw error;
    }
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
          PRODUCTION EDIT
        </p>

        <div class="next-schedule-edit-warning">
          <strong>本番DBを書き換えます。</strong>
          <span>保存内容は本番へ即時反映されます。</span>
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
          日時・店舗・コース・延長・OP・顧客区分・チップ・調整分を編集できます。
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
            本番DBへ保存
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

    const payload = {
      id: Number(visit.id),
      started_at: `${date} ${time}`,
      booked_at:
        bookedDate && bookedTime
          ? `${bookedDate} ${bookedTime}`
          : null,
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

    editMessage("本番DBへ保存しています…");
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
        "SAVED / PRODUCTION",
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
          "本番DBへ保存";
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
          "PRODUCTION DB / EDIT READY",
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


  /* =========================================================
     PRODUCTION EDIT V2
     store / course / extension / option / customer status
  ========================================================= */

  const V2_MASTER_API =
    "/api/next/v1/sales-master.php";

  const V2_STORES = [
    { id:1, name:"札幌" },
    { id:2, name:"千葉" },
    { id:3, name:"東京" },
    { id:4, name:"名古屋" },
  ];

  const V2_CUSTOMER_STATUS_LABELS = {
    new:"新規",
    repeat:"リピ",
    other_store_repeat:"他店リピ",
    repeat_unknown_id:"リピ・ID不明",
  };

  let v2Session = null;

  function v2Money(value) {
    return `¥${Number(value || 0).toLocaleString("ja-JP")}`;
  }

  function v2EstimateCourseTakeHome() {
    if (!v2Session?.master) return null;

    const select =
      document.getElementById("nextScheduleV2Course");

    if (!select) return null;
    if (select.value === "custom") return null;

    if (select.value === "__legacy__") {
      const snapshot =
        currentVisit()?.sales_detail
          ?.course_take_home_snapshot;

      return (
        snapshot === null
        || snapshot === undefined
        || snapshot === ""
      )
        ? null
        : Number(snapshot);
    }

    const id = Number(select.value || 0);
    const course =
      v2Session.master.courses
        ?.find(item =>
          Number(item.store_course_id) === id
          && item.course_type === "regular"
        )
      || null;

    return course
      ? Number(course.take_home || 0)
      : null;
  }

  function v2EstimateExtensionTakeHome() {
    if (!v2Session?.master) return 0;

    return Array.from(
      document.querySelectorAll(
        "[data-next-v2-extension]:checked"
      )
    ).reduce((sum, input) => {
      const id = Number(input.value || 0);
      const course =
        v2Session.master.courses
          ?.find(item =>
            Number(item.store_course_id) === id
            && item.course_type === "extension"
          )
        || null;

      const quantity = Math.max(
        1,
        Number(
          document.querySelector(
            `[data-next-v2-extension-qty="${id}"]`
          )?.value
          || 1
        )
      );

      return sum
        + Number(course?.take_home || 0)
          * quantity;
    }, 0);
  }

  function v2EstimateOptionTakeHome() {
    if (!v2Session?.master) return 0;

    const standard =
      Array.from(
        document.querySelectorAll(
          "[data-next-v2-option]:checked"
        )
      ).reduce((sum, input) => {
        const name = String(input.value || "");
        const option =
          v2Session.master.options
            ?.find(item =>
              String(item.name || "") === name
            )
          || null;

        return sum + Number(option?.take_home || 0);
      }, 0);

    const customRaw =
      document.getElementById(
        "nextScheduleV2CustomOptionAmount"
      )?.value?.trim()
      || "";

    const custom =
      customRaw === ""
        ? 0
        : Number(customRaw);

    return standard
      + (Number.isFinite(custom) ? custom : 0);
  }

  function v2EstimateInputAmount(id, fallback) {
    const input = document.getElementById(id);

    if (!input || input.disabled) {
      return Number(fallback || 0);
    }

    const value = Number(input.value || 0);
    return Number.isFinite(value) ? value : 0;
  }

  function v2EstimateMetric(label, value) {
    return `
      <article>
        <span>${escapeHtml(label)}</span>
        <strong>
          ${
            value === null
              ? "−"
              : escapeHtml(v2Money(value))
          }
        </strong>
      </article>
    `;
  }

  function v2RenderEstimateSummary() {
    const form =
      document.getElementById(
        "nextScheduleEditFormV2"
      );

    if (!form) return;

    let host =
      form.querySelector(
        "[data-next-schedule-estimate]"
      );

    if (!host) {
      host = document.createElement("section");
      host.className = "next-schedule-estimate";
      host.dataset.nextScheduleEstimate = "true";

      const anchor =
        form.querySelector(
          ".next-schedule-edit-change-request"
        );

      if (anchor) {
        anchor.insertAdjacentElement(
          "beforebegin",
          host
        );
      }
    }

    if (!host) return;

    const visit = currentVisit() || {};
    const course = v2EstimateCourseTakeHome();
    const extension = v2EstimateExtensionTakeHome();
    const option = v2EstimateOptionTakeHome();
    const nomination =
      Number(visit.nomination_fee_amount || 0);

    const tip =
      v2EstimateInputAmount(
        "nextScheduleEditTip",
        visit.tip_amount
      );

    const adjustment =
      v2EstimateInputAmount(
        "nextScheduleEditAdjustment",
        visit.adjustment_amount
      );

    const total =
      course === null
        ? null
        : (
          course
          + extension
          + option
          + nomination
          + tip
          + adjustment
        );

    host.innerHTML = `
      <div class="next-schedule-estimate-head">
        <div>
          <span>ESTIMATE</span>
          <strong>今回の見込み</strong>
        </div>
        <small>予約内容ベース</small>
      </div>

      <div class="next-schedule-estimate-grid">
        ${v2EstimateMetric("コース", course)}
        ${v2EstimateMetric("延長", extension)}
        ${v2EstimateMetric("OP", option)}
        ${v2EstimateMetric("指名", nomination)}
        ${v2EstimateMetric("チップ", tip)}
        ${v2EstimateMetric("調整", adjustment)}
      </div>

      <div class="next-schedule-estimate-total">
        <span>見込み手取り合計</span>
        <strong>
          ${
            total === null
              ? "計算待ち"
              : escapeHtml(v2Money(total))
          }
        </strong>
      </div>

      ${
        course === null
          ? `
            <p class="next-schedule-estimate-note">
              カスタム時間・現行マスタ外コースは、
              コース手取りを自動計算しません。
            </p>
          `
          : ""
      }
    `;
  }

  function v2StandardOptionNames(visit) {
    return Array.isArray(visit.options)
      ? visit.options
          .filter(option =>
            option
            && option.option_id
            && option.name
          )
          .map(option => String(option.name))
      : [];
  }

  function v2CustomOption(visit) {
    const records =
      Array.isArray(visit.options)
        ? visit.options.filter(option =>
            option
            && (
              option.custom_name
              || !option.option_id
            )
          )
        : [];

    const first = records[0] || null;

    return {
      name:
        first?.custom_name
          ? String(first.custom_name)
          : "",
      amount:
        first?.income_amount === null
        || first?.income_amount === undefined
        || first?.income_amount === ""
          ? null
          : Number(first.income_amount),
      count:records.length,
    };
  }

  function v2MakeSession(visit) {
    const custom =
      v2CustomOption(visit);

    return {
      visitId:Number(visit.id),
      storeId:Number(visit.store_id || 0),
      storeCourseId:
        Number(visit.store_course_id || 0) || null,
      courseMinutes:
        Number(visit.course_minutes || 0),
      pricingCategory:
        String(
          visit.pricing_category
          || "standard"
        ),
      extensions:
        Array.isArray(visit.extensions)
          ? visit.extensions.map(item => ({
              store_course_id:
                Number(item.store_course_id),
              quantity:
                Math.max(
                  1,
                  Number(item.quantity || 1)
                ),
            }))
          : [],
      optionNames:
        v2StandardOptionNames(visit),
      customOption:
        custom.name,
      customOptionAmount:
        custom.amount,
      customOptionCount:
        custom.count,
      master:null,
      masterLoaded:false,
      storeChanged:false,
    };
  }

  function v2SafeStatusOptions(visit) {
    const linked =
      Number(visit.customer_id || 0) > 0
      || Boolean(Number(visit.customer_linked || 0));

    const values =
      linked
        ? [
            "repeat",
            "other_store_repeat",
          ]
        : [
            "new",
            "repeat_unknown_id",
            "other_store_repeat",
          ];

    const current =
      String(visit.customer_status || "");

    if (
      current
      && !values.includes(current)
    ) {
      values.unshift(current);
    }

    return values;
  }

  function v2RenderStoreOptions(visit) {
    const selected =
      Number(visit.store_id || 0);

    return V2_STORES
      .map(store => `
        <option
          value="${store.id}"
          ${store.id === selected ? "selected" : ""}
        >
          ${escapeHtml(store.name)}
        </option>
      `)
      .join("");
  }

  function v2RenderStatusOptions(visit) {
    const current =
      String(visit.customer_status || "");

    return v2SafeStatusOptions(visit)
      .map(value => `
        <option
          value="${escapeHtml(value)}"
          ${value === current ? "selected" : ""}
        >
          ${escapeHtml(
            V2_CUSTOMER_STATUS_LABELS[value]
            || value
          )}
        </option>
      `)
      .join("");
  }

  function v2RenderEditForm(visit) {
    const body =
      document.getElementById("nextScheduleDetailBody");

    if (!body || !visit) return;

    v2Session =
      v2MakeSession(visit);

    const started =
      startedParts(visit.started_at);

    const booked =
      bookedParts(visit.booked_at);

    const salesConfirmed =
      Boolean(visit.sales_confirmed_at);

    const linkedCustomerId =
      Number(visit.customer_id || 0);

    body.innerHTML = `
      <form
        class="next-schedule-edit-form"
        id="nextScheduleEditFormV2"
        novalidate
      >
        <p class="next-schedule-detail-section-label">
          PRODUCTION EDIT
        </p>

        <div class="next-schedule-edit-warning">
          <strong>本番DBを書き換えます。</strong>
          <span>保存内容は本番へ即時反映されます。</span>
        </div>

        ${
          salesConfirmed
            ? `
              <div class="next-schedule-v2-sales-warning">
                <strong>売上確定済み</strong>
                <span>
                  予約内容を変更しても、確定済み売上は自動再計算しません。
                  必要な場合は「売上」から再計算してください。
                </span>
              </div>
            `
            : ""
        }

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
            <span>店舗</span>
            <select id="nextScheduleEditStore">
              ${v2RenderStoreOptions(visit)}
            </select>
          </label>

          <label class="is-wide">
            <span>顧客区分</span>
            <select id="nextScheduleEditCustomerStatus">
              ${v2RenderStatusOptions(visit)}
            </select>
          </label>


        </div>

        <p class="next-schedule-v2-identity-note">
          ${
            linkedCustomerId
              ? `顧客 #${escapeHtml(linkedCustomerId)} との紐付けは維持します。`
              : "顧客紐付けはありません。"
          }
          この画面では顧客そのものの紐付け変更は行いません。
        </p>

        <section class="next-schedule-v2-master">
          <header>
            <div>
              <span>COURSE / OPTION MASTER</span>
              <strong>コース・延長・OP</strong>
            </div>

            <small id="nextScheduleV2MasterStatus">
              LOADING
            </small>
          </header>

          <div
            id="nextScheduleV2MasterBody"
            class="next-schedule-v2-master-body"
          >
            <p class="next-schedule-v2-loading">
              検証DBの料金マスタを読み込み中…
            </p>
          </div>
        </section>

        <div class="next-schedule-edit-grid">
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
          日時・店舗・コース・延長・OP・顧客区分・チップ・調整分を編集できます。
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
            id="nextScheduleEditSaveV2"
            disabled
          >
            マスタ読込中…
          </button>
        </div>
      </form>
    `;

    setWriteStatus(
      "VERIFICATION DB / EDITING",
      "editing"
    );

    void v2LoadMaster({
      resetForStoreChange:false,
    });
  }

  function v2CaptureMasterState() {
    if (!v2Session) return;

    const courseSelect =
      document.getElementById(
        "nextScheduleV2Course"
      );

    if (courseSelect) {
      if (courseSelect.value === "custom") {
        v2Session.storeCourseId = null;

        const customMinutes =
          Number(
            document.getElementById(
              "nextScheduleV2CustomMinutes"
            )?.value
            || 0
          );

        if (customMinutes > 0) {
          v2Session.courseMinutes =
            customMinutes;
        }
      } else {
        const courseId =
          Number(courseSelect.value || 0);

        const course =
          v2Session.master?.courses
            ?.find(item =>
              Number(item.store_course_id)
              === courseId
              && item.course_type === "regular"
            )
          || null;

        if (course) {
          v2Session.storeCourseId =
            Number(course.store_course_id);

          v2Session.courseMinutes =
            Number(course.course_minutes);

          v2Session.pricingCategory =
            String(
              course.pricing_category
              || "standard"
            );
        }
      }
    }

    v2Session.extensions =
      Array.from(
        document.querySelectorAll(
          "[data-next-v2-extension]:checked"
        )
      )
        .map(input => {
          const id =
            Number(input.value);

          const quantity =
            Math.max(
              1,
              Number(
                document.querySelector(
                  `[data-next-v2-extension-qty="${id}"]`
                )?.value
                || 1
              )
            );

          return {
            store_course_id:id,
            quantity,
          };
        });

    v2Session.optionNames =
      Array.from(
        document.querySelectorAll(
          "[data-next-v2-option]:checked"
        )
      )
        .map(input =>
          String(input.value)
        );

    v2Session.customOption =
      document.getElementById(
        "nextScheduleV2CustomOption"
      )?.value?.trim()
      || "";

    const amountRaw =
      document.getElementById(
        "nextScheduleV2CustomOptionAmount"
      )?.value?.trim()
      || "";

    v2Session.customOptionAmount =
      amountRaw === ""
        ? null
        : Number(amountRaw);
  }

  function v2ChooseCourseForMaster(
    courses,
    resetForStoreChange
  ) {
    const regular =
      courses.filter(course =>
        course.course_type === "regular"
      );

    const exactId =
      !resetForStoreChange
      && v2Session.storeCourseId
        ? regular.find(course =>
            Number(course.store_course_id)
            === Number(v2Session.storeCourseId)
          )
        : null;

    const sameMinutesAndCategory =
      regular.find(course =>
        Number(course.course_minutes)
          === Number(v2Session.courseMinutes)
        && String(
          course.pricing_category
          || "standard"
        )
          === String(
            v2Session.pricingCategory
            || "standard"
          )
      )
      || null;

    const sameMinutes =
      regular.find(course =>
        Number(course.course_minutes)
          === Number(v2Session.courseMinutes)
      )
      || null;

    const selected =
      exactId
      || sameMinutesAndCategory
      || sameMinutes
      || null;

    if (selected) {
      v2Session.storeCourseId =
        Number(selected.store_course_id);

      v2Session.courseMinutes =
        Number(selected.course_minutes);

      v2Session.pricingCategory =
        String(
          selected.pricing_category
          || "standard"
        );

    } else {
      v2Session.storeCourseId = null;
    }
  }

  function v2RenderMaster() {
    const body =
      document.getElementById(
        "nextScheduleV2MasterBody"
      );

    const status =
      document.getElementById(
        "nextScheduleV2MasterStatus"
      );

    if (
      !body
      || !v2Session
      || !v2Session.master
    ) {
      return;
    }

    const courses =
      Array.isArray(v2Session.master.courses)
        ? v2Session.master.courses
        : [];

    const options =
      Array.isArray(v2Session.master.options)
        ? v2Session.master.options
        : [];

    const regular =
      courses
        .filter(course =>
          course.course_type === "regular"
        )
        .sort((a, b) => {
          const categoryA =
            a.pricing_category === "foreign"
              ? 1
              : 0;

          const categoryB =
            b.pricing_category === "foreign"
              ? 1
              : 0;

          if (categoryA !== categoryB) {
            return categoryA - categoryB;
          }

          const minuteDiff =
            Number(a.course_minutes || 0)
            - Number(b.course_minutes || 0);

          if (minuteDiff !== 0) {
            return minuteDiff;
          }

          return (
            Number(a.store_course_id || 0)
            - Number(b.store_course_id || 0)
          );
        });

    const extensions =
      courses.filter(course =>
        course.course_type === "extension"
      );

    const courseOptions =
      regular
        .map(course => {
          const id =
            Number(course.store_course_id);

          const selected =
            Number(v2Session.storeCourseId)
              === id;

          const minutes =
            Number(course.course_minutes || 0);

          const isForeign =
            course.pricing_category
              === "foreign";

          const baseLabel =
            isForeign
              ? `外国人 ${minutes}分`
              : `${minutes}分`;

          const rawName =
            String(
              course.course_name
              || ""
            ).trim();

          const normalizedName =
            rawName.replace(/\s+/g, "");

          const redundantNames =
            new Set([
              `${minutes}分`,
              String(minutes),
              `外${minutes}分`,
              `外国人${minutes}分`,
              `外国人${minutes}`,
            ]);

          const detailName =
            rawName
            && !redundantNames.has(normalizedName)
              ? ` / ${rawName}`
              : "";

          return `
            <option
              value="${id}"
              ${selected ? "selected" : ""}
            >
              ${escapeHtml(
                `${baseLabel}${detailName} / 手取り ${v2Money(course.take_home)}`
              )}
            </option>
          `;
        })
        .join("");

    const customSelected =
      !v2Session.storeCourseId;

    const extensionHtml =
      extensions.length
        ? extensions
            .map(course => {
              const id =
                Number(course.store_course_id);

              const selected =
                v2Session.extensions
                  .find(item =>
                    Number(item.store_course_id)
                    === id
                  )
                || null;

              const quantity =
                selected
                  ? Math.max(
                      1,
                      Number(selected.quantity || 1)
                    )
                  : 1;

              return `
                <div class="next-schedule-v2-extension-row">
                  <label>
                    <input
                      type="checkbox"
                      data-next-v2-extension
                      value="${id}"
                      ${selected ? "checked" : ""}
                    >
                    <span>
                      ${escapeHtml(
                        String(
                          course.course_name
                          || `延長 ${course.course_minutes}分`
                        )
                      )}
                    </span>
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputmode="numeric"
                    value="${quantity}"
                    data-next-v2-extension-qty="${id}"
                    ${selected ? "" : "disabled"}
                    aria-label="延長回数"
                  >
                </div>
              `;
            })
            .join("")
        : `
            <p class="next-schedule-v2-empty">
              この店舗の延長マスタはありません。
            </p>
          `;

    const optionHtml =
      options.length
        ? options
            .map(option => {
              const name =
                String(option.name || "");

              const checked =
                v2Session.optionNames
                  .includes(name);

              return `
                <label class="next-schedule-v2-option">
                  <input
                    type="checkbox"
                    data-next-v2-option
                    value="${escapeHtml(name)}"
                    ${checked ? "checked" : ""}
                  >
                  <span>
                    <strong>${escapeHtml(name)}</strong>
                    <small>
                      手取り ${escapeHtml(v2Money(option.take_home))}
                    </small>
                  </span>
                </label>
              `;
            })
            .join("")
        : `
            <p class="next-schedule-v2-empty">
              この店舗のOPマスタはありません。
            </p>
          `;

    body.innerHTML = `
      <div class="next-schedule-v2-section">
        <label class="next-schedule-v2-field">
          <span>コース</span>
          <select id="nextScheduleV2Course">
            ${courseOptions}
            <option
              value="custom"
              ${customSelected ? "selected" : ""}
            >
              カスタム時間
            </option>
          </select>
        </label>

        <label
          class="next-schedule-v2-field next-schedule-v2-custom-course"
          id="nextScheduleV2CustomCourseWrap"
          ${customSelected ? "" : "hidden"}
        >
          <span>カスタム予約時間（分）</span>
          <input
            id="nextScheduleV2CustomMinutes"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            value="${escapeHtml(v2Session.courseMinutes)}"
          >
        </label>
      </div>

      <div class="next-schedule-v2-section">
        <span class="next-schedule-v2-label">
          延長
        </span>

        <div class="next-schedule-v2-extension-list">
          ${extensionHtml}
        </div>
      </div>

      <div class="next-schedule-v2-section">
        <span class="next-schedule-v2-label">
          OP
        </span>

        <div class="next-schedule-v2-option-list">
          ${optionHtml}
        </div>

        <div class="next-schedule-v2-custom-option-grid">
          <label class="next-schedule-v2-field">
            <span>その他OP名</span>
            <input
              id="nextScheduleV2CustomOption"
              type="text"
              value="${escapeHtml(v2Session.customOption)}"
              placeholder="その他OP"
            >
          </label>

          <label class="next-schedule-v2-field">
            <span>その他OP手取り</span>
            <input
              id="nextScheduleV2CustomOptionAmount"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              value="${
                v2Session.customOptionAmount === null
                  ? ""
                  : escapeHtml(v2Session.customOptionAmount)
              }"
              placeholder="0"
            >
          </label>
        </div>
      </div>
    `;

    if (status) {
      status.textContent =
        "VERIFICATION / READY";
      status.dataset.state = "ready";
    }

    const save =
      document.getElementById(
        "nextScheduleEditSaveV2"
      );

    if (save) {
      save.disabled = false;
      save.textContent = "本番DBへ保存";
    }
  }

  async function v2LoadMaster({
    resetForStoreChange,
  }) {
    if (!v2Session) return;

    if (v2Session.masterLoaded) {
      v2CaptureMasterState();
    }

    const storeId =
      Number(
        document.getElementById(
          "nextScheduleEditStore"
        )?.value
        || 0
      );

    const date =
      document.getElementById(
        "nextScheduleEditDate"
      )?.value?.trim()
      || "";

    const time =
      document.getElementById(
        "nextScheduleEditTime"
      )?.value?.trim()
      || "";

    const body =
      document.getElementById(
        "nextScheduleV2MasterBody"
      );

    const status =
      document.getElementById(
        "nextScheduleV2MasterStatus"
      );

    const save =
      document.getElementById(
        "nextScheduleEditSaveV2"
      );

    if (
      !storeId
      || !date
      || !time
    ) {
      v2Session.masterLoaded = false;

      if (body) {
        body.innerHTML = `
          <p class="next-schedule-v2-error">
            店舗・予約日・開始時間を確認してね。
          </p>
        `;
      }

      if (status) {
        status.textContent = "INPUT REQUIRED";
        status.dataset.state = "error";
      }

      if (save) {
        save.disabled = true;
      }

      return;
    }

    if (status) {
      status.textContent = "LOADING";
      status.dataset.state = "loading";
    }

    if (save) {
      save.disabled = true;
      save.textContent = "マスタ読込中…";
    }

    const params =
      new URLSearchParams({
        store_id:String(storeId),
        at:`${date} ${time}:00`,
      });

    try {
      const response =
        await fetch(
          `${V2_MASTER_API}?${params.toString()}`,
          {
            method:"GET",
            credentials:"same-origin",
            cache:"no-store",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok
        || !data
        || data.success !== true
      ) {
        throw new Error(
          data?.error
          || "料金マスタを取得できませんでした。"
        );
      }

      v2Session.master = {
        store:data.store || null,
        courses:
          Array.isArray(data.courses)
            ? data.courses
            : [],
        options:
          Array.isArray(data.options)
            ? data.options
            : [],
        dailyFeeRule:
          data.daily_fee_rule || null,
      };

      if (resetForStoreChange) {
        v2Session.storeChanged = true;
        v2Session.extensions = [];

        const availableOptions =
          new Set(
            v2Session.master.options
              .map(option =>
                String(option.name || "")
              )
          );

        v2Session.optionNames =
          v2Session.optionNames
            .filter(name =>
              availableOptions.has(name)
            );
      }

      v2ChooseCourseForMaster(
        v2Session.master.courses,
        resetForStoreChange
      );

      v2Session.storeId = storeId;
      v2Session.masterLoaded = true;

      v2RenderMaster();

    } catch (error) {
      v2Session.masterLoaded = false;

      if (body) {
        body.innerHTML = `
          <p class="next-schedule-v2-error">
            ${escapeHtml(
              error.message
              || "料金マスタを取得できませんでした。"
            )}
          </p>
        `;
      }

      if (status) {
        status.textContent = "LOAD ERROR";
        status.dataset.state = "error";
      }

      if (save) {
        save.disabled = true;
        save.textContent = "保存できません";
      }
    }
  }

  function v2ReadPositiveInteger(
    id,
    label
  ) {
    const raw =
      document.getElementById(id)
        ?.value
        ?.trim()
      || "";

    const value =
      Number(raw);

    if (
      !Number.isSafeInteger(value)
      || value <= 0
    ) {
      throw new Error(
        `${label}は1以上の整数で入力してね。`
      );
    }

    return value;
  }

  function v2ReadNonNegativeInteger(
    id,
    label,
    allowBlank = false
  ) {
    const raw =
      document.getElementById(id)
        ?.value
        ?.trim()
      || "";

    if (
      allowBlank
      && raw === ""
    ) {
      return null;
    }

    const value =
      Number(raw);

    if (
      !Number.isSafeInteger(value)
      || value < 0
    ) {
      throw new Error(
        `${label}は0以上の整数で入力してね。`
      );
    }

    return value;
  }

  async function v2SaveEdit() {
    const visit =
      currentVisit();

    if (
      !visit
      || !v2Session
      || Number(v2Session.visitId)
        !== Number(visit.id)
    ) {
      throw new Error(
        "編集対象の予約が見つかりません。"
      );
    }

    if (!v2Session.masterLoaded) {
      throw new Error(
        "料金マスタの読込が完了していません。"
      );
    }

    v2CaptureMasterState();

    const date =
      document.getElementById(
        "nextScheduleEditDate"
      )?.value?.trim()
      || "";

    const time =
      document.getElementById(
        "nextScheduleEditTime"
      )?.value?.trim()
      || "";

    if (!date || !time) {
      throw new Error(
        "予約日と開始時間を入れてね。"
      );
    }

    const bookedDate =
      document.getElementById(
        "nextScheduleEditBookedDate"
      )?.value?.trim()
      || "";

    const bookedTime =
      document.getElementById(
        "nextScheduleEditBookedTime"
      )?.value?.trim()
      || "";

    if (
      (bookedDate && !bookedTime)
      || (!bookedDate && bookedTime)
    ) {
      throw new Error(
        "予約受付日は日付と時刻を両方入れてね。"
      );
    }

    const storeId =
      Number(
        document.getElementById(
          "nextScheduleEditStore"
        )?.value
        || 0
      );

    if (!storeId) {
      throw new Error(
        "店舗を選んでね。"
      );
    }

    const courseSelect =
      document.getElementById(
        "nextScheduleV2Course"
      );

    if (!courseSelect) {
      throw new Error(
        "コースを読み込めませんでした。"
      );
    }

    let storeCourseId = null;
    let courseMinutes = 0;

    if (courseSelect.value === "custom") {
      courseMinutes =
        v2ReadPositiveInteger(
          "nextScheduleV2CustomMinutes",
          "カスタム予約時間"
        );

    } else {
      storeCourseId =
        Number(courseSelect.value || 0);

      const course =
        v2Session.master.courses
          .find(item =>
            Number(item.store_course_id)
              === storeCourseId
            && item.course_type === "regular"
          )
        || null;

      if (!course) {
        throw new Error(
          "選択したコースが料金マスタにありません。"
        );
      }

      courseMinutes =
        Number(course.course_minutes);
    }

    const extensions =
      Array.from(
        document.querySelectorAll(
          "[data-next-v2-extension]:checked"
        )
      )
        .map(input => {
          const id =
            Number(input.value);

          const quantityRaw =
            document.querySelector(
              `[data-next-v2-extension-qty="${id}"]`
            )?.value
            || "1";

          const quantity =
            Number(quantityRaw);

          if (
            !Number.isSafeInteger(quantity)
            || quantity <= 0
          ) {
            throw new Error(
              "延長回数は1以上の整数で入力してね。"
            );
          }

          return {
            store_course_id:id,
            quantity,
          };
        });

    const options =
      Array.from(
        document.querySelectorAll(
          "[data-next-v2-option]:checked"
        )
      )
        .map(input =>
          String(input.value).trim()
        )
        .filter(Boolean);

    const customOption =
      document.getElementById(
        "nextScheduleV2CustomOption"
      )?.value?.trim()
      || "";

    const customOptionAmount =
      v2ReadNonNegativeInteger(
        "nextScheduleV2CustomOptionAmount",
        "その他OP手取り",
        true
      );

    if (
      customOption === ""
      && customOptionAmount !== null
    ) {
      throw new Error(
        "その他OP金額を入れる場合は、その他OP名も入力してね。"
      );
    }

    const customerStatus =
      document.getElementById(
        "nextScheduleEditCustomerStatus"
      )?.value
      || "";

    if (!customerStatus) {
      throw new Error(
        "顧客区分を選んでね。"
      );
    }

    const payload = {
      id:Number(visit.id),
      store_id:storeId,
      started_at:`${date} ${time}`,
      booked_at:
        bookedDate && bookedTime
          ? `${bookedDate} ${bookedTime}`
          : null,
      course_minutes:courseMinutes,
      store_course_id:storeCourseId,
      extensions,
      options,
      custom_option:customOption,
      custom_option_amount:
        customOptionAmount,
      customer_requested_change:
        Boolean(
          document.getElementById(
            "nextScheduleEditCustomerRequestedChange"
          )?.checked
        ),
    };

    if (
      customerStatus
      !== String(
        visit.customer_status || ""
      )
    ) {
      payload.customer_status =
        customerStatus;
    }

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
      document.getElementById(
        "nextScheduleEditSaveV2"
      );

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "保存中…";
    }

    editMessage(
      "検証DBへ予約内容を保存しています…"
    );

    setWriteStatus(
      "VERIFICATION DB / WRITING",
      "writing"
    );

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
        data =
          await response.json();
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

      const scheduleApi =
        api();

      const updatedVisit =
        data.visit;

      const index =
        scheduleApi.state.visits
          .findIndex(item =>
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

      v2Session = null;

      scheduleApi.openDetail(
        updatedVisit,
        null
      );

      setWriteStatus(
        "SAVED / PRODUCTION",
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
          "本番DBへ保存";
      }
    }
  }

  document.addEventListener(
    "click",
    event => {
      const visitorButton =
        event.target.closest(
          "[data-next-detail-visitor-type]"
        );

      if (!visitorButton) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      void saveDetailVisitorType(
        visitorButton.dataset
          .nextDetailVisitorType
        || ""
      ).catch(() => {});
    },
    true
  );

  document.addEventListener(
    "click",
    event => {
      const openButton =
        event.target.closest(
          "[data-next-schedule-edit-open]"
        );

      if (!openButton) {
        return;
      }

      const visit =
        currentVisit();

      if (!visit) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      v2RenderEditForm(visit);
    },
    true
  );

  document.addEventListener(
    "change",
    event => {
      if (
        !event.target.closest(
          "#nextScheduleEditFormV2"
        )
      ) {
        return;
      }

      if (
        event.target.matches(
          "#nextScheduleEditStore"
        )
      ) {
        void v2LoadMaster({
          resetForStoreChange:true,
        });
        return;
      }

      if (
        event.target.matches(
          "#nextScheduleEditDate, #nextScheduleEditTime"
        )
      ) {
        void v2LoadMaster({
          resetForStoreChange:false,
        });
        return;
      }

      if (
        event.target.matches(
          "#nextScheduleV2Course"
        )
      ) {
        const wrap =
          document.getElementById(
            "nextScheduleV2CustomCourseWrap"
          );

        if (wrap) {
          wrap.hidden =
            event.target.value !== "custom";
        }

        v2CaptureMasterState();
        return;
      }

      if (
        event.target.matches(
          "[data-next-v2-extension]"
        )
      ) {
        const id =
          Number(event.target.value);

        const quantity =
          document.querySelector(
            `[data-next-v2-extension-qty="${id}"]`
          );

        if (quantity) {
          quantity.disabled =
            !event.target.checked;
        }

        v2CaptureMasterState();
        return;
      }

      if (
        event.target.matches(
          "[data-next-v2-extension-qty], [data-next-v2-option], #nextScheduleV2CustomOption, #nextScheduleV2CustomOptionAmount, #nextScheduleV2CustomMinutes"
        )
      ) {
        v2CaptureMasterState();
      }
    }
  );

  function v2EstimateRefreshFromEvent(event) {
    const target = event.target;

    if (
      !target
      || !target.closest(
        "#nextScheduleEditFormV2"
      )
    ) {
      return;
    }

    if (
      target.matches(
        "#nextScheduleV2Course, "
        + "[data-next-v2-extension], "
        + "[data-next-v2-extension-qty], "
        + "[data-next-v2-option], "
        + "#nextScheduleV2CustomOptionAmount, "
        + "#nextScheduleEditTip, "
        + "#nextScheduleEditAdjustment"
      )
    ) {
      queueMicrotask(v2RenderEstimateSummary);
    }
  }

  document.addEventListener(
    "input",
    v2EstimateRefreshFromEvent
  );

  document.addEventListener(
    "change",
    v2EstimateRefreshFromEvent
  );

  document.addEventListener(
    "submit",
    event => {
      const form =
        event.target.closest(
          "#nextScheduleEditFormV2"
        );

      if (!form) return;

      event.preventDefault();

      void v2SaveEdit().catch(error => {
        editMessage(
          error.message
          || "予約の保存に失敗しました。",
          true
        );

        setWriteStatus(
          "WRITE ERROR / VERIFICATION",
          "error"
        );

        const save =
          document.getElementById(
            "nextScheduleEditSaveV2"
          );

        if (save) {
          save.disabled = false;
          save.textContent =
            "本番DBへ保存";
        }
      });
    }
  );



  /* WRITER:NEXT_WORK_SCHEDULE_PRESERVATION_GUARD:START */

  const v2GuardOriginalMakeSession =
    v2MakeSession;

  const v2GuardOriginalCaptureMasterState =
    v2CaptureMasterState;

  const v2GuardOriginalChooseCourseForMaster =
    v2ChooseCourseForMaster;

  const v2GuardOriginalRenderMaster =
    v2RenderMaster;

  function v2GuardCustomRecords(visit) {
    return Array.isArray(visit.options)
      ? visit.options
          .filter(option =>
            option
            && (
              option.custom_name
              || !option.option_id
            )
          )
          .map(option => ({
            name:
              option.custom_name
                ? String(option.custom_name)
                : "",
            amount:
              option.income_amount === null
              || option.income_amount === undefined
              || option.income_amount === ""
                ? null
                : Number(option.income_amount),
          }))
      : [];
  }

  function v2GuardExtensionMeta(visit) {
    const meta = {};

    if (!Array.isArray(visit.extensions)) {
      return meta;
    }

    visit.extensions.forEach(item => {
      const id =
        Number(item.store_course_id || 0);

      if (!id) return;

      meta[id] = {
        name:
          String(item.course_name || ""),
        minutes:
          Number(item.course_minutes || 0),
      };
    });

    return meta;
  }

  v2MakeSession = function(visit) {
    const session =
      v2GuardOriginalMakeSession(visit);

    session.originalStoreId =
      Number(visit.store_id || 0);

    session.dirty = {
      store:false,
      course:false,
      extensions:false,
      options:false,
    };

    session.courseLegacy = false;
    session.legacyOptionNames = [];
    session.legacyExtensions = [];
    session.optionEditLocked = false;
    session.extensionEditLocked = false;

    session.protectedCustomOptions =
      v2GuardCustomRecords(visit);

    session.extensionMeta =
      v2GuardExtensionMeta(visit);

    return session;
  };

  v2CaptureMasterState = function() {
    if (!v2Session) return;

    const previousCourse = {
      storeCourseId:
        v2Session.storeCourseId,
      courseMinutes:
        v2Session.courseMinutes,
      pricingCategory:
        v2Session.pricingCategory,
    };

    const previousExtensions =
      Array.isArray(v2Session.extensions)
        ? v2Session.extensions.map(item => ({
            ...item,
          }))
        : [];

    const previousOptionNames =
      Array.isArray(v2Session.optionNames)
        ? [...v2Session.optionNames]
        : [];

    const previousCustomOption =
      v2Session.customOption;

    const previousCustomOptionAmount =
      v2Session.customOptionAmount;

    v2GuardOriginalCaptureMasterState();

    const courseSelect =
      document.getElementById(
        "nextScheduleV2Course"
      );

    if (
      v2Session.courseLegacy
      && courseSelect?.value === "__legacy__"
    ) {
      v2Session.storeCourseId =
        previousCourse.storeCourseId;

      v2Session.courseMinutes =
        previousCourse.courseMinutes;

      v2Session.pricingCategory =
        previousCourse.pricingCategory;
    }

    if (v2Session.extensionEditLocked) {
      v2Session.extensions =
        previousExtensions;
    }

    if (v2Session.optionEditLocked) {
      v2Session.optionNames =
        previousOptionNames;

      v2Session.customOption =
        previousCustomOption;

      v2Session.customOptionAmount =
        previousCustomOptionAmount;
    }
  };

  v2ChooseCourseForMaster = function(
    courses,
    resetForStoreChange
  ) {
    if (!v2Session) {
      return v2GuardOriginalChooseCourseForMaster(
        courses,
        resetForStoreChange
      );
    }

    const regular =
      Array.isArray(courses)
        ? courses.filter(course =>
            course.course_type === "regular"
          )
        : [];

    if (!resetForStoreChange) {
      if (!v2Session.storeCourseId) {
        v2Session.courseLegacy = false;
        return;
      }

      const exact =
        regular.find(course =>
          Number(course.store_course_id)
          === Number(v2Session.storeCourseId)
        )
        || null;

      if (!exact) {
        v2Session.courseLegacy = true;
        return;
      }

      v2Session.courseLegacy = false;
    } else {
      v2Session.courseLegacy = false;
    }

    return v2GuardOriginalChooseCourseForMaster(
      courses,
      resetForStoreChange
    );
  };

  function v2GuardRefreshProtectionState() {
    if (
      !v2Session
      || !v2Session.master
    ) {
      return;
    }

    const masterOptionNames =
      new Set(
        (
          Array.isArray(
            v2Session.master.options
          )
            ? v2Session.master.options
            : []
        )
          .map(option =>
            String(option.name || "")
          )
          .filter(Boolean)
      );

    v2Session.legacyOptionNames =
      (
        Array.isArray(v2Session.optionNames)
          ? v2Session.optionNames
          : []
      )
        .filter(name =>
          !masterOptionNames.has(
            String(name)
          )
        );

    const masterExtensionIds =
      new Set(
        (
          Array.isArray(
            v2Session.master.courses
          )
            ? v2Session.master.courses
            : []
        )
          .filter(course =>
            course.course_type
            === "extension"
          )
          .map(course =>
            Number(course.store_course_id)
          )
      );

    v2Session.legacyExtensions =
      (
        Array.isArray(v2Session.extensions)
          ? v2Session.extensions
          : []
      )
        .filter(item =>
          !masterExtensionIds.has(
            Number(item.store_course_id)
          )
        );

    v2Session.optionEditLocked =
      (
        Array.isArray(
          v2Session.protectedCustomOptions
        )
        && v2Session.protectedCustomOptions.length > 1
      )
      || v2Session.legacyOptionNames.length > 0;

    v2Session.extensionEditLocked =
      v2Session.legacyExtensions.length > 0;
  }

  function v2GuardAppendNotice(
    target,
    text
  ) {
    if (!target || !text) return;

    const notice =
      document.createElement("p");

    notice.className =
      "next-schedule-edit-lock-note";

    notice.textContent = text;

    target.appendChild(notice);
  }

  function v2GuardCustomSummary() {
    const records =
      Array.isArray(
        v2Session?.protectedCustomOptions
      )
        ? v2Session.protectedCustomOptions
        : [];

    return records
      .map(record => {
        const name =
          record.name || "名称なし";

        const amount =
          record.amount === null
            ? ""
            : ` ${v2Money(record.amount)}`;

        return `${name}${amount}`;
      })
      .join(" / ");
  }

  function v2GuardExtensionSummary() {
    const records =
      Array.isArray(
        v2Session?.legacyExtensions
      )
        ? v2Session.legacyExtensions
        : [];

    return records
      .map(item => {
        const id =
          Number(item.store_course_id || 0);

        const meta =
          v2Session.extensionMeta?.[id]
          || {};

        const label =
          meta.name
          || (
            meta.minutes
              ? `延長 ${meta.minutes}分`
              : `延長 #${id}`
          );

        const quantity =
          Math.max(
            1,
            Number(item.quantity || 1)
          );

        return `${label} ×${quantity}`;
      })
      .join(" / ");
  }

  v2RenderMaster = function() {
    v2GuardRefreshProtectionState();

    v2GuardOriginalRenderMaster();

    if (!v2Session) return;

    const courseSelect =
      document.getElementById(
        "nextScheduleV2Course"
      );

    if (
      v2Session.courseLegacy
      && courseSelect
    ) {
      const option =
        document.createElement("option");

      option.value = "__legacy__";

      const prefix =
        v2Session.pricingCategory
          === "foreign"
          ? "外国人 "
          : "";

      option.textContent =
        `既存 ${prefix}${Number(
          v2Session.courseMinutes || 0
        )}分 / 現行マスタ外（保持）`;

      courseSelect.insertBefore(
        option,
        courseSelect.firstChild
      );

      courseSelect.value =
        "__legacy__";

      const customWrap =
        document.getElementById(
          "nextScheduleV2CustomCourseWrap"
        );

      if (customWrap) {
        customWrap.hidden = true;
      }

      v2GuardAppendNotice(
        courseSelect.closest(
          ".next-schedule-v2-section"
        ),
        "既存コースは現在の料金マスタ外です。別コースを明示選択するまでDBの既存値をそのまま保持します。"
      );
    }

    const extensionList =
      document.querySelector(
        ".next-schedule-v2-extension-list"
      );

    if (
      v2Session.extensionEditLocked
      && extensionList
    ) {
      extensionList
        .querySelectorAll("input")
        .forEach(input => {
          input.disabled = true;
        });

      v2GuardAppendNotice(
        extensionList.closest(
          ".next-schedule-v2-section"
        ),
        `現行マスタ外の既存延長を保護中: ${v2GuardExtensionSummary()}。この予約では延長編集をロックし、既存DB値を維持します。`
      );
    }

    const optionList =
      document.querySelector(
        ".next-schedule-v2-option-list"
      );

    const customGrid =
      document.querySelector(
        ".next-schedule-v2-custom-option-grid"
      );

    if (v2Session.optionEditLocked) {
      optionList
        ?.querySelectorAll("input")
        .forEach(input => {
          input.disabled = true;
        });

      customGrid
        ?.querySelectorAll("input")
        .forEach(input => {
          input.disabled = true;
        });

      const reasons = [];

      if (
        v2Session.legacyOptionNames.length
      ) {
        reasons.push(
          `現行マスタ外OP: ${
            v2Session.legacyOptionNames.join(" / ")
          }`
        );
      }

      if (
        v2Session.protectedCustomOptions.length > 1
      ) {
        reasons.push(
          `その他OP複数件: ${
            v2GuardCustomSummary()
          }`
        );
      }

      v2GuardAppendNotice(
        optionList?.closest(
          ".next-schedule-v2-section"
        )
        || customGrid?.closest(
          ".next-schedule-v2-section"
        ),
        `${reasons.join("。")}。この予約ではOP編集をロックし、既存DB値を全件そのまま保持します。`
      );
    }

    v2RenderEstimateSummary();
  };

  function v2GuardMarkDirty(
    event
  ) {
    const target =
      event.target;

    if (
      !target
      || !target.closest(
        "#nextScheduleEditFormV2"
      )
      || !v2Session
    ) {
      return;
    }

    if (
      target.matches(
        "#nextScheduleEditStore"
      )
    ) {
      if (
        v2Session.courseLegacy
        || v2Session.optionEditLocked
        || v2Session.extensionEditLocked
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();

        target.value =
          String(v2Session.storeId);

        editMessage(
          "現行マスタ外の既存データを保護中のため、この予約では店舗変更をロックしています。",
          true
        );

        return;
      }

      v2Session.dirty.store = true;
      v2Session.dirty.course = true;
      v2Session.dirty.extensions = true;
      v2Session.dirty.options = true;

      return;
    }

    if (
      target.matches(
        "#nextScheduleV2Course, #nextScheduleV2CustomMinutes"
      )
    ) {
      v2Session.dirty.course = true;
      return;
    }

    if (
      target.matches(
        "[data-next-v2-extension], [data-next-v2-extension-qty]"
      )
    ) {
      v2Session.dirty.extensions = true;
      return;
    }

    if (
      target.matches(
        "[data-next-v2-option], #nextScheduleV2CustomOption, #nextScheduleV2CustomOptionAmount"
      )
    ) {
      v2Session.dirty.options = true;
    }
  }

  document.addEventListener(
    "change",
    v2GuardMarkDirty,
    true
  );

  document.addEventListener(
    "input",
    event => {
      const target =
        event.target;

      if (
        !target
        || !target.closest(
          "#nextScheduleEditFormV2"
        )
        || !v2Session
      ) {
        return;
      }

      if (
        target.matches(
          "#nextScheduleV2CustomMinutes"
        )
      ) {
        v2Session.dirty.course = true;
      }

      if (
        target.matches(
          "[data-next-v2-extension-qty]"
        )
      ) {
        v2Session.dirty.extensions = true;
      }

      if (
        target.matches(
          "#nextScheduleV2CustomOption, #nextScheduleV2CustomOptionAmount"
        )
      ) {
        v2Session.dirty.options = true;
      }
    },
    true
  );

  async function v2GuardSaveEdit() {
    const visit =
      currentVisit();

    if (
      !visit
      || !v2Session
      || Number(v2Session.visitId)
        !== Number(visit.id)
    ) {
      throw new Error(
        "編集対象の予約が見つかりません。"
      );
    }

    if (!v2Session.masterLoaded) {
      throw new Error(
        "料金マスタの読込が完了していません。"
      );
    }

    v2CaptureMasterState();

    const date =
      document.getElementById(
        "nextScheduleEditDate"
      )?.value?.trim()
      || "";

    const time =
      document.getElementById(
        "nextScheduleEditTime"
      )?.value?.trim()
      || "";

    if (!date || !time) {
      throw new Error(
        "予約日と開始時間を入れてね。"
      );
    }

    const bookedDate =
      document.getElementById(
        "nextScheduleEditBookedDate"
      )?.value?.trim()
      || "";

    const bookedTime =
      document.getElementById(
        "nextScheduleEditBookedTime"
      )?.value?.trim()
      || "";

    if (
      (bookedDate && !bookedTime)
      || (!bookedDate && bookedTime)
    ) {
      throw new Error(
        "予約受付日は日付と時刻を両方入れてね。"
      );
    }

    const storeId =
      Number(
        document.getElementById(
          "nextScheduleEditStore"
        )?.value
        || 0
      );

    if (!storeId) {
      throw new Error(
        "店舗を選んでね。"
      );
    }

    const storeChanged =
      storeId
      !== Number(visit.store_id || 0);

    const courseChanged =
      Boolean(
        v2Session.dirty.course
        || storeChanged
      );

    const extensionsChanged =
      Boolean(
        v2Session.dirty.extensions
        || storeChanged
      );

    const optionsChanged =
      Boolean(
        v2Session.dirty.options
        || storeChanged
      );

    const payload = {
      id:Number(visit.id),
      started_at:`${date} ${time}`,
      booked_at:
        bookedDate && bookedTime
          ? `${bookedDate} ${bookedTime}`
          : null,
      customer_requested_change:
        Boolean(
          document.getElementById(
            "nextScheduleEditCustomerRequestedChange"
          )?.checked
        ),
    };

    if (storeChanged) {
      payload.store_id =
        storeId;
    }

    if (courseChanged) {
      const courseSelect =
        document.getElementById(
          "nextScheduleV2Course"
        );

      if (!courseSelect) {
        throw new Error(
          "コースを読み込めませんでした。"
        );
      }

      if (
        courseSelect.value === "__legacy__"
      ) {
        throw new Error(
          "現行マスタ外の既存コースは、そのまま保持できます。変更する場合は新しいコースを明示選択してね。"
        );
      }

      if (
        courseSelect.value === "custom"
      ) {
        payload.course_minutes =
          v2ReadPositiveInteger(
            "nextScheduleV2CustomMinutes",
            "カスタム予約時間"
          );

        payload.store_course_id =
          null;

      } else {
        const storeCourseId =
          Number(courseSelect.value || 0);

        const course =
          v2Session.master.courses
            .find(item =>
              Number(item.store_course_id)
                === storeCourseId
              && item.course_type
                === "regular"
            )
          || null;

        if (!course) {
          throw new Error(
            "選択したコースが料金マスタにありません。"
          );
        }

        payload.course_minutes =
          Number(course.course_minutes);

        payload.store_course_id =
          storeCourseId;
      }
    }

    if (extensionsChanged) {
      if (v2Session.extensionEditLocked) {
        throw new Error(
          "現行マスタ外の既存延長を保護中です。延長を変更せず、他の項目だけ保存してね。"
        );
      }

      payload.extensions =
        Array.from(
          document.querySelectorAll(
            "[data-next-v2-extension]:checked"
          )
        )
          .map(input => {
            const id =
              Number(input.value);

            const quantity =
              Number(
                document.querySelector(
                  `[data-next-v2-extension-qty="${id}"]`
                )?.value
                || 1
              );

            if (
              !Number.isSafeInteger(quantity)
              || quantity <= 0
            ) {
              throw new Error(
                "延長回数は1以上の整数で入力してね。"
              );
            }

            return {
              store_course_id:id,
              quantity,
            };
          });
    }

    if (optionsChanged) {
      if (v2Session.optionEditLocked) {
        throw new Error(
          "既存OPの完全保持ガードが有効です。OPを変更せず、他の項目だけ保存してね。"
        );
      }

      const options =
        Array.from(
          document.querySelectorAll(
            "[data-next-v2-option]:checked"
          )
        )
          .map(input =>
            String(input.value).trim()
          )
          .filter(Boolean);

      const customOption =
        document.getElementById(
          "nextScheduleV2CustomOption"
        )?.value?.trim()
        || "";

      const customOptionAmount =
        v2ReadNonNegativeInteger(
          "nextScheduleV2CustomOptionAmount",
          "その他OP手取り",
          true
        );

      if (
        customOption === ""
        && customOptionAmount !== null
      ) {
        throw new Error(
          "その他OP金額を入れる場合は、その他OP名も入力してね。"
        );
      }

      payload.options =
        options;

      payload.custom_option =
        customOption;

      payload.custom_option_amount =
        customOptionAmount;
    }

    const customerStatus =
      document.getElementById(
        "nextScheduleEditCustomerStatus"
      )?.value
      || "";

    if (!customerStatus) {
      throw new Error(
        "顧客区分を選んでね。"
      );
    }

    if (
      customerStatus
      !== String(
        visit.customer_status || ""
      )
    ) {
      payload.customer_status =
        customerStatus;
    }

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
      document.getElementById(
        "nextScheduleEditSaveV2"
      );

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent =
        "保存中…";
    }

    editMessage(
      "検証DBへ予約内容を保存しています…"
    );

    setWriteStatus(
      "VERIFICATION DB / WRITING",
      "writing"
    );

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
        data =
          await response.json();
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

      const scheduleApi =
        api();

      const updatedVisit =
        data.visit;

      const index =
        scheduleApi.state.visits
          .findIndex(item =>
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

      v2Session = null;

      scheduleApi.openDetail(
        updatedVisit,
        null
      );

      setWriteStatus(
        "SAVED / PRODUCTION",
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
          "本番DBへ保存";
      }
    }
  }

  v2SaveEdit =
    v2GuardSaveEdit;

  /* WRITER:NEXT_WORK_SCHEDULE_PRESERVATION_GUARD:END */


  const detailBody =
    document.getElementById(
      "nextScheduleDetailBody"
    );

  if (detailBody) {
    const detailQuickObserver =
      new MutationObserver(() => {
        mountDetailQuickActions();
      });

    detailQuickObserver.observe(
      detailBody,
      {
        childList:true,
      }
    );

    queueMicrotask(
      mountDetailQuickActions
    );
  }

  const footerEditButton =
    detailFooterEditButton();

  if (footerEditButton) {
    const footerEditObserver =
      new MutationObserver(() => {
        syncDetailQuickEditButton();
      });

    footerEditObserver.observe(
      footerEditButton,
      {
        attributes:true,
        childList:true,
        characterData:true,
        subtree:true,
      }
    );
  }

  const scheduleApi = api();
  scheduleApi.verificationWriteEnabled = false;
  scheduleApi.productionWriteEnabled = true;

  setWriteStatus(
    "PRODUCTION DB / EDIT READY",
    ""
  );
})();
