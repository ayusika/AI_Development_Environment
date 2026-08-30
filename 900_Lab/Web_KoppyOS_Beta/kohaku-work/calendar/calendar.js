'use strict';


const SHIFTS_API_URL =
  '/api/v1/shifts.php';

const CALENDAR_EVENTS_API_URL =
  '/api/v1/calendar-events.php';

const CALENDAR_COLOR_PALETTE_API_URL =
  '/api/v1/calendar-color-palette.php';

const HOLIDAYS_API_URL =
  'https://holidays-jp.github.io/api/v1/date.json';


const calendarState = {
  currentMonth:
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    ),
  shifts: [],
  events: [],
  holidays: {},
};


const monthTitleElement =
  document.getElementById(
    'calendar-month-title'
  );

const monthCalendarElement =
  document.getElementById(
    'month-calendar'
  );

const todayButton =
  document.querySelector(
    '[data-calendar-today]'
  );

const moveButtons =
  document.querySelectorAll(
    '[data-calendar-move]'
  );


const eventModal =
  document.querySelector(
    '[data-event-modal]'
  );

const eventForm =
  document.querySelector(
    '[data-event-form]'
  );

const eventDateInput =
  document.querySelector(
    '[data-event-date]'
  );

const eventIdInput =
  document.querySelector(
    '[data-event-id]'
  );

const eventDateLabel =
  document.querySelector(
    '[data-event-date-label]'
  );

const eventDialogTitle =
  document.getElementById(
    'calendar-event-dialog-title'
  );

const eventDeleteButton =
  document.querySelector(
    '[data-event-delete]'
  );

const eventOwnerSelect =
  document.querySelector(
    '[data-event-owner]'
  );

const eventAllDayInput =
  document.querySelector(
    '[data-event-all-day]'
  );

const eventStartTimeInput =
  document.querySelector(
    '[data-event-start-time]'
  );

const eventEndTimeInput =
  document.querySelector(
    '[data-event-end-time]'
  );

const eventEndDateInput =
  document.querySelector(
    '[data-event-end-date]'
  );

const eventMultiDayInput =
  document.querySelector(
    '[data-event-multi-day]'
  );

const eventEndDateField =
  document.querySelector(
    '[data-event-end-date-field]'
  );

const eventTextColorInput =
  document.querySelector(
    '[data-event-text-color]'
  );

const colorPaletteItems =
  document.querySelector(
    '[data-color-palette-items]'
  );

const colorPaletteAddButton =
  document.querySelector(
    '[data-color-palette-add]'
  );

const eventMessage =
  document.querySelector(
    '[data-event-message]'
  );

const eventModalCloseButtons =
  document.querySelectorAll(
    '[data-event-modal-close]'
  );


const repeatTypeSelect =
  document.querySelector(
    '[data-repeat-type]'
  );

const repeatDetails =
  document.querySelector(
    '[data-repeat-details]'
  );

const repeatIntervalField =
  document.querySelector(
    '[data-repeat-interval-field]'
  );

const repeatIntervalInput =
  document.querySelector(
    '[data-repeat-interval]'
  );

const repeatIntervalUnit =
  document.querySelector(
    '[data-repeat-interval-unit]'
  );

const repeatWeekdaysField =
  document.querySelector(
    '[data-repeat-weekdays-field]'
  );

const repeatWeekdayInputs =
  eventForm.querySelectorAll(
    '[name="repeat_weekdays"]'
  );

const repeatMonthDayField =
  document.querySelector(
    '[data-repeat-month-day-field]'
  );

const repeatDayOfMonthInput =
  document.querySelector(
    '[data-repeat-day-of-month]'
  );

const repeatMonthWeekdayField =
  document.querySelector(
    '[data-repeat-month-weekday-field]'
  );

const repeatWeekOfMonthSelect =
  document.querySelector(
    '[data-repeat-week-of-month]'
  );

const repeatWeekdaySelect =
  document.querySelector(
    '[data-repeat-weekday]'
  );

const repeatYearlyField =
  document.querySelector(
    '[data-repeat-yearly-field]'
  );

const repeatMonthInput =
  document.querySelector(
    '[data-repeat-month]'
  );

const repeatYearlyDayInput =
  document.querySelector(
    '[data-repeat-yearly-day]'
  );

const repeatEndTypeSelect =
  document.querySelector(
    '[data-repeat-end-type]'
  );

const repeatEndDateField =
  document.querySelector(
    '[data-repeat-end-date-field]'
  );

const repeatEndDateInput =
  document.querySelector(
    '[data-repeat-end-date]'
  );

const repeatCountField =
  document.querySelector(
    '[data-repeat-count-field]'
  );

const repeatCountInput =
  document.querySelector(
    '[data-repeat-count]'
  );


function syncRepeatEndFields() {
  const repeatEndType =
    repeatEndTypeSelect.value;


  repeatEndDateField.hidden =
    repeatEndType !== 'date';

  repeatCountField.hidden =
    repeatEndType !== 'count';
}


function syncRepeatFields() {
  const repeatType =
    repeatTypeSelect.value;

  const isRepeating =
    repeatType !== 'none';


  repeatDetails.hidden =
    !isRepeating;


  if (!isRepeating) {
    return;
  }


  repeatIntervalField.hidden =
    false;

  repeatWeekdaysField.hidden =
    repeatType !== 'weekly';

  repeatMonthDayField.hidden =
    repeatType !== 'monthly_day';

  repeatMonthWeekdayField.hidden =
    repeatType !==
    'monthly_weekday';

  repeatYearlyField.hidden =
    repeatType !== 'yearly';


  const intervalUnits = {
    daily:
      '日ごと',
    weekly:
      '週ごと',
    monthly_day:
      '月ごと',
    monthly_weekday:
      '月ごと',
    yearly:
      '年ごと',
  };


  repeatIntervalUnit.textContent =
    intervalUnits[repeatType]
    || 'ごと';


  syncRepeatEndFields();
}


repeatTypeSelect.addEventListener(
  'change',
  () => {
    syncRepeatFields();
  }
);


repeatEndTypeSelect.addEventListener(
  'change',
  () => {
    syncRepeatEndFields();
  }
);


async function loadSavedColorPalette() {
  const response =
    await fetch(
      CALENDAR_COLOR_PALETTE_API_URL,
      {
        credentials:
          'same-origin',
      }
    );


  const data =
    await response.json();


  if (
    !response.ok
    ||
    data.success !== true
    ||
    !Array.isArray(
      data.colors
    )
  ) {
    throw new Error(
      data.error
      || '登録パレットを読み込めませんでした。'
    );
  }


  return data.colors
    .map(
      (item) =>
        String(
          item.color
          || ''
        ).toLowerCase()
    )
    .filter(
      (color) =>
        /^#[0-9a-f]{6}$/.test(
          color
        )
    );
}


