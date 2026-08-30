/* ========================================
   HEAVEN DIARY
======================================== */

function startHeavenDiary(
  visit
) {

  if (!visit) {
    return;
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


  loadSavedHeavenDiary(
    visit
  );
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
    return;
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
      return;
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
  }
}


async function generateHeavenDiary() {

  const visit =
    diaryState.sourceVisit;


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
    diaryState.sourceVisit;


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


    if (statusElement) {

      statusElement.hidden =
        false;

      statusElement.textContent =
        '✓ DBに保存しました';
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
  note = '',
  extraNote = ''
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
    visit.customer_status ===
      'repeat';


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