/* ========================================
   HEAVEN DIARY
======================================== */

let activeHeavenDiaryVisit = null;

let heavenDiaryPlaceTouched =
  false;


function heavenDiaryLocalDraftKey(
  visitId
) {

  return (
    'kohakuWorkHeavenDiaryDraft:'
    + String(
      visitId
    )
  );
}


function saveHeavenDiaryLocalDraft() {

  const visit =
    activeHeavenDiaryVisit;


  if (
    !visit
    || !visit.id
  ) {
    return;
  }


  const titleElement =
    document.getElementById(
      'heaven-diary-title'
    );

  const bodyElement =
    document.getElementById(
      'heaven-diary-body'
    );

  const noteElement =
    document.getElementById(
      'heaven-diary-note'
    );

  const extraNoteElement =
    document.getElementById(
      'heaven-diary-extra-note'
    );

  const selectedPlace =
    document.querySelector(
      'input[name="heaven-place"]:checked'
    );


  const draft = {
    title:
      titleElement
        ? titleElement.value
        : '',

    body:
      bodyElement
        ? bodyElement.value
        : '',

    note:
      noteElement
        ? noteElement.value
        : '',

    extraNote:
      extraNoteElement
        ? extraNoteElement.value
        : '',

    place:
      selectedPlace
        ? selectedPlace.value
        : 'hotel',

    updatedAt:
      new Date().toISOString(),
  };


  try {

    localStorage.setItem(
      heavenDiaryLocalDraftKey(
        visit.id
      ),
      JSON.stringify(
        draft
      )
    );

  } catch (error) {

    console.error(
      'Failed to save Heaven diary local draft:',
      error
    );
  }
}


function restoreHeavenDiaryLocalDraft(
  visit
) {

  if (
    !visit
    || !visit.id
  ) {
    return false;
  }


  let saved = null;


  try {

    saved =
      localStorage.getItem(
        heavenDiaryLocalDraftKey(
          visit.id
        )
      );

  } catch (error) {

    console.error(
      'Failed to read Heaven diary local draft:',
      error
    );

    return false;
  }


  if (!saved) {
    return false;
  }


  let draft = null;


  try {

    draft =
      JSON.parse(
        saved
      );

  } catch (error) {

    console.error(
      'Failed to parse Heaven diary local draft:',
      error
    );

    return false;
  }


  const titleElement =
    document.getElementById(
      'heaven-diary-title'
    );

  const bodyElement =
    document.getElementById(
      'heaven-diary-body'
    );

  const noteElement =
    document.getElementById(
      'heaven-diary-note'
    );

  const extraNoteElement =
    document.getElementById(
      'heaven-diary-extra-note'
    );


  if (titleElement) {
    titleElement.value =
      String(
        draft.title
        || ''
      );
  }


  if (bodyElement) {
    bodyElement.value =
      String(
        draft.body
        || ''
      );
  }


  if (noteElement) {
    noteElement.value =
      String(
        draft.note
        || ''
      );
  }


  if (extraNoteElement) {
    extraNoteElement.value =
      String(
        draft.extraNote
        || ''
      );
  }


  if (!heavenDiaryPlaceTouched) {

    document
      .querySelectorAll(
        'input[name="heaven-place"]'
      )
      .forEach((input) => {

        input.checked =
          input.value
          === (
            draft.place
            || 'hotel'
          );
      });
  }


  return true;
}


function clearHeavenDiaryLocalDraft(
  visitId
) {

  if (!visitId) {
    return;
  }


  try {

    localStorage.removeItem(
      heavenDiaryLocalDraftKey(
        visitId
      )
    );

  } catch (error) {

    console.error(
      'Failed to clear Heaven diary local draft:',
      error
    );
  }
}


