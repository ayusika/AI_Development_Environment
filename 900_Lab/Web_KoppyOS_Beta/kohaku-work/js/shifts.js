// WRITER:WORK_SHIFT_LOGIC:START

/* ========================================
   WORK SHIFT
======================================== */

const shiftMasterApiUrl =
  '/api/v1/shift-master.php';

const shiftsApiUrl =
  '/api/v1/shifts.php';


const shiftWeekCalendar =
  document.getElementById(
    'shift-week-calendar'
  );

const shiftWeekTitle =
  document.getElementById(
    'shift-week-title'
  );

const shiftSelectionCount =
  document.getElementById(
    'shift-selection-count'
  );

const shiftStoreSelect =
  document.getElementById(
    'shift-store-select'
  );

const shiftSelectedDays =
  document.getElementById(
    'shift-selected-days'
  );

const shiftDeleteButton =
  document.getElementById(
    'shift-delete-button'
  );

const shiftConfirmButton =
  document.getElementById(
    'shift-confirm-button'
  );


const shiftState = {
  workerCode: 'shii',

  weekStart:
    getShiftWeekStart(
      new Date()
    ),

  workers: [],
  stores: [],
  defaultRules: [],
  days: [],
  shifts: [],

  editingShiftId:
    null,

  selectedDates:
    new Set(),

  selectedStoreId: '',
};


/* ========================================
   LOAD
======================================== */

async function loadShift() {

  if (!shiftWeekCalendar) {
    return;
  }


  shiftWeekCalendar.innerHTML =
    '<p class="shift-loading">シフト情報を読み込み中…</p>';


  const weekEnd =
    new Date(
      shiftState.weekStart
    );

  weekEnd.setDate(
    weekEnd.getDate() + 6
  );


  const dateFrom =
    formatShiftDate(
      shiftState.weekStart
    );

  const dateTo =
    formatShiftDate(
      weekEnd
    );


  try {

    const params =
      new URLSearchParams({
        date_from:
          dateFrom,

        date_to:
          dateTo,
      });


    const response =
      await fetch(
        `${shiftMasterApiUrl}?${params.toString()}`
      );


    const data =
      await response.json();


    if (
      !response.ok
      || !data.success
    ) {
      throw new Error(
        data.error
        || 'シフト情報を取得できませんでした。'
      );
    }


    shiftState.workers =
      Array.isArray(data.workers)
        ? data.workers
        : [];


    shiftState.stores =
      Array.isArray(data.stores)
        ? data.stores
        : [];


    shiftState.defaultRules =
      Array.isArray(
        data.default_rules
      )
        ? data.default_rules
        : [];


    shiftState.days =
      Array.isArray(data.days)
        ? data.days
        : [];


    const selectedWorker =
      shiftState.workers
        .find(
          (worker) =>
            worker.worker_code
            === shiftState.workerCode
        )
      || null;


    if (selectedWorker) {

      const shiftParams =
        new URLSearchParams({
          worker_id:
            String(
              selectedWorker.id
            ),

          date_from:
            dateFrom,

          date_to:
            dateTo,
        });


      const shiftResponse =
        await fetch(
          `${shiftsApiUrl}?${shiftParams.toString()}`
        );


      const shiftData =
        await shiftResponse.json();


      if (
        !shiftResponse.ok
        || !shiftData.success
      ) {
        throw new Error(
          shiftData.error
          || '保存済みシフトを取得できませんでした。'
        );
      }


      shiftState.shifts =
        Array.isArray(
          shiftData.shifts
        )
          ? shiftData.shifts
          : [];

    } else {

      shiftState.shifts = [];
    }


    renderShiftStoreOptions();
    renderShiftWeek();
    renderShiftSelectedDays();


  } catch (error) {

    shiftWeekCalendar.innerHTML = `
      <p class="shift-loading">
        ${escapeHtml(
          error.message
        )}
      </p>
    `;
  }
}


/* ========================================
   WEEK
======================================== */

function getShiftWeekStart(
  sourceDate
) {

  const date =
    new Date(
      sourceDate
    );


  date.setHours(
    12,
    0,
    0,
    0
  );


  const weekday =
    date.getDay();


  const mondayOffset =
    weekday === 0
      ? -6
      : 1 - weekday;


  date.setDate(
    date.getDate()
    + mondayOffset
  );


  return date;
}


function moveShiftWeek(
  amount
) {

  const next =
    new Date(
      shiftState.weekStart
    );


  next.setDate(
    next.getDate()
    + (amount * 7)
  );


  shiftState.weekStart =
    next;


  shiftState.selectedDates.clear();


  loadShift();
}


function resetShiftWeekToToday() {

  shiftState.weekStart =
    getShiftWeekStart(
      new Date()
    );


  shiftState.selectedDates.clear();


  loadShift();
}


/* ========================================
   WEEK RENDER
======================================== */

