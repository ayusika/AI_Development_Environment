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

    case 'copy-shift-line-message':
      copyShiftLineMessage();
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

    case 'save-heaven-diary-draft':
      saveHeavenDiaryCloudDraft();
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
      showPlaceholder(
        '下書き',
        'diary'
      );
      break;

    case 'open-history':
      showPlaceholder(
        '過去ログ',
        'diary'
      );
      break;

    case 'open-rules':
      showPlaceholder(
        '写メ日記ルール',
        'diary'
      );
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

    case 'open-schedule-sales':
      openScheduleSales();
      break;

    case 'confirm-schedule-sales':
      confirmScheduleSales();
      break;

    case 'open-sales-day-confirm':
      openSalesDayConfirm();
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
      showView('customers');
      loadCustomers();
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










/* ========================================
   INITIALIZE
======================================== */

function updateTodayDateLabels() {
  const now = new Date();

  const dateLabel =
    `${now.getMonth() + 1}/${now.getDate()}`;

  [
    'today-date',
    'diary-today-date',
  ].forEach((id) => {
    const element =
      document.getElementById(id);

    if (element) {
      element.textContent =
        dateLabel;
    }
  });
}


function initializeApp() {
  restoreDraftToCreateScreen();

  updateDraftCount();

  updateTodayPostCount();

  updateTodayDateLabels();

  showView('home');
}


window.addEventListener('load', initializeApp);
