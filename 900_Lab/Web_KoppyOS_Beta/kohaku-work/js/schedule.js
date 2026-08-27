// WRITER:WORK_SCHEDULE_LOGIC:START

/* ========================================
   WORK SCHEDULE
======================================== */

const scheduleApiUrl =
  '/api/v1/schedule.php';

const scheduleShiftsApiUrl =
  '/api/v1/shifts.php';

const visitIdentityFeaturesApiUrl =
  '/api/v1/visit-identity-features.php';

const customerIdentitySearchApiUrl =
  '/api/v1/customer-identity-search.php';

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

const scheduleCourseMasterList =
  document.getElementById(
    'schedule-course-master-list'
  );

const scheduleExtensionMasterList =
  document.getElementById(
    'schedule-extension-master-list'
  );

const scheduleCoursePriceSummary =
  document.getElementById(
    'schedule-course-price-summary'
  );

const scheduleOptionGrid =
  document.getElementById(
    'schedule-option-grid'
  );

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

const scheduleCustomerCancelButton =
  document.getElementById(
    'schedule-customer-cancel-button'
  );

const scheduleCustomerCancelPanel =
  document.getElementById(
    'schedule-customer-cancel-panel'
  );

const scheduleCustomerCancelReason =
  document.getElementById(
    'schedule-customer-cancel-reason'
  );

const scheduleLinkedCustomerPanel =
  document.getElementById(
    'schedule-linked-customer-panel'
  );

const scheduleCustomerPanel =
  document.getElementById(
    'schedule-customer-panel'
  );

const scheduleCustomerName =
  document.getElementById(
    'schedule-customer-name'
  );

const scheduleCustomerFeatures =
  document.getElementById(
    'schedule-customer-features'
  );

const scheduleIdentityFeatureType =
  document.getElementById(
    'schedule-identity-feature-type'
  );

const scheduleIdentityFeatureValue =
  document.getElementById(
    'schedule-identity-feature-value'
  );

const scheduleIdentityFeatureNote =
  document.getElementById(
    'schedule-identity-feature-note'
  );

const scheduleIdentityFeatureList =
  document.getElementById(
    'schedule-identity-feature-list'
  );

const scheduleIdentitySearchKeyword =
  document.getElementById(
    'schedule-identity-search-keyword'
  );

const scheduleIdentitySearchStatus =
  document.getElementById(
    'schedule-identity-search-status'
  );

const scheduleIdentitySearchStore =
  document.getElementById(
    'schedule-identity-search-store'
  );

const scheduleIdentitySearchResults =
  document.getElementById(
    'schedule-identity-search-results'
  );


const scheduleState = {
  view: 'two-weeks',
  anchorDate: null,
  visits: [],
  shifts: [],
  selectedVisit: null,
  identitySearchVisits: [],
  selectedIdentityCandidate: null,
};


const scheduleStartHour = 11;
const scheduleEndHour = 27;

const scheduleZoom = {
  minHourHeight: 54,
  maxHourHeight: 150,
  step: 6,
};

let selectedScheduleCourse = 90;

let selectedScheduleCourseRateId = null;

let selectedScheduleCourseMaster = null;

let selectedSchedulePricingCategory =
  'standard';

let selectedScheduleExtensions = [];

let scheduleSalesMaster = {
  store: null,
  courses: [],
  options: [],
  dailyFeeRule: null,
};

let selectedCustomerStatus =
  'repeat_unknown_id';


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


function formatScheduleMoney(
  value
) {

  if (
    value === null
    || value === undefined
    || value === ''
  ) {
    return '未確認';
  }


  return `¥${Number(value).toLocaleString('ja-JP')}`;
}


