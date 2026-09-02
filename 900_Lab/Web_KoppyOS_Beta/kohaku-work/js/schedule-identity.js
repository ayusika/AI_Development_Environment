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


  function getIdentityFeatureLabel(
    featureType
  ) {

    const labels = {
      age_range: '年代',
      height: '身長',
      body_type: '体格',
      hair: '髪',
      facial_hair: 'ヒゲ',
      glasses: '眼鏡',
      appearance: '見た目',
      lookalike: '似てる人',
      occupation: '職業',
      voice_speech: '声・話し方',
      area: 'エリア',
      hobby_topic: '趣味・話題',
      other: 'その他',
    };


    return (
      labels[featureType]
      || featureType
    );
  }


  window.KohakuScheduleIdentity = {
    init,

    isActive() {
      return Boolean(context);
    },

    getContext,
    getIdentityFeatureLabel,
  };


  window.KohakuScheduleIdentity.init({
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
  });
})();