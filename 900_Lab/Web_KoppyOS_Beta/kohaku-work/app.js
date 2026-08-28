// WRITER:VIEW_REGISTRY:START

const views = {
  home: document.querySelector('[data-view="home"]'),
  diary: document.querySelector('[data-view="diary"]'),
  nukinaviCreate: document.querySelector('[data-view="nukinavi-create"]'),
  heavenCreate: document.querySelector('[data-view="heaven-create"]'),
  diaryEdit: document.querySelector('[data-view="diary-edit"]'),
  postPrep: document.querySelector('[data-view="post-prep"]'),
  schedule: document.querySelector('[data-view="schedule"]'),
  shift: document.querySelector('[data-view="shift"]'),
  customers: document.querySelector('[data-view="customers"]'),
  customerDetail: document.querySelector('[data-view="customer-detail"]'),
  database: document.querySelector('[data-view="database"]'),
  placeholder: document.querySelector('[data-view="placeholder"]'),
};

// WRITER:VIEW_REGISTRY:END

const navItems = document.querySelectorAll('.nav-item');

const diaryTitleInput = document.getElementById('diary-title');
const diaryBodyInput = document.getElementById('diary-body');

const postPreviewTitle = document.getElementById('post-preview-title');
const postPreviewBody = document.getElementById('post-preview-body');

const photoInput = document.getElementById('diary-photo');
const photoPreview = document.getElementById('photo-preview');
const photoPreviewImage = document.getElementById('photo-preview-image');

const placeholderTitle = document.getElementById('placeholder-title');

const draftCount = document.getElementById('draft-count');
const todayPostCount = document.getElementById('today-post-count');

let currentView = 'home';

const diaryState = {
  availability: '23時からラスト1枠',
  extraNote: '',
  selectedVisitIds: [],
  sourceVisitId: null,
  sourceCustomerId: null,
  sourceVisit: null,
  photoUrl: '',
  aiDraftTitle: '',
  aiDraftBody: '',
  finalTitle: '',
  finalBody: '',
  status: 'editing',
  posted: false,
};


/* ========================================
   VIEW CONTROL
======================================== */

function showView(viewName) {
  Object.values(views).forEach((view) => {
    if (!view) return;
    view.classList.remove('is-active');
  });

  const target = views[viewName];

  if (!target) {
    console.warn(`View not found: ${viewName}`);
    return;
  }

  target.classList.add('is-active');
  currentView = viewName;

  updateBottomNav(viewName);

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
}


function updateBottomNav(viewName) {
  navItems.forEach((item) => {
    item.classList.remove('is-active');
  });

  let activeNav = 'home';

  if (
    viewName === 'diary' ||
    viewName === 'nukinaviCreate' ||
    viewName === 'diaryEdit' ||
    viewName === 'postPrep'
  ) {
    activeNav = 'diary';
  }

  if (viewName === 'schedule') {
    activeNav = 'schedule';
  }

  if (viewName === 'shift') {
    activeNav = 'shift';
  }

  const activeItem = document.querySelector(
    `.nav-item[data-nav="${activeNav}"]`
  );

  if (activeItem) {
    activeItem.classList.add('is-active');
  }
}


/* ========================================
   NAVIGATION
======================================== */

document.addEventListener('click', (event) => {
  const actionButton =
    event.target.closest(
      '[data-action]'
    );

  const navButton =
    event.target.closest(
      '[data-nav]'
    );


  if (actionButton) {

    const action =
      actionButton.dataset.action;

    handleAction(
      action,
      actionButton
    );

    return;
  }


  if (navButton) {

    handleNav(
      navButton.dataset.nav
    );

    return;
  }
});


// WRITER:MAIN_NAV_ROUTING:START

function handleNav(navName) {
  if (navName === 'home') {
    showView('home');
    return;
  }

  if (navName === 'diary') {
    showView('diary');
    return;
  }

  if (navName === 'schedule') {
    showView('schedule');
    loadSchedule();
    return;
  }

  if (navName === 'shift') {
    showView('shift');
    loadShift();
    return;
  }

  if (navName === 'customers') {
    showView('customers');
    loadCustomers();
    return;
  }

  const labels = {
    sales: '売上',
    koppy: 'Koppy',
  };

  showPlaceholder(labels[navName] || '準備中');
}