async function saveHeavenDiaryCloudDraft() {

  const visit =
    activeHeavenDiaryVisit;


  if (
    !visit
    || !visit.id
  ) {

    window.alert(
      '保存対象の予約を確認できませんでした。'
    );

    return;
  }


  const titleElement =
    document.getElementById(
      'heaven-diary-title'
    );

  const bodyElement =
    document.getElementById(
      'heaven-diary-body'
    );

  const noteElement =
    document.getElementById(
      'heaven-diary-note'
    );

  const extraNoteElement =
    document.getElementById(
      'heaven-diary-extra-note'
    );

  const selectedPlace =
    document.querySelector(
      'input[name="heaven-place"]:checked'
    );

  const statusElement =
    document.getElementById(
      'heaven-diary-draft-save-status'
    );

  const saveButton =
    document.querySelector(
      '[data-action="save-heaven-diary-draft"]'
    );


  const title =
    titleElement
      ? titleElement.value
      : '';

  const body =
    bodyElement
      ? bodyElement.value
      : '';

  const note =
    noteElement
      ? noteElement.value
      : '';

  const extraNote =
    extraNoteElement
      ? extraNoteElement.value
      : '';

  const place =
    selectedPlace
      ? selectedPlace.value
      : 'hotel';


  if (
    !title.trim()
    && !body.trim()
    && !note.trim()
    && !extraNote.trim()
  ) {

    window.alert(
      '保存する下書きがありません。'
    );

    return;
  }


  if (saveButton) {

    saveButton.disabled =
      true;

    saveButton.textContent =
      'クラウド保存中...';
  }


  if (statusElement) {

    statusElement.hidden =
      true;

    statusElement.textContent =
      '';
  }


  try {

    const response =
      await fetch(
        '/api/v1/heaven-diary-drafts.php',
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              visit_id:
                Number(
                  visit.id
                ),

              title:
                title,

              body:
                body,

              note:
                note,

              extra_note:
                extraNote,

              place:
                place,
            }),
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
      || !data.success
    ) {

      throw new Error(
        data.error
        || 'クラウド下書きを保存できませんでした。'
      );
    }


    saveHeavenDiaryLocalDraft();


    if (statusElement) {

      statusElement.hidden =
        false;

      statusElement.textContent =
        '✓ クラウド下書きを保存しました';
    }


  } catch (error) {

    console.error(
      'Failed to save Heaven diary cloud draft:',
      error
    );


    if (statusElement) {

      statusElement.hidden =
        false;

      statusElement.textContent =
        error.message
        || 'クラウド下書きを保存できませんでした。';
    }


    window.alert(
      error.message
      || 'クラウド下書きを保存できませんでした。'
    );


  } finally {

    if (saveButton) {

      saveButton.disabled =
        false;

      saveButton.textContent =
        '☁️ 下書きをクラウド保存';
    }
  }
}


