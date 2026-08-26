

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


const databaseApiUrl =
  '/api/v1/database.php';

const databaseViewer =
  document.getElementById('database-viewer');

const databaseRecordViewer =
  document.getElementById(
    'database-record-viewer'
  );

const databaseRecordTitle =
  document.getElementById(
    'database-record-title'
  );

const databaseRecordContent =
  document.getElementById(
    'database-record-content'
  );


function closeDatabaseRecords() {

  if (databaseRecordViewer) {
    databaseRecordViewer.hidden =
      true;
  }

  if (databaseRecordContent) {
    databaseRecordContent.innerHTML =
      '';
  }
}


const databaseTableLabels = {
  stores: '店舗',
  work_shifts: '勤務シフト',
  customers: '顧客',
  customer_names: '顧客識別名',
  visits: '来店・予約',
  visit_change_history: '予約変更履歴',
  customer_identity_history: '顧客紐付け履歴',
  options: 'オプション',
};


const databaseColumnLabels = {
  id: 'ID',
  store_id: '店舗ID',
  customer_id: '顧客ID',
  customer_code: '顧客コード',
  name_type: '名前種別',
  name: '名前',
  is_primary: 'メイン名',
  general_notes: '顧客メモ',

  started_at: '予約日時',
  booked_at: '予約受付日時',
  course_minutes: 'コース時間',
  customer_status: '顧客区分',
  customer_features: '特徴メモ',
  conversation_notes: '会話メモ',
  visit_notes: '来店メモ',

  status: '状態',
  cancel_reason: 'キャンセル理由',
  cancelled_at: 'キャンセル日時',
  cancelled_by: 'キャンセル者',

  visit_id: '来店ID',
  requested_at: '変更受付日時',
  change_type: '変更種別',
  before_data: '変更前データ',
  after_data: '変更後データ',

  before_customer_id: '変更前顧客ID',
  after_customer_id: '変更後顧客ID',
  action_type: '紐付け操作',
  note: 'メモ',

  active: '有効',
  sort_order: '表示順',
  start_at: '開始日時',
  end_at: '終了日時',

  is_dummy: 'ダミー',
  created_at: '作成日時',
  updated_at: '更新日時',
};


function databaseTableDisplayName(
  tableName
) {

  const label =
    databaseTableLabels[
      tableName
    ];

  return label
    ? `${tableName}（${label}）`
    : tableName;
}


function databaseColumnDisplayName(
  columnName
) {

  const label =
    databaseColumnLabels[
      columnName
    ];

  return label
    ? `${columnName}（${label}）`
    : columnName;
}


function closeInlineDatabaseRecords(
  tableName
) {

  if (!tableName) {
    return;
  }


  const recordContainer =
    document.querySelector(
      `[data-database-records="${CSS.escape(
        tableName
      )}"]`
    );


  if (!recordContainer) {
    return;
  }


  recordContainer.innerHTML =
    '';

  recordContainer.hidden =
    true;
}


async function openDatabaseRecords(
  tableName
) {

  if (!tableName) {
    return;
  }


  const recordContainer =
    document.querySelector(
      `[data-database-records="${CSS.escape(
        tableName
      )}"]`
    );


  if (!recordContainer) {
    return;
  }


  recordContainer.hidden =
    false;


  recordContainer.innerHTML = `
    <p>レコードを読み込み中...</p>
  `;


  try {

    const response =
      await fetch(
        `${databaseApiUrl}?table=${encodeURIComponent(
          tableName
        )}`,
        {
          method: 'GET',
          cache: 'no-store',
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
        || 'レコードを取得できませんでした。'
      );
    }


    const records =
      Array.isArray(data.records)
        ? data.records
        : [];


    if (!records.length) {

      recordContainer.innerHTML = `
        <p>レコードはありません。</p>
      `;

      return;
    }


    const rawColumnNames =
      Object.keys(
        records[0]
      );


    const visitPriorityColumns = [
      'id',
      'customer_id',
      'started_at',
      'status',
      'customer_status',
      'course_minutes',
      'cancel_reason',
      'cancelled_at',
      'cancelled_by',
    ];


    const columnNames =
      tableName === 'visits'
        ? [
            ...visitPriorityColumns.filter(
              (columnName) =>
                rawColumnNames.includes(
                  columnName
                )
            ),

            ...rawColumnNames.filter(
              (columnName) =>
                !visitPriorityColumns.includes(
                  columnName
                )
            ),
          ]
        : rawColumnNames;


    const tableHeadHtml =
      columnNames
        .map(
          (columnName) => `
            <th>
              ${escapeHtml(
                databaseColumnDisplayName(
                  columnName
                )
              )}
            </th>
          `
        )
        .join('');


    const tableBodyHtml =
      records
        .map((record) => {

          const cellsHtml =
            columnNames
              .map(
                (columnName) => {

                  const value =
                    record[columnName];


                  let displayValue =
                    value === null
                      ? 'NULL'
                      : String(value);


                  if (
                    tableName === 'visits'
                    && columnName === 'customer_id'
                    && value !== null
                  ) {

                    const customerNames =
                      data.customer_names
                      && typeof data.customer_names === 'object'
                        ? data.customer_names
                        : {};


                    const customerName =
                      customerNames[
                        String(value)
                      ]
                      || customerNames[
                        value
                      ];


                    if (customerName) {

                      displayValue =
                        `${customerName} (#${value})`;
                    }
                  }


                  return `
                    <td>
                      ${escapeHtml(
                        displayValue
                      )}
                    </td>
                  `;
                }
              )
              .join('');


          return `
            <tr>
              ${cellsHtml}
            </tr>
          `;
        })
        .join('');


    recordContainer.innerHTML = `
      <div class="database-inline-record-heading">

        <strong>
          RECORDS
        </strong>

        <button
          class="small-link-button"
          type="button"
          data-action="close-inline-database-records"
          data-table-name="${escapeHtml(
            tableName
          )}"
        >
          閉じる
        </button>

      </div>


      <div class="database-record-table-scroll">

        <table class="database-record-table">

          <thead>
            <tr>
              ${tableHeadHtml}
            </tr>
          </thead>

          <tbody>
            ${tableBodyHtml}
          </tbody>

        </table>

      </div>
    `;


  } catch (error) {

    recordContainer.innerHTML = `
      <p>
        ${escapeHtml(
          error.message
        )}
      </p>
    `;
  }
}


async function loadDatabaseViewer() {

  if (!databaseViewer) {
    return;
  }


  databaseViewer.innerHTML = `
    <p>DB情報を読み込み中...</p>
  `;


  try {

    const response =
      await fetch(
        databaseApiUrl,
        {
          method: 'GET',
          cache: 'no-store',
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
        || 'DB情報を取得できませんでした。'
      );
    }


    const tables =
      Array.isArray(data.tables)
        ? data.tables
        : [];


    const tablesHtml =
      tables
        .map((table) => {

          if (!table.exists) {

            return `
              <section class="database-table-card">
                <h3>
                  ${escapeHtml(
                    String(table.name)
                  )}
                </h3>

                <p>
                  テーブルが存在しません
                </p>
              </section>
            `;
          }


          const columns =
            Array.isArray(table.columns)
              ? table.columns
              : [];


          const columnsHtml =
            columns
              .map((column) => {

                const flags = [];

                if (column.primary_key) {
                  flags.push('PK');
                }

                if (column.not_null) {
                  flags.push('NOT NULL');
                }


                return `
                  <div class="database-column-row">

                    <strong>
                      ${escapeHtml(
                        databaseColumnDisplayName(
                          String(column.name)
                        )
                      )}
                    </strong>

                    <span>
                      ${escapeHtml(
                        String(
                          column.type
                          || 'TEXT'
                        )
                      )}
                    </span>

                    <small>
                      ${escapeHtml(
                        flags.join(' / ')
                      )}
                    </small>

                  </div>
                `;
              })
              .join('');


          return `
            <section
              class="database-table-card"
            >

              <div class="database-table-heading">

                <h3>
                  ${escapeHtml(
                    databaseTableDisplayName(
                      String(table.name)
                    )
                  )}
                </h3>

                <div>

                  <span>
                    ${escapeHtml(
                      String(table.row_count)
                    )}
                    件
                  </span>

                  <button
                    class="small-link-button"
                    type="button"
                    data-action="open-database-records"
                    data-table-name="${escapeHtml(
                      String(table.name)
                    )}"
                  >
                    レコードを見る
                  </button>

                </div>

              </div>

              <div class="database-column-list">
                ${columnsHtml}
              </div>

              <div
                class="database-inline-records"
                data-database-records="${escapeHtml(
                  String(table.name)
                )}"
                hidden
              ></div>

            </section>
          `;
        })
        .join('');


    databaseViewer.innerHTML =
      tablesHtml
      || `
        <p>
          表示できるテーブルがありません。
        </p>
      `;


  } catch (error) {

    databaseViewer.innerHTML = `
      <p>
        ${escapeHtml(
          error.message
        )}
      </p>
    `;
  }
}


// WRITER:CUSTOMERS_LOGIC:START

/* ========================================
   CUSTOMERS
======================================== */

const customersApiUrl =
  '/api/v1/customers.php';

let loadedCustomers = [];

let selectedCustomerId = null;


function openCustomerDetail(
  customerId
) {

  selectedCustomerId =
    Number(customerId);


  if (!selectedCustomerId) {
    return;
  }


  const customer =
    loadedCustomers.find(
      (customerRecord) =>
        Number(
          customerRecord.id
        ) === selectedCustomerId
    );


  if (!customer) {
    return;
  }


  const names =
    Array.isArray(customer.names)
      ? customer.names
      : [];


  const primaryName =
    names.find(
      (nameRecord) =>
        Number(
          nameRecord.is_primary
        ) === 1
    )
    || names[0]
    || null;


  const displayName =
    primaryName
      ? String(primaryName.name)
      : '名前未登録';


  const findName =
    (nameType) => {

      const record =
        names.find(
          (nameRecord) =>
            nameRecord.name_type
            === nameType
        );


      return record
        ? String(record.name)
        : '未登録';
    };


  const visits =
    Array.isArray(customer.visits)
      ? customer.visits
      : [];


  const visitStatusLabels = {
    scheduled: '予約',
    completed: '来店済み',
    cancelled: 'キャンセル',
    no_show: '無断キャンセル',
  };


  const customerStatusLabels = {
    new: '新規',
    repeat: 'リピーター',
    other_store_repeat: '他店リピーター',
    repeat_unknown_id: 'リピーター・ID不明',
  };


  const formatVisitDateTime =
    (value) => {

      if (!value) {
        return '日時未登録';
      }


      const match =
        String(value).match(
          /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
        );


      if (!match) {
        return String(value);
      }


      const year =
        Number(match[1]);

      const month =
        Number(match[2]);

      const day =
        Number(match[3]);

      const hour =
        match[4];

      const minute =
        match[5];


      const weekDays = [
        '日',
        '月',
        '火',
        '水',
        '木',
        '金',
        '土',
      ];


      const date =
        new Date(
          year,
          month - 1,
          day
        );


      const weekDay =
        weekDays[
          date.getDay()
        ];


      return `${year}年${month}月${day}日（${weekDay}）${hour}:${minute}`;
    };


  const title =
    document.getElementById(
      'customer-detail-title'
    );

  const content =
    document.getElementById(
      'customer-detail-content'
    );


  if (title) {

    title.textContent =
      `${displayName} (#${customer.id})`;
  }


  if (content) {

    content.innerHTML = `
      <p class="eyebrow">
        READ ONLY
      </p>

      <div class="customer-name-summary">

        <p>
          <strong>顧客コード</strong>
          ${escapeHtml(
            String(
              customer.customer_code
              || '未登録'
            )
          )}
        </p>

        <div class="customer-status-summary">

          <div class="customer-status-item">
            <span>来店</span>
            <strong>
              ${escapeHtml(
                String(
                  customer.visit_count
                  || 0
                )
              )}<small>回</small>
            </strong>
          </div>

          <div class="customer-status-item">
            <span>予約中</span>
            <strong>
              ${escapeHtml(
                String(
                  customer.scheduled_count
                  || 0
                )
              )}<small>件</small>
            </strong>
          </div>

          <div class="customer-status-item">
            <span>キャンセル</span>
            <strong>
              ${escapeHtml(
                String(
                  customer.cancelled_count
                  || 0
                )
              )}<small>件</small>
            </strong>
          </div>

          <div class="customer-status-item">
            <span>無断</span>
            <strong>
              ${escapeHtml(
                String(
                  customer.no_show_count
                  || 0
                )
              )}<small>件</small>
            </strong>
          </div>

        </div>

        <section class="customer-alias-section">

          <h2>
            名義情報
          </h2>

          <div class="customer-alias-list">

            <p>
              <strong>呼び名</strong>
              ${escapeHtml(
                findName('nickname')
              )}
            </p>

            <p>
              <strong>オキニトーク</strong>
              ${escapeHtml(
                findName('okini_talk')
              )}
            </p>

            <p>
              <strong>LINE</strong>
              ${escapeHtml(
                findName('line')
              )}
            </p>

            <p>
              <strong>X</strong>
              ${escapeHtml(
                findName('x')
              )}
            </p>

            <p>
              <strong>Instagram</strong>
              ${escapeHtml(
                findName('instagram')
              )}
            </p>

          </div>

        </section>

      </div>


      <hr>


      <div class="customer-visit-history">

        <h2>
          来店履歴
        </h2>

        ${
          visits.length === 0
            ? `
              <p>
                来店履歴はありません。
              </p>
            `
            : visits
                .map((visit) => {

                  const statusLabel =
                    visitStatusLabels[
                      visit.status
                    ]
                    || String(
                      visit.status
                      || '不明'
                    );


                  const customerStatusLabel =
                    customerStatusLabels[
                      visit.customer_status
                    ]
                    || String(
                      visit.customer_status
                      || '未登録'
                    );


                  return `
                    <section class="content-card customer-visit-card">

                      <div class="customer-visit-card-header">

                        <strong class="customer-visit-date">
                          ${escapeHtml(
                            formatVisitDateTime(
                              visit.started_at
                            )
                          )}
                        </strong>

                        <span
                          class="customer-visit-status"
                          data-status="${escapeHtml(
                            String(
                              visit.status
                              || ''
                            )
                          )}"
                        >
                          ${escapeHtml(
                            statusLabel
                          )}
                        </span>

                      </div>


                      <div class="customer-visit-meta">

                        <span>
                          ${escapeHtml(
                            customerStatusLabel
                          )}
                        </span>

                        <span>
                          ${
                            visit.course_minutes
                              ? `${escapeHtml(
                                  String(
                                    visit.course_minutes
                                  )
                                )}分`
                              : 'コース未登録'
                          }
                        </span>

                      </div>

                      ${
                        visit.conversation_notes
                          ? `
                            <p>
                              <strong>会話メモ</strong><br>
                              ${escapeHtml(
                                String(
                                  visit.conversation_notes
                                )
                              )}
                            </p>
                          `
                          : ''
                      }

                      ${
                        visit.visit_notes
                          ? `
                            <p>
                              <strong>来店メモ</strong><br>
                              ${escapeHtml(
                                String(
                                  visit.visit_notes
                                )
                              )}
                            </p>
                          `
                          : ''
                      }

                      ${
                        visit.status === 'cancelled'
                        && visit.cancel_reason
                          ? `
                            <p>
                              <strong>キャンセル理由</strong><br>
                              ${escapeHtml(
                                String(
                                  visit.cancel_reason
                                )
                              )}
                            </p>
                          `
                          : ''
                      }

                    </section>
                  `;
                })
                .join('')
        }

      </div>
    `;
  }


  showView(
    'customerDetail'
  );
}


async function loadCustomers() {

  const customerList =
    document.getElementById(
      'customer-list'
    );


  if (!customerList) {
    return;
  }


  customerList.innerHTML = `
    <section class="content-card">
      <p>
        顧客情報を読み込んでいます...
      </p>
    </section>
  `;


  try {

    const response =
      await fetch(
        customersApiUrl,
        {
          method: 'GET',
          cache: 'no-store',
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
        || '顧客情報を取得できませんでした。'
      );
    }


    loadedCustomers =
      Array.isArray(data.customers)
        ? data.customers
        : [];


    const customers =
      loadedCustomers;


    if (customers.length === 0) {

      customerList.innerHTML = `
        <section class="content-card">
          <p>
            登録されている顧客はいません。
          </p>
        </section>
      `;

      return;
    }


    customerList.innerHTML =
      customers
        .map((customer) => {

          const names =
            Array.isArray(customer.names)
              ? customer.names
              : [];


          const primaryName =
            names.find(
              (nameRecord) =>
                Number(
                  nameRecord.is_primary
                ) === 1
            )
            || names[0]
            || null;


          const displayName =
            primaryName
              ? String(primaryName.name)
              : '名前未登録';


          const findName =
            (nameType) => {

              const record =
                names.find(
                  (nameRecord) =>
                    nameRecord.name_type
                    === nameType
                );


              return record
                ? String(record.name)
                : '未登録';
            };


          const searchText = [
            String(
              customer.id
              || ''
            ),

            String(
              customer.customer_code
              || ''
            ),

            ...names.map(
              (nameRecord) =>
                String(
                  nameRecord.name
                  || ''
                )
            ),
          ]
            .join(' ')
            .toLowerCase();


          return `
            <section
              class="content-card customer-card"
              data-customer-id="${escapeHtml(
                String(customer.id)
              )}"
              data-customer-search="${escapeHtml(
                searchText
              )}"
              data-action="open-customer-detail"
              role="button"
              tabindex="0"
            >

              <div class="customer-card-heading">

                <div>

                  <p class="eyebrow">
                    CUSTOMER
                  </p>

                  <h2>
                    ${escapeHtml(
                      displayName
                    )}
                    <small>
                      (#${escapeHtml(
                        String(customer.id)
                      )})
                    </small>
                  </h2>

                </div>

                <span>
                  来店 ${escapeHtml(
                    String(
                      customer.visit_count
                      || 0
                    )
                  )}件
                </span>

              </div>


              <div class="customer-name-summary">

                <p>
                  <strong>呼び名</strong>
                  ${escapeHtml(
                    findName('nickname')
                  )}
                </p>

                <p>
                  <strong>オキニトーク</strong>
                  ${escapeHtml(
                    findName('okini_talk')
                  )}
                </p>

                <p>
                  <strong>LINE</strong>
                  ${escapeHtml(
                    findName('line')
                  )}
                </p>

                <p>
                  <strong>X</strong>
                  ${escapeHtml(
                    findName('x')
                  )}
                </p>

                <p>
                  <strong>Instagram</strong>
                  ${escapeHtml(
                    findName('instagram')
                  )}
                </p>

              </div>

            </section>
          `;
        })
        .join('');


  } catch (error) {

    customerList.innerHTML = `
      <section class="content-card">
        <p>
          ${escapeHtml(
            error.message
          )}
        </p>
      </section>
    `;
  }
}


function filterCustomerCards() {

  const searchInput =
    document.getElementById(
      'customer-search-input'
    );

  if (!searchInput) {
    return;
  }


  let query =
    searchInput.value
      .trim()
      .toLowerCase();


  if (query.startsWith('#')) {
    query =
      query.slice(1);
  }


  const customerCards =
    document.querySelectorAll(
      '#customer-list .customer-card'
    );


  let visibleCount = 0;


  customerCards.forEach((card) => {

    const searchText =
      String(
        card.dataset.customerSearch
        || ''
      );


    card.hidden =
      query !== ''
      && !searchText.includes(
        query
      );


    if (!card.hidden) {
      visibleCount += 1;
    }
  });


  let emptyMessage =
    document.getElementById(
      'customer-search-empty'
    );


  if (
    visibleCount === 0
    && query !== ''
  ) {

    if (!emptyMessage) {

      emptyMessage =
        document.createElement(
          'section'
        );

      emptyMessage.id =
        'customer-search-empty';

      emptyMessage.className =
        'content-card';

      emptyMessage.innerHTML = `
        <p>
          該当する顧客はいません。
        </p>
      `;


      const customerList =
        document.getElementById(
          'customer-list'
        );


      if (customerList) {
        customerList.appendChild(
          emptyMessage
        );
      }
    }

  } else if (emptyMessage) {

    emptyMessage.remove();
  }
}


const customerSearchInput =
  document.getElementById(
    'customer-search-input'
  );


if (customerSearchInput) {

  customerSearchInput.addEventListener(
    'input',
    filterCustomerCards
  );
}

// WRITER:CUSTOMERS_LOGIC:END


// WRITER:WORK_SCHEDULE_LOGIC:START

/* ========================================
   WORK SCHEDULE
======================================== */

const scheduleApiUrl =
  '/api/v1/schedule.php';

const scheduleShiftsApiUrl =
  '/api/v1/shifts.php';

const visitIdentityFeaturesApiUrl =
  '/api/v1/visit-identity-features.php';

const customerIdentitySearchApiUrl =
  '/api/v1/customer-identity-search.php';

const scheduleCalendar =
  document.getElementById('schedule-calendar');

const scheduleDateInput =
  document.getElementById('schedule-date');

const schedulePeriodTitle =
  document.getElementById('schedule-period-title');

const scheduleVisitCount =
  document.getElementById('schedule-visit-count');

const scheduleFormCard =
  document.getElementById('schedule-form-card');

const scheduleFormTitle =
  document.getElementById('schedule-form-title');

const scheduleFormDate =
  document.getElementById('schedule-form-date');

const scheduleBookedDate =
  document.getElementById('schedule-booked-date');

const scheduleBookedTime =
  document.getElementById('schedule-booked-time');

const scheduleCustomerChange =
  document.getElementById('schedule-customer-change');

const scheduleEditId =
  document.getElementById('schedule-edit-id');

const scheduleStore =
  document.getElementById('schedule-store');

const scheduleStartTime =
  document.getElementById('schedule-start-time');

const scheduleCustomCourse =
  document.getElementById('schedule-custom-course');

