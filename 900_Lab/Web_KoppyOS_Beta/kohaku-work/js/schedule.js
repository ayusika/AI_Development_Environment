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
