(() => {
  'use strict';


  let context = null;


  function init({
    scheduleState,
    visitIdentityFeaturesApiUrl,
    customerIdentitySearchApiUrl,
    scheduleIdentityFeatureType,
    scheduleIdentityFeatureValue,
    scheduleIdentityFeatureNote,
    scheduleIdentityFeatureList,
    scheduleIdentitySearchKeyword,
    scheduleIdentitySearchStatus,
    scheduleIdentitySearchStore,
    scheduleIdentitySearchResults,
    escapeHtml,
  }) {

    if (context) {
      return;
    }


    context = {
      scheduleState,
      visitIdentityFeaturesApiUrl,
      customerIdentitySearchApiUrl,
      scheduleIdentityFeatureType,
      scheduleIdentityFeatureValue,
      scheduleIdentityFeatureNote,
      scheduleIdentityFeatureList,
      scheduleIdentitySearchKeyword,
      scheduleIdentitySearchStatus,
      scheduleIdentitySearchStore,
      scheduleIdentitySearchResults,
      escapeHtml,
    };
  }


  function getContext() {

    if (!context) {
      throw new Error(
        'KohakuScheduleIdentity is not initialized.'
      );
    }


    return context;
  }


  window.KohakuScheduleIdentity = {
    init,

    isActive() {
      return Boolean(context);
    },

    getContext,
  };
})();