const scheduleCourseMasterList =
  document.getElementById(
    'schedule-course-master-list'
  );

const scheduleExtensionMasterList =
  document.getElementById(
    'schedule-extension-master-list'
  );

const scheduleCoursePriceSummary =
  document.getElementById(
    'schedule-course-price-summary'
  );

const scheduleOptionGrid =
  document.getElementById(
    'schedule-option-grid'
  );

const scheduleCustomOption =
  document.getElementById('schedule-custom-option');

const scheduleFormMessage =
  document.getElementById('schedule-form-message');

const scheduleSaveButton =
  document.getElementById('schedule-save-button');

const scheduleDetailDrawer =
  document.getElementById('schedule-detail-drawer');

const scheduleDrawerBackdrop =
  document.getElementById('schedule-drawer-backdrop');

const scheduleDetailTitle =
  document.getElementById('schedule-detail-title');

const scheduleDetailBody =
  document.getElementById('schedule-detail-body');

const scheduleHistoryPanel =
  document.getElementById('schedule-history-panel');

const scheduleDetailCustomerState =
  document.getElementById('schedule-detail-customer-state');

const scheduleDetailDiaryState =
  document.getElementById('schedule-detail-diary-state');

const scheduleDetailSalesState =
  document.getElementById('schedule-detail-sales-state');

const scheduleCustomerCancelButton =
  document.getElementById(
    'schedule-customer-cancel-button'
  );

const scheduleCustomerCancelPanel =
  document.getElementById(
    'schedule-customer-cancel-panel'
  );

const scheduleCustomerCancelReason =
  document.getElementById(
    'schedule-customer-cancel-reason'
  );

const scheduleLinkedCustomerPanel =
  document.getElementById(
    'schedule-linked-customer-panel'
  );

const scheduleCustomerPanel =
  document.getElementById(
    'schedule-customer-panel'
  );

const scheduleCustomerName =
  document.getElementById(
    'schedule-customer-name'
  );

const scheduleCustomerFeatures =
  document.getElementById(
    'schedule-customer-features'
  );

const scheduleIdentityFeatureType =
  document.getElementById(
    'schedule-identity-feature-type'
  );

const scheduleIdentityFeatureValue =
  document.getElementById(
    'schedule-identity-feature-value'
  );

const scheduleIdentityFeatureNote =
  document.getElementById(
    'schedule-identity-feature-note'
  );

const scheduleIdentityFeatureList =
  document.getElementById(
    'schedule-identity-feature-list'
  );

const scheduleIdentitySearchKeyword =
  document.getElementById(
    'schedule-identity-search-keyword'
  );

const scheduleIdentitySearchStatus =
  document.getElementById(
    'schedule-identity-search-status'
  );

const scheduleIdentitySearchStore =
  document.getElementById(
    'schedule-identity-search-store'
  );

const scheduleIdentitySearchResults =
  document.getElementById(
    'schedule-identity-search-results'
  );


const scheduleState = {
  view: 'two-weeks',
  anchorDate: null,
  visits: [],
  shifts: [],
  selectedVisit: null,
  identitySearchVisits: [],
  selectedIdentityCandidate: null,
};


const scheduleStartHour = 11;
const scheduleEndHour = 27;

const scheduleZoom = {
  minHourHeight: 54,
  maxHourHeight: 150,
  step: 6,
};

let selectedScheduleCourse = 90;

let selectedScheduleCourseRateId = null;

let selectedScheduleCourseMaster = null;

let selectedSchedulePricingCategory =
  'standard';

let selectedScheduleExtensions = [];

let scheduleSalesMaster = {
  store: null,
  courses: [],
  options: [],
  dailyFeeRule: null,
};

let selectedCustomerStatus =
  'repeat_unknown_id';


initializeSchedule();
initializeScheduleResize();


function initializeScheduleResize() {

  const shell =
    document.querySelector(
      '.schedule-calendar-shell'
    );

  const handle =
    document.querySelector(
      '[data-schedule-resize-handle]'
    );

  if (!shell || !handle) return;

  let startY = 0;
  let startHeight = 0;

  const stopResize =
    (event) => {

      handle.classList.remove(
        'is-dragging'
      );

      if (
        event.pointerId !== undefined
        && handle.hasPointerCapture(
          event.pointerId
        )
      ) {
        handle.releasePointerCapture(
          event.pointerId
        );
      }
    };


  handle.addEventListener(
    'pointerdown',
    (event) => {

      event.preventDefault();

      startY = event.clientY;
      startHeight =
        shell.getBoundingClientRect()
          .height;

      handle.classList.add(
        'is-dragging'
      );

      handle.setPointerCapture(
        event.pointerId
      );
    }
  );


  handle.addEventListener(
    'pointermove',
    (event) => {

      if (
        !handle.classList.contains(
          'is-dragging'
        )
      ) {
        return;
      }

      event.preventDefault();

      const deltaY =
        event.clientY - startY;

      const maxHeight =
        Math.max(
          420,
          window.innerHeight - 120
        );

      const nextHeight =
        Math.min(
          maxHeight,
          Math.max(
            360,
            startHeight + deltaY
          )
        );

      shell.style.height =
        `${nextHeight}px`;
    }
  );


  handle.addEventListener(
    'pointerup',
    stopResize
  );


  handle.addEventListener(
    'pointercancel',
    stopResize
  );
}


function setScheduleZoom(
  nextHeight
) {

  const page =
    document.querySelector(
      '.schedule-page'
    );

  if (!page) return;

  const clampedHeight =
    Math.min(
      scheduleZoom.maxHourHeight,
      Math.max(
        scheduleZoom.minHourHeight,
        nextHeight
      )
    );

  page.style.setProperty(
    '--schedule-hour-height',
    `${clampedHeight}px`
  );

  const period =
    getSchedulePeriod();

  renderScheduleCalendar(
    period
  );

  updateScheduleZoomLabel();
}


function updateScheduleZoomLabel() {

  const label =
    document.getElementById(
      'schedule-zoom-label'
    );

  if (!label) return;

  const currentHeight =
    getScheduleHourHeight();

  const percent =
    Math.round(
      currentHeight / 96 * 100
    );

  label.textContent =
    `${percent}%`;
}


function formatScheduleMoney(
  value
) {

  if (
    value === null
    || value === undefined
    || value === ''
  ) {
    return '未確認';
  }


  return `¥${Number(value).toLocaleString('ja-JP')}`;
}


function renderScheduleSalesMaster() {

  const selectedOptionNames =
    Array.from(
      document.querySelectorAll(
        '[data-schedule-option]:checked'
      )
    )
      .map((input) =>
        String(input.value)
      );


  const courses =
    Array.isArray(
      scheduleSalesMaster.courses
    )
      ? scheduleSalesMaster.courses
      : [];

  const options =
    Array.isArray(
      scheduleSalesMaster.options
    )
      ? scheduleSalesMaster.options
      : [];


  const regularCourses =
    courses
      .filter(
        (course) =>
          course.course_type
          === 'regular'
      )
      .sort((a, b) => {

        const categoryOrder = {
          standard: 0,
          foreign: 1,
        };

        const categoryDifference =
          (
            categoryOrder[
              a.pricing_category
            ]
            ?? 99
          )
          -
          (
            categoryOrder[
              b.pricing_category
            ]
            ?? 99
          );

        if (categoryDifference !== 0) {
          return categoryDifference;
        }

        return (
          Number(a.course_minutes)
          - Number(b.course_minutes)
        );
      });

  const standardCourses =
    regularCourses.filter(
      (course) =>
        course.pricing_category
        === 'standard'
    );

  const foreignCourses =
    regularCourses.filter(
      (course) =>
        course.pricing_category
        === 'foreign'
    );


  const extensionCourses =
    courses.filter(
      (course) =>
        course.course_type
        === 'extension'
    );


  if (scheduleCourseMasterList) {

    if (regularCourses.length === 0) {

      scheduleCourseMasterList.innerHTML = `
        <p class="schedule-master-empty">
          この店舗のコース料金は未登録です。
        </p>
      `;

    } else {

      const renderCourseButtons =
        (courseList) =>
          courseList
            .map((course) => {

              const isSelected =
                Number(
                  selectedScheduleCourseRateId
                )
                === Number(
                  course.store_course_rate_id
                );

              return `
                <button
                  class="
                    schedule-master-course-button
                    ${isSelected ? 'is-selected' : ''}
                  "
                  type="button"
                  data-schedule-master-course
                  data-course-rate-id="${Number(
                    course.store_course_rate_id
                  )}"
                >
                  <strong>
                    ${escapeHtml(
                      course.pricing_category
                        === 'foreign'
                        ? `外${Number(
                            course.course_minutes
                          )}分`
                        : `${Number(
                            course.course_minutes
                          )}分`
                    )}
                  </strong>

                  <small>
                    手取り
                    ${escapeHtml(
                      formatScheduleMoney(
                        course.take_home
                      )
                    )}
                  </small>
                </button>
              `;
            })
            .join('');


      const activeCourseList =
        selectedSchedulePricingCategory
          === 'foreign'
          ? foreignCourses
          : standardCourses;


      scheduleCourseMasterList.innerHTML = `
        ${
          foreignCourses.length
            ? `
              <div
                class="schedule-course-category-tabs"
              >
                <button
                  class="
                    schedule-course-category-tab
                    ${
                      selectedSchedulePricingCategory
                        === 'standard'
                        ? 'is-selected'
                        : ''
                    }
                  "
                  type="button"
                  data-schedule-course-category="standard"
                >
                  通常
                </button>

                <button
                  class="
                    schedule-course-category-tab
                    ${
                      selectedSchedulePricingCategory
                        === 'foreign'
                        ? 'is-selected'
                        : ''
                    }
                  "
                  type="button"
                  data-schedule-course-category="foreign"
                >
                  外国人
                </button>
              </div>
            `
            : ''
        }

        <div class="schedule-course-section">
          <div class="schedule-course-grid">
            ${renderCourseButtons(
              activeCourseList
            )}
          </div>
        </div>
      `;
    }
  }


  if (scheduleExtensionMasterList) {

    if (extensionCourses.length === 0) {

      scheduleExtensionMasterList.innerHTML =
        '';

      scheduleExtensionMasterList.hidden =
        true;

    } else {

      scheduleExtensionMasterList.hidden =
        false;

      scheduleExtensionMasterList.innerHTML =
        extensionCourses
          .map((course) => {

            const selectedExtension =
              selectedScheduleExtensions
                .find(
                  (extension) =>
                    Number(
                      extension.store_course_id
                    )
                    === Number(
                      course.store_course_id
                    )
                )
              || null;

            const quantity =
              selectedExtension
                ? Number(
                    selectedExtension.quantity
                    || 1
                  )
                : 0;

            const isSelected =
              quantity > 0;

            return `
            <button
              class="
                schedule-master-extension-button
                ${isSelected ? 'is-selected' : ''}
              "
              type="button"
              data-schedule-extension-course
              data-course-rate-id="${Number(
                course.store_course_rate_id
              )}"
              data-store-course-id="${Number(
                course.store_course_id
              )}"
            >
              <strong>
                ${escapeHtml(
                  String(
                    course.course_name
                  )
                )}
              </strong>

              <small>
                ${escapeHtml(
                  formatScheduleMoney(
                    course.take_home
                  )
                )}
              </small>

              ${
                isSelected
                  ? `
                    <span
                      class="schedule-extension-quantity"
                    >
                      <span
                        data-schedule-extension-minus
                      >
                        −
                      </span>

                      <strong>
                        ${quantity}
                      </strong>

                      <span
                        data-schedule-extension-plus
                      >
                        ＋
                      </span>
                    </span>
                  `
                  : `
                    <span
                      data-schedule-extension-add
                    >
                      ＋追加
                    </span>
                  `
              }
            </button>
          `;
          })
          .join('');
    }
  }


  if (scheduleOptionGrid) {

    if (options.length === 0) {

      scheduleOptionGrid.innerHTML = `
        <p class="schedule-master-empty">
          この店舗のOP料金は未登録です。
        </p>
      `;

    } else {

      scheduleOptionGrid.innerHTML =
        options
          .map((option) => `
            <label class="schedule-option-choice">
              <input
                type="checkbox"
                value="${escapeHtml(
                  String(option.name)
                )}"
                data-schedule-option
                data-option-rate-id="${Number(
                  option.store_option_rate_id
                )}"
                data-option-price="${Number(
                  option.price
                )}"
                data-option-take-home="${Number(
                  option.take_home
                )}"
              >

              <span>
                ${escapeHtml(
                  String(option.name)
                )}

                <small>
                  ${escapeHtml(
                    formatScheduleMoney(
                      option.take_home
                    )
                  )}
                </small>
              </span>
            </label>
          `)
          .join('');


      scheduleOptionGrid
        .querySelectorAll(
          '[data-schedule-option]'
        )
        .forEach((input) => {

          input.checked =
            selectedOptionNames.includes(
              String(input.value)
            );
        });
    }
  }


  updateScheduleCoursePriceSummary();
}


function updateScheduleCoursePriceSummary() {

  if (!scheduleCoursePriceSummary) {
    return;
  }


  if (!selectedScheduleCourseMaster) {

    scheduleCoursePriceSummary.innerHTML = `
      <span>
        基本料金
        <strong>未選択</strong>
      </span>

      <span>
        コース手取り
        <strong>未選択</strong>
      </span>
    `;

    return;
  }


  scheduleCoursePriceSummary.innerHTML = `
    <span>
      基本料金
      <strong>
        ${escapeHtml(
          formatScheduleMoney(
            selectedScheduleCourseMaster
              .base_price
          )
        )}
      </strong>
    </span>

    <span>
      コース手取り
      <strong>
        ${escapeHtml(
          formatScheduleMoney(
            selectedScheduleCourseMaster
              .take_home
          )
        )}
      </strong>
    </span>
  `;
}


async function loadScheduleSalesMaster() {

  if (
    !scheduleStore
    || !scheduleFormDate
    || !scheduleStartTime
  ) {
    return;
  }


  const storeId =
    Number(
      scheduleStore.value
    );

  const date =
    scheduleFormDate.value;

  const time =
    scheduleStartTime.value;


  if (
    !storeId
    || !date
    || !time
  ) {
    return;
  }


  const params =
    new URLSearchParams({
      store_id:
        String(storeId),

      at:
        `${date} ${time}:00`,
    });


  try {

    const response =
      await fetch(
        `/api/v1/sales-master.php?${params.toString()}`
      );


    const data =
      await response.json();


    if (
      !response.ok
      || !data.success
    ) {

      throw new Error(
        data.error
        || '料金マスタを取得できませんでした。'
      );
    }


    scheduleSalesMaster = {
      store:
        data.store
        || null,

      courses:
        Array.isArray(data.courses)
          ? data.courses
          : [],

      options:
        Array.isArray(data.options)
          ? data.options
          : [],

      dailyFeeRule:
        data.daily_fee_rule
        || null,
    };


    const selectedStoreCourseId =
      Number(
        selectedScheduleCourseMaster
          ?.store_course_id
        || 0
      );


    const matchingCourseById =
      selectedStoreCourseId > 0
        ? scheduleSalesMaster.courses.find(
            (course) =>
              Number(
                course.store_course_id
              )
              === selectedStoreCourseId
              && course.course_type
                === 'regular'
          )
        : null;


    const matchingCourse =
      matchingCourseById
      || scheduleSalesMaster.courses.find(
        (course) =>
          Number(
            course.course_minutes
          )
          === Number(
            selectedScheduleCourse
          )
          && course.course_type
            === 'regular'
          && course.pricing_category
            === 'standard'
      )
      || null;


    selectedScheduleCourseMaster =
      matchingCourse;

    selectedScheduleCourseRateId =
      matchingCourse
        ? Number(
            matchingCourse.store_course_rate_id
          )
        : null;


    if (
      matchingCourse
      && (
        matchingCourse.pricing_category
        === 'standard'
        || matchingCourse.pricing_category
        === 'foreign'
      )
    ) {
      selectedSchedulePricingCategory =
        matchingCourse.pricing_category;
    }


    renderScheduleSalesMaster();


  } catch (error) {

    scheduleSalesMaster = {
      store: null,
      courses: [],
      options: [],
      dailyFeeRule: null,
    };

    selectedScheduleCourseMaster =
      null;

    selectedScheduleCourseRateId =
      null;


    console.error(
      'Failed to load sales master:',
      error
    );
  }
}


function initializeSchedule() {

  if (!scheduleDateInput) return;

  const today =
    scheduleFormatDate(
      new Date()
    );

  scheduleState.anchorDate = today;
  scheduleDateInput.value = today;

  if (scheduleFormDate) {
    scheduleFormDate.value = today;
  }
}


/* ========================================
   SCHEDULE EVENTS
======================================== */

if (scheduleDateInput) {

  scheduleDateInput.addEventListener(
    'change',
    () => {

      if (!scheduleDateInput.value) return;

      scheduleState.anchorDate =
        scheduleDateInput.value;

      loadSchedule();
    }
  );
}


if (scheduleStore) {

  scheduleStore.addEventListener(
    'change',
    () => {
      loadScheduleSalesMaster();
    }
  );
}


if (scheduleFormDate) {

  scheduleFormDate.addEventListener(
    'change',
    () => {
      loadScheduleSalesMaster();
    }
  );
}


if (scheduleStartTime) {

  scheduleStartTime.addEventListener(
    'change',
    () => {
      loadScheduleSalesMaster();
    }
  );
}


if (scheduleCourseMasterList) {

  scheduleCourseMasterList.addEventListener(
    'click',
    (event) => {

      const categoryButton =
        event.target.closest(
          '[data-schedule-course-category]'
        );


      if (categoryButton) {

        selectedSchedulePricingCategory =
          categoryButton.dataset
            .scheduleCourseCategory;

        renderScheduleSalesMaster();

        return;
      }


      const button =
        event.target.closest(
          '[data-schedule-master-course]'
        );

      if (!button) {
        return;
      }


      const courseRateId =
        Number(
          button.dataset.courseRateId
        );


      const course =
        scheduleSalesMaster.courses.find(
          (item) =>
            Number(
              item.store_course_rate_id
            )
            === courseRateId
        )
        || null;


      if (!course) {
        return;
      }


      selectedScheduleCourseMaster =
        course;

      selectedScheduleCourseRateId =
        courseRateId;

      selectedScheduleCourse =
        Number(
          course.course_minutes
        );


      if (scheduleCustomCourse) {
        scheduleCustomCourse.value = '';
      }


      scheduleCourseMasterList
        .querySelectorAll(
          '[data-schedule-master-course]'
        )
        .forEach((item) => {

          item.classList.toggle(
            'is-selected',
            Number(
              item.dataset.courseRateId
            )
            === courseRateId
          );
        });


      updateScheduleCoursePriceSummary();
    }
  );
}


if (scheduleExtensionMasterList) {

  scheduleExtensionMasterList.addEventListener(
    'click',
    (event) => {

      const button =
        event.target.closest(
          '[data-schedule-extension-course]'
        );

      if (!button) {
        return;
      }


      const storeCourseId =
        Number(
          button.dataset.storeCourseId
        );


      if (storeCourseId <= 0) {
        return;
      }


      const existingIndex =
        selectedScheduleExtensions
          .findIndex(
            (extension) =>
              Number(
                extension.store_course_id
              )
              === storeCourseId
          );


      const addButton =
        event.target.closest(
          '[data-schedule-extension-add]'
        );

      const plusButton =
        event.target.closest(
          '[data-schedule-extension-plus]'
        );

      const minusButton =
        event.target.closest(
          '[data-schedule-extension-minus]'
        );


      if (
        addButton
        && existingIndex < 0
      ) {

        selectedScheduleExtensions.push({
          store_course_id:
            storeCourseId,

          quantity: 1,
        });

      } else if (
        plusButton
        && existingIndex >= 0
      ) {

        selectedScheduleExtensions[
          existingIndex
        ].quantity += 1;

      } else if (
        minusButton
        && existingIndex >= 0
      ) {

        const currentQuantity =
          Number(
            selectedScheduleExtensions[
              existingIndex
            ].quantity
            || 1
          );


        if (currentQuantity <= 1) {

          selectedScheduleExtensions.splice(
            existingIndex,
            1
          );

        } else {

          selectedScheduleExtensions[
            existingIndex
          ].quantity =
            currentQuantity - 1;
        }

      } else {

        return;
      }


      renderScheduleSalesMaster();
    }
  );
}


if (scheduleCustomCourse) {

  scheduleCustomCourse.addEventListener(
    'input',
    () => {

      const value =
        Number(
          scheduleCustomCourse.value
        );


      if (value <= 0) {
        return;
      }


      selectedScheduleCourse =
        value;

      selectedScheduleCourseMaster =
        null;

      selectedScheduleCourseRateId =
        null;


      if (scheduleCourseMasterList) {

        scheduleCourseMasterList
          .querySelectorAll(
            '[data-schedule-master-course]'
          )
          .forEach((button) => {

            button.classList.remove(
              'is-selected'
            );
          });
      }


      updateScheduleCoursePriceSummary();
    }
  );
}