function renderShiftWeek() {

  if (
    !shiftWeekCalendar
    || !shiftWeekTitle
  ) {
    return;
  }


  const weekEnd =
    new Date(
      shiftState.weekStart
    );


  weekEnd.setDate(
    weekEnd.getDate() + 6
  );


  shiftWeekTitle.textContent =
    `${formatShiftMonthDay(
      shiftState.weekStart
    )} 〜 ${formatShiftMonthDay(
      weekEnd
    )}`;


  const weekdayLabels = [
    '日',
    '月',
    '火',
    '水',
    '木',
    '金',
    '土',
  ];


  shiftWeekCalendar.innerHTML =
    shiftState.days
      .map((day) => {

        const date =
          parseShiftDate(
            day.date
          );


        const isSelected =
          shiftState.selectedDates
            .has(
              day.date
            );


        const holidayName =
          day.holiday_name
            ? String(
                day.holiday_name
              )
            : '';


        const isHoliday =
          holidayName !== '';


        const weekday =
          weekdayLabels[
            date.getDay()
          ];


        const dayTypeLabel =
          day.day_type
          === 'holiday_eve'
            ? '休日前'
            : '平日前';


        const savedShift =
          shiftState.shifts
            .find(
              (shift) =>
                shift.shift_date
                === day.date
            )
          || null;


        const todayText =
          formatShiftDate(
            new Date()
          );


        const isFuture =
          day.date > todayText;


        const savedLabel =
          savedShift
            ? (
                savedShift.status
                === 'off'
                  ? '休み'
                  : `${
                      savedShift.status
                      === 'confirmed'
                        ? '確定 '
                        : ''
                    }${savedShift.store_name || ''} ${
                      formatSavedShiftTime(
                        savedShift
                      )
                    }`
              )
            : (
                isFuture
                  ? 'シフト未確定'
                  : ''
              );


        return `
          <button
            class="
              shift-day-button
              ${
                isSelected
                  ? 'is-selected'
                  : ''
              }
              ${
                day.is_weekend
                  ? 'is-weekend'
                  : ''
              }
              ${
                isHoliday
                  ? 'is-holiday'
                  : ''
              }
              ${
                savedShift
                  ? 'is-saved'
                  : ''
              }
            "
            type="button"
            data-shift-date="${escapeHtml(
              day.date
            )}"
            ${
              savedShift
                ? 'data-shift-saved="1"'
                : ''
            }
          >

            <span class="shift-day-weekday">
              ${escapeHtml(
                weekday
              )}
            </span>

            <strong class="shift-day-date">
              ${escapeHtml(
                `${date.getMonth() + 1}/${date.getDate()}`
              )}
            </strong>

            ${
              isHoliday
                ? `
                  <span class="shift-day-holiday">
                    ${escapeHtml(
                      holidayName
                    )}
                  </span>
                `
                : ''
            }

            <span class="shift-day-type">
              ${escapeHtml(
                dayTypeLabel
              )}
            </span>

            ${
              savedLabel
                ? `
                  <span class="shift-day-status">
                    ${escapeHtml(
                      savedLabel
                    )}
                  </span>
                `
                : ''
            }

          </button>
        `;
      })
      .join('');


  updateShiftSelectionCount();
}


/* ========================================
   WORKER
======================================== */

function selectShiftWorker(
  workerCode
) {

  const worker =
    shiftState.workers
      .find(
        (item) =>
          item.worker_code
          === workerCode
      );


  if (!worker) {
    return;
  }


  shiftState.workerCode =
    workerCode;


  document
    .querySelectorAll(
      '[data-shift-worker]'
    )
    .forEach((button) => {

      button.classList.toggle(
        'is-selected',
        button.dataset.shiftWorker
        === workerCode
      );
    });


  shiftState.selectedDates.clear();

  loadShift();
}


/* ========================================
   SAVED SHIFT EDIT
======================================== */

function openSavedShiftEditor(
  date
) {

  const savedShift =
    shiftState.shifts
      .find(
        (shift) =>
          shift.shift_date
          === date
      )
    || null;


  if (!savedShift) {

    showShiftSavePreview(
      '保存済みシフトを取得できませんでした。',
      true
    );

    return;
  }


  shiftState.editingShiftId =
    Number(
      savedShift.id
    );


  if (shiftDeleteButton) {
    shiftDeleteButton.hidden =
      false;
  }


  if (shiftConfirmButton) {

    const canConfirm =
      savedShift.status
      !== 'off';


    shiftConfirmButton.hidden =
      !canConfirm;


    if (canConfirm) {

      shiftConfirmButton.textContent =
        savedShift.status
        === 'confirmed'
          ? '仮シフトに戻す'
          : 'このシフトを確定';
    }
  }


  shiftState.selectedDates.clear();

  shiftState.selectedDates.add(
    date
  );


  shiftState.selectedStoreId =
    savedShift.store_id
      ? String(
          savedShift.store_id
        )
      : '';


  if (shiftStoreSelect) {

    shiftStoreSelect.value =
      shiftState.selectedStoreId;
  }


  renderShiftWeek();
  renderShiftSelectedDays();


  const row =
    document.querySelector(
      `[data-shift-row="${CSS.escape(
        date
      )}"]`
    );


  if (!row) {
    return;
  }


  const offButton =
    row.querySelector(
      '[data-shift-off]'
    );


  const startInput =
    row.querySelector(
      '[data-shift-start]'
    );


  const endInput =
    row.querySelector(
      '[data-shift-end]'
    );


  if (
    savedShift.status
    === 'off'
  ) {

    offButton
      ?.classList
      .add(
        'is-selected'
      );


    if (startInput) {
      startInput.disabled =
        true;
    }


    if (endInput) {
      endInput.disabled =
        true;
    }

  } else {

    if (startInput) {

      startInput.value =
        String(
          savedShift.start_at
          || ''
        ).slice(
          11,
          16
        );
    }


    if (endInput) {

      endInput.value =
        getSavedShiftEndTime(
          savedShift
        );
    }
  }


  showShiftSavePreview(
    `${formatShiftDisplayDate(
      date
    )} の保存済みシフトを編集中です。`
  );
}


