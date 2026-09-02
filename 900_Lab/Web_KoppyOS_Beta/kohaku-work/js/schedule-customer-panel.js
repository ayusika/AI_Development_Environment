(() => {
  'use strict';


  let context = null;


  function init({
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


  window.KohakuScheduleCustomerPanel = {
    init,

    isActive() {
      return Boolean(context);
    },

    getContext,
    closeScheduleCustomerPanel,
    closeCustomerCancelPanel,
  };


  window.KohakuScheduleCustomerPanel.init({
    scheduleCustomerPanel,
    scheduleCustomerName,
    scheduleCustomerKashikoiName,
    scheduleCustomerFeatures,
    scheduleCustomerCancelPanel,
    scheduleCustomerCancelReason,
  });
})();