document.addEventListener(
  'click',
  (event) => {

    const zoomButton =
      event.target.closest(
        '[data-schedule-zoom]'
      );

    if (zoomButton) {

      const action =
        zoomButton.dataset.scheduleZoom;

      const currentHeight =
        getScheduleHourHeight();

      if (action === 'in') {
        setScheduleZoom(
          currentHeight
          + scheduleZoom.step
        );
      }

      if (action === 'out') {
        setScheduleZoom(
          currentHeight
          - scheduleZoom.step
        );
      }

      if (action === 'reset') {
        setScheduleZoom(96);
      }

      return;
    }


    const viewButton =
      event.target.closest(
        '[data-schedule-view]'
      );

    if (viewButton) {

      scheduleState.view =
        viewButton.dataset.scheduleView;

      document
        .querySelectorAll(
          '[data-schedule-view]'
        )
        .forEach((button) => {
          button.classList.toggle(
            'is-selected',
            button === viewButton
          );
        });

      loadSchedule();
      return;
    }


    const moveButton =
      event.target.closest(
        '[data-schedule-move]'
      );

    if (moveButton) {

      const direction =
        Number(
          moveButton.dataset.scheduleMove
        );

      moveSchedulePeriod(direction);
      return;
    }


    const todayButton =
      event.target.closest(
        '[data-schedule-today]'
      );

    if (todayButton) {

      const today =
        scheduleFormatDate(
          new Date()
        );

      scheduleState.anchorDate = today;

      if (scheduleDateInput) {
        scheduleDateInput.value = today;
      }

      loadSchedule();
      return;
    }


    const slotButton =
      event.target.closest(
        '[data-schedule-slot]'
      );

    if (slotButton) {

      openScheduleForm(
        slotButton.dataset.date,
        slotButton.dataset.time
      );

      return;
    }


    const eventButton =
      event.target.closest(
        '[data-schedule-event]'
      );

    if (eventButton) {

      const visit =
        scheduleState.visits.find(
          (item) =>
            Number(item.id) ===
            Number(eventButton.dataset.scheduleEvent)
        );

      if (visit) {
        openScheduleDetail(visit);
      }

      return;
    }


    const statusButton =
      event.target.closest(
        '[data-customer-status]'
      );

    if (statusButton) {

      selectedCustomerStatus =
        statusButton.dataset.customerStatus;

      document
        .querySelectorAll(
          '[data-customer-status]'
        )
        .forEach((button) => {
          button.classList.toggle(
            'is-selected',
            button === statusButton
          );
        });

      return;
    }


    const saveCustomerGeneralNotesButton =
      event.target.closest(
        '[data-action="save-schedule-customer-general-notes"]'
      );

    if (saveCustomerGeneralNotesButton) {

      saveScheduleCustomerGeneralNotes(
        saveCustomerGeneralNotesButton
      );

      return;
    }


    const saveCustomerNamesButton =
      event.target.closest(
        '[data-action="save-schedule-customer-names"]'
      );

    if (saveCustomerNamesButton) {

      saveScheduleCustomerNames(
        saveCustomerNamesButton
      );

      return;
    }


    const saveCustomerAcquisitionSourceButton =
      event.target.closest(
        '[data-action="save-schedule-customer-acquisition-source"]'
      );

    if (saveCustomerAcquisitionSourceButton) {

      saveScheduleCustomerAcquisitionSource(
        saveCustomerAcquisitionSourceButton
      );

      return;
    }


    const saveCustomerIdentityFeaturesButton =
      event.target.closest(
        '[data-action="save-schedule-customer-identity-features"]'
      );

    if (saveCustomerIdentityFeaturesButton) {

      saveScheduleCustomerIdentityFeatures(
        saveCustomerIdentityFeaturesButton
      );

      return;
    }


    const featureButton =
      event.target.closest(
        '[data-schedule-feature]'
      );

    if (featureButton) {

      if (
        featureButton.hasAttribute(
          'data-action'
        )
      ) {
        return;
      }


      const labels = {
        customer: '顧客情報',
        diary: 'お礼日記',
        sales: '売上入力',
      };


      showPlaceholder(
        labels[
          featureButton.dataset.scheduleFeature
        ] || '準備中'
      );
    }
  }
);


if (scheduleDrawerBackdrop) {

  scheduleDrawerBackdrop.addEventListener(
    'click',
    () => {
      closeScheduleDetail();
    }
  );
}


/* ========================================
   PERIOD
======================================== */

function getSchedulePeriod() {

  const anchor =
    scheduleParseDate(
      scheduleState.anchorDate
      || scheduleFormatDate(new Date())
    );

  let start =
    new Date(anchor);

  let days = 1;


  if (
    scheduleState.view === 'week'
    || scheduleState.view === 'two-weeks'
  ) {

    const day =
      start.getDay();

    const mondayOffset =
      day === 0
        ? -6
        : 1 - day;

    start.setDate(
      start.getDate() + mondayOffset
    );

    days =
      scheduleState.view === 'week'
        ? 7
        : 14;
  }


  const end =
    new Date(start);

  end.setDate(
    end.getDate() + days - 1
  );


  const dates = [];

  for (
    let index = 0;
    index < days;
    index += 1
  ) {

    const date =
      new Date(start);

    date.setDate(
      start.getDate() + index
    );

    dates.push(
      scheduleFormatDate(date)
    );
  }


  return {
    start:
      scheduleFormatDate(start),

    end:
      scheduleFormatDate(end),

    dates,
  };
}


function moveSchedulePeriod(
  direction
) {

  const current =
    scheduleParseDate(
      scheduleState.anchorDate
    );

  let amount = 1;

  if (scheduleState.view === 'week') {
    amount = 7;
  }

  if (
    scheduleState.view === 'two-weeks'
  ) {
    amount = 14;
  }

  current.setDate(
    current.getDate()
    + amount * direction
  );

  scheduleState.anchorDate =
    scheduleFormatDate(current);

  if (scheduleDateInput) {
    scheduleDateInput.value =
      scheduleState.anchorDate;
  }

  loadSchedule();
}


/* ========================================
   LOAD
======================================== */

async function loadSchedule(
  preserveScroll = false
) {

  if (!scheduleCalendar) {
    return;
  }


  if (!scheduleState.anchorDate) {

    scheduleState.anchorDate =
      scheduleFormatDate(
        new Date()
      );
  }


  const period =
    getSchedulePeriod();


  scheduleCalendar.innerHTML = `
    <div class="schedule-loading">
      予定を読み込み中…
    </div>
  `;


  updateSchedulePeriodTitle(
    period
  );


  try {

    const params =
      new URLSearchParams({
        date_from:
          period.start,

        date_to:
          period.end,
      });


    const response =
      await fetch(
        `${scheduleApiUrl}?${params.toString()}`
      );


    const data =
      await response.json();


    if (
      !response.ok
      || !data.success
    ) {
      throw new Error(
        data.error
        || '予定の取得に失敗しました。'
      );
    }


    scheduleState.visits =
      data.visits || [];


    const shiftParams =
      new URLSearchParams({
        date_from:
          period.start,

        date_to:
          period.end,
      });


    const shiftResponse =
      await fetch(
        `${scheduleShiftsApiUrl}?${shiftParams.toString()}`
      );


    const shiftData =
      await shiftResponse.json();


    if (
      !shiftResponse.ok
      || !shiftData.success
    ) {
      throw new Error(
        shiftData.error
        || '確定シフトの取得に失敗しました。'
      );
    }


    scheduleState.shifts =
      Array.isArray(
        shiftData.shifts
      )
        ? shiftData.shifts.filter(
            (shift) =>
              (
                shift.status
                === 'confirmed'
                ||
                shift.status
                === 'off'
              )
              &&
              Number(
                shift.is_reservation_owner
              )
              === 1
          )
        : [];


    if (scheduleVisitCount) {

      scheduleVisitCount.textContent =
        `${scheduleState.visits.length}件`;
    }


    renderScheduleCalendar(
      period,
      preserveScroll
    );


  } catch (error) {

    scheduleCalendar.innerHTML = `
      <div class="schedule-error">
        <strong>予定を読み込めなかった</strong>
        <span>
          ${escapeHtml(error.message)}
        </span>
      </div>
    `;
  }
}


/* ========================================
   RENDER
======================================== */

function renderScheduleCalendar(
  period,
  preserveScroll = false
) {

  const days =
    period.dates.length;

  const hourHeight =
    getScheduleHourHeight();

  const totalMinutes =
    (
      scheduleEndHour
      - scheduleStartHour
    ) * 60;

  const totalHeight =
    totalMinutes
    * hourHeight
    / 60;


  const columns =
    `var(--schedule-time-width) repeat(${days}, minmax(0, 1fr))`;


  const headerHtml =
    period.dates
      .map((date) => {

        const object =
          scheduleParseDate(date);

        const weekday =
          [
            '日',
            '月',
            '火',
            '水',
            '木',
            '金',
            '土',
          ][object.getDay()];

        const isToday =
          date ===
          scheduleFormatDate(
            new Date()
          );

        return `
          <div
            class="
              schedule-day-header
              ${isToday ? 'is-today' : ''}
            "
          >
            <strong>
              ${object.getMonth() + 1}/${object.getDate()}(${weekday})
            </strong>
          </div>
        `;
      })
      .join('');


  const timeLabels = [];

  for (
    let hour = scheduleStartHour;
    hour <= scheduleEndHour;
    hour += 1
  ) {

    const top =
      (
        hour
        - scheduleStartHour
      ) * hourHeight;

    timeLabels.push(`
      <span
        class="schedule-time-label"
        style="top:${top}px"
      >
        ${String(hour).padStart(2, '0')}:00
      </span>
    `);
  }


  const dayColumns =
    period.dates
      .map((date) => {

        const isToday =
          date ===
          scheduleFormatDate(
            new Date()
          );


        const dayShift =
          scheduleState.shifts
            .find(
              (shift) =>
                shift.shift_date
                === date
            )
          || null;


        const isOff =
          dayShift?.status
          === 'off';


        return `
          <div
            class="
              schedule-day-column
              ${isToday ? 'is-today' : ''}
              ${isOff ? 'is-off' : ''}
            "
            data-schedule-day="${date}"
            style="height:${totalHeight}px"
          >
            ${renderScheduleSlots(
              date,
              totalHeight,
              hourHeight
            )}

            ${
              isOff
                ? `
                  <div class="schedule-day-off-label">
                    休み
                  </div>
                `
                : renderScheduleShiftForDate(
                    date,
                    hourHeight
                  )
            }

            ${renderScheduleEventsForDate(
              date,
              hourHeight
            )}

            ${isToday
              ? renderScheduleNowLine(
                  hourHeight
                )
              : ''
            }
          </div>
        `;
      })
      .join('');


  scheduleCalendar.innerHTML = `
    <div
      class="schedule-grid"
      data-view="${escapeHtml(
        scheduleState.view
      )}"
    >

      <div
        class="schedule-grid-header"
        style="grid-template-columns:${columns}"
      >

        <div
          class="schedule-grid-header-spacer"
        ></div>

        ${headerHtml}

      </div>


      <div
        class="schedule-grid-body"
        style="
          grid-template-columns:${columns};
          height:${totalHeight}px;
        "
      >

        <div
          class="schedule-time-axis"
          style="height:${totalHeight}px"
        >
          ${timeLabels.join('')}
        </div>

        ${dayColumns}

      </div>

    </div>
  `;


  if (!preserveScroll) {

    scrollScheduleToNow(
      period,
      hourHeight
    );
  }
}


function scrollScheduleToToday() {

  const shell =
    document.querySelector(
      '.schedule-calendar-shell'
    );

  const todayColumn =
    document.querySelector(
      '.schedule-day-column.is-today'
    );

  if (!shell || !todayColumn) {
    return;
  }

  const columnCenter =
    todayColumn.offsetLeft
    + todayColumn.offsetWidth / 2;

  const targetLeft =
    columnCenter
    - shell.clientWidth / 2;

  const maxLeft =
    Math.max(
      0,
      shell.scrollWidth
      - shell.clientWidth
    );

  shell.scrollLeft =
    Math.min(
      maxLeft,
      Math.max(
        0,
        targetLeft
      )
    );
}


function renderScheduleShiftForDate(
  date,
  hourHeight
) {

  const shift =
    scheduleState.shifts
      .find(
        (item) =>
          item.shift_date
          === date
      )
    || null;


  if (
    !shift
    || !shift.start_at
    || !shift.end_at
  ) {
    return '';
  }


  const startHour =
    Number(
      String(
        shift.start_at
      ).slice(
        11,
        13
      )
    );

  const startMinute =
    Number(
      String(
        shift.start_at
      ).slice(
        14,
        16
      )
    );


  const startDate =
    String(
      shift.start_at
    ).slice(
      0,
      10
    );

  const endDate =
    String(
      shift.end_at
    ).slice(
      0,
      10
    );


  let endHour =
    Number(
      String(
        shift.end_at
      ).slice(
        11,
        13
      )
    );

  const endMinute =
    Number(
      String(
        shift.end_at
      ).slice(
        14,
        16
      )
    );


  if (
    endDate > startDate
  ) {
    endHour += 24;
  }


  const startTotalMinutes =
    startHour * 60
    + startMinute;

  const endTotalMinutes =
    endHour * 60
    + endMinute;


  const calendarStartMinutes =
    scheduleStartHour * 60;

  const calendarEndMinutes =
    scheduleEndHour * 60;


  const visibleStart =
    Math.max(
      startTotalMinutes,
      calendarStartMinutes
    );

  const visibleEnd =
    Math.min(
      endTotalMinutes,
      calendarEndMinutes
    );


  if (
    visibleEnd
    <= visibleStart
  ) {
    return '';
  }


  const top =
    (
      visibleStart
      - calendarStartMinutes
    )
    * hourHeight
    / 60;


  const height =
    (
      visibleEnd
      - visibleStart
    )
    * hourHeight
    / 60;


  return `
    <div
      class="schedule-shift-band"
      style="
        top:${top}px;
        height:${height}px;
      "
    >
      <span>
        確定シフト
      </span>

      <strong>
        ${escapeHtml(
          shift.store_name
          || ''
        )}
      </strong>
    </div>
  `;
}


function renderScheduleSlots(
  date,
  totalHeight,
  hourHeight
) {

  const slotMinutes = 10;

  const slotCount =
    (
      (
        scheduleEndHour
        - scheduleStartHour
      ) * 60
    ) / slotMinutes;

  const slots = [];


  for (
    let index = 0;
    index < slotCount;
    index += 1
  ) {

    const minutes =
      index * slotMinutes;

    const absoluteMinutes =
      scheduleStartHour * 60
      + minutes;

    const hour =
      Math.floor(
        absoluteMinutes / 60
      );

    const minute =
      absoluteMinutes % 60;

    const time =
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    const top =
      minutes
      * hourHeight
      / 60;

    let slotClass =
      'is-ten-minute';

    if (minute === 0) {
      slotClass = 'is-hour';
    } else if (minute === 30) {
      slotClass = 'is-half-hour';
    }


    slots.push(`
      <button
        class="schedule-time-slot ${slotClass}"
        type="button"
        data-schedule-slot
        data-date="${date}"
        data-time="${time}"
        style="
          top:${top}px;
        "
        aria-label="${date} ${time}に予約を追加"
      ></button>
    `);
  }


  return slots.join('');
}


function renderScheduleEventsForDate(
  date,
  hourHeight
) {

  return scheduleState.visits
    .filter((visit) => {

      if (
        visit.status === 'cancelled'
      ) {
        return false;
      }


      const startedAt =
        String(
          visit.started_at
          || ''
        );

      const startedDate =
        startedAt.slice(0, 10);

      const startedHour =
        Number(
          startedAt.slice(11, 13)
        );


      if (
        startedHour >= 0
        && startedHour < 3
      ) {

        const previousDate =
          scheduleParseDate(
            startedDate
          );

        previousDate.setDate(
          previousDate.getDate() - 1
        );

        return (
          scheduleFormatDate(
            previousDate
          ) === date
        );
      }


      return startedDate === date;
    })
    .map((visit) =>
      renderScheduleEvent(
        visit,
        hourHeight
      )
    )
    .join('');
}


function renderScheduleEvent(
  visit,
  hourHeight
) {

  const time =
    String(
      visit.started_at
      || ''
    ).slice(11, 16);

  const [
    hourText,
    minuteText,
  ] = time.split(':');

  let startMinutes =
    Number(hourText) * 60
    + Number(minuteText);


  if (
    Number(hourText) >= 0
    && Number(hourText) < 3
  ) {
    startMinutes +=
      24 * 60;
  }


  const calendarStart =
    scheduleStartHour * 60;

  const top =
    (
      startMinutes
      - calendarStart
    ) * hourHeight / 60;

  const extensionMinutes =
    (
      Array.isArray(
        visit.extensions
      )
        ? visit.extensions
        : []
    )
      .reduce(
        (
          total,
          extension
        ) =>
          total
          + (
              Number(
                extension.course_minutes
                || 0
              )
              * Number(
                  extension.quantity
                  || 1
                )
            ),
        0
      );


  const duration =
    Math.max(
      10,
      Number(
        visit.course_minutes
        || 0
      )
      + extensionMinutes
    );

  const height =
    Math.max(
      28,
      duration
      * hourHeight
      / 60
      - 3
    );


  if (
    top < 0
    || startMinutes
      >= scheduleEndHour * 60
  ) {
    return '';
  }


  const status =
    scheduleCustomerStatusLabel(
      visit.customer_status
    );


  const customerNames =
    Array.isArray(
      visit.customer_names
    )
      ? visit.customer_names
      : [];


  const namePrefixes = {
    nickname: '',
    kashikoi: 'カ:',
    okini_talk: 'オ:',
    line: 'L:',
    x: 'X:',
    instagram: 'I:',
  };


  const customerNameParts =
    customerNames
      .filter(
        (nameRecord) =>
          nameRecord.name
          && Object.prototype.hasOwnProperty.call(
            namePrefixes,
            nameRecord.name_type
          )
      )
      .map((nameRecord) => {

        const prefix =
          namePrefixes[
            nameRecord.name_type
          ];

        return `${prefix}${String(
          nameRecord.name
        )}`;
      });


  const customer =
    customerNameParts.length
      ? customerNameParts.join(' / ')
      : (
          visit.customer_name
          || visit.customer_code
          || status
        );


  const storeClass =
    scheduleStoreClass(
      visit.store_name
    );

  const courseClass =
    scheduleCourseClass(
      Number(visit.course_minutes)
    );

  const repeatClass =
    [
      'repeat',
      'other_store_repeat',
      'repeat_unknown_id',
    ].includes(visit.customer_status)
      ? 'is-repeat'
      : '';


  const optionNames =
    Array.isArray(visit.options)
      ? visit.options
          .map((option) =>
            option.name
            || option.custom_name
            || ''
          )
          .filter(Boolean)
      : [];


  const optionHtml =
    optionNames.length
      ? `
        <span class="schedule-event-options">
          ${escapeHtml(
            optionNames.join('・')
          )}
        </span>
      `
      : '';


  return `
    <button
      class="
        schedule-event
        ${storeClass}
        ${courseClass}
        ${repeatClass}
      "
      type="button"
      draggable="true"
      data-schedule-event="${Number(visit.id)}"
      data-schedule-started-at="${escapeHtml(
        String(visit.started_at || '')
      )}"
      style="
        top:${top}px;
        height:${height}px;
      "
    >

      <span class="schedule-event-heading">

        <span class="schedule-event-time">
          ${escapeHtml(time)}
        </span>

        <span class="schedule-event-kind">
          ${escapeHtml(status)}
        </span>

      </span>

      ${
        visit.customer_name
        || visit.customer_code
          ? `
            <span class="schedule-event-main">
              ${escapeHtml(customer)}
            </span>
          `
          : ''
      }

      <span class="schedule-event-meta">

        <span class="schedule-event-status">
          ${
            visit.pricing_category
              === 'foreign'
              ? `外${Number(
                  visit.course_minutes
                )}分`
              : `${Number(
                  visit.course_minutes
                )}分`
          }
        </span>

      </span>

      ${optionHtml}

      <span class="schedule-event-progress">

        <span
          class="${Number(visit.customer_linked) ? '' : 'is-incomplete'}"
          title="顧客"
        >
          👤
        </span>

        <span
          class="${Number(visit.diary_linked) ? '' : 'is-incomplete'}"
          title="日記"
        >
          📓
        </span>

        <span
          class="${Number(visit.sales_entered) ? '' : 'is-incomplete'}"
          title="売上"
        >
          ¥
        </span>

      </span>

    </button>
  `;
}


function renderScheduleNowLine(
  hourHeight
) {

  const now =
    new Date();

  let displayHour =
    now.getHours();


  if (
    displayHour < 3
  ) {
    displayHour += 24;
  }


  const minutes =
    displayHour * 60
    + now.getMinutes();

  const start =
    scheduleStartHour * 60;

  const end =
    scheduleEndHour * 60;


  if (
    minutes < start
    || minutes >= end
  ) {
    return '';
  }


  const top =
    (
      minutes - start
    ) * hourHeight / 60;


  return `
    <div
      class="schedule-now-line"
      style="top:${top}px"
    >

      <span class="schedule-now-label">
        ${String(displayHour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}
      </span>

    </div>
  `;
}


/* ========================================
   PERIOD TITLE
======================================== */

function updateSchedulePeriodTitle(
  period
) {

  if (!schedulePeriodTitle) return;


  const start =
    scheduleParseDate(
      period.start
    );

  const end =
    scheduleParseDate(
      period.end
    );


  if (period.start === period.end) {

    schedulePeriodTitle.textContent =
      `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日`;

    return;
  }


  schedulePeriodTitle.textContent =
    `${start.getMonth() + 1}/${start.getDate()} 〜 ${end.getMonth() + 1}/${end.getDate()}`;
}


/* ========================================
   ADD / EDIT FORM
======================================== */

