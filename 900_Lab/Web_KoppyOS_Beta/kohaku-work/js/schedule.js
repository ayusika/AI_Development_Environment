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


  if (scheduleStore) {

    const confirmedShift =
      scheduleState.shifts
        .find(
          (shift) =>
            shift.shift_date
            === targetDate
            &&
            shift.status
            === 'confirmed'
        )
      || null;


    if (
      confirmedShift
      &&
      confirmedShift.store_id
    ) {

      scheduleStore.value =
        String(
          confirmedShift.store_id
        );

    } else {

      const sapporoStore =
        Array.from(
          scheduleStore.options
        )
          .find(
            (option) =>
              option.textContent
                ?.trim()
              === '札幌'
          )
        || null;


      if (sapporoStore) {
        scheduleStore.value =
          String(
            sapporoStore.value
          );
      }
    }
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

  loadScheduleSalesMaster();
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


  selectedScheduleCourse =
    null;

  selectedScheduleCourseMaster =
    null;

  selectedScheduleCourseRateId =
    null;

  selectedSchedulePricingCategory =
    'standard';

  selectedScheduleExtensions =
    [];

  selectedCustomerStatus =
    'repeat_unknown_id';


  if (scheduleCustomCourse) {
    scheduleCustomCourse.value = '';
  }


  if (scheduleCourseMasterList) {

    scheduleCourseMasterList.innerHTML = `
      <p class="schedule-master-empty">
        料金を読み込み中…
      </p>
    `;
  }


  if (scheduleExtensionMasterList) {

    scheduleExtensionMasterList.innerHTML =
      '';

    scheduleExtensionMasterList.hidden =
      true;
  }


  updateScheduleCoursePriceSummary();


  if (scheduleStore) {
    scheduleStore.value = '';
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
    .querySelectorAll(
      '[data-customer-status]'
    )
    .forEach((button) => {

      button.classList.toggle(
        'is-selected',
        button.dataset.customerStatus
        === 'repeat_unknown_id'
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

    store_course_id:
      selectedScheduleCourseMaster
        ? Number(
            selectedScheduleCourseMaster
              .store_course_id
          )
        : null,

    extensions:
      selectedScheduleExtensions
        .map((extension) => ({
          store_course_id:
            Number(
              extension.store_course_id
            ),

          quantity:
            Number(
              extension.quantity
              || 1
            ),
        })),

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


  if (scheduleLinkedCustomerPanel) {

    scheduleLinkedCustomerPanel.hidden =
      true;

    scheduleLinkedCustomerPanel.innerHTML =
      '';
  }


  if (scheduleCustomerPanel) {

    scheduleCustomerPanel.hidden =
      true;
  }


  scheduleState.identitySearchVisits =
    [];

  scheduleState.selectedIdentityCandidate =
    null;


  scheduleState.selectedVisit =
    visit;


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


  const preferredCustomerName =
    customerNames.find(
      (nameRecord) =>
        nameRecord.name_type ===
          'nickname'
        && nameRecord.name
    )
    ||
    customerNames.find(
      (nameRecord) =>
        nameRecord.name_type ===
          'kashikoi'
        && nameRecord.name
    )
    ||
    customerNames.find(
      (nameRecord) =>
        nameRecord.name
    );


  const customer =
    preferredCustomerName
      ? `${
          namePrefixes[
            preferredCustomerName.name_type
          ]
          || ''
        }${String(
          preferredCustomerName.name
        )}`
      : (
          visit.customer_name
          || visit.customer_code
          || status
        );


  const visitorTypeLabels = {
    local: '地元',
    travel: '旅行',
    business: '出張',
  };


  const visitorType =
    visitorTypeLabels[
      visit.visitor_type
    ]
    || '不明';


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
        </strong>
      </div>

      <div class="schedule-detail-row">
        <span>区分</span>
        <strong>
          ${escapeHtml(status)}
        </strong>
      </div>

      <div class="schedule-detail-row">
        <span>来訪タイプ</span>

        <select
          id="schedule-visitor-type"
          class="schedule-visitor-type-select"
        >
          <option value=""
            ${!visit.visitor_type ? 'selected' : ''}>
            不明
          </option>

          <option value="local"
            ${visit.visitor_type === 'local' ? 'selected' : ''}>
            地元
          </option>

          <option value="travel"
            ${visit.visitor_type === 'travel' ? 'selected' : ''}>
            旅行
          </option>

          <option value="business"
            ${visit.visitor_type === 'business' ? 'selected' : ''}>
            出張
          </option>
        </select>
      </div>

      <div class="schedule-detail-row">
        <span>OP</span>
        <strong>
          ${escapeHtml(optionText)}
        </strong>
      </div>

    </div>
  `;


  const visitorTypeSelect =
    document.getElementById(
      'schedule-visitor-type'
    );


  if (visitorTypeSelect) {

    visitorTypeSelect.addEventListener(
      'change',
      saveScheduleVisitorType
    );
  }


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


  if (scheduleCustomerCancelButton) {

    scheduleCustomerCancelButton.hidden =
      !Boolean(
        Number(
          visit.customer_linked
        )
      );
  }


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


async function saveScheduleVisitorType() {

  const visit =
    scheduleState.selectedVisit;

  const select =
    document.getElementById(
      'schedule-visitor-type'
    );


  if (!visit || !select) {
    return;
  }


  const previousValue =
    visit.visitor_type
    || '';

  const visitorType =
    select.value;


  select.disabled = true;


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
                Number(visit.id),

              visitor_type:
                visitorType,
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
        || '来訪タイプを保存できませんでした。'
      );
    }


    visit.visitor_type =
      data.visit?.visitor_type
      ?? visitorType;


  } catch (error) {

    select.value =
      previousValue;

    window.alert(
      error.message
    );

  } finally {

    select.disabled =
      false;
  }
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


function getIdentityFeatureLabel(
  featureType
) {

  const labels = {
    age_range: '年代',
    height: '身長',
    body_type: '体格',
    hair: '髪',
    facial_hair: 'ヒゲ',
    glasses: '眼鏡',
    appearance: '見た目',
    lookalike: '似てる人',
    occupation: '職業',
    voice_speech: '声・話し方',
    area: 'エリア',
    hobby_topic: '趣味・話題',
    other: 'その他',
  };


  return (
    labels[featureType]
    || featureType
  );
}

async function loadScheduleIdentityFeatures() {

  const visit =
    scheduleState.selectedVisit;


  if (
    !visit
    || !scheduleIdentityFeatureList
  ) {
    return;
  }


  scheduleIdentityFeatureList.innerHTML =
    '<p>読み込み中...</p>';


  try {

    const response =
      await fetch(
        `${visitIdentityFeaturesApiUrl}?visit_id=${encodeURIComponent(
          visit.id
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
        || '構造化特徴を読み込めませんでした。'
      );
    }


    const features =
      Array.isArray(
        data.data?.features
      )
        ? data.data.features
        : [];


    scheduleState.selectedVisit.identity_features =
      features;


    if (features.length === 0) {

      scheduleIdentityFeatureList.innerHTML =
        '<p>構造化特徴はまだありません。</p>';

      return;
    }


    scheduleIdentityFeatureList.innerHTML =
      features
        .map(
          (feature) => {

            const label =
              getIdentityFeatureLabel(
                feature.feature_type
              );

            const value =
              String(
                feature.feature_value
                ?? ''
              );

            const note =
              feature.note
                ? ` <small>${String(
                    feature.note
                  )}</small>`
                : '';


            return `
              <div class="schedule-identity-feature-item">
                <strong>${label}</strong>
                <span>${value}</span>
                ${note}
              </div>
            `;
          }
        )
        .join('');


  } catch (error) {

    scheduleIdentityFeatureList.innerHTML =
      `<p>${error.message}</p>`;
  }
}


function selectScheduleIdentityCandidate(
  button
) {

  const visitId =
    Number(
      button?.dataset?.visitId
    );


  const currentVisit =
    scheduleState.selectedVisit;


  if (
    !visitId
    || !currentVisit
    || !scheduleIdentitySearchResults
  ) {
    return;
  }


  const candidateVisit =
    scheduleState.identitySearchVisits
      .find(
        (visit) =>
          Number(visit.id)
          === visitId
      );


  if (!candidateVisit) {

    window.alert(
      '候補visitの情報を取得できませんでした。'
    );

    return;
  }


  scheduleState.selectedIdentityCandidate =
    candidateVisit;


  const result =
    button.closest(
      '.schedule-identity-search-result'
    );


  document
    .querySelectorAll(
      '.schedule-identity-search-result'
    )
    .forEach((item) => {

      item.classList.remove(
        'is-selected'
      );
    });


  if (result) {

    result.classList.add(
      'is-selected'
    );
  }


  const customerStatusLabels = {
    new: '新規',
    repeat: 'リピ',
    other_store_repeat: '他店リピ',
    repeat_unknown_id: 'リピ・ID不明',
  };


  const renderFeatures =
    (features) => {

      if (
        !Array.isArray(features)
        || features.length === 0
      ) {
        return 'なし';
      }


      return features
        .map((feature) => {

          const label =
            getIdentityFeatureLabel(
              feature.feature_type
            );


          return `${label}: ${
            feature.feature_value
          }`;
        })
        .join(' / ');
    };


  const currentFeatures =
    Array.isArray(
      currentVisit.identity_features
    )
      ? currentVisit.identity_features
      : [];


  const candidateFeatures =
    Array.isArray(
      candidateVisit.identity_features
    )
      ? candidateVisit.identity_features
      : [];


  let confirmation =
    document.getElementById(
      'schedule-identity-candidate-confirmation'
    );


  if (!confirmation) {

    confirmation =
      document.createElement(
        'div'
      );

    confirmation.id =
      'schedule-identity-candidate-confirmation';

    confirmation.className =
      'schedule-identity-candidate-confirmation';


    scheduleIdentitySearchResults.after(
      confirmation
    );
  }


  confirmation.innerHTML = `
    <div>

      <strong>
        同一人物候補を比較
      </strong>

      <div class="schedule-identity-comparison">

        <section>

          <h4>
            現在の予約
          </h4>

          <p>
            日時：
            ${escapeHtml(
              currentVisit.started_at
              || ''
            )}
          </p>

          <p>
            店舗：
            ${escapeHtml(
              currentVisit.store_name
              || ''
            )}
          </p>

          <p>
            区分：
            ${escapeHtml(
              customerStatusLabels[
                currentVisit.customer_status
              ]
              || currentVisit.customer_status
              || ''
            )}
          </p>

          <p>
            特徴メモ：
            ${escapeHtml(
              currentVisit.customer_features
              || 'なし'
            )}
          </p>

          <p>
            構造化特徴：
            ${escapeHtml(
              renderFeatures(
                currentFeatures
              )
            )}
          </p>

        </section>


        <section>

          <h4>
            候補 visit #${escapeHtml(
              candidateVisit.id
            )}
          </h4>

          <p>
            日時：
            ${escapeHtml(
              candidateVisit.started_at
              || ''
            )}
          </p>

          <p>
            店舗：
            ${escapeHtml(
              candidateVisit.store_name
              || ''
            )}
          </p>

          <p>
            区分：
            ${escapeHtml(
              customerStatusLabels[
                candidateVisit.customer_status
              ]
              || candidateVisit.customer_status
              || ''
            )}
          </p>

          <p>
            顧客紐付け：
            ${
              candidateVisit.customer_id
                ? `customer #${escapeHtml(
                    candidateVisit.customer_id
                  )}`
                : '未紐付け'
            }
          </p>

          <p>
            特徴メモ：
            ${escapeHtml(
              candidateVisit.customer_features
              || 'なし'
            )}
          </p>

          <p>
            構造化特徴：
            ${escapeHtml(
              renderFeatures(
                candidateFeatures
              )
            )}
          </p>

          ${
            candidateVisit.customer_id
              ? `
                <button
                  class="primary-button"
                  type="button"
                  data-action="link-schedule-existing-customer"
                  data-customer-id="${escapeHtml(
                    candidateVisit.customer_id
                  )}"
                >
                  この顧客に紐付ける
                </button>
              `
              : ''
          }

        </section>

      </div>

    </div>
  `;
}