// WRITER:MAIN_NAV_ROUTING:END


function handleAction(action, button) {
  switch (action) {
    case 'new-diary':
    case 'start-diary':
      startNukinaviDiary();
      break;

    case 'go-home':
      showView('home');
      break;

    case 'go-diary':
      showView('diary');
      break;

    case 'back-to-schedule':
      showView('schedule');
      break;

    case 'preview-shift-save':
      saveShiftBatch();
      break;

    case 'delete-shift':
      deleteEditingShift();
      break;

    case 'toggle-shift-confirm':
      toggleEditingShiftConfirmation();
      break;

    case 'copy-previous-shift-week':
      previewPreviousShiftWeek();
      break;

    case 'confirm-shift-week':
      confirmCurrentShiftWeek();
      break;

    case 'back-to-customers':
      showView('customers');
      break;

    case 'open-customer-detail':
      openCustomerDetail(
        button.dataset.customerId
      );
      break;

    case 'generate-diary':
      generateDiary();
      break;

    case 'generate-heaven-diary':
      generateHeavenDiary();
      break;

    case 'copy-heaven-diary':
      copyHeavenDiary();
      break;

    case 'save-heaven-diary':
      saveHeavenDiary();
      break;

    case 'edit-customer-diary':
      openCustomerEditor(button);
      break;

    case 'add-dummy-diary':
      addDummyDiary(button);
      break;

    case 'remove-dummy-diary':
      removeDummyDiary(button);
      break;

    case 'close-customer-editor':
      closeCustomerEditor();
      break;

    case 'generate-customer-ideas':
      generateCustomerIdeas();
      break;

    case 'switch-customer-idea':
      switchCustomerIdea(button.dataset.idea);
      break;

    case 'adopt-customer-idea':
      adoptCustomerIdea(button);
      break;

    case 'back-to-create':
      showView('nukinaviCreate');
      break;

    case 'prepare-post':
      preparePost();
      break;

    case 'back-to-edit':
      showView('diaryEdit');
      break;

    case 'save-draft':
      saveDraft();
      break;

    case 'rewrite-diary':
      applyRewriteNote();
      break;

    case 'voice-input':
      demoVoiceInput();
      break;

    case 'create-nukinavi-mail':
      createNukinaviMail();
      break;

    case 'mark-posted':
      markPosted();
      break;

    case 'open-drafts':
      showPlaceholder('下書き');
      break;

    case 'open-history':
      showPlaceholder('過去ログ');
      break;

    case 'open-rules':
      showPlaceholder('写メ日記ルール');
      break;

    case 'shift-detail':
      showView('schedule');
      loadSchedule();
      break;

    case 'add-visit':
      showView('schedule');
      loadSchedule().then(() => {
        openScheduleForm();
      });
      break;

    case 'open-schedule-form':
      openScheduleForm();
      break;

    case 'close-schedule-form':
      closeScheduleForm();
      break;

    case 'save-schedule-visit':
      saveScheduleVisit();
      break;

    case 'close-schedule-detail':
      closeScheduleDetail();
      break;

    case 'open-schedule-history':
      openCurrentScheduleHistory();
      break;

    case 'open-schedule-customer':
      openScheduleCustomerPanel();
      break;

    case 'open-schedule-diary':
      openScheduleDiary();
      break;

    case 'close-schedule-customer':
      closeScheduleCustomerPanel();
      break;

    case 'save-schedule-customer-features':
      saveScheduleCustomerFeatures();
      break;

    case 'add-schedule-identity-feature':
      addScheduleIdentityFeature();
      break;

    case 'search-schedule-identity':
      searchScheduleIdentity();
      break;

    case 'select-schedule-identity-candidate':
      selectScheduleIdentityCandidate(
        button
      );
      break;

    case 'link-schedule-existing-customer':
      linkScheduleExistingCustomer(
        button
      );
      break;

    case 'create-schedule-customer':
      createScheduleCustomer();
      break;

    case 'open-customer-cancel':
      openCustomerCancelPanel();
      break;

    case 'close-customer-cancel':
      closeCustomerCancelPanel();
      break;

    case 'save-customer-cancel':
      saveCustomerCancellation();
      break;

    case 'edit-schedule-visit':
      editCurrentScheduleVisit();
      break;

    case 'delete-schedule-visit':
      deleteCurrentScheduleVisit();
      break;

    case 'search-customer':
      showPlaceholder('顧客を探す');
      break;

    case 'open-database':
      showView('database');
      loadDatabaseViewer();
      break;

    case 'open-database-records':
      openDatabaseRecords(
        button.dataset.tableName
      );
      break;

    case 'close-database-records':
      closeDatabaseRecords();
      break;

    case 'close-inline-database-records':
      closeInlineDatabaseRecords(
        button.dataset.tableName
      );
      break;

    case 'settings':
      showPlaceholder('設定');
      break;

    default:
      console.log('Unhandled action:', action, button);
  }
}