function openScheduleForm(
  date = null,
  time = null
) {

  if (!scheduleFormCard) return;


  closeScheduleDetail();


  let targetDate =
    date
    || scheduleState.anchorDate
    || scheduleFormatDate(
      new Date()
    );


  let targetTime =
    time || '12:00';


  if (targetTime) {

    const [
      hourText,
      minuteText,
    ] = targetTime.split(':');

    const hour =
      Number(hourText);

    if (hour >= 24) {

      const nextDate =
        scheduleParseDate(
          targetDate
        );

      nextDate.setDate(
        nextDate.getDate() + 1
      );

      targetDate =
        scheduleFormatDate(
          nextDate
        );

      targetTime =
        `${String(hour - 24).padStart(2, '0')}:${minuteText}`;
    }
  }


  resetScheduleForm();


  if (scheduleFormDate) {
    scheduleFormDate.value =
      targetDate;
  }


  if (scheduleStore) {

    const confirmedShift =
      scheduleState.shifts
        .find(
          (shift) =>
            shift.shift_date
            === targetDate
            &&
            shift.status
            === 'confirmed'
        )
      || null;


    if (
      confirmedShift
      &&
      confirmedShift.store_id
    ) {

      scheduleStore.value =
        String(
          confirmedShift.store_id
        );

    } else {

      const sapporoStore =
        Array.from(
          scheduleStore.options
        )
          .find(
            (option) =>
              option.textContent
                ?.trim()
              === '札幌'
          )
        || null;


      if (sapporoStore) {
        scheduleStore.value =
          String(
            sapporoStore.value
          );
      }
    }
  }


  if (scheduleStartTime) {
    scheduleStartTime.value =
      targetTime;
  }


  const bookedNow =
    new Date();


  if (scheduleBookedDate) {
    scheduleBookedDate.value =
      scheduleFormatDate(
        bookedNow
      );
  }


  if (scheduleBookedTime) {
    scheduleBookedTime.value =
      `${String(bookedNow.getHours()).padStart(2, '0')}:${String(bookedNow.getMinutes()).padStart(2, '0')}`;
  }


  scheduleFormCard.hidden = false;

  loadScheduleSalesMaster();
}


function resetScheduleForm() {

  if (scheduleEditId) {
    scheduleEditId.value = '';
  }


  if (scheduleFormTitle) {
    scheduleFormTitle.textContent =
      '予約を追加';
  }


  if (scheduleSaveButton) {
    scheduleSaveButton.textContent =
      'この予約を登録';
  }


  selectedScheduleCourse =
    null;

  selectedScheduleCourseMaster =
    null;

  selectedScheduleCourseRateId =
    null;

  selectedSchedulePricingCategory =
    'standard';

  selectedScheduleExtensions =
    [];

  selectedCustomerStatus =
    'repeat_unknown_id';


  if (scheduleCustomCourse) {
    scheduleCustomCourse.value = '';
  }


  if (scheduleCourseMasterList) {

    scheduleCourseMasterList.innerHTML = `
      <p class="schedule-master-empty">
        料金を読み込み中…
      </p>
    `;
  }


  if (scheduleExtensionMasterList) {

    scheduleExtensionMasterList.innerHTML =
      '';

    scheduleExtensionMasterList.hidden =
      true;
  }


  updateScheduleCoursePriceSummary();


  if (scheduleStore) {
    scheduleStore.value = '';
  }


  if (scheduleCustomerChange) {
    scheduleCustomerChange.checked =
      false;
  }


  document
    .querySelectorAll(
      '[data-schedule-option]'
    )
    .forEach((input) => {
      input.checked = false;
    });


  if (scheduleCustomOption) {
    scheduleCustomOption.value = '';
  }


  document
    .querySelectorAll(
      '[data-customer-status]'
    )
    .forEach((button) => {

      button.classList.toggle(
        'is-selected',
        button.dataset.customerStatus
        === 'repeat_unknown_id'
      );
    });


  hideScheduleMessage();
}


function closeScheduleForm() {

  if (!scheduleFormCard) return;

  scheduleFormCard.hidden = true;

  hideScheduleMessage();
}


async function saveScheduleVisit() {

  if (
    !scheduleFormDate
    || !scheduleStore
    || !scheduleStartTime
    || !scheduleSaveButton
  ) {
    return;
  }


  const date =
    scheduleFormDate.value;

  const time =
    scheduleStartTime.value;

  const editId =
    Number(
      scheduleEditId?.value
      || 0
    );


  if (!date || !time) {

    showScheduleMessage(
      '日付と開始時間を入れてね。',
      true
    );

    return;
  }


  if (
    !selectedScheduleCourse
    || selectedScheduleCourse <= 0
  ) {

    showScheduleMessage(
      '予約時間を選んでね。',
      true
    );

    return;
  }


  scheduleSaveButton.disabled = true;

  scheduleSaveButton.textContent =
    editId
      ? '更新中…'
      : '登録中…';


  hideScheduleMessage();


  const selectedOptions =
    Array.from(
      document.querySelectorAll(
        '[data-schedule-option]:checked'
      )
    )
      .map((input) =>
        String(input.value).trim()
      )
      .filter(Boolean);


  const customOption =
    scheduleCustomOption
      ? scheduleCustomOption.value.trim()
      : '';


  const bookedDate =
    scheduleBookedDate
      ? scheduleBookedDate.value
      : '';

  const bookedTime =
    scheduleBookedTime
      ? scheduleBookedTime.value
      : '';


  if (
    (bookedDate && !bookedTime)
    || (!bookedDate && bookedTime)
  ) {

    showScheduleMessage(
      '予約受付日は日付と時刻を両方入れてね。',
      true
    );

    scheduleSaveButton.disabled =
      false;

    scheduleSaveButton.textContent =
      editId
        ? '変更を保存'
        : 'この予約を登録';

    return;
  }


  const bookedAt =
    bookedDate && bookedTime
      ? `${bookedDate} ${bookedTime}`
      : null;


  const customerRequestedChange =
    Boolean(
      editId
      && scheduleCustomerChange
      && scheduleCustomerChange.checked
    );


  const payload = {
    store_id:
      Number(
        scheduleStore.value
      ),

    started_at:
      `${date} ${time}`,

    booked_at:
      bookedAt,

    course_minutes:
      selectedScheduleCourse,

    store_course_id:
      selectedScheduleCourseMaster
        ? Number(
            selectedScheduleCourseMaster
              .store_course_id
          )
        : null,

    extensions:
      selectedScheduleExtensions
        .map((extension) => ({
          store_course_id:
            Number(
              extension.store_course_id
            ),

          quantity:
            Number(
              extension.quantity
              || 1
            ),
        })),

    customer_status:
      selectedCustomerStatus,

    options:
      selectedOptions,

    custom_option:
      customOption,

    customer_requested_change:
      customerRequestedChange,
  };


  if (editId) {
    payload.id = editId;
  }


  const calendarShell =
    document.querySelector(
      '.schedule-calendar-shell'
    );

  const previousScrollLeft =
    calendarShell
      ? calendarShell.scrollLeft
      : 0;

  const previousScrollTop =
    calendarShell
      ? calendarShell.scrollTop
      : 0;

  const previousAnchorDate =
    scheduleState.anchorDate;


  try {

    const response =
      await fetch(
        scheduleApiUrl,
        {
          method:
            editId
              ? 'PATCH'
              : 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify(
              payload
            ),
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
        || '予約の保存に失敗しました。'
      );
    }


    scheduleState.anchorDate =
      previousAnchorDate;

    if (scheduleDateInput) {
      scheduleDateInput.value =
        previousAnchorDate;
    }


    closeScheduleForm();

    await loadSchedule(
      true
    );


    if (
      editId
      && calendarShell
    ) {

      calendarShell.scrollLeft =
        previousScrollLeft;

      calendarShell.scrollTop =
        previousScrollTop;
    }


  } catch (error) {

    showScheduleMessage(
      error.message,
      true
    );

  } finally {

    scheduleSaveButton.disabled =
      false;

    scheduleSaveButton.textContent =
      editId
        ? '変更を保存'
        : 'この予約を登録';
  }
}


/* ========================================
   DETAIL
======================================== */

function openScheduleDetail(
  visit
) {

  if (
    !scheduleDetailDrawer
    || !scheduleDetailBody
  ) {
    return;
  }


  if (scheduleLinkedCustomerPanel) {

    scheduleLinkedCustomerPanel.hidden =
      true;

    scheduleLinkedCustomerPanel.innerHTML =
      '';
  }


  if (scheduleCustomerPanel) {

    scheduleCustomerPanel.hidden =
      true;
  }


  scheduleState.identitySearchVisits =
    [];

  scheduleState.selectedIdentityCandidate =
    null;


  scheduleState.selectedVisit =
    visit;


  const status =
    scheduleCustomerStatusLabel(
      visit.customer_status
    );

  const customerNames =
    Array.isArray(
      visit.customer_names
    )
      ? visit.customer_names
      : [];


  const namePrefixes = {
    nickname: '',
    kashikoi: 'カ:',
    okini_talk: 'オ:',
    line: 'L:',
    x: 'X:',
    instagram: 'I:',
  };


  const preferredCustomerName =
    customerNames.find(
      (nameRecord) =>
        nameRecord.name_type ===
          'nickname'
        && nameRecord.name
    )
    ||
    customerNames.find(
      (nameRecord) =>
        nameRecord.name_type ===
          'kashikoi'
        && nameRecord.name
    )
    ||
    customerNames.find(
      (nameRecord) =>
        nameRecord.name
    );


  const customer =
    preferredCustomerName
      ? `${
          namePrefixes[
            preferredCustomerName.name_type
          ]
          || ''
        }${String(
          preferredCustomerName.name
        )}`
      : (
          visit.customer_name
          || visit.customer_code
          || status
        );


  const visitorTypeLabels = {
    local: '地元',
    travel: '旅行',
    business: '出張',
  };


  const visitorType =
    visitorTypeLabels[
      visit.visitor_type
    ]
    || '不明';


  const date =
    String(
      visit.started_at
    ).slice(0, 10);

  const time =
    String(
      visit.started_at
    ).slice(11, 16);


  if (scheduleDetailTitle) {
    scheduleDetailTitle.textContent =
      customer;
  }


  const optionNames =
    Array.isArray(visit.options)
      ? visit.options
          .map((option) =>
            option.name
            || option.custom_name
            || ''
          )
          .filter(Boolean)
      : [];


  const optionText =
    optionNames.length
      ? optionNames.join(' / ')
      : 'なし';


  scheduleDetailBody.innerHTML = `
    <div class="schedule-detail-card">

      <div class="schedule-detail-row">
        <span>日時</span>
        <strong>
          ${escapeHtml(date)}
          ${escapeHtml(time)}
        </strong>
      </div>

      <div class="schedule-detail-row">
        <span>店舗</span>
        <strong>
          ${escapeHtml(visit.store_name)}
        </strong>
      </div>

      <div class="schedule-detail-row">
        <span>予約時間</span>
        <strong>
          ${
            visit.pricing_category
              === 'foreign'
              ? `外${Number(
                  visit.course_minutes
                )}分`
              : `${Number(
                  visit.course_minutes
                )}分`
          }
        </strong>
      </div>

      <div class="schedule-detail-row">
        <span>区分</span>
        <strong>
          ${escapeHtml(status)}
        </strong>
      </div>

      <div class="schedule-detail-row">
        <span>来訪タイプ</span>

        <select
          id="schedule-visitor-type"
          class="schedule-visitor-type-select"
        >
          <option value=""
            ${!visit.visitor_type ? 'selected' : ''}>
            不明
          </option>

          <option value="local"
            ${visit.visitor_type === 'local' ? 'selected' : ''}>
            地元
          </option>

          <option value="travel"
            ${visit.visitor_type === 'travel' ? 'selected' : ''}>
            旅行
          </option>

          <option value="business"
            ${visit.visitor_type === 'business' ? 'selected' : ''}>
            出張
          </option>
        </select>
      </div>

      <div class="schedule-detail-row">
        <span>OP</span>
        <strong>
          ${escapeHtml(optionText)}
        </strong>
      </div>

    </div>
  `;


  const visitorTypeSelect =
    document.getElementById(
      'schedule-visitor-type'
    );


  if (visitorTypeSelect) {

    visitorTypeSelect.addEventListener(
      'change',
      saveScheduleVisitorType
    );
  }


  updateScheduleDetailState(
    scheduleDetailCustomerState,
    Number(
      visit.customer_linked
    ),
    '紐付け済',
    '未紐付け'
  );


  updateScheduleDetailState(
    scheduleDetailDiaryState,
    Number(
      visit.diary_linked
    ),
    '完了',
    '未入力'
  );


  updateScheduleDetailState(
    scheduleDetailSalesState,
    Number(
      visit.sales_entered
    ),
    '入力済',
    '未入力'
  );


  if (scheduleCustomerCancelButton) {

    scheduleCustomerCancelButton.hidden =
      !Boolean(
        Number(
          visit.customer_linked
        )
      );
  }


  if (scheduleDrawerBackdrop) {
    scheduleDrawerBackdrop.hidden =
      false;
  }


  scheduleDetailDrawer.classList.add(
    'is-open'
  );

  scheduleDetailDrawer.setAttribute(
    'aria-hidden',
    'false'
  );
}


async function saveScheduleVisitorType() {

  const visit =
    scheduleState.selectedVisit;

  const select =
    document.getElementById(
      'schedule-visitor-type'
    );


  if (!visit || !select) {
    return;
  }


  const previousValue =
    visit.visitor_type
    || '';

  const visitorType =
    select.value;


  select.disabled = true;


  try {

    const response =
      await fetch(
        scheduleApiUrl,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              id:
                Number(visit.id),

              visitor_type:
                visitorType,
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
        || '来訪タイプを保存できませんでした。'
      );
    }


    visit.visitor_type =
      data.visit?.visitor_type
      ?? visitorType;


  } catch (error) {

    select.value =
      previousValue;

    window.alert(
      error.message
    );

  } finally {

    select.disabled =
      false;
  }
}


