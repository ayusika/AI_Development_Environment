

// WRITER:VIEW_REGISTRY:START

const views = {
  home: document.querySelector('[data-view="home"]'),
  diary: document.querySelector('[data-view="diary"]'),
  nukinaviCreate: document.querySelector('[data-view="nukinavi-create"]'),
  diaryEdit: document.querySelector('[data-view="diary-edit"]'),
  postPrep: document.querySelector('[data-view="post-prep"]'),
  schedule: document.querySelector('[data-view="schedule"]'),
  placeholder: document.querySelector('[data-view="placeholder"]'),
};

// WRITER:VIEW_REGISTRY:END

const navItems = document.querySelectorAll('.nav-item');

const diaryTitleInput = document.getElementById('diary-title');
const diaryBodyInput = document.getElementById('diary-body');

const postPreviewTitle = document.getElementById('post-preview-title');
const postPreviewBody = document.getElementById('post-preview-body');

const photoInput = document.getElementById('diary-photo');
const photoPreview = document.getElementById('photo-preview');
const photoPreviewImage = document.getElementById('photo-preview-image');

const placeholderTitle = document.getElementById('placeholder-title');

const draftCount = document.getElementById('draft-count');
const todayPostCount = document.getElementById('today-post-count');

let currentView = 'home';

const diaryState = {
  availability: '23時からラスト1枠',
  extraNote: '',
  selectedVisitIds: [],
  photoUrl: '',
  aiDraftTitle: '',
  aiDraftBody: '',
  finalTitle: '',
  finalBody: '',
  status: 'editing',
  posted: false,
};


/* ========================================
   VIEW CONTROL
======================================== */

function showView(viewName) {
  Object.values(views).forEach((view) => {
    if (!view) return;
    view.classList.remove('is-active');
  });

  const target = views[viewName];

  if (!target) {
    console.warn(`View not found: ${viewName}`);
    return;
  }

  target.classList.add('is-active');
  currentView = viewName;

  updateBottomNav(viewName);

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
}


function updateBottomNav(viewName) {
  navItems.forEach((item) => {
    item.classList.remove('is-active');
  });

  let activeNav = 'home';

  if (
    viewName === 'diary' ||
    viewName === 'nukinaviCreate' ||
    viewName === 'diaryEdit' ||
    viewName === 'postPrep'
  ) {
    activeNav = 'diary';
  }

  if (viewName === 'schedule') {
    activeNav = 'schedule';
  }

  const activeItem = document.querySelector(
    `.nav-item[data-nav="${activeNav}"]`
  );

  if (activeItem) {
    activeItem.classList.add('is-active');
  }
}


/* ========================================
   NAVIGATION
======================================== */

document.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-action]');
  const navButton = event.target.closest('[data-nav]');

  if (navButton) {
    handleNav(navButton.dataset.nav);
    return;
  }

  if (!actionButton) return;

  const action = actionButton.dataset.action;

  handleAction(action, actionButton);
});


// WRITER:MAIN_NAV_ROUTING:START

function handleNav(navName) {
  if (navName === 'home') {
    showView('home');
    return;
  }

  if (navName === 'diary') {
    showView('diary');
    return;
  }

  if (navName === 'schedule') {
    showView('schedule');
    loadSchedule();
    return;
  }

  const labels = {
    customers: '顧客',
    sales: '売上',
    koppy: 'Koppy',
  };

  showPlaceholder(labels[navName] || '準備中');
}

// WRITER:MAIN_NAV_ROUTING:END


function handleAction(action, button) {
  switch (action) {
    case 'new-diary':
    case 'start-diary':
      startNukinaviDiary();
      break;

    case 'go-home':
      showView('home');
      break;

    case 'go-diary':
      showView('diary');
      break;

    case 'generate-diary':
      generateDiary();
      break;

    case 'edit-customer-diary':
      openCustomerEditor(button);
      break;

    case 'add-dummy-diary':
      addDummyDiary(button);
      break;

    case 'remove-dummy-diary':
      removeDummyDiary(button);
      break;

    case 'close-customer-editor':
      closeCustomerEditor();
      break;

    case 'generate-customer-ideas':
      generateCustomerIdeas();
      break;

    case 'switch-customer-idea':
      switchCustomerIdea(button.dataset.idea);
      break;

    case 'adopt-customer-idea':
      adoptCustomerIdea(button);
      break;

    case 'back-to-create':
      showView('nukinaviCreate');
      break;

    case 'prepare-post':
      preparePost();
      break;

    case 'back-to-edit':
      showView('diaryEdit');
      break;

    case 'save-draft':
      saveDraft();
      break;

    case 'rewrite-diary':
      applyRewriteNote();
      break;

    case 'voice-input':
      demoVoiceInput();
      break;

    case 'create-nukinavi-mail':
      createNukinaviMail();
      break;

    case 'mark-posted':
      markPosted();
      break;

    case 'open-drafts':
      showPlaceholder('下書き');
      break;

    case 'open-history':
      showPlaceholder('過去ログ');
      break;

    case 'open-rules':
      showPlaceholder('写メ日記ルール');
      break;

    case 'shift-detail':
      showView('schedule');
      loadSchedule();
      break;

    case 'add-visit':
      showView('schedule');
      loadSchedule().then(() => {
        openScheduleForm();
      });
      break;

    case 'open-schedule-form':
      openScheduleForm();
      break;

    case 'close-schedule-form':
      closeScheduleForm();
      break;

    case 'save-schedule-visit':
      saveScheduleVisit();
      break;

    case 'close-schedule-detail':
      closeScheduleDetail();
      break;

    case 'open-schedule-history':
      openCurrentScheduleHistory();
      break;

    case 'edit-schedule-visit':
      editCurrentScheduleVisit();
      break;

    case 'delete-schedule-visit':
      deleteCurrentScheduleVisit();
      break;

    case 'search-customer':
      showPlaceholder('顧客を探す');
      break;

    case 'settings':
      showPlaceholder('設定');
      break;

    default:
      console.log('Unhandled action:', action, button);
  }
}


// WRITER:WORK_SCHEDULE_LOGIC:START

/* ========================================
   WORK SCHEDULE
======================================== */

const scheduleApiUrl =
  '/api/v1/schedule.php';

const scheduleCalendar =
  document.getElementById('schedule-calendar');

const scheduleDateInput =
  document.getElementById('schedule-date');

const schedulePeriodTitle =
  document.getElementById('schedule-period-title');

const scheduleVisitCount =
  document.getElementById('schedule-visit-count');

const scheduleFormCard =
  document.getElementById('schedule-form-card');

const scheduleFormTitle =
  document.getElementById('schedule-form-title');

const scheduleFormDate =
  document.getElementById('schedule-form-date');

const scheduleBookedDate =
  document.getElementById('schedule-booked-date');

const scheduleBookedTime =
  document.getElementById('schedule-booked-time');

const scheduleCustomerChange =
  document.getElementById('schedule-customer-change');

const scheduleEditId =
  document.getElementById('schedule-edit-id');

const scheduleStore =
  document.getElementById('schedule-store');

const scheduleStartTime =
  document.getElementById('schedule-start-time');

const scheduleCustomCourse =
  document.getElementById('schedule-custom-course');

const scheduleCustomOption =
  document.getElementById('schedule-custom-option');

const scheduleFormMessage =
  document.getElementById('schedule-form-message');

const scheduleSaveButton =
  document.getElementById('schedule-save-button');

const scheduleDetailDrawer =
  document.getElementById('schedule-detail-drawer');

const scheduleDrawerBackdrop =
  document.getElementById('schedule-drawer-backdrop');

const scheduleDetailTitle =
  document.getElementById('schedule-detail-title');

const scheduleDetailBody =
  document.getElementById('schedule-detail-body');

const scheduleHistoryPanel =
  document.getElementById('schedule-history-panel');

const scheduleDetailCustomerState =
  document.getElementById('schedule-detail-customer-state');

const scheduleDetailDiaryState =
  document.getElementById('schedule-detail-diary-state');

const scheduleDetailSalesState =
  document.getElementById('schedule-detail-sales-state');


const scheduleState = {
  view: 'two-weeks',
  anchorDate: null,
  visits: [],
  selectedVisit: null,
};


const scheduleStartHour = 11;
const scheduleEndHour = 27;

const scheduleZoom = {
  minHourHeight: 54,
  maxHourHeight: 150,
  step: 6,
};

let selectedScheduleCourse = 90;
let selectedCustomerStatus = 'repeat';


initializeSchedule();
initializeScheduleResize();