/* ========================================
   DATE SELECTION
======================================== */

function toggleShiftDate(
  date
) {

  shiftState.editingShiftId =
    null;


  if (shiftDeleteButton) {
    shiftDeleteButton.hidden =
      true;
  }


  if (shiftConfirmButton) {
    shiftConfirmButton.hidden =
      true;
  }


  if (
    shiftState.selectedDates
      .has(date)
  ) {

    shiftState.selectedDates
      .delete(date);

  } else {

    shiftState.selectedDates
      .add(date);
  }


  renderShiftWeek();
  renderShiftSelectedDays();
}


function updateShiftSelectionCount() {

  if (!shiftSelectionCount) {
    return;
  }


  shiftSelectionCount.textContent =
    `${shiftState.selectedDates.size}日選択`;
}


/* ========================================
   STORES
======================================== */

function renderShiftStoreOptions() {

  if (!shiftStoreSelect) {
    return;
  }


  const previousValue =
    shiftState.selectedStoreId;


  shiftStoreSelect.innerHTML =
    `
      <option value="">
        店舗を選択
      </option>
    `
    +
    shiftState.stores
      .map((store) => `
        <option
          value="${escapeHtml(
            store.id
          )}"
        >
          ${escapeHtml(
            store.name
          )}
        </option>
      `)
      .join('');


  if (
    previousValue
    &&
    shiftState.stores.some(
      (store) =>
        String(store.id)
        === String(previousValue)
    )
  ) {

    shiftStoreSelect.value =
      String(
        previousValue
      );

    return;
  }


  if (
    !shiftState.editingShiftId
  ) {

    const sapporoStore =
      shiftState.stores
        .find(
          (store) =>
            store.name
            === '札幌'
        )
      || null;


    if (sapporoStore) {

      shiftState.selectedStoreId =
        String(
          sapporoStore.id
        );

      shiftStoreSelect.value =
        String(
          sapporoStore.id
        );
    }
  }
}


/* ========================================
   DEFAULT RULE
======================================== */

function getSelectedShiftWorker() {

  return shiftState.workers
    .find(
      (worker) =>
        worker.worker_code
        === shiftState.workerCode
    )
    || null;
}


function getShiftDefaultRule(
  dayType
) {

  const worker =
    getSelectedShiftWorker();


  if (!worker) {
    return null;
  }


  return shiftState.defaultRules
    .find(
      (rule) =>
        Number(
          rule.worker_id
        )
        === Number(
          worker.id
        )
        &&
        rule.day_type
        === dayType
    )
    || null;
}


/* ========================================
   SELECTED DAY LIST
======================================== */

function renderShiftSelectedDays() {

  if (!shiftSelectedDays) {
    return;
  }


  const selected =
    shiftState.days
      .filter(
        (day) =>
          shiftState.selectedDates
            .has(
              day.date
            )
      );


  if (selected.length === 0) {

    shiftSelectedDays.innerHTML =
      `
        <p class="shift-empty-message">
          日付を選択してください。
        </p>
      `;

    return;
  }


  shiftSelectedDays.innerHTML =
    selected
      .map((day) => {

        const rule =
          getShiftDefaultRule(
            day.day_type
          );


        const dayTypeLabel =
          day.day_type
          === 'holiday_eve'
            ? '休日前'
            : '平日前';


        const holidayName =
          day.holiday_name
            ? `・${day.holiday_name}`
            : '';


        return `
          <div
            class="shift-day-row"
            data-shift-row="${escapeHtml(
              day.date
            )}"
          >

            <div class="shift-day-row-date">

              <strong>
                ${escapeHtml(
                  formatShiftDisplayDate(
                    day.date
                  )
                )}
              </strong>

              <small>
                ${escapeHtml(
                  holidayName
                )}
              </small>

            </div>


            <span class="shift-day-row-type">
              ${escapeHtml(
                dayTypeLabel
              )}
            </span>


            <input
              type="text"
              inputmode="numeric"
              value="${escapeHtml(
                rule?.start_time
                || ''
              )}"
              placeholder="開始"
              data-shift-start
            >


            <input
              type="text"
              inputmode="numeric"
              value="${escapeHtml(
                rule?.end_time
                || ''
              )}"
              placeholder="終了"
              data-shift-end
            >


            <button
              class="shift-day-off-button"
              type="button"
              data-shift-off="${escapeHtml(
                day.date
              )}"
            >
              休み
            </button>

          </div>
        `;
      })
      .join('');
}


