/* ========================================
   STANDALONE HEAVEN DIARY
======================================== */

const heavenStandaloneScheduleApiUrl =
  '/api/v1/schedule.php';
const heavenStandaloneShiftsApiUrl =
  '/api/v1/shifts.php';
const heavenStandaloneStoreName = '札幌';
// 正式な入力上限ではなく、表示上長く感じるUI目安。
const HEAVEN_TITLE_WARNING_LENGTH = 24;
const HEAVEN_TITLE_STRONG_WARNING_LENGTH = 28;

const heavenStandaloneState = {
  businessDate: '',
  visits: [],
  shift: null,
  calculation: null,
  selectedVisitId: '',
  sequenceOverride: 'auto',
  closingChoice: 'finished',
  loading: false,
  apiLoadFailed: false,
  generatedPhraseIds: [],
  pendingUsage: [],
};

function heavenStandaloneSettings() {
  return window.KohakuHeavenSettings?.current || {
    basic: { signature: '❄︎こはく❄︎', avoid_same_day: true, reroll_enabled: true, paragraphs: 3 },
    rules: { minimum_minutes: 60, buffer_minutes: 15 },
    title: { recommended: 23, warning: 24, strong: 28 },
    phrases: [],
    op_phrases: [],
    title_templates: {},
  };
}

function heavenStandaloneRuleMinutes() {
  return heavenStandaloneSettings().rules.minimum_minutes;
}

function heavenStandaloneRuleBuffer() {
  return heavenStandaloneSettings().rules.buffer_minutes;
}

function heavenStandaloneToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function heavenStandaloneBusinessDate(value) {
  const text = String(value || '');
  const match = text.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})/);
  if (!match) return '';

  if (Number(match[2]) < 3) {
    const date = new Date(`${match[1]}T00:00:00`);
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  return match[1];
}

function heavenStandaloneMinutesFromDateTime(value, businessDate) {
  const text = String(value || '');
  const match = text.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})/);
  if (!match || !businessDate) return null;

  const date = new Date(`${match[1]}T00:00:00`);
  const base = new Date(`${businessDate}T00:00:00`);
  const dayOffset = Math.round((date - base) / 86400000);
  return dayOffset * 1440 + Number(match[2]) * 60 + Number(match[3]);
}

function heavenStandaloneVisitDuration(visit) {
  const extensionMinutes = Array.isArray(visit.extensions)
    ? visit.extensions.reduce((total, extension) => (
      total
      + Number(extension.course_minutes || 0) * Number(extension.quantity || 1)
    ), 0)
    : 0;

  return Number(visit.course_minutes || 0) + extensionMinutes;
}

function heavenStandaloneVisitEnd(visit, businessDate) {
  const start = heavenStandaloneMinutesFromDateTime(visit.started_at, businessDate);
  return start === null ? null : start + heavenStandaloneVisitDuration(visit);
}

function heavenStandaloneIsValidVisit(visit, businessDate) {
  return Boolean(
    visit
    && visit.store_name === heavenStandaloneStoreName
    && visit.status !== 'cancelled'
    && !visit.cancelled_at
    && heavenStandaloneBusinessDate(visit.started_at) === businessDate
    && heavenStandaloneMinutesFromDateTime(visit.started_at, businessDate) !== null
    && heavenStandaloneVisitDuration(visit) > 0
  );
}

function heavenStandaloneShiftMinutes(shift, businessDate) {
  if (!shift || shift.status !== 'confirmed' || Number(shift.is_reservation_owner) !== 1) {
    return null;
  }

  const start = heavenStandaloneMinutesFromDateTime(shift.start_at, businessDate);
  const end = heavenStandaloneMinutesFromDateTime(shift.end_at, businessDate);
  if (start === null || end === null || end <= start) return null;

  return { start, end };
}