function initializeScheduleResize() {

  const shell =
    document.querySelector(
      '.schedule-calendar-shell'
    );

  const handle =
    document.querySelector(
      '[data-schedule-resize-handle]'
    );

  if (!shell || !handle) return;

  let startY = 0;
  let startHeight = 0;

  const stopResize =
    (event) => {

      handle.classList.remove(
        'is-dragging'
      );

      if (
        event.pointerId !== undefined
        && handle.hasPointerCapture(
          event.pointerId
        )
      ) {
        handle.releasePointerCapture(
          event.pointerId
        );
      }
    };


  handle.addEventListener(
    'pointerdown',
    (event) => {

      event.preventDefault();

      startY = event.clientY;
      startHeight =
        shell.getBoundingClientRect()
          .height;

      handle.classList.add(
        'is-dragging'
      );

      handle.setPointerCapture(
        event.pointerId
      );
    }
  );


  handle.addEventListener(
    'pointermove',
    (event) => {

      if (
        !handle.classList.contains(
          'is-dragging'
        )
      ) {
        return;
      }

      event.preventDefault();

      const deltaY =
        event.clientY - startY;

      const maxHeight =
        Math.max(
          420,
          window.innerHeight - 120
        );

      const nextHeight =
        Math.min(
          maxHeight,
          Math.max(
            360,
            startHeight + deltaY
          )
        );

      shell.style.height =
        `${nextHeight}px`;
    }
  );


  handle.addEventListener(
    'pointerup',
    stopResize
  );


  handle.addEventListener(
    'pointercancel',
    stopResize
  );
}


function setScheduleZoom(
  nextHeight
) {

  const page =
    document.querySelector(
      '.schedule-page'
    );

  if (!page) return;

  const clampedHeight =
    Math.min(
      scheduleZoom.maxHourHeight,
      Math.max(
        scheduleZoom.minHourHeight,
        nextHeight
      )
    );

  page.style.setProperty(
    '--schedule-hour-height',
    `${clampedHeight}px`
  );

  const period =
    getSchedulePeriod();

  renderScheduleCalendar(
    period
  );

  updateScheduleZoomLabel();
}


function updateScheduleZoomLabel() {

  const label =
    document.getElementById(
      'schedule-zoom-label'
    );

  if (!label) return;

  const currentHeight =
    getScheduleHourHeight();

  const percent =
    Math.round(
      currentHeight / 96 * 100
    );

  label.textContent =
    `${percent}%`;
}


function initializeSchedule() {

  if (!scheduleDateInput) return;

  const today =
    scheduleFormatDate(
      new Date()
    );

  scheduleState.anchorDate = today;
  scheduleDateInput.value = today;

  if (scheduleFormDate) {
    scheduleFormDate.value = today;
  }
}


/* ========================================
   SCHEDULE EVENTS
======================================== */

if (scheduleDateInput) {

  scheduleDateInput.addEventListener(
    'change',
    () => {

      if (!scheduleDateInput.value) return;

      scheduleState.anchorDate =
        scheduleDateInput.value;

      loadSchedule();
    }
  );
}


if (scheduleCustomCourse) {

  scheduleCustomCourse.addEventListener(
    'input',
    () => {

      const value =
        Number(
          scheduleCustomCourse.value
        );

      if (value <= 0) return;

      selectedScheduleCourse = value;

      document
        .querySelectorAll('[data-course]')
        .forEach((button) => {
          button.classList.remove(
            'is-selected'
          );
        });
    }
  );
}


document.addEventListener(
  'click',
  (event) => {

    const zoomButton =
      event.target.closest(
        '[data-schedule-zoom]'
      );

    if (zoomButton) {

      const action =
        zoomButton.dataset.scheduleZoom;

      const currentHeight =
        getScheduleHourHeight();

      if (action === 'in') {
        setScheduleZoom(
          currentHeight
          + scheduleZoom.step
        );
      }

      if (action === 'out') {
        setScheduleZoom(
          currentHeight
          - scheduleZoom.step
        );
      }

      if (action === 'reset') {
        setScheduleZoom(96);
      }

      return;
    }


    const viewButton =
      event.target.closest(
        '[data-schedule-view]'
      );

    if (viewButton) {

      scheduleState.view =
        viewButton.dataset.scheduleView;

      document
        .querySelectorAll(
          '[data-schedule-view]'
        )
        .forEach((button) => {
          button.classList.toggle(
            'is-selected',
            button === viewButton
          );
        });

      loadSchedule();
      return;
    }


    const moveButton =
      event.target.closest(
        '[data-schedule-move]'
      );

    if (moveButton) {

      const direction =
        Number(
          moveButton.dataset.scheduleMove
        );

      moveSchedulePeriod(direction);
      return;
    }


    const todayButton =
      event.target.closest(
        '[data-schedule-today]'
      );

    if (todayButton) {

      const today =
        scheduleFormatDate(
          new Date()
        );

      scheduleState.anchorDate = today;

      if (scheduleDateInput) {
        scheduleDateInput.value = today;
      }

      loadSchedule();
      return;
    }


    const slotButton =
      event.target.closest(
        '[data-schedule-slot]'
      );

    if (slotButton) {

      openScheduleForm(
        slotButton.dataset.date,
        slotButton.dataset.time
      );

      return;
    }


    const eventButton =
      event.target.closest(
        '[data-schedule-event]'
      );

    if (eventButton) {

      const visit =
        scheduleState.visits.find(
          (item) =>
            Number(item.id) ===
            Number(eventButton.dataset.scheduleEvent)
        );

      if (visit) {
        openScheduleDetail(visit);
      }

      return;
    }


    const courseButton =
      event.target.closest(
        '[data-course]'
      );

    if (courseButton) {

      selectedScheduleCourse =
        Number(
          courseButton.dataset.course
        );

      document
        .querySelectorAll('[data-course]')
        .forEach((button) => {
          button.classList.toggle(
            'is-selected',
            button === courseButton
          );
        });

      if (scheduleCustomCourse) {
        scheduleCustomCourse.value = '';
      }

      return;
    }


    const statusButton =
      event.target.closest(
        '[data-customer-status]'
      );

    if (statusButton) {

      selectedCustomerStatus =
        statusButton.dataset.customerStatus;

      document
        .querySelectorAll(
          '[data-customer-status]'
        )
        .forEach((button) => {
          button.classList.toggle(
            'is-selected',
            button === statusButton
          );
        });

      return;
    }


    const featureButton =
      event.target.closest(
        '[data-schedule-feature]'
      );

    if (featureButton) {

      const labels = {
        customer: '顧客情報',
        diary: 'お礼日記',
        sales: '売上入力',
      };

      showPlaceholder(
        labels[
          featureButton.dataset.scheduleFeature
        ] || '準備中'
      );
    }
  }
);


if (scheduleDrawerBackdrop) {

  scheduleDrawerBackdrop.addEventListener(
    'click',
    () => {
      closeScheduleDetail();
    }
  );
}


/* ========================================
   PERIOD
======================================== */

function getSchedulePeriod() {

  const anchor =
    scheduleParseDate(
      scheduleState.anchorDate
      || scheduleFormatDate(new Date())
    );

  let start =
    new Date(anchor);

  let days = 1;


  if (
    scheduleState.view === 'week'
    || scheduleState.view === 'two-weeks'
  ) {

    const day =
      start.getDay();

    const mondayOffset =
      day === 0
        ? -6
        : 1 - day;

    start.setDate(
      start.getDate() + mondayOffset
    );

    days =
      scheduleState.view === 'week'
        ? 7
        : 14;
  }


  const end =
    new Date(start);

  end.setDate(
    end.getDate() + days - 1
  );


  const dates = [];

  for (
    let index = 0;
    index < days;
    index += 1
  ) {

    const date =
      new Date(start);

    date.setDate(
      start.getDate() + index
    );

    dates.push(
      scheduleFormatDate(date)
    );
  }


  return {
    start:
      scheduleFormatDate(start),

    end:
      scheduleFormatDate(end),

    dates,
  };
}


function moveSchedulePeriod(
  direction
) {

  const current =
    scheduleParseDate(
      scheduleState.anchorDate
    );

  let amount = 1;

  if (scheduleState.view === 'week') {
    amount = 7;
  }

  if (
    scheduleState.view === 'two-weeks'
  ) {
    amount = 14;
  }

  current.setDate(
    current.getDate()
    + amount * direction
  );

  scheduleState.anchorDate =
    scheduleFormatDate(current);

  if (scheduleDateInput) {
    scheduleDateInput.value =
      scheduleState.anchorDate;
  }

  loadSchedule();
}


/* ========================================
   LOAD
======================================== */

