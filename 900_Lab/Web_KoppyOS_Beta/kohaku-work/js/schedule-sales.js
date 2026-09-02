(() => {
  'use strict';


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


  function updateScheduleCoursePriceSummary({
    scheduleCoursePriceSummary,
    selectedScheduleCourseMaster,
    escapeHtml,
  }) {

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


  window.KohakuScheduleSales = {
    isActive() {
      return true;
    },

    formatScheduleMoney,
    updateScheduleCoursePriceSummary,
  };
})();