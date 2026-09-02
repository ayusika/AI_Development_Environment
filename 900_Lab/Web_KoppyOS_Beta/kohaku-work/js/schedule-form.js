(() => {
  'use strict';


  let context = null;


  function init({
    scheduleFormCard,
    hideScheduleMessage,
  }) {

    if (context) {
      return;
    }


    context = {
      scheduleFormCard,
      hideScheduleMessage,
    };
  }


  function getContext() {

    if (!context) {
      throw new Error(
        'KohakuScheduleForm is not initialized.'
      );
    }


    return context;
  }


  function closeScheduleForm() {

    const {
      scheduleFormCard,
      hideScheduleMessage,
    } = getContext();


    if (!scheduleFormCard) return;


    scheduleFormCard.hidden = true;

    hideScheduleMessage();
  }


  window.KohakuScheduleForm = {
    init,

    isActive() {
      return Boolean(context);
    },

    getContext,
    closeScheduleForm,
  };


  window.KohakuScheduleForm.init({
    scheduleFormCard,
    hideScheduleMessage,
  });
})();