async function loadSchedule(
  preserveScroll = false
) {

  if (!scheduleCalendar) {
    return;
  }


  if (!scheduleState.anchorDate) {

    scheduleState.anchorDate =
      scheduleFormatDate(
        new Date()
      );
  }


  const period =
    getSchedulePeriod();


  scheduleCalendar.innerHTML = `
    <div class="schedule-loading">
      予定を読み込み中…
    </div>
  `;


  updateSchedulePeriodTitle(
    period
  );


  try {

    const params =
      new URLSearchParams({
        date_from:
          period.start,

        date_to:
          period.end,
      });


    const response =
      await fetch(
        `${scheduleApiUrl}?${params.toString()}`
      );


    const data =
      await response.json();


    if (
      !response.ok
      || !data.success
    ) {
      throw new Error(
        data.error
        || '予定の取得に失敗しました。'
      );
    }


    scheduleState.visits =
      data.visits || [];


    if (scheduleVisitCount) {

      scheduleVisitCount.textContent =
        `${scheduleState.visits.length}件`;
    }


    renderScheduleCalendar(
      period,
      preserveScroll
    );


  } catch (error) {

    scheduleCalendar.innerHTML = `
      <div class="schedule-error">
        <strong>予定を読み込めなかった</strong>
        <span>
          ${escapeHtml(error.message)}
        </span>
      </div>
    `;
  }
}


/* ========================================
   RENDER
======================================== */

function renderScheduleCalendar(
  period,
  preserveScroll = false
) {

  const days =
    period.dates.length;

  const hourHeight =
    getScheduleHourHeight();

  const totalMinutes =
    (
      scheduleEndHour
      - scheduleStartHour
    ) * 60;

  const totalHeight =
    totalMinutes
    * hourHeight
    / 60;


  const columns =
    `var(--schedule-time-width) repeat(${days}, minmax(0, 1fr))`;


  const headerHtml =
    period.dates
      .map((date) => {

        const object =
          scheduleParseDate(date);

        const weekday =
          [
            '日',
            '月',
            '火',
            '水',
            '木',
            '金',
            '土',
          ][object.getDay()];

        const isToday =
          date ===
          scheduleFormatDate(
            new Date()
          );

        return `
          <div
            class="
              schedule-day-header
              ${isToday ? 'is-today' : ''}
            "
          >
            <strong>
              ${object.getMonth() + 1}/${object.getDate()}(${weekday})
            </strong>
          </div>
        `;
      })
      .join('');


  const timeLabels = [];

  for (
    let hour = scheduleStartHour;
    hour <= scheduleEndHour;
    hour += 1
  ) {

    const top =
      (
        hour
        - scheduleStartHour
      ) * hourHeight;

    timeLabels.push(`
      <span
        class="schedule-time-label"
        style="top:${top}px"
      >
        ${String(hour).padStart(2, '0')}:00
      </span>
    `);
  }


  const dayColumns =
    period.dates
      .map((date) => {

        const isToday =
          date ===
          scheduleFormatDate(
            new Date()
          );

        return `
          <div
            class="
              schedule-day-column
              ${isToday ? 'is-today' : ''}
            "
            data-schedule-day="${date}"
            style="height:${totalHeight}px"
          >
            ${renderScheduleSlots(
              date,
              totalHeight,
              hourHeight
            )}

            ${renderScheduleEventsForDate(
              date,
              hourHeight
            )}

            ${isToday
              ? renderScheduleNowLine(
                  hourHeight
                )
              : ''
            }
          </div>
        `;
      })
      .join('');


  scheduleCalendar.innerHTML = `
    <div
      class="schedule-grid"
      data-view="${escapeHtml(
        scheduleState.view
      )}"
    >

      <div
        class="schedule-grid-header"
        style="grid-template-columns:${columns}"
      >

        <div
          class="schedule-grid-header-spacer"
        ></div>

        ${headerHtml}

      </div>


      <div
        class="schedule-grid-body"
        style="
          grid-template-columns:${columns};
          height:${totalHeight}px;
        "
      >

        <div
          class="schedule-time-axis"
          style="height:${totalHeight}px"
        >
          ${timeLabels.join('')}
        </div>

        ${dayColumns}

      </div>

    </div>
  `;


  if (!preserveScroll) {

    scrollScheduleToNow(
      period,
      hourHeight
    );
  }
}


function scrollScheduleToToday() {

  const shell =
    document.querySelector(
      '.schedule-calendar-shell'
    );

  const todayColumn =
    document.querySelector(
      '.schedule-day-column.is-today'
    );

  if (!shell || !todayColumn) {
    return;
  }

  const columnCenter =
    todayColumn.offsetLeft
    + todayColumn.offsetWidth / 2;

  const targetLeft =
    columnCenter
    - shell.clientWidth / 2;

  const maxLeft =
    Math.max(
      0,
      shell.scrollWidth
      - shell.clientWidth
    );

  shell.scrollLeft =
    Math.min(
      maxLeft,
      Math.max(
        0,
        targetLeft
      )
    );
}


function renderScheduleSlots(
  date,
  totalHeight,
  hourHeight
) {

  const slotMinutes = 10;

  const slotCount =
    (
      (
        scheduleEndHour
        - scheduleStartHour
      ) * 60
    ) / slotMinutes;

  const slots = [];


  for (
    let index = 0;
    index < slotCount;
    index += 1
  ) {

    const minutes =
      index * slotMinutes;

    const absoluteMinutes =
      scheduleStartHour * 60
      + minutes;

    const hour =
      Math.floor(
        absoluteMinutes / 60
      );

    const minute =
      absoluteMinutes % 60;

    const time =
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    const top =
      minutes
      * hourHeight
      / 60;

    let slotClass =
      'is-ten-minute';

    if (minute === 0) {
      slotClass = 'is-hour';
    } else if (minute === 30) {
      slotClass = 'is-half-hour';
    }


    slots.push(`
      <button
        class="schedule-time-slot ${slotClass}"
        type="button"
        data-schedule-slot
        data-date="${date}"
        data-time="${time}"
        style="
          top:${top}px;
        "
        aria-label="${date} ${time}に予約を追加"
      ></button>
    `);
  }


  return slots.join('');
}


function renderScheduleEventsForDate(
  date,
  hourHeight
) {

  return scheduleState.visits
    .filter((visit) => {

      const startedAt =
        String(
          visit.started_at
          || ''
        );

      const startedDate =
        startedAt.slice(0, 10);

      const startedHour =
        Number(
          startedAt.slice(11, 13)
        );


      if (
        startedHour >= 0
        && startedHour < 3
      ) {

        const previousDate =
          scheduleParseDate(
            startedDate
          );

        previousDate.setDate(
          previousDate.getDate() - 1
        );

        return (
          scheduleFormatDate(
            previousDate
          ) === date
        );
      }


      return startedDate === date;
    })
    .map((visit) =>
      renderScheduleEvent(
        visit,
        hourHeight
      )
    )
    .join('');
}


function renderScheduleEvent(
  visit,
  hourHeight
) {

  const time =
    String(
      visit.started_at
      || ''
    ).slice(11, 16);

  const [
    hourText,
    minuteText,
  ] = time.split(':');

  let startMinutes =
    Number(hourText) * 60
    + Number(minuteText);


  if (
    Number(hourText) >= 0
    && Number(hourText) < 3
  ) {
    startMinutes +=
      24 * 60;
  }


  const calendarStart =
    scheduleStartHour * 60;

  const top =
    (
      startMinutes
      - calendarStart
    ) * hourHeight / 60;

  const duration =
    Math.max(
      10,
      Number(
        visit.course_minutes
        || 0
      )
    );

  const height =
    Math.max(
      28,
      duration
      * hourHeight
      / 60
      - 3
    );


  if (
    top < 0
    || startMinutes
      >= scheduleEndHour * 60
  ) {
    return '';
  }


  const status =
    scheduleCustomerStatusLabel(
      visit.customer_status
    );

  const customer =
    visit.customer_name
    || visit.customer_code
    || status;

  const storeClass =
    scheduleStoreClass(
      visit.store_name
    );

  const courseClass =
    scheduleCourseClass(
      Number(visit.course_minutes)
    );

  const repeatClass =
    [
      'repeat',
      'other_store_repeat',
      'repeat_unknown_id',
    ].includes(visit.customer_status)
      ? 'is-repeat'
      : '';


  const optionNames =
    Array.isArray(visit.options)
      ? visit.options
          .map((option) =>
            option.name
            || option.custom_name
            || ''
          )
          .filter(Boolean)
      : [];


  const optionHtml =
    optionNames.length
      ? `
        <span class="schedule-event-options">
          ${escapeHtml(
            optionNames.join('・')
          )}
        </span>
      `
      : '';


  return `
    <button
      class="
        schedule-event
        ${storeClass}
        ${courseClass}
        ${repeatClass}
      "
      type="button"
      draggable="true"
      data-schedule-event="${Number(visit.id)}"
      data-schedule-started-at="${escapeHtml(
        String(visit.started_at || '')
      )}"
      style="
        top:${top}px;
        height:${height}px;
      "
    >

      <span class="schedule-event-heading">

        <span class="schedule-event-time">
          ${escapeHtml(time)}
        </span>

        <span class="schedule-event-kind">
          ${escapeHtml(status)}
        </span>

      </span>

      ${
        visit.customer_name
        || visit.customer_code
          ? `
            <span class="schedule-event-main">
              ${escapeHtml(customer)}
            </span>
          `
          : ''
      }

      <span class="schedule-event-meta">

        <span class="schedule-event-status">
          ${Number(visit.course_minutes)}分
        </span>

      </span>

      ${optionHtml}

      <span class="schedule-event-progress">

        <span
          class="${Number(visit.customer_linked) ? '' : 'is-incomplete'}"
          title="顧客"
        >
          👤
        </span>

        <span
          class="${Number(visit.diary_linked) ? '' : 'is-incomplete'}"
          title="日記"
        >
          📓
        </span>

        <span
          class="${Number(visit.sales_entered) ? '' : 'is-incomplete'}"
          title="売上"
        >
          ¥
        </span>

      </span>

    </button>
  `;
}


