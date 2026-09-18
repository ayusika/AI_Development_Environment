(() => {
  "use strict";

  const views = [...document.querySelectorAll("[data-view]")];
  const navs = [...document.querySelectorAll("[data-nav]")];

  let multiTouchActive = false;
  let suppressNavigationUntil = 0;

  const noteMultiTouch = event => {
    if (
      event.touches
      && event.touches.length > 1
    ) {
      multiTouchActive = true;
      suppressNavigationUntil =
        Date.now() + 700;
    }
  };

  const finishMultiTouch = event => {
    if (
      multiTouchActive
      && (
        !event.touches
        || event.touches.length < 2
      )
    ) {
      multiTouchActive = false;
      suppressNavigationUntil =
        Date.now() + 700;
    }
  };

  document.addEventListener(
    "touchstart",
    noteMultiTouch,
    {
      capture:true,
      passive:true,
    }
  );

  document.addEventListener(
    "touchmove",
    noteMultiTouch,
    {
      capture:true,
      passive:true,
    }
  );

  document.addEventListener(
    "touchend",
    finishMultiTouch,
    {
      capture:true,
      passive:true,
    }
  );

  document.addEventListener(
    "touchcancel",
    finishMultiTouch,
    {
      capture:true,
      passive:true,
    }
  );

  document.addEventListener(
    "click",
    event => {
      if (
        Date.now()
        >= suppressNavigationUntil
      ) {
        return;
      }

      const navigation =
        event.target.closest(
          "[data-nav], [data-next-view], a[href]"
        );

      if (!navigation) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true
  );

  const navForView = {
    home: "home",
    diary: "diary",
    "nukinavi-create": "diary",
    "heaven-diary": "diary",
    "heaven-settings": "diary",
    "diary-edit": "diary",
    "post-prep": "diary",
    schedule: "schedule",
    "heaven-create": "schedule",
    shift: "shift",
    customers: "customers",
    "customer-detail": "customers",
    sales: "sales",
    database: "home",
    placeholder: "koppy",
  };

  function showView(name) {
    const target = views.find(
      view => view.dataset.view === name
    );

    if (!target) return;

    views.forEach(view => {
      const active = view === target;
      view.hidden = !active;
      view.classList.toggle("is-active", active);
    });

    const activeNav = navForView[name] || "home";

    navs.forEach(nav => {
      nav.classList.toggle(
        "is-active",
        nav.dataset.nav === activeNav
      );
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    if (
      name !== "schedule"
    ) {
      window.KohakuWorkNextSchedule?.closeDetail?.();
    }

    if (
      name === "schedule"
    ) {
      const loadSchedule =
        window.KohakuWorkNextSchedule?.load;

      if (
        typeof loadSchedule === "function"
      ) {
        void loadSchedule();
      }
    }
  }

  window.KoppyWorldFrameRefreshState
    ?.register?.(
      "kohaku-work-next",
      {
        capture: () => {
          const active =
            views.find(
              view =>
                !view.hidden
                && view.classList.contains(
                  "is-active"
                )
            )
            || views.find(
              view => !view.hidden
            )
            || null;

          return {
            view:
              active?.dataset.view
              || "home",
          };
        },

        restore: saved => {
          const name =
            String(
              saved?.view || ""
            );

          if (
            name
            && views.some(
              view =>
                view.dataset.view
                === name
            )
          ) {
            showView(name);
          }
        },
      }
    );

  document.addEventListener("click", event => {
    const nav = event.target.closest("[data-nav]");

    if (nav) {
      showView(
        nav.dataset.nav === "koppy"
          ? "placeholder"
          : nav.dataset.nav
      );
      return;
    }

    const direct = event.target.closest("[data-next-view]");

    if (direct) {
      showView(direct.dataset.nextView);
    }
  });

  /* ========================================
     PHASE 2A / PRODUCTION READ ONLY
  ======================================== */

  const productionScheduleApi =
    "/api/v1/schedule.php";

  const productionShiftsApi =
    "/api/v1/shifts.php";

  const productionSalesApi =
    "/api/v1/sales.php";


  function todayLocalDate() {
    const now =
      new Date();

    return [
      now.getFullYear(),

      String(
        now.getMonth() + 1
      ).padStart(2, "0"),

      String(
        now.getDate()
      ).padStart(2, "0"),
    ].join("-");
  }


  function readOnlyText(
    id,
    value
  ) {
    const element =
      document.getElementById(
        id
      );

    if (element) {
      element.textContent =
        value;
    }
  }


  function compactTime(value) {
    const match =
      String(
        value || ""
      ).match(
        /(\d{2}:\d{2})/
      );

    return match
      ? match[1]
      : "−";
  }


  function parseLocalDateTime(value) {
    const match =
      String(
        value || ""
      ).match(
        /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/
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


  async function readOnlyJson(
    response,
    fallbackMessage
  ) {
    let payload;

    try {
      payload =
        await response.json();
    } catch {
      throw new Error(
        fallbackMessage
      );
    }

    if (
      !response.ok
      ||
      !payload
      ||
      payload.success !== true
    ) {
      throw new Error(
        payload?.error
        ||
        fallbackMessage
      );
    }

    return payload;
  }


  async function loadHomeReadOnly() {
    const status =
      document.getElementById(
        "nextHomeReadStatus"
      );

    if (!status) {
      return;
    }

    status.textContent =
      "READING";

    status.classList.remove(
      "is-ok",
      "is-error"
    );


    const date =
      todayLocalDate();

    const params =
      new URLSearchParams({
        date_from:
          date,

        date_to:
          date,
      });


    try {

      const [
        scheduleResponse,
        shiftsResponse,
      ] =
        await Promise.all([
          fetch(
            `${productionScheduleApi}?${params.toString()}`,
            {
              method:
                "GET",

              credentials:
                "same-origin",

              cache:
                "no-store",
            }
          ),

          fetch(
            `${productionShiftsApi}?${params.toString()}`,
            {
              method:
                "GET",

              credentials:
                "same-origin",

              cache:
                "no-store",
            }
          ),
        ]);


      const scheduleData =
        await readOnlyJson(
          scheduleResponse,
          "予約の取得に失敗しました。"
        );

      const shiftsData =
        await readOnlyJson(
          shiftsResponse,
          "シフトの取得に失敗しました。"
        );


      const shifts =
        Array.isArray(
          shiftsData.shifts
        )
          ? shiftsData.shifts
          : [];


      const ownerShift =
        shifts.find(
          shift =>
            shift.shift_date === date
            &&
            shift.status === "confirmed"
            &&
            Number(
              shift.is_reservation_owner
            ) === 1
        )
        ||
        shifts.find(
          shift =>
            shift.shift_date === date
            &&
            shift.status === "confirmed"
        )
        ||
        null;


      const visits =
        (
          Array.isArray(
            scheduleData.visits
          )
            ? scheduleData.visits
            : []
        )
          .filter(
            visit =>
              visit.status !== "cancelled"
              &&
              !visit.cancelled_at
          )
          .filter(
            visit =>
              !ownerShift?.store_name
              ||
              visit.store_name ===
                ownerShift.store_name
          )
          .sort(
            (left, right) =>
              String(
                left.started_at || ""
              ).localeCompare(
                String(
                  right.started_at || ""
                )
              )
          );


      if (ownerShift) {

        const store =
          ownerShift.store_name
          || "勤務";

        const start =
          compactTime(
            ownerShift.start_at
          );

        const end =
          compactTime(
            ownerShift.end_at
          );

        readOnlyText(
          "nextHomeShift",
          `${store} ${start}〜${end}`
        );

      } else {

        readOnlyText(
          "nextHomeShift",
          "確定シフトなし"
        );
      }


      readOnlyText(
        "nextHomeReservations",
        `${visits.length}件`
      );


      const now =
        new Date();

      const nextVisit =
        visits.find(
          visit => {
            const start =
              parseLocalDateTime(
                visit.started_at
              );

            return (
              start
              &&
              start >= now
            );
          }
        );


      if (nextVisit) {

        const parts = [
          compactTime(
            nextVisit.started_at
          ),
        ];

        if (
          Number(
            nextVisit.course_minutes
          ) > 0
        ) {
          parts.push(
            `${Number(
              nextVisit.course_minutes
            )}分`
          );
        }

        if (
          nextVisit.store_name
        ) {
          parts.push(
            nextVisit.store_name
          );
        }

        readOnlyText(
          "nextHomeNextReservation",
          parts.join(" / ")
        );

      } else {

        readOnlyText(
          "nextHomeNextReservation",
          visits.length
            ? "本日の予定分は終了"
            : "予約なし"
        );
      }


      readOnlyText(
        "nextHomeSource",
        "schedule + shifts"
      );


      status.textContent =
        "READ ONLY";

      status.classList.add(
        "is-ok"
      );


      if (
        window.KohakuWorkNext
      ) {
        window.KohakuWorkNext.apiConnected =
          true;
      }

    } catch (error) {

      console.error(
        "Kohaku Work NEXT read-only load failed:",
        error
      );


      readOnlyText(
        "nextHomeShift",
        "取得失敗"
      );

      readOnlyText(
        "nextHomeReservations",
        "−件"
      );

      readOnlyText(
        "nextHomeNextReservation",
        "取得失敗"
      );

      readOnlyText(
        "nextHomeSource",
        "Production API error"
      );


      status.textContent =
        "READ ERROR";

      status.classList.add(
        "is-error"
      );
    }
  }

  /* ========================================
     PHASE 2B / SALES READ ONLY
  ======================================== */

  function formatReadOnlyMoney(
    value
  ) {
    const amount =
      Number(
        value || 0
      );

    return (
      "¥ "
      + amount.toLocaleString(
        "ja-JP"
      )
    );
  }


  async function loadHomeSalesReadOnly() {
    const status =
      document.getElementById(
        "nextHomeSalesStatus"
      );

    if (!status) {
      return;
    }


    status.textContent =
      "READING";

    status.classList.remove(
      "is-ok",
      "is-error"
    );


    try {

      const response =
        await fetch(
          `${productionSalesApi}?period=today`,
          {
            method:
              "GET",

            credentials:
              "same-origin",

            cache:
              "no-store",
          }
        );


      const result =
        await readOnlyJson(
          response,
          "売上データの取得に失敗しました。"
        );


      const summary =
        result.summary
        || {};


      const takeHome =
        summary.net_take_home_total
        ??
        summary.take_home_total
        ??
        0;


      const visitCount =
        Number(
          summary.visit_count
          || 0
        );


      const unenteredCount =
        Number(
          summary.unentered_count
          || 0
        );


      const dailyFee =
        Number(
          summary.daily_fee_total
          || 0
        );


      readOnlyText(
        "nextHomeTakeHome",
        formatReadOnlyMoney(
          takeHome
        )
      );


      readOnlyText(
        "nextHomeSalesVisits",
        `${visitCount.toLocaleString(
          "ja-JP"
        )}件`
      );


      readOnlyText(
        "nextHomeSalesUnentered",
        `${unenteredCount.toLocaleString(
          "ja-JP"
        )}件`
      );


      readOnlyText(
        "nextHomeDailyFee",
        formatReadOnlyMoney(
          dailyFee
        )
      );


      const unenteredElement =
        document.getElementById(
          "nextHomeSalesUnentered"
        );


      if (unenteredElement) {
        unenteredElement.classList.toggle(
          "is-warning",
          unenteredCount > 0
        );
      }


      status.textContent =
        "READ ONLY";

      status.classList.add(
        "is-ok"
      );

    } catch (error) {

      console.error(
        "Kohaku Work NEXT sales read-only load failed:",
        error
      );


      readOnlyText(
        "nextHomeTakeHome",
        "取得失敗"
      );

      readOnlyText(
        "nextHomeSalesVisits",
        "−件"
      );

      readOnlyText(
        "nextHomeSalesUnentered",
        "−件"
      );

      readOnlyText(
        "nextHomeDailyFee",
        "取得失敗"
      );


      status.textContent =
        "READ ERROR";

      status.classList.add(
        "is-error"
      );
    }
  }


  /* ========================================
     PHASE 2C / SCHEDULE READ ONLY
  ======================================== */

  const scheduleReadOnlyState = {
    anchorDate:
      todayLocalDate(),
  };


  function parseReadOnlyDate(
    value
  ) {
    const [
      year,
      month,
      day,
    ] =
      String(value)
        .split("-")
        .map(Number);

    return new Date(
      year,
      month - 1,
      day,
      12,
      0,
      0,
      0
    );
  }


  function formatReadOnlyDate(
    date
  ) {
    return [
      date.getFullYear(),

      String(
        date.getMonth() + 1
      ).padStart(2, "0"),

      String(
        date.getDate()
      ).padStart(2, "0"),
    ].join("-");
  }


  function getScheduleReadOnlyPeriod() {
    const anchor =
      parseReadOnlyDate(
        scheduleReadOnlyState
          .anchorDate
      );

    const start =
      new Date(anchor);

    const day =
      start.getDay();

    const mondayOffset =
      day === 0
        ? -6
        : 1 - day;

    start.setDate(
      start.getDate()
      + mondayOffset
    );


    const dates = [];

    for (
      let index = 0;
      index < 14;
      index += 1
    ) {
      const date =
        new Date(start);

      date.setDate(
        start.getDate()
        + index
      );

      dates.push(
        formatReadOnlyDate(
          date
        )
      );
    }


    return {
      start:
        dates[0],

      end:
        dates[
          dates.length - 1
        ],

      dates,
    };
  }


  function formatScheduleReadOnlyPeriod(
    period
  ) {
    const start =
      parseReadOnlyDate(
        period.start
      );

    const end =
      parseReadOnlyDate(
        period.end
      );

    return (
      `${start.getMonth() + 1}/${start.getDate()}`
      + " 〜 "
      + `${end.getMonth() + 1}/${end.getDate()}`
    );
  }


  function scheduleWeekdayLabel(
    dateValue
  ) {
    return [
      "日",
      "月",
      "火",
      "水",
      "木",
      "金",
      "土",
    ][
      parseReadOnlyDate(
        dateValue
      ).getDay()
    ];
  }


  function scheduleCustomerLabel(
    visit
  ) {
    const names =
      Array.isArray(
        visit.customer_names
      )
        ? visit.customer_names
        : [];


    const normalized =
      names
        .map(item => {

          if (
            typeof item
            === "string"
          ) {
            return item;
          }

          if (
            item
            &&
            typeof item
              === "object"
          ) {
            return (
              item.name
              ||
              item.customer_name
              ||
              item.display_name
              ||
              ""
            );
          }

          return "";
        })
        .filter(Boolean);


    if (normalized.length) {
      return normalized.join(
        " / "
      );
    }


    return (
      visit.customer_name
      ||
      visit.customer_label
      ||
      "お客様"
    );
  }


  function scheduleElement(
    tag,
    className = "",
    text = ""
  ) {
    const element =
      document.createElement(
        tag
      );

    if (className) {
      element.className =
        className;
    }

    if (text !== "") {
      element.textContent =
        text;
    }

    return element;
  }


  function renderScheduleReadOnly(
    scheduleData,
    shiftsData,
    period
  ) {
    const container =
      document.getElementById(
        "nextScheduleDays"
      );

    const periodLabel =
      document.getElementById(
        "nextSchedulePeriod"
      );

    const status =
      document.getElementById(
        "nextScheduleReadStatus"
      );


    if (
      !container
      ||
      !periodLabel
      ||
      !status
    ) {
      return;
    }


    periodLabel.textContent =
      formatScheduleReadOnlyPeriod(
        period
      );


    const visits =
      Array.isArray(
        scheduleData.visits
      )
        ? [...scheduleData.visits]
        : [];


    const shifts =
      Array.isArray(
        shiftsData.shifts
      )
        ? [...shiftsData.shifts]
        : [];


    visits.sort(
      (left, right) =>
        String(
          left.started_at || ""
        ).localeCompare(
          String(
            right.started_at || ""
          )
        )
    );


    container.replaceChildren();


    const today =
      todayLocalDate();


    period.dates.forEach(
      dateValue => {

        const day =
          scheduleElement(
            "section",
            "work-next-schedule-day"
          );


        if (
          dateValue === today
        ) {
          day.classList.add(
            "is-today"
          );
        }


        const dayVisits =
          visits.filter(
            visit =>
              String(
                visit.started_at
                || ""
              ).slice(
                0,
                10
              ) === dateValue
          );


        const dayShifts =
          shifts.filter(
            shift =>
              shift.shift_date
              === dateValue
          );


        const head =
          scheduleElement(
            "div",
            "work-next-schedule-day-head"
          );


        const date =
          scheduleElement(
            "div",
            "work-next-schedule-date"
          );


        const dateObject =
          parseReadOnlyDate(
            dateValue
          );


        date.append(
          scheduleElement(
            "strong",
            "",
            `${dateObject.getMonth() + 1}/${dateObject.getDate()}`
          ),

          scheduleElement(
            "span",
            "",
            `(${scheduleWeekdayLabel(
              dateValue
            )})`
          )
        );


        head.append(
          date,

          scheduleElement(
            "span",
            "work-next-schedule-count",
            `${dayVisits.length}件`
          )
        );


        day.append(
          head
        );


        if (
          dayShifts.length
        ) {
          const shiftRow =
            scheduleElement(
              "div",
              "work-next-schedule-shifts"
            );


          dayShifts.forEach(
            shift => {

              const label = [
                shift.store_name
                  || "勤務",

                `${compactTime(
                  shift.start_at
                )}〜${compactTime(
                  shift.end_at
                )}`,
              ]
                .filter(Boolean)
                .join(" ");


              shiftRow.append(
                scheduleElement(
                  "span",
                  "work-next-schedule-shift",
                  label
                )
              );
            }
          );


          day.append(
            shiftRow
          );
        }


        const visitList =
          scheduleElement(
            "div",
            "work-next-schedule-visits"
          );


        if (
          !dayVisits.length
        ) {
          visitList.append(
            scheduleElement(
              "p",
              "work-next-schedule-empty",
              "予約なし"
            )
          );

        } else {

          dayVisits.forEach(
            visit => {

              const cancelled =
                visit.status
                  === "cancelled"
                ||
                Boolean(
                  visit.cancelled_at
                );


              const row =
                scheduleElement(
                  "div",
                  "work-next-schedule-visit"
                );


              if (cancelled) {
                row.classList.add(
                  "is-cancelled"
                );
              }


              row.append(
                scheduleElement(
                  "span",
                  "work-next-schedule-visit-time",
                  compactTime(
                    visit.started_at
                  )
                )
              );


              const main =
                scheduleElement(
                  "div",
                  "work-next-schedule-visit-main"
                );


              main.append(
                scheduleElement(
                  "strong",
                  "",
                  scheduleCustomerLabel(
                    visit
                  )
                )
              );


              const detail = [
                visit.store_name,

                visit.course_name
                ||
                (
                  Number(
                    visit.course_minutes
                  ) > 0
                    ? `${Number(
                        visit.course_minutes
                      )}分`
                    : ""
                ),
              ]
                .filter(Boolean)
                .join(" / ");


              main.append(
                scheduleElement(
                  "small",
                  "",
                  detail
                  || "詳細未登録"
                )
              );


              row.append(
                main
              );


              row.append(
                scheduleElement(
                  "span",
                  "work-next-schedule-visit-state",
                  cancelled
                    ? "キャンセル"
                    : (
                        visit.status
                        || "予約"
                      )
                )
              );


              visitList.append(
                row
              );
            }
          );
        }


        day.append(
          visitList
        );


        container.append(
          day
        );
      }
    );


    const activeVisits =
      visits.filter(
        visit =>
          visit.status
            !== "cancelled"
          &&
          !visit.cancelled_at
      );


    status.textContent =
      `${activeVisits.length}件 / READ ONLY`;

    status.classList.remove(
      "is-error"
    );

    status.classList.add(
      "is-ok"
    );
  }


  async function loadScheduleReadOnly() {
    const status =
      document.getElementById(
        "nextScheduleReadStatus"
      );

    if (!status) {
      return;
    }


    const period =
      getScheduleReadOnlyPeriod();


    status.textContent =
      "READING";

    status.classList.remove(
      "is-ok",
      "is-error"
    );


    readOnlyText(
      "nextSchedulePeriod",
      formatScheduleReadOnlyPeriod(
        period
      )
    );


    const params =
      new URLSearchParams({
        date_from:
          period.start,

        date_to:
          period.end,
      });


    try {

      const [
        scheduleResponse,
        shiftsResponse,
      ] =
        await Promise.all([
          fetch(
            `${productionScheduleApi}?${params.toString()}`,
            {
              method:
                "GET",

              credentials:
                "same-origin",

              cache:
                "no-store",
            }
          ),

          fetch(
            `${productionShiftsApi}?${params.toString()}`,
            {
              method:
                "GET",

              credentials:
                "same-origin",

              cache:
                "no-store",
            }
          ),
        ]);


      const scheduleData =
        await readOnlyJson(
          scheduleResponse,
          "予約の取得に失敗しました。"
        );


      const shiftsData =
        await readOnlyJson(
          shiftsResponse,
          "シフトの取得に失敗しました。"
        );


      renderScheduleReadOnly(
        scheduleData,
        shiftsData,
        period
      );

    } catch (error) {

      console.error(
        "Kohaku Work NEXT schedule read-only load failed:",
        error
      );


      status.textContent =
        "READ ERROR";

      status.classList.add(
        "is-error"
      );


      const container =
        document.getElementById(
          "nextScheduleDays"
        );


      if (container) {
        container.replaceChildren(
          scheduleElement(
            "p",
            "work-next-schedule-empty",
            "予約データを取得できませんでした。"
          )
        );
      }
    }
  }


  document.addEventListener(
    "click",
    event => {

      const move =
        event.target.closest(
          "[data-next-schedule-move]"
        );


      if (move) {

        const amount =
          Number(
            move.dataset
              .nextScheduleMove
          );


        const anchor =
          parseReadOnlyDate(
            scheduleReadOnlyState
              .anchorDate
          );


        anchor.setDate(
          anchor.getDate()
          + amount
        );


        scheduleReadOnlyState
          .anchorDate =
            formatReadOnlyDate(
              anchor
            );


        void loadScheduleReadOnly();

        return;
      }


      const today =
        event.target.closest(
          "[data-next-schedule-today]"
        );


      if (today) {

        scheduleReadOnlyState
          .anchorDate =
            todayLocalDate();


        void loadScheduleReadOnly();
      }
    }
  );


  window.KohakuWorkNext = {
    phase: 2,
    showView,
    apiConnected: false,
    productionReadEnabled: true,
    verificationDatabase: false,
    productionWriteEnabled: false,
  };

  void loadHomeReadOnly();
  void loadHomeSalesReadOnly();
})();
