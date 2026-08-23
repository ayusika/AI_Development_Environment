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


function formatShiftTime(value) {
  if (!value) {
    return '';
  }

  const match =
    String(value).match(
      /(\d{2}:\d{2})/
    );

  return match
    ? match[1]
    : String(value);
}


function createShiftElement(shift) {
  const shiftElement =
    document.createElement('div');

  shiftElement.className =
    'calendar-shift';

  if (shift.worker_code) {
    shiftElement.dataset.workerCode =
      String(
        shift.worker_code
      );
  }


  const workerElement =
    document.createElement('strong');

  workerElement.className =
    'calendar-shift-worker';

  workerElement.textContent =
    shift.display_name
    || '名前未設定';


  const detailElement =
    document.createElement('span');

  detailElement.className =
    'calendar-shift-detail';


  const startTime =
    formatShiftTime(
      shift.start_at
    );

  const endTime =
    formatShiftTime(
      shift.end_at
    );


  if (
    startTime === ''
    && endTime === ''
  ) {
    detailElement.textContent =
      '休み';
  } else {
    const timeText =
      `${startTime}〜${endTime}`;

    const storeText =
      shift.store_name
        ? ` ${shift.store_name}`
        : '';

    detailElement.textContent =
      timeText + storeText;
  }


  shiftElement.append(
    workerElement,
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
          shift.status
          === 'confirmed'
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