function renderScheduleNowLine(
  hourHeight
) {

  const now =
    new Date();

  let displayHour =
    now.getHours();


  if (
    displayHour < 3
  ) {
    displayHour += 24;
  }


  const minutes =
    displayHour * 60
    + now.getMinutes();

  const start =
    scheduleStartHour * 60;

  const end =
    scheduleEndHour * 60;


  if (
    minutes < start
    || minutes >= end
  ) {
    return '';
  }


  const top =
    (
      minutes - start
    ) * hourHeight / 60;


  return `
    <div
      class="schedule-now-line"
      style="top:${top}px"
    >

      <span class="schedule-now-label">
        ${String(displayHour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}
      </span>

    </div>
  `;
}


/* ========================================
   PERIOD TITLE
======================================== */

function updateSchedulePeriodTitle(
  period
) {

  if (!schedulePeriodTitle) return;


  const start =
    scheduleParseDate(
      period.start
    );

  const end =
    scheduleParseDate(
      period.end
    );


  if (period.start === period.end) {

    schedulePeriodTitle.textContent =
      `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日`;

    return;
  }


  schedulePeriodTitle.textContent =
    `${start.getMonth() + 1}/${start.getDate()} 〜 ${end.getMonth() + 1}/${end.getDate()}`;
}


/* ========================================
   ADD / EDIT FORM
======================================== */

function openScheduleForm(
  date = null,
  time = null
) {

  if (!scheduleFormCard) return;


  closeScheduleDetail();


  let targetDate =
    date
    || scheduleState.anchorDate
    || scheduleFormatDate(
      new Date()
    );


  let targetTime =
    time || '12:00';


  if (targetTime) {

    const [
      hourText,
      minuteText,
    ] = targetTime.split(':');

    const hour =
      Number(hourText);

    if (hour >= 24) {

      const nextDate =
        scheduleParseDate(
          targetDate
        );

      nextDate.setDate(
        nextDate.getDate() + 1
      );

      targetDate =
        scheduleFormatDate(
          nextDate
        );

      targetTime =
        `${String(hour - 24).padStart(2, '0')}:${minuteText}`;
    }
  }


  resetScheduleForm();


  if (scheduleFormDate) {
    scheduleFormDate.value =
      targetDate;
  }


  if (scheduleStartTime) {
    scheduleStartTime.value =
      targetTime;
  }


  const bookedNow =
    new Date();


  if (scheduleBookedDate) {
    scheduleBookedDate.value =
      scheduleFormatDate(
        bookedNow
      );
  }


  if (scheduleBookedTime) {
    scheduleBookedTime.value =
      `${String(bookedNow.getHours()).padStart(2, '0')}:${String(bookedNow.getMinutes()).padStart(2, '0')}`;
  }


  scheduleFormCard.hidden = false;
}


function resetScheduleForm() {

  if (scheduleEditId) {
    scheduleEditId.value = '';
  }


  if (scheduleFormTitle) {
    scheduleFormTitle.textContent =
      '予約を追加';
  }


  if (scheduleSaveButton) {
    scheduleSaveButton.textContent =
      'この予約を登録';
  }


  selectedScheduleCourse = 90;
  selectedCustomerStatus = 'repeat';


  if (scheduleCustomCourse) {
    scheduleCustomCourse.value = '';
  }


  if (scheduleStore) {
    scheduleStore.value = '2';
  }


  if (scheduleCustomerChange) {
    scheduleCustomerChange.checked =
      false;
  }


  document
    .querySelectorAll(
      '[data-schedule-option]'
    )
    .forEach((input) => {
      input.checked = false;
    });


  if (scheduleCustomOption) {
    scheduleCustomOption.value = '';
  }


  document
    .querySelectorAll('[data-course]')
    .forEach((button) => {

      button.classList.toggle(
        'is-selected',
        Number(button.dataset.course)
        === 90
      );
    });


  document
    .querySelectorAll(
      '[data-customer-status]'
    )
    .forEach((button) => {

      button.classList.toggle(
        'is-selected',
        button.dataset.customerStatus
        === 'repeat'
      );
    });


  hideScheduleMessage();
}


function closeScheduleForm() {

  if (!scheduleFormCard) return;

  scheduleFormCard.hidden = true;

  hideScheduleMessage();
}