function findNextReceptionSlot(reservations, shiftEnd, startCandidate) {
  const sortedReservations = [...reservations]
    .sort((left, right) => left.start - right.start);
  let candidate = startCandidate;
  const skipped = [];

  for (const reservation of sortedReservations) {
    if (candidate + heavenStandaloneRuleMinutes() + heavenStandaloneRuleBuffer() <= reservation.start) {
      const lastSlot = shiftEnd !== null
        && candidate + heavenStandaloneRuleMinutes() + heavenStandaloneRuleBuffer() + heavenStandaloneRuleMinutes() > shiftEnd;
      return {
        status: lastSlot ? 'last' : 'available',
        candidate,
        nextReservation: reservation,
        skipped,
      };
    }

    skipped.push({
      candidate,
      nextReservation: reservation,
      reason: '次予約まで15分取れないためスキップ',
    });
    candidate = reservation.end + heavenStandaloneRuleBuffer();
  }

  if (shiftEnd === null) {
    return {
      status: 'available',
      candidate,
      nextReservation: null,
      skipped,
    };
  }

  if (candidate + heavenStandaloneRuleMinutes() <= shiftEnd) {
    return {
      status: candidate + heavenStandaloneRuleMinutes() + heavenStandaloneRuleBuffer() + heavenStandaloneRuleMinutes() > shiftEnd
        ? 'last'
        : 'available',
      candidate,
      nextReservation: null,
      skipped,
    };
  }

  return {
    status: 'closed',
    candidate,
    nextReservation: null,
    skipped,
  };
}