async function renderColorPalette() {
  if (!colorPaletteItems) {
    return;
  }


  colorPaletteItems.textContent =
    '';


  try {

    const colors =
      await loadSavedColorPalette();


    colors.forEach(
      (color) => {

        const button =
          document.createElement(
            'button'
          );

        button.type =
          'button';

        button.className =
          'calendar-color-palette-button';

        button.style.backgroundColor =
          color;

        button.dataset.color =
          color;

        button.setAttribute(
          'aria-label',
          `文字色 ${color}`
        );

        button.title =
          color;


        let longPressTimer =
          null;

        let longPressTriggered =
          false;


        const startLongPress =
          () => {

            longPressTriggered =
              false;

            longPressTimer =
              window.setTimeout(
                async () => {

                  longPressTriggered =
                    true;


                  const shouldDelete =
                    window.confirm(
                      `${color} を登録パレットから削除しますか？`
                    );


                  if (!shouldDelete) {
                    return;
                  }


                  try {

                    const response =
                      await fetch(
                        CALENDAR_COLOR_PALETTE_API_URL,
                        {
                          method:
                            'DELETE',

                          credentials:
                            'same-origin',

                          headers: {
                            'Content-Type':
                              'application/json',
                          },

                          body:
                            JSON.stringify({
                              color,
                            }),
                        }
                      );


                    const data =
                      await response.json();


                    if (
                      !response.ok
                      ||
                      data.success !== true
                    ) {
                      throw new Error(
                        data.error
                        || '登録色を削除できませんでした。'
                      );
                    }


                    await renderColorPalette();

                  } catch (error) {

                    console.error(
                      'Failed to delete palette color.',
                      error
                    );

                    if (eventMessage) {
                      eventMessage.textContent =
                        error.message
                        || '登録色を削除できませんでした。';
                    }
                  }
                },
                600
              );
          };


        const cancelLongPress =
          () => {

            if (longPressTimer !== null) {
              window.clearTimeout(
                longPressTimer
              );

              longPressTimer =
                null;
            }
          };


        button.addEventListener(
          'pointerdown',
          startLongPress
        );


        button.addEventListener(
          'pointerup',
          cancelLongPress
        );


        button.addEventListener(
          'pointerleave',
          cancelLongPress
        );


        button.addEventListener(
          'pointercancel',
          cancelLongPress
        );


        button.addEventListener(
          'click',
          () => {

            if (longPressTriggered) {
              longPressTriggered =
                false;

              return;
            }


            eventTextColorInput.value =
              color;
          }
        );


        colorPaletteItems.appendChild(
          button
        );
      }
    );

  } catch (error) {

    console.error(
      'Failed to load saved color palette.',
      error
    );
  }
}


function padNumber(value) {
  return String(value).padStart(
    2,
    '0'
  );
}


function formatDateKey(date) {
  return [
    date.getFullYear(),
    padNumber(
      date.getMonth() + 1
    ),
    padNumber(
      date.getDate()
    ),
  ].join('-');
}


function formatMonthKey(date) {
  return [
    date.getFullYear(),
    padNumber(
      date.getMonth() + 1
    ),
  ].join('-');
}


function scrollToCurrentMonth(
  behavior = 'smooth'
) {
  const monthElement =
    monthCalendarElement.querySelector(
      `[data-calendar-month="${formatMonthKey(
        calendarState.currentMonth
      )}"]`
    );

  if (!monthElement) {
    return;
  }

  monthElement.scrollIntoView({
    behavior,
    block: 'start',
  });
}


function parseDateKey(dateKey) {
  const [
    year,
    month,
    day,
  ] =
    dateKey
      .split('-')
      .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}


function getMonthRange(monthDate) {
  const firstDate =
    new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1
    );

  const lastDate =
    new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0
    );

  return {
    firstDate,
    lastDate,
  };
}


function getShiftTimeParts(value) {
  if (!value) {
    return null;
  }

  const match =
    String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
    );

  if (!match) {
    return null;
  }

  return {
    dateKey:
      `${match[1]}-${match[2]}-${match[3]}`,
    hour:
      Number(match[4]),
    minute:
      Number(match[5]),
  };
}


function getExtendedShiftTime(
  value,
  shiftDate
) {
  const parts =
    getShiftTimeParts(value);

  if (!parts) {
    return '';
  }

  let hour =
    parts.hour;

  if (
    shiftDate
    && parts.dateKey !== shiftDate
  ) {
    const shiftDateObject =
      parseDateKey(
        shiftDate
      );

    const valueDateObject =
      parseDateKey(
        parts.dateKey
      );

    const dayDifference =
      Math.round(
        (
          valueDateObject
            - shiftDateObject
        )
        / 86400000
      );

    if (dayDifference > 0) {
      hour +=
        dayDifference * 24;
    }
  }

  return (
    `${padNumber(hour)}:`
    + `${padNumber(parts.minute)}`
  );
}


function getShiftMinutes(
  value,
  shiftDate
) {
  const time =
    getExtendedShiftTime(
      value,
      shiftDate
    );

  if (time === '') {
    return null;
  }

  const [
    hour,
    minute,
  ] =
    time
      .split(':')
      .map(Number);

  return (
    hour * 60
    + minute
  );
}


function createShiftElement(shift) {
  const shiftElement =
    document.createElement('div');

  shiftElement.className =
    'calendar-shift';


  const workerCode =
    String(
      shift.worker_code
      || ''
    );

  if (workerCode !== '') {
    shiftElement.dataset.workerCode =
      workerCode;
  }


  const isOff =
    shift.status === 'off';

  if (isOff) {
    shiftElement.dataset.shiftKind =
      'off';
  }


  const shiftDate =
    String(
      shift.shift_date
      || ''
    );

  const startTime =
    getExtendedShiftTime(
      shift.start_at,
      shiftDate
    );

  const endTime =
    getExtendedShiftTime(
      shift.end_at,
      shiftDate
    );

  const startMinutes =
    getShiftMinutes(
      shift.start_at,
      shiftDate
    );

  const endMinutes =
    getShiftMinutes(
      shift.end_at,
      shiftDate
    );


  let defaultStartMinutes =
    null;

  let defaultEndMinutes =
    null;


  const isSapporo =
    shift.store_name === '札幌';


  if (
    isSapporo
    && workerCode === 'shii'
  ) {
    defaultStartMinutes =
      14 * 60;

    defaultEndMinutes =
      24 * 60;
  }


  if (
    isSapporo
    && workerCode === 'ui'
  ) {
    defaultStartMinutes =
      15 * 60;

    defaultEndMinutes =
      25 * 60;
  }


  const detailElement =
    document.createElement('span');

  detailElement.className =
    'calendar-shift-detail';


  if (isOff) {

    detailElement.textContent =
      '休み';

  } else {

    const startElement =
      document.createElement('span');

    startElement.textContent =
      startTime;


    if (
      defaultStartMinutes !== null
      && startMinutes !== null
      && startMinutes
        !== defaultStartMinutes
    ) {
      startElement.className =
        'calendar-shift-time-changed';
    }


    const separatorElement =
      document.createTextNode('〜');


    const endElement =
      document.createElement('span');

    endElement.textContent =
      endTime;


    if (
      defaultEndMinutes !== null
      && endMinutes !== null
      && endMinutes
        !== defaultEndMinutes
    ) {
      endElement.className =
        'calendar-shift-time-changed';
    }


    detailElement.append(
      startElement,
      separatorElement,
      endElement
    );


    if (shift.store_name) {
      detailElement.append(
        document.createTextNode(
          ` ${shift.store_name}`
        )
      );
    }
  }


  shiftElement.append(
    detailElement
  );

  return shiftElement;
}


function groupShiftsByDate(shifts) {
  const grouped =
    new Map();


  shifts.forEach(
    (shift) => {

      const dateKey =
        String(
          shift.shift_date
          || ''
        );


      if (dateKey === '') {
        return;
      }


      if (!grouped.has(dateKey)) {
        grouped.set(
          dateKey,
          []
        );
      }


      grouped
        .get(dateKey)
        .push(shift);
    }
  );


  return grouped;
}


function getCalendarEventDateRange(
  event
) {
  const startMatch =
    String(
      event.start_at
      || ''
    ).match(
      /^(\d{4}-\d{2}-\d{2})/
    );

  if (!startMatch) {
    return null;
  }


  const endMatch =
    String(
      event.end_at
      || ''
    ).match(
      /^(\d{4}-\d{2}-\d{2})/
    );


  const startDate =
    parseDateKey(
      startMatch[1]
    );

  const endDate =
    endMatch
      ? parseDateKey(
          endMatch[1]
        )
      : startDate;


  return {
    startDate,
    endDate,
    startDateKey:
      startMatch[1],
    endDateKey:
      endMatch
        ? endMatch[1]
        : startMatch[1],
  };
}


function calendarEventParseDateTime(
  value
) {
  const match =
    String(
      value
      || ''
    ).match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
    );


  if (!match) {
    return null;
  }


  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0,
    0
  );
}


function calendarEventFormatDateTime(
  date
) {
  return (
    formatDateKey(date)
    + ' '
    + padNumber(
        date.getHours()
      )
    + ':'
    + padNumber(
        date.getMinutes()
      )
  );
}