async function saveScheduleVisit() {

  if (
    !scheduleFormDate
    || !scheduleStore
    || !scheduleStartTime
    || !scheduleSaveButton
  ) {
    return;
  }


  const date =
    scheduleFormDate.value;

  const time =
    scheduleStartTime.value;

  const editId =
    Number(
      scheduleEditId?.value
      || 0
    );


  if (!date || !time) {

    showScheduleMessage(
      '日付と開始時間を入れてね。',
      true
    );

    return;
  }


  if (
    !selectedScheduleCourse
    || selectedScheduleCourse <= 0
  ) {

    showScheduleMessage(
      '予約時間を選んでね。',
      true
    );

    return;
  }


  scheduleSaveButton.disabled = true;

  scheduleSaveButton.textContent =
    editId
      ? '更新中…'
      : '登録中…';


  hideScheduleMessage();


  const selectedOptions =
    Array.from(
      document.querySelectorAll(
        '[data-schedule-option]:checked'
      )
    )
      .map((input) =>
        String(input.value).trim()
      )
      .filter(Boolean);


  const customOption =
    scheduleCustomOption
      ? scheduleCustomOption.value.trim()
      : '';


  const bookedDate =
    scheduleBookedDate
      ? scheduleBookedDate.value
      : '';

  const bookedTime =
    scheduleBookedTime
      ? scheduleBookedTime.value
      : '';


  if (
    (bookedDate && !bookedTime)
    || (!bookedDate && bookedTime)
  ) {

    showScheduleMessage(
      '予約受付日は日付と時刻を両方入れてね。',
      true
    );

    scheduleSaveButton.disabled =
      false;

    scheduleSaveButton.textContent =
      editId
        ? '変更を保存'
        : 'この予約を登録';

    return;
  }


  const bookedAt =
    bookedDate && bookedTime
      ? `${bookedDate} ${bookedTime}`
      : null;


  const customerRequestedChange =
    Boolean(
      editId
      && scheduleCustomerChange
      && scheduleCustomerChange.checked
    );


  const payload = {
    store_id:
      Number(
        scheduleStore.value
      ),

    started_at:
      `${date} ${time}`,

    booked_at:
      bookedAt,

    course_minutes:
      selectedScheduleCourse,

    customer_status:
      selectedCustomerStatus,

    options:
      selectedOptions,

    custom_option:
      customOption,

    customer_requested_change:
      customerRequestedChange,
  };


  if (editId) {
    payload.id = editId;
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

  const previousAnchorDate =
    scheduleState.anchorDate;


  try {

    const response =
      await fetch(
        scheduleApiUrl,
        {
          method:
            editId
              ? 'PATCH'
              : 'POST',

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
      || !data.success
    ) {
      throw new Error(
        data.error
        || '予約の保存に失敗しました。'
      );
    }


    scheduleState.anchorDate =
      previousAnchorDate;

    if (scheduleDateInput) {
      scheduleDateInput.value =
        previousAnchorDate;
    }


    closeScheduleForm();

    await loadSchedule(
      true
    );


    if (
      editId
      && calendarShell
    ) {

      calendarShell.scrollLeft =
        previousScrollLeft;

      calendarShell.scrollTop =
        previousScrollTop;
    }


  } catch (error) {

    showScheduleMessage(
      error.message,
      true
    );

  } finally {

    scheduleSaveButton.disabled =
      false;

    scheduleSaveButton.textContent =
      editId
        ? '変更を保存'
        : 'この予約を登録';
  }
}


/* ========================================
   DETAIL
======================================== */

function openScheduleDetail(
  visit
) {

  if (
    !scheduleDetailDrawer
    || !scheduleDetailBody
  ) {
    return;
  }


  scheduleState.selectedVisit =
    visit;


  const status =
    scheduleCustomerStatusLabel(
      visit.customer_status
    );

  const customer =
    visit.customer_name
    || visit.customer_code
    || status;

  const date =
    String(
      visit.started_at
    ).slice(0, 10);

  const time =
    String(
      visit.started_at
    ).slice(11, 16);


  if (scheduleDetailTitle) {
    scheduleDetailTitle.textContent =
      customer;
  }


  const optionNames =
    Array.isArray(visit.options)
      ? visit.options
          .map((option) =>
            option.name
            || option.custom_name
            || ''
          )
          .filter(Boolean)
      : [];


  const optionText =
    optionNames.length
      ? optionNames.join(' / ')
      : 'なし';


  scheduleDetailBody.innerHTML = `
    <div class="schedule-detail-card">

      <div class="schedule-detail-row">
        <span>日時</span>
        <strong>
          ${escapeHtml(date)}
          ${escapeHtml(time)}
        </strong>
      </div>

      <div class="schedule-detail-row">
        <span>店舗</span>
        <strong>
          ${escapeHtml(visit.store_name)}
        </strong>
      </div>

      <div class="schedule-detail-row">
        <span>予約時間</span>
        <strong>
          ${Number(visit.course_minutes)}分
        </strong>
      </div>

      <div class="schedule-detail-row">
        <span>区分</span>
        <strong>
          ${escapeHtml(status)}
        </strong>
      </div>

      <div class="schedule-detail-row">
        <span>OP</span>
        <strong>
          ${escapeHtml(optionText)}
        </strong>
      </div>

    </div>
  `;


  updateScheduleDetailState(
    scheduleDetailCustomerState,
    Number(
      visit.customer_linked
    ),
    '紐付け済',
    '未紐付け'
  );


  updateScheduleDetailState(
    scheduleDetailDiaryState,
    Number(
      visit.diary_linked
    ),
    '完了',
    '未入力'
  );


  updateScheduleDetailState(
    scheduleDetailSalesState,
    Number(
      visit.sales_entered
    ),
    '入力済',
    '未入力'
  );


  if (scheduleDrawerBackdrop) {
    scheduleDrawerBackdrop.hidden =
      false;
  }


  scheduleDetailDrawer.classList.add(
    'is-open'
  );

  scheduleDetailDrawer.setAttribute(
    'aria-hidden',
    'false'
  );
}


function updateScheduleDetailState(
  element,
  complete,
  completeText,
  incompleteText
) {

  if (!element) return;


  element.textContent =
    complete
      ? completeText
      : incompleteText;


  const button =
    element.closest('button');

  if (button) {

    button.classList.toggle(
      'is-complete',
      Boolean(complete)
    );
  }
}


function closeScheduleDetail() {

  if (scheduleDetailDrawer) {

    scheduleDetailDrawer.classList.remove(
      'is-open'
    );

    scheduleDetailDrawer.setAttribute(
      'aria-hidden',
      'true'
    );
  }


  if (scheduleDrawerBackdrop) {
    scheduleDrawerBackdrop.hidden =
      true;
  }


  if (scheduleHistoryPanel) {

    scheduleHistoryPanel.hidden =
      true;

    scheduleHistoryPanel.innerHTML =
      '';
  }
}


async function openCurrentScheduleHistory() {

  const visit =
    scheduleState.selectedVisit;

  if (
    !visit
    || !scheduleHistoryPanel
  ) {
    return;
  }


  if (!scheduleHistoryPanel.hidden) {

    scheduleHistoryPanel.hidden =
      true;

    scheduleHistoryPanel.innerHTML =
      '';

    return;
  }


  try {

    const response =
      await fetch(
        `${scheduleApiUrl}?visit_id=${encodeURIComponent(
          String(visit.id)
        )}`
      );


    const data =
      await response.json();


    if (
      !response.ok
      || !data.success
    ) {
      throw new Error(
        data.error
        || '予約変更履歴を取得できませんでした。'
      );
    }


    const history =
      Array.isArray(data.history)
        ? data.history
        : [];


    const historyHtml =
      history.length
        ? history
            .map((item) => {

              const typeLabels = {
                datetime: '日時変更',
                course: '予約時間変更',
                store: '店舗変更',
                option: 'OP変更',
                status: '区分変更',
                multiple: '複数項目変更',
                other: 'その他変更',
              };


              const typeLabel =
                typeLabels[item.change_type]
                || '予約変更';


              const before =
                item.before_data
                || {};

              const after =
                item.after_data
                || {};


              const changes = [];


              if (
                before.started_at
                !== after.started_at
              ) {

                changes.push({
                  label: '日時',
                  before:
                    before.started_at
                    || '未設定',
                  after:
                    after.started_at
                    || '未設定',
                });
              }


              if (
                before.course_minutes
                !== after.course_minutes
              ) {

                changes.push({
                  label: '予約時間',
                  before:
                    before.course_minutes
                      ? `${before.course_minutes}分`
                      : '未設定',
                  after:
                    after.course_minutes
                      ? `${after.course_minutes}分`
                      : '未設定',
                });
              }


              if (
                before.store_id
                !== after.store_id
              ) {

                changes.push({
                  label: '店舗',
                  before:
                    before.store_id
                    ?? '未設定',
                  after:
                    after.store_id
                    ?? '未設定',
                });
              }


              const beforeOptions =
                Array.isArray(before.options)
                  ? before.options
                  : [];

              const afterOptions =
                Array.isArray(after.options)
                  ? after.options
                  : [];


              if (
                JSON.stringify(beforeOptions)
                !== JSON.stringify(afterOptions)
              ) {

                changes.push({
                  label: 'OP',
                  before:
                    beforeOptions.length
                      ? beforeOptions.join('・')
                      : 'なし',
                  after:
                    afterOptions.length
                      ? afterOptions.join('・')
                      : 'なし',
                });
              }


              if (
                before.customer_status
                !== after.customer_status
              ) {

                changes.push({
                  label: '区分',
                  before:
                    before.customer_status
                    || '未設定',
                  after:
                    after.customer_status
                    || '未設定',
                });
              }


              const changesHtml =
                changes
                  .map((change) => `
                    <div class="schedule-history-change">
                      <span class="schedule-history-change-label">
                        ${escapeHtml(change.label)}
                      </span>

                      <span class="schedule-history-change-values">
                        ${escapeHtml(
                          String(change.before)
                        )}
                        →
                        ${escapeHtml(
                          String(change.after)
                        )}
                      </span>
                    </div>
                  `)
                  .join('');


              return `
                <div class="schedule-history-item">
                  <strong>
                    ${escapeHtml(typeLabel)}
                  </strong>

                  ${changesHtml}

                  <span>
                    受付：
                    ${escapeHtml(
                      String(
                        item.requested_at
                        || ''
                      )
                    )}
                  </span>
                </div>
              `;
            })
            .join('')
        : `
            <p class="schedule-history-empty">
              変更履歴はありません
            </p>
          `;


    scheduleHistoryPanel.innerHTML = `
      <div class="schedule-history-list">
        <h3>予約変更履歴</h3>
        ${historyHtml}
      </div>
    `;

    scheduleHistoryPanel.hidden =
      false;


  } catch (error) {

    window.alert(
      error.message
    );
  }
}


function editCurrentScheduleVisit() {

  const visit =
    scheduleState.selectedVisit;

  if (!visit) return;


  closeScheduleDetail();

  resetScheduleForm();


  const date =
    String(
      visit.started_at
    ).slice(0, 10);

  const time =
    String(
      visit.started_at
    ).slice(11, 16);


  const bookedAt =
    visit.booked_at
      ? String(
          visit.booked_at
        )
      : '';


  const bookedDate =
    bookedAt
      ? bookedAt.slice(0, 10)
      : '';


  const bookedTime =
    bookedAt
      ? bookedAt.slice(11, 16)
      : '';


  if (scheduleBookedDate) {
    scheduleBookedDate.value =
      bookedDate;
  }


  if (scheduleBookedTime) {
    scheduleBookedTime.value =
      bookedTime;
  }


  if (scheduleEditId) {
    scheduleEditId.value =
      String(visit.id);
  }


  if (scheduleFormTitle) {
    scheduleFormTitle.textContent =
      '予約を編集';
  }


  if (scheduleFormDate) {
    scheduleFormDate.value =
      date;
  }


  if (scheduleStartTime) {
    scheduleStartTime.value =
      time;
  }


  if (scheduleStore) {
    scheduleStore.value =
      String(visit.store_id);
  }


  selectedScheduleCourse =
    Number(
      visit.course_minutes
    );


  const standardCourse =
    document.querySelector(
      `[data-course="${selectedScheduleCourse}"]`
    );


  document
    .querySelectorAll('[data-course]')
    .forEach((button) => {

      button.classList.toggle(
        'is-selected',
        button === standardCourse
      );
    });


  if (
    !standardCourse
    && scheduleCustomCourse
  ) {
    scheduleCustomCourse.value =
      String(
        selectedScheduleCourse
      );
  }


  selectedCustomerStatus =
    visit.customer_status;


  document
    .querySelectorAll(
      '[data-customer-status]'
    )
    .forEach((button) => {

      button.classList.toggle(
        'is-selected',
        button.dataset.customerStatus
        === selectedCustomerStatus
      );
    });


  const visitOptions =
    Array.isArray(visit.options)
      ? visit.options
      : [];


  const standardOptionNames =
    visitOptions
      .map((option) =>
        option.name
          ? String(option.name)
          : ''
      )
      .filter(Boolean);


  document
    .querySelectorAll(
      '[data-schedule-option]'
    )
    .forEach((input) => {

      input.checked =
        standardOptionNames.includes(
          String(input.value)
        );
    });


  if (scheduleCustomOption) {

    const customNames =
      visitOptions
        .map((option) =>
          option.custom_name
            ? String(option.custom_name)
            : ''
        )
        .filter(Boolean);

    scheduleCustomOption.value =
      customNames.join('、');
  }


  if (scheduleSaveButton) {
    scheduleSaveButton.textContent =
      '変更を保存';
  }


  scheduleFormCard.hidden = false;
}


async function deleteCurrentScheduleVisit() {

  const visit =
    scheduleState.selectedVisit;

  if (!visit) return;


  const confirmed =
    window.confirm(
      'この予約をDBから削除する？\n関連する日記・売上・OPの紐付けも削除されます。'
    );


  if (!confirmed) {
    return;
  }


  try {

    const response =
      await fetch(
        scheduleApiUrl,
        {
          method: 'DELETE',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              id:
                Number(
                  visit.id
                ),
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
        || '予約を削除できませんでした。'
      );
    }


    closeScheduleDetail();

    scheduleState.selectedVisit =
      null;

    await loadSchedule();


  } catch (error) {

    window.alert(
      error.message
    );
  }
}


/* ========================================
   HELPERS
======================================== */

function scheduleCustomerStatusLabel(
  status
) {

  const labels = {
    new: '新規',
    repeat: 'リピ',
    other_store_repeat:
      '他店リピ',
    repeat_unknown_id:
      'リピ・ID不明',
  };

  return labels[status]
    || '未設定';
}


function scheduleStoreClass(
  storeName
) {

  const classes = {
    札幌: 'store-sapporo',
    千葉: 'store-chiba',
    東京: 'store-tokyo',
    名古屋: 'store-nagoya',
  };

  return classes[storeName]
    || 'store-sapporo';
}


function scheduleCourseClass(
  minutes
) {

  if (minutes <= 45) {
    return 'course-40';
  }

  if (minutes <= 65) {
    return 'course-60';
  }

  if (minutes <= 85) {
    return 'course-80';
  }

  if (minutes <= 95) {
    return 'course-90';
  }

  if (minutes <= 105) {
    return 'course-100';
  }

  if (minutes <= 127) {
    return 'course-120';
  }

  if (minutes <= 165) {
    return 'course-150';
  }

  if (minutes <= 180) {
    return 'course-180';
  }

  return 'course-over-180';
}


function scheduleFormatDate(
  date
) {

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      date.getDate()
    ).padStart(2, '0');


  return `${year}-${month}-${day}`;
}


function scheduleParseDate(
  value
) {

  return new Date(
    `${value}T00:00:00`
  );
}


function getScheduleHourHeight() {

  const page =
    document.querySelector(
      '.schedule-page'
    );

  if (!page) {
    return 96;
  }


  const value =
    getComputedStyle(page)
      .getPropertyValue(
        '--schedule-hour-height'
      )
      .trim();


  return Number(
    value.replace('px', '')
  ) || 96;
}


function scrollScheduleNearFirstVisit(
  period,
  hourHeight
) {

  const shell =
    document.querySelector(
      '.schedule-calendar-shell'
    );

  if (!shell) return;


  const visibleVisits =
    scheduleState.visits
      .filter((visit) => {

        const date =
          String(
            visit.started_at
          ).slice(0, 10);

        return period.dates.includes(
          date
        );
      });


  let targetHour = 12;


  if (visibleVisits.length > 0) {

    const firstTime =
      String(
        visibleVisits[0].started_at
      ).slice(11, 16);

    const hour =
      Number(
        firstTime.slice(0, 2)
      );

    targetHour =
      Math.max(
        scheduleStartHour,
        hour - 1
      );
  }


  shell.scrollTop =
    Math.max(
      0,
      (
        targetHour
        - scheduleStartHour
      ) * hourHeight
    );
}


function showScheduleMessage(
  message,
  isError = false
) {

  if (!scheduleFormMessage) {
    return;
  }


  scheduleFormMessage.hidden =
    false;

  scheduleFormMessage.textContent =
    message;

  scheduleFormMessage.classList.toggle(
    'is-error',
    isError
  );
}


function hideScheduleMessage() {

  if (!scheduleFormMessage) {
    return;
  }


  scheduleFormMessage.hidden =
    true;

  scheduleFormMessage.textContent =
    '';

  scheduleFormMessage.classList.remove(
    'is-error'
  );
}


function escapeHtml(
  value
) {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// WRITER:WORK_SCHEDULE_LOGIC:END


/* ========================================
   DUMMY DIARY LITE
======================================== */

let dummyDiarySerial = 0;


function addDummyDiary(button) {
  const template =
    document.getElementById(
      'dummy-diary-template'
    );

  if (!template) return;

  dummyDiarySerial += 1;

  const fragment =
    template.content.cloneNode(true);

  const card =
    fragment.querySelector(
      '.dummy-diary-card'
    );

  if (!card) return;

  card.dataset.dummyId =
    `dummy-${dummyDiarySerial}`;

  card
    .querySelectorAll(
      'input[name="dummy-course"]'
    )
    .forEach((input) => {
      input.name =
        `dummy-course-${dummyDiarySerial}`;
    });

  card
    .querySelectorAll(
      'input[name="dummy-type"]'
    )
    .forEach((input) => {
      input.name =
        `dummy-type-${dummyDiarySerial}`;
    });

  button.insertAdjacentElement(
    'beforebegin',
    card
  );
}


function removeDummyDiary(button) {
  const card =
    button.closest('.dummy-diary-card');

  card?.remove();
}


/* ========================================
   CUSTOMER INLINE EDITOR
======================================== */

const customerInlineEditor =
  document.getElementById('customer-inline-editor');

const customerEditorName =
  document.getElementById('inline-editor-customer-name');

const customerIdeaA =
  document.getElementById('customer-idea-a');

const customerIdeaB =
  document.getElementById('customer-idea-b');

const customerIdeaC =
  document.getElementById('customer-idea-c');

const koppyCustomerIdeas =
  document.getElementById('koppy-customer-ideas');

const koppyComparisonToolbar =
  document.getElementById(
    'koppy-comparison-toolbar'
  );

const customerDiffPanel =
  document.getElementById('customer-diff-panel');

const customerDiffSource =
  document.getElementById('customer-diff-source');

const customerDiffTarget =
  document.getElementById('customer-diff-target');

const customerDiffTitle =
  document.getElementById('customer-diff-title');

const customerDiffTargetHeading =
  document.getElementById(
    'customer-diff-target-heading'
  );

let activeCustomerVisitId = '';
let activeKoppyIdea = 'b';

const customerIdeaState = {};


function openCustomerEditor(button) {
  const row =
    button.closest('.customer-check-row');

  if (!row || !customerInlineEditor) return;

  saveActiveCustomerIdeas();

  const visitId =
    button.dataset.visitId || '';

  const customerName =
    row.querySelector('.visit-info strong')
      ?.textContent
      ?.trim() || 'お客様';

  activeCustomerVisitId = visitId;

  customerEditorName.textContent =
    `${customerName}のお礼`;

  const saved =
    customerIdeaState[visitId];

  customerIdeaA.value =
    saved?.a || '';

  customerIdeaB.value =
    saved?.b || '';

  customerIdeaC.value =
    saved?.c || '';

  activeKoppyIdea =
    saved?.activeKoppyIdea || 'b';

  const hasKoppyIdeas =
    Boolean(saved?.b || saved?.c);

  koppyCustomerIdeas.hidden =
    !hasKoppyIdeas;

  koppyComparisonToolbar.hidden =
    !hasKoppyIdeas;

  customerDiffPanel.hidden =
    !hasKoppyIdeas;

  row.insertAdjacentElement(
    'afterend',
    customerInlineEditor
  );

  customerInlineEditor.hidden = false;

  if (hasKoppyIdeas) {
    switchCustomerIdea(activeKoppyIdea);
  }
}


function closeCustomerEditor() {
  if (!customerInlineEditor) return;

  saveActiveCustomerIdeas();

  customerInlineEditor.hidden = true;

  activeCustomerVisitId = '';
}


function saveActiveCustomerIdeas() {
  if (!activeCustomerVisitId) return;

  customerIdeaState[activeCustomerVisitId] = {
    ...(customerIdeaState[activeCustomerVisitId] || {}),
    a: customerIdeaA.value,
    b: customerIdeaB.value,
    c: customerIdeaC.value,
    activeKoppyIdea,
  };
}


function generateCustomerIdeas() {
  const source =
    customerIdeaA.value.trim();

  if (!source) {
    alert('まずA案に思ったことを書いてね☺️');
    return;
  }

  /*
   * Phase 1 UI prototype.
   * 後でここを実際のKoppy生成へ差し替える。
   */

  customerIdeaB.value =
    source
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  customerIdeaC.value =
`昨日も会いに来てくれてありがと♡

${source}

また会えるの楽しみにしてるね☺️`;

  koppyCustomerIdeas.hidden = false;
  koppyComparisonToolbar.hidden = false;
  customerDiffPanel.hidden = false;

  activeKoppyIdea = 'b';

  switchCustomerIdea('b');
  saveActiveCustomerIdeas();
}


function switchCustomerIdea(idea) {
  if (idea !== 'b' && idea !== 'c') {
    idea = 'b';
  }

  activeKoppyIdea = idea;

  document
    .querySelectorAll('.koppy-idea-tab')
    .forEach((tab) => {
      tab.classList.toggle(
        'is-active',
        tab.dataset.idea === idea
      );
    });

  document
    .querySelectorAll('[data-koppy-idea-panel]')
    .forEach((panel) => {
      const isActive =
        panel.dataset.koppyIdeaPanel === idea;

      panel.hidden = !isActive;
      panel.classList.toggle(
        'is-active',
        isActive
      );
    });

  updateCustomerDiff();
  saveActiveCustomerIdeas();
}


function updateCustomerDiff() {
  if (
    !customerDiffSource ||
    !customerDiffTarget
  ) {
    return;
  }

  const source =
    customerIdeaA.value || '';

  const target =
    activeKoppyIdea === 'c'
      ? customerIdeaC.value
      : customerIdeaB.value;

  const targetLabel =
    activeKoppyIdea.toUpperCase();

  customerDiffTitle.textContent =
    `A ↔ ${targetLabel} 差分`;

  customerDiffTargetHeading.textContent =
    `＋ ${targetLabel}｜Koppy案`;

  renderSideBySideDiff(
    customerDiffSource,
    customerDiffTarget,
    source,
    target
  );
}


function renderSideBySideDiff(
  sourceContainer,
  targetContainer,
  source,
  target
) {
  sourceContainer.replaceChildren();
  targetContainer.replaceChildren();

  if (source === target) {
    const sourceSame =
      document.createElement('span');

    const targetSame =
      document.createElement('span');

    sourceSame.textContent =
      source || '差分なし';

    targetSame.textContent =
      target || '差分なし';

    sourceContainer.appendChild(sourceSame);
    targetContainer.appendChild(targetSame);
    return;
  }

  let prefixLength = 0;

  while (
    prefixLength < source.length &&
    prefixLength < target.length &&
    source[prefixLength] ===
      target[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;

  while (
    suffixLength <
      source.length - prefixLength &&
    suffixLength <
      target.length - prefixLength &&
    source[
      source.length - 1 - suffixLength
    ] ===
      target[
        target.length - 1 - suffixLength
      ]
  ) {
    suffixLength += 1;
  }

  const sourcePrefix =
    source.slice(0, prefixLength);

  const sourceChanged =
    source.slice(
      prefixLength,
      source.length - suffixLength
    );

  const sourceSuffix =
    suffixLength
      ? source.slice(
          source.length - suffixLength
        )
      : '';

  const targetPrefix =
    target.slice(0, prefixLength);

  const targetChanged =
    target.slice(
      prefixLength,
      target.length - suffixLength
    );

  const targetSuffix =
    suffixLength
      ? target.slice(
          target.length - suffixLength
        )
      : '';

  sourceContainer.append(
    document.createTextNode(sourcePrefix)
  );

  if (sourceChanged) {
    const removed =
      document.createElement('span');

    removed.className =
      'diff-remove';

    removed.textContent =
      sourceChanged;

    sourceContainer.appendChild(removed);
  }

  sourceContainer.append(
    document.createTextNode(sourceSuffix)
  );


  targetContainer.append(
    document.createTextNode(targetPrefix)
  );

  if (targetChanged) {
    const added =
      document.createElement('span');

    added.className =
      'diff-add';

    added.textContent =
      targetChanged;

    targetContainer.appendChild(added);
  }

  targetContainer.append(
    document.createTextNode(targetSuffix)
  );
}


function adoptCustomerIdea(button) {
  if (!activeCustomerVisitId) return;

  const idea =
    button.dataset.idea;

  const valueMap = {
    a: customerIdeaA.value,
    b: customerIdeaB.value,
    c: customerIdeaC.value,
  };

  customerIdeaState[activeCustomerVisitId] = {
    ...(customerIdeaState[activeCustomerVisitId] || {}),
    a: customerIdeaA.value,
    b: customerIdeaB.value,
    c: customerIdeaC.value,
    activeKoppyIdea,
    selected: idea,
    final: valueMap[idea] || '',
  };

  alert(
    `${idea.toUpperCase()}案を採用したよ♡`
  );
}


[
  customerIdeaA,
  customerIdeaB,
  customerIdeaC,
].forEach((textarea) => {
  textarea?.addEventListener(
    'input',
    () => {
      updateCustomerDiff();
      saveActiveCustomerIdeas();
    }
  );
});


/* ========================================
   DIARY CREATE
======================================== */

function startNukinaviDiary() {
  restoreDraftToCreateScreen();
  showView('nukinaviCreate');
}


function getSelectedVisits() {
  const checked = document.querySelectorAll(
    'input[name="visit"]:checked'
  );

  return Array.from(checked).map((input) => input.value);
}


function generateDiary() {
  const availabilityInput = document.getElementById(
    'availability-input'
  );

  const extraNoteInput = document.getElementById(
    'extra-note'
  );

  diaryState.availability =
    availabilityInput?.value.trim() || '';

  diaryState.extraNote =
    extraNoteInput?.value.trim() || '';

  diaryState.selectedVisitIds =
    getSelectedVisits();

  const selectedCount =
    diaryState.selectedVisitIds.length;

  diaryState.aiDraftTitle =
    '昨日もいっぱいありがと♡';

  diaryState.aiDraftBody =
`昨日もたくさんありがと♡

今日も事前予約ありがと〜☺️
${diaryState.availability || '今日も会いに来てね♡'}

↓昨日のお礼♡

スタートから120分リピのお兄さん🥰
昨日もいっぱいありがと♡
また会えて嬉しかったよ〜☺️
また次回もいっぱい楽しもうね♪

14:30から90分のお兄さん♡
初めましてありがと〜！
いっぱい喜んでもらえて嬉しかったよ☺️
また会いに来てくれるの楽しみに待ってるね♡

${selectedCount >= 3
  ? `ほかのお兄さんたちも昨日はありがと〜♡
いっぱい会えて嬉しかったよ☺️`
  : ''}

${diaryState.extraNote
  ? `\n${diaryState.extraNote}`
  : ''}

❄︎こはく❄︎`;

  diaryState.finalTitle =
    diaryState.aiDraftTitle;

  diaryState.finalBody =
    diaryState.aiDraftBody;

  diaryState.status = 'generated';

  diaryTitleInput.value =
    diaryState.finalTitle;

  diaryBodyInput.value =
    diaryState.finalBody;

  updateDraftCount();

  showView('diaryEdit');
}


/* ========================================
   REWRITE
======================================== */

document.querySelectorAll('[data-rewrite]').forEach((button) => {
  button.addEventListener('click', () => {
    const type = button.dataset.rewrite;

    applyQuickRewrite(type);
  });
});


function applyQuickRewrite(type) {
  let body = diaryBodyInput.value;

  if (type === 'shorter') {
    body = body
      .split('\n')
      .filter((line, index) => {
        if (index === 0) return true;
        return line.trim() !== '';
      })
      .join('\n');

    diaryBodyInput.value = body;
  }

  if (type === 'energetic') {
    if (!body.includes('♡♡')) {
      body = body.replace(
        '昨日もたくさんありがと♡',
        '昨日もたくさんたくさんありがと♡♡'
      );
    }

    diaryBodyInput.value = body;
  }

  if (type === 'soft-sales') {
    body = body.replace(
      '会いに来てね♡',
      '会えたら嬉しいな☺️'
    );

    diaryBodyInput.value = body;
  }

  syncFinalText();
}


function applyRewriteNote() {
  const note = document.getElementById(
    'rewrite-note'
  );

  const text = note?.value.trim();

  if (!text) {
    alert('修正したい内容を入れてね☺️');
    return;
  }

  alert(
    `いまはUIテスト中だよ。\n\n実装後はKoppyに\n「${text}」\nって修正してもらう予定！`
  );
}


function syncFinalText() {
  diaryState.finalTitle =
    diaryTitleInput.value;

  diaryState.finalBody =
    diaryBodyInput.value;
}


diaryTitleInput?.addEventListener(
  'input',
  syncFinalText
);

diaryBodyInput?.addEventListener(
  'input',
  syncFinalText
);


/* ========================================
   DRAFT
======================================== */

function saveDraft() {
  syncFinalText();

  diaryState.status = 'editing';

  localStorage.setItem(
    'kohakuWorkDiaryDraft',
    JSON.stringify(diaryState)
  );

  updateDraftCount();

  alert('下書きを保存したよ♡');
}


function restoreDraftToCreateScreen() {
  const saved = localStorage.getItem(
    'kohakuWorkDiaryDraft'
  );

  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);

    Object.assign(
      diaryState,
      parsed
    );

    const availabilityInput =
      document.getElementById(
        'availability-input'
      );

    const extraNoteInput =
      document.getElementById(
        'extra-note'
      );

    if (availabilityInput) {
      availabilityInput.value =
        diaryState.availability || '';
    }

    if (extraNoteInput) {
      extraNoteInput.value =
        diaryState.extraNote || '';
    }
  } catch (error) {
    console.warn(
      'Draft restore failed:',
      error
    );
  }
}


function updateDraftCount() {
  const saved = localStorage.getItem(
    'kohakuWorkDiaryDraft'
  );

  draftCount.textContent =
    saved || diaryState.status !== 'posted'
      ? '1'
      : '0';
}


/* ========================================
   PHOTO PREVIEW
======================================== */

photoInput?.addEventListener(
  'change',
  (event) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      photoPreview.hidden = true;
      return;
    }

    if (
      diaryState.photoUrl &&
      diaryState.photoUrl.startsWith('blob:')
    ) {
      URL.revokeObjectURL(
        diaryState.photoUrl
      );
    }

    const imageUrl =
      URL.createObjectURL(file);

    diaryState.photoUrl = imageUrl;

    photoPreviewImage.src =
      imageUrl;

    photoPreview.hidden = false;
  }
);