async function searchScheduleIdentity() {

  if (
    !scheduleIdentitySearchKeyword
    || !scheduleIdentitySearchStatus
    || !scheduleIdentitySearchStore
    || !scheduleIdentitySearchResults
  ) {
    return;
  }


  const params =
    new URLSearchParams();


  const keyword =
    scheduleIdentitySearchKeyword.value.trim();

  const customerStatus =
    scheduleIdentitySearchStatus.value;

  const storeId =
    scheduleIdentitySearchStore.value;


  if (keyword !== '') {
    params.set(
      'keyword',
      keyword
    );
  }


  if (customerStatus !== '') {
    params.set(
      'customer_status',
      customerStatus
    );
  }


  if (storeId !== '') {
    params.set(
      'store_id',
      storeId
    );
  }


  scheduleIdentitySearchResults.innerHTML =
    '<p>検索中...</p>';


  try {

    const response =
      await fetch(
        `${customerIdentitySearchApiUrl}?${params.toString()}`
      );


    const data =
      await response.json();


    if (
      !response.ok
      || !data.success
    ) {
      throw new Error(
        data.error
        || 'ID不明客を検索できませんでした。'
      );
    }


    const visits =
      (
        Array.isArray(
          data.data?.visits
        )
          ? data.data.visits
          : []
      )
        .filter(
          (visit) =>
            Number(visit.id)
            !== Number(
              scheduleState.selectedVisit?.id
            )
        );


    scheduleState.identitySearchVisits =
      visits;

    scheduleState.selectedIdentityCandidate =
      null;


    if (visits.length === 0) {

      scheduleIdentitySearchResults.innerHTML =
        '<p>候補は見つかりませんでした。</p>';

      return;
    }


    scheduleIdentitySearchResults.innerHTML =
      visits
        .map((visit) => {

          const features =
            Array.isArray(
              visit.identity_features
            )
              ? visit.identity_features
              : [];


          const featureHtml =
            features.length
              ? features
                  .map((feature) => {

                    const label =
                      getIdentityFeatureLabel(
                        feature.feature_type
                      );

                    return `
                      <span>
                        ${escapeHtml(label)}:
                        ${escapeHtml(
                          feature.feature_value
                        )}
                      </span>
                    `;
                  })
                  .join('')
              : '<span>構造化特徴なし</span>';


          const customerStatusLabels = {
            new: '新規',
            repeat: 'リピ',
            other_store_repeat: '他店リピ',
            repeat_unknown_id: 'リピ・ID不明',
          };


          const statusLabel =
            customerStatusLabels[
              visit.customer_status
            ]
            || visit.customer_status;


          return `
            <article class="schedule-identity-search-result">

              <div>
                <strong>
                  ${escapeHtml(
                    visit.started_at
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    visit.store_name
                    || ''
                  )}
                </span>

                <span>
                  ${escapeHtml(
                    statusLabel
                  )}
                </span>
              </div>

              <div>
                ${featureHtml}
              </div>

              ${
                visit.customer_features
                  ? `
                    <p>
                      ${escapeHtml(
                        visit.customer_features
                      )}
                    </p>
                  `
                  : ''
              }

              <small>
                visit #${escapeHtml(
                  visit.id
                )}
              </small>

              <button
                class="secondary-button"
                type="button"
                data-action="select-schedule-identity-candidate"
                data-visit-id="${escapeHtml(
                  visit.id
                )}"
              >
                この人を確認
              </button>

            </article>
          `;
        })
        .join('');


  } catch (error) {

    scheduleIdentitySearchResults.innerHTML =
      `<p>${escapeHtml(
        error.message
      )}</p>`;
  }
}

