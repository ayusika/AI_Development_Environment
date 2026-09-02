(() => {
  'use strict';


  let context = null;


  function init({
    scheduleZoom,
    getSchedulePeriod,
    renderScheduleCalendar,
    getScheduleHourHeight,
  }) {

    if (context) {
      return;
    }


    context = {
      scheduleZoom,
      getSchedulePeriod,
      renderScheduleCalendar,
      getScheduleHourHeight,
    };
  }


  function getContext() {

    if (!context) {
      throw new Error(
        'KohakuScheduleZoom is not initialized.'
      );
    }


    return context;
  }


  function setScheduleZoom(
    nextHeight
  ) {

    const {
      scheduleZoom,
      getSchedulePeriod,
      renderScheduleCalendar,
    } = getContext();


    const page =
      document.querySelector(
        '.schedule-page'
      );


    if (!page) return;


    const clampedHeight =
      Math.min(
        scheduleZoom.maxHourHeight,
        Math.max(
          scheduleZoom.minHourHeight,
          nextHeight
        )
      );


    page.style.setProperty(
      '--schedule-hour-height',
      `${clampedHeight}px`
    );


    const period =
      getSchedulePeriod();


    renderScheduleCalendar(
      period
    );


    updateScheduleZoomLabel();
  }


  function updateScheduleZoomLabel() {

    const {
      getScheduleHourHeight,
    } = getContext();


    const label =
      document.getElementById(
        'schedule-zoom-label'
      );


    if (!label) return;


    const currentHeight =
      getScheduleHourHeight();


    const percent =
      Math.round(
        currentHeight
        / 96
        * 100
      );


    label.textContent =
      `${percent}%`;
  }


  window.KohakuScheduleZoom = {
    init,

    isActive() {
      return Boolean(context);
    },

    getContext,
    setScheduleZoom,
    updateScheduleZoomLabel,
  };


  window.KohakuScheduleZoom.init({
    scheduleZoom,
    getSchedulePeriod,
    renderScheduleCalendar,
    getScheduleHourHeight,
  });
})();