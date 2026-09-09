/* ========================================
   STANDALONE HEAVEN DIARY
======================================== */

const heavenStandaloneScheduleApiUrl =
  '/api/v1/schedule.php';
const heavenStandaloneShiftsApiUrl =
  '/api/v1/shifts.php';
const heavenStandaloneStoreName = '札幌';
const heavenStandaloneMinimumMinutes = 60;
const heavenStandaloneBufferMinutes = 15;
// 正式な入力上限ではなく、表示上長く感じるUI目安。
const HEAVEN_TITLE_WARNING_LENGTH = 24;

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
};

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
    if (candidate + heavenStandaloneMinimumMinutes + heavenStandaloneBufferMinutes <= reservation.start) {
      const lastSlot = shiftEnd !== null
        && candidate + heavenStandaloneMinimumMinutes + heavenStandaloneBufferMinutes + heavenStandaloneMinimumMinutes > shiftEnd;
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
    candidate = reservation.end + heavenStandaloneBufferMinutes;
  }

  if (shiftEnd === null) {
    return {
      status: 'available',
      candidate,
      nextReservation: null,
      skipped,
    };
  }

  if (candidate + heavenStandaloneMinimumMinutes <= shiftEnd) {
    return {
      status: candidate + heavenStandaloneMinimumMinutes + heavenStandaloneBufferMinutes + heavenStandaloneMinimumMinutes > shiftEnd
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
  return names.length ? 'いっぱいOPつけてくれたから楽しみ☺️' : '会えるの楽しみ♡いっぱい楽しもうね☺️';
}

function heavenStandaloneParagraphs(lines) {
  return lines.filter(Boolean).join('\n\n');
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
  if (!(titleField instanceof HTMLInputElement) || !count || !warning) return;

  const length = [...titleField.value].length;
  count.textContent = `${length}文字`;
  warning.hidden = length < HEAVEN_TITLE_WARNING_LENGTH;
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
  return heavenStandaloneBuildCalculation(start + heavenStandaloneBufferMinutes, reservations);
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
  const nextText = calculation?.status === 'closed'
    ? heavenStandaloneState.closingChoice === 'consultation' && calculation.candidate !== null
      ? `次回${heavenStandaloneFormatCompactTime(calculation.candidate)}から要相談♡`
      : ''
    : calculation?.status === 'last'
      ? `次回${heavenStandaloneFormatCompactTime(calculation.candidate)}からラスト1枠！`
      : calculation?.status === 'available'
        ? `最速${heavenStandaloneFormatCompactTime(calculation.candidate)}過ぎから！`
        : '';

  let title = '出勤準備中♡';
  if (nextText) title += nextText;

  const firstLine = first
    ? `スタートから${heavenStandaloneCustomerWord(first)}ありがと♡`
    : 'ただいま出勤準備中♡';
  const secondLine = first
    ? heavenStandaloneOptionsText(first)
    : '今日も元気にがんばるよー！！';
  const thirdLine = calculation?.status === 'closed'
    ? heavenStandaloneState.closingChoice === 'consultation'
      ? `まだ続けるよー！${calculation.candidate !== null ? `次回${heavenStandaloneFormatCompactTime(calculation.candidate)}から要相談♡` : '次回要相談♡'}`
      : '本日終了！今日もありがと♡'
    : hasStartSlot && first
      ? 'スタートはまだ空いてるよ☆どしどしお誘いまってるからね♡'
      : 'どしどしお誘いまってるからね♡';

  return {
    title,
    body: heavenStandaloneParagraphs([
      firstLine,
      secondLine,
      `${thirdLine}\n❄︎こはく❄︎`,
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

  let title = '';
  if (sequence === 1) title = `この後の${heavenStandaloneCustomerWord(visit, true)}ありがと♡`;
  else if (sequence === 2) title = '連続ありがと♡';
  else if (sequence === 3) title = '3連続ありがと♡';
  else title = 'この後の仲良しさんありがと♡';

  if (calculation?.status === 'closed') {
    return heavenStandaloneState.closingChoice === 'consultation'
      ? {
        title,
        body: heavenStandaloneParagraphs([
          `${heavenStandaloneCustomerWord(visit)}ありがとー♡${heavenStandaloneOptionsText(visit)}`,
          `そのあとは${calculation.candidate !== null ? `${heavenStandaloneFormatCompactTime(calculation.candidate)}から` : ''}要相談♡`,
          'まだまだお誘いまってるよー！\n❄︎こはく❄︎',
        ]),
      }
      : {
        title: '本日終了！',
        body: heavenStandaloneParagraphs([
          '今日もありがと♡',
          'いっぱい楽しかったよー！',
          'また遊びにきてね☺️\n❄︎こはく❄︎',
        ]),
      };
  }

  const nextText = calculation?.status === 'last'
    ? `そのあとは${heavenStandaloneFormatCompactTime(calculation.candidate)}からラスト1枠☆`
    : `そのあとは最速${heavenStandaloneFormatCompactTime(calculation?.candidate)}から☆`;
  return {
    title: `${title}${calculation?.candidate ? `最速${heavenStandaloneFormatCompactTime(calculation.candidate)}から！` : ''}`,
    body: heavenStandaloneParagraphs([
      `${heavenStandaloneCustomerWord(visit)}ありがとー♡${heavenStandaloneOptionsText(visit)}`,
      nextText,
      'どんどんお誘いまってるよー！\n❄︎こはく❄︎',
    ]),
  };
}

function heavenStandaloneGenerate() {
  const type = heavenStandaloneCurrentType();
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
