(() => {
  "use strict";

  const views = [...document.querySelectorAll("[data-view]")];
  const navs = [...document.querySelectorAll("[data-nav]")];

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
  }

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

  window.KohakuWorkNext = {
    phase: 2,
    showView,
    apiConnected: false,
    productionReadEnabled: true,
    verificationDatabase: false,
    productionWriteEnabled: false,
  };

  void loadHomeReadOnly();
})();
