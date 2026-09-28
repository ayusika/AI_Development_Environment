(() => {
  "use strict";

  const API =
    "/api/v1/sales.php";

  const view =
    document.getElementById(
      "view-sales"
    );

  if (!view) {
    return;
  }

  const state = {
    period: "month",
    date: null,
    storeId: null,
    anchorDate: null,
    requestId: 0,
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function money(value) {
    const amount =
      Number(value || 0);

    return (
      "¥ "
      + amount.toLocaleString(
        "ja-JP"
      )
    );
  }

  function setStatus(
    text,
    mode = ""
  ) {
    const status =
      byId("nextSalesStatus");

    if (!status) {
      return;
    }

    status.textContent =
      text;

    status.classList.remove(
      "is-ok",
      "is-error"
    );

    if (mode) {
      status.classList.add(mode);
    }
  }

  async function readJson(
    response
  ) {
    let payload;

    try {
      payload =
        await response.json();
    } catch {
      throw new Error(
        "売上データを読み取れませんでした。"
      );
    }

    if (
      !response.ok
      || !payload
      || payload.success !== true
    ) {
      throw new Error(
        payload?.error
        || "売上データの取得に失敗しました。"
      );
    }

    return payload;
  }

  function periodLabel(
    period
  ) {
    const type =
      String(
        period?.type || ""
      );

    const anchor =
      String(
        period?.anchor_date || ""
      );

    const parts =
      anchor
        .split("-")
        .map(Number);

    const year =
      parts[0];

    const month =
      parts[1];

    const day =
      parts[2];

    if (
      type === "today"
      && Number.isFinite(month)
      && Number.isFinite(day)
    ) {
      return (
        `TODAY · ${month}/${day}`
      );
    }

    if (
      type === "day"
      && Number.isFinite(month)
      && Number.isFinite(day)
    ) {
      return (
        `${month}/${day} SALES`
      );
    }

    if (
      Number.isFinite(year)
      && Number.isFinite(month)
    ) {
      return (
        `${year}.${String(month)
          .padStart(2, "0")}`
      );
    }

    return "THIS MONTH";
  }

  function summaryTitle(
    period
  ) {
    if (
      period?.type === "today"
    ) {
      return "今日の手取り";
    }

    if (
      period?.type === "day"
    ) {
      return "この日の手取り";
    }

    return "今月の手取り";
  }

  function setText(
    id,
    value
  ) {
    const element =
      byId(id);

    if (element) {
      element.textContent =
        value;
    }
  }

  function renderStores(
    stores
  ) {
    const select =
      byId("nextSalesStore");

    if (!select) {
      return;
    }

    const previous =
      Number(
        state.storeId || 0
      );

    select.replaceChildren();

    const all =
      document.createElement(
        "option"
      );

    all.value = "";
    all.textContent =
      "全店舗";

    select.appendChild(all);

    (
      Array.isArray(stores)
        ? stores
        : []
    ).forEach(
      store => {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          String(
            Number(store.id)
          );

        option.textContent =
          String(
            store.name || ""
          );

        select.appendChild(
          option
        );
      }
    );

    select.value =
      previous > 0
        ? String(previous)
        : "";
  }

  function renderPeriod(
    result
  ) {
    const period =
      result.period || {};

    state.anchorDate =
      String(
        period.anchor_date || ""
      );

    setText(
      "nextSalesPeriodLabel",
      periodLabel(period)
    );

    setText(
      "nextSalesSummaryTitle",
      summaryTitle(period)
    );

    const daily =
      period.type === "today"
      || period.type === "day";

    const nav =
      byId("nextSalesDayNav");

    if (nav) {
      nav.hidden =
        !daily;
    }

    const dateInput =
      byId("nextSalesDate");

    if (
      dateInput
      && daily
      && /^\d{4}-\d{2}-\d{2}$/
        .test(state.anchorDate)
    ) {
      if (
        dateInput.value
        !== state.anchorDate
      ) {
        dateInput.value =
          state.anchorDate;

        dateInput.dispatchEvent(
          new Event(
            "input",
            {
              bubbles:true,
            }
          )
        );
      }
    }

    const parts =
      state.anchorDate
        .split("-")
        .map(Number);

    setText(
      "nextSalesDayLabel",
      daily
      && Number.isFinite(parts[1])
      && Number.isFinite(parts[2])
        ? `${parts[1]}/${parts[2]}`
        : "--/--"
    );

    view
      .querySelectorAll(
        "[data-next-sales-period]"
      )
      .forEach(
        button => {
          button.classList.toggle(
            "is-active",
            button.dataset
              .nextSalesPeriod
              === period.type
          );
        }
      );
  }

  function renderSummary(
    result
  ) {
    const summary =
      result.summary || {};

    setText(
      "nextSalesTakeHome",
      money(
        summary.net_take_home_total
        ?? summary.take_home_total
        ?? 0
      )
    );

    setText(
      "nextSalesVisits",
      `${
        Number(
          summary.visit_count || 0
        ).toLocaleString(
          "ja-JP"
        )
      }件`
    );

    const unentered =
      Number(
        summary.unentered_count
        || 0
      );

    setText(
      "nextSalesUnentered",
      `${
        unentered.toLocaleString(
          "ja-JP"
        )
      }件`
    );

    setText(
      "nextSalesDailyFee",
      money(
        summary.daily_fee_total
        || 0
      )
    );

    byId(
      "nextSalesUnentered"
    )?.classList.toggle(
      "is-warning",
      unentered > 0
    );
  }

  function visitDetail(
    visit
  ) {
    const started =
      String(
        visit.started_at || ""
      );

    const date =
      started
        .slice(5, 10)
        .replace("-", "/");

    const time =
      started.slice(11, 16);

    const course =
      visit.course_name
      || (
        visit.course_minutes
          ? `${
              Number(
                visit.course_minutes
              )
            }分`
          : "コース未登録"
      );

    return [
      date,
      time,
      visit.store_name,
      course,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function customerLabel(
    visit
  ) {
    const prefixes = {
      nickname:"",
      kashikoi:"カ:",
      okini_talk:"オ:",
      line:"L:",
      x:"X:",
      instagram:"I:",
    };

    const names =
      Array.isArray(
        visit?.customer_names
      )
        ? visit.customer_names
        : [];

    const labels =
      names
        .filter(
          record =>
            record?.name
        )
        .map(
          record =>
            `${
              prefixes[
                record.name_type
              ]
              || ""
            }${
              String(
                record.name
              )
            }`
        )
        .filter(
          (label, index, list) =>
            list.indexOf(label)
            === index
        );

    return labels.length
      ? labels.join(" / ")
      : (
          visit?.customer_name
          || "お客様"
        );
  }

  function optionLabel(
    visit
  ) {
    const names =
      (
        Array.isArray(
          visit?.options
        )
          ? visit.options
          : []
      )
        .map(
          option =>
            String(
              option?.name
              || option?.custom_name
              || ""
            ).trim()
        )
        .filter(Boolean);

    return names.length
      ? `OP: ${
          names.join("・")
        }`
      : "OP: なし";
  }

  function renderVisits(
    visits
  ) {
    const list =
      byId("nextSalesVisitList");

    if (!list) {
      return;
    }

    list.replaceChildren();

    const rows =
      Array.isArray(visits)
        ? visits
        : [];

    if (rows.length === 0) {
      const empty =
        document.createElement(
          "p"
        );

      empty.className =
        "next-sales-empty";

      empty.textContent =
        "この期間の接客はありません。";

      list.appendChild(
        empty
      );

      return;
    }

    rows.forEach(
      visit => {
        const confirmed =
          visit.sales_state
          === "confirmed";

        const row =
          document.createElement(
            "article"
          );

        row.className =
          confirmed
            ? "next-sales-visit"
            : "next-sales-visit is-unentered";

        const main =
          document.createElement(
            "div"
          );

        main.className =
          "next-sales-visit-main";

        const name =
          document.createElement(
            "strong"
          );

        name.textContent =
          customerLabel(
            visit
          );

        const detail =
          document.createElement(
            "small"
          );

        detail.textContent =
          visitDetail(visit);

        const options =
          document.createElement(
            "small"
          );

        options.textContent =
          optionLabel(
            visit
          );

        main.append(
          name,
          detail,
          options
        );

        const side =
          document.createElement(
            "div"
          );

        side.className =
          "next-sales-visit-side";

        const amount =
          document.createElement(
            "strong"
          );

        amount.textContent =
          confirmed
            ? money(
                visit.sales
                  ?.take_home_total
                ?? 0
              )
            : "¥ −";

        const status =
          document.createElement(
            "small"
          );

        status.textContent =
          confirmed
            ? "確定済"
            : "未入力";

        side.append(
          amount,
          status
        );

        row.append(
          main,
          side
        );

        list.appendChild(
          row
        );
      }
    );
  }

  function showLoading() {
    const list =
      byId("nextSalesVisitList");

    if (!list) {
      return;
    }

    list.innerHTML =
      '<p class="next-sales-loading">'
      + "売上データを読み込んでいます…"
      + "</p>";
  }

  function showError(
    message
  ) {
    const list =
      byId("nextSalesVisitList");

    if (!list) {
      return;
    }

    list.replaceChildren();

    const error =
      document.createElement(
        "p"
      );

    error.className =
      "next-sales-error";

    error.textContent =
      message;

    list.appendChild(
      error
    );
  }

  async function load(
    options = {}
  ) {
    const period =
      Object.prototype
        .hasOwnProperty.call(
          options,
          "period"
        )
        ? options.period
        : state.period;

    const date =
      Object.prototype
        .hasOwnProperty.call(
          options,
          "date"
        )
        ? options.date
        : state.date;

    const storeId =
      Object.prototype
        .hasOwnProperty.call(
          options,
          "storeId"
        )
        ? options.storeId
        : state.storeId;

    const requestId =
      state.requestId + 1;

    state.requestId =
      requestId;

    setStatus(
      "READING"
    );

    showLoading();

    const params =
      new URLSearchParams();

    params.set(
      "period",
      period || "month"
    );

    if (date) {
      params.set(
        "date",
        String(date)
      );
    }

    if (
      Number(storeId) > 0
    ) {
      params.set(
        "store_id",
        String(
          Number(storeId)
        )
      );
    }

    try {
      const response =
        await fetch(
          `${API}?${params.toString()}`,
          {
            method:"GET",
            credentials:
              "same-origin",
            cache:
              "no-store",
          }
        );

      const result =
        await readJson(
          response
        );

      if (
        requestId
        !== state.requestId
      ) {
        return result;
      }

      state.period =
        period || "month";

      state.date =
        date || null;

      state.storeId =
        Number(storeId) > 0
          ? Number(storeId)
          : null;

      renderPeriod(result);
      renderSummary(result);
      renderStores(
        result.stores
      );
      renderVisits(
        result.visits
      );

      view.dispatchEvent(
        new CustomEvent(
          "koppy:sales-loaded",
          {
            detail:{
              result,
            },
          }
        )
      );

      setStatus(
        "LIVE",
        "is-ok"
      );

      return result;

    } catch (error) {
      if (
        requestId
        !== state.requestId
      ) {
        return null;
      }

      console.error(
        "Kohaku Work sales dashboard load failed:",
        error
      );

      setStatus(
        "READ ERROR",
        "is-error"
      );

      showError(
        error?.message
        || "売上データの取得に失敗しました。"
      );

      return null;
    }
  }

  function shiftIsoDate(
    value,
    step
  ) {
    const match =
      String(value || "")
        .match(
          /^(\d{4})-(\d{2})-(\d{2})$/
        );

    if (!match) {
      return null;
    }

    const date =
      new Date(
        Date.UTC(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3])
        )
      );

    date.setUTCDate(
      date.getUTCDate()
      + step
    );

    return [
      date.getUTCFullYear(),
      String(
        date.getUTCMonth() + 1
      ).padStart(2, "0"),
      String(
        date.getUTCDate()
      ).padStart(2, "0"),
    ].join("-");
  }

  view.addEventListener(
    "click",
    event => {
      const periodButton =
        event.target.closest(
          "[data-next-sales-period]"
        );

      if (periodButton) {
        const period =
          String(
            periodButton.dataset
              .nextSalesPeriod
            || ""
          );

        if (
          period === "today"
          || period === "month"
        ) {
          void load({
            period,
            date:null,
          });
        }

        return;
      }

      const dayButton =
        event.target.closest(
          "[data-next-sales-day-step]"
        );

      if (dayButton) {
        const step =
          Number(
            dayButton.dataset
              .nextSalesDayStep
            || 0
          );

        if (
          step !== -1
          && step !== 1
        ) {
          return;
        }

        const nextDate =
          shiftIsoDate(
            state.anchorDate,
            step
          );

        if (!nextDate) {
          return;
        }

        void load({
          period:"day",
          date:nextDate,
        });
      }
    }
  );

  byId(
    "nextSalesDate"
  )?.addEventListener(
    "change",
    event => {
      const value =
        String(
          event.target.value
          || ""
        );

      if (
        /^\d{4}-\d{2}-\d{2}$/
          .test(value)
      ) {
        void load({
          period:"day",
          date:value,
        });
      }
    }
  );

  byId(
    "nextSalesStore"
  )?.addEventListener(
    "change",
    event => {
      const storeId =
        Number(
          event.target.value
          || 0
        );

      void load({
        storeId:
          storeId > 0
            ? storeId
            : null,
      });
    }
  );

  const viewObserver =
    new MutationObserver(
      records => {
        const visibilityChanged =
          records.some(
            record =>
              record.type
              === "attributes"
              && record.attributeName
              === "hidden"
          );

        if (
          visibilityChanged
          && !view.hidden
        ) {
          void load();
        }
      }
    );

  viewObserver.observe(
    view,
    {
      attributes:true,
      attributeFilter:[
        "hidden",
      ],
    }
  );

  window.KohakuWorkNextSales = {
    load,
    state,
  };

  if (!view.hidden) {
    void load();
  }
})();