function calendarEventDateSerial(
  date
) {
  return (
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    )
    / 86400000
  );
}


function calendarEventMonthDifference(
  masterDate,
  candidateDate
) {
  return (
    (
      candidateDate.getFullYear()
      - masterDate.getFullYear()
    )
    * 12
    + candidateDate.getMonth()
    - masterDate.getMonth()
  );
}


function calendarEventRepeatWeekdays(
  event
) {
  const rawWeekdays =
    event.repeat_weekdays;


  const values =
    Array.isArray(
      rawWeekdays
    )
      ? rawWeekdays
      : String(
          rawWeekdays
          || ''
        ).split(',');


  return [
    ...new Set(
      values
        .map(Number)
        .filter(
          (weekday) =>
            weekday >= 0
            && weekday <= 6
        )
    ),
  ].sort(
    (left, right) =>
      left - right
  );
}


function calendarEventMatchesRepeatDate(
  event,
  masterDate,
  candidateDate
) {
  const masterDateKey =
    formatDateKey(
      masterDate
    );

  const candidateDateKey =
    formatDateKey(
      candidateDate
    );


  /*
   * 元予定の日付は必ず第1回として残す。
   *
   * これにより、
   * 元予定の日付と後から選び直した繰り返し条件が
   * 完全一致しない場合でも元予定そのものは消えない。
   */
  if (
    candidateDateKey
    === masterDateKey
  ) {
    return true;
  }


  if (
    calendarEventDateSerial(
      candidateDate
    )
    <
    calendarEventDateSerial(
      masterDate
    )
  ) {
    return false;
  }


  const repeatType =
    String(
      event.repeat_type
      || 'none'
    );

  const repeatInterval =
    Math.max(
      1,
      Number(
        event.repeat_interval
        || 1
      )
    );


  if (repeatType === 'daily') {
    const dayDifference =
      calendarEventDateSerial(
        candidateDate
      )
      -
      calendarEventDateSerial(
        masterDate
      );


    return (
      dayDifference > 0
      &&
      dayDifference
        % repeatInterval
        === 0
    );
  }


  if (repeatType === 'weekly') {
    const weekdays =
      calendarEventRepeatWeekdays(
        event
      );


    if (
      !weekdays.includes(
        candidateDate.getDay()
      )
    ) {
      return false;
    }


    const masterWeekStart =
      calendarEventDateSerial(
        masterDate
      )
      - masterDate.getDay();

    const candidateWeekStart =
      calendarEventDateSerial(
        candidateDate
      )
      - candidateDate.getDay();

    const weekDifference =
      (
        candidateWeekStart
        - masterWeekStart
      )
      / 7;


    return (
      weekDifference >= 0
      &&
      weekDifference
        % repeatInterval
        === 0
    );
  }


  if (
    repeatType ===
    'monthly_day'
  ) {
    const monthDifference =
      calendarEventMonthDifference(
        masterDate,
        candidateDate
      );

    const repeatDay =
      Number(
        event.repeat_day_of_month
        || 0
      );


    return (
      monthDifference >= 0
      &&
      monthDifference
        % repeatInterval
        === 0
      &&
      candidateDate.getDate()
        === repeatDay
    );
  }


  if (
    repeatType ===
    'monthly_weekday'
  ) {
    const monthDifference =
      calendarEventMonthDifference(
        masterDate,
        candidateDate
      );


    if (
      monthDifference < 0
      ||
      monthDifference
        % repeatInterval
        !== 0
    ) {
      return false;
    }


    const repeatWeekday =
      Number(
        event.repeat_weekday
        ?? -1
      );

    const repeatWeekOfMonth =
      Number(
        event.repeat_week_of_month
        || 0
      );


    if (
      candidateDate.getDay()
      !== repeatWeekday
    ) {
      return false;
    }


    if (
      repeatWeekOfMonth === -1
    ) {
      const lastDate =
        new Date(
          candidateDate.getFullYear(),
          candidateDate.getMonth() + 1,
          0
        ).getDate();


      return (
        candidateDate.getDate()
        + 7
        > lastDate
      );
    }


    return (
      Math.ceil(
        candidateDate.getDate()
        / 7
      )
      === repeatWeekOfMonth
    );
  }


  if (repeatType === 'yearly') {
    const yearDifference =
      candidateDate.getFullYear()
      - masterDate.getFullYear();

    const repeatMonth =
      Number(
        event.repeat_month
        || 0
      );

    const repeatDay =
      Number(
        event.repeat_day_of_month
        || 0
      );


    return (
      yearDifference >= 0
      &&
      yearDifference
        % repeatInterval
        === 0
      &&
      candidateDate.getMonth() + 1
        === repeatMonth
      &&
      candidateDate.getDate()
        === repeatDay
    );
  }


  return false;
}


function createRecurringCalendarOccurrence(
  event,
  occurrenceDate
) {
  const masterStartAt =
    calendarEventParseDateTime(
      event.start_at
    );


  if (!masterStartAt) {
    return null;
  }


  const masterEndAt =
    calendarEventParseDateTime(
      event.end_at
    );


  const occurrenceStartAt =
    new Date(
      occurrenceDate.getFullYear(),
      occurrenceDate.getMonth(),
      occurrenceDate.getDate(),
      masterStartAt.getHours(),
      masterStartAt.getMinutes(),
      0,
      0
    );


  let occurrenceEndAt =
    null;


  if (masterEndAt) {
    const durationMilliseconds =
      Math.max(
        0,
        masterEndAt.getTime()
        - masterStartAt.getTime()
      );


    occurrenceEndAt =
      new Date(
        occurrenceStartAt.getTime()
        + durationMilliseconds
      );
  }


  return {
    ...event,

    start_at:
      calendarEventFormatDateTime(
        occurrenceStartAt
      ),

    end_at:
      occurrenceEndAt
        ? calendarEventFormatDateTime(
            occurrenceEndAt
          )
        : null,

    recurring_master_start_at:
      event.recurring_master_start_at
      || event.start_at
      || null,

    recurring_master_end_at:
      event.recurring_master_end_at
      ?? event.end_at
      ?? null,

    recurring_occurrence_date:
      formatDateKey(
        occurrenceDate
      ),

    is_recurring_occurrence:
      true,
  };
}


