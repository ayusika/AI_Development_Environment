/* ========================================
   HEAVEN DIARY
======================================== */

let activeHeavenDiaryVisit = null;


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
    !body.trim()
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
      saveHeavenDiaryLocalDraft
    );
  });


function startHeavenDiary(
  visit
) {

  if (!visit) {
    return;
  }


  activeHeavenDiaryVisit =
    visit;


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


  loadSavedHeavenDiary(
    visit
  )
    .then((savedDiaryExists) => {

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


      if (savedDiaryExists) {

        clearHeavenDiaryLocalDraft(
          visit.id
        );

        return;
      }


      const localDraftRestored =
        restoreHeavenDiaryLocalDraft(
          visit
        );


      if (!localDraftRestored) {

        loadHeavenDiaryCloudDraft(
          visit
        );
      }
    });
}


async function loadSavedHeavenDiary(
  visit
) {

  const bodyElement =
    document.getElementById(
      'heaven-diary-saved-body'
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


  bodyElement.value =
    '';


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
      'heaven-diary-saved-body'
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


  const placeText =
    selectedPlace?.value === 'room'
      ? 'Rで'
      : 'ホテルで';


  const opening =
    optionText
      ? `さっき${placeText}${courseMinutes}分${optionText}希望の${repeatText}お兄さん♡`
      : `さっき${placeText}${courseMinutes}分の${repeatText}お兄さん♡`;


  const bodyParts = [
    opening,
  ];


  if (note) {
    bodyParts.push(
      note
    );
  }


  bodyParts.push(
    '❄︎こはく❄︎'
  );


  bodyElement.value =
    bodyParts.join(
      '\n\n\n'
    );
}