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


  function selectScheduleIdentityCandidate(
    button
  ) {

    const {
      scheduleState,
      scheduleIdentitySearchResults,
      escapeHtml,
    } = getContext();


    const visitId =
      Number(
        button?.dataset?.visitId
      );


    const currentVisit =
      scheduleState.selectedVisit;


    if (
      !visitId
      || !currentVisit
      || !scheduleIdentitySearchResults
    ) {
      return;
    }


    const candidateVisit =
      scheduleState.identitySearchVisits
        .find(
          (visit) =>
            Number(visit.id)
            === visitId
        );


    if (!candidateVisit) {

      window.alert(
        '候補visitの情報を取得できませんでした。'
      );

      return;
    }


    scheduleState.selectedIdentityCandidate =
      candidateVisit;


    const result =
      button.closest(
        '.schedule-identity-search-result'
      );


    document
      .querySelectorAll(
        '.schedule-identity-search-result'
      )
      .forEach((item) => {

        item.classList.remove(
          'is-selected'
        );
      });


    if (result) {

      result.classList.add(
        'is-selected'
      );
    }


    const customerStatusLabels = {
      new: '新規',
      repeat: 'リピ',
      other_store_repeat: '他店リピ',
      repeat_unknown_id: 'リピ・ID不明',
    };


    const renderFeatures =
      (features) => {

        if (
          !Array.isArray(features)
          || features.length === 0
        ) {
          return 'なし';
        }


        return features
          .map((feature) => {

            const label =
              getIdentityFeatureLabel(
                feature.feature_type
              );


            return `${label}: ${
              feature.feature_value
            }`;
          })
          .join(' / ');
      };


    const currentFeatures =
      Array.isArray(
        currentVisit.identity_features
      )
        ? currentVisit.identity_features
        : [];


    const candidateFeatures =
      Array.isArray(
        candidateVisit.identity_features
      )
        ? candidateVisit.identity_features
        : [];


    let confirmation =
      document.getElementById(
        'schedule-identity-candidate-confirmation'
      );


    if (!confirmation) {

      confirmation =
        document.createElement(
          'div'
        );

      confirmation.id =
        'schedule-identity-candidate-confirmation';

      confirmation.className =
        'schedule-identity-candidate-confirmation';
    }


    if (result) {

      result.after(
        confirmation
      );

    } else {

      scheduleIdentitySearchResults.after(
        confirmation
      );
    }


    confirmation.innerHTML = `
      <div>

        <strong>
          同一人物候補を比較
        </strong>

        <div class="schedule-identity-comparison">

          <section>

            <h4>
              現在の予約
            </h4>

            <p>
              日時：
              ${escapeHtml(
                currentVisit.started_at
                || ''
              )}
            </p>

            <p>
              店舗：
              ${escapeHtml(
                currentVisit.store_name
                || ''
              )}
            </p>

            <p>
              区分：
              ${escapeHtml(
                customerStatusLabels[
                  currentVisit.customer_status
                ]
                || currentVisit.customer_status
                || ''
              )}
            </p>

            <p>
              特徴メモ：
              ${escapeHtml(
                currentVisit.customer_features
                || 'なし'
              )}
            </p>

            <p>
              構造化特徴：
              ${escapeHtml(
                renderFeatures(
                  currentFeatures
                )
              )}
            </p>

          </section>


          <section>

            <h4>
              候補 visit #${escapeHtml(
                candidateVisit.id
              )}
            </h4>

            <p>
              日時：
              ${escapeHtml(
                candidateVisit.started_at
                || ''
              )}
            </p>

            <p>
              店舗：
              ${escapeHtml(
                candidateVisit.store_name
                || ''
              )}
            </p>

            <p>
              区分：
              ${escapeHtml(
                customerStatusLabels[
                  candidateVisit.customer_status
                ]
                || candidateVisit.customer_status
                || ''
              )}
            </p>

            <p>
              顧客紐付け：
              ${
                candidateVisit.customer_id
                  ? `customer #${escapeHtml(
                      candidateVisit.customer_id
                    )}`
                  : '未紐付け'
              }
            </p>

            <p>
              特徴メモ：
              ${escapeHtml(
                candidateVisit.customer_features
                || 'なし'
              )}
            </p>

            <p>
              構造化特徴：
              ${escapeHtml(
                renderFeatures(
                  candidateFeatures
                )
              )}
            </p>

            ${
              candidateVisit.customer_id
                ? `
                  <button
                    class="primary-button"
                    type="button"
                    data-action="link-schedule-existing-customer"
                    data-customer-id="${escapeHtml(
                      candidateVisit.customer_id
                    )}"
                  >
                    この顧客に紐付ける
                  </button>
                `
                : ''
            }

          </section>

        </div>

      </div>
    `;
  }


  window.KohakuScheduleIdentity = {
    init,

    isActive() {
      return Boolean(context);
    },

    getContext,
    getIdentityFeatureLabel,
    loadScheduleIdentityFeatures,
    selectScheduleIdentityCandidate,
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