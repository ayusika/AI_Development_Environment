'use strict';


const SHIFTS_API_URL =
  '/api/v1/shifts.php';


const calendarState = {
  currentMonth:
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    ),
  shifts: [],
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


    const dateElement =
      document.createElement('div');

    dateElement.className =
      'calendar-date';

    dateElement.textContent =
      String(
        date.getDate()
      );


    dayElement.appendChild(
      dateElement
    );


    const dayShifts =
      shiftsByDate.get(
        dateKey
      )
      || [];


    dayShifts.forEach(
      (shift) => {

        dayElement.appendChild(
          createShiftElement(
            shift
          )
        );
      }
    );


    gridElement.appendChild(
      dayElement
    );
  }


  monthCalendarElement.appendChild(
    gridElement
  );
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

    const response =
      await fetch(
        `${SHIFTS_API_URL}?${query.toString()}`,
        {
          credentials:
            'same-origin',
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
      || data.success !== true
      || !Array.isArray(
        data.shifts
      )
    ) {
      throw new Error(
        data.error
        || 'シフトを読み込めませんでした。'
      );
    }


    calendarState.shifts =
      data.shifts.filter(
        (shift) =>
          shift.status === 'confirmed'
          || shift.status === 'off'
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


loadMonthShifts();