function renderScheduleSalesMaster() {

  const selectedOptionNames =
    Array.from(
      document.querySelectorAll(
        '[data-schedule-option]:checked'
      )
    )
      .map((input) =>
        String(input.value)
      );


  const courses =
    Array.isArray(
      scheduleSalesMaster.courses
    )
      ? scheduleSalesMaster.courses
      : [];

  const options =
    Array.isArray(
      scheduleSalesMaster.options
    )
      ? scheduleSalesMaster.options
      : [];


  const regularCourses =
    courses
      .filter(
        (course) =>
          course.course_type
          === 'regular'
      )
      .sort((a, b) => {

        const categoryOrder = {
          standard: 0,
          foreign: 1,
        };

        const categoryDifference =
          (
            categoryOrder[
              a.pricing_category
            ]
            ?? 99
          )
          -
          (
            categoryOrder[
              b.pricing_category
            ]
            ?? 99
          );

        if (categoryDifference !== 0) {
          return categoryDifference;
        }

        return (
          Number(a.course_minutes)
          - Number(b.course_minutes)
        );
      });

  const standardCourses =
    regularCourses.filter(
      (course) =>
        course.pricing_category
        === 'standard'
    );

  const foreignCourses =
    regularCourses.filter(
      (course) =>
        course.pricing_category
        === 'foreign'
    );


  const extensionCourses =
    courses.filter(
      (course) =>
        course.course_type
        === 'extension'
    );


  if (scheduleCourseMasterList) {

    if (regularCourses.length === 0) {

      scheduleCourseMasterList.innerHTML = `
        <p class="schedule-master-empty">
          この店舗のコース料金は未登録です。
        </p>
      `;

    } else {

      const renderCourseButtons =
        (courseList) =>
          courseList
            .map((course) => {

              const isSelected =
                Number(
                  selectedScheduleCourseRateId
                )
                === Number(
                  course.store_course_rate_id
                );

              return `
                <button
                  class="
                    schedule-master-course-button
                    ${isSelected ? 'is-selected' : ''}
                  "
                  type="button"
                  data-schedule-master-course
                  data-course-rate-id="${Number(
                    course.store_course_rate_id
                  )}"
                >
                  <strong>
                    ${escapeHtml(
                      course.pricing_category
                        === 'foreign'
                        ? `外${Number(
                            course.course_minutes
                          )}分`
                        : `${Number(
                            course.course_minutes
                          )}分`
                    )}
                  </strong>

                  <small>
                    手取り
                    ${escapeHtml(
                      formatScheduleMoney(
                        course.take_home
                      )
                    )}
                  </small>
                </button>
              `;
            })
            .join('');


      const activeCourseList =
        selectedSchedulePricingCategory
          === 'foreign'
          ? foreignCourses
          : standardCourses;


      scheduleCourseMasterList.innerHTML = `
        ${
          foreignCourses.length
            ? `
              <div
                class="schedule-course-category-tabs"
              >
                <button
                  class="
                    schedule-course-category-tab
                    ${
                      selectedSchedulePricingCategory
                        === 'standard'
                        ? 'is-selected'
                        : ''
                    }
                  "
                  type="button"
                  data-schedule-course-category="standard"
                >
                  通常
                </button>

                <button
                  class="
                    schedule-course-category-tab
                    ${
                      selectedSchedulePricingCategory
                        === 'foreign'
                        ? 'is-selected'
                        : ''
                    }
                  "
                  type="button"
                  data-schedule-course-category="foreign"
                >
                  外国人
                </button>
              </div>
            `
            : ''
        }

        <div class="schedule-course-section">
          <div class="schedule-course-grid">
            ${renderCourseButtons(
              activeCourseList
            )}
          </div>
        </div>
      `;
    }
  }


  if (scheduleExtensionMasterList) {

    if (extensionCourses.length === 0) {

      scheduleExtensionMasterList.innerHTML =
        '';

      scheduleExtensionMasterList.hidden =
        true;

    } else {

      scheduleExtensionMasterList.hidden =
        false;

      scheduleExtensionMasterList.innerHTML =
        extensionCourses
          .map((course) => {

            const selectedExtension =
              selectedScheduleExtensions
                .find(
                  (extension) =>
                    Number(
                      extension.store_course_id
                    )
                    === Number(
                      course.store_course_id
                    )
                )
              || null;

            const quantity =
              selectedExtension
                ? Number(
                    selectedExtension.quantity
                    || 1
                  )
                : 0;

            const isSelected =
              quantity > 0;

            return `
            <button
              class="
                schedule-master-extension-button
                ${isSelected ? 'is-selected' : ''}
              "
              type="button"
              data-schedule-extension-course
              data-course-rate-id="${Number(
                course.store_course_rate_id
              )}"
              data-store-course-id="${Number(
                course.store_course_id
              )}"
            >
              <strong>
                ${escapeHtml(
                  String(
                    course.course_name
                  )
                )}
              </strong>

              <small>
                ${escapeHtml(
                  formatScheduleMoney(
                    course.take_home
                  )
                )}
              </small>

              ${
                isSelected
                  ? `
                    <span
                      class="schedule-extension-quantity"
                    >
                      <span
                        data-schedule-extension-minus
                      >
                        −
                      </span>

                      <strong>
                        ${quantity}
                      </strong>

                      <span
                        data-schedule-extension-plus
                      >
                        ＋
                      </span>
                    </span>
                  `
                  : `
                    <span
                      data-schedule-extension-add
                    >
                      ＋追加
                    </span>
                  `
              }
            </button>
          `;
          })
          .join('');
    }
  }


  if (scheduleOptionGrid) {

    if (options.length === 0) {

      scheduleOptionGrid.innerHTML = `
        <p class="schedule-master-empty">
          この店舗のOP料金は未登録です。
        </p>
      `;

    } else {

      scheduleOptionGrid.innerHTML =
        options
          .map((option) => `
            <label class="schedule-option-choice">
              <input
                type="checkbox"
                value="${escapeHtml(
                  String(option.name)
                )}"
                data-schedule-option
                data-option-rate-id="${Number(
                  option.store_option_rate_id
                )}"
                data-option-price="${Number(
                  option.price
                )}"
                data-option-take-home="${Number(
                  option.take_home
                )}"
              >

              <span>
                ${escapeHtml(
                  String(option.name)
                )}

                <small>
                  ${escapeHtml(
                    formatScheduleMoney(
                      option.take_home
                    )
                  )}
                </small>
              </span>
            </label>
          `)
          .join('');


      scheduleOptionGrid
        .querySelectorAll(
          '[data-schedule-option]'
        )
        .forEach((input) => {

          input.checked =
            selectedOptionNames.includes(
              String(input.value)
            );
        });
    }
  }


  updateScheduleCoursePriceSummary();
}


