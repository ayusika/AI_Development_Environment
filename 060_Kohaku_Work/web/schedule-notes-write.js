(() => {
  "use strict";

  const VISIT_NOTES_API =
    "/api/v1/visit-notes.php";

  const CUSTOMER_PROFILE_API =
    "/api/v1/customer-profile.php";

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
      "Kohaku Work NEXT notes write module: schedule detail UI missing."
    );
    return;
  }

  const featureLabels = {
    age_range:"年齢帯",
    height:"身長",
    body_type:"体型",
    hair:"髪",
    facial_hair:"ひげ",
    glasses:"メガネ",
    appearance:"外見",
    lookalike:"似ている人",
    occupation:"職業",
    days_off:"休日",
    voice_speech:"声・話し方",
    area:"エリア",
    hobby_topic:"趣味・話題",
    other:"その他",
  };

  let customerProfile = null;

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
        drawer.dataset.visitId || 0
      );

    return scheduleApi.state.visits
      .find(item =>
        Number(item.id)
        === visitId
      )
      || null;
  }

  function setMessage(
    id,
    text,
    isError = false
  ) {
    const node =
      document.getElementById(id);

    if (!node) return;

    node.textContent = text || "";
    node.classList.toggle(
      "is-error",
      isError
    );
  }

  function featureOptions(
    selected = ""
  ) {
    return Object.entries(
      featureLabels
    )
      .map(([value, label]) => `
        <option
          value="${escapeHtml(value)}"
          ${value === selected ? "selected" : ""}
        >
          ${escapeHtml(label)}
        </option>
      `)
      .join("");
  }

  function featureListHtml(
    features
  ) {
    if (
      !Array.isArray(features)
      || !features.length
    ) {
      return `
        <p class="next-customer-feature-empty">
          顧客特徴はまだ登録されていません。
        </p>
      `;
    }

    return features
      .map(feature => `
        <article
          class="next-customer-feature-item"
          data-next-feature-id="${Number(feature.id)}"
        >
          <div>
            <strong>
              ${escapeHtml(
                featureLabels[
                  feature.feature_type
                ]
                || feature.feature_type
              )}
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

          <div class="next-customer-feature-actions">
            <button
              type="button"
              class="next-notes-feature-button"
              data-next-feature-edit="${Number(feature.id)}"
            >
              編集
            </button>

            <button
              type="button"
              class="next-notes-feature-button is-delete"
              data-next-feature-delete="${Number(feature.id)}"
            >
              削除
            </button>
          </div>
        </article>
      `)
      .join("");
  }

  function renderCustomerProfileSummary() {
    const target =
      document.getElementById(
        "nextCustomerProfileSummary"
      );

    if (!target) return;

    /*
     * Mobile flow may relocate the visitor-type card
     * into this summary.
     *
     * Preserve the actual DOM node while the legacy
     * summary renderer refreshes its own contents.
     */
    const visitorQuick =
      target.querySelector(
        ".next-detail-visitor-quick"
      );

    visitorQuick?.remove();

    if (!customerProfile) {
      target.innerHTML = `
        <p class="next-customer-feature-empty">
          顧客プロフィールを読み込めませんでした。
        </p>
      `;

      if (visitorQuick) {
        target.append(
          visitorQuick
        );
      }

      return;
    }

    target.innerHTML = `
      <p class="next-customer-profile-general">
        ${escapeHtml(
          customerProfile.general_notes
          || "顧客共通メモなし"
        )}
      </p>

      <div class="next-customer-feature-list">
        ${featureListHtml(
          customerProfile.identity_features
        )}
      </div>
    `;

    if (visitorQuick) {
      const featureList =
        target.querySelector(
          ".next-customer-feature-list"
        );

      if (featureList) {
        featureList.insertAdjacentElement(
          "beforebegin",
          visitorQuick
        );
      } else {
        target.append(
          visitorQuick
        );
      }
    }
  }

  function mountTools() {
    const complete =
      body.querySelector(
        "[data-next-complete-detail]"
      );

    const visit =
      currentVisit();

    if (
      !complete
      || !visit
      || String(
        drawer.dataset.detailLoadedId
        || ""
      ) !== String(visit.id)
    ) {
      return;
    }

    if (
      complete.querySelector(
        "[data-next-notes-write-tools]"
      )
    ) {
      return;
    }

    const memosGroup =
      complete.querySelector(
        '[data-next-detail-work-group="memos"]'
      );

    const memosContainer =
      memosGroup?.querySelector(
        ".next-schedule-complete-notes"
      )
      || null;

    if (!memosContainer) {
      return;
    }

    const linkedCustomerId =
      Number(
        visit.customer_id || 0
      );

    const tools =
      document.createElement("div");

    tools.className =
      "next-notes-write-tools";

    tools.dataset.nextNotesWriteTools =
      "true";

    tools.innerHTML = `
      <section class="next-notes-write-card is-visit-scope">
        <div class="next-notes-write-head">
          <div>
            <span class="next-notes-write-kicker">
              THIS RESERVATION / PRODUCTION
            </span>

            <strong>
              今回の予約メモ
            </strong>

            <small class="next-notes-write-scope">
              この予約だけに保存します。別の予約には引き継ぎません。
            </small>
          </div>

          <button
            type="button"
            class="next-notes-write-button"
            data-next-visit-notes-open
          >
            ✎ 入力する
          </button>
        </div>

        <div
          class="next-notes-write-editor"
          id="nextVisitNotesEditor"
          hidden
        >
          <label class="next-notes-write-field">
            <span>
              今回の特徴メモ
            </span>

            <textarea
              id="nextVisitCustomerFeatures"
              rows="4"
              placeholder="この来店時に気づいた特徴など"
            >${escapeHtml(
              visit.customer_features
              || ""
            )}</textarea>
          </label>

          <label class="next-notes-write-field">
            <span>
              今回の会話メモ
            </span>

            <textarea
              id="nextVisitConversationNotes"
              rows="5"
              placeholder="話した内容、次回触れたい話題など"
            >${escapeHtml(
              visit.conversation_notes
              || ""
            )}</textarea>
          </label>

          <label class="next-notes-write-field">
            <span>
              今回の来店メモ
            </span>

            <textarea
              id="nextVisitNotes"
              rows="5"
              placeholder="接客全体の記録など"
            >${escapeHtml(
              visit.visit_notes
              || ""
            )}</textarea>
          </label>

          <p
            class="next-notes-write-message"
            id="nextVisitNotesMessage"
          ></p>

          <div class="next-notes-write-actions">
            <button
              type="button"
              class="next-notes-write-cancel"
              data-next-visit-notes-cancel
            >
              閉じる
            </button>

            <button
              type="button"
              class="next-notes-write-save"
              data-next-visit-notes-save
            >
              本番DBへ保存
            </button>
          </div>
        </div>
      </section>

      <section class="next-notes-write-card is-customer-scope">
        <div class="next-notes-write-head">
          <div>
            <span class="next-notes-write-kicker">
              CUSTOMER COMMON / PRODUCTION
            </span>

            <strong>
              顧客共通情報
            </strong>

            <small class="next-notes-write-scope">
              このお客さん全体に保存します。次回以降の予約でも共通です。
            </small>
          </div>

          <button
            type="button"
            class="next-notes-write-button"
            data-next-customer-profile-open
            ${linkedCustomerId ? "" : "disabled"}
          >
            ${
              linkedCustomerId
                ? "✎ 入力する"
                : "顧客未紐付け"
            }
          </button>
        </div>

        <div
          class="next-customer-profile-summary"
          id="nextCustomerProfileSummary"
        >
          <p class="next-customer-feature-empty">
            ${
              linkedCustomerId
                ? "顧客プロフィールを読み込み中…"
                : "顧客を紐付けると、顧客共通メモ・特徴を登録できます。"
            }
          </p>
        </div>

        <div
          class="next-notes-write-editor"
          id="nextCustomerProfileEditor"
          hidden
        >
          <label class="next-notes-write-field">
            <span>
              顧客共通メモ
            </span>

            <textarea
              id="nextCustomerGeneralNotes"
              rows="5"
              placeholder="次回以降も覚えておきたいこと"
            ></textarea>
          </label>

          <button
            type="button"
            class="next-notes-write-save"
            data-next-customer-notes-save
          >
            顧客共通メモを保存
          </button>

          <div class="next-customer-feature-form">
            <input
              id="nextCustomerFeatureId"
              type="hidden"
              value=""
            >

            <label class="next-notes-write-field">
              <span>
                特徴カテゴリ
              </span>

              <select id="nextCustomerFeatureType">
                ${featureOptions()}
              </select>
            </label>

            <label class="next-notes-write-field">
              <span>
                特徴
              </span>

              <input
                id="nextCustomerFeatureValue"
                type="text"
                placeholder="例：170cmくらい"
              >
            </label>

            <label class="next-notes-write-field is-wide">
              <span>
                補足
              </span>

              <input
                id="nextCustomerFeatureNote"
                type="text"
                placeholder="任意"
              >
            </label>
          </div>

          <p
            class="next-notes-write-message"
            id="nextCustomerProfileMessage"
          ></p>

          <div class="next-notes-write-actions">
            <button
              type="button"
              class="next-notes-write-cancel"
              data-next-customer-profile-cancel
            >
              閉じる
            </button>

            <button
              type="button"
              class="next-notes-write-save"
              data-next-feature-save
            >
              顧客特徴を保存
            </button>
          </div>
        </div>
      </section>
    `;

    memosContainer.after(
      tools
    );

    if (linkedCustomerId) {
      void loadCustomerProfile(
        linkedCustomerId
      );
    }
  }

  async function requestJson(
    url,
    options
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

  async function loadCustomerProfile(
    customerId
  ) {
    try {
      const data =
        await requestJson(
          `${CUSTOMER_PROFILE_API}?id=${encodeURIComponent(
            String(customerId)
          )}`,
          {
            method:"GET",
          }
        );

      customerProfile =
        data.customer || null;

      renderCustomerProfileSummary();

      const textarea =
        document.getElementById(
          "nextCustomerGeneralNotes"
        );

      if (textarea) {
        textarea.value =
          customerProfile?.general_notes
          || "";
      }

    } catch (error) {
      customerProfile = null;

      renderCustomerProfileSummary();

      setMessage(
        "nextCustomerProfileMessage",
        error.message
        || "顧客プロフィールを取得できませんでした。",
        true
      );
    }
  }

  async function saveVisitNotes() {
    const visit =
      currentVisit();

    if (!visit) {
      return;
    }

    const button =
      document.querySelector(
        "[data-next-visit-notes-save]"
      );

    if (button) {
      button.disabled = true;
      button.textContent = "保存中…";
    }

    setMessage(
      "nextVisitNotesMessage",
      "本番DBへ保存しています…"
    );

    try {
      const data =
        await requestJson(
          VISIT_NOTES_API,
          {
            method:"PATCH",
            headers:{
              "Content-Type":"application/json",
            },
            body:JSON.stringify({
              id:Number(visit.id),
              customer_features:
                document.getElementById(
                  "nextVisitCustomerFeatures"
                )?.value
                || "",
              conversation_notes:
                document.getElementById(
                  "nextVisitConversationNotes"
                )?.value
                || "",
              visit_notes:
                document.getElementById(
                  "nextVisitNotes"
                )?.value
                || "",
            }),
          }
        );

      const updated =
        data.visit || {};

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

      const memoCards =
        Array.from(
          body.querySelectorAll(
            ".next-schedule-complete-note"
          )
        );

      const values = {
        "今回の特徴メモ":
          visit.customer_features,
        "今回の会話メモ":
          visit.conversation_notes,
        "今回の来店メモ":
          visit.visit_notes,
      };

      memoCards.forEach(card => {
        const label =
          card.querySelector("span")
            ?.textContent
            ?.trim()
          || "";

        if (
          Object.prototype.hasOwnProperty.call(
            values,
            label
          )
        ) {
          const textNode =
            card.querySelector("p");

          if (textNode) {
            textNode.textContent =
              values[label]
              || "なし";
          }
        }
      });

      setMessage(
        "nextVisitNotesMessage",
        "保存しました。"
      );

    } catch (error) {
      setMessage(
        "nextVisitNotesMessage",
        error.message
        || "保存できませんでした。",
        true
      );

    } finally {
      if (button) {
        button.disabled = false;
        button.textContent =
          "本番DBへ保存";
      }
    }
  }

  async function saveCustomerNotes() {
    const visit =
      currentVisit();

    const customerId =
      Number(
        visit?.customer_id || 0
      );

    if (!customerId) {
      return;
    }

    setMessage(
      "nextCustomerProfileMessage",
      "顧客共通メモを保存しています…"
    );

    try {
      const data =
        await requestJson(
          CUSTOMER_PROFILE_API,
          {
            method:"PATCH",
            headers:{
              "Content-Type":"application/json",
            },
            body:JSON.stringify({
              id:customerId,
              general_notes:
                document.getElementById(
                  "nextCustomerGeneralNotes"
                )?.value
                || "",
            }),
          }
        );

      customerProfile =
        data.customer || null;

      renderCustomerProfileSummary();

      setMessage(
        "nextCustomerProfileMessage",
        "顧客共通メモを保存しました。"
      );

    } catch (error) {
      setMessage(
        "nextCustomerProfileMessage",
        error.message
        || "顧客共通メモを保存できませんでした。",
        true
      );
    }
  }

  function resetFeatureForm() {
    const id =
      document.getElementById(
        "nextCustomerFeatureId"
      );

    const type =
      document.getElementById(
        "nextCustomerFeatureType"
      );

    const value =
      document.getElementById(
        "nextCustomerFeatureValue"
      );

    const note =
      document.getElementById(
        "nextCustomerFeatureNote"
      );

    if (id) id.value = "";
    if (type) type.value = "age_range";
    if (value) value.value = "";
    if (note) note.value = "";
  }

  async function saveCustomerFeature() {
    const visit =
      currentVisit();

    const customerId =
      Number(
        visit?.customer_id || 0
      );

    if (!customerId) {
      return;
    }

    const value =
      document.getElementById(
        "nextCustomerFeatureValue"
      )?.value?.trim()
      || "";

    if (!value) {
      setMessage(
        "nextCustomerProfileMessage",
        "顧客特徴を入力してね。",
        true
      );
      return;
    }

    const featureId =
      Number(
        document.getElementById(
          "nextCustomerFeatureId"
        )?.value
        || 0
      );

    setMessage(
      "nextCustomerProfileMessage",
      "顧客特徴を保存しています…"
    );

    try {
      const data =
        await requestJson(
          CUSTOMER_PROFILE_API,
          {
            method:"PATCH",
            headers:{
              "Content-Type":"application/json",
            },
            body:JSON.stringify({
              id:customerId,
              feature_id:
                featureId || null,
              feature_type:
                document.getElementById(
                  "nextCustomerFeatureType"
                )?.value
                || "other",
              feature_value:value,
              feature_note:
                document.getElementById(
                  "nextCustomerFeatureNote"
                )?.value
                || "",
            }),
          }
        );

      customerProfile =
        data.customer || null;

      renderCustomerProfileSummary();
      resetFeatureForm();

      setMessage(
        "nextCustomerProfileMessage",
        "顧客特徴を保存しました。"
      );

    } catch (error) {
      setMessage(
        "nextCustomerProfileMessage",
        error.message
        || "顧客特徴を保存できませんでした。",
        true
      );
    }
  }

  async function deleteCustomerFeature(
    featureId
  ) {
    const visit =
      currentVisit();

    const customerId =
      Number(
        visit?.customer_id || 0
      );

    if (
      !customerId
      || !featureId
    ) {
      return;
    }

    if (
      !window.confirm(
        "この顧客特徴を削除する？"
      )
    ) {
      return;
    }

    setMessage(
      "nextCustomerProfileMessage",
      "顧客特徴を削除しています…"
    );

    try {
      const data =
        await requestJson(
          CUSTOMER_PROFILE_API,
          {
            method:"PATCH",
            headers:{
              "Content-Type":"application/json",
            },
            body:JSON.stringify({
              id:customerId,
              feature_id:
                Number(featureId),
              delete_feature:true,
            }),
          }
        );

      customerProfile =
        data.customer || null;

      renderCustomerProfileSummary();
      resetFeatureForm();

      setMessage(
        "nextCustomerProfileMessage",
        "顧客特徴を削除しました。"
      );

    } catch (error) {
      setMessage(
        "nextCustomerProfileMessage",
        error.message
        || "顧客特徴を削除できませんでした。",
        true
      );
    }
  }

  function editCustomerFeature(
    featureId
  ) {
    const feature =
      customerProfile
        ?.identity_features
        ?.find(item =>
          Number(item.id)
          === Number(featureId)
        )
      || null;

    if (!feature) {
      return;
    }

    const editor =
      document.getElementById(
        "nextCustomerProfileEditor"
      );

    if (editor) {
      editor.hidden = false;
    }

    const id =
      document.getElementById(
        "nextCustomerFeatureId"
      );

    const type =
      document.getElementById(
        "nextCustomerFeatureType"
      );

    const value =
      document.getElementById(
        "nextCustomerFeatureValue"
      );

    const note =
      document.getElementById(
        "nextCustomerFeatureNote"
      );

    if (id) {
      id.value =
        String(feature.id);
    }

    if (type) {
      type.value =
        feature.feature_type
        || "other";
    }

    if (value) {
      value.value =
        feature.feature_value
        || "";
    }

    if (note) {
      note.value =
        feature.note
        || "";
    }

    value?.focus();
  }

  document.addEventListener(
    "click",
    event => {
      const visitOpen =
        event.target.closest(
          "[data-next-visit-notes-open]"
        );

      if (visitOpen) {
        const editor =
          document.getElementById(
            "nextVisitNotesEditor"
          );

        if (editor) {
          editor.hidden =
            !editor.hidden;
        }

        return;
      }

      if (
        event.target.closest(
          "[data-next-visit-notes-cancel]"
        )
      ) {
        const editor =
          document.getElementById(
            "nextVisitNotesEditor"
          );

        if (editor) {
          editor.hidden = true;
        }

        return;
      }

      if (
        event.target.closest(
          "[data-next-visit-notes-save]"
        )
      ) {
        void saveVisitNotes();
        return;
      }

      if (
        event.target.closest(
          "[data-next-customer-profile-open]"
        )
      ) {
        const editor =
          document.getElementById(
            "nextCustomerProfileEditor"
          );

        if (editor) {
          editor.hidden =
            !editor.hidden;
        }

        return;
      }

      if (
        event.target.closest(
          "[data-next-customer-profile-cancel]"
        )
      ) {
        const editor =
          document.getElementById(
            "nextCustomerProfileEditor"
          );

        if (editor) {
          editor.hidden = true;
        }

        return;
      }

      if (
        event.target.closest(
          "[data-next-customer-notes-save]"
        )
      ) {
        void saveCustomerNotes();
        return;
      }

      if (
        event.target.closest(
          "[data-next-feature-save]"
        )
      ) {
        void saveCustomerFeature();
        return;
      }

      const edit =
        event.target.closest(
          "[data-next-feature-edit]"
        );

      if (edit) {
        editCustomerFeature(
          Number(
            edit.dataset.nextFeatureEdit
            || 0
          )
        );
        return;
      }

      const remove =
        event.target.closest(
          "[data-next-feature-delete]"
        );

      if (remove) {
        void deleteCustomerFeature(
          Number(
            remove.dataset.nextFeatureDelete
            || 0
          )
        );
      }
    }
  );

  const observer =
    new MutationObserver(
      () => {
        queueMicrotask(
          mountTools
        );
      }
    );

  observer.observe(
    body,
    {
      childList:true,
      subtree:true,
    }
  );

  observer.observe(
    drawer,
    {
      attributes:true,
      attributeFilter:[
        "class",
        "data-visit-id",
        "data-detail-loaded-id",
      ],
    }
  );

  queueMicrotask(
    mountTools
  );
})();