/* ========================================
   POST PREP
======================================== */

function preparePost() {
  syncFinalText();

  postPreviewTitle.textContent =
    diaryState.finalTitle ||
    '件名未入力';

  postPreviewBody.textContent =
    diaryState.finalBody ||
    '本文未入力';

  diaryState.status = 'ready';

  showView('postPrep');
}


/* ========================================
   NUKINAVI MAIL
======================================== */

function createNukinaviMail() {
  syncFinalText();

  const subject = encodeURIComponent(
    diaryState.finalTitle
  );

  const body = encodeURIComponent(
    diaryState.finalBody
  );

  const mailto =
    `mailto:?subject=${subject}&body=${body}`;

  const shouldOpen = confirm(
    'メール作成画面を開く？\n\n' +
    '※いまは投稿先アドレス未設定のテスト版。\n' +
    '写真添付もまだ手動だよ。'
  );

  if (shouldOpen) {
    window.location.href = mailto;
  }
}


/* ========================================
   POSTED
======================================== */

function markPosted() {
  diaryState.posted = true;
  diaryState.status = 'posted';

  todayPostCount.textContent = '1';

  localStorage.removeItem(
    'kohakuWorkDiaryDraft'
  );

  draftCount.textContent = '0';

  alert(
    '投稿済みにしたよ☺️\nおつかれさま♡'
  );

  showView('home');
}