function updateScheduleCoursePriceSummary() {

  if (!scheduleCoursePriceSummary) {
    return;
  }


  if (!selectedScheduleCourseMaster) {

    scheduleCoursePriceSummary.innerHTML = `
      <span>
        基本料金
        <strong>未選択</strong>
      </span>

      <span>
        コース手取り
        <strong>未選択</strong>
      </span>
    `;

    return;
  }


  scheduleCoursePriceSummary.innerHTML = `
    <span>
      基本料金
      <strong>
        ${escapeHtml(
          formatScheduleMoney(
            selectedScheduleCourseMaster
              .base_price
          )
        )}
      </strong>
    </span>

    <span>
      コース手取り
      <strong>
        ${escapeHtml(
          formatScheduleMoney(
            selectedScheduleCourseMaster
              .take_home
          )
        )}
      </strong>
    </span>
  `;
}


async function loadScheduleSalesMaster() {

  if (
    !scheduleStore
    || !scheduleFormDate
    || !scheduleStartTime
  ) {
    return;
  }


  const storeId =
    Number(
      scheduleStore.value
    );

  const date =
    scheduleFormDate.value;

  const time =
    scheduleStartTime.value;


  if (
    !storeId
    || !date
    || !time
  ) {
    return;
  }


  const params =
    new URLSearchParams({
      store_id:
        String(storeId),

      at:
        `${date} ${time}:00`,
    });


  try {

    const response =
      await fetch(
        `/api/v1/sales-master.php?${params.toString()}`
      );


    const data =
      await response.json();


    if (
      !response.ok
      || !data.success
    ) {

      throw new Error(
        data.error
        || '料金マスタを取得できませんでした。'
      );
    }


    scheduleSalesMaster = {
      store:
        data.store
        || null,

      courses:
        Array.isArray(data.courses)
          ? data.courses
          : [],

      options:
        Array.isArray(data.options)
          ? data.options
          : [],

      dailyFeeRule:
        data.daily_fee_rule
        || null,
    };


    const selectedStoreCourseId =
      Number(
        selectedScheduleCourseMaster
          ?.store_course_id
        || 0
      );


    const matchingCourseById =
      selectedStoreCourseId > 0
        ? scheduleSalesMaster.courses.find(
            (course) =>
              Number(
                course.store_course_id
              )
              === selectedStoreCourseId
              && course.course_type
                === 'regular'
          )
        : null;


    const matchingCourse =
      matchingCourseById
      || scheduleSalesMaster.courses.find(
        (course) =>
          Number(
            course.course_minutes
          )
          === Number(
            selectedScheduleCourse
          )
          && course.course_type
            === 'regular'
          && course.pricing_category
            === 'standard'
      )
      || null;


    selectedScheduleCourseMaster =
      matchingCourse;

    selectedScheduleCourseRateId =
      matchingCourse
        ? Number(
            matchingCourse.store_course_rate_id
          )
        : null;


    if (
      matchingCourse
      && (
        matchingCourse.pricing_category
        === 'standard'
        || matchingCourse.pricing_category
        === 'foreign'
      )
    ) {
      selectedSchedulePricingCategory =
        matchingCourse.pricing_category;
    }


    renderScheduleSalesMaster();


  } catch (error) {

    scheduleSalesMaster = {
      store: null,
      courses: [],
      options: [],
      dailyFeeRule: null,
    };

    selectedScheduleCourseMaster =
      null;

    selectedScheduleCourseRateId =
      null;


    console.error(
      'Failed to load sales master:',
      error
    );
  }
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


if (scheduleStore) {

  scheduleStore.addEventListener(
    'change',
    () => {
      loadScheduleSalesMaster();
    }
  );
}


if (scheduleFormDate) {

  scheduleFormDate.addEventListener(
    'change',
    () => {
      loadScheduleSalesMaster();
    }
  );
}


if (scheduleStartTime) {

  scheduleStartTime.addEventListener(
    'change',
    () => {
      loadScheduleSalesMaster();
    }
  );
}


if (scheduleCourseMasterList) {

  scheduleCourseMasterList.addEventListener(
    'click',
    (event) => {

      const categoryButton =
        event.target.closest(
          '[data-schedule-course-category]'
        );


      if (categoryButton) {

        selectedSchedulePricingCategory =
          categoryButton.dataset
            .scheduleCourseCategory;

        renderScheduleSalesMaster();

        return;
      }


      const button =
        event.target.closest(
          '[data-schedule-master-course]'
        );

      if (!button) {
        return;
      }


      const courseRateId =
        Number(
          button.dataset.courseRateId
        );


      const course =
        scheduleSalesMaster.courses.find(
          (item) =>
            Number(
              item.store_course_rate_id
            )
            === courseRateId
        )
        || null;


      if (!course) {
        return;
      }


      selectedScheduleCourseMaster =
        course;

      selectedScheduleCourseRateId =
        courseRateId;

      selectedScheduleCourse =
        Number(
          course.course_minutes
        );


      if (scheduleCustomCourse) {
        scheduleCustomCourse.value = '';
      }


      scheduleCourseMasterList
        .querySelectorAll(
          '[data-schedule-master-course]'
        )
        .forEach((item) => {

          item.classList.toggle(
            'is-selected',
            Number(
              item.dataset.courseRateId
            )
            === courseRateId
          );
        });


      updateScheduleCoursePriceSummary();
    }
  );
}


if (scheduleExtensionMasterList) {

  scheduleExtensionMasterList.addEventListener(
    'click',
    (event) => {

      const button =
        event.target.closest(
          '[data-schedule-extension-course]'
        );

      if (!button) {
        return;
      }


      const storeCourseId =
        Number(
          button.dataset.storeCourseId
        );


      if (storeCourseId <= 0) {
        return;
      }


      const existingIndex =
        selectedScheduleExtensions
          .findIndex(
            (extension) =>
              Number(
                extension.store_course_id
              )
              === storeCourseId
          );


      const addButton =
        event.target.closest(
          '[data-schedule-extension-add]'
        );

      const plusButton =
        event.target.closest(
          '[data-schedule-extension-plus]'
        );

      const minusButton =
        event.target.closest(
          '[data-schedule-extension-minus]'
        );


      if (
        addButton
        && existingIndex < 0
      ) {

        selectedScheduleExtensions.push({
          store_course_id:
            storeCourseId,

          quantity: 1,
        });

      } else if (
        plusButton
        && existingIndex >= 0
      ) {

        selectedScheduleExtensions[
          existingIndex
        ].quantity += 1;

      } else if (
        minusButton
        && existingIndex >= 0
      ) {

        const currentQuantity =
          Number(
            selectedScheduleExtensions[
              existingIndex
            ].quantity
            || 1
          );


        if (currentQuantity <= 1) {

          selectedScheduleExtensions.splice(
            existingIndex,
            1
          );

        } else {

          selectedScheduleExtensions[
            existingIndex
          ].quantity =
            currentQuantity - 1;
        }

      } else {

        return;
      }


      renderScheduleSalesMaster();
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


      if (value <= 0) {
        return;
      }


      selectedScheduleCourse =
        value;

      selectedScheduleCourseMaster =
        null;

      selectedScheduleCourseRateId =
        null;


      if (scheduleCourseMasterList) {

        scheduleCourseMasterList
          .querySelectorAll(
            '[data-schedule-master-course]'
          )
          .forEach((button) => {

            button.classList.remove(
              'is-selected'
            );
          });
      }


      updateScheduleCoursePriceSummary();
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


    const saveCustomerGeneralNotesButton =
      event.target.closest(
        '[data-action="save-schedule-customer-general-notes"]'
      );

    if (saveCustomerGeneralNotesButton) {

      saveScheduleCustomerGeneralNotes(
        saveCustomerGeneralNotesButton
      );

      return;
    }


    const saveCustomerNamesButton =
      event.target.closest(
        '[data-action="save-schedule-customer-names"]'
      );

    if (saveCustomerNamesButton) {

      saveScheduleCustomerNames(
        saveCustomerNamesButton
      );

      return;
    }


    const saveCustomerAcquisitionSourceButton =
      event.target.closest(
        '[data-action="save-schedule-customer-acquisition-source"]'
      );

    if (saveCustomerAcquisitionSourceButton) {

      saveScheduleCustomerAcquisitionSource(
        saveCustomerAcquisitionSourceButton
      );

      return;
    }


    const saveCustomerIdentityFeaturesButton =
      event.target.closest(
        '[data-action="save-schedule-customer-identity-features"]'
      );

    if (saveCustomerIdentityFeaturesButton) {

      saveScheduleCustomerIdentityFeatures(
        saveCustomerIdentityFeaturesButton
      );

      return;
    }


    const featureButton =
      event.target.closest(
        '[data-schedule-feature]'
      );

    if (featureButton) {

      if (
        featureButton.hasAttribute(
          'data-action'
        )
      ) {
        return;
      }


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


    const shiftParams =
      new URLSearchParams({
        date_from:
          period.start,

        date_to:
          period.end,
      });


    const shiftResponse =
      await fetch(
        `${scheduleShiftsApiUrl}?${shiftParams.toString()}`
      );


    const shiftData =
      await shiftResponse.json();


    if (
      !shiftResponse.ok
      || !shiftData.success
    ) {
      throw new Error(
        shiftData.error
        || '確定シフトの取得に失敗しました。'
      );
    }


    scheduleState.shifts =
      Array.isArray(
        shiftData.shifts
      )
        ? shiftData.shifts.filter(
            (shift) =>
              (
                shift.status
                === 'confirmed'
                ||
                shift.status
                === 'off'
              )
              &&
              Number(
                shift.is_reservation_owner
              )
              === 1
          )
        : [];


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


        const dayShift =
          scheduleState.shifts
            .find(
              (shift) =>
                shift.shift_date
                === date
            )
          || null;


        const isOff =
          dayShift?.status
          === 'off';


        return `
          <div
            class="
              schedule-day-column
              ${isToday ? 'is-today' : ''}
              ${isOff ? 'is-off' : ''}
            "
            data-schedule-day="${date}"
            style="height:${totalHeight}px"
          >
            ${renderScheduleSlots(
              date,
              totalHeight,
              hourHeight
            )}

            ${
              isOff
                ? `
                  <div class="schedule-day-off-label">
                    休み
                  </div>
                `
                : renderScheduleShiftForDate(
                    date,
                    hourHeight
                  )
            }

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


function renderScheduleShiftForDate(
  date,
  hourHeight
) {

  const shift =
    scheduleState.shifts
      .find(
        (item) =>
          item.shift_date
          === date
      )
    || null;


  if (
    !shift
    || !shift.start_at
    || !shift.end_at
  ) {
    return '';
  }


  const startHour =
    Number(
      String(
        shift.start_at
      ).slice(
        11,
        13
      )
    );

  const startMinute =
    Number(
      String(
        shift.start_at
      ).slice(
        14,
        16
      )
    );


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
    Number(
      String(
        shift.end_at
      ).slice(
        14,
        16
      )
    );


  if (
    endDate > startDate
  ) {
    endHour += 24;
  }


  const startTotalMinutes =
    startHour * 60
    + startMinute;

  const endTotalMinutes =
    endHour * 60
    + endMinute;


  const calendarStartMinutes =
    scheduleStartHour * 60;

  const calendarEndMinutes =
    scheduleEndHour * 60;


  const visibleStart =
    Math.max(
      startTotalMinutes,
      calendarStartMinutes
    );

  const visibleEnd =
    Math.min(
      endTotalMinutes,
      calendarEndMinutes
    );


  if (
    visibleEnd
    <= visibleStart
  ) {
    return '';
  }


  const top =
    (
      visibleStart
      - calendarStartMinutes
    )
    * hourHeight
    / 60;


  const height =
    (
      visibleEnd
      - visibleStart
    )
    * hourHeight
    / 60;


  return `
    <div
      class="schedule-shift-band"
      style="
        top:${top}px;
        height:${height}px;
      "
    >
      <span>
        確定シフト
      </span>

      <strong>
        ${escapeHtml(
          shift.store_name
          || ''
        )}
      </strong>
    </div>
  `;
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

      if (
        visit.status === 'cancelled'
      ) {
        return false;
      }


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

  const extensionMinutes =
    (
      Array.isArray(
        visit.extensions
      )
        ? visit.extensions
        : []
    )
      .reduce(
        (
          total,
          extension
        ) =>
          total
          + (
              Number(
                extension.course_minutes
                || 0
              )
              * Number(
                  extension.quantity
                  || 1
                )
            ),
        0
      );


  const duration =
    Math.max(
      10,
      Number(
        visit.course_minutes
        || 0
      )
      + extensionMinutes
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


  const customerNames =
    Array.isArray(
      visit.customer_names
    )
      ? visit.customer_names
      : [];


  const namePrefixes = {
    nickname: '',
    kashikoi: 'カ:',
    okini_talk: 'オ:',
    line: 'L:',
    x: 'X:',
    instagram: 'I:',
  };


  const customerNameParts =
    customerNames
      .filter(
        (nameRecord) =>
          nameRecord.name
          && Object.prototype.hasOwnProperty.call(
            namePrefixes,
            nameRecord.name_type
          )
      )
      .map((nameRecord) => {

        const prefix =
          namePrefixes[
            nameRecord.name_type
          ];

        return `${prefix}${String(
          nameRecord.name
        )}`;
      });


  const customer =
    customerNameParts.length
      ? customerNameParts.join(' / ')
      : (
          visit.customer_name
          || visit.customer_code
          || status
        );


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
          ${
            visit.pricing_category
              === 'foreign'
              ? `外${Number(
                  visit.course_minutes
                )}分`
              : `${Number(
                  visit.course_minutes
                )}分`
          }
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
