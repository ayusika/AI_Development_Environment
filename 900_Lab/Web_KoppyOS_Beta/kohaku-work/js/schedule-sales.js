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


  window.KohakuScheduleSales = {
    isActive() {
      return true;
    },

    formatScheduleMoney,
  };
})();