'use strict';


const SHIFTS_API_URL =
  '/api/v1/shifts.php';

const CALENDAR_EVENTS_API_URL =
  '/api/v1/calendar-events.php';

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

const eventMessage =
  document.querySelector(
    '[data-event-message]'
  );

const eventModalCloseButtons =
  document.querySelectorAll(
    '[data-event-modal-close]'
  );


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


function groupEventsByDate(events) {
  const grouped =
    new Map();


  events.forEach(
    (event) => {

      const startAt =
        String(
          event.start_at
          || ''
        );

      const match =
        startAt.match(
          /^(\d{4}-\d{2}-\d{2})/
        );


      if (!match) {
        return;
      }


      const dateKey =
        match[1];


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


function shiftsContinue(
  currentShift,
  adjacentShift
) {
  if (
    !currentShift
    || !adjacentShift
  ) {
    return false;
  }

  return (
    getShiftContinuationKey(
      currentShift
    )
    ===
    getShiftContinuationKey(
      adjacentShift
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
    '未入力';


  shiftElement.appendChild(
    detailElement
  );


  return shiftElement;
}


function createCalendarEventElement(
  event
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


  const startAt =
    String(
      event.start_at
      || ''
    );

  const allDay =
    Number(
      event.all_day
      || 0
    ) === 1;


  let timeLabel =
    '';


  if (!allDay) {

    const match =
      startAt.match(
        /\s(\d{2}):(\d{2})/
      );


    if (
      match
      && match[1] !== '00'
    ) {
      timeLabel =
        `${match[1]}:${match[2]}`;
    }
  }


  if (timeLabel !== '') {

    const timeElement =
      document.createElement('span');

    timeElement.className =
      'calendar-event-time';

    timeElement.textContent =
      timeLabel;


    eventElement.appendChild(
      timeElement
    );
  }


  const titleElement =
    document.createElement('span');

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


  eventElement.addEventListener(
    'click',
    (clickEvent) => {

      clickEvent.stopPropagation();


      const startAt =
        String(
          event.start_at
          || ''
        );

      const dateMatch =
        startAt.match(
          /^(\d{4}-\d{2}-\d{2})/
        );


      if (!dateMatch) {
        return;
      }


      openEventModal(
        dateMatch[1],
        ownerCode,
        event
      );
    }
  );


  return eventElement;
}


function openEventModal(
  dateKey,
  ownerCode,
  calendarEvent = null
) {
  eventForm.reset();


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


    const confirmed =
      window.confirm(
        `「${title}」を削除しますか？`
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


function renderMonthCalendar() {
  const currentMonth =
    calendarState.currentMonth;

  const year =
    currentMonth.getFullYear();

  const month =
    currentMonth.getMonth();


  monthTitleElement.textContent =
    `${year}年 ${month + 1}月`;


  monthCalendarElement.replaceChildren();


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


  monthCalendarElement.appendChild(
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
    index < 42;
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


    if (
      date.getMonth()
      !== month
    ) {
      dayElement.classList.add(
        'is-outside-month'
      );
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


    dayElement.appendChild(
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
            event
          );

        eventElement.classList.add(
          'is-shared'
        );


        sharedZoneElement.appendChild(
          eventElement
        );
      }
    );


    dayElement.appendChild(
      sharedZoneElement
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


        if (currentShift) {

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
            shiftsContinue(
              currentShift,
              previousShift
            )
          ) {
            shiftElement.classList.add(
              'is-connected-left'
            );
          }


          if (
            shiftsContinue(
              currentShift,
              nextShift
            )
          ) {
            shiftElement.classList.add(
              'is-connected-right'
            );
          }
        }


        laneElement.appendChild(
          shiftElement
        );


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
                event
              );


            laneElement.appendChild(
              eventElement
            );
          }
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


  monthCalendarElement.appendChild(
    gridElement
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
  const {
    firstDate,
    lastDate,
  } =
    getMonthRange(
      calendarState.currentMonth
    );


  monthCalendarElement.textContent =
    'カレンダーを読み込んでいます…';


  const query =
    new URLSearchParams({
      date_from:
        formatDateKey(
          firstDate
        ),
      date_to:
        formatDateKey(
          lastDate
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
      eventsData.events;


    renderMonthCalendar();

  } catch (error) {

    console.error(
      error
    );


    monthCalendarElement.textContent =
      'カレンダーを読み込めませんでした。';
  }
}


function moveMonth(offset) {
  calendarState.currentMonth =
    new Date(
      calendarState.currentMonth
        .getFullYear(),
      calendarState.currentMonth
        .getMonth()
        + offset,
      1
    );


  loadMonthShifts();
}


todayButton.addEventListener(
  'click',
  () => {

    const today =
      new Date();


    calendarState.currentMonth =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );


    loadMonthShifts();
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
      loadMonthShifts();
    }
  );