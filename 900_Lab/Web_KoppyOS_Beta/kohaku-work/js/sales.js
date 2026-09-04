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