function expandRecurringCalendarEvents(
  events,
  rangeStartDate,
  rangeEndDate
) {
  const expandedEvents =
    [];


  const rangeStartAt =
    new Date(
      rangeStartDate.getFullYear(),
      rangeStartDate.getMonth(),
      rangeStartDate.getDate(),
      0,
      0,
      0,
      0
    );

  const rangeEndExclusive =
    new Date(
      rangeEndDate.getFullYear(),
      rangeEndDate.getMonth(),
      rangeEndDate.getDate() + 1,
      0,
      0,
      0,
      0
    );


  events.forEach(
    (event) => {

      const repeatType =
        String(
          event.repeat_type
          || 'none'
        );


      if (repeatType === 'none') {
        expandedEvents.push(
          event
        );

        return;
      }


      const masterStartAt =
        calendarEventParseDateTime(
          event.start_at
        );


      if (!masterStartAt) {
        expandedEvents.push(
          event
        );

        return;
      }


      const masterDate =
        new Date(
          masterStartAt.getFullYear(),
          masterStartAt.getMonth(),
          masterStartAt.getDate()
        );


      const repeatEndType =
        String(
          event.repeat_end_type
          || 'none'
        );

      const repeatEndDateKey =
        repeatEndType === 'date'
          ? String(
              event.repeat_end_date
              || ''
            )
          : '';

      const repeatCount =
        repeatEndType === 'count'
          ? Math.max(
              1,
              Number(
                event.repeat_count
                || 1
              )
            )
          : null;


      let occurrenceCount =
        0;

      let candidateDate =
        new Date(
          masterDate
        );

      let iterationCount =
        0;


      /*
       * 異常に古い無期限予定でもブラウザを固めないための安全弁。
       *
       * 通常の13か月表示では十分すぎる上限。
       */
      const maxIterations =
        100000;


      while (
        candidateDate
          < rangeEndExclusive
      ) {
        iterationCount +=
          1;


        if (
          iterationCount
          > maxIterations
        ) {
          console.warn(
            '繰り返し予定の展開上限に達しました。',
            event
          );

          break;
        }


        const candidateDateKey =
          formatDateKey(
            candidateDate
          );


        if (
          repeatEndDateKey !== ''
          &&
          candidateDateKey
            > repeatEndDateKey
        ) {
          break;
        }


        if (
          calendarEventMatchesRepeatDate(
            event,
            masterDate,
            candidateDate
          )
        ) {
          occurrenceCount +=
            1;


          if (
            repeatCount !== null
            &&
            occurrenceCount
              > repeatCount
          ) {
            break;
          }


          const occurrence =
            createRecurringCalendarOccurrence(
              event,
              candidateDate
            );


          if (occurrence) {
            const occurrenceStartAt =
              calendarEventParseDateTime(
                occurrence.start_at
              );

            const occurrenceEndAt =
              calendarEventParseDateTime(
                occurrence.end_at
              )
              || occurrenceStartAt;


            if (
              occurrenceStartAt
              &&
              occurrenceEndAt
              &&
              occurrenceEndAt
                >= rangeStartAt
              &&
              occurrenceStartAt
                < rangeEndExclusive
            ) {
              expandedEvents.push(
                occurrence
              );
            }
          }


          if (
            repeatCount !== null
            &&
            occurrenceCount
              >= repeatCount
          ) {
            break;
          }
        }


        candidateDate =
          new Date(
            candidateDate.getFullYear(),
            candidateDate.getMonth(),
            candidateDate.getDate() + 1
          );
      }
    }
  );


  expandedEvents.sort(
    (left, right) => {
      const startCompare =
        String(
          left.start_at
          || ''
        ).localeCompare(
          String(
            right.start_at
            || ''
          )
        );


      if (startCompare !== 0) {
        return startCompare;
      }


      return (
        Number(left.id || 0)
        - Number(right.id || 0)
      );
    }
  );


  return expandedEvents;
}


function isMultiDayCalendarEvent(
  event
) {
  const range =
    getCalendarEventDateRange(
      event
    );

  return (
    range !== null
    &&
    range.endDateKey
      > range.startDateKey
  );
}


function groupEventsByDate(events) {
  const grouped =
    new Map();


  events.forEach(
    (event) => {

      const range =
        getCalendarEventDateRange(
          event
        );


      if (
        range === null
        ||
        isMultiDayCalendarEvent(
          event
        )
      ) {
        return;
      }


      const dateKey =
        range.startDateKey;


      if (!grouped.has(dateKey)) {
        grouped.set(
          dateKey,
          []
        );
      }


      grouped
        .get(dateKey)
        .push(event);
    }
  );


  return grouped;
}


function findWorkerShift(
  shifts,
  workerCode
) {
  return shifts.find(
    (shift) =>
      shift.worker_code
      === workerCode
  ) || null;
}


function getShiftContinuationKey(
  shift
) {
  if (!shift) {
    return '';
  }

  if (shift.status === 'off') {
    return [
      shift.worker_code,
      'off',
    ].join('|');
  }


  const shiftDate =
    String(
      shift.shift_date
      || ''
    );


  const startTime =
    getExtendedShiftTime(
      shift.start_at,
      shiftDate
    );

  const endTime =
    getExtendedShiftTime(
      shift.end_at,
      shiftDate
    );


  return [
    shift.worker_code,
    shift.status,
    shift.store_name || '',
    startTime,
    endTime,
  ].join('|');
}


function getWorkLineContinuationKey(
  shift,
  workerCode
) {
  if (!shift) {
    return [
      workerCode,
      'empty',
    ].join('|');
  }


  return getShiftContinuationKey(
    shift
  );
}


function workLinesContinue(
  currentShift,
  adjacentShift,
  workerCode
) {
  return (
    getWorkLineContinuationKey(
      currentShift,
      workerCode
    )
    ===
    getWorkLineContinuationKey(
      adjacentShift,
      workerCode
    )
  );
}


function createEmptyShiftElement(
  workerCode
) {
  const shiftElement =
    document.createElement('div');

  shiftElement.className =
    'calendar-shift is-empty';

  shiftElement.dataset.workerCode =
    workerCode;

  shiftElement.dataset.shiftKind =
    'empty';


  const detailElement =
    document.createElement('span');

  detailElement.className =
    'calendar-shift-detail';

  detailElement.textContent =
    '';


  shiftElement.appendChild(
    detailElement
  );


  return shiftElement;
}

function createCalendarEventElement(
  event,
  dateKey
) {
  const eventElement =
    document.createElement('div');

  eventElement.className =
    'calendar-event';


  const ownerCode =
    String(
      event.owner_code
      || ''
    );

  if (ownerCode !== '') {
    eventElement.dataset.ownerCode =
      ownerCode;
  }


  const textColor =
    String(
      event.text_color
      || ''
    );

  if (
    /^#[0-9A-Fa-f]{6}$/.test(
      textColor
    )
  ) {
    eventElement.style.color =
      textColor;
  }


  const startAt =
    String(
      event.start_at
      || ''
    );

  const endAt =
    String(
      event.end_at
      || ''
    );


  const startDateMatch =
    startAt.match(
      /^(\d{4}-\d{2}-\d{2})/
    );

  const endDateMatch =
    endAt.match(
      /^(\d{4}-\d{2}-\d{2})/
    );


  const startDateKey =
    startDateMatch
      ? startDateMatch[1]
      : dateKey;

  const endDateKey =
    endDateMatch
      ? endDateMatch[1]
      : startDateKey;


  const isMultiDay =
    endDateKey > startDateKey;

  const allDay =
    Number(
      event.all_day
      || 0
    ) === 1;


  if (isMultiDay) {
    eventElement.classList.add(
      'is-multi-day'
    );


    if (dateKey === startDateKey) {
      eventElement.classList.add(
        'is-multi-day-start'
      );
    }


    if (dateKey === endDateKey) {
      eventElement.classList.add(
        'is-multi-day-end'
      );
    }


    if (
      dateKey !== startDateKey
      &&
      dateKey !== endDateKey
    ) {
      eventElement.classList.add(
        'is-multi-day-middle'
      );
    }

  } else if (allDay) {

    eventElement.classList.add(
      'is-all-day-single'
    );

  } else {

    eventElement.classList.add(
      'is-timed-single'
    );
  }


  let showTitle =
    true;


  if (isMultiDay) {
    const startDate =
      parseDateKey(
        startDateKey
      );

    const endDate =
      parseDateKey(
        endDateKey
      );

    const dayCount =
      Math.round(
        (
          endDate
          - startDate
        )
        / 86400000
      );

    const middleDate =
      new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
          + Math.floor(
              dayCount / 2
            )
      );

    showTitle =
      dateKey
      === formatDateKey(
        middleDate
      );
  }


  if (
    !allDay
    &&
    !isMultiDay
  ) {
    const match =
      startAt.match(
        /\s(\d{2}):(\d{2})/
      );

    if (
      match
      &&
      match[1] !== '00'
    ) {
      const timeElement =
        document.createElement(
          'span'
        );

      timeElement.className =
        'calendar-event-time';

      timeElement.textContent =
        `${match[1]}:${match[2]}`;

      eventElement.appendChild(
        timeElement
      );
    }
  }


  if (showTitle) {
    const titleElement =
      document.createElement(
        'span'
      );

    titleElement.className =
      'calendar-event-title';

    titleElement.textContent =
      String(
        event.title
        || ''
      );

    eventElement.appendChild(
      titleElement
    );
  }


  eventElement.addEventListener(
    'click',
    (clickEvent) => {

      clickEvent.stopPropagation();


      if (!startDateMatch) {
        return;
      }


      openEventModal(
        startDateKey,
        ownerCode,
        event
      );
    }
  );


  return eventElement;
}


function closeEventModal() {
  eventModal.hidden =
    true;

  document.body.style.overflow =
    '';
}