function heavenStandaloneFormatMinutes(minutes) {
  if (minutes === null || minutes === undefined) return '';
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function heavenStandaloneFormatCompactTime(minutes) {
  return heavenStandaloneFormatMinutes(minutes).replace(/^0/, '');
}

function heavenStandaloneCustomerWord(visit, title = false) {
  if (visit.customer_status === 'new') return title ? 'お兄さん' : 'はじめましてさん';
  return title ? '仲良しさん' : '仲良しさん';
}

function heavenStandaloneSequence(visit) {
  const ordered = heavenStandaloneState.visits
    .filter((item) => item.booked_at)
    .sort((left, right) => String(left.booked_at).localeCompare(String(right.booked_at)) || Number(left.id) - Number(right.id));
  const index = ordered.findIndex((item) => String(item.id) === String(visit?.id));
  if (index < 0) return null;
  return Math.min(index + 1, 3);
}

function heavenStandaloneOptionsText(visit) {
  const names = Array.isArray(visit?.options)
    ? visit.options.map((option) => option.name || option.custom_name || '').filter(Boolean)
    : [];
  if (!names.length) return heavenStandalonePickPhrase('next_fun', '会えるの楽しみ♡いっぱい楽しもうね☺️');
  const settings = heavenStandaloneSettings();
  const specific = settings.op_phrases.filter((phrase) => phrase.enabled && names.some((name) => name === phrase.op_name));
  const phrase = specific.length ? specific[Math.floor(Math.random() * specific.length)] : null;
  if (phrase) {
    heavenStandaloneState.pendingUsage.push({ phrase_id: phrase.id, category: `op:${phrase.op_name}` });
    return phrase.text;
  }
  return heavenStandalonePickPhrase('next_fun', 'いっぱいOPつけてくれたから楽しみ☺️');
}

function heavenStandalonePickPhrase(category, fallback = '') {
  const picked = window.KohakuHeavenSettings?.pick(category, heavenStandaloneState.generatedPhraseIds) || { text: '', phrase_id: '' };
  if (picked.phrase_id) {
    heavenStandaloneState.generatedPhraseIds.push(picked.phrase_id);
    heavenStandaloneState.pendingUsage.push({ phrase_id: picked.phrase_id, category });
  }
  return picked.text || fallback;
}

function heavenStandaloneBuildCompactTitle(candidates) {
  const validCandidates = candidates.filter(Boolean);
  const recommended = Number(heavenStandaloneSettings().title.recommended) || 23;
  return validCandidates.find((candidate) => [...candidate].length <= recommended)
    || validCandidates[validCandidates.length - 1]
    || '';
}

function heavenStandaloneParagraphs(lines) {
  const content = lines.filter(Boolean);
  const signature = heavenStandaloneSettings().basic.signature || '❄︎こはく❄︎';
  const paragraphs = Number(heavenStandaloneSettings().basic.paragraphs) || 3;
  if (paragraphs === 2) return [content.slice(0, -1).join('\n'), signature].join('\n\n');
  if (paragraphs === 4) return [...content.slice(0, -1), signature].join('\n\n');
  return [...content.slice(0, -1).join('\n\n'), signature].join('\n\n');
}

function heavenStandaloneTitleTemplate(key, fallback, values = {}) {
  const template = heavenStandaloneSettings().title_templates[key] || fallback;
  return String(template).replace(/\{(time|customer)\}/g, (_, name) => String(values[name] ?? ''));
}

function heavenStandaloneBuildCalculation(startCandidate, reservations) {
  const shiftTimes = heavenStandaloneShiftMinutes(
    heavenStandaloneState.shift,
    heavenStandaloneState.businessDate
  );
  const shiftEnd = shiftTimes ? shiftTimes.end : null;
  return findNextReceptionSlot(reservations, shiftEnd, startCandidate);
}

function heavenStandaloneReservationAfter(visit) {
  const start = heavenStandaloneMinutesFromDateTime(visit.started_at, heavenStandaloneState.businessDate);
  const selectedIndex = heavenStandaloneState.visits.findIndex((item) => String(item.id) === String(visit.id));
  return heavenStandaloneState.visits
    .filter((item, index) => index > selectedIndex && heavenStandaloneMinutesFromDateTime(item.started_at, heavenStandaloneState.businessDate) > start)
    .map((item) => ({
      visit: item,
      start: heavenStandaloneMinutesFromDateTime(item.started_at, heavenStandaloneState.businessDate),
      end: heavenStandaloneVisitEnd(item, heavenStandaloneState.businessDate),
    }))
    .filter((item) => item.start !== null && item.end !== null);
}

function heavenStandaloneReservationList() {
  return heavenStandaloneState.visits.map((visit) => ({
    visit,
    start: heavenStandaloneMinutesFromDateTime(visit.started_at, heavenStandaloneState.businessDate),
    end: heavenStandaloneVisitEnd(visit, heavenStandaloneState.businessDate),
  })).filter((item) => item.start !== null && item.end !== null);
}

function heavenStandaloneCurrentType() {
  return document.querySelector('input[name="heaven-standalone-type"]:checked')?.value || 'attendance';
}

function updateHeavenStandaloneTitleCount() {
  const titleField = document.getElementById('heaven-standalone-title');
  const count = document.getElementById('heaven-standalone-title-count');
  const warning = document.getElementById('heaven-standalone-title-warning');
  const strongWarning = document.getElementById('heaven-standalone-title-strong-warning');
  if (!(titleField instanceof HTMLInputElement) || !count || !warning || !strongWarning) return;

  const length = [...titleField.value].length;
  const titleSettings = heavenStandaloneSettings().title;
  const warningLength = Number(titleSettings.warning) || HEAVEN_TITLE_WARNING_LENGTH;
  const strongWarningLength = Number(titleSettings.strong) || HEAVEN_TITLE_STRONG_WARNING_LENGTH;
  count.textContent = `${length}文字`;
  warning.hidden = length < warningLength || length >= strongWarningLength;
  strongWarning.hidden = length < strongWarningLength;
}

function heavenStandaloneSelectedVisit() {
  return heavenStandaloneState.visits.find((visit) => String(visit.id) === String(heavenStandaloneState.selectedVisitId)) || null;
}

function heavenStandaloneSelectedCalculation() {
  const selected = heavenStandaloneSelectedVisit();
  const shiftTimes = heavenStandaloneShiftMinutes(heavenStandaloneState.shift, heavenStandaloneState.businessDate);
  if (!selected) return heavenStandaloneState.calculation;

  const reservations = heavenStandaloneReservationAfter(selected);
  const start = heavenStandaloneVisitEnd(selected, heavenStandaloneState.businessDate);
  return heavenStandaloneBuildCalculation(start + heavenStandaloneRuleBuffer(), reservations);
}

function heavenStandaloneRenderNavigator(calculation) {
  const navigator = document.getElementById('heaven-standalone-navigator');
  const closingChoice = document.getElementById('heaven-standalone-closing-choice');
  if (!navigator) return;

  if (heavenStandaloneState.loading) {
    navigator.textContent = '予約・シフトを確認中…';
    return;
  }

  const type = heavenStandaloneCurrentType();
  navigator.hidden = type === 'chat';
  if (type === 'chat') {
    if (closingChoice) closingChoice.hidden = true;
    return;
  }

  const shiftTimes = heavenStandaloneShiftMinutes(heavenStandaloneState.shift, heavenStandaloneState.businessDate);
  const lines = ['次回受付ナビ'];

  if (heavenStandaloneState.apiLoadFailed) {
    lines.push('⚠️ 予約・シフト情報を取得できませんでした');
    lines.push('推測で受付時刻を表示しません。');
    navigator.textContent = lines.join('\n');
    if (closingChoice) closingChoice.hidden = true;
    return;
  }

  if (!shiftTimes) lines.push('出勤終了時刻を確認できないため、ラスト1枠は推測しません。');

  if (calculation?.status === 'available' || calculation?.status === 'last') {
    lines.push(`最速 ${heavenStandaloneFormatCompactTime(calculation.candidate)}〜`);
    lines.push('60分予約 OK');
    if (calculation.nextReservation) {
      lines.push(`次予約 ${heavenStandaloneFormatCompactTime(calculation.nextReservation.start)}`);
      lines.push('次予約前15分確保 OK');
    }
    if (calculation.status === 'last') lines.push('本日の通常受付はあと1枠');
  } else if (calculation?.status === 'closed') {
    lines.push('登録済みシフト終了時刻を超えるため、通常受付枠はありません。');
    lines.push('本日終了か、まだ続けるかを選択してください。');
  } else {
    lines.push('計算結果を確認できません。');
  }

  for (const skipped of calculation?.skipped || []) {
    lines.push(`${heavenStandaloneFormatCompactTime(skipped.candidate)}〜 → ${skipped.reason}`);
  }

  navigator.textContent = lines.join('\n');
  if (closingChoice) closingChoice.hidden = calculation?.status !== 'closed';
}

function heavenStandaloneRenderReservationSelector() {
  const selector = document.getElementById('heaven-standalone-reservation');
  if (!selector) return;

  const placeholder = heavenStandaloneState.selectedVisitId
    ? ''
    : '<option value="">対象予約を選択してください</option>';
  selector.innerHTML = placeholder + heavenStandaloneState.visits.map((visit) => {
    const start = heavenStandaloneMinutesFromDateTime(visit.started_at, heavenStandaloneState.businessDate);
    const label = `${heavenStandaloneFormatCompactTime(start)} ${heavenStandaloneCustomerWord(visit, true)}・${heavenStandaloneVisitDuration(visit)}分`;
    return `<option value="${escapeHtml(String(visit.id))}">${escapeHtml(label)}</option>`;
  }).join('');

  if (heavenStandaloneState.selectedVisitId) selector.value = heavenStandaloneState.selectedVisitId;
}

function heavenStandaloneRenderControls() {
  const type = heavenStandaloneCurrentType();
  const nextControls = document.getElementById('heaven-standalone-next-controls');
  const chatNote = document.getElementById('heaven-standalone-chat-note');
  const generateButton = document.getElementById('heaven-standalone-generate');
  if (nextControls) nextControls.hidden = type !== 'next';
  if (chatNote) chatNote.hidden = type !== 'chat';
  if (generateButton) generateButton.hidden = type === 'chat';

  const calculation = type === 'next'
    ? heavenStandaloneSelectedCalculation()
    : heavenStandaloneState.calculation;
  heavenStandaloneRenderNavigator(calculation);
}

function heavenStandaloneBuildAttendance() {
  const calculation = heavenStandaloneState.calculation;
  const reservations = heavenStandaloneReservationList();
  const shiftTimes = heavenStandaloneShiftMinutes(heavenStandaloneState.shift, heavenStandaloneState.businessDate);
  const first = reservations[0]?.visit || null;
  const hasStartSlot = Boolean(
    shiftTimes
    && reservations.length > 0
    && heavenStandaloneBuildCalculation(shiftTimes.start, reservations).status !== 'closed'
  );
  let title = '出勤準備中♡';
  if (reservations.length === 0) {
    title = heavenStandaloneTitleTemplate('attendance_empty', '出勤準備中♡');
  } else if (calculation?.status === 'closed') {
    if (heavenStandaloneState.closingChoice === 'consultation' && calculation.candidate !== null) {
      title = heavenStandaloneBuildCompactTitle([
        heavenStandaloneTitleTemplate('attendance_consultation', `出勤準備中♡{time}〜要相談`, { time: heavenStandaloneFormatCompactTime(calculation.candidate) }),
        `次回${heavenStandaloneFormatCompactTime(calculation.candidate)}〜要相談♡`,
      ]);
    } else {
      title = heavenStandaloneTitleTemplate('attendance_finished', '本日終了！');
    }
  } else if (calculation?.status === 'last') {
    title = heavenStandaloneBuildCompactTitle([
      heavenStandaloneTitleTemplate('attendance_last', `出勤準備中♡{time}〜ラスト1枠！`, { time: heavenStandaloneFormatCompactTime(calculation.candidate) }),
      `${heavenStandaloneFormatCompactTime(calculation.candidate)}〜ラスト1枠！`,
    ]);
  } else if (calculation?.status === 'available') {
    title = heavenStandaloneBuildCompactTitle([
      heavenStandaloneTitleTemplate('attendance_available', `出勤準備中♡最速{time}〜！`, { time: heavenStandaloneFormatCompactTime(calculation.candidate) }),
      `最速${heavenStandaloneFormatCompactTime(calculation.candidate)}〜！`,
    ]);
  }

  const firstLine = first
    ? heavenStandalonePickPhrase(first.customer_status === 'new' ? 'attendance_new' : 'attendance_repeat', `スタートから${heavenStandaloneCustomerWord(first)}ありがと♡`)
    : heavenStandalonePickPhrase('attendance_empty', 'ただいま出勤準備中♡');
  const secondLine = first
    ? heavenStandaloneOptionsText(first)
    : heavenStandalonePickPhrase('attendance_empty', '今日も元気にがんばるよー！！');
  const thirdLine = calculation?.status === 'closed'
    ? heavenStandaloneState.closingChoice === 'consultation'
      ? heavenStandalonePickPhrase('attendance_consultation', `まだ続けるよー！${calculation.candidate !== null ? `次回${heavenStandaloneFormatCompactTime(calculation.candidate)}から要相談♡` : '次回要相談♡'}`)
      : '本日終了！今日もありがと♡'
    : hasStartSlot && first
      ? `${heavenStandalonePickPhrase('attendance_start_open', 'スタートはまだ空いてるよ☆')} ${heavenStandalonePickPhrase('attendance_invite', 'どしどしお誘いまってるからね♡')}`
      : heavenStandalonePickPhrase('attendance_invite', 'どしどしお誘いまってるからね♡');

  return {
    title,
    body: heavenStandaloneParagraphs([
      firstLine,
      secondLine,
      thirdLine,
    ]),
  };
}

function heavenStandaloneBuildNextNotice() {
  const visit = heavenStandaloneSelectedVisit();
  const calculation = heavenStandaloneSelectedCalculation();
  const sequence = heavenStandaloneState.sequenceOverride === 'auto'
    ? heavenStandaloneSequence(visit)
    : Number(heavenStandaloneState.sequenceOverride);

  if (!visit) return { title: '', body: '' };

  const customerTitleWord = heavenStandaloneCustomerWord(visit, true);
  const titleBase = sequence === 1
    ? `${customerTitleWord}ありがと♡`
    : sequence === 2
      ? '連続ありがと♡'
      : sequence === 3
        ? '3連続ありがと♡'
        : '仲良しさんありがと♡';

  if (calculation?.status === 'closed') {
    return heavenStandaloneState.closingChoice === 'consultation'
      ? {
        title: calculation.candidate !== null
          ? heavenStandaloneTitleTemplate('next_consultation', `次回{time}〜要相談♡`, { time: heavenStandaloneFormatCompactTime(calculation.candidate) })
          : '要相談♡',
        body: heavenStandaloneParagraphs([
          `${heavenStandaloneCustomerWord(visit)}ありがとー♡${heavenStandaloneOptionsText(visit)}`,
          `そのあとは${calculation.candidate !== null ? `${heavenStandaloneFormatCompactTime(calculation.candidate)}から` : ''}要相談♡`,
          'まだまだお誘いまってるよー！',
        ]),
      }
      : {
        title: '本日終了！',
        body: heavenStandaloneParagraphs([
          '今日もありがと♡',
          'いっぱい楽しかったよー！',
          'また遊びにきてね☺️',
        ]),
      };
  }

  const nextText = calculation?.status === 'last'
    ? `そのあとは${heavenStandaloneFormatCompactTime(calculation.candidate)}からラスト1枠☆`
    : `そのあとは最速${heavenStandaloneFormatCompactTime(calculation?.candidate)}から☆`;
  const title = !calculation || calculation.candidate === null
    ? titleBase
    : calculation.status === 'last'
    ? heavenStandaloneBuildCompactTitle([
      heavenStandaloneTitleTemplate('next_last', `{customer}♡{time}〜ラスト1枠！`, { customer: customerTitleWord, time: heavenStandaloneFormatCompactTime(calculation.candidate) }),
      `${customerTitleWord}ありがと♡${heavenStandaloneFormatCompactTime(calculation.candidate)}〜ラスト1枠！`,
    ])
    : heavenStandaloneBuildCompactTitle([
      heavenStandaloneTitleTemplate(sequence === 1 && visit.customer_status === 'new' ? 'next_new' : sequence === 1 ? 'next_repeat' : sequence === 2 ? 'next_sequence_2' : 'next_sequence_3', `${titleBase}最速{time}〜！`, { customer: customerTitleWord, time: heavenStandaloneFormatCompactTime(calculation?.candidate) }),
      `${titleBase}${heavenStandaloneFormatCompactTime(calculation?.candidate)}〜！`,
    ]);
  return {
    title,
    body: heavenStandaloneParagraphs([
      `${heavenStandaloneCustomerWord(visit)}ありがとー♡${heavenStandaloneOptionsText(visit)}`,
      nextText,
      'どんどんお誘いまってるよー！',
    ]),
  };
}

function heavenStandaloneGenerate() {
  const type = heavenStandaloneCurrentType();
  heavenStandaloneState.pendingUsage = [];
  const titleField = document.getElementById('heaven-standalone-title');
  const bodyField = document.getElementById('heaven-standalone-body');
  if (!(titleField instanceof HTMLInputElement) || !(bodyField instanceof HTMLTextAreaElement)) return;

  if (type === 'chat') {
    titleField.value = titleField.value || 'ちょっと雑談♡';
    bodyField.value = bodyField.value || '';
    updateHeavenStandaloneTitleCount();
    return;
  }

  const generated = type === 'next'
    ? heavenStandaloneBuildNextNotice()
    : heavenStandaloneBuildAttendance();
  titleField.value = generated.title;
  bodyField.value = generated.body;
  updateHeavenStandaloneTitleCount();
}

async function heavenStandaloneLoad() {
  heavenStandaloneState.loading = true;
  heavenStandaloneState.apiLoadFailed = false;
  heavenStandaloneRenderControls();
  const date = heavenStandaloneToday();
  heavenStandaloneState.businessDate = date;

  try {
    const params = new URLSearchParams({ date_from: date, date_to: date });
    const [scheduleResponse, shiftResponse] = await Promise.all([
      fetch(`${heavenStandaloneScheduleApiUrl}?${params.toString()}`),
      fetch(`${heavenStandaloneShiftsApiUrl}?${params.toString()}`),
    ]);
    await window.KohakuHeavenSettings?.load(date);
    const scheduleData = await scheduleResponse.json();
    const shiftData = await shiftResponse.json();
    if (!scheduleResponse.ok || !scheduleData.success) throw new Error(scheduleData.error || '予約の取得に失敗しました。');
    if (!shiftResponse.ok || !shiftData.success) throw new Error(shiftData.error || 'シフトの取得に失敗しました。');

    heavenStandaloneState.visits = (scheduleData.visits || [])
      .filter((visit) => heavenStandaloneIsValidVisit(visit, date))
      .map((visit) => ({ ...visit }))
      .sort((left, right) => String(left.started_at).localeCompare(String(right.started_at)) || Number(left.id) - Number(right.id));
    heavenStandaloneState.shift = (shiftData.shifts || []).find((shift) => shift.shift_date === date && shift.store_name === heavenStandaloneStoreName && Number(shift.is_reservation_owner) === 1 && shift.status === 'confirmed') || null;

    const shiftTimes = heavenStandaloneShiftMinutes(heavenStandaloneState.shift, date);
    const reservations = heavenStandaloneReservationList();
    heavenStandaloneState.calculation = shiftTimes
      ? heavenStandaloneBuildCalculation(shiftTimes.start, reservations)
      : null;
    if (!heavenStandaloneState.selectedVisitId) {
      const booked = heavenStandaloneState.visits.filter((visit) => visit.booked_at);
      const latest = [...booked].sort((left, right) => String(right.booked_at).localeCompare(String(left.booked_at)))[0];
      heavenStandaloneState.selectedVisitId = String(latest?.id || '');
    }
    heavenStandaloneRenderReservationSelector();
  } catch (error) {
    console.error('Failed to load standalone Heaven data.', error);
    heavenStandaloneState.apiLoadFailed = true;
    heavenStandaloneState.visits = [];
    heavenStandaloneState.shift = null;
    heavenStandaloneState.calculation = null;
    const navigator = document.getElementById('heaven-standalone-navigator');
    if (navigator) navigator.textContent = '⚠️ 予約・シフト情報を取得できませんでした\n推測で受付時刻を表示しません。';
  } finally {
    heavenStandaloneState.loading = false;
    heavenStandaloneRenderControls();
  }
}

function initializeHeavenStandalone() {
  const root = document.getElementById('view-heaven-diary');
  if (!root) return;

  root.addEventListener('change', (event) => {
    if (event.target.matches('input[name="heaven-standalone-type"]')) heavenStandaloneRenderControls();
    if (event.target.id === 'heaven-standalone-reservation') {
      heavenStandaloneState.selectedVisitId = event.target.value;
      heavenStandaloneRenderControls();
    }
    if (event.target.id === 'heaven-standalone-sequence') {
      heavenStandaloneState.sequenceOverride = event.target.value;
    }
  });

  document.getElementById('heaven-standalone-title')?.addEventListener(
    'input',
    updateHeavenStandaloneTitleCount
  );
  updateHeavenStandaloneTitleCount();

  root.addEventListener('click', (event) => {
    const closingButton = event.target.closest('[data-heaven-closing-choice]');
    if (closingButton) {
      heavenStandaloneState.closingChoice = closingButton.dataset.heavenClosingChoice;
      heavenStandaloneRenderControls();
    }
    if (event.target.closest('#heaven-standalone-generate')) heavenStandaloneGenerate();
  });

  const bridgeStatus = document.getElementById('heaven-bridge-status');
  if (bridgeStatus) {
    new MutationObserver(() => {
      if (bridgeStatus.textContent.includes('送信準備できました')) {
        void window.KohakuHeavenSettings?.record(
          heavenStandaloneState.businessDate,
          heavenStandaloneState.pendingUsage
        );
        heavenStandaloneState.pendingUsage = [];
      }
    }).observe(bridgeStatus, { childList: true, characterData: true, subtree: true });
  }

  const openButton = document.querySelector('[data-action="open-heaven-diary"]');
  openButton?.addEventListener('click', () => {
    void heavenStandaloneLoad();
  });
  void heavenStandaloneLoad();
}

window.KohakuHeavenStandalone = {
  findNextReceptionSlot,
  heavenStandaloneMinutesFromDateTime,
};

window.addEventListener('load', initializeHeavenStandalone);