function escapeHtml(
  value
) {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}





/* 🟥ここから↓🟥 DIARY */

/* ========================================
   DUMMY DIARY LITE
======================================== */

let dummyDiarySerial = 0;


function addDummyDiary(button) {
  const template =
    document.getElementById(
      'dummy-diary-template'
    );

  if (!template) return;

  dummyDiarySerial += 1;

  const fragment =
    template.content.cloneNode(true);

  const card =
    fragment.querySelector(
      '.dummy-diary-card'
    );

  if (!card) return;

  card.dataset.dummyId =
    `dummy-${dummyDiarySerial}`;

  card
    .querySelectorAll(
      'input[name="dummy-course"]'
    )
    .forEach((input) => {
      input.name =
        `dummy-course-${dummyDiarySerial}`;
    });

  card
    .querySelectorAll(
      'input[name="dummy-type"]'
    )
    .forEach((input) => {
      input.name =
        `dummy-type-${dummyDiarySerial}`;
    });

  button.insertAdjacentElement(
    'beforebegin',
    card
  );
}


function removeDummyDiary(button) {
  const card =
    button.closest('.dummy-diary-card');

  card?.remove();
}


/* ========================================
   CUSTOMER INLINE EDITOR
======================================== */

const customerInlineEditor =
  document.getElementById('customer-inline-editor');

const customerEditorName =
  document.getElementById('inline-editor-customer-name');

const customerIdeaA =
  document.getElementById('customer-idea-a');

const customerIdeaB =
  document.getElementById('customer-idea-b');

const customerIdeaC =
  document.getElementById('customer-idea-c');

const koppyCustomerIdeas =
  document.getElementById('koppy-customer-ideas');

const koppyComparisonToolbar =
  document.getElementById(
    'koppy-comparison-toolbar'
  );

const customerDiffPanel =
  document.getElementById('customer-diff-panel');

const customerDiffSource =
  document.getElementById('customer-diff-source');

const customerDiffTarget =
  document.getElementById('customer-diff-target');

const customerDiffTitle =
  document.getElementById('customer-diff-title');

const customerDiffTargetHeading =
  document.getElementById(
    'customer-diff-target-heading'
  );

let activeCustomerVisitId = '';
let activeKoppyIdea = 'b';

const customerIdeaState = {};


