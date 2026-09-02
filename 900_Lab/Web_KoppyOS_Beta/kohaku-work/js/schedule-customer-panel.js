(() => {
  'use strict';


  let context = null;


  function init({
    scheduleState,
    scheduleCustomerPanel,
    scheduleCustomerName,
    scheduleCustomerKashikoiName,
    scheduleCustomerFeatures,
    scheduleCustomerCancelPanel,
    scheduleCustomerCancelReason,
  }) {

    if (context) {
      return;
    }


    context = {
      scheduleState,
      scheduleCustomerPanel,
      scheduleCustomerName,
      scheduleCustomerKashikoiName,
      scheduleCustomerFeatures,
      scheduleCustomerCancelPanel,
      scheduleCustomerCancelReason,
    };
  }


  function getContext() {

    if (!context) {
      throw new Error(
        'KohakuScheduleCustomerPanel is not initialized.'
      );
    }


    return context;
  }


  function closeScheduleCustomerPanel() {

    const {
      scheduleCustomerPanel,
      scheduleCustomerName,
      scheduleCustomerKashikoiName,
      scheduleCustomerFeatures,
    } = getContext();


    if (scheduleCustomerPanel) {
      scheduleCustomerPanel.hidden =
        true;
    }


    if (scheduleCustomerName) {
      scheduleCustomerName.value =
        '';
    }


    if (scheduleCustomerKashikoiName) {
      scheduleCustomerKashikoiName.value =
        '';
    }


    if (scheduleCustomerFeatures) {
      scheduleCustomerFeatures.value =
        '';
    }
  }


  function closeCustomerCancelPanel() {

    const {
      scheduleCustomerCancelPanel,
      scheduleCustomerCancelReason,
    } = getContext();


    if (scheduleCustomerCancelPanel) {
      scheduleCustomerCancelPanel.hidden =
        true;
    }


    if (scheduleCustomerCancelReason) {
      scheduleCustomerCancelReason.value =
        '';
    }
  }


  function openCustomerCancelPanel() {

    const {
      scheduleState,
      scheduleCustomerCancelPanel,
      scheduleCustomerCancelReason,
    } = getContext();


    const visit =
      scheduleState.selectedVisit;

    if (
      !visit
      || !scheduleCustomerCancelPanel
      || !Boolean(
        Number(
          visit.customer_linked
        )
      )
    ) {
      return;
    }


    if (scheduleCustomerCancelReason) {
      scheduleCustomerCancelReason.value =
        '';
    }


    scheduleCustomerCancelPanel.hidden =
      false;


    if (scheduleCustomerCancelReason) {
      scheduleCustomerCancelReason.focus();
    }
  }


  window.KohakuScheduleCustomerPanel = {
    init,

    isActive() {
      return Boolean(context);
    },

    getContext,
    closeScheduleCustomerPanel,
    openCustomerCancelPanel,
    closeCustomerCancelPanel,
  };


  window.KohakuScheduleCustomerPanel.init({
    scheduleState,
    scheduleCustomerPanel,
    scheduleCustomerName,
    scheduleCustomerKashikoiName,
    scheduleCustomerFeatures,
    scheduleCustomerCancelPanel,
    scheduleCustomerCancelReason,
  });
})();