async function addScheduleIdentityFeature() {

  const visit =
    scheduleState.selectedVisit;


  if (
    !visit
    || !scheduleIdentityFeatureType
    || !scheduleIdentityFeatureValue
    || !scheduleIdentityFeatureNote
  ) {
    return;
  }


  const featureType =
    scheduleIdentityFeatureType.value;

  const featureValue =
    scheduleIdentityFeatureValue.value.trim();

  const note =
    scheduleIdentityFeatureNote.value.trim();


  if (featureValue === '') {

    window.alert(
      '特徴を入力してね。'
    );

    scheduleIdentityFeatureValue.focus();

    return;
  }


  const addButton =
    document.querySelector(
      '[data-action="add-schedule-identity-feature"]'
    );


  if (addButton) {

    addButton.disabled =
      true;

    addButton.textContent =
      '追加中...';
  }


  try {

    const response =
      await fetch(
        visitIdentityFeaturesApiUrl,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              visit_id:
                Number(
                  visit.id
                ),

              feature_type:
                featureType,

              feature_value:
                featureValue,

              note:
                note,
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
        || '構造化特徴を追加できませんでした。'
      );
    }


    scheduleIdentityFeatureValue.value =
      '';

    scheduleIdentityFeatureNote.value =
      '';


    await loadScheduleIdentityFeatures();


    scheduleIdentityFeatureValue.focus();


  } catch (error) {

    window.alert(
      error.message
    );


  } finally {

    if (addButton) {

      addButton.disabled =
        false;

      addButton.textContent =
        '構造化特徴を追加';
    }
  }
}