/* ========================================
   OFF
======================================== */

function toggleShiftDayOff(
  date
) {

  const row =
    document.querySelector(
      `[data-shift-row="${CSS.escape(
        date
      )}"]`
    );


  if (!row) {
    return;
  }


  const button =
    row.querySelector(
      '[data-shift-off]'
    );


  const inputs =
    row.querySelectorAll(
      'input'
    );


  const isOff =
    button.classList.toggle(
      'is-selected'
    );


  inputs.forEach(
    (input) => {
      input.disabled =
        isOff;
    }
  );
}


/* ========================================
   EVENTS
======================================== */

document.addEventListener(
  'click',
  (event) => {

    const workerButton =
      event.target.closest(
        '[data-shift-worker]'
      );


    if (workerButton) {

      selectShiftWorker(
        workerButton
          .dataset
          .shiftWorker
      );

      return;
    }


    const dateButton =
      event.target.closest(
        '[data-shift-date]'
      );


    if (dateButton) {

      if (
        dateButton
          .dataset
          .shiftSaved
        === '1'
      ) {

        openSavedShiftEditor(
          dateButton
            .dataset
            .shiftDate
        );

        return;
      }


      toggleShiftDate(
        dateButton
          .dataset
          .shiftDate
      );

      return;
    }


    const weekMoveButton =
      event.target.closest(
        '[data-shift-week-move]'
      );


    if (weekMoveButton) {

      moveShiftWeek(
        Number(
          weekMoveButton
            .dataset
            .shiftWeekMove
        )
      );

      return;
    }


    const todayButton =
      event.target.closest(
        '[data-shift-week-today]'
      );


    if (todayButton) {

      resetShiftWeekToToday();

      return;
    }


    const offButton =
      event.target.closest(
        '[data-shift-off]'
      );


    if (offButton) {

      toggleShiftDayOff(
        offButton
          .dataset
          .shiftOff
      );
    }
  }
);


shiftStoreSelect
  ?.addEventListener(
    'change',
    () => {

      shiftState.selectedStoreId =
        shiftStoreSelect.value;
    }
  );


/* ========================================
   WEEK CONFIRM
======================================== */

async function confirmCurrentShiftWeek() {

  const weekStart =
    new Date(
      shiftState.weekStart
    );


  const weekEnd =
    new Date(
      shiftState.weekStart
    );


  weekEnd.setDate(
    weekEnd.getDate() + 6
  );


  const weekStartText =
    formatShiftDate(
      weekStart
    );

  const weekEndText =
    formatShiftDate(
      weekEnd
    );


  const draftShifts =
    shiftState.shifts
      .filter(
        (shift) =>
          shift.status
          === 'draft'
          &&
          shift.shift_date
          >= weekStartText
          &&
          shift.shift_date
          <= weekEndText
      );


  if (
    draftShifts.length
    === 0
  ) {

    showShiftSavePreview(
      'この週に確定する仮シフトはありません。'
    );

    return;
  }


  const confirmed =
    window.confirm(
      `この週の仮シフト${draftShifts.length}件をまとめて確定しますか？`
    );


  if (!confirmed) {
    return;
  }


  showShiftSavePreview(
    `${draftShifts.length}件のシフトを確定しています...`
  );


  try {

    for (
      const shift
      of draftShifts
    ) {

      const response =
        await fetch(
          shiftsApiUrl,
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                id:
                  Number(
                    shift.id
                  ),

                status:
                  'confirmed',
              }),
          }
        );


      const data =
        await response.json();


      if (
        !response.ok
        ||
        !data.success
      ) {

        throw new Error(
          data.error
          || `${shift.shift_date} のシフトを確定できませんでした。`
        );
      }
    }


    shiftState.editingShiftId =
      null;

    shiftState.selectedDates.clear();


    if (shiftDeleteButton) {
      shiftDeleteButton.hidden =
        true;
    }


    if (shiftConfirmButton) {
      shiftConfirmButton.hidden =
        true;
    }


    await loadShift();


    showShiftSavePreview(
      `${draftShifts.length}件のシフトをまとめて確定しました。`
    );


  } catch (error) {

    showShiftSavePreview(
      error instanceof Error
        ? error.message
        : '週のシフトをまとめて確定できませんでした。',
      true
    );
  }
}


/* ========================================
   WEEK CONFIRM
======================================== */