eventModalCloseButtons.forEach(
  (button) => {

    button.addEventListener(
      'click',
      () => {
        closeEventModal();
      }
    );
  }
);


eventDeleteButton.addEventListener(
  'click',
  async () => {

    const eventId =
      Number(
        eventIdInput.value
        || 0
      );


    if (eventId <= 0) {
      return;
    }


    const titleInput =
      eventForm.querySelector(
        '[name="title"]'
      );


    const title =
      String(
        titleInput?.value
        || 'この予定'
      );


    const isRepeating =
      repeatTypeSelect.value
      !== 'none';


    const confirmMessage =
      isRepeating
        ? (
            `「${title}」の繰り返し予定を`
            + 'すべて削除しますか？\n\n'
            + 'この1回だけではなく、'
            + 'シリーズ全体が削除されます。'
          )
        : `「${title}」を削除しますか？`;


    const confirmed =
      window.confirm(
        confirmMessage
      );


    if (!confirmed) {
      return;
    }


    eventMessage.textContent =
      '削除しています…';


    eventDeleteButton.disabled =
      true;


    try {

      const response =
        await fetch(
          CALENDAR_EVENTS_API_URL,
          {
            method:
              'DELETE',

            credentials:
              'same-origin',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                id:
                  eventId,
              }),
          }
        );


      const data =
        await response.json();


      if (
        !response.ok
        || data.success !== true
      ) {
        throw new Error(
          data.error
          || '予定を削除できませんでした。'
        );
      }


      closeEventModal();


      await loadMonthShifts();


    } catch (error) {

      console.error(
        error
      );


      eventMessage.textContent =
        error.message
        || '予定を削除できませんでした。';


    } finally {

      eventDeleteButton.disabled =
        false;
    }
  }
);


eventAllDayInput.addEventListener(
  'change',
  () => {

    const disabled =
      eventAllDayInput.checked;

    eventStartTimeInput.disabled =
      disabled;

    eventEndTimeInput.disabled =
      disabled;

    if (disabled) {
      eventStartTimeInput.value =
        '';

      eventEndTimeInput.value =
        '';
    }
  }
);


eventForm.addEventListener(
  'submit',
  async (event) => {

    event.preventDefault();


    const formData =
      new FormData(
        eventForm
      );


    const repeatType =
      String(
        formData.get(
          'repeat_type'
        )
        || 'none'
      );

    const repeatEndType =
      repeatType === 'none'
        ? 'none'
        : String(
            formData.get(
              'repeat_end_type'
            )
            || 'none'
          );


    let repeatDayOfMonth =
      null;


    if (
      repeatType ===
      'monthly_day'
    ) {
      repeatDayOfMonth =
        Number(
          formData.get(
            'repeat_day_of_month'
          )
          || 0
        );
    }


    if (repeatType === 'yearly') {
      repeatDayOfMonth =
        Number(
          repeatYearlyDayInput.value
          || 0
        );
    }


    const payload = {
      event_date:
        String(
          formData.get(
            'event_date'
          )
          || ''
        ),

      owner_code:
        String(
          formData.get(
            'owner_code'
          )
          || ''
        ),

      end_date:
        String(
          formData.get(
            'end_date'
          )
          || ''
        ),

      text_color:
        String(
          formData.get(
            'text_color'
          )
          || '#29485a'
        ),

      title:
        String(
          formData.get(
            'title'
          )
          || ''
        ),

      all_day:
        eventAllDayInput.checked,

      start_time:
        eventAllDayInput.checked
          ? ''
          : String(
              formData.get(
                'start_time'
              )
              || ''
            ),

      end_time:
        eventAllDayInput.checked
          ? ''
          : String(
              formData.get(
                'end_time'
              )
              || ''
            ),

      category:
        String(
          formData.get(
            'category'
          )
          || ''
        ),

      memo:
        String(
          formData.get(
            'memo'
          )
          || ''
        ),

      repeat_type:
        repeatType,

      repeat_interval:
        repeatType === 'none'
          ? 1
          : Number(
              formData.get(
                'repeat_interval'
              )
              || 1
            ),

      repeat_weekdays:
        repeatType === 'weekly'
          ? formData
              .getAll(
                'repeat_weekdays'
              )
              .map(Number)
          : null,

      repeat_day_of_month:
        repeatDayOfMonth,

      repeat_week_of_month:
        repeatType ===
        'monthly_weekday'
          ? Number(
              formData.get(
                'repeat_week_of_month'
              )
              || 1
            )
          : null,

      repeat_weekday:
        repeatType ===
        'monthly_weekday'
          ? Number(
              formData.get(
                'repeat_weekday'
              )
              || 0
            )
          : null,

      repeat_month:
        repeatType === 'yearly'
          ? Number(
              formData.get(
                'repeat_month'
              )
              || 0
            )
          : null,

      repeat_end_type:
        repeatEndType,

      repeat_end_date:
        repeatEndType === 'date'
          ? String(
              formData.get(
                'repeat_end_date'
              )
              || ''
            )
          : null,

      repeat_count:
        repeatEndType === 'count'
          ? Number(
              formData.get(
                'repeat_count'
              )
              || 0
            )
          : null,
    };


    const eventId =
      Number(
        formData.get(
          'event_id'
        )
        || 0
      );


    const isEdit =
      eventId > 0;


    if (isEdit) {
      payload.id =
        eventId;
    }


    eventMessage.textContent =
      isEdit
        ? '更新しています…'
        : '保存しています…';


    try {

      const response =
        await fetch(
          CALENDAR_EVENTS_API_URL,
          {
            method:
              isEdit
                ? 'PATCH'
                : 'POST',

            credentials:
              'same-origin',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );


      const data =
        await response.json();


      if (
        !response.ok
        || data.success !== true
      ) {
        throw new Error(
          data.error
          || '予定を保存できませんでした。'
        );
      }


      closeEventModal();

      await loadMonthShifts();


    } catch (error) {

      console.error(
        error
      );

      eventMessage.textContent =
        error.message
        || '予定を保存できませんでした。';
    }
  }
);


function renderSingleMonthCalendar(
  currentMonth,
  targetElement
) {
  const year =
    currentMonth.getFullYear();

  const month =
    currentMonth.getMonth();


  const weekdayNames = [
    '日',
    '月',
    '火',
    '水',
    '木',
    '金',
    '土',
  ];


  const weekdayRow =
    document.createElement('div');

  weekdayRow.className =
    'calendar-weekdays';


  weekdayNames.forEach(
    (weekdayName) => {

      const weekdayElement =
        document.createElement('div');

      weekdayElement.className =
        'calendar-weekday';

      weekdayElement.textContent =
        weekdayName;

      weekdayRow.appendChild(
        weekdayElement
      );
    }
  );


  targetElement.appendChild(
    weekdayRow
  );


  const gridElement =
    document.createElement('div');

  gridElement.className =
    'calendar-grid';


  const firstDate =
    new Date(
      year,
      month,
      1
    );

  const firstWeekday =
    firstDate.getDay();


  const gridStartDate =
    new Date(
      year,
      month,
      1 - firstWeekday
    );


  const lastDate =
    new Date(
      year,
      month + 1,
      0
    );

  const visibleCellCount =
    Math.ceil(
      (
        firstWeekday
        + lastDate.getDate()
      )
      / 7
    ) * 7;

  const weekCount =
    visibleCellCount / 7;

  gridElement.style.setProperty(
    '--calendar-week-count',
    String(
      weekCount
    )
  );


  const shiftsByDate =
    groupShiftsByDate(
      calendarState.shifts
    );


  const eventsByDate =
    groupEventsByDate(
      calendarState.events
    );


  const todayKey =
    formatDateKey(
      new Date()
    );


  for (
    let index = 0;
    index < visibleCellCount;
    index += 1
  ) {

    const date =
      new Date(
        gridStartDate.getFullYear(),
        gridStartDate.getMonth(),
        gridStartDate.getDate()
          + index
      );

    const dateKey =
      formatDateKey(date);


    const dayElement =
      document.createElement('article');

    dayElement.className =
      'calendar-day';

    dayElement.dataset.dateKey =
      dateKey;


    if (
      date.getMonth()
      !== month
    ) {
      dayElement.classList.add(
        'is-outside-month'
      );

      gridElement.appendChild(
        dayElement
      );

      continue;
    }


    if (
      dateKey === todayKey
    ) {
      dayElement.classList.add(
        'is-today'
      );
    }


    const weekday =
      date.getDay();

    const holidayName =
      calendarState.holidays[
        dateKey
      ]
      || '';


    if (weekday === 0) {
      dayElement.classList.add(
        'is-sunday'
      );
    }


    if (weekday === 6) {
      dayElement.classList.add(
        'is-saturday'
      );
    }


    if (holidayName !== '') {
      dayElement.classList.add(
        'is-holiday'
      );
    }


    const dateElement =
      document.createElement('div');

    dateElement.className =
      'calendar-date';


    const dateNumberElement =
      document.createElement('span');

    dateNumberElement.className =
      'calendar-date-number';

    dateNumberElement.textContent =
      String(
        date.getDate()
      );


    dateElement.appendChild(
      dateNumberElement
    );


    if (holidayName !== '') {

      const holidayElement =
        document.createElement('span');

      holidayElement.className =
        'calendar-holiday-name';

      holidayElement.textContent =
        holidayName;


      dateElement.appendChild(
        holidayElement
      );
    }


    const dayTopElement =
      document.createElement('div');

    dayTopElement.className =
      'calendar-day-top';


    dayTopElement.appendChild(
      dateElement
    );


    const dayShifts =
      shiftsByDate.get(
        dateKey
      )
      || [];


    const dayEvents =
      eventsByDate.get(
        dateKey
      )
      || [];


    const sharedEvents =
      dayEvents.filter(
        (event) =>
          event.owner_code
          === 'shared'
      );


    const sharedZoneElement =
      document.createElement('div');

    sharedZoneElement.className =
      'calendar-zone calendar-zone-shared';

    sharedZoneElement.dataset.ownerCode =
      'shared';


    sharedZoneElement.addEventListener(
      'click',
      () => {

        openEventModal(
          dateKey,
          'shared'
        );
      }
    );


    sharedEvents.forEach(
      (event) => {

        const eventElement =
          createCalendarEventElement(
            event,
            dateKey
          );

        eventElement.classList.add(
          'is-shared'
        );


        sharedZoneElement.appendChild(
          eventElement
        );
      }
    );


    dayTopElement.appendChild(
      sharedZoneElement
    );


    dayElement.appendChild(
      dayTopElement
    );


    const previousDate =
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() - 1
      );

    const nextDate =
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + 1
      );


    const previousShifts =
      shiftsByDate.get(
        formatDateKey(
          previousDate
        )
      )
      || [];

    const nextShifts =
      shiftsByDate.get(
        formatDateKey(
          nextDate
        )
      )
      || [];


    const lanesElement =
      document.createElement('div');

    lanesElement.className =
      'calendar-day-lanes';


    [
      'ui',
      'shii',
    ].forEach(
      (workerCode) => {

        const laneElement =
          document.createElement('div');

        laneElement.className =
          'calendar-day-lane calendar-zone';

        laneElement.classList.add(
          workerCode === 'ui'
            ? 'calendar-zone-ui'
            : 'calendar-zone-shii'
        );

        laneElement.dataset.workerCode =
          workerCode;


        laneElement.addEventListener(
          'click',
          () => {

            openEventModal(
              dateKey,
              workerCode
            );
          }
        );


        const currentShift =
          findWorkerShift(
            dayShifts,
            workerCode
          );


        const shiftElement =
          currentShift
            ? createShiftElement(
                currentShift
              )
            : createEmptyShiftElement(
                workerCode
              );


        const previousShift =
          findWorkerShift(
            previousShifts,
            workerCode
          );

        const nextShift =
          findWorkerShift(
            nextShifts,
            workerCode
          );


        if (
          workLinesContinue(
            currentShift,
            previousShift,
            workerCode
          )
        ) {
          shiftElement.classList.add(
            'is-connected-left'
          );
        }


        if (
          workLinesContinue(
            currentShift,
            nextShift,
            workerCode
          )
        ) {
          shiftElement.classList.add(
            'is-connected-right'
          );
        }


        const workLineElement =
          document.createElement('div');

        workLineElement.className =
          'calendar-work-line';


        workLineElement.appendChild(
          shiftElement
        );


        laneElement.appendChild(
          workLineElement
        );


        const eventsElement =
          document.createElement('div');

        eventsElement.className =
          'calendar-person-events';


        const workerEvents =
          dayEvents.filter(
            (event) =>
              event.owner_code
              === workerCode
          );


        workerEvents.forEach(
          (event) => {

            const eventElement =
              createCalendarEventElement(
                event,
                dateKey
              );


            eventsElement.appendChild(
              eventElement
            );
          }
        );


        laneElement.appendChild(
          eventsElement
        );


        lanesElement.appendChild(
          laneElement
        );
      }
    );


    dayElement.appendChild(
      lanesElement
    );


    gridElement.appendChild(
      dayElement
    );
  }


  targetElement.appendChild(
    gridElement
  );


  window.requestAnimationFrame(
    () => {
      renderMultiDayEventOverlays(
        gridElement,
        gridStartDate,
        calendarState.events
      );
    }
  );
}


