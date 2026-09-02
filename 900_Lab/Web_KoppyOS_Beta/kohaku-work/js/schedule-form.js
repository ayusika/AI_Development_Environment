(() => {
  'use strict';


  let context = null;


  function init({
    scheduleFormCard,
    scheduleFormMessage,
  }) {

    if (context) {
      return;
    }


    context = {
      scheduleFormCard,
      scheduleFormMessage,
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


  function showScheduleMessage(
    message,
    isError = false
  ) {

    const {
      scheduleFormMessage,
    } = getContext();


    if (!scheduleFormMessage) {
      return;
    }


    scheduleFormMessage.hidden =
      false;

    scheduleFormMessage.textContent =
      message;

    scheduleFormMessage.classList.toggle(
      'is-error',
      isError
    );
  }


  function hideScheduleMessage() {

    const {
      scheduleFormMessage,
    } = getContext();


    if (!scheduleFormMessage) {
      return;
    }


    scheduleFormMessage.hidden =
      true;

    scheduleFormMessage.textContent =
      '';

    scheduleFormMessage.classList.remove(
      'is-error'
    );
  }


  function closeScheduleForm() {

    const {
      scheduleFormCard,
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
    showScheduleMessage,
    hideScheduleMessage,
    closeScheduleForm,
  };


  window.KohakuScheduleForm.init({
    scheduleFormCard,
    scheduleFormMessage,
  });
})();