async function confirmCurrentShiftWeek() {

  const weekStart =
    new Date(
      shiftState.weekStart
    );


  const weekEnd =
    new Date(
      shiftState.weekStart
    );


  weekEnd.setDate(
    weekEnd.getDate() + 6
  );


  const weekStartText =
    formatShiftDate(
      weekStart
    );

  const weekEndText =
    formatShiftDate(
      weekEnd
    );


  const draftShifts =
    shiftState.shifts
      .filter(
        (shift) =>
          shift.status
          === 'draft'
          &&
          shift.shift_date
          >= weekStartText
          &&
          shift.shift_date
          <= weekEndText
      );


  if (
    draftShifts.length
    === 0
  ) {

    showShiftSavePreview(
      'この週に確定する仮シフトはありません。'
    );

    return;
  }


  const confirmed =
    window.confirm(
      `この週の仮シフト${draftShifts.length}件をまとめて確定しますか？`
    );


  if (!confirmed) {
    return;
  }


  showShiftSavePreview(
    `${draftShifts.length}件のシフトを確定しています...`
  );


  try {

    for (
      const shift
      of draftShifts
    ) {

      const response =
        await fetch(
          shiftsApiUrl,
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                id:
                  Number(
                    shift.id
                  ),

                status:
                  'confirmed',
              }),
          }
        );


      const data =
        await response.json();


      if (
        !response.ok
        ||
        !data.success
      ) {

        throw new Error(
          data.error
          || `${shift.shift_date} のシフトを確定できませんでした。`
        );
      }
    }


    shiftState.editingShiftId =
      null;

    shiftState.selectedDates.clear();


    if (shiftDeleteButton) {
      shiftDeleteButton.hidden =
        true;
    }


    if (shiftConfirmButton) {
      shiftConfirmButton.hidden =
        true;
    }


    await loadShift();


    showShiftSavePreview(
      `${draftShifts.length}件のシフトをまとめて確定しました。`
    );


  } catch (error) {

    showShiftSavePreview(
      error instanceof Error
        ? error.message
        : '週のシフトをまとめて確定できませんでした。',
      true
    );
  }
}


/* ========================================
   CONFIRM
======================================== */

async function toggleEditingShiftConfirmation() {

  const shiftId =
    Number(
      shiftState.editingShiftId
    );


  if (!shiftId) {

    showShiftSavePreview(
      '対象のシフトが選択されていません。',
      true
    );

    return;
  }


  const savedShift =
    shiftState.shifts
      .find(
        (shift) =>
          Number(
            shift.id
          )
          === shiftId
      )
    || null;


  if (!savedShift) {

    showShiftSavePreview(
      '対象のシフトを確認できませんでした。',
      true
    );

    return;
  }


  if (
    savedShift.status
    === 'off'
  ) {

    showShiftSavePreview(
      '休みは確定切替の対象外です。',
      true
    );

    return;
  }


  const nextStatus =
    savedShift.status
    === 'confirmed'
      ? 'draft'
      : 'confirmed';


  const actionLabel =
    nextStatus
    === 'confirmed'
      ? '確定'
      : '仮シフトへ変更';


  const confirmed =
    window.confirm(
      `${formatShiftDisplayDate(
        savedShift.shift_date
      )} のシフトを${actionLabel}しますか？`
    );


  if (!confirmed) {
    return;
  }


  if (shiftConfirmButton) {

    shiftConfirmButton.disabled =
      true;

    shiftConfirmButton.textContent =
      '更新中…';
  }


  try {

    const response =
      await fetch(
        shiftsApiUrl,
        {
          method:
            'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              id:
                shiftId,

              status:
                nextStatus,
            }),
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
      ||
      !data.success
    ) {

      throw new Error(
        data.error
        || 'シフト状態を更新できませんでした。'
      );
    }


    shiftState.editingShiftId =
      null;

    shiftState.selectedDates.clear();


    if (shiftDeleteButton) {
      shiftDeleteButton.hidden =
        true;
    }


    if (shiftConfirmButton) {
      shiftConfirmButton.hidden =
        true;
    }


    await loadShift();


    showShiftSavePreview(
      nextStatus
      === 'confirmed'
        ? 'シフトを確定しました。'
        : '仮シフトに戻しました。'
    );


  } catch (error) {

    showShiftSavePreview(
      error instanceof Error
        ? error.message
        : 'シフト状態を更新できませんでした。',
      true
    );


  } finally {

    if (shiftConfirmButton) {
      shiftConfirmButton.disabled =
        false;
    }
  }
}


/* ========================================
   DELETE
======================================== */

async function deleteEditingShift() {

  const shiftId =
    Number(
      shiftState.editingShiftId
    );


  if (!shiftId) {

    showShiftSavePreview(
      '削除するシフトが選択されていません。',
      true
    );

    return;
  }


  const savedShift =
    shiftState.shifts
      .find(
        (shift) =>
          Number(
            shift.id
          )
          === shiftId
      )
    || null;


  if (!savedShift) {

    showShiftSavePreview(
      '削除対象のシフトを確認できませんでした。',
      true
    );

    return;
  }


  const confirmed =
    window.confirm(
      `${formatShiftDisplayDate(
        savedShift.shift_date
      )} のシフトを削除しますか？`
    );


  if (!confirmed) {
    return;
  }


  if (shiftDeleteButton) {

    shiftDeleteButton.disabled =
      true;

    shiftDeleteButton.textContent =
      '削除中…';
  }


  try {

    const response =
      await fetch(
        shiftsApiUrl,
        {
          method:
            'DELETE',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              id:
                shiftId,
            }),
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
      ||
      !data.success
    ) {
      throw new Error(
        data.error
        || 'シフトを削除できませんでした。'
      );
    }


    shiftState.editingShiftId =
      null;

    shiftState.selectedDates.clear();

    shiftState.selectedStoreId =
      '';


    if (shiftDeleteButton) {
      shiftDeleteButton.hidden =
        true;
    }


    await loadShift();


    showShiftSavePreview(
      'シフトを削除しました。'
    );


  } catch (error) {

    showShiftSavePreview(
      error instanceof Error
        ? error.message
        : 'シフトを削除できませんでした。',
      true
    );


  } finally {

    if (shiftDeleteButton) {

      shiftDeleteButton.disabled =
        false;

      shiftDeleteButton.textContent =
        'このシフトを削除';
    }
  }
}