function updateScheduleDetailState(
  element,
  complete,
  completeText,
  incompleteText
) {

  if (!element) return;


  element.textContent =
    complete
      ? completeText
      : incompleteText;


  const button =
    element.closest('button');

  if (button) {

    button.classList.toggle(
      'is-complete',
      Boolean(complete)
    );
  }
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


async function searchScheduleIdentity() {

  if (
    !scheduleIdentitySearchKeyword
    || !scheduleIdentitySearchStatus
    || !scheduleIdentitySearchStore
    || !scheduleIdentitySearchResults
  ) {
    return;
  }


  const params =
    new URLSearchParams();


  const keyword =
    scheduleIdentitySearchKeyword.value.trim();

  const customerStatus =
    scheduleIdentitySearchStatus.value;

  const storeId =
    scheduleIdentitySearchStore.value;


  if (keyword !== '') {
    params.set(
      'keyword',
      keyword
    );
  }


  if (customerStatus !== '') {
    params.set(
      'customer_status',
      customerStatus
    );
  }


  if (storeId !== '') {
    params.set(
      'store_id',
      storeId
    );
  }


  scheduleIdentitySearchResults.innerHTML =
    '<p>検索中...</p>';


  try {

    const response =
      await fetch(
        `${customerIdentitySearchApiUrl}?${params.toString()}`
      );


    const data =
      await response.json();


    if (
      !response.ok
      || !data.success
    ) {
      throw new Error(
        data.error
        || 'ID不明客を検索できませんでした。'
      );
    }


    const visits =
      (
        Array.isArray(
          data.data?.visits
        )
          ? data.data.visits
          : []
      )
        .filter(
          (visit) =>
            Number(visit.id)
            !== Number(
              scheduleState.selectedVisit?.id
            )
        );


    scheduleState.identitySearchVisits =
      visits;

    scheduleState.selectedIdentityCandidate =
      null;


    if (visits.length === 0) {

      scheduleIdentitySearchResults.innerHTML =
        '<p>候補は見つかりませんでした。</p>';

      return;
    }


    scheduleIdentitySearchResults.innerHTML =
      visits
        .map((visit) => {

          const features =
            Array.isArray(
              visit.identity_features
            )
              ? visit.identity_features
              : [];


          const featureHtml =
            features.length
              ? features
                  .map((feature) => {

                    const label =
                      getIdentityFeatureLabel(
                        feature.feature_type
                      );

                    return `
                      <span>
                        ${escapeHtml(label)}:
                        ${escapeHtml(
                          feature.feature_value
                        )}
                      </span>
                    `;
                  })
                  .join('')
              : '<span>構造化特徴なし</span>';


          const customerStatusLabels = {
            new: '新規',
            repeat: 'リピ',
            other_store_repeat: '他店リピ',
            repeat_unknown_id: 'リピ・ID不明',
          };


          const statusLabel =
            customerStatusLabels[
              visit.customer_status
            ]
            || visit.customer_status;


          return `
            <article class="schedule-identity-search-result">

              <div>
                <strong>
                  ${escapeHtml(
                    visit.started_at
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    visit.store_name
                    || ''
                  )}
                </span>

                <span>
                  ${escapeHtml(
                    statusLabel
                  )}
                </span>
              </div>

              <div>
                ${featureHtml}
              </div>

              ${
                visit.customer_features
                  ? `
                    <p>
                      ${escapeHtml(
                        visit.customer_features
                      )}
                    </p>
                  `
                  : ''
              }

              <small>
                visit #${escapeHtml(
                  visit.id
                )}
              </small>

              <button
                class="secondary-button"
                type="button"
                data-action="select-schedule-identity-candidate"
                data-visit-id="${escapeHtml(
                  visit.id
                )}"
              >
                この人を確認
              </button>

            </article>
          `;
        })
        .join('');


  } catch (error) {

    scheduleIdentitySearchResults.innerHTML =
      `<p>${escapeHtml(
        error.message
      )}</p>`;
  }
}


async function addScheduleIdentityFeature() {

  const visit =
    scheduleState.selectedVisit;


  if (
    !visit
    || !scheduleIdentityFeatureType
    || !scheduleIdentityFeatureValue
    || !scheduleIdentityFeatureNote
  ) {
    return;
  }


  const featureType =
    scheduleIdentityFeatureType.value;

  const featureValue =
    scheduleIdentityFeatureValue.value.trim();

  const note =
    scheduleIdentityFeatureNote.value.trim();


  if (featureValue === '') {

    window.alert(
      '特徴を入力してね。'
    );

    scheduleIdentityFeatureValue.focus();

    return;
  }


  const addButton =
    document.querySelector(
      '[data-action="add-schedule-identity-feature"]'
    );


  if (addButton) {

    addButton.disabled =
      true;

    addButton.textContent =
      '追加中...';
  }


  try {

    const response =
      await fetch(
        visitIdentityFeaturesApiUrl,
        {
          method: 'POST',

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

              feature_type:
                featureType,

              feature_value:
                featureValue,

              note:
                note,
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
        || '構造化特徴を追加できませんでした。'
      );
    }


    scheduleIdentityFeatureValue.value =
      '';

    scheduleIdentityFeatureNote.value =
      '';


    await loadScheduleIdentityFeatures();


    scheduleIdentityFeatureValue.focus();


  } catch (error) {

    window.alert(
      error.message
    );


  } finally {

    if (addButton) {

      addButton.disabled =
        false;

      addButton.textContent =
        '構造化特徴を追加';
    }
  }
}


async function openScheduleCustomerPanel() {

  const visit =
    scheduleState.selectedVisit;


  if (
    !visit
    || !scheduleCustomerPanel
    || !scheduleLinkedCustomerPanel
  ) {
    return;
  }


  const customerId =
    Number(
      visit.customer_id
      || 0
    );


  if (customerId) {

    scheduleCustomerPanel.hidden =
      true;

    scheduleLinkedCustomerPanel.hidden =
      false;

    scheduleLinkedCustomerPanel.innerHTML =
      '<p>顧客情報を読み込み中...</p>';


    try {

      const response =
        await fetch(
          customersApiUrl,
          {
            method: 'GET',
            cache: 'no-store',
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
          || '顧客情報を取得できませんでした。'
        );
      }


      const customers =
        Array.isArray(
          data.customers
        )
          ? data.customers
          : [];


      const customer =
        customers.find(
          (customerRecord) =>
            Number(
              customerRecord.id
            ) === customerId
        );


      if (!customer) {
        throw new Error(
          '紐付け先の顧客が見つかりませんでした。'
        );
      }


      const names =
        Array.isArray(
          customer.names
        )
          ? customer.names
          : [];


      const primaryName =
        names.find(
          (nameRecord) =>
            Number(
              nameRecord.is_primary
            ) === 1
        )
        || names[0]
        || null;


      const displayName =
        primaryName
          ? String(
              primaryName.name
            )
          : (
              visit.customer_name
              || '名前未登録'
            );


      const findName =
        (nameType) => {

          const nameRecord =
            names.find(
              (record) =>
                record.name_type
                === nameType
            );

          return nameRecord
            ? String(
                nameRecord.name
              )
            : '未登録';
        };


      const visits =
        Array.isArray(
          customer.visits
        )
          ? customer.visits
          : [];


      const identityFeatures =
        Array.isArray(
          customer.identity_features
        )
          ? customer.identity_features
          : [];


      const acquisitionSource =
        customer.acquisition_source
        || null;


      const findIdentityFeature =
        (featureType) => {

          const feature =
            identityFeatures.find(
              (record) =>
                record.feature_type
                === featureType
            );


          return feature
            ? String(
                feature.feature_value
                || ''
              )
            : '';
        };


      const visitHistoryHtml =
        visits.length
          ? visits
              .slice(0, 5)
              .map(
                (customerVisit) => `
                  <details class="schedule-customer-visit-detail">

                    <summary class="schedule-detail-row">

                      <span>
                        ${escapeHtml(
                          String(
                            customerVisit.started_at
                            || '日時未登録'
                          )
                        )}
                      </span>

                      <strong>
                        ${escapeHtml(
                          String(
                            customerVisit.course_minutes
                            || ''
                          )
                        )}${customerVisit.course_minutes
                          ? '分'
                          : ''}
                      </strong>

                    </summary>

                    <div class="schedule-customer-visit-detail-body">

                      <p>
                        <strong>
                          会話メモ
                        </strong>
                        <br>
                        ${escapeHtml(
                          String(
                            customerVisit.conversation_notes
                            || '未登録'
                          )
                        )}
                      </p>

                      <p>
                        <strong>
                          来店メモ
                        </strong>
                        <br>
                        ${escapeHtml(
                          String(
                            customerVisit.visit_notes
                            || '未登録'
                          )
                        )}
                      </p>

                    </div>

                  </details>
                `
              )
              .join('')
          : `
              <p>
                来店履歴はありません。
              </p>
            `;


      scheduleLinkedCustomerPanel.innerHTML = `
        <div class="schedule-detail-card">

          <div class="schedule-detail-row">
            <span>顧客名</span>
            <strong>
              ${escapeHtml(
                displayName
              )}
            </strong>
          </div>

          <div class="schedule-detail-row">
            <span>顧客ID</span>
            <strong>
              #${escapeHtml(
                String(customerId)
              )}
            </strong>
          </div>

          <div class="schedule-detail-row">
            <span>顧客コード</span>
            <strong>
              ${escapeHtml(
                String(
                  customer.customer_code
                  || '未登録'
                )
              )}
            </strong>
          </div>

          <div class="schedule-detail-row">
            <span>来店</span>
            <strong>
              ${escapeHtml(
                String(
                  customer.visit_count
                  || 0
                )
              )}回
            </strong>
          </div>

          <div class="schedule-detail-row">
            <span>予約中</span>
            <strong>
              ${escapeHtml(
                String(
                  customer.scheduled_count
                  || 0
                )
              )}件
            </strong>
          </div>

        </div>


        <div class="schedule-detail-card">

          <label>
            <span>呼び名</span>
            <input
              type="text"
              data-customer-name-input="nickname"
              value="${escapeHtml(
                findName('nickname') === '未登録'
                  ? ''
                  : findName('nickname')
              )}"
              placeholder="呼び名"
            >
          </label>

          <label>
            <span>カシコイ</span>
            <input
              type="text"
              data-customer-name-input="kashikoi"
              value="${escapeHtml(
                findName('kashikoi') === '未登録'
                  ? ''
                  : findName('kashikoi')
              )}"
              placeholder="カシコイ名"
            >
          </label>

          <label>
            <span>オキニトーク</span>
            <input
              type="text"
              data-customer-name-input="okini_talk"
              value="${escapeHtml(
                findName('okini_talk') === '未登録'
                  ? ''
                  : findName('okini_talk')
              )}"
              placeholder="オキニトーク名"
            >
          </label>

          <label>
            <span>LINE</span>
            <input
              type="text"
              data-customer-name-input="line"
              value="${escapeHtml(
                findName('line') === '未登録'
                  ? ''
                  : findName('line')
              )}"
              placeholder="LINE名"
            >
          </label>

          <label>
            <span>X</span>
            <input
              type="text"
              data-customer-name-input="x"
              value="${escapeHtml(
                findName('x') === '未登録'
                  ? ''
                  : findName('x')
              )}"
              placeholder="X名"
            >
          </label>

          <label>
            <span>Instagram</span>
            <input
              type="text"
              data-customer-name-input="instagram"
              value="${escapeHtml(
                findName('instagram') === '未登録'
                  ? ''
                  : findName('instagram')
              )}"
              placeholder="Instagram名"
            >
          </label>

          <div class="schedule-customer-actions">

            <button
              class="secondary-button"
              type="button"
              data-action="save-schedule-customer-names"
              data-customer-id="${escapeHtml(
                String(customerId)
              )}"
            >
              名義情報を保存
            </button>

          </div>

        </div>


        <div class="schedule-detail-card">

          <strong>
            初回流入元
          </strong>

          <label>
            <span>きっかけ</span>

            <select
              id="schedule-customer-acquisition-source"
            >
              <option value="unknown"
                ${!acquisitionSource || acquisitionSource.source_type === 'unknown' ? 'selected' : ''}>
                不明
              </option>

              <option value="heaven"
                ${acquisitionSource?.source_type === 'heaven' ? 'selected' : ''}>
                ヘブン
              </option>

              <option value="x"
                ${acquisitionSource?.source_type === 'x' ? 'selected' : ''}>
                X
              </option>

              <option value="instagram"
                ${acquisitionSource?.source_type === 'instagram' ? 'selected' : ''}>
                Instagram
              </option>

              <option value="okini_talk"
                ${acquisitionSource?.source_type === 'okini_talk' ? 'selected' : ''}>
                オキニトーク
              </option>

              <option value="store_site"
                ${acquisitionSource?.source_type === 'store_site' ? 'selected' : ''}>
                店舗サイト
              </option>

              <option value="referral"
                ${acquisitionSource?.source_type === 'referral' ? 'selected' : ''}>
                紹介
              </option>

              <option value="review"
                ${acquisitionSource?.source_type === 'review' ? 'selected' : ''}>
                口コミ
              </option>

              <option value="store_route"
                ${acquisitionSource?.source_type === 'store_route' ? 'selected' : ''}>
                店舗経由
              </option>

              <option value="other"
                ${acquisitionSource?.source_type === 'other' ? 'selected' : ''}>
                その他
              </option>
            </select>
          </label>

          <label>
            <span>補足</span>

            <input
              id="schedule-customer-acquisition-detail"
              type="text"
              value="${escapeHtml(
                String(
                  acquisitionSource?.source_detail
                  || ''
                )
              )}"
              placeholder="例：Xの投稿を見た、友人○○さんの紹介"
            >
          </label>

          <div class="schedule-customer-actions">

            <button
              class="secondary-button"
              type="button"
              data-action="save-schedule-customer-acquisition-source"
              data-customer-id="${escapeHtml(
                String(customerId)
              )}"
            >
              初回流入元を保存
            </button>

          </div>

        </div>


        <div class="schedule-detail-card">

          <strong>
            顧客メモ
          </strong>

          <textarea
            id="schedule-customer-general-notes"
            rows="4"
            maxlength="2000"
            placeholder="顧客全体に残したいメモ"
          >${escapeHtml(
            String(
              customer.general_notes
              || ''
            )
          )}</textarea>

          <div class="schedule-customer-actions">

            <button
              class="secondary-button"
              type="button"
              data-action="save-schedule-customer-general-notes"
              data-customer-id="${escapeHtml(
                String(customerId)
              )}"
            >
              顧客メモを保存
            </button>

          </div>

        </div>


        <div class="schedule-detail-card">

          <strong>
            顧客特徴
          </strong>

          <label>
            <span>年代</span>
            <input
              type="text"
              data-customer-feature-input="age_range"
              value="${escapeHtml(
                findIdentityFeature(
                  'age_range'
                )
              )}"
              placeholder="例：40代"
            >
          </label>

          <label>
            <span>身長</span>
            <input
              type="text"
              data-customer-feature-input="height"
              value="${escapeHtml(
                findIdentityFeature(
                  'height'
                )
              )}"
              placeholder="例：170cmくらい"
            >
          </label>

          <label>
            <span>体格</span>
            <input
              type="text"
              data-customer-feature-input="body_type"
              value="${escapeHtml(
                findIdentityFeature(
                  'body_type'
                )
              )}"
              placeholder="例：少し太め"
            >
          </label>

          <label>
            <span>髪</span>
            <input
              type="text"
              data-customer-feature-input="hair"
              value="${escapeHtml(
                findIdentityFeature(
                  'hair'
                )
              )}"
              placeholder="髪型・髪色など"
            >
          </label>

          <label>
            <span>ヒゲ</span>
            <input
              type="text"
              data-customer-feature-input="facial_hair"
              value="${escapeHtml(
                findIdentityFeature(
                  'facial_hair'
                )
              )}"
              placeholder="例：口ひげ"
            >
          </label>

          <label>
            <span>眼鏡</span>
            <input
              type="text"
              data-customer-feature-input="glasses"
              value="${escapeHtml(
                findIdentityFeature(
                  'glasses'
                )
              )}"
              placeholder="眼鏡の特徴"
            >
          </label>

          <label>
            <span>見た目</span>
            <input
              type="text"
              data-customer-feature-input="appearance"
              value="${escapeHtml(
                findIdentityFeature(
                  'appearance'
                )
              )}"
              placeholder="その他の見た目"
            >
          </label>

          <label>
            <span>似てる人</span>
            <input
              type="text"
              data-customer-feature-input="lookalike"
              value="${escapeHtml(
                findIdentityFeature(
                  'lookalike'
                )
              )}"
              placeholder="似ている人"
            >
          </label>

          <label>
            <span>職業</span>
            <input
              type="text"
              data-customer-feature-input="occupation"
              value="${escapeHtml(
                findIdentityFeature(
                  'occupation'
                )
              )}"
              placeholder="例：建築系"
            >
          </label>

          <label>
            <span>声・話し方</span>
            <input
              type="text"
              data-customer-feature-input="voice_speech"
              value="${escapeHtml(
                findIdentityFeature(
                  'voice_speech'
                )
              )}"
              placeholder="例：声低め"
            >
          </label>

          <label>
            <span>エリア</span>
            <input
              type="text"
              data-customer-feature-input="area"
              value="${escapeHtml(
                findIdentityFeature(
                  'area'
                )
              )}"
              placeholder="住んでいる・活動エリアなど"
            >
          </label>

          <label>
            <span>趣味・話題</span>
            <input
              type="text"
              data-customer-feature-input="hobby_topic"
              value="${escapeHtml(
                findIdentityFeature(
                  'hobby_topic'
                )
              )}"
              placeholder="趣味やよく話す話題"
            >
          </label>

          <label>
            <span>その他</span>
            <input
              type="text"
              data-customer-feature-input="other"
              value="${escapeHtml(
                findIdentityFeature(
                  'other'
                )
              )}"
              placeholder="その他の特徴"
            >
          </label>

          <div class="schedule-customer-actions">

            <button
              class="secondary-button"
              type="button"
              data-action="save-schedule-customer-identity-features"
              data-customer-id="${escapeHtml(
                String(customerId)
              )}"
            >
              顧客特徴を保存
            </button>

          </div>

        </div>


        <div class="schedule-detail-card">

          <strong>
            直近の来店履歴
          </strong>

          ${visitHistoryHtml}

        </div>
      `;


    } catch (error) {

      scheduleLinkedCustomerPanel.innerHTML = `
        <p>
          ${escapeHtml(
            error.message
          )}
        </p>
      `;
    }


    return;
  }


  scheduleLinkedCustomerPanel.hidden =
    true;

  scheduleLinkedCustomerPanel.innerHTML =
    '';


  if (scheduleCustomerName) {
    scheduleCustomerName.value =
      '';
  }


  if (scheduleCustomerFeatures) {
    scheduleCustomerFeatures.value =
      visit.customer_features
        ? String(
            visit.customer_features
          )
        : '';
  }


  scheduleCustomerPanel.hidden =
    false;


  loadScheduleIdentityFeatures();


  if (scheduleCustomerFeatures) {
    scheduleCustomerFeatures.focus();
  } else if (scheduleCustomerName) {
    scheduleCustomerName.focus();
  }
}


function closeScheduleCustomerPanel() {

  if (scheduleCustomerPanel) {
    scheduleCustomerPanel.hidden =
      true;
  }


  if (scheduleCustomerName) {
    scheduleCustomerName.value =
      '';
  }


  if (scheduleCustomerFeatures) {
    scheduleCustomerFeatures.value =
      '';
  }
}


async function saveScheduleCustomerFeatures() {

  const visit =
    scheduleState.selectedVisit;


  if (
    !visit
    || !scheduleCustomerFeatures
  ) {
    return;
  }


  const customerFeatures =
    scheduleCustomerFeatures.value.trim();


  const saveButton =
    document.querySelector(
      '[data-action="save-schedule-customer-features"]'
    );


  if (saveButton) {
    saveButton.disabled =
      true;

    saveButton.textContent =
      '保存中...';
  }


  try {

    const response =
      await fetch(
        scheduleApiUrl,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              id:
                Number(
                  visit.id
                ),

              customer_features:
                customerFeatures,
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
        || '特徴メモを保存できませんでした。'
      );
    }


    if (data.visit) {
      scheduleState.selectedVisit =
        data.visit;

      scheduleCustomerFeatures.value =
        data.visit.customer_features
          ? String(
              data.visit.customer_features
            )
          : '';
    }


    window.alert(
      '特徴メモを保存しました。'
    );


  } catch (error) {

    window.alert(
      error.message
    );


  } finally {

    if (saveButton) {
      saveButton.disabled =
        false;

      saveButton.textContent =
        '特徴メモを保存';
    }
  }
}


async function saveScheduleCustomerGeneralNotes(
  button
) {

  const customerId =
    Number(
      button?.dataset?.customerId
      || 0
    );


  const textarea =
    document.getElementById(
      'schedule-customer-general-notes'
    );


  if (
    !customerId
    || !textarea
  ) {
    return;
  }


  const generalNotes =
    textarea.value.trim();


  const originalText =
    button.textContent;


  button.disabled =
    true;

  button.textContent =
    '保存中...';


  try {

    const response =
      await fetch(
        customersApiUrl,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              id:
                customerId,

              general_notes:
                generalNotes,
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
        || '顧客メモを保存できませんでした。'
      );
    }


    window.alert(
      '顧客メモを保存しました。'
    );


  } catch (error) {

    window.alert(
      error.message
    );


  } finally {

    button.disabled =
      false;

    button.textContent =
      originalText;
  }
}


async function saveScheduleCustomerNames(
  button
) {

  const customerId =
    Number(
      button?.dataset?.customerId
      || 0
    );


  if (!customerId) {
    return;
  }


  const inputs =
    Array.from(
      scheduleLinkedCustomerPanel
        ?.querySelectorAll(
          '[data-customer-name-input]'
        )
      || []
    );


  if (!inputs.length) {
    return;
  }


  const originalText =
    button.textContent;


  button.disabled =
    true;

  button.textContent =
    '保存中...';


  try {

    for (const input of inputs) {

      const nameType =
        input.dataset.customerNameInput;

      const name =
        input.value.trim();


      const response =
        await fetch(
          customersApiUrl,
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                id:
                  customerId,

                name_type:
                  nameType,

                name:
                  name,
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
          || `${nameType} を保存できませんでした。`
        );
      }
    }


    window.alert(
      '名義情報を保存しました。'
    );


  } catch (error) {

    window.alert(
      error.message
    );


  } finally {

    button.disabled =
      false;

    button.textContent =
      originalText;
  }
}


async function saveScheduleCustomerAcquisitionSource(
  button
) {

  const customerId =
    Number(
      button?.dataset?.customerId
      || 0
    );


  const sourceSelect =
    document.getElementById(
      'schedule-customer-acquisition-source'
    );

  const detailInput =
    document.getElementById(
      'schedule-customer-acquisition-detail'
    );


  if (
    !customerId
    || !sourceSelect
  ) {
    return;
  }


  const sourceType =
    sourceSelect.value;

  const sourceDetail =
    detailInput
      ? detailInput.value.trim()
      : '';


  const originalText =
    button.textContent;


  button.disabled =
    true;

  button.textContent =
    '保存中...';


  try {

    const response =
      await fetch(
        customersApiUrl,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              id:
                customerId,

              acquisition_source_type:
                sourceType,

              acquisition_source_detail:
                sourceDetail,
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
        || '初回流入元を保存できませんでした。'
      );
    }


    window.alert(
      '初回流入元を保存しました。'
    );


  } catch (error) {

    window.alert(
      error.message
    );


  } finally {

    button.disabled =
      false;

    button.textContent =
      originalText;
  }
}


async function saveScheduleCustomerIdentityFeatures(
  button
) {

  const customerId =
    Number(
      button?.dataset?.customerId
      || 0
    );


  if (!customerId) {
    return;
  }


  const inputs =
    Array.from(
      scheduleLinkedCustomerPanel
        ?.querySelectorAll(
          '[data-customer-feature-input]'
        )
      || []
    );


  if (!inputs.length) {
    return;
  }


  const originalText =
    button.textContent;


  button.disabled =
    true;

  button.textContent =
    '保存中...';


  try {

    for (const input of inputs) {

      const featureType =
        input.dataset.customerFeatureInput;

      const featureValue =
        input.value.trim();


      const response =
        await fetch(
          customersApiUrl,
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                id:
                  customerId,

                feature_type:
                  featureType,

                feature_value:
                  featureValue,

                feature_note:
                  '',
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
          || `${featureType} を保存できませんでした。`
        );
      }
    }


    window.alert(
      '顧客特徴を保存しました。'
    );


  } catch (error) {

    window.alert(
      error.message
    );


  } finally {

    button.disabled =
      false;

    button.textContent =
      originalText;
  }
}


async function linkScheduleExistingCustomer(
  button
) {

  const visit =
    scheduleState.selectedVisit;

  const customerId =
    Number(
      button?.dataset?.customerId
    );


  if (
    !visit
    || !customerId
    || Boolean(
      Number(
        visit.customer_linked
      )
    )
  ) {
    return;
  }


  const confirmed =
    window.confirm(
      `customer #${customerId} に現在の予約を紐付けますか？`
    );


  if (!confirmed) {
    return;
  }


  const originalText =
    button
      ? button.textContent
      : '';


  if (button) {

    button.disabled =
      true;

    button.textContent =
      '紐付け中...';
  }


  try {

    const response =
      await fetch(
        scheduleApiUrl,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              id:
                Number(
                  visit.id
                ),

              customer_id:
                customerId,
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
        || '既存顧客への紐付けに失敗しました。'
      );
    }


    closeScheduleCustomerPanel();
    closeScheduleDetail();


    await loadSchedule(
      true
    );


  } catch (error) {

    window.alert(
      error.message
    );


  } finally {

    if (button) {

      button.disabled =
        false;

      button.textContent =
        originalText;
    }
  }
}


async function createScheduleCustomer() {

  const visit =
    scheduleState.selectedVisit;


  if (
    !visit
    || Boolean(
      Number(
        visit.customer_linked
      )
    )
  ) {
    return;
  }


  const name =
    scheduleCustomerName
      ? scheduleCustomerName.value.trim()
      : '';


  if (!name) {

    window.alert(
      '顧客名を入力してください。'
    );


    if (scheduleCustomerName) {
      scheduleCustomerName.focus();
    }

    return;
  }


  const createButton =
    document.querySelector(
      '[data-action="create-schedule-customer"]'
    );


  if (createButton) {

    createButton.disabled =
      true;

    createButton.textContent =
      '紐付け中...';
  }


  try {

    const response =
      await fetch(
        '/api/v1/customers.php',
        {
          method: 'POST',

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

              name:
                name,
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
        || '顧客の紐付けに失敗しました。'
      );
    }


    closeScheduleCustomerPanel();
    closeScheduleDetail();


    await loadSchedule(
      true
    );


  } catch (error) {

    window.alert(
      error.message
    );


  } finally {

    if (createButton) {

      createButton.disabled =
        false;

      createButton.textContent =
        '新規顧客として紐付け';
    }
  }
}


function openCustomerCancelPanel() {

  const visit =
    scheduleState.selectedVisit;

  if (
    !visit
    || !scheduleCustomerCancelPanel
    || !Boolean(
      Number(
        visit.customer_linked
      )
    )
  ) {
    return;
  }


  if (scheduleCustomerCancelReason) {
    scheduleCustomerCancelReason.value =
      '';
  }


  scheduleCustomerCancelPanel.hidden =
    false;


  if (scheduleCustomerCancelReason) {
    scheduleCustomerCancelReason.focus();
  }
}


function closeCustomerCancelPanel() {

  if (scheduleCustomerCancelPanel) {
    scheduleCustomerCancelPanel.hidden =
      true;
  }


  if (scheduleCustomerCancelReason) {
    scheduleCustomerCancelReason.value =
      '';
  }
}


async function saveCustomerCancellation() {

  const visit =
    scheduleState.selectedVisit;


  if (
    !visit
    || !Boolean(
      Number(
        visit.customer_linked
      )
    )
  ) {
    window.alert(
      '顧客情報が紐付いている予約だけキャンセルできます。'
    );

    return;
  }


  const reason =
    scheduleCustomerCancelReason
      ? scheduleCustomerCancelReason.value.trim()
      : '';


  if (!reason) {

    window.alert(
      'キャンセル理由を入力してください。'
    );


    if (scheduleCustomerCancelReason) {
      scheduleCustomerCancelReason.focus();
    }

    return;
  }


  const saveButton =
    document.querySelector(
      '[data-action="save-customer-cancel"]'
    );


  if (saveButton) {

    saveButton.disabled =
      true;

    saveButton.textContent =
      '保存中...';
  }


  try {

    const response =
      await fetch(
        scheduleApiUrl,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              id:
                Number(
                  visit.id
                ),

              status:
                'cancelled',

              cancelled_by:
                'customer',

              cancel_reason:
                reason,
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
        || 'キャンセルの保存に失敗しました。'
      );
    }


    closeScheduleDetail();


    await loadSchedule(
      true
    );


  } catch (error) {

    window.alert(
      error.message
    );


  } finally {

    if (saveButton) {

      saveButton.disabled =
        false;

      saveButton.textContent =
        'キャンセルとして保存';
    }
  }
}


function closeScheduleDetail() {

  if (scheduleDetailDrawer) {

    scheduleDetailDrawer.classList.remove(
      'is-open'
    );

    scheduleDetailDrawer.setAttribute(
      'aria-hidden',
      'true'
    );
  }


  if (scheduleDrawerBackdrop) {
    scheduleDrawerBackdrop.hidden =
      true;
  }


  if (scheduleHistoryPanel) {

    scheduleHistoryPanel.hidden =
      true;

    scheduleHistoryPanel.innerHTML =
      '';
  }


  closeCustomerCancelPanel();
}