function openCustomerEditor(button) {
  const row =
    button.closest('.customer-check-row');

  if (!row || !customerInlineEditor) return;

  saveActiveCustomerIdeas();

  const visitId =
    button.dataset.visitId || '';

  const customerName =
    row.querySelector('.visit-info strong')
      ?.textContent
      ?.trim() || 'お客様';

  activeCustomerVisitId = visitId;

  customerEditorName.textContent =
    `${customerName}のお礼`;

  const saved =
    customerIdeaState[visitId];

  customerIdeaA.value =
    saved?.a || '';

  customerIdeaB.value =
    saved?.b || '';

  customerIdeaC.value =
    saved?.c || '';

  activeKoppyIdea =
    saved?.activeKoppyIdea || 'b';

  const hasKoppyIdeas =
    Boolean(saved?.b || saved?.c);

  koppyCustomerIdeas.hidden =
    !hasKoppyIdeas;

  koppyComparisonToolbar.hidden =
    !hasKoppyIdeas;

  customerDiffPanel.hidden =
    !hasKoppyIdeas;

  row.insertAdjacentElement(
    'afterend',
    customerInlineEditor
  );

  customerInlineEditor.hidden = false;

  if (hasKoppyIdeas) {
    switchCustomerIdea(activeKoppyIdea);
  }
}


function closeCustomerEditor() {
  if (!customerInlineEditor) return;

  saveActiveCustomerIdeas();

  customerInlineEditor.hidden = true;

  activeCustomerVisitId = '';
}


function saveActiveCustomerIdeas() {
  if (!activeCustomerVisitId) return;

  customerIdeaState[activeCustomerVisitId] = {
    ...(customerIdeaState[activeCustomerVisitId] || {}),
    a: customerIdeaA.value,
    b: customerIdeaB.value,
    c: customerIdeaC.value,
    activeKoppyIdea,
  };
}


function generateCustomerIdeas() {
  const source =
    customerIdeaA.value.trim();

  if (!source) {
    alert('まずA案に思ったことを書いてね☺️');
    return;
  }

  /*
   * Phase 1 UI prototype.
   * 後でここを実際のKoppy生成へ差し替える。
   */

  customerIdeaB.value =
    source
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  customerIdeaC.value =
`昨日も会いに来てくれてありがと♡

${source}

また会えるの楽しみにしてるね☺️`;

  koppyCustomerIdeas.hidden = false;
  koppyComparisonToolbar.hidden = false;
  customerDiffPanel.hidden = false;

  activeKoppyIdea = 'b';

  switchCustomerIdea('b');
  saveActiveCustomerIdeas();
}


function switchCustomerIdea(idea) {
  if (idea !== 'b' && idea !== 'c') {
    idea = 'b';
  }

  activeKoppyIdea = idea;

  document
    .querySelectorAll('.koppy-idea-tab')
    .forEach((tab) => {
      tab.classList.toggle(
        'is-active',
        tab.dataset.idea === idea
      );
    });

  document
    .querySelectorAll('[data-koppy-idea-panel]')
    .forEach((panel) => {
      const isActive =
        panel.dataset.koppyIdeaPanel === idea;

      panel.hidden = !isActive;
      panel.classList.toggle(
        'is-active',
        isActive
      );
    });

  updateCustomerDiff();
  saveActiveCustomerIdeas();
}


function updateCustomerDiff() {
  if (
    !customerDiffSource ||
    !customerDiffTarget
  ) {
    return;
  }

  const source =
    customerIdeaA.value || '';

  const target =
    activeKoppyIdea === 'c'
      ? customerIdeaC.value
      : customerIdeaB.value;

  const targetLabel =
    activeKoppyIdea.toUpperCase();

  customerDiffTitle.textContent =
    `A ↔ ${targetLabel} 差分`;

  customerDiffTargetHeading.textContent =
    `＋ ${targetLabel}｜Koppy案`;

  renderSideBySideDiff(
    customerDiffSource,
    customerDiffTarget,
    source,
    target
  );
}