/* ========================================
   SAVE PREVIEW
======================================== */

async function saveShiftBatch() {

  const worker =
    getSelectedShiftWorker();


  if (!worker) {

    showShiftSavePreview(
      'worker情報を取得できません。',
      true
    );

    return;
  }


  const selected =
    shiftState.days
      .filter(
        (day) =>
          shiftState.selectedDates
            .has(
              day.date
            )
      );


  if (selected.length === 0) {

    showShiftSavePreview(
      '保存する日付を選択してください。',
      true
    );

    return;
  }


  const rows = [];


  for (const day of selected) {

    const row =
      document.querySelector(
        `[data-shift-row="${CSS.escape(
          day.date
        )}"]`
      );


    if (!row) {

      showShiftSavePreview(
        `${day.date} の入力欄を確認できません。`,
        true
      );

      return;
    }


    const offButton =
      row.querySelector(
        '[data-shift-off]'
      );


    const isOff =
      Boolean(
        offButton
          ?.classList
          .contains(
            'is-selected'
          )
      );


    const startInput =
      row.querySelector(
        '[data-shift-start]'
      );


    const endInput =
      row.querySelector(
        '[data-shift-end]'
      );


    const startTime =
      startInput
        ?.value
        ?.trim()
      || '';


    const endTime =
      endInput
        ?.value
        ?.trim()
      || '';


    if (
      !isOff
      &&
      shiftState.selectedStoreId === ''
    ) {

      showShiftSavePreview(
        '出勤日の店舗を選択してください。',
        true
      );

      return;
    }


    if (
      !isOff
      &&
      (
        !isShiftTimeValueValid(
          startTime
        )
        ||
        !isShiftTimeValueValid(
          endTime
        )
      )
    ) {

      showShiftSavePreview(
        `${formatShiftDisplayDate(
          day.date
        )} の勤務時間を確認してください。`,
        true
      );

      return;
    }


    if (
      !isOff
      &&
      shiftTimeToMinutes(
        endTime
      )
      <=
      shiftTimeToMinutes(
        startTime
      )
    ) {

      showShiftSavePreview(
        `${formatShiftDisplayDate(
          day.date
        )} の終了時刻は開始時刻より後にしてください。`,
        true
      );

      return;
    }


    rows.push({
      shift_date:
        day.date,

      status:
        isOff
          ? 'off'
          : 'draft',

      store_id:
        isOff
          ? null
          : Number(
              shiftState.selectedStoreId
            ),

      start_time:
        isOff
          ? null
          : startTime,

      end_time:
        isOff
          ? null
          : endTime,

      note:
        null,
    });
  }


  const saveButton =
    document.querySelector(
      '[data-action="preview-shift-save"]'
    );


  const originalText =
    saveButton
      ? saveButton.textContent
      : '選択したシフトを保存';


  if (saveButton) {

    saveButton.disabled =
      true;

    saveButton.textContent =
      '保存中…';
  }


  try {

    const isEditing =
      Boolean(
        shiftState.editingShiftId
      );


    if (
      isEditing
      &&
      rows.length !== 1
    ) {
      throw new Error(
        '編集時は1件のシフトだけ選択してください。'
      );
    }


    const requestBody =
      isEditing
        ? {
            id:
              Number(
                shiftState.editingShiftId
              ),

            store_id:
              rows[0].store_id,

            shift_date:
              rows[0].shift_date,

            start_time:
              rows[0].start_time,

            end_time:
              rows[0].end_time,

            status:
              rows[0].status,

            note:
              rows[0].note,
          }
        : {
            action:
              'create_batch',

            worker_id:
              Number(
                worker.id
              ),

            rows,
          };


    const response =
      await fetch(
        shiftsApiUrl,
        {
          method:
            isEditing
              ? 'PATCH'
              : 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify(
              requestBody
            ),
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
        || 'シフトの保存に失敗しました。'
      );
    }


    const wasEditing =
      Boolean(
        shiftState.editingShiftId
      );


    shiftState.editingShiftId =
      null;


    if (shiftDeleteButton) {
      shiftDeleteButton.hidden =
        true;
    }


    shiftState.selectedDates.clear();


    await loadShift();


    showShiftSavePreview(
      wasEditing
        ? 'シフトを更新しました。'
        : `${data.created_count || rows.length}件のシフトを保存しました。`
    );


  } catch (error) {

    showShiftSavePreview(
      error.message,
      true
    );


  } finally {

    if (saveButton) {

      saveButton.disabled =
        false;

      saveButton.textContent =
        originalText;
    }
  }
}


