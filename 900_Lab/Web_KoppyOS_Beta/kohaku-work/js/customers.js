// WRITER:CUSTOMERS_LOGIC:START
/* ========================================
   CUSTOMERS
======================================== */

const customersApiUrl =
  '/api/v1/customers.php';

let loadedCustomers = [];


function openCustomerDetail(
  customerId
) {

  const selectedCustomerId =
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


          const visitSearchText =
            (
              Array.isArray(
                customer.visits
              )
                ? customer.visits
                : []
            )
              .flatMap(
                (visit) => {

                  const startedAt =
                    String(
                      visit.started_at
                      || ''
                    );

                  const dateText =
                    startedAt.slice(
                      0,
                      10
                    );

                  const match =
                    dateText.match(
                      /^(\d{4})-(\d{2})-(\d{2})$/
                    );


                  if (!match) {
                    return [
                      startedAt,
                    ];
                  }


                  const year =
                    Number(match[1]);

                  const month =
                    Number(match[2]);

                  const day =
                    Number(match[3]);


                  return [
                    startedAt,
                    dateText,
                    `${year}/${month}/${day}`,
                    `${month}/${day}`,
                    `${month}月${day}日`,
                  ];
                }
              );


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

            ...visitSearchText,
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

  filterCustomerCards();


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
