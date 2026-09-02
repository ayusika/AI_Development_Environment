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


  async function loadScheduleIdentityFeatures() {

    const {
      scheduleState,
      visitIdentityFeaturesApiUrl,
      scheduleIdentityFeatureList,
    } = getContext();


    const visit =
      scheduleState.selectedVisit;


    if (
      !visit
      || !scheduleIdentityFeatureList
    ) {
      return;
    }


    scheduleIdentityFeatureList.innerHTML =
      '<p>読み込み中...</p>';


    try {

      const response =
        await fetch(
          `${visitIdentityFeaturesApiUrl}?visit_id=${encodeURIComponent(
            visit.id
          )}`
        );


      const data =
        await response.json();


      if (
        !response.ok
        || !data.success
      ) {
        throw new Error(
          data.error
          || '構造化特徴を読み込めませんでした。'
        );
      }


      const features =
        Array.isArray(
          data.data?.features
        )
          ? data.data.features
          : [];


      scheduleState.selectedVisit.identity_features =
        features;


      if (features.length === 0) {

        scheduleIdentityFeatureList.innerHTML =
          '<p>構造化特徴はまだありません。</p>';

        return;
      }


      scheduleIdentityFeatureList.innerHTML =
        features
          .map(
            (feature) => {

              const label =
                getIdentityFeatureLabel(
                  feature.feature_type
                );

              const value =
                String(
                  feature.feature_value
                  ?? ''
                );

              const note =
                feature.note
                  ? ` <small>${String(
                      feature.note
                    )}</small>`
                  : '';


              return `
                <div class="schedule-identity-feature-item">
                  <strong>${label}</strong>
                  <span>${value}</span>
                  ${note}
                </div>
              `;
            }
          )
          .join('');


    } catch (error) {

      scheduleIdentityFeatureList.innerHTML =
        `<p>${error.message}</p>`;
    }
  }


  window.KohakuScheduleIdentity = {
    init,

    isActive() {
      return Boolean(context);
    },

    getContext,
    getIdentityFeatureLabel,
    loadScheduleIdentityFeatures,
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