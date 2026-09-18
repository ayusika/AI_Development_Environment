(() => {
  "use strict";

  const PROFILE_API =
    "/api/next/v1/customer-profile.php";

  const VISIT_NOTES_API =
    "/api/next/v1/visit-notes.php";

  const scheduleApi =
    window.KohakuWorkNextSchedule;

  const drawer =
    document.getElementById(
      "nextScheduleDetailDrawer"
    );

  const body =
    document.getElementById(
      "nextScheduleDetailBody"
    );

  if (
    !scheduleApi
    || !scheduleApi.state
    || !drawer
    || !body
  ) {
    console.error(
      "Kohaku Work NEXT mobile flow: required UI missing."
    );
    return;
  }

  const FEATURE_TYPES = [
    ["age_range", "年齢帯"],
    ["height", "身長"],
    ["body_type", "体型"],
    ["hair", "髪"],
    ["facial_hair", "ひげ"],
    ["glasses", "メガネ"],
    ["appearance", "外見"],
    ["lookalike", "似ている人"],
    ["occupation", "職業"],
    ["days_off", "休日"],
    ["voice_speech", "声・話し方"],
    ["hobby_topic", "趣味・話題"],
    ["other", "その他"],
  ];

  const MANAGED_TYPES = [
    "area",
    ...FEATURE_TYPES.map(
      ([type]) => type
    ),
  ];

  let profile = null;
  let profileCustomerId = 0;
  let profilePromise = null;
  let activeVisitId = 0;
  let mountQueued = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function currentVisit() {
    const visitId =
      Number(
        drawer.dataset.visitId
        || 0
      );

    if (!visitId) return null;

    return scheduleApi.state.visits
      .find(
        visit =>
          Number(visit.id)
          === visitId
      )
      || null;
  }

  function currentCustomerId() {
    return Number(
      currentVisit()?.customer_id
      || 0
    );
  }

  function setWriteStatus(
    text,
    state = ""
  ) {
    const target =
      document.getElementById(
        "nextScheduleWriteStatus"
      );

    if (!target) return;

    target.textContent = text;
    target.dataset.state = state;
  }

  async function requestJson(
    url,
    options = {}
  ) {
    const response =
      await fetch(
        url,
        {
          credentials:"same-origin",
          cache:"no-store",
          ...options,
        }
      );

    let data;

    try {
      data =
        await response.json();
    } catch {
      throw new Error(
        "APIの応答を読めませんでした。"
      );
    }

    if (
      !response.ok
      || !data
      || data.success !== true
    ) {
      throw new Error(
        data?.error
        || "保存できませんでした。"
      );
    }

    return data;
  }

  function resetProfileIfNeeded() {
    const visitId =
      Number(
        drawer.dataset.visitId
        || 0
      );

    if (
      visitId
      === activeVisitId
    ) {
      return;
    }

    activeVisitId = visitId;
    profile = null;
    profileCustomerId = 0;
    profilePromise = null;
  }

  function recordsForType(
    type,
    source = profile
  ) {
    return (
      Array.isArray(
        source?.identity_features
      )
        ? source.identity_features
        : []
    ).filter(
      item =>
        item?.feature_type
        === type
    );
  }

  function recordForType(type) {
    return (
      recordsForType(type)[0]
      || null
    );
  }

  function assertUniqueManagedFeatures() {
    for (
      const type
      of MANAGED_TYPES
    ) {
      const records =
        recordsForType(type);

      if (records.length > 1) {
        const label =
          type === "area"
            ? "エリア"
            : (
              FEATURE_TYPES.find(
                ([value]) =>
                  value === type
              )?.[1]
              || type
            );

        throw new Error(
          `${label}に複数の登録があります。安全のため一括保存を停止しました。`
        );
      }
    }
  }

  async function ensureProfile(
    force = false
  ) {
    const customerId =
      currentCustomerId();

    if (!customerId) {
      profile = null;
      profileCustomerId = 0;
      profilePromise = null;
      return null;
    }

    if (
      !force
      && profile
      && profileCustomerId
        === customerId
    ) {
      return profile;
    }

    if (
      !force
      && profilePromise
    ) {
      return profilePromise;
    }

    profilePromise =
      requestJson(
        `${PROFILE_API}?id=${encodeURIComponent(
          String(customerId)
        )}`,
        {
          method:"GET",
        }
      )
      .then(data => {
        if (
          currentCustomerId()
          !== customerId
        ) {
          return null;
        }

        profile =
          data.customer
          || null;

        profileCustomerId =
          customerId;

        return profile;
      })
      .finally(() => {
        profilePromise = null;
      });

    return profilePromise;
  }

  function mountSaveAllButton() {
    const header =
      drawer.querySelector(
        ".next-schedule-detail-header"
      );

    if (
      !header
      || header.querySelector(
        "[data-next-save-all]"
      )
    ) {
      return;
    }

    const close =
      header.querySelector(
        "[data-next-schedule-detail-close]"
      );

    if (!close) return;

    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "next-detail-save-all";

    button.dataset.nextSaveAll =
      "true";

    button.textContent =
      "✓ 全部保存";

    button.title =
      "今回の予約メモ・顧客共通メモ・顧客特徴・エリアをまとめて保存";

    button.disabled = true;

    close.insertAdjacentElement(
      "beforebegin",
      button
    );
  }

  function mountHeaderEditButton() {
    const header =
      drawer.querySelector(
        ".next-schedule-detail-header"
      );

    if (
      !header
      || header.querySelector(
        "[data-next-header-edit]"
      )
    ) {
      return;
    }

    const save =
      header.querySelector(
        "[data-next-save-all]"
      );

    const close =
      header.querySelector(
        "[data-next-schedule-detail-close]"
      );

    const anchor =
      save || close;

    if (!anchor) return;

    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "next-detail-header-edit";

    button.dataset.nextHeaderEdit =
      "true";

    button.textContent =
      "✎ 編集";

    button.title =
      "この予約を編集";

    anchor.insertAdjacentElement(
      "beforebegin",
      button
    );
  }

  function mountHeaderFeaturesButton() {
    const header =
      drawer.querySelector(
        ".next-schedule-detail-header"
      );

    if (
      !header
      || header.querySelector(
        "[data-next-header-features]"
      )
    ) {
      return;
    }

    const edit =
      header.querySelector(
        "[data-next-header-edit]"
      );

    const save =
      header.querySelector(
        "[data-next-save-all]"
      );

    const close =
      header.querySelector(
        "[data-next-schedule-detail-close]"
      );

    const anchor =
      edit || save || close;

    if (!anchor) return;

    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "next-detail-header-features";

    button.dataset.nextHeaderFeatures =
      "true";

    button.textContent =
      "特徴";

    button.title =
      "顧客の身長・見た目などの特徴を編集";

    button.setAttribute(
      "aria-label",
      "顧客特徴を編集"
    );

    button.disabled = true;

    anchor.insertAdjacentElement(
      "beforebegin",
      button
    );
  }

  function mountHeaderVisitNotesButton() {
    const header =
      drawer.querySelector(
        ".next-schedule-detail-header"
      );

    if (
      !header
      || header.querySelector(
        "[data-next-header-visit-notes]"
      )
    ) {
      return;
    }

    const features =
      header.querySelector(
        "[data-next-header-features]"
      );

    const edit =
      header.querySelector(
        "[data-next-header-edit]"
      );

    const save =
      header.querySelector(
        "[data-next-save-all]"
      );

    const close =
      header.querySelector(
        "[data-next-schedule-detail-close]"
      );

    const anchor =
      features
      || edit
      || save
      || close;

    if (!anchor) return;

    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "next-detail-header-notes";

    button.dataset.nextHeaderVisitNotes =
      "true";

    button.textContent =
      "メモ";

    button.title =
      "今回の予約メモを入力";

    button.disabled = true;

    anchor.insertAdjacentElement(
      "beforebegin",
      button
    );
  }

  function mountHeaderDeleteButton() {
    const header =
      drawer.querySelector(
        ".next-schedule-detail-header"
      );

    if (
      !header
      || header.querySelector(
        "[data-next-header-delete]"
      )
    ) {
      return;
    }

    const close =
      header.querySelector(
        "[data-next-schedule-detail-close]"
      );

    if (!close) return;

    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "next-detail-header-delete";

    button.dataset.nextHeaderDelete =
      "true";

    button.textContent =
      "削除";

    button.title =
      "この予約を削除";

    button.disabled = true;

    close.insertAdjacentElement(
      "beforebegin",
      button
    );
  }

  function syncHeaderVisitNotesButton() {
    const button =
      drawer.querySelector(
        "[data-next-header-visit-notes]"
      );

    if (!button) return;

    const source =
      body.querySelector(
        "[data-next-visit-notes-open]"
      );

    button.disabled =
      !source
      || Boolean(source.disabled);
  }

  function syncHeaderDeleteButton() {
    const button =
      drawer.querySelector(
        "[data-next-header-delete]"
      );

    if (!button) return;

    const source =
      drawer.querySelector(
        ".next-schedule-detail-footer [data-next-schedule-delete]"
      );

    button.disabled =
      !source
      || Boolean(source.disabled);
  }

  function syncHeaderFeaturesButton() {
    const button =
      drawer.querySelector(
        "[data-next-header-features]"
      );

    if (!button) return;

    const source =
      body.querySelector(
        "[data-next-customer-profile-open]"
      );

    button.disabled =
      !currentCustomerId()
      || !source
      || Boolean(source.disabled);
  }

  function syncHeaderEditButton() {
    const button =
      drawer.querySelector(
        "[data-next-header-edit]"
      );

    if (!button) return;

    const source =
      drawer.querySelector(
        ".next-schedule-detail-footer [data-next-schedule-edit-open]"
      );

    button.disabled =
      !source
      || Boolean(source.disabled);

    button.textContent =
      source?.disabled
        ? "読込中…"
        : "✎ 編集";
  }

  function syncSaveAllButton() {
    const button =
      drawer.querySelector(
        "[data-next-save-all]"
      );

    if (!button) return;

    const visit =
      currentVisit();

    const ready =
      Boolean(
        visit
        && String(
          drawer.dataset.detailLoadedId
          || ""
        ) === String(visit.id)
      );

    if (
      button.dataset.saving
      !== "true"
    ) {
      button.disabled =
        !ready;

      if (!ready) {
        button.textContent =
          "✓ 全部保存";
      }
    }
  }

  function mountReservationToggle() {
    const label =
      body.querySelector(
        '[data-next-detail-heading="reservation"]'
      );

    const card =
      label?.nextElementSibling;

    if (
      !label
      || !card
      || !card.classList.contains(
        "next-detail-reservation-card"
      )
    ) {
      return;
    }

    if (
      label.dataset
        .nextReservationToggleReady
        === "true"
    ) {
      return;
    }

    label.dataset
      .nextReservationToggleReady =
      "true";

    label.classList.add(
      "next-detail-reservation-toggle"
    );

    label.setAttribute(
      "role",
      "button"
    );

    label.setAttribute(
      "tabindex",
      "0"
    );

    label.setAttribute(
      "aria-expanded",
      "false"
    );

    card.hidden = true;
  }

  function toggleReservation(label) {
    const card =
      label?.nextElementSibling;

    if (
      !card
      || !card.classList.contains(
        "next-detail-reservation-card"
      )
    ) {
      return;
    }

    const opening =
      card.hidden;

    card.hidden =
      !opening;

    label.classList.toggle(
      "is-expanded",
      opening
    );

    label.setAttribute(
      "aria-expanded",
      opening
        ? "true"
        : "false"
    );
  }

  function mountAreaInput() {
    const visitorCard =
      body.querySelector(
        ".next-detail-visitor-quick"
      );

    if (!visitorCard) return;

    let host =
      visitorCard.querySelector(
        "[data-next-area-note]"
      );

    if (!host) {
      host =
        document.createElement(
          "label"
        );

      host.className =
        "next-detail-area-note";

      host.dataset.nextAreaNote =
        "true";

      host.innerHTML = `
        <span>AREA / 顧客エリアメモ</span>
        <input
          type="text"
          data-next-customer-area-input
          placeholder="例：すすきの周辺、札幌駅によく来る"
        >
        <small>
          このお客さん共通の情報です。「全部保存」で保存します。
        </small>
      `;

      const status =
        visitorCard.querySelector(
          "[data-next-detail-visitor-status]"
        );

      if (status) {
        status.insertAdjacentElement(
          "beforebegin",
          host
        );
      } else {
        visitorCard.append(host);
      }
    }

    const input =
      host.querySelector(
        "[data-next-customer-area-input]"
      );

    if (!input) return;

    const customerId =
      currentCustomerId();

    if (!customerId) {
      input.disabled = true;
      input.value = "";
      input.placeholder =
        "顧客を紐付けると入力できます";
      delete input.dataset.seededCustomer;
      return;
    }

    input.disabled = false;
    input.placeholder =
      "例：すすきの周辺、札幌駅によく来る";

    if (
      !profile
      || profileCustomerId
        !== customerId
    ) {
      return;
    }

    if (
      input.dataset.seededCustomer
      === String(customerId)
    ) {
      return;
    }

    input.value =
      recordForType("area")
        ?.feature_value
      || "";

    input.dataset.seededCustomer =
      String(customerId);
  }

  function featureFieldHtml(
    type,
    label
  ) {
    const record =
      recordForType(type);

    return `
      <label class="next-feature-batch-field">
        <span>${escapeHtml(label)}</span>
        <input
          type="text"
          data-next-batch-feature-type="${escapeHtml(type)}"
          value="${escapeHtml(
            record?.feature_value
            || ""
          )}"
          placeholder="${escapeHtml(label)}"
        >
      </label>
    `;
  }

  function mountBatchFeatureEditor() {
    const editor =
      document.getElementById(
        "nextCustomerProfileEditor"
      );

    const form =
      editor?.querySelector(
        ".next-customer-feature-form"
      );

    const customerId =
      currentCustomerId();

    if (
      !editor
      || !form
      || !customerId
      || !profile
      || profileCustomerId
        !== customerId
    ) {
      return;
    }

    if (
      form.dataset
        .nextFeatureBatchReady
      === String(customerId)
    ) {
      return;
    }

    form.dataset
      .nextFeatureBatchReady =
      String(customerId);

    form.innerHTML = `
      <div class="next-feature-batch-head">
        <strong>顧客特徴</strong>
        <small>カテゴリを切り替えず、まとめて入力できます。</small>
      </div>

      <div class="next-feature-batch-grid">
        ${
          FEATURE_TYPES
            .map(
              ([type, label]) =>
                featureFieldHtml(
                  type,
                  label
                )
            )
            .join("")
        }
      </div>

      <small class="next-feature-batch-help">
        入力後は画面上部の「全部保存」でまとめて保存できます。
      </small>
    `;

    const legacySave =
      editor.querySelector(
        "[data-next-feature-save]"
      );

    if (legacySave) {
      legacySave.hidden = true;
    }
  }

  function wrapCustomerPanel(
    node,
    key
  ) {
    if (!node) return null;

    const existing =
      node.closest(
        `[data-next-customer-panel="${key}"]`
      );

    if (existing) {
      return existing;
    }

    const panel =
      document.createElement(
        "div"
      );

    panel.className =
      "next-customer-panel";

    panel.dataset.nextCustomerPanel =
      key;

    panel.hidden = true;

    node.insertAdjacentElement(
      "beforebegin",
      panel
    );

    panel.append(node);

    return panel;
  }

  function syncCustomerPanelButtons(
    editor
  ) {
    if (!editor) return;

    const openPanel =
      Array.from(
        editor.querySelectorAll(
          "[data-next-customer-panel]"
        )
      )
      .find(panel => !panel.hidden)
      || null;

    const openKey =
      openPanel
        ?.dataset
        ?.nextCustomerPanel
      || "";

    editor
      .querySelectorAll(
        "[data-next-customer-panel-toggle]"
      )
      .forEach(button => {
        const active =
          button.dataset
            .nextCustomerPanelToggle
          === openKey;

        button.classList.toggle(
          "is-active",
          active
        );

        button.setAttribute(
          "aria-expanded",
          active
            ? "true"
            : "false"
        );
      });
  }

  function toggleCustomerPanel(
    key,
    forceOpen = false,
    scroll = false
  ) {
    const editor =
      document.getElementById(
        "nextCustomerProfileEditor"
      );

    if (!editor) return;

    const target =
      editor.querySelector(
        `[data-next-customer-panel="${key}"]`
      );

    if (!target) return;

    const opening =
      forceOpen
      || target.hidden;

    editor
      .querySelectorAll(
        "[data-next-customer-panel]"
      )
      .forEach(panel => {
        panel.hidden =
          panel !== target
          || !opening;
      });

    syncCustomerPanelButtons(
      editor
    );

    if (
      opening
      && scroll
    ) {
      window.setTimeout(() => {
        target.scrollIntoView({
          behavior:"smooth",
          block:"center",
        });
      }, 30);
    }
  }

  function mountCustomerPanels() {
    const editor =
      document.getElementById(
        "nextCustomerProfileEditor"
      );

    if (!editor) return;

    const metaEditor =
      editor.querySelector(
        "[data-next-profile-meta-editor]"
      );

    const generalNotes =
      document.getElementById(
        "nextCustomerGeneralNotes"
      );

    const notesPanel =
      wrapCustomerPanel(
        generalNotes?.closest(
          ".next-notes-write-field"
        ),
        "notes"
      );

    const featureForm =
      editor.querySelector(
        ".next-customer-feature-form"
      );

    const featuresPanel =
      wrapCustomerPanel(
        featureForm,
        "features"
      );

    if (
      !notesPanel
      || !featuresPanel
    ) {
      return;
    }

    let actions =
      editor.querySelector(
        "[data-next-customer-panel-actions]"
      );

    if (!actions) {
      actions =
        document.createElement(
          "div"
        );

      actions.className =
        "next-customer-panel-actions";

      actions.dataset
        .nextCustomerPanelActions =
        "true";

      actions.innerHTML = `
        <button
          type="button"
          data-next-customer-panel-toggle="notes"
          aria-expanded="false"
        >
          共通メモ
        </button>

        <button
          type="button"
          data-next-customer-panel-toggle="features"
          aria-expanded="false"
        >
          顧客特徴
        </button>
      `;
    }

    if (metaEditor) {
      if (
        metaEditor.nextElementSibling
        !== actions
      ) {
        metaEditor.insertAdjacentElement(
          "afterend",
          actions
        );
      }
    } else if (
      editor.firstElementChild
      !== actions
    ) {
      editor.prepend(actions);
    }

    if (
      actions.nextElementSibling
      !== notesPanel
    ) {
      actions.insertAdjacentElement(
        "afterend",
        notesPanel
      );
    }

    if (
      notesPanel.nextElementSibling
      !== featuresPanel
    ) {
      notesPanel.insertAdjacentElement(
        "afterend",
        featuresPanel
      );
    }

    syncCustomerPanelButtons(
      editor
    );
  }

  function formatPastVisitDate(value) {
    const text =
      String(value || "");

    const date =
      text.slice(0, 10)
        .split("-");

    const time =
      text.slice(11, 16);

    if (
      date.length === 3
      && date[1]
      && date[2]
    ) {
      return `${Number(date[1])}/${Number(date[2])} ${time}`;
    }

    return text || "日時不明";
  }

  function renderPastVisitHistory() {
    const tools =
      body.querySelector(
        "[data-next-notes-write-tools]"
      );

    const current =
      currentVisit();

    const old =
      tools?.querySelector(
        "[data-next-customer-past-visits]"
      );

    if (
      !tools
      || !current
      || !profile
      || profileCustomerId
        !== currentCustomerId()
    ) {
      old?.remove();
      return;
    }

    const currentStarted =
      String(
        current.started_at
        || ""
      );

    const visits =
      (
        Array.isArray(profile.visits)
          ? profile.visits
          : []
      )
      .filter(visit => {
        if (
          Number(visit.id)
          === Number(current.id)
        ) {
          return false;
        }

        if (
          currentStarted
          && String(
            visit.started_at || ""
          ) >= currentStarted
        ) {
          return false;
        }

        return true;
      })
      .slice(0, 5);

    if (!visits.length) {
      old?.remove();
      return;
    }

    const history =
      old
      || document.createElement(
        "section"
      );

    history.className =
      "next-customer-past-visits";

    history.dataset
      .nextCustomerPastVisits =
      "true";

    const renderKey =
      JSON.stringify(
        visits.map(visit => [
          visit.id,
          visit.started_at,
          visit.store_name,
          visit.course_minutes,
          visit.heaven_diary_body,
          visit.diary_body,
          visit.diary_note_body,
          visit.customer_features,
          visit.conversation_notes,
          visit.visit_notes,
        ])
      );

    const historyHtml = `
      <div class="next-past-visits-head">
        <span>PAST VISITS</span>
        <strong>過去の予約</strong>
      </div>

      <div class="next-past-visits-list">
        ${
          visits
            .map(visit => {
              const diary =
                String(
                  visit.heaven_diary_body
                  || visit.diary_body
                  || visit.diary_note_body
                  || ""
                ).trim();

              const memos = [
                [
                  "特徴メモ",
                  visit.customer_features,
                ],
                [
                  "会話メモ",
                  visit.conversation_notes,
                ],
                [
                  "来店メモ",
                  visit.visit_notes,
                ],
              ]
                .filter(
                  ([, value]) =>
                    String(
                      value || ""
                    ).trim()
                );

              const memoHtml =
                memos.length
                  ? memos
                      .map(
                        ([label, value]) => `
                          <p>
                            <strong>${escapeHtml(label)}</strong>
                            <span>${escapeHtml(value)}</span>
                          </p>
                        `
                      )
                      .join("")
                  : `
                    <p class="next-past-visit-empty">
                      予約メモなし
                    </p>
                  `;

              return `
                <details class="next-past-visit">
                  <summary>
                    <span>
                      ${escapeHtml(
                        formatPastVisitDate(
                          visit.started_at
                        )
                      )}
                    </span>

                    <small>
                      ${escapeHtml(
                        visit.store_name
                        || ""
                      )}
                      ${
                        visit.course_minutes
                          ? ` / ${Number(visit.course_minutes)}分`
                          : ""
                      }
                    </small>
                  </summary>

                  <div class="next-past-visit-grid">
                    <article>
                      <span>日記</span>
                      <p>
                        ${escapeHtml(
                          diary
                          || "日記なし"
                        )}
                      </p>
                    </article>

                    <article>
                      <span>予約メモ</span>
                      ${memoHtml}
                    </article>
                  </div>
                </details>
              `;
            })
            .join("")
        }
      </div>
    `;

    if (
      history.dataset
        .nextPastVisitsRenderKey
      !== renderKey
    ) {
      history.innerHTML =
        historyHtml;

      history.dataset
        .nextPastVisitsRenderKey =
        renderKey;
    }

    const customerCard =
      tools.querySelector(
        ".next-notes-write-card.is-customer-scope"
      );

    if (
      !old
      && customerCard
    ) {
      customerCard.insertAdjacentElement(
        "afterend",
        history
      );
    }
  }

  function seedGeneralNotes() {
    const textarea =
      document.getElementById(
        "nextCustomerGeneralNotes"
      );

    const customerId =
      currentCustomerId();

    if (
      !textarea
      || !customerId
      || !profile
      || profileCustomerId
        !== customerId
    ) {
      return;
    }

    if (
      textarea.dataset
        .nextMobileSeededCustomer
      === String(customerId)
    ) {
      return;
    }

    textarea.value =
      profile.general_notes
      || "";

    textarea.dataset
      .nextMobileSeededCustomer =
      String(customerId);
  }

  function hideLegacyAreaSummary() {
    body
      .querySelectorAll(
        ".next-customer-feature-item"
      )
      .forEach(item => {
        const label =
          item.querySelector("strong")
            ?.textContent
            ?.trim()
          || "";

        if (label === "エリア") {
          item.hidden = true;
        }
      });
  }

  function renderProfileSummary() {
    const summary =
      document.getElementById(
        "nextCustomerProfileSummary"
      );

    if (
      !summary
      || !profile
    ) {
      return;
    }

    const general =
      summary.querySelector(
        ".next-customer-profile-general"
      );

    if (general) {
      general.textContent =
        profile.general_notes
        || "顧客共通メモなし";
    }

    const list =
      summary.querySelector(
        ".next-customer-feature-list"
      );

    if (!list) return;

    const features =
      (
        Array.isArray(
          profile.identity_features
        )
          ? profile.identity_features
          : []
      )
      .filter(
        feature =>
          feature?.feature_type
          !== "area"
      );

    if (!features.length) {
      list.innerHTML = `
        <p class="next-customer-feature-empty">
          顧客特徴はまだ登録されていません。
        </p>
      `;
      return;
    }

    list.innerHTML =
      features
        .map(feature => {
          const label =
            FEATURE_TYPES.find(
              ([type]) =>
                type
                === feature.feature_type
            )?.[1]
            || feature.feature_type
            || "特徴";

          return `
            <article class="next-customer-feature-item">
              <div>
                <strong>
                  ${escapeHtml(label)}
                </strong>
                <span>
                  ${escapeHtml(
                    feature.feature_value
                    || ""
                  )}
                </span>
                ${
                  feature.note
                    ? `
                      <small>
                        ${escapeHtml(feature.note)}
                      </small>
                    `
                    : ""
                }
              </div>
            </article>
          `;
        })
        .join("");
  }

  async function saveVisitNotes(
    visit
  ) {
    const feature =
      document.getElementById(
        "nextVisitCustomerFeatures"
      );

    const conversation =
      document.getElementById(
        "nextVisitConversationNotes"
      );

    const notes =
      document.getElementById(
        "nextVisitNotes"
      );

    if (
      !feature
      || !conversation
      || !notes
    ) {
      return false;
    }

    const next = {
      customer_features:
        feature.value,
      conversation_notes:
        conversation.value,
      visit_notes:
        notes.value,
    };

    const same =
      String(
        visit.customer_features
        || ""
      ) === next.customer_features
      && String(
        visit.conversation_notes
        || ""
      ) === next.conversation_notes
      && String(
        visit.visit_notes
        || ""
      ) === next.visit_notes;

    if (same) {
      return false;
    }

    const data =
      await requestJson(
        VISIT_NOTES_API,
        {
          method:"PATCH",
          headers:{
            "Content-Type":
              "application/json",
          },
          body:JSON.stringify({
            id:Number(visit.id),
            ...next,
          }),
        }
      );

    const updated =
      data.visit
      || {};

    Object.assign(
      visit,
      {
        customer_features:
          updated.customer_features
          ?? null,
        conversation_notes:
          updated.conversation_notes
          ?? null,
        visit_notes:
          updated.visit_notes
          ?? null,
        updated_at:
          updated.updated_at
          || visit.updated_at,
      }
    );

    const values = {
      "今回の特徴メモ":
        visit.customer_features,
      "今回の会話メモ":
        visit.conversation_notes,
      "今回の来店メモ":
        visit.visit_notes,
    };

    body
      .querySelectorAll(
        ".next-schedule-complete-note"
      )
      .forEach(card => {
        const label =
          card.querySelector("span")
            ?.textContent
            ?.trim()
          || "";

        if (
          !Object.prototype
            .hasOwnProperty.call(
              values,
              label
            )
        ) {
          return;
        }

        const target =
          card.querySelector("p");

        if (target) {
          target.textContent =
            values[label]
            || "なし";
        }
      });

    return true;
  }

  async function saveGeneralNotes(
    customerId
  ) {
    const textarea =
      document.getElementById(
        "nextCustomerGeneralNotes"
      );

    if (!textarea) {
      return false;
    }

    const value =
      textarea.value.trim();

    const current =
      String(
        profile?.general_notes
        || ""
      ).trim();

    if (value === current) {
      return false;
    }

    const data =
      await requestJson(
        PROFILE_API,
        {
          method:"PATCH",
          headers:{
            "Content-Type":
              "application/json",
          },
          body:JSON.stringify({
            id:customerId,
            general_notes:value,
          }),
        }
      );

    profile =
      data.customer
      || profile;

    profileCustomerId =
      customerId;

    return true;
  }

  function inputForType(type) {
    if (type === "area") {
      return body.querySelector(
        "[data-next-customer-area-input]"
      );
    }

    return body.querySelector(
      `[data-next-batch-feature-type="${type}"]`
    );
  }

  async function saveFeatureType(
    customerId,
    type
  ) {
    const input =
      inputForType(type);

    if (!input) {
      return false;
    }

    const records =
      recordsForType(type);

    if (records.length > 1) {
      throw new Error(
        "同じ特徴カテゴリに複数の登録があるため保存を停止しました。"
      );
    }

    const record =
      records[0]
      || null;

    const value =
      input.value.trim();

    const current =
      String(
        record?.feature_value
        || ""
      ).trim();

    if (
      value === current
    ) {
      return false;
    }

    let payload;

    if (
      value === ""
      && record
    ) {
      payload = {
        id:customerId,
        feature_id:
          Number(record.id),
        delete_feature:true,
      };

    } else if (value !== "") {
      payload = {
        id:customerId,
        feature_type:type,
        feature_value:value,
        feature_note:
          record?.note
          || "",
      };

      if (record?.id) {
        payload.feature_id =
          Number(record.id);
      }

    } else {
      return false;
    }

    const data =
      await requestJson(
        PROFILE_API,
        {
          method:"PATCH",
          headers:{
            "Content-Type":
              "application/json",
          },
          body:JSON.stringify(
            payload
          ),
        }
      );

    profile =
      data.customer
      || profile;

    profileCustomerId =
      customerId;

    return true;
  }

  async function saveAll() {
    const visit =
      currentVisit();

    const button =
      drawer.querySelector(
        "[data-next-save-all]"
      );

    if (
      !visit
      || !button
      || button.dataset.saving
        === "true"
    ) {
      return;
    }

    button.dataset.saving =
      "true";

    button.disabled = true;
    button.textContent =
      "保存中…";

    setWriteStatus(
      "VERIFICATION DB / SAVING ALL",
      "writing"
    );

    let changed = 0;

    try {
      const customerId =
        Number(
          visit.customer_id
          || 0
        );

      if (customerId) {
        await ensureProfile();
        assertUniqueManagedFeatures();
      }

      if (
        await saveVisitNotes(
          visit
        )
      ) {
        changed += 1;
      }

      if (
        customerId
        && profile
      ) {
        if (
          await saveGeneralNotes(
            customerId
          )
        ) {
          changed += 1;
        }

        for (
          const type
          of MANAGED_TYPES
        ) {
          if (
            await saveFeatureType(
              customerId,
              type
            )
          ) {
            changed += 1;
          }
        }

        renderProfileSummary();
      }

      button.textContent =
        changed
          ? "✓ 保存済み"
          : "✓ 変更なし";

      setWriteStatus(
        changed
          ? "SAVED / ALL INPUTS"
          : "NO CHANGES / EDIT READY",
        "saved"
      );

      window.setTimeout(
        () => {
          if (
            button.dataset.saving
            === "false"
          ) {
            button.textContent =
              "✓ 全部保存";
          }
        },
        1800
      );

    } catch (error) {
      console.error(error);

      button.textContent =
        "保存エラー";

      setWriteStatus(
        error.message
        || "一括保存できませんでした。",
        "error"
      );

    } finally {
      button.dataset.saving =
        "false";

      button.disabled = false;

      void ensureProfile(true)
        .then(() => {
          renderProfileSummary();
          mountAreaInput();
          renderPastVisitHistory();
        })
        .catch(() => {});
    }
  }

  function mountEnhancements() {
    resetProfileIfNeeded();

    mountSaveAllButton();
    mountHeaderEditButton();
    mountHeaderFeaturesButton();
    mountHeaderVisitNotesButton();
    mountHeaderDeleteButton();
    mountReservationToggle();
    mountAreaInput();
    hideLegacyAreaSummary();
    mountCustomerPanels();
    renderPastVisitHistory();

    const customerId =
      currentCustomerId();

    if (customerId) {
      void ensureProfile()
        .then(() => {
          if (
            currentCustomerId()
            !== customerId
          ) {
            return;
          }

          mountAreaInput();
          seedGeneralNotes();
          mountBatchFeatureEditor();
          mountCustomerPanels();
          renderPastVisitHistory();
          hideLegacyAreaSummary();
        })
        .catch(error => {
          console.error(
            "Customer profile quick flow load failed:",
            error
          );
        });
    }

    syncSaveAllButton();
    syncHeaderEditButton();
    syncHeaderFeaturesButton();
    syncHeaderVisitNotesButton();
    syncHeaderDeleteButton();
  }

  function queueMount() {
    if (mountQueued) return;

    mountQueued = true;

    queueMicrotask(() => {
      mountQueued = false;
      mountEnhancements();
    });
  }

  document.addEventListener(
    "click",
    event => {
      const reservation =
        event.target.closest(
          '[data-next-detail-heading="reservation"]'
        );

      if (reservation) {
        event.preventDefault();
        toggleReservation(
          reservation
        );
        return;
      }

      const headerVisitNotes =
        event.target.closest(
          "[data-next-header-visit-notes]"
        );

      if (headerVisitNotes) {
        event.preventDefault();

        const source =
          body.querySelector(
            "[data-next-visit-notes-open]"
          );

        const editor =
          document.getElementById(
            "nextVisitNotesEditor"
          );

        if (
          !source
          || source.disabled
          || !editor
        ) {
          return;
        }

        if (editor.hidden) {
          source.click();
        }

        window.setTimeout(() => {
          editor.scrollIntoView({
            behavior:"smooth",
            block:"center",
          });
        }, 30);

        return;
      }

      const customerPanelToggle =
        event.target.closest(
          "[data-next-customer-panel-toggle]"
        );

      if (customerPanelToggle) {
        event.preventDefault();

        toggleCustomerPanel(
          customerPanelToggle.dataset
            .nextCustomerPanelToggle
          || ""
        );

        return;
      }

      const headerDelete =
        event.target.closest(
          "[data-next-header-delete]"
        );

      if (headerDelete) {
        event.preventDefault();

        const source =
          drawer.querySelector(
            ".next-schedule-detail-footer [data-next-schedule-delete]"
          );

        if (
          !source
          || source.disabled
        ) {
          return;
        }

        source.click();
        return;
      }

      const headerFeatures =
        event.target.closest(
          "[data-next-header-features]"
        );

      if (headerFeatures) {
        event.preventDefault();

        const source =
          body.querySelector(
            "[data-next-customer-profile-open]"
          );

        const editor =
          document.getElementById(
            "nextCustomerProfileEditor"
          );

        if (
          !source
          || source.disabled
          || !editor
        ) {
          return;
        }

        if (editor.hidden) {
          source.click();
        }

        void ensureProfile()
          .then(() => {
            mountBatchFeatureEditor();
            mountCustomerPanels();

            toggleCustomerPanel(
              "features",
              true,
              true
            );
          })
          .catch(error => {
            console.error(
              "Customer feature shortcut load failed:",
              error
            );

            editor.scrollIntoView({
              behavior:"smooth",
              block:"center",
            });
          });

        return;
      }

      const headerEdit =
        event.target.closest(
          "[data-next-header-edit]"
        );

      if (headerEdit) {
        event.preventDefault();

        const source =
          drawer.querySelector(
            ".next-schedule-detail-footer [data-next-schedule-edit-open]"
          );

        if (
          !source
          || source.disabled
        ) {
          return;
        }

        source.click();
        return;
      }

      if (
        event.target.closest(
          "[data-next-save-all]"
        )
      ) {
        event.preventDefault();
        void saveAll();
      }
    }
  );

  document.addEventListener(
    "keydown",
    event => {
      const reservation =
        event.target.closest(
          '[data-next-detail-heading="reservation"]'
        );

      if (
        !reservation
        || ![
          "Enter",
          " ",
        ].includes(event.key)
      ) {
        return;
      }

      event.preventDefault();

      toggleReservation(
        reservation
      );
    }
  );

  const bodyObserver =
    new MutationObserver(
      queueMount
    );

  bodyObserver.observe(
    body,
    {
      childList:true,
      subtree:true,
    }
  );

  const drawerObserver =
    new MutationObserver(
      queueMount
    );

  drawerObserver.observe(
    drawer,
    {
      attributes:true,
      attributeFilter:[
        "data-visit-id",
        "data-detail-loaded-id",
        "class",
      ],
    }
  );

  queueMount();

  window.KohakuWorkNextMobileFlow = {
    verificationReadEnabled:true,
    verificationWriteEnabled:true,
    productionWriteEnabled:false,
    saveAll,
  };
})();