function previewShiftSave() {

  const preview =
    document.getElementById(
      'shift-save-preview'
    );


  if (!preview) {
    return;
  }


  const worker =
    getSelectedShiftWorker();


  if (!worker) {

    showShiftSavePreview(
      'worker情報を取得できません。',
      true
    );

    return;
  }


  const selected =
    shiftState.days
      .filter(
        (day) =>
          shiftState.selectedDates
            .has(
              day.date
            )
      );


  if (selected.length === 0) {

    showShiftSavePreview(
      '保存する日付を選択してください。',
      true
    );

    return;
  }


  const rows = [];


  for (const day of selected) {

    const row =
      document.querySelector(
        `[data-shift-row="${CSS.escape(
          day.date
        )}"]`
      );


    if (!row) {

      showShiftSavePreview(
        `${day.date} の入力欄を確認できません。`,
        true
      );

      return;
    }


    const offButton =
      row.querySelector(
        '[data-shift-off]'
      );


    const isOff =
      Boolean(
        offButton
          ?.classList
          .contains(
            'is-selected'
          )
      );


    const startInput =
      row.querySelector(
        '[data-shift-start]'
      );


    const endInput =
      row.querySelector(
        '[data-shift-end]'
      );


    const startTime =
      startInput
        ?.value
        ?.trim()
      || '';


    const endTime =
      endInput
        ?.value
        ?.trim()
      || '';


    if (
      !isOff
      &&
      shiftState.selectedStoreId === ''
    ) {

      showShiftSavePreview(
        '出勤日の店舗を選択してください。',
        true
      );

      return;
    }


    if (
      !isOff
      &&
      (
        !isShiftTimeValueValid(
          startTime
        )
        ||
        !isShiftTimeValueValid(
          endTime
        )
      )
    ) {

      showShiftSavePreview(
        `${formatShiftDisplayDate(
          day.date
        )} の勤務時間を確認してください。`,
        true
      );

      return;
    }


    if (
      !isOff
      &&
      shiftTimeToMinutes(
        endTime
      )
      <=
      shiftTimeToMinutes(
        startTime
      )
    ) {

      showShiftSavePreview(
        `${formatShiftDisplayDate(
          day.date
        )} の終了時刻は開始時刻より後にしてください。`,
        true
      );

      return;
    }


    const store =
      shiftState.stores
        .find(
          (item) =>
            String(
              item.id
            )
            ===
            String(
              shiftState.selectedStoreId
            )
        )
      || null;


    rows.push({
      worker_id:
        Number(
          worker.id
        ),

      worker_name:
        worker.display_name,

      shift_date:
        day.date,

      day_type:
        day.day_type,

      holiday_name:
        day.holiday_name
        || null,

      status:
        isOff
          ? 'off'
          : 'draft',

      store_id:
        isOff
          ? null
          : Number(
              shiftState.selectedStoreId
            ),

      store_name:
        isOff
          ? null
          : (
              store?.name
              || ''
            ),

      start_time:
        isOff
          ? null
          : startTime,

      end_time:
        isOff
          ? null
          : endTime,
    });
  }


  renderShiftSavePreview(
    rows
  );
}


function renderShiftSavePreview(
  rows
) {

  const preview =
    document.getElementById(
      'shift-save-preview'
    );


  if (!preview) {
    return;
  }


  preview.hidden =
    false;


  preview.innerHTML = `
    <strong>
      保存予定 ${rows.length}件
    </strong>

    <div class="shift-preview-list">

      ${
        rows
          .map((row) => {

            const dayTypeLabel =
              row.day_type
              === 'holiday_eve'
                ? '休日前'
                : '平日前';


            const detail =
              row.status
              === 'off'
                ? '休み'
                : `${
                    row.store_name
                  } ${
                    row.start_time
                  }〜${
                    row.end_time
                  }`;


            return `
              <div class="shift-preview-row">

                <span>
                  ${escapeHtml(
                    formatShiftDisplayDate(
                      row.shift_date
                    )
                  )}
                </span>

                <span>
                  ${escapeHtml(
                    dayTypeLabel
                  )}
                </span>

                <strong>
                  ${escapeHtml(
                    detail
                  )}
                </strong>

              </div>
            `;
          })
          .join('')
      }

    </div>

    <small>
      ※ まだDBには保存されていません。
    </small>
  `;


  console.log(
    'Shift save preview',
    rows
  );
}


function showShiftSavePreview(
  message,
  isError = false
) {

  const preview =
    document.getElementById(
      'shift-save-preview'
    );


  if (!preview) {
    return;
  }


  preview.hidden =
    false;


  preview.classList.toggle(
    'is-error',
    isError
  );


  preview.textContent =
    message;
}