async function openCurrentScheduleHistory() {

  const visit =
    scheduleState.selectedVisit;

  if (
    !visit
    || !scheduleHistoryPanel
  ) {
    return;
  }


  if (!scheduleHistoryPanel.hidden) {

    scheduleHistoryPanel.hidden =
      true;

    scheduleHistoryPanel.innerHTML =
      '';

    return;
  }


  try {

    const response =
      await fetch(
        `${scheduleApiUrl}?visit_id=${encodeURIComponent(
          String(visit.id)
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
        || '予約変更履歴を取得できませんでした。'
      );
    }


    const history =
      Array.isArray(data.history)
        ? data.history
        : [];


    const historyHtml =
      history.length
        ? history
            .map((item) => {

              const typeLabels = {
                datetime: '日時変更',
                course: '予約時間変更',
                store: '店舗変更',
                option: 'OP変更',
                status: '区分変更',
                multiple: '複数項目変更',
                other: 'その他変更',
              };


              const typeLabel =
                typeLabels[item.change_type]
                || '予約変更';


              const before =
                item.before_data
                || {};

              const after =
                item.after_data
                || {};


              const changes = [];


              if (
                before.started_at
                !== after.started_at
              ) {

                const beforeStartedAt =
                  String(
                    before.started_at
                    || ''
                  );

                const afterStartedAt =
                  String(
                    after.started_at
                    || ''
                  );


                const beforeDate =
                  beforeStartedAt.slice(
                    0,
                    10
                  );

                const afterDate =
                  afterStartedAt.slice(
                    0,
                    10
                  );


                const formatShortDateTime =
                  (value) => {

                    if (!value) {
                      return '未設定';
                    }

                    const month =
                      Number(
                        value.slice(
                          5,
                          7
                        )
                      );

                    const day =
                      Number(
                        value.slice(
                          8,
                          10
                        )
                      );

                    const time =
                      value.slice(
                        11,
                        16
                      );

                    return `${month}/${day} ${time}`;
                  };


                changes.push({
                  label: '日時',

                  before:
                    formatShortDateTime(
                      beforeStartedAt
                    ),

                  after:
                    beforeDate === afterDate
                      ? afterStartedAt.slice(
                          11,
                          16
                        )
                      : formatShortDateTime(
                          afterStartedAt
                        ),
                });
              }


              if (
                before.course_minutes
                !== after.course_minutes
              ) {

                changes.push({
                  label: '予約時間',
                  before:
                    before.course_minutes
                      ? `${before.course_minutes}分`
                      : '未設定',
                  after:
                    after.course_minutes
                      ? `${after.course_minutes}分`
                      : '未設定',
                });
              }


              if (
                before.store_id
                !== after.store_id
              ) {

                changes.push({
                  label: '店舗',
                  before:
                    before.store_id
                    ?? '未設定',
                  after:
                    after.store_id
                    ?? '未設定',
                });
              }


              const beforeOptions =
                Array.isArray(before.options)
                  ? before.options
                  : [];

              const afterOptions =
                Array.isArray(after.options)
                  ? after.options
                  : [];


              if (
                JSON.stringify(beforeOptions)
                !== JSON.stringify(afterOptions)
              ) {

                changes.push({
                  label: 'OP',
                  before:
                    beforeOptions.length
                      ? beforeOptions.join('・')
                      : 'なし',
                  after:
                    afterOptions.length
                      ? afterOptions.join('・')
                      : 'なし',
                });
              }


              if (
                before.customer_status
                !== after.customer_status
              ) {

                changes.push({
                  label: '区分',
                  before:
                    before.customer_status
                    || '未設定',
                  after:
                    after.customer_status
                    || '未設定',
                });
              }


              const changesHtml =
                changes
                  .map((change) => `
                    <div class="schedule-history-change">
                      <span class="schedule-history-change-label">
                        ${escapeHtml(change.label)}
                      </span>

                      <span class="schedule-history-change-values">
                        ${escapeHtml(
                          String(change.before)
                        )}
                        →
                        ${escapeHtml(
                          String(change.after)
                        )}
                      </span>
                    </div>
                  `)
                  .join('');


              return `
                <div class="schedule-history-item">
                  <strong>
                    ${escapeHtml(typeLabel)}
                  </strong>

                  ${changesHtml}

                  <span>
                    受付：
                    ${escapeHtml(
                      String(
                        item.requested_at
                        || ''
                      )
                    )}
                  </span>
                </div>
              `;
            })
            .join('')
        : `
            <p class="schedule-history-empty">
              変更履歴はありません
            </p>
          `;


    scheduleHistoryPanel.innerHTML = `
      <div class="schedule-history-list">
        <h3>予約変更履歴</h3>
        ${historyHtml}
      </div>
    `;

    scheduleHistoryPanel.hidden =
      false;


  } catch (error) {

    window.alert(
      error.message
    );
  }
}


function editCurrentScheduleVisit() {

  const visit =
    scheduleState.selectedVisit;

  if (!visit) return;


  closeScheduleDetail();

  resetScheduleForm();


  const date =
    String(
      visit.started_at
    ).slice(0, 10);

  const time =
    String(
      visit.started_at
    ).slice(11, 16);


  const bookedAt =
    visit.booked_at
      ? String(
          visit.booked_at
        )
      : '';


  const bookedDate =
    bookedAt
      ? bookedAt.slice(0, 10)
      : '';


  const bookedTime =
    bookedAt
      ? bookedAt.slice(11, 16)
      : '';


  if (scheduleBookedDate) {
    scheduleBookedDate.value =
      bookedDate;
  }


  if (scheduleBookedTime) {
    scheduleBookedTime.value =
      bookedTime;
  }


  if (scheduleEditId) {
    scheduleEditId.value =
      String(visit.id);
  }


  if (scheduleFormTitle) {
    scheduleFormTitle.textContent =
      '予約を編集';
  }


  if (scheduleFormDate) {
    scheduleFormDate.value =
      date;
  }


  if (scheduleStartTime) {
    scheduleStartTime.value =
      time;
  }


  if (scheduleStore) {
    scheduleStore.value =
      String(visit.store_id);
  }


  selectedScheduleCourse =
    Number(
      visit.course_minutes
    );


  selectedScheduleCourseMaster =
    visit.store_course_id
      ? {
          store_course_id:
            Number(
              visit.store_course_id
            ),
        }
      : null;


  selectedSchedulePricingCategory =
    String(
      visit.pricing_category
      || 'standard'
    );


  selectedScheduleExtensions =
    Array.isArray(
      visit.extensions
    )
      ? visit.extensions
          .map((extension) => ({
            store_course_id:
              Number(
                extension.store_course_id
              ),

            quantity:
              Number(
                extension.quantity
                || 1
              ),
          }))
          .filter(
            (extension) =>
              extension.store_course_id > 0
              && extension.quantity > 0
          )
      : [];


  const standardCourse =
    document.querySelector(
      `[data-course="${selectedScheduleCourse}"]`
    );


  document
    .querySelectorAll('[data-course]')
    .forEach((button) => {

      button.classList.toggle(
        'is-selected',
        button === standardCourse
      );
    });


  if (
    !standardCourse
    && scheduleCustomCourse
  ) {
    scheduleCustomCourse.value =
      String(
        selectedScheduleCourse
      );
  }


  selectedCustomerStatus =
    visit.customer_status;


  document
    .querySelectorAll(
      '[data-customer-status]'
    )
    .forEach((button) => {

      button.classList.toggle(
        'is-selected',
        button.dataset.customerStatus
        === selectedCustomerStatus
      );
    });


  const visitOptions =
    Array.isArray(visit.options)
      ? visit.options
      : [];


  const standardOptionNames =
    visitOptions
      .map((option) =>
        option.name
          ? String(option.name)
          : ''
      )
      .filter(Boolean);


  document
    .querySelectorAll(
      '[data-schedule-option]'
    )
    .forEach((input) => {

      input.checked =
        standardOptionNames.includes(
          String(input.value)
        );
    });


  if (scheduleCustomOption) {

    const customNames =
      visitOptions
        .map((option) =>
          option.custom_name
            ? String(option.custom_name)
            : ''
        )
        .filter(Boolean);

    scheduleCustomOption.value =
      customNames.join('、');
  }


  if (scheduleSaveButton) {
    scheduleSaveButton.textContent =
      '変更を保存';
  }


  scheduleFormCard.hidden = false;

  loadScheduleSalesMaster()
    .then(() => {

      document
        .querySelectorAll(
          '[data-schedule-option]'
        )
        .forEach((input) => {

          input.checked =
            standardOptionNames.includes(
              String(input.value)
            );
        });
    });
}


async function deleteCurrentScheduleVisit() {

  const visit =
    scheduleState.selectedVisit;

  if (!visit) return;


  const confirmed =
    window.confirm(
      'この予約をDBから削除する？\n関連する日記・売上・OPの紐付けも削除されます。'
    );


  if (!confirmed) {
    return;
  }


  try {

    const response =
      await fetch(
        scheduleApiUrl,
        {
          method: 'DELETE',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              id:
                Number(
                  visit.id
                ),
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
        || '予約を削除できませんでした。'
      );
    }


    closeScheduleDetail();

    scheduleState.selectedVisit =
      null;

    await loadSchedule();


  } catch (error) {

    window.alert(
      error.message
    );
  }
}


/* ========================================
   HELPERS
======================================== */

function scheduleCustomerStatusLabel(
  status
) {

  const labels = {
    new: '新規',
    repeat: 'リピ',
    other_store_repeat:
      '他店リピ',
    repeat_unknown_id:
      'リピ・ID不明',
  };

  return labels[status]
    || '未設定';
}


function scheduleStoreClass(
  storeName
) {

  const classes = {
    札幌: 'store-sapporo',
    千葉: 'store-chiba',
    東京: 'store-tokyo',
    名古屋: 'store-nagoya',
  };

  return classes[storeName]
    || 'store-sapporo';
}


function scheduleCourseClass(
  minutes
) {

  if (minutes <= 45) {
    return 'course-40';
  }

  if (minutes <= 65) {
    return 'course-60';
  }

  if (minutes <= 85) {
    return 'course-80';
  }

  if (minutes <= 95) {
    return 'course-90';
  }

  if (minutes <= 105) {
    return 'course-100';
  }

  if (minutes <= 127) {
    return 'course-120';
  }

  if (minutes <= 165) {
    return 'course-150';
  }

  if (minutes <= 180) {
    return 'course-180';
  }

  return 'course-over-180';
}


function scheduleFormatDate(
  date
) {

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      date.getDate()
    ).padStart(2, '0');


  return `${year}-${month}-${day}`;
}


function scheduleParseDate(
  value
) {

  return new Date(
    `${value}T00:00:00`
  );
}


function getScheduleHourHeight() {

  const page =
    document.querySelector(
      '.schedule-page'
    );

  if (!page) {
    return 96;
  }


  const value =
    getComputedStyle(page)
      .getPropertyValue(
        '--schedule-hour-height'
      )
      .trim();


  return Number(
    value.replace('px', '')
  ) || 96;
}


function scrollScheduleNearFirstVisit(
  period,
  hourHeight
) {

  const shell =
    document.querySelector(
      '.schedule-calendar-shell'
    );

  if (!shell) return;


  const visibleVisits =
    scheduleState.visits
      .filter((visit) => {

        const date =
          String(
            visit.started_at
          ).slice(0, 10);

        return period.dates.includes(
          date
        );
      });


  let targetHour = 12;


  if (visibleVisits.length > 0) {

    const firstTime =
      String(
        visibleVisits[0].started_at
      ).slice(11, 16);

    const hour =
      Number(
        firstTime.slice(0, 2)
      );

    targetHour =
      Math.max(
        scheduleStartHour,
        hour - 1
      );
  }


  shell.scrollTop =
    Math.max(
      0,
      (
        targetHour
        - scheduleStartHour
      ) * hourHeight
    );
}


function showScheduleMessage(
  message,
  isError = false
) {

  if (!scheduleFormMessage) {
    return;
  }


  scheduleFormMessage.hidden =
    false;

  scheduleFormMessage.textContent =
    message;

  scheduleFormMessage.classList.toggle(
    'is-error',
    isError
  );
}


function hideScheduleMessage() {

  if (!scheduleFormMessage) {
    return;
  }


  scheduleFormMessage.hidden =
    true;

  scheduleFormMessage.textContent =
    '';

  scheduleFormMessage.classList.remove(
    'is-error'
  );
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

// WRITER:WORK_SCHEDULE_LOGIC:END


// WRITER:WORK_SHIFT_LOGIC:START

/* ========================================
   WORK SHIFT
======================================== */

const shiftMasterApiUrl =
  '/api/v1/shift-master.php';

const shiftsApiUrl =
  '/api/v1/shifts.php';


const shiftWeekCalendar =
  document.getElementById(
    'shift-week-calendar'
  );

const shiftWeekTitle =
  document.getElementById(
    'shift-week-title'
  );

const shiftSelectionCount =
  document.getElementById(
    'shift-selection-count'
  );

const shiftStoreSelect =
  document.getElementById(
    'shift-store-select'
  );

const shiftSelectedDays =
  document.getElementById(
    'shift-selected-days'
  );

const shiftDeleteButton =
  document.getElementById(
    'shift-delete-button'
  );

const shiftConfirmButton =
  document.getElementById(
    'shift-confirm-button'
  );


const shiftState = {
  workerCode: 'shii',

  weekStart:
    getShiftWeekStart(
      new Date()
    ),

  workers: [],
  stores: [],
  defaultRules: [],
  days: [],
  shifts: [],

  editingShiftId:
    null,

  selectedDates:
    new Set(),

  selectedStoreId: '',
};


/* ========================================
   LOAD
======================================== */

async function loadShift() {

  if (!shiftWeekCalendar) {
    return;
  }


  shiftWeekCalendar.innerHTML =
    '<p class="shift-loading">シフト情報を読み込み中…</p>';


  const weekEnd =
    new Date(
      shiftState.weekStart
    );

  weekEnd.setDate(
    weekEnd.getDate() + 6
  );


  const dateFrom =
    formatShiftDate(
      shiftState.weekStart
    );

  const dateTo =
    formatShiftDate(
      weekEnd
    );


  try {

    const params =
      new URLSearchParams({
        date_from:
          dateFrom,

        date_to:
          dateTo,
      });


    const response =
      await fetch(
        `${shiftMasterApiUrl}?${params.toString()}`
      );


    const data =
      await response.json();


    if (
      !response.ok
      || !data.success
    ) {
      throw new Error(
        data.error
        || 'シフト情報を取得できませんでした。'
      );
    }


    shiftState.workers =
      Array.isArray(data.workers)
        ? data.workers
        : [];


    shiftState.stores =
      Array.isArray(data.stores)
        ? data.stores
        : [];


    shiftState.defaultRules =
      Array.isArray(
        data.default_rules
      )
        ? data.default_rules
        : [];


    shiftState.days =
      Array.isArray(data.days)
        ? data.days
        : [];


    const selectedWorker =
      shiftState.workers
        .find(
          (worker) =>
            worker.worker_code
            === shiftState.workerCode
        )
      || null;


    if (selectedWorker) {

      const shiftParams =
        new URLSearchParams({
          worker_id:
            String(
              selectedWorker.id
            ),

          date_from:
            dateFrom,

          date_to:
            dateTo,
        });


      const shiftResponse =
        await fetch(
          `${shiftsApiUrl}?${shiftParams.toString()}`
        );


      const shiftData =
        await shiftResponse.json();


      if (
        !shiftResponse.ok
        || !shiftData.success
      ) {
        throw new Error(
          shiftData.error
          || '保存済みシフトを取得できませんでした。'
        );
      }


      shiftState.shifts =
        Array.isArray(
          shiftData.shifts
        )
          ? shiftData.shifts
          : [];

    } else {

      shiftState.shifts = [];
    }


    renderShiftStoreOptions();
    renderShiftWeek();
    renderShiftSelectedDays();


  } catch (error) {

    shiftWeekCalendar.innerHTML = `
      <p class="shift-loading">
        ${escapeHtml(
          error.message
        )}
      </p>
    `;
  }
}


/* ========================================
   WEEK
======================================== */

function getShiftWeekStart(
  sourceDate
) {

  const date =
    new Date(
      sourceDate
    );


  date.setHours(
    12,
    0,
    0,
    0
  );


  const weekday =
    date.getDay();


  const mondayOffset =
    weekday === 0
      ? -6
      : 1 - weekday;


  date.setDate(
    date.getDate()
    + mondayOffset
  );


  return date;
}


function moveShiftWeek(
  amount
) {

  const next =
    new Date(
      shiftState.weekStart
    );


  next.setDate(
    next.getDate()
    + (amount * 7)
  );


  shiftState.weekStart =
    next;


  shiftState.selectedDates.clear();


  loadShift();
}


function resetShiftWeekToToday() {

  shiftState.weekStart =
    getShiftWeekStart(
      new Date()
    );


  shiftState.selectedDates.clear();


  loadShift();
}


/* ========================================
   WEEK RENDER
======================================== */

function renderShiftWeek() {

  if (
    !shiftWeekCalendar
    || !shiftWeekTitle
  ) {
    return;
  }


  const weekEnd =
    new Date(
      shiftState.weekStart
    );


  weekEnd.setDate(
    weekEnd.getDate() + 6
  );


  shiftWeekTitle.textContent =
    `${formatShiftMonthDay(
      shiftState.weekStart
    )} 〜 ${formatShiftMonthDay(
      weekEnd
    )}`;


  const weekdayLabels = [
    '日',
    '月',
    '火',
    '水',
    '木',
    '金',
    '土',
  ];


  shiftWeekCalendar.innerHTML =
    shiftState.days
      .map((day) => {

        const date =
          parseShiftDate(
            day.date
          );


        const isSelected =
          shiftState.selectedDates
            .has(
              day.date
            );


        const holidayName =
          day.holiday_name
            ? String(
                day.holiday_name
              )
            : '';


        const isHoliday =
          holidayName !== '';


        const weekday =
          weekdayLabels[
            date.getDay()
          ];


        const dayTypeLabel =
          day.day_type
          === 'holiday_eve'
            ? '休日前'
            : '平日前';


        const savedShift =
          shiftState.shifts
            .find(
              (shift) =>
                shift.shift_date
                === day.date
            )
          || null;


        const todayText =
          formatShiftDate(
            new Date()
          );


        const isFuture =
          day.date > todayText;


        const savedLabel =
          savedShift
            ? (
                savedShift.status
                === 'off'
                  ? '休み'
                  : `${
                      savedShift.status
                      === 'confirmed'
                        ? '確定 '
                        : ''
                    }${savedShift.store_name || ''} ${
                      formatSavedShiftTime(
                        savedShift
                      )
                    }`
              )
            : (
                isFuture
                  ? 'シフト未確定'
                  : ''
              );


        return `
          <button
            class="
              shift-day-button
              ${
                isSelected
                  ? 'is-selected'
                  : ''
              }
              ${
                day.is_weekend
                  ? 'is-weekend'
                  : ''
              }
              ${
                isHoliday
                  ? 'is-holiday'
                  : ''
              }
              ${
                savedShift
                  ? 'is-saved'
                  : ''
              }
            "
            type="button"
            data-shift-date="${escapeHtml(
              day.date
            )}"
            ${
              savedShift
                ? 'data-shift-saved="1"'
                : ''
            }
          >

            <span class="shift-day-weekday">
              ${escapeHtml(
                weekday
              )}
            </span>

            <strong class="shift-day-date">
              ${escapeHtml(
                `${date.getMonth() + 1}/${date.getDate()}`
              )}
            </strong>

            ${
              isHoliday
                ? `
                  <span class="shift-day-holiday">
                    ${escapeHtml(
                      holidayName
                    )}
                  </span>
                `
                : ''
            }

            <span class="shift-day-type">
              ${escapeHtml(
                dayTypeLabel
              )}
            </span>

            ${
              savedLabel
                ? `
                  <span class="shift-day-status">
                    ${escapeHtml(
                      savedLabel
                    )}
                  </span>
                `
                : ''
            }

          </button>
        `;
      })
      .join('');


  updateShiftSelectionCount();
}


/* ========================================
   WORKER
======================================== */

function selectShiftWorker(
  workerCode
) {

  const worker =
    shiftState.workers
      .find(
        (item) =>
          item.worker_code
          === workerCode
      );


  if (!worker) {
    return;
  }


  shiftState.workerCode =
    workerCode;


  document
    .querySelectorAll(
      '[data-shift-worker]'
    )
    .forEach((button) => {

      button.classList.toggle(
        'is-selected',
        button.dataset.shiftWorker
        === workerCode
      );
    });


  shiftState.selectedDates.clear();

  loadShift();
}


/* ========================================
   SAVED SHIFT EDIT
======================================== */

function openSavedShiftEditor(
  date
) {

  const savedShift =
    shiftState.shifts
      .find(
        (shift) =>
          shift.shift_date
          === date
      )
    || null;


  if (!savedShift) {

    showShiftSavePreview(
      '保存済みシフトを取得できませんでした。',
      true
    );

    return;
  }


  shiftState.editingShiftId =
    Number(
      savedShift.id
    );


  if (shiftDeleteButton) {
    shiftDeleteButton.hidden =
      false;
  }


  if (shiftConfirmButton) {

    const canConfirm =
      savedShift.status
      !== 'off';


    shiftConfirmButton.hidden =
      !canConfirm;


    if (canConfirm) {

      shiftConfirmButton.textContent =
        savedShift.status
        === 'confirmed'
          ? '仮シフトに戻す'
          : 'このシフトを確定';
    }
  }


  shiftState.selectedDates.clear();

  shiftState.selectedDates.add(
    date
  );


  shiftState.selectedStoreId =
    savedShift.store_id
      ? String(
          savedShift.store_id
        )
      : '';


  if (shiftStoreSelect) {

    shiftStoreSelect.value =
      shiftState.selectedStoreId;
  }


  renderShiftWeek();
  renderShiftSelectedDays();


  const row =
    document.querySelector(
      `[data-shift-row="${CSS.escape(
        date
      )}"]`
    );


  if (!row) {
    return;
  }


  const offButton =
    row.querySelector(
      '[data-shift-off]'
    );


  const startInput =
    row.querySelector(
      '[data-shift-start]'
    );


  const endInput =
    row.querySelector(
      '[data-shift-end]'
    );


  if (
    savedShift.status
    === 'off'
  ) {

    offButton
      ?.classList
      .add(
        'is-selected'
      );


    if (startInput) {
      startInput.disabled =
        true;
    }


    if (endInput) {
      endInput.disabled =
        true;
    }

  } else {

    if (startInput) {

      startInput.value =
        String(
          savedShift.start_at
          || ''
        ).slice(
          11,
          16
        );
    }


    if (endInput) {

      endInput.value =
        getSavedShiftEndTime(
          savedShift
        );
    }
  }


  showShiftSavePreview(
    `${formatShiftDisplayDate(
      date
    )} の保存済みシフトを編集中です。`
  );
}