function renderMonthCalendar() {
  const centerMonth =
    calendarState.currentMonth;


  monthTitleElement.textContent =
    `${centerMonth.getFullYear()}年 ${centerMonth.getMonth() + 1}月`;


  monthCalendarElement.replaceChildren();

  monthCalendarElement.classList.add(
    'is-scroll-range'
  );


  for (
    let monthOffset = -6;
    monthOffset <= 6;
    monthOffset += 1
  ) {
    const monthDate =
      new Date(
        centerMonth.getFullYear(),
        centerMonth.getMonth()
          + monthOffset,
        1
      );


    const monthSection =
      document.createElement(
        'section'
      );

    monthSection.className =
      'calendar-month-section';

    monthSection.dataset.calendarMonth =
      formatMonthKey(
        monthDate
      );


    const monthHeading =
      document.createElement(
        'h3'
      );

    monthHeading.className =
      'calendar-scroll-month-title';

    monthHeading.textContent =
      `${monthDate.getFullYear()}年 ${monthDate.getMonth() + 1}月`;


    monthSection.appendChild(
      monthHeading
    );


    renderSingleMonthCalendar(
      monthDate,
      monthSection
    );


    monthCalendarElement.appendChild(
      monthSection
    );
  }
}


function createMultiDayOverlayElement(
  event
) {
  const overlayElement =
    document.createElement(
      'button'
    );

  overlayElement.type =
    'button';

  overlayElement.className =
    'calendar-multi-day-overlay';


  const ownerCode =
    String(
      event.owner_code
      || ''
    );

  overlayElement.dataset.ownerCode =
    ownerCode;


  const textColor =
    String(
      event.text_color
      || ''
    );

  if (
    /^#[0-9A-Fa-f]{6}$/.test(
      textColor
    )
  ) {
    overlayElement.style.color =
      textColor;
  }


  const titleElement =
    document.createElement(
      'span'
    );

  titleElement.className =
    'calendar-multi-day-title';

  titleElement.textContent =
    String(
      event.title
      || ''
    );


  overlayElement.appendChild(
    titleElement
  );


  overlayElement.addEventListener(
    'click',
    (clickEvent) => {

      clickEvent.stopPropagation();


      const range =
        getCalendarEventDateRange(
          event
        );


      if (range === null) {
        return;
      }


      openEventModal(
        range.startDateKey,
        ownerCode,
        event
      );
    }
  );


  return overlayElement;
}


