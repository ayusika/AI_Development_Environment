(() => {
  'use strict';


  let initialized = false;


  function init({
    scheduleState,
    scheduleStartHour,
    scheduleEndHour,
    scheduleApiUrl,
    loadSchedule,
  }) {

    if (initialized) {
      return;
    }

    initialized = true;


    /* ========================================
       SCHEDULE DRAG MOVE
       desktop foundation
    ======================================== */

    let scheduleDragState = null;

    let scheduleDragPreview = null;

    let scheduleTouchDrag = null;

    let scheduleTouchHoldTimer = null;


    function getScheduleDropTarget(
      column,
      clientY
    ) {

      if (!column) {
        return null;
      }


      const date =
        column.dataset.scheduleDay;


      if (!date) {
        return null;
      }


      const rect =
        column.getBoundingClientRect();


      const relativeY =
        Math.max(
          0,
          Math.min(
            rect.height,
            clientY - rect.top
          )
        );


      const totalMinutes =
        (
          scheduleEndHour
          - scheduleStartHour
        ) * 60;


      const rawMinutes =
        relativeY
        / rect.height
        * totalMinutes;


      const snappedMinutes =
        Math.round(
          rawMinutes / 10
        ) * 10;


      const absoluteMinutes =
        Math.max(
          scheduleStartHour * 60,
          Math.min(
            scheduleEndHour * 60 - 10,
            scheduleStartHour * 60
            + snappedMinutes
          )
        );


      const hour =
        Math.floor(
          absoluteMinutes / 60
        );

      const minute =
        absoluteMinutes % 60;


      const time =
        `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;


      return {
        date,
        time,
        startedAt:
          `${date} ${time}`,
      };
    }


    function clearScheduleDragPreview() {

      if (scheduleDragPreview) {
        scheduleDragPreview.remove();

        scheduleDragPreview = null;
      }
    }


    function showScheduleDragPreview(
      column,
      clientY
    ) {

      clearScheduleDragPreview();


      const dropTarget =
        getScheduleDropTarget(
          column,
          clientY
        );


      if (!dropTarget) {
        return;
      }


      const rect =
        column.getBoundingClientRect();


      const totalMinutes =
        (
          scheduleEndHour
          - scheduleStartHour
        ) * 60;


      const [
        hour,
        minute,
      ] =
        dropTarget.time
          .split(':')
          .map(Number);


      const minuteFromStart =
        (
          hour * 60
          + minute
        )
        - scheduleStartHour * 60;


      const top =
        minuteFromStart
        / totalMinutes
        * rect.height;


      const marker =
        document.createElement(
          'div'
        );


      marker.className =
        'schedule-drag-preview';


      marker.style.top =
        `${top}px`;


      marker.innerHTML = `
        <span>
          ${dropTarget.time}
        </span>
      `;


      column.appendChild(
        marker
      );


      scheduleDragPreview =
        marker;
    }


    function clearScheduleTouchHoldTimer() {

      if (scheduleTouchHoldTimer) {

        window.clearTimeout(
          scheduleTouchHoldTimer
        );


        scheduleTouchHoldTimer = null;
      }
    }


    function resetScheduleTouchDrag() {

      clearScheduleTouchHoldTimer();

      clearScheduleDragPreview();


      if (
        scheduleTouchDrag
        && scheduleTouchDrag.card
      ) {

        scheduleTouchDrag.card.classList.remove(
          'is-touch-dragging'
        );
      }


      document
        .querySelectorAll(
          '.schedule-day-column.is-drag-over'
        )
        .forEach((column) => {

          column.classList.remove(
            'is-drag-over'
          );
        });


      scheduleTouchDrag = null;
    }


    document.addEventListener(
      'dragstart',
      (event) => {

        const card =
          event.target.closest(
            '[data-schedule-event]'
          );


        if (!card) return;


        const visitId =
          Number(
            card.dataset.scheduleEvent
          );


        const visit =
          scheduleState.visits.find(
            (item) =>
              Number(item.id)
              === visitId
          );


        if (!visit) return;


        const cardRect =
          card.getBoundingClientRect();


        scheduleDragState = {
          visitId,

          originalStartedAt:
            String(
              visit.started_at || ''
            ),

          grabOffsetY:
            Math.max(
              0,
              event.clientY
              - cardRect.top
            ),
        };


        card.classList.add(
          'is-dragging'
        );


        if (event.dataTransfer) {

          event.dataTransfer.effectAllowed =
            'move';


          event.dataTransfer.setData(
            'text/plain',
            String(visitId)
          );
        }
      }
    );


    document.addEventListener(
      'dragend',
      (event) => {

        const card =
          event.target.closest(
            '[data-schedule-event]'
          );


        if (card) {

          card.classList.remove(
            'is-dragging'
          );
        }


        document
          .querySelectorAll(
            '.schedule-day-column.is-drag-over'
          )
          .forEach((column) => {

            column.classList.remove(
              'is-drag-over'
            );
          });


        clearScheduleDragPreview();


        scheduleDragState = null;
      }
    );


    document.addEventListener(
      'dragover',
      (event) => {

        const column =
          event.target.closest(
            '[data-schedule-day]'
          );


        if (
          !column
          || !scheduleDragState
        ) {
          return;
        }


        event.preventDefault();


        if (event.dataTransfer) {

          event.dataTransfer.dropEffect =
            'move';
        }


        document
          .querySelectorAll(
            '.schedule-day-column.is-drag-over'
          )
          .forEach((item) => {

            if (item !== column) {

              item.classList.remove(
                'is-drag-over'
              );
            }
          });


        column.classList.add(
          'is-drag-over'
        );


        const cardTopClientY =
          event.clientY
          - Number(
              scheduleDragState
                .grabOffsetY
              || 0
            );


        showScheduleDragPreview(
          column,
          cardTopClientY
        );
      }
    );


    document.addEventListener(
      'drop',
      async (event) => {

        const column =
          event.target.closest(
            '[data-schedule-day]'
          );


        if (
          !column
          || !scheduleDragState
        ) {
          return;
        }


        event.preventDefault();


        const cardTopClientY =
          event.clientY
          - Number(
              scheduleDragState
                .grabOffsetY
              || 0
            );


        const dropTarget =
          getScheduleDropTarget(
            column,
            cardTopClientY
          );


        if (!dropTarget) {
          return;
        }


        const visitId =
          Number(
            scheduleDragState.visitId
          );


        const originalStartedAt =
          String(
            scheduleDragState
              .originalStartedAt
            || ''
          );


        if (
          dropTarget.startedAt
          === originalStartedAt
        ) {
          return;
        }


        const calendarShell =
          document.querySelector(
            '.schedule-calendar-shell'
          );


        const previousScrollLeft =
          calendarShell
            ? calendarShell.scrollLeft
            : 0;


        const previousScrollTop =
          calendarShell
            ? calendarShell.scrollTop
            : 0;


        column.classList.remove(
          'is-drag-over'
        );


        try {

          const response =
            await fetch(
              scheduleApiUrl,
              {
                method: 'PATCH',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body:
                  JSON.stringify({
                    id: visitId,

                    started_at:
                      dropTarget.startedAt,
                  }),
              }
            );


          const data =
            await response.json();


          if (
            !response.ok
            || !data.success
          ) {

            throw new Error(
              data.error
              || '予約時間を変更できませんでした。'
            );
          }


          await loadSchedule(
            true
          );


          if (calendarShell) {

            calendarShell.scrollLeft =
              previousScrollLeft;


            calendarShell.scrollTop =
              previousScrollTop;
          }


        } catch (error) {

          window.alert(
            `予約を移動できなかったよ。\n\n${error.message}`
          );
        }
      }
    );


    /* ========================================
       SCHEDULE TOUCH DRAG
       mobile foundation
    ======================================== */

    document.addEventListener(
      'pointerdown',
      (event) => {

        if (
          event.pointerType !== 'touch'
        ) {
          return;
        }


        const card =
          event.target.closest(
            '[data-schedule-event]'
          );


        if (!card) {
          return;
        }


        const visitId =
          Number(
            card.dataset.scheduleEvent
          );


        const visit =
          scheduleState.visits.find(
            (item) =>
              Number(item.id)
              === visitId
          );


        if (!visit) {
          return;
        }


        const rect =
          card.getBoundingClientRect();


        scheduleTouchDrag = {
          card,
          visitId,

          originalStartedAt:
            String(
              visit.started_at || ''
            ),

          startX:
            event.clientX,

          startY:
            event.clientY,

          currentX:
            event.clientX,

          currentY:
            event.clientY,

          grabOffsetY:
            Math.max(
              0,
              event.clientY
              - rect.top
            ),

          active:
            false,
        };


        clearScheduleTouchHoldTimer();


        scheduleTouchHoldTimer =
          window.setTimeout(
            () => {

              if (!scheduleTouchDrag) {
                return;
              }


              scheduleTouchDrag.active =
                true;


              card.classList.add(
                'is-touch-dragging'
              );


              if (navigator.vibrate) {

                navigator.vibrate(20);
              }
            },
            350
          );
      }
    );


    document.addEventListener(
      'pointermove',
      (event) => {

        if (
          event.pointerType !== 'touch'
          || !scheduleTouchDrag
        ) {
          return;
        }


        scheduleTouchDrag.currentX =
          event.clientX;


        scheduleTouchDrag.currentY =
          event.clientY;


        if (
          !scheduleTouchDrag.active
        ) {

          const movedX =
            Math.abs(
              event.clientX
              - scheduleTouchDrag.startX
            );


          const movedY =
            Math.abs(
              event.clientY
              - scheduleTouchDrag.startY
            );


          if (
            movedX > 8
            || movedY > 8
          ) {

            resetScheduleTouchDrag();
          }


          return;
        }


        event.preventDefault();


        const element =
          document.elementFromPoint(
            event.clientX,
            event.clientY
          );


        const column =
          element?.closest(
            '[data-schedule-day]'
          );


        if (!column) {

          clearScheduleDragPreview();

          return;
        }


        document
          .querySelectorAll(
            '.schedule-day-column.is-drag-over'
          )
          .forEach((item) => {

            if (item !== column) {

              item.classList.remove(
                'is-drag-over'
              );
            }
          });


        column.classList.add(
          'is-drag-over'
        );


        const cardTopClientY =
          event.clientY
          - Number(
              scheduleTouchDrag
                .grabOffsetY
              || 0
            );


        showScheduleDragPreview(
          column,
          cardTopClientY
        );
      },
      {
        passive: false,
      }
    );


    document.addEventListener(
      'pointercancel',
      (event) => {

        if (
          event.pointerType !== 'touch'
        ) {
          return;
        }


        resetScheduleTouchDrag();
      }
    );


    document.addEventListener(
      'pointerup',
      async (event) => {

        if (
          event.pointerType !== 'touch'
          || !scheduleTouchDrag
        ) {
          return;
        }


        const touchState =
          scheduleTouchDrag;


        clearScheduleTouchHoldTimer();


        if (
          !touchState.active
        ) {

          resetScheduleTouchDrag();

          return;
        }


        event.preventDefault();


        const element =
          document.elementFromPoint(
            event.clientX,
            event.clientY
          );


        const column =
          element?.closest(
            '[data-schedule-day]'
          );


        if (!column) {

          resetScheduleTouchDrag();

          return;
        }


        const cardTopClientY =
          event.clientY
          - Number(
              touchState.grabOffsetY
              || 0
            );


        const dropTarget =
          getScheduleDropTarget(
            column,
            cardTopClientY
          );


        if (!dropTarget) {

          resetScheduleTouchDrag();

          return;
        }


        const visitId =
          Number(
            touchState.visitId
          );


        const originalStartedAt =
          String(
            touchState.originalStartedAt
            || ''
          );


        if (
          dropTarget.startedAt
          === originalStartedAt
        ) {

          resetScheduleTouchDrag();

          return;
        }


        const calendarShell =
          document.querySelector(
            '.schedule-calendar-shell'
          );


        const previousScrollLeft =
          calendarShell
            ? calendarShell.scrollLeft
            : 0;


        const previousScrollTop =
          calendarShell
            ? calendarShell.scrollTop
            : 0;


        resetScheduleTouchDrag();


        try {

          const response =
            await fetch(
              scheduleApiUrl,
              {
                method: 'PATCH',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body:
                  JSON.stringify({
                    id:
                      visitId,

                    started_at:
                      dropTarget.startedAt,
                  }),
              }
            );


          const data =
            await response.json();


          if (
            !response.ok
            || !data.success
          ) {

            throw new Error(
              data.error
              || '予約時間を変更できませんでした。'
            );
          }


          await loadSchedule(
            true
          );


          if (calendarShell) {

            calendarShell.scrollLeft =
              previousScrollLeft;


            calendarShell.scrollTop =
              previousScrollTop;
          }


        } catch (error) {

          window.alert(
            `予約を移動できなかったよ。\n\n${error.message}`
          );
        }
      },
      {
        passive: false,
      }
    );
  }


  window.KohakuScheduleDrag = {
    init,

    isActive() {
      return initialized;
    },
  };
})();