/* ========================================
   DATE SELECTION
======================================== */

function toggleShiftDate(
  date
) {

  shiftState.editingShiftId =
    null;


  if (shiftDeleteButton) {
    shiftDeleteButton.hidden =
      true;
  }


  if (shiftConfirmButton) {
    shiftConfirmButton.hidden =
      true;
  }


  if (
    shiftState.selectedDates
      .has(date)
  ) {

    shiftState.selectedDates
      .delete(date);

  } else {

    shiftState.selectedDates
      .add(date);
  }


  renderShiftWeek();
  renderShiftSelectedDays();
}


function updateShiftSelectionCount() {

  if (!shiftSelectionCount) {
    return;
  }


  shiftSelectionCount.textContent =
    `${shiftState.selectedDates.size}日選択`;
}


/* ========================================
   STORES
======================================== */

function renderShiftStoreOptions() {

  if (!shiftStoreSelect) {
    return;
  }


  const previousValue =
    shiftState.selectedStoreId;


  shiftStoreSelect.innerHTML =
    `
      <option value="">
        店舗を選択
      </option>
    `
    +
    shiftState.stores
      .map((store) => `
        <option
          value="${escapeHtml(
            store.id
          )}"
        >
          ${escapeHtml(
            store.name
          )}
        </option>
      `)
      .join('');


  if (
    previousValue
    &&
    shiftState.stores.some(
      (store) =>
        String(store.id)
        === String(previousValue)
    )
  ) {

    shiftStoreSelect.value =
      String(
        previousValue
      );

    return;
  }


  if (
    !shiftState.editingShiftId
  ) {

    const sapporoStore =
      shiftState.stores
        .find(
          (store) =>
            store.name
            === '札幌'
        )
      || null;


    if (sapporoStore) {

      shiftState.selectedStoreId =
        String(
          sapporoStore.id
        );

      shiftStoreSelect.value =
        String(
          sapporoStore.id
        );
    }
  }
}


/* ========================================
   DEFAULT RULE
======================================== */

function getSelectedShiftWorker() {

  return shiftState.workers
    .find(
      (worker) =>
        worker.worker_code
        === shiftState.workerCode
    )
    || null;
}


function getShiftDefaultRule(
  dayType
) {

  const worker =
    getSelectedShiftWorker();


  if (!worker) {
    return null;
  }


  return shiftState.defaultRules
    .find(
      (rule) =>
        Number(
          rule.worker_id
        )
        === Number(
          worker.id
        )
        &&
        rule.day_type
        === dayType
    )
    || null;
}


/* ========================================
   SELECTED DAY LIST
======================================== */

function renderShiftSelectedDays() {

  if (!shiftSelectedDays) {
    return;
  }


  const selected =
    shiftState.days
      .filter(
        (day) =>
          shiftState.selectedDates
            .has(
              day.date
            )
      );


  if (selected.length === 0) {

    shiftSelectedDays.innerHTML =
      `
        <p class="shift-empty-message">
          日付を選択してください。
        </p>
      `;

    return;
  }


  shiftSelectedDays.innerHTML =
    selected
      .map((day) => {

        const rule =
          getShiftDefaultRule(
            day.day_type
          );


        const dayTypeLabel =
          day.day_type
          === 'holiday_eve'
            ? '休日前'
            : '平日前';


        const holidayName =
          day.holiday_name
            ? `・${day.holiday_name}`
            : '';


        return `
          <div
            class="shift-day-row"
            data-shift-row="${escapeHtml(
              day.date
            )}"
          >

            <div class="shift-day-row-date">

              <strong>
                ${escapeHtml(
                  formatShiftDisplayDate(
                    day.date
                  )
                )}
              </strong>

              <small>
                ${escapeHtml(
                  holidayName
                )}
              </small>

            </div>


            <span class="shift-day-row-type">
              ${escapeHtml(
                dayTypeLabel
              )}
            </span>


            <input
              type="text"
              inputmode="numeric"
              value="${escapeHtml(
                rule?.start_time
                || ''
              )}"
              placeholder="開始"
              data-shift-start
            >


            <input
              type="text"
              inputmode="numeric"
              value="${escapeHtml(
                rule?.end_time
                || ''
              )}"
              placeholder="終了"
              data-shift-end
            >


            <button
              class="shift-day-off-button"
              type="button"
              data-shift-off="${escapeHtml(
                day.date
              )}"
            >
              休み
            </button>

          </div>
        `;
      })
      .join('');
}


/* ========================================
   OFF
======================================== */

function toggleShiftDayOff(
  date
) {

  const row =
    document.querySelector(
      `[data-shift-row="${CSS.escape(
        date
      )}"]`
    );


  if (!row) {
    return;
  }


  const button =
    row.querySelector(
      '[data-shift-off]'
    );


  const inputs =
    row.querySelectorAll(
      'input'
    );


  const isOff =
    button.classList.toggle(
      'is-selected'
    );


  inputs.forEach(
    (input) => {
      input.disabled =
        isOff;
    }
  );
}


/* ========================================
   EVENTS
======================================== */

document.addEventListener(
  'click',
  (event) => {

    const workerButton =
      event.target.closest(
        '[data-shift-worker]'
      );


    if (workerButton) {

      selectShiftWorker(
        workerButton
          .dataset
          .shiftWorker
      );

      return;
    }


    const dateButton =
      event.target.closest(
        '[data-shift-date]'
      );


    if (dateButton) {

      if (
        dateButton
          .dataset
          .shiftSaved
        === '1'
      ) {

        openSavedShiftEditor(
          dateButton
            .dataset
            .shiftDate
        );

        return;
      }


      toggleShiftDate(
        dateButton
          .dataset
          .shiftDate
      );

      return;
    }


    const weekMoveButton =
      event.target.closest(
        '[data-shift-week-move]'
      );


    if (weekMoveButton) {

      moveShiftWeek(
        Number(
          weekMoveButton
            .dataset
            .shiftWeekMove
        )
      );

      return;
    }


    const todayButton =
      event.target.closest(
        '[data-shift-week-today]'
      );


    if (todayButton) {

      resetShiftWeekToToday();

      return;
    }


    const offButton =
      event.target.closest(
        '[data-shift-off]'
      );


    if (offButton) {

      toggleShiftDayOff(
        offButton
          .dataset
          .shiftOff
      );
    }
  }
);


shiftStoreSelect
  ?.addEventListener(
    'change',
    () => {

      shiftState.selectedStoreId =
        shiftStoreSelect.value;
    }
  );


/* ========================================
   WEEK CONFIRM
======================================== */

async function confirmCurrentShiftWeek() {

  const weekStart =
    new Date(
      shiftState.weekStart
    );


  const weekEnd =
    new Date(
      shiftState.weekStart
    );


  weekEnd.setDate(
    weekEnd.getDate() + 6
  );


  const weekStartText =
    formatShiftDate(
      weekStart
    );

  const weekEndText =
    formatShiftDate(
      weekEnd
    );


  const draftShifts =
    shiftState.shifts
      .filter(
        (shift) =>
          shift.status
          === 'draft'
          &&
          shift.shift_date
          >= weekStartText
          &&
          shift.shift_date
          <= weekEndText
      );


  if (
    draftShifts.length
    === 0
  ) {

    showShiftSavePreview(
      'この週に確定する仮シフトはありません。'
    );

    return;
  }


  const confirmed =
    window.confirm(
      `この週の仮シフト${draftShifts.length}件をまとめて確定しますか？`
    );


  if (!confirmed) {
    return;
  }


  showShiftSavePreview(
    `${draftShifts.length}件のシフトを確定しています...`
  );


  try {

    for (
      const shift
      of draftShifts
    ) {

      const response =
        await fetch(
          shiftsApiUrl,
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                id:
                  Number(
                    shift.id
                  ),

                status:
                  'confirmed',
              }),
          }
        );


      const data =
        await response.json();


      if (
        !response.ok
        ||
        !data.success
      ) {

        throw new Error(
          data.error
          || `${shift.shift_date} のシフトを確定できませんでした。`
        );
      }
    }


    shiftState.editingShiftId =
      null;

    shiftState.selectedDates.clear();


    if (shiftDeleteButton) {
      shiftDeleteButton.hidden =
        true;
    }


    if (shiftConfirmButton) {
      shiftConfirmButton.hidden =
        true;
    }


    await loadShift();


    showShiftSavePreview(
      `${draftShifts.length}件のシフトをまとめて確定しました。`
    );


  } catch (error) {

    showShiftSavePreview(
      error instanceof Error
        ? error.message
        : '週のシフトをまとめて確定できませんでした。',
      true
    );
  }
}


/* ========================================
   WEEK CONFIRM
======================================== */

async function confirmCurrentShiftWeek() {

  const weekStart =
    new Date(
      shiftState.weekStart
    );


  const weekEnd =
    new Date(
      shiftState.weekStart
    );


  weekEnd.setDate(
    weekEnd.getDate() + 6
  );


  const weekStartText =
    formatShiftDate(
      weekStart
    );

  const weekEndText =
    formatShiftDate(
      weekEnd
    );


  const draftShifts =
    shiftState.shifts
      .filter(
        (shift) =>
          shift.status
          === 'draft'
          &&
          shift.shift_date
          >= weekStartText
          &&
          shift.shift_date
          <= weekEndText
      );


  if (
    draftShifts.length
    === 0
  ) {

    showShiftSavePreview(
      'この週に確定する仮シフトはありません。'
    );

    return;
  }


  const confirmed =
    window.confirm(
      `この週の仮シフト${draftShifts.length}件をまとめて確定しますか？`
    );


  if (!confirmed) {
    return;
  }


  showShiftSavePreview(
    `${draftShifts.length}件のシフトを確定しています...`
  );


  try {

    for (
      const shift
      of draftShifts
    ) {

      const response =
        await fetch(
          shiftsApiUrl,
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                id:
                  Number(
                    shift.id
                  ),

                status:
                  'confirmed',
              }),
          }
        );


      const data =
        await response.json();


      if (
        !response.ok
        ||
        !data.success
      ) {

        throw new Error(
          data.error
          || `${shift.shift_date} のシフトを確定できませんでした。`
        );
      }
    }


    shiftState.editingShiftId =
      null;

    shiftState.selectedDates.clear();


    if (shiftDeleteButton) {
      shiftDeleteButton.hidden =
        true;
    }


    if (shiftConfirmButton) {
      shiftConfirmButton.hidden =
        true;
    }


    await loadShift();


    showShiftSavePreview(
      `${draftShifts.length}件のシフトをまとめて確定しました。`
    );


  } catch (error) {

    showShiftSavePreview(
      error instanceof Error
        ? error.message
        : '週のシフトをまとめて確定できませんでした。',
      true
    );
  }
}


/* ========================================
   CONFIRM
======================================== */

async function toggleEditingShiftConfirmation() {

  const shiftId =
    Number(
      shiftState.editingShiftId
    );


  if (!shiftId) {

    showShiftSavePreview(
      '対象のシフトが選択されていません。',
      true
    );

    return;
  }


  const savedShift =
    shiftState.shifts
      .find(
        (shift) =>
          Number(
            shift.id
          )
          === shiftId
      )
    || null;


  if (!savedShift) {

    showShiftSavePreview(
      '対象のシフトを確認できませんでした。',
      true
    );

    return;
  }


  if (
    savedShift.status
    === 'off'
  ) {

    showShiftSavePreview(
      '休みは確定切替の対象外です。',
      true
    );

    return;
  }


  const nextStatus =
    savedShift.status
    === 'confirmed'
      ? 'draft'
      : 'confirmed';


  const actionLabel =
    nextStatus
    === 'confirmed'
      ? '確定'
      : '仮シフトへ変更';


  const confirmed =
    window.confirm(
      `${formatShiftDisplayDate(
        savedShift.shift_date
      )} のシフトを${actionLabel}しますか？`
    );


  if (!confirmed) {
    return;
  }


  if (shiftConfirmButton) {

    shiftConfirmButton.disabled =
      true;

    shiftConfirmButton.textContent =
      '更新中…';
  }


  try {

    const response =
      await fetch(
        shiftsApiUrl,
        {
          method:
            'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              id:
                shiftId,

              status:
                nextStatus,
            }),
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
      ||
      !data.success
    ) {

      throw new Error(
        data.error
        || 'シフト状態を更新できませんでした。'
      );
    }


    shiftState.editingShiftId =
      null;

    shiftState.selectedDates.clear();


    if (shiftDeleteButton) {
      shiftDeleteButton.hidden =
        true;
    }


    if (shiftConfirmButton) {
      shiftConfirmButton.hidden =
        true;
    }


    await loadShift();


    showShiftSavePreview(
      nextStatus
      === 'confirmed'
        ? 'シフトを確定しました。'
        : '仮シフトに戻しました。'
    );


  } catch (error) {

    showShiftSavePreview(
      error instanceof Error
        ? error.message
        : 'シフト状態を更新できませんでした。',
      true
    );


  } finally {

    if (shiftConfirmButton) {
      shiftConfirmButton.disabled =
        false;
    }
  }
}


/* ========================================
   DELETE
======================================== */

async function deleteEditingShift() {

  const shiftId =
    Number(
      shiftState.editingShiftId
    );


  if (!shiftId) {

    showShiftSavePreview(
      '削除するシフトが選択されていません。',
      true
    );

    return;
  }


  const savedShift =
    shiftState.shifts
      .find(
        (shift) =>
          Number(
            shift.id
          )
          === shiftId
      )
    || null;


  if (!savedShift) {

    showShiftSavePreview(
      '削除対象のシフトを確認できませんでした。',
      true
    );

    return;
  }


  const confirmed =
    window.confirm(
      `${formatShiftDisplayDate(
        savedShift.shift_date
      )} のシフトを削除しますか？`
    );


  if (!confirmed) {
    return;
  }


  if (shiftDeleteButton) {

    shiftDeleteButton.disabled =
      true;

    shiftDeleteButton.textContent =
      '削除中…';
  }


  try {

    const response =
      await fetch(
        shiftsApiUrl,
        {
          method:
            'DELETE',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              id:
                shiftId,
            }),
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
      ||
      !data.success
    ) {
      throw new Error(
        data.error
        || 'シフトを削除できませんでした。'
      );
    }


    shiftState.editingShiftId =
      null;

    shiftState.selectedDates.clear();

    shiftState.selectedStoreId =
      '';


    if (shiftDeleteButton) {
      shiftDeleteButton.hidden =
        true;
    }


    await loadShift();


    showShiftSavePreview(
      'シフトを削除しました。'
    );


  } catch (error) {

    showShiftSavePreview(
      error instanceof Error
        ? error.message
        : 'シフトを削除できませんでした。',
      true
    );


  } finally {

    if (shiftDeleteButton) {

      shiftDeleteButton.disabled =
        false;

      shiftDeleteButton.textContent =
        'このシフトを削除';
    }
  }
}


/* ========================================
   SAVE PREVIEW
======================================== */

async function saveShiftBatch() {

  const worker =
    getSelectedShiftWorker();


  if (!worker) {

    showShiftSavePreview(
      'worker情報を取得できません。',
      true
    );

    return;
  }


  const selected =
    shiftState.days
      .filter(
        (day) =>
          shiftState.selectedDates
            .has(
              day.date
            )
      );


  if (selected.length === 0) {

    showShiftSavePreview(
      '保存する日付を選択してください。',
      true
    );

    return;
  }


  const rows = [];


  for (const day of selected) {

    const row =
      document.querySelector(
        `[data-shift-row="${CSS.escape(
          day.date
        )}"]`
      );


    if (!row) {

      showShiftSavePreview(
        `${day.date} の入力欄を確認できません。`,
        true
      );

      return;
    }


    const offButton =
      row.querySelector(
        '[data-shift-off]'
      );


    const isOff =
      Boolean(
        offButton
          ?.classList
          .contains(
            'is-selected'
          )
      );


    const startInput =
      row.querySelector(
        '[data-shift-start]'
      );


    const endInput =
      row.querySelector(
        '[data-shift-end]'
      );


    const startTime =
      startInput
        ?.value
        ?.trim()
      || '';


    const endTime =
      endInput
        ?.value
        ?.trim()
      || '';


    if (
      !isOff
      &&
      shiftState.selectedStoreId === ''
    ) {

      showShiftSavePreview(
        '出勤日の店舗を選択してください。',
        true
      );

      return;
    }


    if (
      !isOff
      &&
      (
        !isShiftTimeValueValid(
          startTime
        )
        ||
        !isShiftTimeValueValid(
          endTime
        )
      )
    ) {

      showShiftSavePreview(
        `${formatShiftDisplayDate(
          day.date
        )} の勤務時間を確認してください。`,
        true
      );

      return;
    }


    if (
      !isOff
      &&
      shiftTimeToMinutes(
        endTime
      )
      <=
      shiftTimeToMinutes(
        startTime
      )
    ) {

      showShiftSavePreview(
        `${formatShiftDisplayDate(
          day.date
        )} の終了時刻は開始時刻より後にしてください。`,
        true
      );

      return;
    }


    rows.push({
      shift_date:
        day.date,

      status:
        isOff
          ? 'off'
          : 'draft',

      store_id:
        isOff
          ? null
          : Number(
              shiftState.selectedStoreId
            ),

      start_time:
        isOff
          ? null
          : startTime,

      end_time:
        isOff
          ? null
          : endTime,

      note:
        null,
    });
  }


  const saveButton =
    document.querySelector(
      '[data-action="preview-shift-save"]'
    );


  const originalText =
    saveButton
      ? saveButton.textContent
      : '選択したシフトを保存';


  if (saveButton) {

    saveButton.disabled =
      true;

    saveButton.textContent =
      '保存中…';
  }


  try {

    const isEditing =
      Boolean(
        shiftState.editingShiftId
      );


    if (
      isEditing
      &&
      rows.length !== 1
    ) {
      throw new Error(
        '編集時は1件のシフトだけ選択してください。'
      );
    }


    const requestBody =
      isEditing
        ? {
            id:
              Number(
                shiftState.editingShiftId
              ),

            store_id:
              rows[0].store_id,

            shift_date:
              rows[0].shift_date,

            start_time:
              rows[0].start_time,

            end_time:
              rows[0].end_time,

            status:
              rows[0].status,

            note:
              rows[0].note,
          }
        : {
            action:
              'create_batch',

            worker_id:
              Number(
                worker.id
              ),

            rows,
          };


    const response =
      await fetch(
        shiftsApiUrl,
        {
          method:
            isEditing
              ? 'PATCH'
              : 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify(
              requestBody
            ),
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
        || 'シフトの保存に失敗しました。'
      );
    }


    const wasEditing =
      Boolean(
        shiftState.editingShiftId
      );


    shiftState.editingShiftId =
      null;


    if (shiftDeleteButton) {
      shiftDeleteButton.hidden =
        true;
    }


    shiftState.selectedDates.clear();


    await loadShift();


    showShiftSavePreview(
      wasEditing
        ? 'シフトを更新しました。'
        : `${data.created_count || rows.length}件のシフトを保存しました。`
    );


  } catch (error) {

    showShiftSavePreview(
      error.message,
      true
    );


  } finally {

    if (saveButton) {

      saveButton.disabled =
        false;

      saveButton.textContent =
        originalText;
    }
  }
}


function previewShiftSave() {

  const preview =
    document.getElementById(
      'shift-save-preview'
    );


  if (!preview) {
    return;
  }


  const worker =
    getSelectedShiftWorker();


  if (!worker) {

    showShiftSavePreview(
      'worker情報を取得できません。',
      true
    );

    return;
  }


  const selected =
    shiftState.days
      .filter(
        (day) =>
          shiftState.selectedDates
            .has(
              day.date
            )
      );


  if (selected.length === 0) {

    showShiftSavePreview(
      '保存する日付を選択してください。',
      true
    );

    return;
  }


  const rows = [];


  for (const day of selected) {

    const row =
      document.querySelector(
        `[data-shift-row="${CSS.escape(
          day.date
        )}"]`
      );


    if (!row) {

      showShiftSavePreview(
        `${day.date} の入力欄を確認できません。`,
        true
      );

      return;
    }


    const offButton =
      row.querySelector(
        '[data-shift-off]'
      );


    const isOff =
      Boolean(
        offButton
          ?.classList
          .contains(
            'is-selected'
          )
      );


    const startInput =
      row.querySelector(
        '[data-shift-start]'
      );


    const endInput =
      row.querySelector(
        '[data-shift-end]'
      );


    const startTime =
      startInput
        ?.value
        ?.trim()
      || '';


    const endTime =
      endInput
        ?.value
        ?.trim()
      || '';


    if (
      !isOff
      &&
      shiftState.selectedStoreId === ''
    ) {

      showShiftSavePreview(
        '出勤日の店舗を選択してください。',
        true
      );

      return;
    }


    if (
      !isOff
      &&
      (
        !isShiftTimeValueValid(
          startTime
        )
        ||
        !isShiftTimeValueValid(
          endTime
        )
      )
    ) {

      showShiftSavePreview(
        `${formatShiftDisplayDate(
          day.date
        )} の勤務時間を確認してください。`,
        true
      );

      return;
    }


    if (
      !isOff
      &&
      shiftTimeToMinutes(
        endTime
      )
      <=
      shiftTimeToMinutes(
        startTime
      )
    ) {

      showShiftSavePreview(
        `${formatShiftDisplayDate(
          day.date
        )} の終了時刻は開始時刻より後にしてください。`,
        true
      );

      return;
    }


    const store =
      shiftState.stores
        .find(
          (item) =>
            String(
              item.id
            )
            ===
            String(
              shiftState.selectedStoreId
            )
        )
      || null;


    rows.push({
      worker_id:
        Number(
          worker.id
        ),

      worker_name:
        worker.display_name,

      shift_date:
        day.date,

      day_type:
        day.day_type,

      holiday_name:
        day.holiday_name
        || null,

      status:
        isOff
          ? 'off'
          : 'draft',

      store_id:
        isOff
          ? null
          : Number(
              shiftState.selectedStoreId
            ),

      store_name:
        isOff
          ? null
          : (
              store?.name
              || ''
            ),

      start_time:
        isOff
          ? null
          : startTime,

      end_time:
        isOff
          ? null
          : endTime,
    });
  }


  renderShiftSavePreview(
    rows
  );
}


