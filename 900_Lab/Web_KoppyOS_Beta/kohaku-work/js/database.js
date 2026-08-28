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