async function loadHeavenDiaryCloudDraft(
  visit
) {

  if (
    !visit
    || !visit.id
  ) {
    return false;
  }


  const statusElement =
    document.getElementById(
      'heaven-diary-draft-save-status'
    );


  try {

    const response =
      await fetch(
        `/api/v1/heaven-diary-drafts.php?visit_id=${encodeURIComponent(
          String(
            visit.id
          )
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
        || 'クラウド下書きを読み込めませんでした。'
      );
    }


    const draft =
      data.data?.draft
      || data.draft
      || null;


    if (!draft) {
      return false;
    }


    if (
      !activeHeavenDiaryVisit
      || String(
        activeHeavenDiaryVisit.id
      ) !== String(
        visit.id
      )
    ) {
      return false;
    }


    const titleElement =
      document.getElementById(
        'heaven-diary-title'
      );

    const bodyElement =
      document.getElementById(
        'heaven-diary-body'
      );

    const noteElement =
      document.getElementById(
        'heaven-diary-note'
      );

    const extraNoteElement =
      document.getElementById(
        'heaven-diary-extra-note'
      );


    if (titleElement) {

      titleElement.value =
        String(
          draft.title
          || ''
        );
    }


    if (bodyElement) {

      bodyElement.value =
        String(
          draft.body
          || ''
        );
    }


    if (noteElement) {

      noteElement.value =
        String(
          draft.note
          || ''
        );
    }


    if (extraNoteElement) {

      extraNoteElement.value =
        String(
          draft.extra_note
          || ''
        );
    }


    if (!heavenDiaryPlaceTouched) {

      document
        .querySelectorAll(
          'input[name="heaven-place"]'
        )
        .forEach((input) => {

          input.checked =
            input.value
            === (
              draft.place
              || 'hotel'
            );
        });
    }


    saveHeavenDiaryLocalDraft();


    if (statusElement) {

      statusElement.hidden =
        false;

      statusElement.textContent =
        '✓ クラウド下書きを読み込みました';
    }


    return true;


  } catch (error) {

    console.error(
      'Failed to load Heaven diary cloud draft:',
      error
    );


    if (statusElement) {

      statusElement.hidden =
        false;

      statusElement.textContent =
        'クラウド下書きの読み込みに失敗しました';
    }


    return false;
  }
}


[
  'heaven-diary-title',
  'heaven-diary-body',
  'heaven-diary-note',
  'heaven-diary-extra-note',
]
  .forEach((elementId) => {

    document
      .getElementById(
        elementId
      )
      ?.addEventListener(
        'input',
        saveHeavenDiaryLocalDraft
      );
  });


document
  .querySelectorAll(
    'input[name="heaven-place"]'
  )
  .forEach((input) => {

    input.addEventListener(
      'change',
      () => {

        heavenDiaryPlaceTouched =
          true;


        if (activeHeavenDiaryVisit) {

          renderHeavenDiaryBody(
            activeHeavenDiaryVisit
          );
        }


        saveHeavenDiaryLocalDraft();
      }
    );
  });


const heavenPlaceSelector =
  document.querySelector(
    '.heaven-place-selector'
  );


if (heavenPlaceSelector) {

  const selectHeavenPlaceFromEvent =
    (event) => {

      const target =
        event.target instanceof Element
          ? event.target
          : null;


      const label =
        target
          ? target.closest(
              'label'
            )
          : null;


      if (
        !label
        || !heavenPlaceSelector.contains(
          label
        )
      ) {
        return;
      }


      const input =
        label.querySelector(
          'input[name="heaven-place"]'
        );


      if (
        !input
        || input.checked
      ) {
        return;
      }


      input.checked =
        true;


      input.dispatchEvent(
        new Event(
          'change',
          {
            bubbles:
              true,
          }
        )
      );
    };


  [
    'pointerup',
    'touchend',
    'click',
  ].forEach(
    (eventName) => {

      heavenPlaceSelector.addEventListener(
        eventName,
        selectHeavenPlaceFromEvent
      );
    }
  );
}


async function startHeavenDiary(
  visit
) {

  if (!visit) {
    return;
  }


  activeHeavenDiaryVisit =
    visit;

  heavenDiaryPlaceTouched =
    false;


  const startedAt =
    String(
      visit.started_at
      || ''
    );

  const settingsDate =
    startedAt.slice(
      0,
      10
    )
    || new Date()
      .toISOString()
      .slice(
        0,
        10
      );


  try {

    await window
      .KohakuHeavenSettings
      ?.load(
        settingsDate
      );

  } catch (error) {

    console.error(
      'Failed to load Heaven settings for reservation diary:',
      error
    );
  }


  if (
    !activeHeavenDiaryVisit
    || String(
      activeHeavenDiaryVisit.id
    ) !== String(
      visit.id
    )
  ) {
    return;
  }


  const titleElement =
    document.getElementById(
      'heaven-diary-title'
    );


  const isRepeat =
    [
      'repeat',
      'other_store_repeat',
      'repeat_unknown_id',
    ].includes(
      visit.customer_status
    );


  const titleTemplates =
    window
      .KohakuHeavenSettings
      ?.current
      ?.title_templates
    || {};


  const defaultTitle =
    isRepeat
      ? (
        titleTemplates
          .thank_you_repeat
        || 'リピートお礼日記♡♡♡'
      )
      : (
        titleTemplates
          .thank_you_new
        || 'お礼日記♡'
      );


  if (titleElement) {

    titleElement.value =
      defaultTitle;
  }


  renderHeavenDiaryVisit(
    visit
  );


  showView(
    'heavenCreate'
  );
}


function renderHeavenDiaryVisit(
  visit
) {

  const customerElement =
    document.getElementById(
      'heaven-diary-customer'
    );

  const metaElement =
    document.getElementById(
      'heaven-diary-meta'
    );


  if (
    !customerElement
    || !metaElement
  ) {
    return;
  }


  const customerNames =
    Array.isArray(
      visit.customer_names
    )
      ? visit.customer_names
      : [];


  const nickname =
    customerNames.find(
      (record) =>
        record.name_type === 'nickname'
        && record.name
    );


  const kashikoi =
    customerNames.find(
      (record) =>
        record.name_type === 'kashikoi'
        && record.name
    );


  const anyName =
    customerNames.find(
      (record) =>
        record.name
    );


  let customerName =
    visit.customer_name
    || visit.customer_code
    || '名前未登録';


  if (nickname) {

    customerName =
      String(
        nickname.name
      );

  } else if (kashikoi) {

    customerName =
      `カ:${String(
        kashikoi.name
      )}`;

  } else if (anyName) {

    customerName =
      String(
        anyName.name
      );
  }


  const startedAt =
    String(
      visit.started_at
      || ''
    );


  const time =
    startedAt.length >= 16
      ? startedAt.slice(
          11,
          16
        )
      : '--:--';


  const courseMinutes =
    Number(
      visit.course_minutes
      || 0
    );


  const statusLabel =
    scheduleCustomerStatusLabel(
      visit.customer_status
    );


  customerElement.textContent =
    customerName;


  metaElement.textContent =
    `${time}｜${courseMinutes}分｜${statusLabel}`;


  renderHeavenDiaryBody(
    visit
  );


  void loadSavedHeavenDiary(
    visit
  );
}


async function loadSavedHeavenDiary(
  visit
) {

  const bodyElement =
    document.getElementById(
      'heaven-diary-body'
    );


  const statusElement =
    document.getElementById(
      'heaven-diary-save-status'
    );


  if (
    !visit
    || !visit.id
    || !bodyElement
  ) {
    return false;
  }


  if (statusElement) {

    statusElement.hidden =
      true;

    statusElement.textContent =
      '';
  }


  try {

    const response =
      await fetch(
        `/api/v1/heaven-diaries.php?visit_id=${encodeURIComponent(
          String(
            visit.id
          )
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
        || '保存済み日記を読み込めませんでした。'
      );
    }


    const diary =
      data.data?.diary
      || data.diary
      || null;


    if (!diary) {
      return false;
    }


    bodyElement.value =
      String(
        diary.body
        || ''
      );


    if (statusElement) {

      statusElement.hidden =
        false;

      statusElement.textContent =
        '✓ 保存済み日記を読み込みました';
    }


    return true;


  } catch (error) {

    console.error(
      'Failed to load saved Heaven diary:',
      error
    );


    if (statusElement) {

      statusElement.hidden =
        false;

      statusElement.textContent =
        '保存済み日記の読み込みに失敗しました';
    }


    return false;
  }
}


async function generateHeavenDiary() {

  const visit =
    activeHeavenDiaryVisit;


  if (!visit) {

    window.alert(
      '予約情報を確認できませんでした。'
    );

    return;
  }


  const noteElement =
    document.getElementById(
      'heaven-diary-note'
    );


  const extraNoteElement =
    document.getElementById(
      'heaven-diary-extra-note'
    );


  const bodyElement =
    document.getElementById(
      'heaven-diary-body'
    );


  const generateButton =
    document.querySelector(
      '[data-action="generate-heaven-diary"]'
    );


  const selectedPlace =
    document.querySelector(
      'input[name="heaven-place"]:checked'
    );


  const note =
    noteElement
      ? noteElement.value.trim()
      : '';


  const extraNote =
    extraNoteElement
      ? extraNoteElement.value.trim()
      : '';


  if (!note) {

    window.alert(
      '接客で書きたいことを入力してください。'
    );

    if (noteElement) {
      noteElement.focus();
    }

    return;
  }


  const optionNames =
    Array.isArray(
      visit.options
    )
      ? visit.options
          .map(
            (option) => {

              if (!option) {
                return '';
              }


              if (
                option.custom_name
                && String(
                  option.custom_name
                ).trim()
              ) {
                return String(
                  option.custom_name
                ).trim();
              }


              if (
                option.name
                && String(
                  option.name
                ).trim()
              ) {
                return String(
                  option.name
                ).trim();
              }


              return '';
            }
          )
          .filter(Boolean)
      : [];


  if (generateButton) {

    generateButton.disabled =
      true;

    generateButton.textContent =
      'Koppyが日記を作成中...';
  }


  try {

    const response =
      await fetch(
        '/api/v1/heaven-diary.php',
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              note:
                note,

              extra_note:
                extraNote,

              course_minutes:
                Number(
                  visit.course_minutes
                  || 0
                ),

              customer_status:
                String(
                  visit.customer_status
                  || ''
                ),

              place:
                selectedPlace
                  ? selectedPlace.value
                  : 'hotel',

              options:
                optionNames,
            }),
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
      || !data.success
    ) {

      throw new Error(
        data.error
        || '日記生成に失敗しました。'
      );
    }


    renderHeavenDiaryBody(
      visit,
      data.data?.reply
      || data.reply
      || ''
    );


    saveHeavenDiaryLocalDraft();


    if (bodyElement) {

      bodyElement.scrollIntoView({
        behavior:
          'smooth',

        block:
          'center',
      });
    }


  } catch (error) {

    window.alert(
      error.message
      || '日記生成に失敗しました。'
    );


  } finally {

    if (generateButton) {

      generateButton.disabled =
        false;

      generateButton.textContent =
        'このお客様の日記を作る';
    }
  }
}