function renderMultiDayEventOverlays(
  gridElement,
  gridStartDate,
  events
) {
  gridElement
    .querySelectorAll(
      '.calendar-multi-day-overlay'
    )
    .forEach(
      (element) => {
        element.remove();
      }
    );


  const lastDayElement =
    gridElement.querySelector(
      '.calendar-day:last-child'
    );

  const lastDateKey =
    lastDayElement
      ? lastDayElement.dataset.dateKey
      : '';

  const gridEndDate =
    lastDateKey
      ? parseDateKey(
          lastDateKey
        )
      : gridStartDate;


  events
    .filter(
      (event) =>
        isMultiDayCalendarEvent(
          event
        )
    )
    .forEach(
      (event) => {

        const range =
          getCalendarEventDateRange(
            event
          );


        if (range === null) {
          return;
        }


        let segmentStart =
          new Date(
            Math.max(
              range.startDate.getTime(),
              gridStartDate.getTime()
            )
          );

        const visibleEnd =
          new Date(
            Math.min(
              range.endDate.getTime(),
              gridEndDate.getTime()
            )
          );


        while (
          segmentStart <= visibleEnd
        ) {
          const weekEnd =
            new Date(
              segmentStart.getFullYear(),
              segmentStart.getMonth(),
              segmentStart.getDate()
                + (
                  6
                  - segmentStart.getDay()
                )
            );


          const segmentEnd =
            new Date(
              Math.min(
                weekEnd.getTime(),
                visibleEnd.getTime()
              )
            );


          const startKey =
            formatDateKey(
              segmentStart
            );

          const endKey =
            formatDateKey(
              segmentEnd
            );


          const startDayElement =
            gridElement.querySelector(
              `[data-date-key="${startKey}"]`
            );

          const endDayElement =
            gridElement.querySelector(
              `[data-date-key="${endKey}"]`
            );


          if (
            startDayElement
            &&
            endDayElement
          ) {
            const ownerCode =
              String(
                event.owner_code
                || ''
              );


            const zoneSelector =
              ownerCode === 'shared'
                ? '.calendar-zone-shared'
                : ownerCode === 'ui'
                  ? '.calendar-person-events'
                  : '.calendar-person-events';


            let targetZone =
              null;


            if (ownerCode === 'shared') {
              targetZone =
                startDayElement.querySelector(
                  zoneSelector
                );

            } else {
              const laneSelector =
                ownerCode === 'ui'
                  ? '.calendar-zone-ui'
                  : '.calendar-zone-shii';

              targetZone =
                startDayElement
                  .querySelector(
                    laneSelector
                  )
                  ?.querySelector(
                    zoneSelector
                  );
            }


            if (targetZone) {
              const gridRect =
                gridElement
                  .getBoundingClientRect();

              const startDayRect =
                startDayElement
                  .getBoundingClientRect();

              const endDayRect =
                endDayElement
                  .getBoundingClientRect();

              const zoneRect =
                targetZone
                  .getBoundingClientRect();


              const overlayElement =
                createMultiDayOverlayElement(
                  event
                );


              overlayElement.style.left =
                `${
                  startDayRect.left
                  - gridRect.left
                }px`;

              overlayElement.style.width =
                `${
                  endDayRect.right
                  - startDayRect.left
                }px`;

              overlayElement.style.top =
                `${
                  zoneRect.top
                  - gridRect.top
                  + 1
                }px`;


              gridElement.appendChild(
                overlayElement
              );
            }
          }


          segmentStart =
            new Date(
              segmentEnd.getFullYear(),
              segmentEnd.getMonth(),
              segmentEnd.getDate() + 1
            );
        }
      }
    );
}


function setRepeatDefaultsForDate(
  dateKey
) {
  const baseDate =
    parseDateKey(
      dateKey
    );


  repeatTypeSelect.value =
    'none';

  repeatIntervalInput.value =
    '1';


  repeatWeekdayInputs.forEach(
    (input) => {
      input.checked =
        Number(input.value)
        === baseDate.getDay();
    }
  );


  repeatDayOfMonthInput.value =
    String(
      baseDate.getDate()
    );


  repeatWeekOfMonthSelect.value =
    String(
      Math.ceil(
        baseDate.getDate()
        / 7
      )
    );

  repeatWeekdaySelect.value =
    String(
      baseDate.getDay()
    );


  repeatMonthInput.value =
    String(
      baseDate.getMonth() + 1
    );

  repeatYearlyDayInput.value =
    String(
      baseDate.getDate()
    );


  repeatEndTypeSelect.value =
    'none';

  repeatEndDateInput.value =
    '';

  repeatEndDateInput.min =
    dateKey;

  repeatCountInput.value =
    '';


  syncRepeatFields();
}


function restoreRepeatFieldsFromEvent(
  calendarEvent
) {
  const repeatType =
    String(
      calendarEvent.repeat_type
      || 'none'
    );


  repeatTypeSelect.value =
    repeatType;

  repeatIntervalInput.value =
    String(
      Math.max(
        1,
        Number(
          calendarEvent.repeat_interval
          || 1
        )
      )
    );


  if (repeatType === 'weekly') {
    const savedWeekdays =
      String(
        calendarEvent.repeat_weekdays
        || ''
      )
        .split(',')
        .map(Number)
        .filter(
          (weekday) =>
            weekday >= 0
            && weekday <= 6
        );


    repeatWeekdayInputs.forEach(
      (input) => {
        input.checked =
          savedWeekdays.includes(
            Number(input.value)
          );
      }
    );
  }


  if (repeatType === 'monthly_day') {
    const repeatDay =
      Number(
        calendarEvent.repeat_day_of_month
        || 0
      );


    if (repeatDay > 0) {
      repeatDayOfMonthInput.value =
        String(
          repeatDay
        );
    }
  }


  if (
    repeatType
    === 'monthly_weekday'
  ) {
    repeatWeekOfMonthSelect.value =
      String(
        calendarEvent.repeat_week_of_month
        || 1
      );

    repeatWeekdaySelect.value =
      String(
        calendarEvent.repeat_weekday
        ?? 0
      );
  }


  if (repeatType === 'yearly') {
    const repeatMonth =
      Number(
        calendarEvent.repeat_month
        || 0
      );

    const repeatDay =
      Number(
        calendarEvent.repeat_day_of_month
        || 0
      );


    if (repeatMonth > 0) {
      repeatMonthInput.value =
        String(
          repeatMonth
        );
    }


    if (repeatDay > 0) {
      repeatYearlyDayInput.value =
        String(
          repeatDay
        );
    }
  }


  repeatEndTypeSelect.value =
    String(
      calendarEvent.repeat_end_type
      || 'none'
    );

  repeatEndDateInput.value =
    String(
      calendarEvent.repeat_end_date
      || ''
    );

  repeatCountInput.value =
    calendarEvent.repeat_count
      ? String(
          calendarEvent.repeat_count
        )
      : '';


  syncRepeatFields();
}


