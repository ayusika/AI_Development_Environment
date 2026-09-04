/* ========================================
   WORK SALES
======================================== */

const salesApiUrl =
  '/api/v1/sales.php';


const salesPeriodLabel =
  document.getElementById(
    'sales-period-label'
  );


const salesTakeHomeTotal =
  document.getElementById(
    'sales-take-home-total'
  );


const salesVisitCount =
  document.getElementById(
    'sales-visit-count'
  );


const salesUnenteredCount =
  document.getElementById(
    'sales-unentered-count'
  );


const salesState = {
  period: 'month',
  date: null,
  storeId: null,
};


function formatSalesDashboardMoney(
  value
) {

  const amount =
    Number(value || 0);


  return `¥ ${amount.toLocaleString(
    'ja-JP'
  )}`;
}


function formatSalesPeriodLabel(
  period
) {

  if (!period) {
    return '売上';
  }


  const anchorDate =
    String(
      period.anchor_date || ''
    );


  const [
    year,
    month,
    day,
  ] =
    anchorDate
      .split('-')
      .map(Number);


  if (
    period.type === 'today'
  ) {

    if (
      Number.isFinite(month)
      && Number.isFinite(day)
    ) {
      return `TODAY · ${month}/${day}`;
    }


    return 'TODAY';
  }


  if (
    period.type === 'day'
  ) {

    if (
      Number.isFinite(month)
      && Number.isFinite(day)
    ) {
      return `${month}/${day} SALES`;
    }


    return 'DAY SALES';
  }


  if (
    Number.isFinite(year)
    && Number.isFinite(month)
  ) {
    return `${year}.${String(
      month
    ).padStart(
      2,
      '0'
    )}`;
  }


  return 'THIS MONTH';
}


function renderSalesSummary(
  result
) {

  const summary =
    result.summary || {};


  if (salesTakeHomeTotal) {

    salesTakeHomeTotal.textContent =
      formatSalesDashboardMoney(
        summary.take_home_total
      );
  }


  if (salesVisitCount) {

    salesVisitCount.textContent =
      `${Number(
        summary.visit_count || 0
      ).toLocaleString(
        'ja-JP'
      )}件`;
  }


  if (salesUnenteredCount) {

    salesUnenteredCount.textContent =
      `${Number(
        summary.unentered_count || 0
      ).toLocaleString(
        'ja-JP'
      )}件`;
  }


  if (salesPeriodLabel) {

    salesPeriodLabel.textContent =
      formatSalesPeriodLabel(
        result.period
      );
  }


  const salesDayConfirmButton =
    document.getElementById(
      'sales-day-confirm-button'
    );


  if (salesDayConfirmButton) {

    const periodType =
      result.period
        ? result.period.type
        : null;


    salesDayConfirmButton.hidden =
      periodType !== 'today'
      && periodType !== 'day';
  }


  const salesVisitList =
    document.getElementById(
      'sales-visit-list'
    );


  if (salesVisitList) {

    salesVisitList.replaceChildren();


    const visits =
      Array.isArray(result.visits)
        ? result.visits
        : [];


    if (visits.length === 0) {

      const emptyMessage =
        document.createElement('p');


      emptyMessage.textContent =
        'この期間の接客はありません。';


      salesVisitList.appendChild(
        emptyMessage
      );

    } else {

      visits.forEach((visit) => {

        const row =
          document.createElement('div');


        row.className =
          'menu-row';


        const main =
          document.createElement('span');


        const title =
          document.createElement('strong');


        title.textContent =
          visit.customer_name
          || 'お客様';


        const detail =
          document.createElement('small');


        const startedAt =
          String(
            visit.started_at || ''
          );


        const datePart =
          startedAt.slice(
            5,
            10
          ).replace(
            '-',
            '/'
          );


        const timePart =
          startedAt.slice(
            11,
            16
          );


        const courseLabel =
          visit.course_name
          || (
            visit.course_minutes
              ? `${Number(
                  visit.course_minutes
                )}分`
              : 'コース未登録'
          );


        detail.textContent =
          [
            datePart,
            timePart,
            visit.store_name,
            courseLabel,
          ]
            .filter(Boolean)
            .join(' · ');


        main.append(
          title,
          detail
        );


        const salesSide =
          document.createElement('span');


        const amount =
          document.createElement('strong');


        const state =
          document.createElement('small');


        const confirmed =
          visit.sales_state
          === 'confirmed';


        amount.textContent =
          confirmed
            ? formatSalesDashboardMoney(
                visit.sales
                  ? visit.sales.take_home_total
                  : 0
              )
            : '¥ −';


        state.textContent =
          confirmed
            ? '確定済'
            : '未入力';


        salesSide.append(
          amount,
          state
        );


        row.append(
          main,
          salesSide
        );


        salesVisitList.appendChild(
          row
        );
      });
    }
  }
}


async function loadSales(
  options = {}
) {

  const nextPeriod =
    options.period
    || salesState.period
    || 'month';


  const nextDate =
    Object.prototype.hasOwnProperty.call(
      options,
      'date'
    )
      ? options.date
      : salesState.date;


  const nextStoreId =
    Object.prototype.hasOwnProperty.call(
      options,
      'storeId'
    )
      ? options.storeId
      : salesState.storeId;


  const parameters =
    new URLSearchParams();


  parameters.set(
    'period',
    nextPeriod
  );


  if (nextDate) {

    parameters.set(
      'date',
      String(nextDate)
    );
  }


  if (
    nextStoreId !== null
    && nextStoreId !== undefined
    && Number(nextStoreId) > 0
  ) {

    parameters.set(
      'store_id',
      String(
        Number(nextStoreId)
      )
    );
  }


  const response =
    await fetch(
      `${salesApiUrl}?${parameters.toString()}`
    );


  const result =
    await response.json();


  if (
    !response.ok
    || !result.success
  ) {

    throw new Error(
      result.error
      || '売上データの取得に失敗しました。'
    );
  }


  salesState.period =
    nextPeriod;


  salesState.date =
    nextDate;


  salesState.storeId =
    nextStoreId;


  renderSalesSummary(
    result
  );


  return result;
}

document
  .querySelectorAll(
    '[data-sales-period]'
  )
  .forEach((button) => {

    button.addEventListener(
      'click',
      () => {

        const period =
          String(
            button.dataset.salesPeriod
            || ''
          );


        if (
          period !== 'today'
          && period !== 'month'
        ) {
          return;
        }


        loadSales({
          period,
          date: null,
        });
      }
    );
  });