function renderSideBySideDiff(
  sourceContainer,
  targetContainer,
  source,
  target
) {
  sourceContainer.replaceChildren();
  targetContainer.replaceChildren();

  if (source === target) {
    const sourceSame =
      document.createElement('span');

    const targetSame =
      document.createElement('span');

    sourceSame.textContent =
      source || '差分なし';

    targetSame.textContent =
      target || '差分なし';

    sourceContainer.appendChild(sourceSame);
    targetContainer.appendChild(targetSame);
    return;
  }

  let prefixLength = 0;

  while (
    prefixLength < source.length &&
    prefixLength < target.length &&
    source[prefixLength] ===
      target[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;

  while (
    suffixLength <
      source.length - prefixLength &&
    suffixLength <
      target.length - prefixLength &&
    source[
      source.length - 1 - suffixLength
    ] ===
      target[
        target.length - 1 - suffixLength
      ]
  ) {
    suffixLength += 1;
  }

  const sourcePrefix =
    source.slice(0, prefixLength);

  const sourceChanged =
    source.slice(
      prefixLength,
      source.length - suffixLength
    );

  const sourceSuffix =
    suffixLength
      ? source.slice(
          source.length - suffixLength
        )
      : '';

  const targetPrefix =
    target.slice(0, prefixLength);

  const targetChanged =
    target.slice(
      prefixLength,
      target.length - suffixLength
    );

  const targetSuffix =
    suffixLength
      ? target.slice(
          target.length - suffixLength
        )
      : '';

  sourceContainer.append(
    document.createTextNode(sourcePrefix)
  );

  if (sourceChanged) {
    const removed =
      document.createElement('span');

    removed.className =
      'diff-remove';

    removed.textContent =
      sourceChanged;

    sourceContainer.appendChild(removed);
  }

  sourceContainer.append(
    document.createTextNode(sourceSuffix)
  );


  targetContainer.append(
    document.createTextNode(targetPrefix)
  );

  if (targetChanged) {
    const added =
      document.createElement('span');

    added.className =
      'diff-add';

    added.textContent =
      targetChanged;

    targetContainer.appendChild(added);
  }

  targetContainer.append(
    document.createTextNode(targetSuffix)
  );
}


function adoptCustomerIdea(button) {
  if (!activeCustomerVisitId) return;

  const idea =
    button.dataset.idea;

  const valueMap = {
    a: customerIdeaA.value,
    b: customerIdeaB.value,
    c: customerIdeaC.value,
  };

  customerIdeaState[activeCustomerVisitId] = {
    ...(customerIdeaState[activeCustomerVisitId] || {}),
    a: customerIdeaA.value,
    b: customerIdeaB.value,
    c: customerIdeaC.value,
    activeKoppyIdea,
    selected: idea,
    final: valueMap[idea] || '',
  };

  alert(
    `${idea.toUpperCase()}案を採用したよ♡`
  );
}


[
  customerIdeaA,
  customerIdeaB,
  customerIdeaC,
].forEach((textarea) => {
  textarea?.addEventListener(
    'input',
    () => {
      updateCustomerDiff();
      saveActiveCustomerIdeas();
    }
  );
});


/* ========================================
   DIARY CREATE
======================================== */

function startNukinaviDiary() {

  restoreDraftToCreateScreen();


  if (diaryState.sourceVisit) {
    renderScheduleVisitInDiary(
      diaryState.sourceVisit
    );
  }


  showView('nukinaviCreate');
}


function renderScheduleVisitInDiary(
  visit
) {

  const visitList =
    document.getElementById(
      'diary-visit-list'
    );

  const visitCount =
    document.getElementById(
      'diary-visit-count'
    );


  if (
    !visitList
    || !visitCount
    || !visit
  ) {
    return;
  }


  const startedAt =
    String(
      visit.started_at
      || ''
    );


  const time =
    startedAt.includes(' ')
      ? startedAt
          .split(' ')[1]
          .slice(0, 5)
      : (
          startedAt.includes('T')
            ? startedAt
                .split('T')[1]
                .slice(0, 5)
            : '--:--'
        );


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


  const statusLabel =
    scheduleCustomerStatusLabel(
      visit.customer_status
    );


  const courseMinutes =
    Number(
      visit.course_minutes
      || 0
    );


  visitCount.textContent =
    '1名';


  visitList.innerHTML = `
    <div
      class="customer-check-row timeline-entry"
    >

      <label class="customer-select">

        <input
          type="checkbox"
          name="visit"
          value="${escapeHtml(
            String(
              visit.id
            )
          )}"
          checked
        >

        <span class="custom-check"></span>

      </label>


      <span class="visit-time">
        ${escapeHtml(time)}
      </span>


      <span class="visit-info">

        <strong>
          ${escapeHtml(
            customerName
          )}
        </strong>

        <small>
          ${escapeHtml(
            `${courseMinutes}分｜${statusLabel}`
          )}
        </small>

      </span>


      <button
        class="customer-edit-button"
        type="button"
        data-action="edit-customer-diary"
        data-visit-id="${escapeHtml(
          String(
            visit.id
          )
        )}"
      >
        個別編集
      </button>

    </div>
  `;
}


function getSelectedVisits() {
  const checked = document.querySelectorAll(
    'input[name="visit"]:checked'
  );

  return Array.from(checked).map((input) => input.value);
}


function generateDiary() {
  const availabilityInput = document.getElementById(
    'availability-input'
  );

  const extraNoteInput = document.getElementById(
    'extra-note'
  );

  diaryState.availability =
    availabilityInput?.value.trim() || '';

  diaryState.extraNote =
    extraNoteInput?.value.trim() || '';

  diaryState.selectedVisitIds =
    getSelectedVisits();

  const selectedCount =
    diaryState.selectedVisitIds.length;

  diaryState.aiDraftTitle =
    '昨日もいっぱいありがと♡';

  diaryState.aiDraftBody =
`昨日もたくさんありがと♡

今日も事前予約ありがと〜☺️
${diaryState.availability || '今日も会いに来てね♡'}

↓昨日のお礼♡

スタートから120分リピのお兄さん🥰
昨日もいっぱいありがと♡
また会えて嬉しかったよ〜☺️
また次回もいっぱい楽しもうね♪

14:30から90分のお兄さん♡
初めましてありがと〜！
いっぱい喜んでもらえて嬉しかったよ☺️
また会いに来てくれるの楽しみに待ってるね♡

${selectedCount >= 3
  ? `ほかのお兄さんたちも昨日はありがと〜♡
いっぱい会えて嬉しかったよ☺️`
  : ''}

${diaryState.extraNote
  ? `\n${diaryState.extraNote}`
  : ''}

❄︎こはく❄︎`;

  diaryState.finalTitle =
    diaryState.aiDraftTitle;

  diaryState.finalBody =
    diaryState.aiDraftBody;

  diaryState.status = 'generated';

  diaryTitleInput.value =
    diaryState.finalTitle;

  diaryBodyInput.value =
    diaryState.finalBody;

  updateDraftCount();

  showView('diaryEdit');
}


/* ========================================
   REWRITE
======================================== */

document.querySelectorAll('[data-rewrite]').forEach((button) => {
  button.addEventListener('click', () => {
    const type = button.dataset.rewrite;

    applyQuickRewrite(type);
  });
});


function applyQuickRewrite(type) {
  let body = diaryBodyInput.value;

  if (type === 'shorter') {
    body = body
      .split('\n')
      .filter((line, index) => {
        if (index === 0) return true;
        return line.trim() !== '';
      })
      .join('\n');

    diaryBodyInput.value = body;
  }

  if (type === 'energetic') {
    if (!body.includes('♡♡')) {
      body = body.replace(
        '昨日もたくさんありがと♡',
        '昨日もたくさんたくさんありがと♡♡'
      );
    }

    diaryBodyInput.value = body;
  }

  if (type === 'soft-sales') {
    body = body.replace(
      '会いに来てね♡',
      '会えたら嬉しいな☺️'
    );

    diaryBodyInput.value = body;
  }

  syncFinalText();
}


function applyRewriteNote() {
  const note = document.getElementById(
    'rewrite-note'
  );

  const text = note?.value.trim();

  if (!text) {
    alert('修正したい内容を入れてね☺️');
    return;
  }

  alert(
    `いまはUIテスト中だよ。\n\n実装後はKoppyに\n「${text}」\nって修正してもらう予定！`
  );
}


function syncFinalText() {
  diaryState.finalTitle =
    diaryTitleInput.value;

  diaryState.finalBody =
    diaryBodyInput.value;
}


diaryTitleInput?.addEventListener(
  'input',
  syncFinalText
);

diaryBodyInput?.addEventListener(
  'input',
  syncFinalText
);


/* ========================================
   DRAFT
======================================== */

function saveDraft() {
  syncFinalText();

  diaryState.status = 'editing';

  localStorage.setItem(
    'kohakuWorkDiaryDraft',
    JSON.stringify(diaryState)
  );

  updateDraftCount();

  alert('下書きを保存したよ♡');
}


function restoreDraftToCreateScreen() {
  const saved = localStorage.getItem(
    'kohakuWorkDiaryDraft'
  );

  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);

    Object.assign(
      diaryState,
      parsed
    );

    const availabilityInput =
      document.getElementById(
        'availability-input'
      );

    const extraNoteInput =
      document.getElementById(
        'extra-note'
      );

    if (availabilityInput) {
      availabilityInput.value =
        diaryState.availability || '';
    }

    if (extraNoteInput) {
      extraNoteInput.value =
        diaryState.extraNote || '';
    }
  } catch (error) {
    console.warn(
      'Draft restore failed:',
      error
    );
  }
}