async function copyHeavenDiary() {

  const bodyElement =
    document.getElementById(
      'heaven-diary-body'
    );


  if (!bodyElement) {
    return;
  }


  const text =
    bodyElement.value;


  if (!text.trim()) {

    window.alert(
      'コピーする本文がありません。'
    );

    return;
  }


  try {

    await navigator.clipboard.writeText(
      text
    );


    window.alert(
      'ヘブン投稿本文をコピーしました。'
    );


  } catch (error) {

    bodyElement.focus();
    bodyElement.select();

    document.execCommand(
      'copy'
    );


    window.alert(
      'ヘブン投稿本文をコピーしました。'
    );
  }
}


async function saveHeavenDiary() {

  const visit =
    activeHeavenDiaryVisit;


  const bodyElement =
    document.getElementById(
      'heaven-diary-body'
    );


  const statusElement =
    document.getElementById(
      'heaven-diary-save-status'
    );


  const saveButton =
    document.querySelector(
      '[data-action="save-heaven-diary"]'
    );


  if (
    !visit
    || !visit.id
  ) {

    window.alert(
      '保存対象の予約を確認できませんでした。'
    );

    return;
  }


  if (!bodyElement) {
    return;
  }


  const body =
    bodyElement.value.trim();


  if (!body) {

    window.alert(
      '実際に投稿した日記を貼り付けてください。'
    );

    bodyElement.focus();

    return;
  }


  if (saveButton) {

    saveButton.disabled =
      true;

    saveButton.textContent =
      '保存中...';
  }


  if (statusElement) {

    statusElement.hidden =
      true;

    statusElement.textContent =
      '';
  }


  try {

    const response =
      await fetch(
        '/api/v1/heaven-diaries.php',
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              visit_id:
                Number(
                  visit.id
                ),

              body:
                body,

              source:
                'manual',
            }),
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
      || !data.success
    ) {

      throw new Error(
        data.error
        || '日記を保存できませんでした。'
      );
    }


    let draftCleanupSucceeded =
      false;


    try {

      const draftDeleteResponse =
        await fetch(
          `/api/v1/heaven-diary-drafts.php?visit_id=${encodeURIComponent(
            String(
              visit.id
            )
          )}`,
          {
            method:
              'DELETE',
          }
        );


      const draftDeleteData =
        await draftDeleteResponse.json();


      if (
        !draftDeleteResponse.ok
        || !draftDeleteData.success
      ) {

        throw new Error(
          draftDeleteData.error
          || '下書きを削除できませんでした。'
        );
      }


      clearHeavenDiaryLocalDraft(
        visit.id
      );


      draftCleanupSucceeded =
        true;


      const draftStatusElement =
        document.getElementById(
          'heaven-diary-draft-save-status'
        );


      if (draftStatusElement) {

        draftStatusElement.hidden =
          true;

        draftStatusElement.textContent =
          '';
      }


    } catch (draftCleanupError) {

      console.error(
        'Failed to clean Heaven diary draft after final save:',
        draftCleanupError
      );
    }


    if (statusElement) {

      statusElement.hidden =
        false;

      statusElement.textContent =
        draftCleanupSucceeded
          ? '✓ DBに保存しました'
          : '✓ DB保存済み（下書き削除のみ失敗）';
    }


    if (!draftCleanupSucceeded) {

      window.alert(
        '日記はDBに保存済みです。下書きの削除だけ失敗しました。'
      );
    }


  } catch (error) {

    if (statusElement) {

      statusElement.hidden =
        false;

      statusElement.textContent =
        error.message
        || '日記を保存できませんでした。';
    }


    window.alert(
      error.message
      || '日記を保存できませんでした。'
    );


  } finally {

    if (saveButton) {

      saveButton.disabled =
        false;

      saveButton.textContent =
        '💾 この日記をDBに保存';
    }
  }
}