async function openScheduleCustomerPanel() {

  const visit =
    scheduleState.selectedVisit;


  if (
    !visit
    || !scheduleCustomerPanel
    || !scheduleLinkedCustomerPanel
  ) {
    return;
  }


  const customerId =
    Number(
      visit.customer_id
      || 0
    );


  if (customerId) {

    scheduleCustomerPanel.hidden =
      true;

    scheduleLinkedCustomerPanel.hidden =
      false;

    scheduleLinkedCustomerPanel.innerHTML =
      '<p>顧客情報を読み込み中...</p>';


    try {

      const response =
        await fetch(
          customersApiUrl,
          {
            method: 'GET',
            cache: 'no-store',
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
          || '顧客情報を取得できませんでした。'
        );
      }


      const customers =
        Array.isArray(
          data.customers
        )
          ? data.customers
          : [];


      const customer =
        customers.find(
          (customerRecord) =>
            Number(
              customerRecord.id
            ) === customerId
        );


      if (!customer) {
        throw new Error(
          '紐付け先の顧客が見つかりませんでした。'
        );
      }


      const names =
        Array.isArray(
          customer.names
        )
          ? customer.names
          : [];


      const primaryName =
        names.find(
          (nameRecord) =>
            Number(
              nameRecord.is_primary
            ) === 1
        )
        || names[0]
        || null;


      const displayName =
        primaryName
          ? String(
              primaryName.name
            )
          : (
              visit.customer_name
              || '名前未登録'
            );


      const findName =
        (nameType) => {

          const nameRecord =
            names.find(
              (record) =>
                record.name_type
                === nameType
            );

          return nameRecord
            ? String(
                nameRecord.name
              )
            : '未登録';
        };


      const visits =
        Array.isArray(
          customer.visits
        )
          ? customer.visits
          : [];


      const identityFeatures =
        Array.isArray(
          customer.identity_features
        )
          ? customer.identity_features
          : [];


      const acquisitionSource =
        customer.acquisition_source
        || null;


      const findIdentityFeature =
        (featureType) => {

          const feature =
            identityFeatures.find(
              (record) =>
                record.feature_type
                === featureType
            );


          return feature
            ? String(
                feature.feature_value
                || ''
              )
            : '';
        };


      const visitHistoryHtml =
        visits.length
          ? visits
              .slice(0, 5)
              .map(
                (customerVisit) => `
                  <details class="schedule-customer-visit-detail">

                    <summary class="schedule-detail-row">

                      <span>
                        ${escapeHtml(
                          String(
                            customerVisit.started_at
                            || '日時未登録'
                          )
                        )}
                      </span>

                      <strong>
                        ${escapeHtml(
                          String(
                            customerVisit.course_minutes
                            || ''
                          )
                        )}${customerVisit.course_minutes
                          ? '分'
                          : ''}
                      </strong>

                    </summary>

                    <div class="schedule-customer-visit-detail-body">

                      <p>
                        <strong>
                          会話メモ
                        </strong>
                        <br>
                        ${escapeHtml(
                          String(
                            customerVisit.conversation_notes
                            || '未登録'
                          )
                        )}
                      </p>

                      <p>
                        <strong>
                          来店メモ
                        </strong>
                        <br>
                        ${escapeHtml(
                          String(
                            customerVisit.visit_notes
                            || '未登録'
                          )
                        )}
                      </p>

                    </div>

                  </details>
                `
              )
              .join('')
          : `
              <p>
                来店履歴はありません。
              </p>
            `;


      scheduleLinkedCustomerPanel.innerHTML = `
        <div class="schedule-detail-card">

          <div class="schedule-detail-row">
            <span>顧客名</span>
            <strong>
              ${escapeHtml(
                displayName
              )}
            </strong>
          </div>

          <div class="schedule-detail-row">
            <span>顧客ID</span>
            <strong>
              #${escapeHtml(
                String(customerId)
              )}
            </strong>
          </div>

          <div class="schedule-detail-row">
            <span>顧客コード</span>
            <strong>
              ${escapeHtml(
                String(
                  customer.customer_code
                  || '未登録'
                )
              )}
            </strong>
          </div>

          <div class="schedule-detail-row">
            <span>来店</span>
            <strong>
              ${escapeHtml(
                String(
                  customer.visit_count
                  || 0
                )
              )}回
            </strong>
          </div>

          <div class="schedule-detail-row">
            <span>予約中</span>
            <strong>
              ${escapeHtml(
                String(
                  customer.scheduled_count
                  || 0
                )
              )}件
            </strong>
          </div>

        </div>


        <div class="schedule-detail-card">

          <label>
            <span>呼び名</span>
            <input
              type="text"
              data-customer-name-input="nickname"
              value="${escapeHtml(
                findName('nickname') === '未登録'
                  ? ''
                  : findName('nickname')
              )}"
              placeholder="呼び名"
            >
          </label>

          <label>
            <span>カシコイ</span>
            <input
              type="text"
              data-customer-name-input="kashikoi"
              value="${escapeHtml(
                findName('kashikoi') === '未登録'
                  ? ''
                  : findName('kashikoi')
              )}"
              placeholder="カシコイ名"
            >
          </label>

          <label>
            <span>オキニトーク</span>
            <input
              type="text"
              data-customer-name-input="okini_talk"
              value="${escapeHtml(
                findName('okini_talk') === '未登録'
                  ? ''
                  : findName('okini_talk')
              )}"
              placeholder="オキニトーク名"
            >
          </label>

          <label>
            <span>LINE</span>
            <input
              type="text"
              data-customer-name-input="line"
              value="${escapeHtml(
                findName('line') === '未登録'
                  ? ''
                  : findName('line')
              )}"
              placeholder="LINE名"
            >
          </label>

          <label>
            <span>X</span>
            <input
              type="text"
              data-customer-name-input="x"
              value="${escapeHtml(
                findName('x') === '未登録'
                  ? ''
                  : findName('x')
              )}"
              placeholder="X名"
            >
          </label>

          <label>
            <span>Instagram</span>
            <input
              type="text"
              data-customer-name-input="instagram"
              value="${escapeHtml(
                findName('instagram') === '未登録'
                  ? ''
                  : findName('instagram')
              )}"
              placeholder="Instagram名"
            >
          </label>

          <div class="schedule-customer-actions">

            <button
              class="secondary-button"
              type="button"
              data-action="save-schedule-customer-names"
              data-customer-id="${escapeHtml(
                String(customerId)
              )}"
            >
              名義情報を保存
            </button>

          </div>

        </div>


        <div class="schedule-detail-card">

          <strong>
            初回流入元
          </strong>

          <label>
            <span>きっかけ</span>

            <select
              id="schedule-customer-acquisition-source"
            >
              <option value="unknown"
                ${!acquisitionSource || acquisitionSource.source_type === 'unknown' ? 'selected' : ''}>
                不明
              </option>

              <option value="heaven"
                ${acquisitionSource?.source_type === 'heaven' ? 'selected' : ''}>
                ヘブン
              </option>

              <option value="x"
                ${acquisitionSource?.source_type === 'x' ? 'selected' : ''}>
                X
              </option>

              <option value="instagram"
                ${acquisitionSource?.source_type === 'instagram' ? 'selected' : ''}>
                Instagram
              </option>

              <option value="okini_talk"
                ${acquisitionSource?.source_type === 'okini_talk' ? 'selected' : ''}>
                オキニトーク
              </option>

              <option value="store_site"
                ${acquisitionSource?.source_type === 'store_site' ? 'selected' : ''}>
                店舗サイト
              </option>

              <option value="referral"
                ${acquisitionSource?.source_type === 'referral' ? 'selected' : ''}>
                紹介
              </option>

              <option value="review"
                ${acquisitionSource?.source_type === 'review' ? 'selected' : ''}>
                口コミ
              </option>

              <option value="store_route"
                ${acquisitionSource?.source_type === 'store_route' ? 'selected' : ''}>
                店舗経由
              </option>

              <option value="other"
                ${acquisitionSource?.source_type === 'other' ? 'selected' : ''}>
                その他
              </option>
            </select>
          </label>

          <label>
            <span>補足</span>

            <input
              id="schedule-customer-acquisition-detail"
              type="text"
              value="${escapeHtml(
                String(
                  acquisitionSource?.source_detail
                  || ''
                )
              )}"
              placeholder="例：Xの投稿を見た、友人○○さんの紹介"
            >
          </label>

          <div class="schedule-customer-actions">

            <button
              class="secondary-button"
              type="button"
              data-action="save-schedule-customer-acquisition-source"
              data-customer-id="${escapeHtml(
                String(customerId)
              )}"
            >
              初回流入元を保存
            </button>

          </div>

        </div>


        <div class="schedule-detail-card">

          <strong>
            顧客メモ
          </strong>

          <textarea
            id="schedule-customer-general-notes"
            rows="4"
            maxlength="2000"
            placeholder="顧客全体に残したいメモ"
          >${escapeHtml(
            String(
              customer.general_notes
              || ''
            )
          )}</textarea>

          <div class="schedule-customer-actions">

            <button
              class="secondary-button"
              type="button"
              data-action="save-schedule-customer-general-notes"
              data-customer-id="${escapeHtml(
                String(customerId)
              )}"
            >
              顧客メモを保存
            </button>

          </div>

        </div>


        <div class="schedule-detail-card">

          <strong>
            顧客特徴
          </strong>

          <label>
            <span>年代</span>
            <input
              type="text"
              data-customer-feature-input="age_range"
              value="${escapeHtml(
                findIdentityFeature(
                  'age_range'
                )
              )}"
              placeholder="例：40代"
            >
          </label>

          <label>
            <span>身長</span>
            <input
              type="text"
              data-customer-feature-input="height"
              value="${escapeHtml(
                findIdentityFeature(
                  'height'
                )
              )}"
              placeholder="例：170cmくらい"
            >
          </label>

          <label>
            <span>体格</span>
            <input
              type="text"
              data-customer-feature-input="body_type"
              value="${escapeHtml(
                findIdentityFeature(
                  'body_type'
                )
              )}"
              placeholder="例：少し太め"
            >
          </label>

          <label>
            <span>髪</span>
            <input
              type="text"
              data-customer-feature-input="hair"
              value="${escapeHtml(
                findIdentityFeature(
                  'hair'
                )
              )}"
              placeholder="髪型・髪色など"
            >
          </label>

          <label>
            <span>ヒゲ</span>
            <input
              type="text"
              data-customer-feature-input="facial_hair"
              value="${escapeHtml(
                findIdentityFeature(
                  'facial_hair'
                )
              )}"
              placeholder="例：口ひげ"
            >
          </label>

          <label>
            <span>眼鏡</span>
            <input
              type="text"
              data-customer-feature-input="glasses"
              value="${escapeHtml(
                findIdentityFeature(
                  'glasses'
                )
              )}"
              placeholder="眼鏡の特徴"
            >
          </label>

          <label>
            <span>見た目</span>
            <input
              type="text"
              data-customer-feature-input="appearance"
              value="${escapeHtml(
                findIdentityFeature(
                  'appearance'
                )
              )}"
              placeholder="その他の見た目"
            >
          </label>

          <label>
            <span>似てる人</span>
            <input
              type="text"
              data-customer-feature-input="lookalike"
              value="${escapeHtml(
                findIdentityFeature(
                  'lookalike'
                )
              )}"
              placeholder="似ている人"
            >
          </label>

          <label>
            <span>職業</span>
            <input
              type="text"
              data-customer-feature-input="occupation"
              value="${escapeHtml(
                findIdentityFeature(
                  'occupation'
                )
              )}"
              placeholder="例：建築系"
            >
          </label>

          <label>
            <span>声・話し方</span>
            <input
              type="text"
              data-customer-feature-input="voice_speech"
              value="${escapeHtml(
                findIdentityFeature(
                  'voice_speech'
                )
              )}"
              placeholder="例：声低め"
            >
          </label>