function openEventModal(
  dateKey,
  ownerCode,
  calendarEvent = null
) {
  const isRecurringOccurrence =
    calendarEvent !== null
    &&
    calendarEvent
      .is_recurring_occurrence
      === true;


  if (isRecurringOccurrence) {
    const masterStartAt =
      String(
        calendarEvent
          .recurring_master_start_at
        || calendarEvent.start_at
        || ''
      );

    const masterEndAt =
      calendarEvent
        .recurring_master_end_at
      ?? calendarEvent.end_at
      ?? null;


    const masterDateMatch =
      masterStartAt.match(
        /^(\d{4}-\d{2}-\d{2})/
      );


    calendarEvent = {
      ...calendarEvent,

      start_at:
        masterStartAt,

      end_at:
        masterEndAt,
    };


    if (masterDateMatch) {
      dateKey =
        masterDateMatch[1];
    }
  }


  eventForm.reset();

  renderColorPalette();

  setRepeatDefaultsForDate(
    dateKey
  );


  const isEdit =
    calendarEvent !== null;


  eventIdInput.value =
    isEdit
      ? String(
          calendarEvent.id
          || ''
        )
      : '';


  eventDateInput.value =
    dateKey;

  eventEndDateInput.value =
    dateKey;

  eventTextColorInput.value =
    '#29485a';


  eventDateLabel.textContent =
    dateKey.replace(
      /^(\d{4})-(\d{2})-(\d{2})$/,
      '$1年 $2月 $3日'
    );


  eventDialogTitle.textContent =
    isEdit
      ? '予定を編集'
      : '予定を追加';


  eventDeleteButton.hidden =
    !isEdit;


  eventOwnerSelect.value =
    isEdit
      ? String(
          calendarEvent.owner_code
          || ownerCode
        )
      : ownerCode;


  const titleInput =
    eventForm.querySelector(
      '[name="title"]'
    );

  const categoryInput =
    eventForm.querySelector(
      '[name="category"]'
    );

  const memoInput =
    eventForm.querySelector(
      '[name="memo"]'
    );


  if (isEdit) {

    titleInput.value =
      String(
        calendarEvent.title
        || ''
      );


    categoryInput.value =
      String(
        calendarEvent.category
        || ''
      );


    memoInput.value =
      String(
        calendarEvent.memo
        || ''
      );


    restoreRepeatFieldsFromEvent(
      calendarEvent
    );


    const allDay =
      Number(
        calendarEvent.all_day
        || 0
      ) === 1;


    eventAllDayInput.checked =
      allDay;


    eventStartTimeInput.disabled =
      allDay;

    eventEndTimeInput.disabled =
      allDay;


    const startMatch =
      String(
        calendarEvent.start_at
        || ''
      ).match(
        /\s(\d{2}):(\d{2})/
      );


    const endMatch =
      String(
        calendarEvent.end_at
        || ''
      ).match(
        /\s(\d{2}):(\d{2})/
      );


    const endDateMatch =
      String(
        calendarEvent.end_at
        || ''
      ).match(
        /^(\d{4}-\d{2}-\d{2})/
      );


    eventEndDateInput.value =
      endDateMatch
        ? endDateMatch[1]
        : dateKey;


    eventTextColorInput.value =
      calendarEvent.text_color
        || '#29485a';


    if (
      !allDay
      && startMatch
      && startMatch[1] !== '00'
    ) {
      eventStartTimeInput.value =
        `${startMatch[1]}:${startMatch[2]}`;
    }


    if (
      !allDay
      && endMatch
    ) {
      eventEndTimeInput.value =
        `${endMatch[1]}:${endMatch[2]}`;
    }

  } else {

    eventStartTimeInput.disabled =
      false;

    eventEndTimeInput.disabled =
      false;
  }


  eventMessage.textContent =
    '';


  eventModal.hidden =
    false;


  document.body.style.overflow =
    'hidden';


  window.setTimeout(
    () => {
      titleInput?.focus();
    },
    0
  );
}


async function loadHolidayData() {
  try {

    const response =
      await fetch(
        HOLIDAYS_API_URL
      );


    if (!response.ok) {
      throw new Error(
        '祝日データを取得できませんでした。'
      );
    }


    const data =
      await response.json();


    if (
      !data
      || typeof data !== 'object'
      || Array.isArray(data)
    ) {
      throw new Error(
        '祝日データの形式が不正です。'
      );
    }


    calendarState.holidays =
      data;

  } catch (error) {

    console.warn(
      '祝日表示をスキップします。',
      error
    );


    calendarState.holidays =
      {};
  }
}


async function loadMonthShifts() {
  const centerMonth =
    calendarState.currentMonth;


  const firstVisibleMonth =
    new Date(
      centerMonth.getFullYear(),
      centerMonth.getMonth() - 6,
      1
    );

  const lastVisibleMonth =
    new Date(
      centerMonth.getFullYear(),
      centerMonth.getMonth() + 6,
      1
    );


  const gridStartDate =
    new Date(
      firstVisibleMonth.getFullYear(),
      firstVisibleMonth.getMonth(),
      1 - firstVisibleMonth.getDay()
    );


  const lastGridStartDate =
    new Date(
      lastVisibleMonth.getFullYear(),
      lastVisibleMonth.getMonth(),
      1 - lastVisibleMonth.getDay()
    );

  const gridEndDate =
    new Date(
      lastGridStartDate.getFullYear(),
      lastGridStartDate.getMonth(),
      lastGridStartDate.getDate() + 41
    );


  monthCalendarElement.textContent =
    'カレンダーを読み込んでいます…';


  const query =
    new URLSearchParams({
      date_from:
        formatDateKey(
          gridStartDate
        ),
      date_to:
        formatDateKey(
          gridEndDate
        ),
    });


  try {

    const [
      shiftsResponse,
      eventsResponse,
    ] =
      await Promise.all([
        fetch(
          `${SHIFTS_API_URL}?${query.toString()}`,
          {
            credentials:
              'same-origin',
          }
        ),

        fetch(
          `${CALENDAR_EVENTS_API_URL}?${query.toString()}`,
          {
            credentials:
              'same-origin',
          }
        ),
      ]);


    const [
      shiftsData,
      eventsData,
    ] =
      await Promise.all([
        shiftsResponse.json(),
        eventsResponse.json(),
      ]);


    if (
      !shiftsResponse.ok
      || shiftsData.success !== true
      || !Array.isArray(
        shiftsData.shifts
      )
    ) {
      throw new Error(
        shiftsData.error
        || 'シフトを読み込めませんでした。'
      );
    }


    if (
      !eventsResponse.ok
      || eventsData.success !== true
      || !Array.isArray(
        eventsData.events
      )
    ) {
      throw new Error(
        eventsData.error
        || '予定を読み込めませんでした。'
      );
    }


    calendarState.shifts =
      shiftsData.shifts.filter(
        (shift) =>
          shift.status === 'confirmed'
          || shift.status === 'off'
      );


    calendarState.events =
      expandRecurringCalendarEvents(
        eventsData.events,
        gridStartDate,
        gridEndDate
      );


    renderMonthCalendar();

  } catch (error) {

    console.error(
      error
    );


    monthCalendarElement.textContent =
      'カレンダーを読み込めませんでした。';
  }
}


async function moveMonth(offset) {
  calendarState.currentMonth =
    new Date(
      calendarState.currentMonth
        .getFullYear(),
      calendarState.currentMonth
        .getMonth()
        + offset,
      1
    );


  await loadMonthShifts();

  scrollToCurrentMonth();
}


todayButton.addEventListener(
  'click',
  async () => {

    const today =
      new Date();


    calendarState.currentMonth =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );


    await loadMonthShifts();

    scrollToCurrentMonth();
  }
);


moveButtons.forEach(
  (button) => {

    button.addEventListener(
      'click',
      () => {

        const offset =
          Number(
            button.dataset
              .calendarMove
          );


        if (
          !Number.isFinite(
            offset
          )
        ) {
          return;
        }


        moveMonth(
          offset
        );
      }
    );
  }
);


loadHolidayData()
  .finally(
    () => {
      loadMonthShifts()
        .then(
          () => {
            scrollToCurrentMonth(
              'auto'
            );
          }
        );
    }
  );

if (
  colorPaletteAddButton
  &&
  eventTextColorInput
) {
  colorPaletteAddButton.addEventListener(
    'click',
    async () => {

      const color =
        String(
          eventTextColorInput.value
          || ''
        ).toLowerCase();


      if (
        !/^#[0-9a-f]{6}$/.test(
          color
        )
      ) {
        return;
      }


      colorPaletteAddButton.disabled =
        true;


      try {

        const response =
          await fetch(
            CALENDAR_COLOR_PALETTE_API_URL,
            {
              method:
                'POST',

              credentials:
                'same-origin',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  color,
                }),
            }
          );


        const data =
          await response.json();


        if (
          !response.ok
          ||
          data.success !== true
        ) {
          throw new Error(
            data.error
            || '文字色を登録できませんでした。'
          );
        }


        await renderColorPalette();

      } catch (error) {

        console.error(
          'Failed to save color palette.',
          error
        );

        if (eventMessage) {
          eventMessage.textContent =
            error.message
            || '文字色を登録できませんでした。';
        }

      } finally {

        colorPaletteAddButton.disabled =
          false;
      }
    }
  );
}