function updateDraftCount() {
  const saved = localStorage.getItem(
    'kohakuWorkDiaryDraft'
  );

  draftCount.textContent =
    saved || diaryState.status !== 'posted'
      ? '1'
      : '0';
}


/* ========================================
   PHOTO PREVIEW
======================================== */

photoInput?.addEventListener(
  'change',
  (event) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      photoPreview.hidden = true;
      return;
    }

    if (
      diaryState.photoUrl &&
      diaryState.photoUrl.startsWith('blob:')
    ) {
      URL.revokeObjectURL(
        diaryState.photoUrl
      );
    }

    const imageUrl =
      URL.createObjectURL(file);

    diaryState.photoUrl = imageUrl;

    photoPreviewImage.src =
      imageUrl;

    photoPreview.hidden = false;
  }
);


/* ========================================
   POST PREP
======================================== */

function preparePost() {
  syncFinalText();

  postPreviewTitle.textContent =
    diaryState.finalTitle ||
    '件名未入力';

  postPreviewBody.textContent =
    diaryState.finalBody ||
    '本文未入力';

  diaryState.status = 'ready';

  showView('postPrep');
}


/* ========================================
   NUKINAVI MAIL
======================================== */

function createNukinaviMail() {
  syncFinalText();

  const subject = encodeURIComponent(
    diaryState.finalTitle
  );

  const body = encodeURIComponent(
    diaryState.finalBody
  );

  const mailto =
    `mailto:?subject=${subject}&body=${body}`;

  const shouldOpen = confirm(
    'メール作成画面を開く？\n\n' +
    '※いまは投稿先アドレス未設定のテスト版。\n' +
    '写真添付もまだ手動だよ。'
  );

  if (shouldOpen) {
    window.location.href = mailto;
  }
}


/* ========================================
   POSTED
======================================== */

function markPosted() {
  diaryState.posted = true;
  diaryState.status = 'posted';

  todayPostCount.textContent = '1';

  localStorage.removeItem(
    'kohakuWorkDiaryDraft'
  );

  draftCount.textContent = '0';

  alert(
    '投稿済みにしたよ☺️\nおつかれさま♡'
  );

  showView('home');
}


/* ========================================
   VOICE DEMO
======================================== */

function demoVoiceInput() {
  alert(
    '🎙 音声入力はこれから実装！\n\n' +
    '将来的には話した内容だけ文字起こしして、\n' +
    '元音声は保存しない予定だよ。'
  );
}


/* ========================================
   PLACEHOLDER
======================================== */

function showPlaceholder(title) {
  if (placeholderTitle) {
    placeholderTitle.textContent =
      title;
  }

  showView('placeholder');
}


/* ========================================
   INITIALIZE
======================================== */

function initializeApp() {
  restoreDraftToCreateScreen();

  updateDraftCount();

  showView('schedule');

  loadSchedule();
}


initializeApp();