/* ========================================
   VOICE DEMO
======================================== */

function demoVoiceInput() {
  alert(
    '🎙 音声入力はこれから実装！\n\n' +
    '将来的には話した内容だけ文字起こしして、\n' +
    '元音声は保存しない予定だよ。'
  );
}


/* ========================================
   PLACEHOLDER
======================================== */

function showPlaceholder(title) {
  if (placeholderTitle) {
    placeholderTitle.textContent =
      title;
  }

  showView('placeholder');
}


/* ========================================
   INITIALIZE
======================================== */

function initializeApp() {
  restoreDraftToCreateScreen();

  updateDraftCount();

  showView('schedule');

  loadSchedule();
}


initializeApp();

/* ========================================
   SCHEDULE DRAG MOVE
   desktop foundation
======================================== */

let scheduleDragState = null;


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
          Number(item.id) === visitId
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

/* ========================================
   SCHEDULE DRAG DROP SAVE
======================================== */

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
   SCHEDULE DRAG PREVIEW
======================================== */

let scheduleDragPreview = null;


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


  const [hour, minute] =
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

/* ========================================
   SCHEDULE TOUCH DRAG
   mobile foundation
======================================== */

let scheduleTouchDrag = null;

let scheduleTouchHoldTimer = null;


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
          Number(item.id) === visitId
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


          if (
            navigator.vibrate
          ) {
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

/* ========================================
   SCHEDULE TOUCH DROP SAVE
======================================== */

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

/* ========================================
   SCHEDULE INITIAL POSITION
   today + current time centered
======================================== */

function scrollScheduleToNow(
  period,
  hourHeight
) {

  const shell =
    document.querySelector(
      '.schedule-calendar-shell'
    );

  if (!shell) {
    return;
  }


  const now =
    new Date();


  let targetDate =
    scheduleFormatDate(
      now
    );


  let targetMinutes =
    now.getHours() * 60
    + now.getMinutes();


  /*
   * 0:00〜2:59 は
   * 前日の24:00〜26:59として扱う
   */
  if (
    now.getHours() < 3
  ) {

    const previousDate =
      new Date(now);

    previousDate.setDate(
      previousDate.getDate() - 1
    );

    targetDate =
      scheduleFormatDate(
        previousDate
      );

    targetMinutes +=
      24 * 60;
  }


  const targetColumn =
    document.querySelector(
      `[data-schedule-day="${targetDate}"]`
    );


  if (targetColumn) {

    const columnCenter =
      targetColumn.offsetLeft
      + targetColumn.offsetWidth / 2;


    const targetLeft =
      columnCenter
      - shell.clientWidth / 2;


    const maxLeft =
      Math.max(
        0,
        shell.scrollWidth
        - shell.clientWidth
      );


    shell.scrollLeft =
      Math.min(
        maxLeft,
        Math.max(
          0,
          targetLeft
        )
      );
  }


  const calendarStartMinutes =
    scheduleStartHour * 60;


  const calendarEndMinutes =
    scheduleEndHour * 60;


  const clampedMinutes =
    Math.min(
      calendarEndMinutes,
      Math.max(
        calendarStartMinutes,
        targetMinutes
      )
    );


  const currentTop =
    (
      clampedMinutes
      - calendarStartMinutes
    )
    * hourHeight / 60;


  const targetTop =
    currentTop
    - shell.clientHeight / 2;


  const maxTop =
    Math.max(
      0,
      shell.scrollHeight
      - shell.clientHeight
    );


  shell.scrollTop =
    Math.min(
      maxTop,
      Math.max(
        0,
        targetTop
      )
    );
}
