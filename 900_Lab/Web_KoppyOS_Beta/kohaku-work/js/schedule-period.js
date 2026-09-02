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


  function getSchedulePeriod() {

    const {
      scheduleState,
      scheduleParseDate,
      scheduleFormatDate,
    } = getContext();


    const anchor =
      scheduleParseDate(
        scheduleState.anchorDate
        || scheduleFormatDate(
          new Date()
        )
      );


    let start =
      new Date(anchor);

    let days = 1;


    if (
      scheduleState.view === 'week'
      || scheduleState.view === 'two-weeks'
    ) {

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


      days =
        scheduleState.view === 'week'
          ? 7
          : 14;
    }


    const end =
      new Date(start);


    end.setDate(
      end.getDate()
      + days
      - 1
    );


    const dates = [];


    for (
      let index = 0;
      index < days;
      index += 1
    ) {

      const date =
        new Date(start);


      date.setDate(
        start.getDate()
        + index
      );


      dates.push(
        scheduleFormatDate(
          date
        )
      );
    }


    return {
      start:
        scheduleFormatDate(
          start
        ),

      end:
        scheduleFormatDate(
          end
        ),

      dates,
    };
  }


  window.KohakuSchedulePeriod = {
    init,

    isActive() {
      return Boolean(context);
    },

    getContext,
    getSchedulePeriod,
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