function renderHeavenDiaryBody(
  visit,
  note = ''
) {

  const bodyElement =
    document.getElementById(
      'heaven-diary-body'
    );


  if (!bodyElement) {
    return;
  }


  const courseMinutes =
    Number(
      visit.course_minutes
      || 0
    );


  let optionText =
    '';


  if (
    Array.isArray(
      visit.options
    )
  ) {

    optionText =
      visit.options
        .map(
          (option) => {

            if (!option) {
              return '';
            }


            if (
              option.custom_name
              && String(
                option.custom_name
              ).trim()
            ) {
              return String(
                option.custom_name
              ).trim();
            }


            if (
              option.name
              && String(
                option.name
              ).trim()
            ) {
              return String(
                option.name
              ).trim();
            }


            return '';
          }
        )
        .filter(Boolean)
        .join('、');

  } else {

    optionText =
      String(
        visit.options_text
        || visit.option_text
        || ''
      ).trim();


    if (
      optionText === '-'
      || optionText === 'なし'
    ) {
      optionText =
        '';
    }
  }


  const isRepeat =
    [
      'repeat',
      'other_store_repeat',
      'repeat_unknown_id',
    ].includes(
      visit.customer_status
    );


  const repeatText =
    isRepeat
      ? 'リピの'
      : '';


  const selectedPlace =
    document.querySelector(
      'input[name="heaven-place"]:checked'
    );


  const placeTextMap = {
    hotel:
      'ホテルで',

    room:
      'Rで',

    home:
      '自宅で',
  };


  const placeText =
    placeTextMap[
      selectedPlace?.value
    ]
    || 'ホテルで';


  const thankYouSettings =
    window
      .KohakuHeavenSettings
      ?.current
      ?.thank_you
    || {};


  const bodyTemplate =
    String(
      thankYouSettings
        .body_template
      || (
        'さっき{place}{course}分'
        + '{options_part}{repeat}お兄さん♡'
        + '\n\n\n{body}'
        + '\n\n\n{signature}'
      )
    );


  const signature =
    String(
      thankYouSettings
        .signature
      ?? '❄︎こはく❄︎'
    );


  const optionsPart =
    optionText
      ? `${optionText}希望の`
      : 'の';


  const values = {
    place:
      placeText,

    course:
      String(
        courseMinutes
      ),

    options_part:
      optionsPart,

    repeat:
      repeatText,

    body:
      String(
        note
        || ''
      ),

    signature:
      signature,
  };


  let renderedBody =
    bodyTemplate.replace(
      /\{(place|course|options_part|repeat|body|signature)\}/g,
      (
        match,
        key
      ) =>
        values[key]
        ?? match
    );


  if (!note) {

    renderedBody =
      renderedBody.replace(
        /\n{4,}/g,
        '\n\n\n'
      );
  }


  bodyElement.value =
    renderedBody;
}

