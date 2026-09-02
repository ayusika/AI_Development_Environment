(() => {
  'use strict';


  let context = null;


  function init({
    scheduleState,
    scheduleDateInput,
    schedulePeriodTitle,
    scheduleParseDate,
    scheduleFormatDate,
    loadSchedule,
  }) {

    if (context) {
      return;
    }


    context = {
      scheduleState,
      scheduleDateInput,
      schedulePeriodTitle,
      scheduleParseDate,
      scheduleFormatDate,
      loadSchedule,
    };
  }


  function getContext() {

    if (!context) {
      throw new Error(
        'KohakuSchedulePeriod is not initialized.'
      );
    }


    return context;
  }


  window.KohakuSchedulePeriod = {
    init,

    isActive() {
      return Boolean(context);
    },

    getContext,
  };


  window.KohakuSchedulePeriod.init({
    scheduleState,
    scheduleDateInput,
    schedulePeriodTitle,
    scheduleParseDate,
    scheduleFormatDate,
    loadSchedule,
  });
})();