/* ========================================
   PREVIOUS WEEK PREVIEW
======================================== */

async function previewPreviousShiftWeek() {

  const worker =
    getSelectedShiftWorker();


  if (!worker) {

    showShiftSavePreview(
      '担当者を取得できませんでした。',
      true
    );

    return;
  }


  const targetWeekStart =
    formatShiftDate(
      shiftState.weekStart
    );


  const targetWeekEnd =
    new Date(
      shiftState.weekStart
    );


  targetWeekEnd.setDate(
    targetWeekEnd.getDate() + 6
  );


  const targetWeekLabel =
    `${formatShiftMonthDay(
      shiftState.weekStart
    )}〜${formatShiftMonthDay(
      targetWeekEnd
    )}`;


  const confirmed =
    window.confirm(
      `${worker.display_name} の前週シフトを ${targetWeekLabel} にコピーしますか？`
    );


  if (!confirmed) {
    return;
  }


  showShiftSavePreview(
    '前週シフトをコピーしています...'
  );


  try {

    const response =
      await fetch(
        shiftsApiUrl,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              action:
                'copy_previous_week',

              worker_id:
                Number(
                  worker.id
                ),

              target_week_start:
                targetWeekStart,
            }),
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
      ||
      !data.success
    ) {

      const errorMessage =
        data.error
        || '前週シフトをコピーできませんでした。';


      if (
        errorMessage
        === 'No shifts found in previous week.'
      ) {

        throw new Error(
          '前週にはコピーできるシフトがありません。'
        );
      }


      if (
        errorMessage
        === 'Target week already has shifts.'
      ) {

        throw new Error(
          'この週にはすでにシフトがあります。前週コピーは中止しました。'
        );
      }


      throw new Error(
        errorMessage
      );
    }


    await loadShift();


    showShiftSavePreview(
      `${data.created_count || 0}件の前週シフトをコピーしました。`
    );


  } catch (error) {

    console.error(
      error
    );


    showShiftSavePreview(
      error instanceof Error
        ? error.message
        : '前週シフトをコピーできませんでした。',
      true
    );
  }
}


/* ========================================
   TIME VALIDATION
======================================== */

function isShiftTimeValueValid(
  value
) {

  const match =
    /^(\d{1,2}):([0-5]\d)$/
      .exec(
        value
      );


  if (!match) {
    return false;
  }


  const hour =
    Number(
      match[1]
    );


  return (
    hour >= 0
    &&
    hour <= 47
  );
}


function shiftTimeToMinutes(
  value
) {

  const [
    hour,
    minute,
  ] =
    value
      .split(':')
      .map(Number);


  return (
    hour * 60
    +
    minute
  );
}


/* ========================================
   DATE HELPERS
======================================== */

function getSavedShiftEndTime(
  shift
) {

  if (
    !shift.start_at
    || !shift.end_at
  ) {
    return '';
  }


  const startDate =
    String(
      shift.start_at
    ).slice(
      0,
      10
    );


  const endDate =
    String(
      shift.end_at
    ).slice(
      0,
      10
    );


  let endHour =
    Number(
      String(
        shift.end_at
      ).slice(
        11,
        13
      )
    );


  const endMinute =
    String(
      shift.end_at
    ).slice(
      14,
      16
    );


  if (
    endDate > startDate
  ) {
    endHour += 24;
  }


  return `${String(
    endHour
  ).padStart(
    2,
    '0'
  )}:${endMinute}`;
}


function formatSavedShiftTime(
  shift
) {

  if (
    !shift.start_at
    || !shift.end_at
  ) {
    return '';
  }


  const startDate =
    String(
      shift.start_at
    ).slice(
      0,
      10
    );


  const endDate =
    String(
      shift.end_at
    ).slice(
      0,
      10
    );


  const startTime =
    String(
      shift.start_at
    ).slice(
      11,
      16
    );


  let endHour =
    Number(
      String(
        shift.end_at
      ).slice(
        11,
        13
      )
    );


  const endMinute =
    String(
      shift.end_at
    ).slice(
      14,
      16
    );


  if (
    endDate > startDate
  ) {
    endHour += 24;
  }


  const endTime =
    `${String(
      endHour
    ).padStart(
      2,
      '0'
    )}:${endMinute}`;


  return `${startTime}〜${endTime}`;
}


function parseShiftDate(
  value
) {

  return new Date(
    `${value}T12:00:00`
  );
}


function formatShiftDate(
  date
) {

  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );


  return `${year}-${month}-${day}`;
}


function formatShiftMonthDay(
  date
) {

  return `${
    date.getMonth() + 1
  }/${date.getDate()}`;
}


function formatShiftDisplayDate(
  value
) {

  const date =
    parseShiftDate(
      value
    );


  const labels = [
    '日',
    '月',
    '火',
    '水',
    '木',
    '金',
    '土',
  ];


  return `${
    date.getMonth() + 1
  }/${date.getDate()}（${
    labels[
      date.getDay()
    ]
  }）`;
}

// WRITER:WORK_SHIFT_LOGIC:END