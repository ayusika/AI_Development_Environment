(() => {
  'use strict';


  let context = null;


  function init({
    scheduleCustomerPanel,
    scheduleCustomerName,
    scheduleCustomerKashikoiName,
    scheduleCustomerFeatures,
  }) {

    if (context) {
      return;
    }


    context = {
      scheduleCustomerPanel,
      scheduleCustomerName,
      scheduleCustomerKashikoiName,
      scheduleCustomerFeatures,
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


  window.KohakuScheduleCustomerPanel = {
    init,

    isActive() {
      return Boolean(context);
    },

    getContext,
    closeScheduleCustomerPanel,
  };


  window.KohakuScheduleCustomerPanel.init({
    scheduleCustomerPanel,
    scheduleCustomerName,
    scheduleCustomerKashikoiName,
    scheduleCustomerFeatures,
  });
})();