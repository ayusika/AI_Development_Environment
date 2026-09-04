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


async function openSalesDayConfirm() {

  const panel =
    document.getElementById(
      'sales-day-confirm-panel'
    );


  const title =
    document.getElementById(
      'sales-day-confirm-title'
    );


  const countElement =
    document.getElementById(
      'sales-day-confirm-unentered-count'
    );


  const totalElement =
    document.getElementById(
      'sales-day-confirm-take-home-total'
    );


  const list =
    document.getElementById(
      'sales-day-confirm-list'
    );


  const message =
    document.getElementById(
      'sales-day-confirm-message'
    );


  const submitButton =
    document.getElementById(
      'sales-day-confirm-submit-button'
    );


  if (
    !panel
    || !list
  ) {
    throw new Error(
      'Daily sales confirmation panel is not available.'
    );
  }


  panel.hidden =
    false;


  list.replaceChildren();


  const loadingMessage =
    document.createElement('p');


  loadingMessage.textContent =
    'この日の売上を確認しています…';


  list.appendChild(
    loadingMessage
  );


  if (message) {
    message.hidden = true;
    message.textContent = '';
  }


  if (submitButton) {
    submitButton.disabled = true;
  }


  try {

    const result =
      await loadSales({
        period:
          salesState.period,

        date:
          salesState.date,

        storeId:
          salesState.storeId,
      });


    const period =
      result.period || {};


    const anchorDate =
      String(
        period.anchor_date || ''
      );


    const [
      ,
      month,
      day,
    ] =
      anchorDate
        .split('-')
        .map(Number);


    if (title) {

      title.textContent =
        Number.isFinite(month)
        && Number.isFinite(day)
          ? `${month}/${day} の売上確認`
          : 'この日の売上確認';
    }


    const visits =
      Array.isArray(result.visits)
        ? result.visits
        : [];


    const unenteredVisits =
      visits.filter(
        (visit) =>
          visit.sales_state
          !== 'confirmed'
      );


    if (countElement) {

      countElement.textContent =
        `${unenteredVisits.length.toLocaleString(
          'ja-JP'
        )}件`;
    }


    if (
      unenteredVisits.length === 0
    ) {

      list.replaceChildren();


      const emptyMessage =
        document.createElement('p');


      emptyMessage.textContent =
        'この日の未確定売上はありません。';


      list.appendChild(
        emptyMessage
      );


      if (totalElement) {

        totalElement.textContent =
          formatSalesDashboardMoney(0);
      }


      if (message) {

        message.textContent =
          'この日の売上はすべて確定済みです。';

        message.hidden =
          false;
      }


      panel.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });


      return result;
    }


    const previewResults =
      await Promise.all(
        unenteredVisits.map(
          async (visit) => {

            try {

              const response =
                await fetch(
                  `/api/v1/visit-sales.php?visit_id=${encodeURIComponent(
                    String(visit.id)
                  )}`
                );


              const previewResult =
                await response.json();


              if (
                !response.ok
                || !previewResult.success
              ) {

                throw new Error(
                  previewResult.error
                  || '売上プレビュー取得失敗'
                );
              }


              return {
                visit,
                result:
                  previewResult,
                error: null,
              };


            } catch (error) {

              return {
                visit,
                result: null,
                error:
                  error.message
                  || '売上プレビュー取得失敗',
              };
            }
          }
        )
      );


    list.replaceChildren();


    let takeHomeTotal =
      0;


    let hasIncompletePreview =
      false;


    previewResults.forEach(
      (item) => {

        const visit =
          item.visit;


        const preview =
          item.result
            ? item.result.preview || {}
            : {};


        const takeHome =
          item.error
            ? null
            : preview.take_home_total;


        if (
          takeHome === null
          || takeHome === undefined
        ) {

          hasIncompletePreview =
            true;

        } else {

          takeHomeTotal +=
            Number(takeHome);
        }


        const row =
          document.createElement('div');


        row.className =
          'menu-row';


        const main =
          document.createElement('span');


        const name =
          document.createElement('strong');


        name.textContent =
          visit.customer_name
          || 'お客様';


        const detail =
          document.createElement('small');


        const startedAt =
          String(
            visit.started_at || ''
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
            timePart,
            visit.store_name,
            courseLabel,
          ]
            .filter(Boolean)
            .join(' · ');


        main.append(
          name,
          detail
        );


        const side =
          document.createElement('span');


        const amount =
          document.createElement('strong');


        amount.textContent =
          takeHome === null
          || takeHome === undefined
            ? '要確認'
            : formatSalesDashboardMoney(
                takeHome
              );


        const state =
          document.createElement('small');


        state.textContent =
          item.error
            ? item.error
            : (
                takeHome === null
                || takeHome === undefined
                  ? '料金未確認'
                  : '確定可能'
              );


        side.append(
          amount,
          state
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


    if (totalElement) {

      totalElement.textContent =
        hasIncompletePreview
          ? '¥ −'
          : formatSalesDashboardMoney(
              takeHomeTotal
            );
    }


    if (message) {

      message.textContent =
        hasIncompletePreview
          ? '「要確認」の接客があります。料金を確認してから一括確定します。'
          : 'この内容で一括確定できる状態です。';

      message.hidden =
        false;
    }


    if (submitButton) {

      submitButton.disabled =
        hasIncompletePreview;
    }


    panel.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });


    return result;


  } catch (error) {

    list.replaceChildren();


    const errorMessage =
      document.createElement('p');


    errorMessage.textContent =
      error.message
      || '日次売上の確認に失敗しました。';


    list.appendChild(
      errorMessage
    );


    if (message) {

      message.textContent =
        error.message
        || '日次売上の確認に失敗しました。';

      message.hidden =
        false;
    }


    throw error;
  }
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
