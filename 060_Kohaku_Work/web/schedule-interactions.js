(() => {
  "use strict";

  const SCHEDULE_API = "/api/next/v1/schedule.php";
  const START_HOUR = 11;
  const END_HOUR = 27;
  const SNAP_MINUTES = 10;
  const HEIGHT_KEY = "koppy.work.next.schedule.shell-height.v1";

  const scheduleApi = window.KohakuWorkNextSchedule;
  const shell = document.getElementById("nextScheduleShell");
  const timeline = document.getElementById("nextScheduleTimeline");

  if (!scheduleApi || !scheduleApi.state || !shell || !timeline) {
    console.error("Kohaku Work NEXT schedule interactions: required UI missing.");
    return;
  }

  let desktopDrag = null;
  let touchDrag = null;
  let touchHoldTimer = null;
  let dragPreview = null;
  let suppressClickUntil = 0;
  let resizing = null;
  let resizeSaveTimer = null;

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

  function addDays(value, amount) {
    const date = parseDate(value);
    date.setDate(date.getDate() + Number(amount || 0));
    return localDateString(date);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hourHeight() {
    const value = Number(scheduleApi.state.hourHeight || 96);
    return value > 0 ? value : 96;
  }

  function targetFromPoint(column, clientY, grabOffsetY = 0) {
    if (!column) return null;

    const businessDate = String(column.dataset.nextScheduleDay || "");
    if (!businessDate) return null;

    const rect = column.getBoundingClientRect();
    const cardTopY = clientY - Number(grabOffsetY || 0);
    const relativeY = clamp(cardTopY - rect.top, 0, Math.max(0, rect.height));
    const rawMinutes = relativeY / hourHeight() * 60;
    const snappedOffset = Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;
    const absoluteMinutes = clamp(
      START_HOUR * 60 + snappedOffset,
      START_HOUR * 60,
      END_HOUR * 60 - SNAP_MINUTES
    );

    const displayHour = Math.floor(absoluteMinutes / 60);
    const minute = absoluteMinutes % 60;

    let actualDate = businessDate;
    let actualHour = displayHour;

    if (actualHour >= 24) {
      actualDate = addDays(businessDate, 1);
      actualHour -= 24;
    }

    const actualTime =
      `${String(actualHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    const displayTime =
      `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    return {
      businessDate,
      actualDate,
      actualTime,
      displayTime,
      startedAt: `${actualDate} ${actualTime}`,
      top: (absoluteMinutes - START_HOUR * 60) * hourHeight() / 60,
    };
  }

  function columnFromPoint(clientX, clientY) {
    const element = document.elementFromPoint(clientX, clientY);
    const direct = element?.closest(".next-schedule-day-column") || null;
    if (direct) return direct;

    const columns = Array.from(
      timeline.querySelectorAll(".next-schedule-day-column")
    );

    return columns.find(column => {
      const rect = column.getBoundingClientRect();
      return (
        clientX >= rect.left
        && clientX <= rect.right
        && clientY >= rect.top
        && clientY <= rect.bottom
      );
    }) || null;
  }

  function clearPreview() {
    if (dragPreview) {
      dragPreview.remove();
      dragPreview = null;
    }

    timeline
      .querySelectorAll(".next-schedule-day-column.is-drag-over")
      .forEach(column => {
        column.classList.remove("is-drag-over");
      });
  }

  function showPreview(column, target) {
    clearPreview();
    if (!column || !target) return;

    column.classList.add("is-drag-over");

    const marker = document.createElement("div");
    marker.className = "next-schedule-drag-preview";
    marker.style.top = `${target.top}px`;
    marker.innerHTML = `<span>${target.displayTime}</span>`;

    column.appendChild(marker);
    dragPreview = marker;
  }

  const hoverPreviewEnabled =
    window.matchMedia(
      "(hover:hover) and (pointer:fine)"
    ).matches;

  let hoverCard = null;
  let hoverCardSource = null;
  let hoverTimer = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function compactTime(value) {
    const text = String(value || "");
    const hour = Number(text.slice(11, 13));
    const minute = Number(text.slice(14, 16));

    if (
      !Number.isFinite(hour)
      || !Number.isFinite(minute)
    ) {
      return "−";
    }

    return (
      `${String(hour).padStart(2, "0")}:`
      + String(minute).padStart(2, "0")
    );
  }

  function statusLabel(value) {
    return ({
      new:"新規",
      repeat:"リピ",
      other_store_repeat:"他店リピ",
      repeat_unknown_id:"リピ・ID不明",
    })[value] || value || "予約";
  }

  function customerLabel(visit) {
    const names =
      Array.isArray(visit?.customer_names)
        ? visit.customer_names
        : [];

    if (!names.length) {
      return (
        visit?.customer_name
        || visit?.customer_code
        || statusLabel(visit?.customer_status)
      );
    }

    const primary =
      names.find(
        record =>
          record?.name
          && Number(record.is_primary) === 1
      )
      || names.find(
        record =>
          record?.name
          && record.name_type === "nickname"
      )
      || names.find(record => record?.name)
      || null;

    const okini =
      names.find(
        record =>
          record?.name
          && record.name_type === "okini_talk"
      )
      || null;

    const line =
      names.find(
        record =>
          record?.name
          && record.name_type === "line"
      )
      || null;

    return [primary, okini, line]
      .filter(Boolean)
      .filter(
        (record, index, list) =>
          list.findIndex(
            item =>
              String(item.name)
              === String(record.name)
          )
          === index
      )
      .map(record => {
        const prefix =
          record.name_type === "okini_talk"
            ? "オ:"
            : (
              record.name_type === "line"
                ? "L:"
                : ""
            );

        return prefix + String(record.name);
      })
      .join(" / ");
  }

  function optionLabel(visit) {
    const values =
      (
        Array.isArray(visit?.options)
          ? visit.options
          : []
      )
        .map(
          option =>
            option?.name
            || option?.custom_name
            || ""
        )
        .filter(Boolean);

    return values.length
      ? values.join("・")
      : "なし";
  }

  function progressItemHtml(
    label,
    complete,
    completeText,
    incompleteText
  ) {
    return `
      <span
        class="next-schedule-hover-progress-item ${complete ? "is-complete" : "is-incomplete"}"
      >
        <small>${escapeHtml(label)}</small>
        <strong>${escapeHtml(complete ? completeText : incompleteText)}</strong>
      </span>
    `;
  }

  function hoverPreviewHtml(visit) {
    const course =
      `${visit?.pricing_category === "foreign" ? "外" : ""}`
      + `${Number(visit?.course_minutes || 0)}分`;

    return `
      <div class="next-schedule-hover-card-head">
        <span>${escapeHtml(compactTime(visit?.started_at))}</span>
        <b>${escapeHtml(course)}</b>
        <b>${escapeHtml(statusLabel(visit?.customer_status))}</b>
      </div>

      <strong class="next-schedule-hover-card-name">
        ${escapeHtml(customerLabel(visit))}
      </strong>

      <div class="next-schedule-hover-card-meta">
        <span>
          <small>店舗</small>
          <strong>${escapeHtml(visit?.store_name || "未登録")}</strong>
        </span>
        <span>
          <small>OP</small>
          <strong>${escapeHtml(optionLabel(visit))}</strong>
        </span>
      </div>

      <div class="next-schedule-hover-progress">
        ${progressItemHtml(
          "顧客",
          Number(visit?.customer_linked) === 1,
          "紐付け済",
          "未紐付け"
        )}
        ${progressItemHtml(
          "日記",
          Number(visit?.diary_linked) === 1,
          "完了",
          "未入力"
        )}
        ${progressItemHtml(
          "売上",
          Number(visit?.sales_entered) === 1,
          "入力済",
          "未入力"
        )}
      </div>

      <small class="next-schedule-hover-card-hint">
        クリックで詳細 / ドラッグで日時変更
      </small>
    `;
  }

  function ensureHoverCard() {
    if (hoverCard?.isConnected) {
      return hoverCard;
    }

    hoverCard =
      document.createElement("div");

    hoverCard.className =
      "next-schedule-hover-card";

    hoverCard.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.appendChild(
      hoverCard
    );

    return hoverCard;
  }

  function positionHoverCard(card) {
    if (!hoverCard || !card) {
      return;
    }

    const rect =
      card.getBoundingClientRect();

    const previewRect =
      hoverCard.getBoundingClientRect();

    const margin = 10;
    const edge = 8;

    let left =
      rect.right + margin;

    if (
      left + previewRect.width
      > window.innerWidth - edge
    ) {
      left =
        rect.left
        - previewRect.width
        - margin;
    }

    left =
      clamp(
        left,
        edge,
        Math.max(
          edge,
          window.innerWidth
          - previewRect.width
          - edge
        )
      );

    let top =
      rect.top
      + Math.min(
        8,
        Math.max(
          0,
          rect.height / 2 - 18
        )
      );

    top =
      clamp(
        top,
        edge,
        Math.max(
          edge,
          window.innerHeight
          - previewRect.height
          - edge
        )
      );

    hoverCard.style.left =
      `${Math.round(left)}px`;

    hoverCard.style.top =
      `${Math.round(top)}px`;
  }

  function hideHoverPreview() {
    window.clearTimeout(
      hoverTimer
    );

    hoverTimer = null;
    hoverCardSource = null;

    if (!hoverCard) {
      return;
    }

    hoverCard.classList.remove(
      "is-visible"
    );

    hoverCard.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  function showHoverPreview(card) {
    if (
      !hoverPreviewEnabled
      || !card
      || desktopDrag
      || touchDrag?.active
    ) {
      return;
    }

    const visit =
      visitById(
        Number(
          card.dataset.nextScheduleEvent
          || 0
        )
      );

    if (!visit) {
      return;
    }

    window.clearTimeout(
      hoverTimer
    );

    // Mark the source before the delay starts so pointerout/focusout
    // can cancel a pending preview before it appears.
    hoverCardSource =
      card;

    hoverTimer =
      window.setTimeout(
        () => {
          const preview =
            ensureHoverCard();

          preview.innerHTML =
            hoverPreviewHtml(
              visit
            );

          preview.style.setProperty(
            "--next-hover-store-color",
            getComputedStyle(card)
              .getPropertyValue(
                "--store-color"
              )
              .trim()
              || "var(--wf-accent)"
          );

          preview.classList.add(
            "is-visible"
          );

          preview.setAttribute(
            "aria-hidden",
            "false"
          );

          positionHoverCard(
            card
          );
        },
        90
      );
  }

  function setEventsDraggable() {
    timeline
      .querySelectorAll("[data-next-schedule-event]")
      .forEach(card => {
        card.draggable = true;

        // Native title tooltips are intentionally disabled.
        // Desktop gets a full custom hover preview instead.
        card.removeAttribute(
          "title"
        );
      });
  }

  const timelineObserver =
    new MutationObserver(
      setEventsDraggable
    );

  timelineObserver.observe(
    timeline,
    {
      childList:true,
      subtree:true,
    }
  );

  setEventsDraggable();

  function visitById(visitId) {
    return scheduleApi.state.visits.find(
      visit => Number(visit.id) === Number(visitId)
    ) || null;
  }

  if (hoverPreviewEnabled) {
    document.addEventListener(
      "pointerover",
      event => {
        if (
          event.pointerType
          && event.pointerType !== "mouse"
        ) {
          return;
        }

        const card =
          event.target.closest(
            "[data-next-schedule-event]"
          );

        if (
          !card
          || !timeline.contains(card)
        ) {
          return;
        }

        if (
          card.contains(
            event.relatedTarget
          )
        ) {
          return;
        }

        showHoverPreview(
          card
        );
      }
    );

    document.addEventListener(
      "pointerout",
      event => {
        const card =
          event.target.closest(
            "[data-next-schedule-event]"
          );

        if (
          !card
          || card !== hoverCardSource
        ) {
          return;
        }

        if (
          card.contains(
            event.relatedTarget
          )
        ) {
          return;
        }

        hideHoverPreview();
      }
    );

    document.addEventListener(
      "focusin",
      event => {
        const card =
          event.target.closest(
            "[data-next-schedule-event]"
          );

        if (
          card
          && timeline.contains(card)
        ) {
          showHoverPreview(
            card
          );
        }
      }
    );

    document.addEventListener(
      "focusout",
      event => {
        const card =
          event.target.closest(
            "[data-next-schedule-event]"
          );

        if (
          card
          && card === hoverCardSource
        ) {
          hideHoverPreview();
        }
      }
    );

    shell.addEventListener(
      "scroll",
      hideHoverPreview,
      { passive:true }
    );

    window.addEventListener(
      "resize",
      hideHoverPreview,
      { passive:true }
    );
  }

  function showToast(text) {
    let toast = document.getElementById("nextScheduleInteractionToast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "nextScheduleInteractionToast";
      toast.className = "next-schedule-interaction-toast";
      document.body.appendChild(toast);
    }

    toast.textContent = text;
    toast.classList.add("is-visible");

    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 1400);
  }

  async function patchStartedAt(visitId, startedAt) {
    const visit = visitById(visitId);

    if (!visit) {
      throw new Error("移動する予約が見つかりませんでした。");
    }

    if (String(visit.started_at || "") === String(startedAt)) {
      return;
    }

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
          id:Number(visitId),
          started_at:String(startedAt),
        }),
      }
    );

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error("予約移動APIの応答を読めませんでした。");
    }

    if (!response.ok || !data || data.success !== true) {
      throw new Error(
        data?.error || "予約時間を変更できませんでした。"
      );
    }

    if (data.visit && typeof data.visit === "object") {
      Object.assign(visit, data.visit);
    } else {
      visit.started_at = String(startedAt);
    }

    scheduleApi.state.visits.sort(
      (left, right) =>
        String(left.started_at || "").localeCompare(
          String(right.started_at || "")
        )
        || Number(left.id || 0) - Number(right.id || 0)
    );

    scheduleApi.render({ preserveScroll:true });
    showToast("予約時間を変更しました。");
  }

  function createAtTarget(target) {
    const createApi = window.KohakuWorkNextReservationCreate;

    if (!target || typeof createApi?.openAt !== "function") {
      return;
    }

    const shift =
      scheduleApi.state.shifts.find(
        item =>
          item.shift_date === target.businessDate
          && item.status === "confirmed"
      )
      || null;

    createApi.openAt(
      target.actualDate,
      target.actualTime,
      Number(shift?.store_id || 0) || null
    );
  }

  document.addEventListener(
    "click",
    event => {
      const card = event.target.closest("[data-next-schedule-event]");

      if (card && Date.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (card) return;

      const column = event.target.closest(".next-schedule-day-column");

      if (!column || !timeline.contains(column)) {
        return;
      }

      const target = targetFromPoint(column, event.clientY, 0);
      if (!target) return;

      event.preventDefault();
      createAtTarget(target);
    },
    true
  );

  document.addEventListener("dragstart", event => {
    const card = event.target.closest("[data-next-schedule-event]");
    if (!card) return;

    hideHoverPreview();

    const visitId = Number(card.dataset.nextScheduleEvent || 0);
    const visit = visitById(visitId);

    if (!visit) {
      event.preventDefault();
      return;
    }

    const rect = card.getBoundingClientRect();

    desktopDrag = {
      visitId,
      card,
      originalStartedAt:String(visit.started_at || ""),
      grabOffsetY:clamp(event.clientY - rect.top, 0, rect.height),
    };

    card.classList.add("is-dragging");

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(visitId));
    }
  });

  document.addEventListener("dragover", event => {
    if (!desktopDrag) return;

    const column = columnFromPoint(event.clientX, event.clientY);

    if (!column) {
      clearPreview();
      return;
    }

    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }

    const target = targetFromPoint(
      column,
      event.clientY,
      desktopDrag.grabOffsetY
    );

    showPreview(column, target);
  });

  document.addEventListener("drop", event => {
    if (!desktopDrag) return;

    const dragState = desktopDrag;
    const column = columnFromPoint(event.clientX, event.clientY);

    if (!column) return;

    event.preventDefault();

    const target = targetFromPoint(
      column,
      event.clientY,
      dragState.grabOffsetY
    );

    suppressClickUntil = Date.now() + 500;
    clearPreview();

    if (
      target
      && target.startedAt !== dragState.originalStartedAt
    ) {
      void patchStartedAt(
        dragState.visitId,
        target.startedAt
      ).catch(error => {
        window.alert(
          `予約を移動できなかったよ。\n\n${error.message}`
        );
      });
    }
  });

  document.addEventListener("dragend", event => {
    const card = event.target.closest("[data-next-schedule-event]");
    card?.classList.remove("is-dragging");

    clearPreview();

    if (desktopDrag) {
      suppressClickUntil = Date.now() + 400;
    }

    desktopDrag = null;
  });

  function clearTouchTimer() {
    if (touchHoldTimer) {
      window.clearTimeout(touchHoldTimer);
      touchHoldTimer = null;
    }
  }

  function resetTouchDrag() {
    clearTouchTimer();
    clearPreview();

    touchDrag?.card?.classList.remove("is-touch-dragging");
    touchDrag = null;
  }

  document.addEventListener("pointerdown", event => {
    if (event.pointerType !== "touch") return;

    const card = event.target.closest("[data-next-schedule-event]");
    if (!card) return;

    const visitId = Number(card.dataset.nextScheduleEvent || 0);
    const visit = visitById(visitId);
    if (!visit) return;

    const rect = card.getBoundingClientRect();

    touchDrag = {
      pointerId:event.pointerId,
      visitId,
      card,
      startX:event.clientX,
      startY:event.clientY,
      grabOffsetY:clamp(event.clientY - rect.top, 0, rect.height),
      originalStartedAt:String(visit.started_at || ""),
      active:false,
    };

    clearTouchTimer();

    touchHoldTimer = window.setTimeout(() => {
      if (!touchDrag) return;

      touchDrag.active = true;
      card.classList.add("is-touch-dragging");
      navigator.vibrate?.(20);
    }, 350);
  });

  document.addEventListener(
    "pointermove",
    event => {
      if (
        event.pointerType !== "touch"
        || !touchDrag
        || event.pointerId !== touchDrag.pointerId
      ) {
        return;
      }

      if (!touchDrag.active) {
        const moved = Math.hypot(
          event.clientX - touchDrag.startX,
          event.clientY - touchDrag.startY
        );

        if (moved > 8) {
          resetTouchDrag();
        }

        return;
      }

      event.preventDefault();

      const column = columnFromPoint(event.clientX, event.clientY);

      if (!column) {
        clearPreview();
        return;
      }

      const target = targetFromPoint(
        column,
        event.clientY,
        touchDrag.grabOffsetY
      );

      showPreview(column, target);
    },
    { passive:false }
  );

  document.addEventListener(
    "pointerup",
    event => {
      if (
        event.pointerType !== "touch"
        || !touchDrag
        || event.pointerId !== touchDrag.pointerId
      ) {
        return;
      }

      const dragState = touchDrag;
      clearTouchTimer();

      if (!dragState.active) {
        resetTouchDrag();
        return;
      }

      event.preventDefault();

      const column = columnFromPoint(event.clientX, event.clientY);
      const target =
        column
          ? targetFromPoint(
              column,
              event.clientY,
              dragState.grabOffsetY
            )
          : null;

      suppressClickUntil = Date.now() + 650;
      resetTouchDrag();

      if (
        target
        && target.startedAt !== dragState.originalStartedAt
      ) {
        void patchStartedAt(
          dragState.visitId,
          target.startedAt
        ).catch(error => {
          window.alert(
            `予約を移動できなかったよ。\n\n${error.message}`
          );
        });
      }
    },
    { passive:false }
  );

  document.addEventListener("pointercancel", event => {
    if (
      event.pointerType === "touch"
      && touchDrag
      && event.pointerId === touchDrag.pointerId
    ) {
      resetTouchDrag();
    }
  });

  document.addEventListener("contextmenu", event => {
    if (
      touchDrag?.active
      && event.target.closest("[data-next-schedule-event]")
    ) {
      event.preventDefault();
    }
  });

  function viewportMaxHeight() {
    const mobile = window.matchMedia("(max-width:760px)").matches;
    return Math.max(
      360,
      window.innerHeight - (mobile ? 170 : 120)
    );
  }

  function saveShellHeight(height) {
    const value = Math.round(Number(height || 0));
    if (value < 360) return;

    try {
      localStorage.setItem(HEIGHT_KEY, String(value));
    } catch {
      // localStorage may be blocked.
    }
  }

  function restoreShellHeight() {
    let saved = 0;

    try {
      saved = Number(localStorage.getItem(HEIGHT_KEY) || 0);
    } catch {
      saved = 0;
    }

    if (saved < 360) return;

    shell.style.height =
      `${clamp(saved, 360, viewportMaxHeight())}px`;
  }

  function ensureResizeHandle() {
    let handle = document.getElementById("nextScheduleResizeHandle");
    if (handle) return handle;

    handle = document.createElement("div");
    handle.id = "nextScheduleResizeHandle";
    handle.className = "next-schedule-resize-handle";
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-orientation", "horizontal");
    handle.setAttribute("aria-label", "予約時間軸の高さを変更");
    handle.innerHTML = `
      <span></span>
      <small>ドラッグで高さ変更</small>
    `;

    shell.insertAdjacentElement("afterend", handle);
    return handle;
  }

  const resizeHandle = ensureResizeHandle();

  resizeHandle.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();

    resizing = {
      pointerId:event.pointerId,
      startY:event.clientY,
      startHeight:shell.getBoundingClientRect().height,
    };

    resizeHandle.setPointerCapture?.(event.pointerId);
    resizeHandle.classList.add("is-resizing");
  });

  resizeHandle.addEventListener("pointermove", event => {
    if (!resizing || event.pointerId !== resizing.pointerId) {
      return;
    }

    event.preventDefault();

    const nextHeight = clamp(
      resizing.startHeight + event.clientY - resizing.startY,
      360,
      viewportMaxHeight()
    );

    shell.style.height = `${Math.round(nextHeight)}px`;
  });

  function finishResize(event) {
    if (!resizing || event.pointerId !== resizing.pointerId) {
      return;
    }

    saveShellHeight(shell.getBoundingClientRect().height);

    try {
      resizeHandle.releasePointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }

    resizeHandle.classList.remove("is-resizing");
    resizing = null;
  }

  resizeHandle.addEventListener("pointerup", finishResize);
  resizeHandle.addEventListener("pointercancel", finishResize);

  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(entries => {
      const height = entries[0]?.contentRect?.height || 0;

      if (height < 360 || resizing) {
        return;
      }

      window.clearTimeout(resizeSaveTimer);

      resizeSaveTimer = window.setTimeout(() => {
        saveShellHeight(height);
      }, 180);
    });

    resizeObserver.observe(shell);
  }

  restoreShellHeight();

  window.KohakuWorkNextScheduleInteractions = {
    verificationWriteEnabled:false,
    productionWriteEnabled:true,
    heightStorageKey:HEIGHT_KEY,
  };
})();