function renderShiftSavePreview(
  rows
) {

  const preview =
    document.getElementById(
      'shift-save-preview'
    );


  if (!preview) {
    return;
  }


  preview.hidden =
    false;


  preview.innerHTML = `
    <strong>
      保存予定 ${rows.length}件
    </strong>

    <div class="shift-preview-list">

      ${
        rows
          .map((row) => {

            const dayTypeLabel =
              row.day_type
              === 'holiday_eve'
                ? '休日前'
                : '平日前';


            const detail =
              row.status
              === 'off'
                ? '休み'
                : `${
                    row.store_name
                  } ${
                    row.start_time
                  }〜${
                    row.end_time
                  }`;


            return `
              <div class="shift-preview-row">

                <span>
                  ${escapeHtml(
                    formatShiftDisplayDate(
                      row.shift_date
                    )
                  )}
                </span>

                <span>
                  ${escapeHtml(
                    dayTypeLabel
                  )}
                </span>

                <strong>
                  ${escapeHtml(
                    detail
                  )}
                </strong>

              </div>
            `;
          })
          .join('')
      }

    </div>

    <small>
      ※ まだDBには保存されていません。
    </small>
  `;


  console.log(
    'Shift save preview',
    rows
  );
}


function showShiftSavePreview(
  message,
  isError = false
) {

  const preview =
    document.getElementById(
      'shift-save-preview'
    );


  if (!preview) {
    return;
  }


  preview.hidden =
    false;


  preview.classList.toggle(
    'is-error',
    isError
  );


  preview.textContent =
    message;
}


/* ========================================
   PREVIOUS WEEK PREVIEW
======================================== */

async function previewPreviousShiftWeek() {

  const worker =
    getSelectedShiftWorker();


  if (!worker) {

    showShiftSavePreview(
      '担当者を取得できませんでした。',
      true
    );

    return;
  }


  const targetWeekStart =
    formatShiftDate(
      shiftState.weekStart
    );


  const targetWeekEnd =
    new Date(
      shiftState.weekStart
    );


  targetWeekEnd.setDate(
    targetWeekEnd.getDate() + 6
  );


  const targetWeekLabel =
    `${formatShiftMonthDay(
      shiftState.weekStart
    )}〜${formatShiftMonthDay(
      targetWeekEnd
    )}`;


  const confirmed =
    window.confirm(
      `${worker.display_name} の前週シフトを ${targetWeekLabel} にコピーしますか？`
    );


  if (!confirmed) {
    return;
  }


  showShiftSavePreview(
    '前週シフトをコピーしています...'
  );


  try {

    const response =
      await fetch(
        shiftsApiUrl,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              action:
                'copy_previous_week',

              worker_id:
                Number(
                  worker.id
                ),

              target_week_start:
                targetWeekStart,
            }),
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
      ||
      !data.success
    ) {

      const errorMessage =
        data.error
        || '前週シフトをコピーできませんでした。';


      if (
        errorMessage
        === 'No shifts found in previous week.'
      ) {

        throw new Error(
          '前週にはコピーできるシフトがありません。'
        );
      }


      if (
        errorMessage
        === 'Target week already has shifts.'
      ) {

        throw new Error(
          'この週にはすでにシフトがあります。前週コピーは中止しました。'
        );
      }


      throw new Error(
        errorMessage
      );
    }


    await loadShift();


    showShiftSavePreview(
      `${data.created_count || 0}件の前週シフトをコピーしました。`
    );


  } catch (error) {

    console.error(
      error
    );


    showShiftSavePreview(
      error instanceof Error
        ? error.message
        : '前週シフトをコピーできませんでした。',
      true
    );
  }
}


/* ========================================
   TIME VALIDATION
======================================== */

function isShiftTimeValueValid(
  value
) {

  const match =
    /^(\d{1,2}):([0-5]\d)$/
      .exec(
        value
      );


  if (!match) {
    return false;
  }


  const hour =
    Number(
      match[1]
    );


  return (
    hour >= 0
    &&
    hour <= 47
  );
}


function shiftTimeToMinutes(
  value
) {

  const [
    hour,
    minute,
  ] =
    value
      .split(':')
      .map(Number);


  return (
    hour * 60
    +
    minute
  );
}


/* ========================================
   DATE HELPERS
======================================== */

function getSavedShiftEndTime(
  shift
) {

  if (
    !shift.start_at
    || !shift.end_at
  ) {
    return '';
  }


  const startDate =
    String(
      shift.start_at
    ).slice(
      0,
      10
    );


  const endDate =
    String(
      shift.end_at
    ).slice(
      0,
      10
    );


  let endHour =
    Number(
      String(
        shift.end_at
      ).slice(
        11,
        13
      )
    );


  const endMinute =
    String(
      shift.end_at
    ).slice(
      14,
      16
    );


  if (
    endDate > startDate
  ) {
    endHour += 24;
  }


  return `${String(
    endHour
  ).padStart(
    2,
    '0'
  )}:${endMinute}`;
}


function formatSavedShiftTime(
  shift
) {

  if (
    !shift.start_at
    || !shift.end_at
  ) {
    return '';
  }


  const startDate =
    String(
      shift.start_at
    ).slice(
      0,
      10
    );


  const endDate =
    String(
      shift.end_at
    ).slice(
      0,
      10
    );


  const startTime =
    String(
      shift.start_at
    ).slice(
      11,
      16
    );


  let endHour =
    Number(
      String(
        shift.end_at
      ).slice(
        11,
        13
      )
    );


  const endMinute =
    String(
      shift.end_at
    ).slice(
      14,
      16
    );


  if (
    endDate > startDate
  ) {
    endHour += 24;
  }


  const endTime =
    `${String(
      endHour
    ).padStart(
      2,
      '0'
    )}:${endMinute}`;


  return `${startTime}〜${endTime}`;
}


function parseShiftDate(
  value
) {

  return new Date(
    `${value}T12:00:00`
  );
}


function formatShiftDate(
  date
) {

  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );


  return `${year}-${month}-${day}`;
}


function formatShiftMonthDay(
  date
) {

  return `${
    date.getMonth() + 1
  }/${date.getDate()}`;
}


function formatShiftDisplayDate(
  value
) {

  const date =
    parseShiftDate(
      value
    );


  const labels = [
    '日',
    '月',
    '火',
    '水',
    '木',
    '金',
    '土',
  ];


  return `${
    date.getMonth() + 1
  }/${date.getDate()}（${
    labels[
      date.getDay()
    ]
  }）`;
}

// WRITER:WORK_SHIFT_LOGIC:END


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

function startHeavenDiary() {

  const visit =
    diaryState.sourceVisit;


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
}


function renderHeavenDiaryBody(
  visit
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


  const opening =
    optionText
      ? `さっき${courseMinutes}分${optionText}希望の${repeatText}お兄さん♡`
      : `さっき${courseMinutes}分の${repeatText}お兄さん♡`;


  bodyElement.value =
    `${opening}\n\n\n\n❄︎こはく❄︎`;
}


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

/* ========================================
   SCHEDULE DRAG MOVE
   desktop foundation
======================================== */

let scheduleDragState = null;


document.addEventListener(
  'dragstart',
  (event) => {

    const card =
      event.target.closest(
        '[data-schedule-event]'
      );

    if (!card) return;


    const visitId =
      Number(
        card.dataset.scheduleEvent
      );

    const visit =
      scheduleState.visits.find(
        (item) =>
          Number(item.id) === visitId
      );

    if (!visit) return;


    const cardRect =
      card.getBoundingClientRect();


    scheduleDragState = {
      visitId,

      originalStartedAt:
        String(
          visit.started_at || ''
        ),

      grabOffsetY:
        Math.max(
          0,
          event.clientY
          - cardRect.top
        ),
    };


    card.classList.add(
      'is-dragging'
    );


    if (event.dataTransfer) {

      event.dataTransfer.effectAllowed =
        'move';

      event.dataTransfer.setData(
        'text/plain',
        String(visitId)
      );
    }
  }
);


document.addEventListener(
  'dragend',
  (event) => {

    const card =
      event.target.closest(
        '[data-schedule-event]'
      );

    if (card) {
      card.classList.remove(
        'is-dragging'
      );
    }


    document
      .querySelectorAll(
        '.schedule-day-column.is-drag-over'
      )
      .forEach((column) => {

        column.classList.remove(
          'is-drag-over'
        );
      });


    clearScheduleDragPreview();

    scheduleDragState = null;
  }
);


document.addEventListener(
  'dragover',
  (event) => {

    const column =
      event.target.closest(
        '[data-schedule-day]'
      );

    if (
      !column
      || !scheduleDragState
    ) {
      return;
    }


    event.preventDefault();


    if (event.dataTransfer) {
      event.dataTransfer.dropEffect =
        'move';
    }


    document
      .querySelectorAll(
        '.schedule-day-column.is-drag-over'
      )
      .forEach((item) => {

        if (item !== column) {
          item.classList.remove(
            'is-drag-over'
          );
        }
      });


    column.classList.add(
      'is-drag-over'
    );


    const cardTopClientY =
      event.clientY
      - Number(
          scheduleDragState
            .grabOffsetY
          || 0
        );


    showScheduleDragPreview(
      column,
      cardTopClientY
    );
  }
);


function getScheduleDropTarget(
  column,
  clientY
) {

  if (!column) {
    return null;
  }


  const date =
    column.dataset.scheduleDay;

  if (!date) {
    return null;
  }


  const rect =
    column.getBoundingClientRect();


  const relativeY =
    Math.max(
      0,
      Math.min(
        rect.height,
        clientY - rect.top
      )
    );


  const totalMinutes =
    (
      scheduleEndHour
      - scheduleStartHour
    ) * 60;


  const rawMinutes =
    relativeY
    / rect.height
    * totalMinutes;


  const snappedMinutes =
    Math.round(
      rawMinutes / 10
    ) * 10;


  const absoluteMinutes =
    Math.max(
      scheduleStartHour * 60,
      Math.min(
        scheduleEndHour * 60 - 10,
        scheduleStartHour * 60
        + snappedMinutes
      )
    );


  const hour =
    Math.floor(
      absoluteMinutes / 60
    );

  const minute =
    absoluteMinutes % 60;


  const time =
    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;


  return {
    date,
    time,
    startedAt:
      `${date} ${time}`,
  };
}

/* ========================================
   SCHEDULE DRAG DROP SAVE
======================================== */

document.addEventListener(
  'drop',
  async (event) => {

    const column =
      event.target.closest(
        '[data-schedule-day]'
      );

    if (
      !column
      || !scheduleDragState
    ) {
      return;
    }


    event.preventDefault();


    const cardTopClientY =
      event.clientY
      - Number(
          scheduleDragState
            .grabOffsetY
          || 0
        );


    const dropTarget =
      getScheduleDropTarget(
        column,
        cardTopClientY
      );

    if (!dropTarget) {
      return;
    }


    const visitId =
      Number(
        scheduleDragState.visitId
      );

    const originalStartedAt =
      String(
        scheduleDragState
          .originalStartedAt
        || ''
      );


    if (
      dropTarget.startedAt
      === originalStartedAt
    ) {
      return;
    }


    const calendarShell =
      document.querySelector(
        '.schedule-calendar-shell'
      );

    const previousScrollLeft =
      calendarShell
        ? calendarShell.scrollLeft
        : 0;

    const previousScrollTop =
      calendarShell
        ? calendarShell.scrollTop
        : 0;


    column.classList.remove(
      'is-drag-over'
    );


    try {

      const response =
        await fetch(
          scheduleApiUrl,
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                id: visitId,

                started_at:
                  dropTarget.startedAt,
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
          || '予約時間を変更できませんでした。'
        );
      }


      await loadSchedule(
        true
      );


      if (calendarShell) {

        calendarShell.scrollLeft =
          previousScrollLeft;

        calendarShell.scrollTop =
          previousScrollTop;
      }


    } catch (error) {

      window.alert(
        `予約を移動できなかったよ。\n\n${error.message}`
      );
    }
  }
);

/* ========================================
   SCHEDULE DRAG PREVIEW
======================================== */

let scheduleDragPreview = null;


function clearScheduleDragPreview() {

  if (scheduleDragPreview) {
    scheduleDragPreview.remove();
    scheduleDragPreview = null;
  }
}


function showScheduleDragPreview(
  column,
  clientY
) {

  clearScheduleDragPreview();


  const dropTarget =
    getScheduleDropTarget(
      column,
      clientY
    );

  if (!dropTarget) {
    return;
  }


  const rect =
    column.getBoundingClientRect();


  const totalMinutes =
    (
      scheduleEndHour
      - scheduleStartHour
    ) * 60;


  const [hour, minute] =
    dropTarget.time
      .split(':')
      .map(Number);


  const minuteFromStart =
    (
      hour * 60
      + minute
    )
    - scheduleStartHour * 60;


  const top =
    minuteFromStart
    / totalMinutes
    * rect.height;


  const marker =
    document.createElement(
      'div'
    );

  marker.className =
    'schedule-drag-preview';

  marker.style.top =
    `${top}px`;

  marker.innerHTML = `
    <span>
      ${dropTarget.time}
    </span>
  `;


  column.appendChild(
    marker
  );

  scheduleDragPreview =
    marker;
}

/* ========================================
   SCHEDULE TOUCH DRAG
   mobile foundation
======================================== */

let scheduleTouchDrag = null;

let scheduleTouchHoldTimer = null;


function clearScheduleTouchHoldTimer() {

  if (scheduleTouchHoldTimer) {
    window.clearTimeout(
      scheduleTouchHoldTimer
    );

    scheduleTouchHoldTimer = null;
  }
}


function resetScheduleTouchDrag() {

  clearScheduleTouchHoldTimer();

  clearScheduleDragPreview();


  if (
    scheduleTouchDrag
    && scheduleTouchDrag.card
  ) {

    scheduleTouchDrag.card.classList.remove(
      'is-touch-dragging'
    );
  }


  document
    .querySelectorAll(
      '.schedule-day-column.is-drag-over'
    )
    .forEach((column) => {

      column.classList.remove(
        'is-drag-over'
      );
    });


  scheduleTouchDrag = null;
}


document.addEventListener(
  'pointerdown',
  (event) => {

    if (
      event.pointerType !== 'touch'
    ) {
      return;
    }


    const card =
      event.target.closest(
        '[data-schedule-event]'
      );

    if (!card) {
      return;
    }


    const visitId =
      Number(
        card.dataset.scheduleEvent
      );


    const visit =
      scheduleState.visits.find(
        (item) =>
          Number(item.id) === visitId
      );


    if (!visit) {
      return;
    }


    const rect =
      card.getBoundingClientRect();


    scheduleTouchDrag = {
      card,
      visitId,

      originalStartedAt:
        String(
          visit.started_at || ''
        ),

      startX:
        event.clientX,

      startY:
        event.clientY,

      currentX:
        event.clientX,

      currentY:
        event.clientY,

      grabOffsetY:
        Math.max(
          0,
          event.clientY
          - rect.top
        ),

      active:
        false,
    };


    clearScheduleTouchHoldTimer();


    scheduleTouchHoldTimer =
      window.setTimeout(
        () => {

          if (!scheduleTouchDrag) {
            return;
          }


          scheduleTouchDrag.active =
            true;


          card.classList.add(
            'is-touch-dragging'
          );


          if (
            navigator.vibrate
          ) {
            navigator.vibrate(20);
          }

        },
        350
      );
  }
);


document.addEventListener(
  'pointermove',
  (event) => {

    if (
      event.pointerType !== 'touch'
      || !scheduleTouchDrag
    ) {
      return;
    }


    scheduleTouchDrag.currentX =
      event.clientX;

    scheduleTouchDrag.currentY =
      event.clientY;


    if (
      !scheduleTouchDrag.active
    ) {

      const movedX =
        Math.abs(
          event.clientX
          - scheduleTouchDrag.startX
        );

      const movedY =
        Math.abs(
          event.clientY
          - scheduleTouchDrag.startY
        );


      if (
        movedX > 8
        || movedY > 8
      ) {

        resetScheduleTouchDrag();
      }

      return;
    }


    event.preventDefault();


    const element =
      document.elementFromPoint(
        event.clientX,
        event.clientY
      );


    const column =
      element?.closest(
        '[data-schedule-day]'
      );


    if (!column) {
      clearScheduleDragPreview();
      return;
    }


    document
      .querySelectorAll(
        '.schedule-day-column.is-drag-over'
      )
      .forEach((item) => {

        if (item !== column) {

          item.classList.remove(
            'is-drag-over'
          );
        }
      });


    column.classList.add(
      'is-drag-over'
    );


    const cardTopClientY =
      event.clientY
      - Number(
          scheduleTouchDrag
            .grabOffsetY
          || 0
        );


    showScheduleDragPreview(
      column,
      cardTopClientY
    );
  },
  {
    passive: false,
  }
);


document.addEventListener(
  'pointercancel',
  (event) => {

    if (
      event.pointerType !== 'touch'
    ) {
      return;
    }

    resetScheduleTouchDrag();
  }
);

/* ========================================
   SCHEDULE TOUCH DROP SAVE
======================================== */

document.addEventListener(
  'pointerup',
  async (event) => {

    if (
      event.pointerType !== 'touch'
      || !scheduleTouchDrag
    ) {
      return;
    }


    const touchState =
      scheduleTouchDrag;


    clearScheduleTouchHoldTimer();


    if (
      !touchState.active
    ) {

      resetScheduleTouchDrag();

      return;
    }


    event.preventDefault();


    const element =
      document.elementFromPoint(
        event.clientX,
        event.clientY
      );


    const column =
      element?.closest(
        '[data-schedule-day]'
      );


    if (!column) {

      resetScheduleTouchDrag();

      return;
    }


    const cardTopClientY =
      event.clientY
      - Number(
          touchState.grabOffsetY
          || 0
        );


    const dropTarget =
      getScheduleDropTarget(
        column,
        cardTopClientY
      );


    if (!dropTarget) {

      resetScheduleTouchDrag();

      return;
    }


    const visitId =
      Number(
        touchState.visitId
      );


    const originalStartedAt =
      String(
        touchState.originalStartedAt
        || ''
      );


    if (
      dropTarget.startedAt
      === originalStartedAt
    ) {

      resetScheduleTouchDrag();

      return;
    }


    const calendarShell =
      document.querySelector(
        '.schedule-calendar-shell'
      );


    const previousScrollLeft =
      calendarShell
        ? calendarShell.scrollLeft
        : 0;


    const previousScrollTop =
      calendarShell
        ? calendarShell.scrollTop
        : 0;


    resetScheduleTouchDrag();


    try {

      const response =
        await fetch(
          scheduleApiUrl,
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                id:
                  visitId,

                started_at:
                  dropTarget.startedAt,
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
          || '予約時間を変更できませんでした。'
        );
      }


      await loadSchedule(
        true
      );


      if (calendarShell) {

        calendarShell.scrollLeft =
          previousScrollLeft;

        calendarShell.scrollTop =
          previousScrollTop;
      }


    } catch (error) {

      window.alert(
        `予約を移動できなかったよ。\n\n${error.message}`
      );
    }
  },
  {
    passive: false,
  }
);

/* ========================================
   SCHEDULE INITIAL POSITION
   today + current time centered
======================================== */

function scrollScheduleToNow(
  period,
  hourHeight
) {

  const shell =
    document.querySelector(
      '.schedule-calendar-shell'
    );

  if (!shell) {
    return;
  }


  const now =
    new Date();


  let targetDate =
    scheduleFormatDate(
      now
    );


  let targetMinutes =
    now.getHours() * 60
    + now.getMinutes();


  /*
   * 0:00〜2:59 は
   * 前日の24:00〜26:59として扱う
   */
  if (
    now.getHours() < 3
  ) {

    const previousDate =
      new Date(now);

    previousDate.setDate(
      previousDate.getDate() - 1
    );

    targetDate =
      scheduleFormatDate(
        previousDate
      );

    targetMinutes +=
      24 * 60;
  }


  const targetColumn =
    document.querySelector(
      `[data-schedule-day="${targetDate}"]`
    );


  if (targetColumn) {

    const columnCenter =
      targetColumn.offsetLeft
      + targetColumn.offsetWidth / 2;


    const targetLeft =
      columnCenter
      - shell.clientWidth / 2;


    const maxLeft =
      Math.max(
        0,
        shell.scrollWidth
        - shell.clientWidth
      );


    shell.scrollLeft =
      Math.min(
        maxLeft,
        Math.max(
          0,
          targetLeft
        )
      );
  }


  const calendarStartMinutes =
    scheduleStartHour * 60;


  const calendarEndMinutes =
    scheduleEndHour * 60;


  const clampedMinutes =
    Math.min(
      calendarEndMinutes,
      Math.max(
        calendarStartMinutes,
        targetMinutes
      )
    );


  const currentTop =
    (
      clampedMinutes
      - calendarStartMinutes
    )
    * hourHeight / 60;


  const targetTop =
    currentTop
    - shell.clientHeight / 2;


  const maxTop =
    Math.max(
      0,
      shell.scrollHeight
      - shell.clientHeight
    );


  shell.scrollTop =
    Math.min(
      maxTop,
      Math.max(
        0,
        targetTop
      )
    );
}

function openScheduleDiary() {

  const visit =
    scheduleState.selectedVisit;


  if (!visit) {
    return;
  }


  diaryState.sourceVisitId =
    Number(
      visit.id
    );


  diaryState.sourceCustomerId =
    visit.customer_id
      ? Number(
          visit.customer_id
        )
      : null;


  diaryState.sourceVisit =
    visit;


  closeScheduleDetail();


  startHeavenDiary();
}
