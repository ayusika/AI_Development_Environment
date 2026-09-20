(() => {
  "use strict";

  const SCHEDULE_API = "/api/v1/schedule.php";
  const SHIFTS_API = "/api/v1/shifts.php";
  const START_HOUR = 11;
  const END_HOUR = 27;
  const BASE_HOUR_HEIGHT =
    window.matchMedia(
      "(max-width: 760px)"
    ).matches
      ? 72
      : 96;

  const ZOOM = {
    min:54,
    max:150,
    step:6,
  };

  const state = {
    view: "two-weeks",
    anchorDate: localDateString(new Date()),
    hourHeight: BASE_HOUR_HEIGHT,
    visits: [],
    shifts: [],
    period: null,
    loaded: false,
  };

  let loadToken = 0;

  let schedulePinch =
    null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function localDateString(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function parseDate(value) {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function timeParts(value) {
    const text = String(value || "");
    return {
      date: text.slice(0, 10),
      hour: Number(text.slice(11, 13)),
      minute: Number(text.slice(14, 16)),
    };
  }

  function compactTime(value) {
    const { hour, minute } = timeParts(value);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "−";
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function weekday(value) {
    return ["日", "月", "火", "水", "木", "金", "土"][parseDate(value).getDay()];
  }

  async function readJson(response, fallback) {
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(fallback);
    }
    if (!response.ok || !data || data.success !== true) {
      throw new Error(data?.error || fallback);
    }
    return data;
  }

  function getPeriod() {
    const anchor = parseDate(state.anchorDate);
    const start = new Date(anchor);
    let days = 1;

    if (state.view === "week") {
      const day = start.getDay();
      start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
      days = 7;
    } else if (state.view === "two-weeks") {
      days = 14;
    }

    const dates = [];
    for (let index = 0; index < days; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      dates.push(localDateString(date));
    }

    return { start: dates[0], end: dates[dates.length - 1], dates };
  }

  function periodMoveDays() {
    if (state.view === "day") return 1;
    if (state.view === "week") return 7;
    return 14;
  }

  function periodLabel(period) {
    const start = parseDate(period.start);
    const end = parseDate(period.end);
    if (period.start === period.end) {
      return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日`;
    }
    return `${start.getMonth() + 1}/${start.getDate()} 〜 ${end.getMonth() + 1}/${end.getDate()}`;
  }

  function visitBusinessDate(visit) {
    const parts = timeParts(visit.started_at);
    const date = parseDate(parts.date);
    if (parts.hour >= 0 && parts.hour < 3) date.setDate(date.getDate() - 1);
    return localDateString(date);
  }

  function visitStartMinutes(visit) {
    const parts = timeParts(visit.started_at);
    let hour = parts.hour;
    if (hour >= 0 && hour < 3) hour += 24;
    return hour * 60 + parts.minute;
  }

  function isCancelledVisit(visit) {
    return Boolean(
      visit
      && (
        visit.status === "cancelled"
        || visit.cancelled_at
      )
    );
  }

  function visitsInCurrentPeriod() {
    const dates =
      new Set(
        Array.isArray(
          state.period?.dates
        )
          ? state.period.dates
          : []
      );

    return state.visits.filter(
      visit =>
        dates.has(
          visitBusinessDate(visit)
        )
    );
  }

  function cancelledVisitsInCurrentPeriod() {
    return visitsInCurrentPeriod()
      .filter(
        isCancelledVisit
      );
  }

  function businessDateTimeLabel(visit) {
    const businessDate =
      visitBusinessDate(visit);

    const date =
      String(businessDate || "")
        .split("-");

    const dateLabel =
      date.length === 3
      && date[1]
      && date[2]
        ? `${Number(date[1])}/${Number(date[2])}`
        : businessDate;

    return `${dateLabel} ${compactTime(visit?.started_at)}`.trim();
  }

  function extensionMinutes(visit) {
    return (Array.isArray(visit.extensions) ? visit.extensions : []).reduce(
      (total, extension) =>
        total
        + Number(extension.course_minutes || 0) * Number(extension.quantity || 1),
      0
    );
  }

  function visitEndAt(visit) {
    const parts = timeParts(visit?.started_at);
    const [year, month, day] =
      String(parts.date || "")
        .split("-")
        .map(Number);

    if (
      !Number.isFinite(year)
      || !Number.isFinite(month)
      || !Number.isFinite(day)
      || !Number.isFinite(parts.hour)
      || !Number.isFinite(parts.minute)
    ) {
      return null;
    }

    const startedAt =
      new Date(
        year,
        month - 1,
        day,
        parts.hour,
        parts.minute,
        0,
        0
      );

    if (Number.isNaN(startedAt.getTime())) {
      return null;
    }

    const durationMinutes =
      Math.max(
        0,
        Number(visit?.course_minutes || 0)
        + extensionMinutes(visit)
      );

    return new Date(
      startedAt.getTime()
      + durationMinutes * 60 * 1000
    );
  }

  function isPastVisit(visit, now = new Date()) {
    const endedAt = visitEndAt(visit);
    return Boolean(
      endedAt
      && endedAt.getTime() <= now.getTime()
    );
  }

  function statusLabel(status) {
    return ({
      new: "新規",
      repeat: "リピ",
      other_store_repeat: "他店リピ",
      repeat_unknown_id: "リピ・ID不明",
    })[status] || status || "予約";
  }

  function customerParts(visit) {
    const names = Array.isArray(visit.customer_names) ? visit.customer_names : [];
    if (!names.length) {
      return [visit.customer_name || visit.customer_code || statusLabel(visit.customer_status)].filter(Boolean);
    }

    const primary =
      names.find(record => record?.name && Number(record.is_primary) === 1)
      || names.find(record => record?.name && record.name_type === "nickname")
      || names.find(record => record?.name)
      || null;
    const okini = names.find(record => record?.name && record.name_type === "okini_talk") || null;
    const line = names.find(record => record?.name && record.name_type === "line") || null;

    return [primary, okini, line]
      .filter(Boolean)
      .filter((record, index, list) =>
        list.findIndex(item => String(item.name) === String(record.name)) === index
      )
      .map(record => {
        const prefix = record.name_type === "okini_talk"
          ? "オ:"
          : (record.name_type === "line" ? "L:" : "");
        return prefix + String(record.name);
      });
  }

  function storeClass(name) {
    const text = String(name || "");
    if (text.includes("千葉")) return "store-chiba";
    if (text.includes("東京")) return "store-tokyo";
    if (text.includes("名古屋")) return "store-nagoya";
    return "store-sapporo";
  }

  function courseClass(minutes) {
    const value = Number(minutes || 0);
    const known = [40, 60, 80, 90, 100, 120, 150, 180];
    if (value > 180) return "course-over-180";
    return known.includes(value) ? `course-${value}` : "";
  }

  function optionNames(visit) {
    return (Array.isArray(visit.options) ? visit.options : [])
      .map(option => option.name || option.custom_name || "")
      .filter(Boolean);
  }

  function renderSlots(hourHeight) {
    const html = [];
    const slotCount = (END_HOUR - START_HOUR) * 6;
    for (let index = 0; index < slotCount; index += 1) {
      const minutes = index * 10;
      const minute = (START_HOUR * 60 + minutes) % 60;
      const top = minutes * hourHeight / 60;
      const slotClass = minute === 0 ? " is-hour" : (minute === 30 ? " is-half-hour" : "");
      html.push(`<div class="next-schedule-slot${slotClass}" style="top:${top}px" aria-hidden="true"></div>`);
    }
    return html.join("");
  }

  function renderShift(shift, hourHeight) {
    if (!shift || shift.status !== "confirmed" || !shift.start_at || !shift.end_at) return "";

    const start = timeParts(shift.start_at);
    const end = timeParts(shift.end_at);
    let endHour = end.hour;
    if (end.date > start.date) endHour += 24;

    const startMinutes = start.hour * 60 + start.minute;
    const endMinutes = endHour * 60 + end.minute;
    const visibleStart = Math.max(startMinutes, START_HOUR * 60);
    const visibleEnd = Math.min(endMinutes, END_HOUR * 60);
    if (visibleEnd <= visibleStart) return "";

    const top = (visibleStart - START_HOUR * 60) * hourHeight / 60;
    const height = (visibleEnd - visibleStart) * hourHeight / 60;

    return `
      <div class="next-schedule-shift-band" style="top:${top}px;height:${height}px">
        <span>確定シフト</span>
        <strong>${escapeHtml(shift.store_name || "")}</strong>
      </div>`;
  }

  function renderEvent(visit, hourHeight) {
    if (isCancelledVisit(visit)) return "";

    const startMinutes = visitStartMinutes(visit);
    const top = (startMinutes - START_HOUR * 60) * hourHeight / 60;
    if (top < 0 || startMinutes >= END_HOUR * 60) return "";

    const duration = Math.max(
      10,
      Number(visit.course_minutes || 0) + extensionMinutes(visit)
    );
    const height = Math.max(28, duration * hourHeight / 60 - 3);
    const repeat = ["repeat", "other_store_repeat", "repeat_unknown_id"].includes(visit.customer_status);
    const customerText = customerParts(visit).join(" / ");
    const customer = escapeHtml(customerText);
    const options = optionNames(visit);
    const courseText = `${visit.pricing_category === "foreign" ? "外" : ""}${Number(visit.course_minutes || 0)}分`;
    const past = isPastVisit(visit);
    const diaryComplete = Number(visit.diary_linked) === 1;
    const salesComplete = Number(visit.sales_entered) === 1;
    const diaryClass = diaryComplete
      ? ""
      : `is-incomplete${past ? " is-overdue" : ""}`;
    const salesClass = salesComplete
      ? ""
      : `is-incomplete${past ? " is-overdue" : ""}`;

    const tooltipText = [
      `${compactTime(visit.started_at)} ${courseText} ${statusLabel(visit.customer_status)}`,
      customerText || "顧客未登録",
      options.length
        ? `OP: ${options.join("・")}`
        : "OP: なし",
    ].join("\n");

    return `
      <button
        type="button"
        data-next-schedule-event="${Number(visit.id)}"
        class="next-schedule-event ${storeClass(visit.store_name)} ${courseClass(visit.course_minutes)} ${repeat ? "is-repeat" : ""}"
        style="top:${top}px;height:${height}px"
        title="${escapeHtml(tooltipText)}"
      >
        <span class="next-schedule-event-heading">
          <span class="next-schedule-event-time">${escapeHtml(compactTime(visit.started_at))}</span>
          <span class="next-schedule-event-course">${escapeHtml(courseText)}</span>
          <span class="next-schedule-event-kind">${escapeHtml(statusLabel(visit.customer_status))}</span>
        </span>
        <span class="next-schedule-event-main">${customer}</span>
        ${options.length ? `<span class="next-schedule-event-options">${escapeHtml(options.join("・"))}</span>` : ""}
        <span class="next-schedule-event-progress">
          <span class="${Number(visit.customer_linked) ? "" : "is-incomplete"}">👤</span>
          <span class="${diaryClass}">📓</span>
          <span class="${salesClass}">¥</span>
        </span>
      </button>`;
  }

  /* ======================================================
     PHASE 2D / READ ONLY DETAIL DRAWER
  ====================================================== */

  let lastDetailTrigger = null;

  function formatMoney(value) {
    const amount = Number(value || 0);
    return `¥${Math.abs(amount).toLocaleString("ja-JP")}`;
  }

  function detailCustomerLabel(visit) {
    const prefixes = {
      nickname: "",
      kashikoi: "カ:",
      okini_talk: "オ:",
      line: "L:",
      x: "X:",
      instagram: "I:",
    };

    const names = (Array.isArray(visit.customer_names) ? visit.customer_names : [])
      .filter(record => record?.name)
      .map(record => `${prefixes[record.name_type] || ""}${String(record.name)}`);

    return names.length
      ? names.join(" / ")
      : (visit.customer_name || visit.customer_code || statusLabel(visit.customer_status));
  }

  function detailOptionTagsHtml(visit) {
    const names = (Array.isArray(visit.options) ? visit.options : [])
      .map(option => {
        const name = option.name || option.custom_name || "";
        if (!name) return "";

        const label =
          option.custom_name
          && option.income_amount !== null
          && option.income_amount !== ""
            ? `${name} ${formatMoney(option.income_amount)}`
            : name;

        return `
          <span class="next-detail-option-tag">
            ${escapeHtml(label)}
          </span>
        `;
      })
      .filter(Boolean);

    return names.length
      ? `<span class="next-detail-option-tags">${names.join("")}</span>`
      : `
        <span class="next-detail-option-tags">
          <span class="next-detail-option-tag is-empty">なし</span>
        </span>
      `;
  }

  function detailVisitorType(value) {
    return ({ local:"地元", travel:"旅行", business:"出張" })[value] || "不明";
  }

  function detailServicePlace(value) {
    return ({
      hotel:"ホテル",
      room:"ルーム",
      home:"自宅",
    })[value] || "未登録";
  }

  function renderDetailMeta(title, visit, course) {
    let meta =
      document.getElementById(
        "nextScheduleDetailMeta"
      );

    if (!meta) {
      meta =
        document.createElement("div");

      meta.id =
        "nextScheduleDetailMeta";

      meta.className =
        "next-schedule-detail-meta";

      title.insertAdjacentElement(
        "afterend",
        meta
      );
    }

    const values = [
      visit.store_name || "店舗未登録",
      course,
      statusLabel(visit.customer_status),
      detailVisitorType(visit.visitor_type),
    ];

    meta.innerHTML =
      values
        .map(value => `
          <span>
            ${escapeHtml(value)}
          </span>
        `)
        .join("");
  }

  function detailState(label, complete, completeText, incompleteText) {
    return `
      <div class="next-schedule-detail-state ${complete ? "is-complete" : ""}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(complete ? completeText : incompleteText)}</strong>
      </div>`;
  }

  function closeDetail({ restoreFocus = true } = {}) {
    const drawer = document.getElementById("nextScheduleDetailDrawer");
    const backdrop = document.getElementById("nextScheduleDetailBackdrop");

    if (drawer) {
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      delete drawer.dataset.visitId;
    }
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove("next-schedule-detail-open");

    if (restoreFocus && lastDetailTrigger?.isConnected) {
      lastDetailTrigger.focus({ preventScroll:true });
    }
    lastDetailTrigger = null;
  }

  function openDetail(visit, trigger = null) {
    const drawer = document.getElementById("nextScheduleDetailDrawer");
    const backdrop = document.getElementById("nextScheduleDetailBackdrop");
    const title = document.getElementById("nextScheduleDetailTitle");
    const body = document.getElementById("nextScheduleDetailBody");
    if (!drawer || !backdrop || !title || !body || !visit) return;

    lastDetailTrigger = trigger;
    drawer.dataset.visitId = String(Number(visit.id));

    const customer = detailCustomerLabel(visit);
    const date =
      visitBusinessDate(visit)
      || String(
        visit.started_at || ""
      ).slice(0, 10)
      || "未登録";
    const time = compactTime(visit.started_at);
    const course = `${visit.pricing_category === "foreign" ? "外" : ""}${Number(visit.course_minutes || 0)}分`;
    const tip = Number(visit.tip_amount || 0);
    const adjustment = Number(visit.adjustment_amount || 0);
    const tipText = tip > 0 ? formatMoney(tip) : "なし";
    const adjustmentText = adjustment === 0
      ? "なし"
      : `${adjustment > 0 ? "+" : "-"}${formatMoney(adjustment)}`;

    title.textContent = customer;
    renderDetailMeta(
      title,
      visit,
      course
    );

    body.innerHTML = `
      <p
        class="next-schedule-detail-section-label"
        data-next-detail-heading="reservation"
      >RESERVATION</p>
      <div class="next-schedule-detail-card next-detail-reservation-card">
        <div class="next-schedule-detail-row"><span>日時</span><strong>${escapeHtml(date)} ${escapeHtml(time)}</strong></div>
        <div class="next-schedule-detail-row"><span>店舗</span><strong>${escapeHtml(visit.store_name || "未登録")}</strong></div>
        <div class="next-schedule-detail-row"><span>予約時間</span><strong>${escapeHtml(course)}</strong></div>
        <div class="next-schedule-detail-row"><span>区分</span><strong>${escapeHtml(statusLabel(visit.customer_status))}</strong></div>
        <div class="next-schedule-detail-row"><span>来訪タイプ</span><strong>${escapeHtml(detailVisitorType(visit.visitor_type))}</strong></div>
        <div class="next-schedule-detail-row"><span>接客場所</span><strong>${escapeHtml(detailServicePlace(visit.service_place))}</strong></div>
        <div class="next-schedule-detail-row"><span>OP</span><strong class="next-detail-option-cell">${detailOptionTagsHtml(visit)}</strong></div>
        <div class="next-schedule-detail-row"><span>チップ</span><strong>${escapeHtml(tipText)}</strong></div>
        <div class="next-schedule-detail-row"><span>調整分</span><strong>${escapeHtml(adjustmentText)}</strong></div>
      </div>

      <p
        class="next-schedule-detail-section-label"
        data-next-detail-heading="progress"
      >PROGRESS</p>
      <div class="next-schedule-detail-progress">
        ${detailState("顧客", Number(visit.customer_linked) === 1, "紐付け済", "未紐付け")}
        ${detailState("日記", Number(visit.diary_linked) === 1, "完了", "未入力")}
        ${detailState("売上", Number(visit.sales_entered) === 1, "入力済", "未入力")}
      </div>`;

    backdrop.hidden = false;
    document.body.classList.add("next-schedule-detail-open");
    drawer.setAttribute("aria-hidden", "false");

    requestAnimationFrame(() => {
      drawer.classList.add("is-open");
      drawer.querySelector("[data-next-schedule-detail-close]")?.focus({ preventScroll:true });
    });
  }

  function businessDateForNow(now) {
    const date = new Date(now);
    if (date.getHours() < 3) date.setDate(date.getDate() - 1);
    return localDateString(date);
  }

  function nowLineHtml(hourHeight, now = new Date()) {
    let hour = now.getHours();
    if (hour < 3) hour += 24;

    const minutes = hour * 60 + now.getMinutes() + now.getSeconds() / 60;
    if (minutes < START_HOUR * 60 || minutes >= END_HOUR * 60) return "";

    const top = (minutes - START_HOUR * 60) * hourHeight / 60;
    return `
      <div class="next-schedule-now-line" style="top:${top}px">
        <span class="next-schedule-now-label">${String(hour).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}</span>
      </div>`;
  }

  function dayColumnHtml(dateValue, hourHeight, totalHeight) {
    const today = localDateString(new Date());
    const shift = state.shifts.find(item => item.shift_date === dateValue) || null;
    const isOff = shift?.status === "off";
    const visits = state.visits.filter(visit => visitBusinessDate(visit) === dateValue);
    const nowLine = dateValue === businessDateForNow(new Date()) ? nowLineHtml(hourHeight) : "";

    return `
      <div
        class="next-schedule-day-column ${dateValue === today ? "is-today" : ""} ${isOff ? "is-off" : ""}"
        data-next-schedule-day="${escapeHtml(dateValue)}"
        style="height:${totalHeight}px"
      >
        ${renderSlots(hourHeight)}
        ${isOff ? `<div class="next-schedule-off-label">休み</div>` : renderShift(shift, hourHeight)}
        ${visits.map(visit => renderEvent(visit, hourHeight)).join("")}
        ${nowLine}
      </div>`;
  }

  function timeLabelsHtml(hourHeight) {
    const labels = [];
    for (let hour = START_HOUR; hour <= END_HOUR; hour += 1) {
      const top = (hour - START_HOUR) * hourHeight;
      labels.push(`<span class="next-schedule-time-label" style="top:${top}px">${String(hour).padStart(2, "0")}:00</span>`);
    }
    return labels.join("");
  }

  function updateControls() {
    const periodElement = document.getElementById("nextSchedulePeriod");
    if (periodElement && state.period) periodElement.textContent = periodLabel(state.period);

    const periodVisits =
      visitsInCurrentPeriod();

    const cancelledVisits =
      periodVisits.filter(
        isCancelledVisit
      );

    const activeVisitCount =
      periodVisits.length
      - cancelledVisits.length;

    const count = document.getElementById("nextScheduleVisitCount");
    if (count) count.textContent = `${activeVisitCount}件`;

    const cancelledCount =
      document.getElementById(
        "nextScheduleCancelledCount"
      );

    if (cancelledCount) {
      cancelledCount.textContent =
        String(cancelledVisits.length);
    }

    const cancelledPanel =
      document.getElementById(
        "nextScheduleCancelledPanel"
      );

    const cancelledToggle =
      document.querySelector(
        "[data-next-cancelled-toggle]"
      );

    if (
      cancelledVisits.length === 0
      && cancelledPanel
      && !cancelledPanel.hidden
    ) {
      cancelledPanel.hidden = true;
    }

    const cancelledPanelOpen =
      Boolean(
        cancelledVisits.length
        && cancelledPanel
        && !cancelledPanel.hidden
      );

    if (cancelledToggle) {
      cancelledToggle.disabled =
        cancelledVisits.length === 0;

      cancelledToggle.classList.toggle(
        "is-selected",
        cancelledPanelOpen
      );

      cancelledToggle.setAttribute(
        "aria-expanded",
        cancelledPanelOpen
          ? "true"
          : "false"
      );
    }

    if (cancelledPanelOpen) {
      renderCancelledList(
        cancelledVisits
      );
    }

    document.querySelectorAll("[data-next-timeline-view]").forEach(button => {
      button.classList.toggle("is-selected", button.dataset.nextTimelineView === state.view);
    });

    const zoomLabel = document.getElementById("nextScheduleZoomLabel");
    if (zoomLabel) {
      zoomLabel.textContent = `${Math.round(state.hourHeight / BASE_HOUR_HEIGHT * 100)}%`;
    }
  }

  function render({ preserveScroll = false } = {}) {
    const calendar = document.getElementById("nextScheduleTimeline");
    const shell = document.getElementById("nextScheduleShell");
    if (!calendar || !shell || !state.period) return;

    const oldScrollTop = shell.scrollTop;
    const oldScrollLeft = shell.scrollLeft;
    const days = state.period.dates.length;
    const totalHeight = (END_HOUR - START_HOUR) * state.hourHeight;
    const columns = `var(--next-schedule-time-width) repeat(${days}, minmax(0, 1fr))`;

    const header = state.period.dates.map(dateValue => {
      const date = parseDate(dateValue);
      const today = dateValue === localDateString(new Date());
      return `<div class="next-schedule-day-header ${today ? "is-today" : ""}">${date.getMonth() + 1}/${date.getDate()}(${weekday(dateValue)})</div>`;
    }).join("");

    const columnsHtml = state.period.dates
      .map(dateValue => dayColumnHtml(dateValue, state.hourHeight, totalHeight))
      .join("");

    calendar.innerHTML = `
      <div class="next-schedule-grid" data-view="${escapeHtml(state.view)}" style="--next-schedule-hour-height:${state.hourHeight}px">
        <div class="next-schedule-grid-header" style="grid-template-columns:${columns}">
          <div class="next-schedule-header-spacer"></div>
          ${header}
        </div>
        <div class="next-schedule-grid-body" style="grid-template-columns:${columns};height:${totalHeight}px">
          <div class="next-schedule-time-axis" style="height:${totalHeight}px">${timeLabelsHtml(state.hourHeight)}</div>
          ${columnsHtml}
        </div>
      </div>`;

    updateControls();

    requestAnimationFrame(() => {
      if (preserveScroll) {
        shell.scrollTop = oldScrollTop;
        shell.scrollLeft = oldScrollLeft;
      } else {
        scrollToNowAndToday();
      }
    });
  }

  function renderCancelledList(
    cancelledVisits =
      cancelledVisitsInCurrentPeriod()
  ) {
    const list =
      document.getElementById(
        "nextScheduleCancelledList"
      );

    if (!list) return;

    if (!cancelledVisits.length) {
      list.innerHTML = `
        <p class="next-schedule-cancelled-empty">
          この表示期間にキャンセル予約はありません。
        </p>
      `;
      return;
    }

    const sorted =
      [...cancelledVisits]
        .sort(
          (a, b) =>
            String(a.started_at || "")
              .localeCompare(
                String(b.started_at || "")
              )
        );

    list.innerHTML =
      sorted
        .map(visit => {
          const customer =
            customerParts(visit)
              .join(" / ")
            || visit.customer_code
            || `予約 #${Number(visit.id)}`;

          const cancelType =
            visit.cancelled_by === "customer"
              ? "お客様キャンセル"
              : "キャンセル";

          const reason =
            String(
              visit.cancel_reason || ""
            ).trim()
            || "理由なし";

          return `
            <button
              type="button"
              class="next-schedule-cancelled-item"
              data-next-cancelled-visit="${Number(visit.id)}"
            >
              <span class="next-schedule-cancelled-date">
                ${escapeHtml(
                  businessDateTimeLabel(visit)
                )}
              </span>

              <strong>
                ${escapeHtml(customer)}
              </strong>

              <small>
                ${escapeHtml(
                  visit.store_name || "店舗未登録"
                )}
                ${
                  visit.course_minutes
                    ? ` / ${Number(visit.course_minutes)}分`
                    : ""
                }
              </small>

              <em>
                ${escapeHtml(cancelType)}
                · ${escapeHtml(reason)}
              </em>
            </button>
          `;
        })
        .join("");
  }

  function setCancelledPanelOpen(open) {
    const panel =
      document.getElementById(
        "nextScheduleCancelledPanel"
      );

    const toggle =
      document.querySelector(
        "[data-next-cancelled-toggle]"
      );

    if (!panel) return;

    const cancelledVisits =
      cancelledVisitsInCurrentPeriod();

    const nextOpen =
      Boolean(
        open
        && cancelledVisits.length
      );

    panel.hidden =
      !nextOpen;

    if (toggle) {
      toggle.classList.toggle(
        "is-selected",
        nextOpen
      );

      toggle.setAttribute(
        "aria-expanded",
        nextOpen ? "true" : "false"
      );
    }

    if (nextOpen) {
      renderCancelledList(
        cancelledVisits
      );
    }
  }

  function toggleCancelledPanel() {
    const panel =
      document.getElementById(
        "nextScheduleCancelledPanel"
      );

    if (!panel) return;

    setCancelledPanelOpen(
      panel.hidden
    );
  }

  function refreshNowLine() {
    if (!state.loaded) return;
    const scheduleView = document.getElementById("view-schedule");
    if (!scheduleView || scheduleView.hidden) return;

    document.querySelectorAll(".next-schedule-now-line").forEach(line => line.remove());
    const now = new Date();
    const target = document.querySelector(`[data-next-schedule-day="${businessDateForNow(now)}"]`);
    if (!target) return;

    const html = nowLineHtml(state.hourHeight, now);
    if (html) target.insertAdjacentHTML("beforeend", html);
  }

  function scrollToNowAndToday() {
    const shell = document.getElementById("nextScheduleShell");
    if (!shell) return;

    const today = document.querySelector(".next-schedule-day-column.is-today");
    if (today) {
      const center = today.offsetLeft + today.offsetWidth / 2;
      const targetLeft = center - shell.clientWidth / 2;
      shell.scrollLeft = Math.max(0, Math.min(shell.scrollWidth - shell.clientWidth, targetLeft));
    }

    const now = new Date();
    let hour = now.getHours();
    if (hour < 3) hour += 24;
    let minutes = hour * 60 + now.getMinutes();
    if (minutes < START_HOUR * 60 || minutes >= END_HOUR * 60) minutes = 14 * 60;

    const top = (minutes - START_HOUR * 60) * state.hourHeight / 60;
    shell.scrollTop = Math.max(
      0,
      Math.min(shell.scrollHeight - shell.clientHeight, top - shell.clientHeight * .45)
    );
  }

  async function load() {
    const status = document.getElementById("nextScheduleReadStatus");
    const calendar = document.getElementById("nextScheduleTimeline");
    if (!status || !calendar) return;

    const token = ++loadToken;
    state.period = getPeriod();

    status.textContent = "READING";
    status.classList.add("is-loading");
    status.classList.remove("is-error");
    calendar.innerHTML = `<div class="next-schedule-loading">予約を読み込み中…</div>`;
    updateControls();

    const params = new URLSearchParams({
      date_from: state.period.start,
      date_to: state.period.end,
    });

    try {
      const [scheduleResponse, shiftsResponse] = await Promise.all([
        fetch(`${SCHEDULE_API}?${params.toString()}`, {
          method:"GET",
          credentials:"same-origin",
          cache:"no-store",
        }),
        fetch(`${SHIFTS_API}?${params.toString()}`, {
          method:"GET",
          credentials:"same-origin",
          cache:"no-store",
        }),
      ]);

      const scheduleData = await readJson(scheduleResponse, "予約の取得に失敗しました。");
      const shiftsData = await readJson(shiftsResponse, "シフトの取得に失敗しました。");
      if (token !== loadToken) return;

      state.visits = Array.isArray(scheduleData.visits) ? scheduleData.visits : [];
      state.shifts = Array.isArray(shiftsData.shifts)
        ? shiftsData.shifts.filter(
            shift =>
              (shift.status === "confirmed" || shift.status === "off")
              && Number(shift.is_reservation_owner) === 1
          )
        : [];
      state.loaded = true;

      status.textContent = "PRODUCTION DB";
      status.classList.remove("is-loading", "is-error");
      render();

      if (window.KohakuWorkNext) {
        window.KohakuWorkNext.apiConnected = true;
      }
    } catch (error) {
      console.error("Kohaku Work NEXT timeline load failed:", error);
      if (token !== loadToken) return;

      state.loaded = false;
      status.textContent = "READ ERROR";
      status.classList.remove("is-loading");
      status.classList.add("is-error");
      calendar.innerHTML = `<div class="next-schedule-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function movePeriod(direction) {
    const anchor = parseDate(state.anchorDate);
    anchor.setDate(anchor.getDate() + periodMoveDays() * direction);
    state.anchorDate = localDateString(anchor);
    void load();
  }

  function setView(view) {
    if (!["day", "week", "two-weeks"].includes(view)) return;
    state.view = view;
    void load();
  }

  function setZoom(action) {
    let next = state.hourHeight;
    if (action === "in") next += ZOOM.step;
    if (action === "out") next -= ZOOM.step;
    if (action === "reset") next = BASE_HOUR_HEIGHT;

    state.hourHeight = Math.min(ZOOM.max, Math.max(ZOOM.min, next));
    if (state.loaded) {
      render({ preserveScroll:true });
    } else {
      updateControls();
    }
  }

  function pinchDistance(touches) {
    if (!touches || touches.length < 2) return 0;

    const dx =
      touches[1].clientX
      - touches[0].clientX;

    const dy =
      touches[1].clientY
      - touches[0].clientY;

    return Math.hypot(dx, dy);
  }

  document.addEventListener(
    "touchstart",
    event => {
      if (event.touches.length !== 2) {
        return;
      }

      const target =
        event.target instanceof Element
          ? event.target.closest(
              "#nextScheduleShell"
            )
          : null;

      if (!target) return;

      const distance =
        pinchDistance(
          event.touches
        );

      if (!distance) return;

      schedulePinch = {
        startDistance:
          distance,
        startHeight:
          state.hourHeight,
      };

      target.classList.add(
        "is-pinching"
      );
    },
    {
      passive:true,
    }
  );

  document.addEventListener(
    "touchmove",
    event => {
      if (
        !schedulePinch
        || event.touches.length !== 2
      ) {
        return;
      }

      const distance =
        pinchDistance(
          event.touches
        );

      if (!distance) return;

      event.preventDefault();

      const scale =
        distance
        / schedulePinch.startDistance;

      const raw =
        schedulePinch.startHeight
        * scale;

      const stepped =
        Math.round(
          raw / ZOOM.step
        ) * ZOOM.step;

      const next =
        Math.min(
          ZOOM.max,
          Math.max(
            ZOOM.min,
            stepped
          )
        );

      if (
        next === state.hourHeight
      ) {
        return;
      }

      state.hourHeight =
        next;

      if (state.loaded) {
        render({
          preserveScroll:true,
        });
      } else {
        updateControls();
      }
    },
    {
      passive:false,
    }
  );

  const finishSchedulePinch =
    event => {
      if (!schedulePinch) {
        return;
      }

      if (
        event.touches
        && event.touches.length >= 2
      ) {
        return;
      }

      schedulePinch =
        null;

      document
        .getElementById(
          "nextScheduleShell"
        )
        ?.classList
        .remove(
          "is-pinching"
        );
    };

  document.addEventListener(
    "touchend",
    finishSchedulePinch,
    {
      passive:true,
    }
  );

  document.addEventListener(
    "touchcancel",
    finishSchedulePinch,
    {
      passive:true,
    }
  );

  document.addEventListener("click", event => {
    const cancelledToggle =
      event.target.closest(
        "[data-next-cancelled-toggle]"
      );

    if (cancelledToggle) {
      toggleCancelledPanel();
      return;
    }

    if (
      event.target.closest(
        "[data-next-cancelled-close]"
      )
    ) {
      setCancelledPanelOpen(false);
      return;
    }

    const cancelledReservation =
      event.target.closest(
        "[data-next-cancelled-visit]"
      );

    if (cancelledReservation) {
      const visitId =
        Number(
          cancelledReservation
            .dataset
            .nextCancelledVisit
          || 0
        );

      const visit =
        state.visits.find(
          item =>
            Number(item.id)
            === visitId
        )
        || null;

      if (visit) {
        event.preventDefault();
        openDetail(
          visit,
          cancelledReservation
        );
      }

      return;
    }

    const move = event.target.closest("[data-next-timeline-move]");
    if (move) {
      movePeriod(Number(move.dataset.nextTimelineMove));
      return;
    }

    if (event.target.closest("[data-next-timeline-today]")) {
      state.anchorDate = localDateString(new Date());
      void load();
      return;
    }

    const view = event.target.closest("[data-next-timeline-view]");
    if (view) {
      setView(view.dataset.nextTimelineView);
      return;
    }

    const zoom = event.target.closest("[data-next-timeline-zoom]");
    if (zoom) setZoom(zoom.dataset.nextTimelineZoom);
  });

  document.addEventListener("click", event => {
    const reservation = event.target.closest("[data-next-schedule-event]");

    if (reservation) {
      const visitId = Number(reservation.dataset.nextScheduleEvent || 0);
      const visit = state.visits.find(item => Number(item.id) === visitId) || null;
      if (visit) {
        event.preventDefault();
        openDetail(visit, reservation);
      }
      return;
    }

    if (
      event.target.closest("[data-next-schedule-detail-close]")
      || event.target.id === "nextScheduleDetailBackdrop"
    ) {
      closeDetail();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;

    const cancelledPanel =
      document.getElementById(
        "nextScheduleCancelledPanel"
      );

    if (
      cancelledPanel
      && !cancelledPanel.hidden
      && !document.body.classList.contains(
        "next-schedule-detail-open"
      )
    ) {
      setCancelledPanelOpen(false);
      return;
    }

    closeDetail();
  });

  window.setInterval(refreshNowLine, 15 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshNowLine();
  });

  window.KohakuWorkNextSchedule = {
    load,
    render,
    openDetail,
    closeDetail,
    state,
    productionWriteEnabled:false,
  };
})();