/* ========================================
   RESERVATION HEAVEN BRIDGE
======================================== */

const heavenDiaryBridgeSendButton =
  document.getElementById(
    'heaven-diary-bridge-send'
  );

const heavenStandaloneBridgeSendButton =
  document.getElementById(
    'heaven-bridge-send'
  );


function syncHeavenDiaryBridgeButton() {

  if (
    !(heavenDiaryBridgeSendButton
      instanceof HTMLButtonElement)
  ) {
    return;
  }


  if (
    !(heavenStandaloneBridgeSendButton
      instanceof HTMLButtonElement)
  ) {

    heavenDiaryBridgeSendButton.disabled =
      true;

    return;
  }


  heavenDiaryBridgeSendButton.disabled =
    heavenStandaloneBridgeSendButton.disabled;
}


syncHeavenDiaryBridgeButton();


if (
  heavenStandaloneBridgeSendButton
  instanceof HTMLButtonElement
) {

  new MutationObserver(
    syncHeavenDiaryBridgeButton
  ).observe(
    heavenStandaloneBridgeSendButton,
    {
      attributes:
        true,

      attributeFilter: [
        'disabled',
      ],
    }
  );
}


if (
  heavenDiaryBridgeSendButton
  instanceof HTMLButtonElement
) {

  heavenDiaryBridgeSendButton.addEventListener(
    'click',
    () => {

      const titleElement =
        document.getElementById(
          'heaven-diary-title'
        );

      const bodyElement =
        document.getElementById(
          'heaven-diary-body'
        );

      const standaloneTitleElement =
        document.getElementById(
          'heaven-standalone-title'
        );

      const standaloneBodyElement =
        document.getElementById(
          'heaven-standalone-body'
        );

      const bridgeStatusElement =
        document.getElementById(
          'heaven-bridge-status'
        );


      if (
        !(titleElement
          instanceof HTMLInputElement)
        || !(bodyElement
          instanceof HTMLTextAreaElement)
      ) {
        return;
      }


      const title =
        titleElement.value.trim();

      const body =
        bodyElement.value.trim();


      if (!title) {

        window.alert(
          '日記タイトルを入力してください。'
        );

        titleElement.focus();

        return;
      }


      if (!body) {

        window.alert(
          'ヘブン投稿本文がありません。'
        );

        bodyElement.focus();

        return;
      }


      if (
        !(standaloneTitleElement
          instanceof HTMLInputElement)
        || !(standaloneBodyElement
          instanceof HTMLTextAreaElement)
        || !(heavenStandaloneBridgeSendButton
          instanceof HTMLButtonElement)
        || heavenStandaloneBridgeSendButton.disabled
      ) {

        window.alert(
          'Userscripts Bridgeがまだ準備できていません。'
        );

        return;
      }


      const originalTitle =
        standaloneTitleElement.value;

      const originalBody =
        standaloneBodyElement.value;


      let bridgeFinished =
        false;

      let bridgeObserver =
        null;


      const restoreBridgeFields =
        () => {

          if (bridgeFinished) {
            return;
          }


          bridgeFinished =
            true;


          bridgeObserver
            ?.disconnect();


          standaloneTitleElement.value =
            originalTitle;

          standaloneBodyElement.value =
            originalBody;


          standaloneTitleElement.dispatchEvent(
            new Event(
              'input',
              {
                bubbles:
                  true,
              }
            )
          );

          standaloneBodyElement.dispatchEvent(
            new Event(
              'input',
              {
                bubbles:
                  true,
              }
            )
          );


          window.setTimeout(
            () => {

              window.KohakuReservationHeavenBridgeActive =
                false;
            },
            0
          );


          heavenDiaryBridgeSendButton.disabled =
            false;

          heavenDiaryBridgeSendButton.textContent =
            '🩷 ヘブンへ送る';


          syncHeavenDiaryBridgeButton();
        };


      window.KohakuReservationHeavenBridgeActive =
        true;


      standaloneTitleElement.value =
        title;

      standaloneBodyElement.value =
        body;


      standaloneTitleElement.dispatchEvent(
        new Event(
          'input',
          {
            bubbles:
              true,
          }
        )
      );

      standaloneBodyElement.dispatchEvent(
        new Event(
          'input',
          {
            bubbles:
              true,
          }
        )
      );


      saveHeavenDiaryLocalDraft();


      heavenDiaryBridgeSendButton.disabled =
        true;

      heavenDiaryBridgeSendButton.textContent =
        '🩷 送信準備中…';


      if (bridgeStatusElement) {

        bridgeObserver =
          new MutationObserver(
            () => {

              const statusText =
                bridgeStatusElement.textContent
                  || '';


              if (
                statusText.includes(
                  '送信準備できました'
                )
              ) {

                heavenDiaryBridgeSendButton.textContent =
                  '✓ 送信準備できました';


                window.setTimeout(
                  restoreBridgeFields,
                  1200
                );
              }
            }
          );


        bridgeObserver.observe(
          bridgeStatusElement,
          {
            childList:
              true,

            characterData:
              true,

            subtree:
              true,
          }
        );
      }


      heavenStandaloneBridgeSendButton.click();


      window.setTimeout(
        restoreBridgeFields,
        8000
      );
    }
  );
}
