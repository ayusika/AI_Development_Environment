(() => {
  "use strict";

  const SETTINGS_API =
    "/api/v1/heaven-diary-settings.php";

  const view =
    document.getElementById(
      "view-heaven-settings"
    );

  if (!view) {
    return;
  }


  const phraseGroups = [
    {
      label:
        "出勤",

      categories: [
        ["attendance_empty", "予約なし"],
        ["attendance_new", "新規"],
        ["attendance_repeat", "リピ"],
        ["attendance_start_open", "スタート空き"],
        ["attendance_invite", "通常のお誘い"],
        ["attendance_last", "ラスト1枠"],
        ["attendance_consultation", "要相談"],
        ["attendance_finished", "本日終了"],
      ],
    },

    {
      label:
        "次回予告",

      categories: [
        ["next_new", "新規"],
        ["next_repeat", "リピ"],
        ["next_fun", "楽しみ文"],
        ["next_op_generic", "OPあり汎用"],
        ["next_invite", "お誘い"],
        ["next_last", "ラスト1枠"],
        ["next_consultation", "要相談"],
        ["next_finished", "本日終了"],
      ],
    },

    {
      label:
        "共通",

      categories: [
        ["common_close", "締め文"],
      ],
    },
  ];


  const titleTemplates = [
    ["attendance_empty", "出勤・予約なし"],
    ["attendance_available", "出勤・通常空き"],
    ["attendance_last", "出勤・ラスト1枠"],
    ["attendance_consultation", "出勤・要相談"],
    ["attendance_finished", "出勤・本日終了"],
    ["next_new", "次回・新規"],
    ["next_repeat", "次回・リピ"],
    ["next_sequence_2", "次回・2連続"],
    ["next_sequence_3", "次回・3連続"],
    ["next_last", "次回・ラスト1枠"],
    ["next_consultation", "次回・要相談"],
  ];


  const categoryLabels =
    Object.fromEntries(
      phraseGroups.flatMap(
        group =>
          group.categories.map(
            ([key, label]) => [
              key,
              `${group.label} / ${label}`,
            ]
          )
      )
    );


  const state = {
    settings:
      null,

    loading:
      false,

    dirty:
      false,
  };


  function $(
    selector
  ) {
    return view.querySelector(
      selector
    );
  }


  function clone(
    value
  ) {
    return JSON.parse(
      JSON.stringify(
        value
      )
    );
  }


  function runtime() {
    return window
      .KohakuHeavenSettings
      || null;
  }


  function defaults() {

    const source =
      runtime()?.defaults;

    if (!source) {
      throw new Error(
        "Heaven settings runtime is unavailable."
      );
    }

    return clone(
      source
    );
  }


  function normalizeLocal(
    value
  ) {

    const base =
      defaults();

    const incoming =
      value
      && typeof value === "object"
        ? value
        : {};


    return {
      ...base,
      ...incoming,

      basic: {
        ...base.basic,
        ...(
          incoming.basic
          || {}
        ),
      },

      rules: {
        ...base.rules,
        ...(
          incoming.rules
          || {}
        ),
      },

      title: {
        ...base.title,
        ...(
          incoming.title
          || {}
        ),
      },

      thank_you: {
        ...base.thank_you,
        ...(
          incoming.thank_you
          || {}
        ),
      },

      title_templates: {
        ...base.title_templates,
        ...(
          incoming.title_templates
          || {}
        ),
      },

      phrases:
        Array.isArray(
          incoming.phrases
        )
          ? clone(
              incoming.phrases
            )
          : clone(
              base.phrases
            ),

      op_phrases:
        Array.isArray(
          incoming.op_phrases
        )
          ? clone(
              incoming.op_phrases
            )
          : [],
    };
  }


  function setStatus(
    message,
    isError = false
  ) {

    const status =
      $(
        "[data-heaven-settings-status]"
      );

    if (!status) {
      return;
    }

    status.textContent =
      message;

    status.classList.toggle(
      "is-error",
      isError
    );
  }


  function markDirty() {

    state.dirty =
      true;

    setStatus(
      "変更あり / 未保存"
    );
  }


  function createButton(
    label,
    className = ""
  ) {

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.textContent =
      label;

    button.className =
      className;

    return button;
  }


  function createTextInput(
    value = ""
  ) {

    const input =
      document.createElement(
        "input"
      );

    input.type =
      "text";

    input.value =
      String(
        value
        ?? ""
      );

    return input;
  }


  function renderPhraseGroups() {

    const host =
      $(
        "[data-heaven-settings-phrases]"
      );

    if (
      !host
      || !state.settings
    ) {
      return;
    }

    host.replaceChildren();


    phraseGroups.forEach(
      (
        group,
        groupIndex
      ) => {

        const groupDetails =
          document.createElement(
            "details"
          );

        groupDetails.className =
          "next-heaven-settings-group";

        groupDetails.open =
          groupIndex === 0;


        const groupSummary =
          document.createElement(
            "summary"
          );

        groupSummary.textContent =
          group.label;

        groupDetails.appendChild(
          groupSummary
        );


        const body =
          document.createElement(
            "div"
          );

        body.className =
          "next-heaven-settings-group-body";


        group.categories.forEach(
          (
            [
              category,
              label,
            ]
          ) => {

            const categoryDetails =
              document.createElement(
                "details"
              );

            categoryDetails.className =
              "next-heaven-settings-category";


            const phrases =
              state.settings.phrases.filter(
                phrase =>
                  phrase.category
                  === category
              );


            const summary =
              document.createElement(
                "summary"
              );

            summary.textContent =
              `${label} (${phrases.length})`;

            categoryDetails.appendChild(
              summary
            );


            const rows =
              document.createElement(
                "div"
              );

            rows.className =
              "next-heaven-settings-phrase-list";


            phrases.forEach(
              phrase => {

                const row =
                  document.createElement(
                    "div"
                  );

                row.className =
                  "next-heaven-settings-phrase-row";


                const input =
                  createTextInput(
                    phrase.text
                  );

                input.dataset.phraseId =
                  phrase.id;

                input.dataset.phraseCategory =
                  category;

                input.setAttribute(
                  "aria-label",
                  `${label}のフレーズ`
                );


                const enabledLabel =
                  document.createElement(
                    "label"
                  );

                enabledLabel.className =
                  "next-heaven-settings-enabled";


                const enabled =
                  document.createElement(
                    "input"
                  );

                enabled.type =
                  "checkbox";

                enabled.checked =
                  Boolean(
                    phrase.enabled
                  );

                enabled.dataset.phraseId =
                  phrase.id;

                enabled.dataset.phraseCategory =
                  category;


                const enabledText =
                  document.createElement(
                    "span"
                  );

                enabledText.textContent =
                  "使用";


                enabledLabel.append(
                  enabled,
                  enabledText
                );


                const remove =
                  createButton(
                    "削除",
                    "next-heaven-settings-remove"
                  );

                remove.dataset.removePhraseId =
                  phrase.id;


                row.append(
                  input,
                  enabledLabel,
                  remove
                );

                rows.appendChild(
                  row
                );
              }
            );


            const add =
              createButton(
                `＋ ${label}を追加`,
                "next-heaven-settings-add"
              );

            add.dataset.addPhraseCategory =
              category;


            categoryDetails.append(
              rows,
              add
            );

            body.appendChild(
              categoryDetails
            );
          }
        );


        groupDetails.appendChild(
          body
        );

        host.appendChild(
          groupDetails
        );
      }
    );
  }


  function renderTitleTemplates() {

    const host =
      $(
        "[data-heaven-settings-titles]"
      );

    if (
      !host
      || !state.settings
    ) {
      return;
    }

    host.replaceChildren();


    titleTemplates.forEach(
      (
        [
          key,
          label,
        ]
      ) => {

        const field =
          document.createElement(
            "label"
          );

        field.className =
          "next-heaven-field";


        const caption =
          document.createElement(
            "span"
          );

        caption.textContent =
          label;


        const input =
          createTextInput(
            state.settings
              .title_templates[
                key
              ]
            || ""
          );

        input.dataset.titleTemplate =
          key;


        field.append(
          caption,
          input
        );

        host.appendChild(
          field
        );
      }
    );
  }


  function renderOpPhrases() {

    const host =
      $(
        "[data-heaven-settings-op]"
      );

    if (
      !host
      || !state.settings
    ) {
      return;
    }

    host.replaceChildren();


    if (
      !state.settings
        .op_phrases.length
    ) {

      const empty =
        document.createElement(
          "p"
        );

      empty.className =
        "next-heaven-settings-empty";

      empty.textContent =
        "OP専用ルールはまだありません。";

      host.appendChild(
        empty
      );
    }


    state.settings
      .op_phrases
      .forEach(
        phrase => {

          const row =
            document.createElement(
              "div"
            );

          row.className =
            "next-heaven-settings-op-row";


          const name =
            createTextInput(
              phrase.op_name
            );

          name.placeholder =
            "OP名";

          name.dataset.opPhraseId =
            phrase.id;

          name.dataset.opField =
            "op_name";


          const text =
            createTextInput(
              phrase.text
            );

          text.placeholder =
            "このOP専用フレーズ";

          text.dataset.opPhraseId =
            phrase.id;

          text.dataset.opField =
            "text";


          const enabledLabel =
            document.createElement(
              "label"
            );

          enabledLabel.className =
            "next-heaven-settings-enabled";


          const enabled =
            document.createElement(
              "input"
            );

          enabled.type =
            "checkbox";

          enabled.checked =
            Boolean(
              phrase.enabled
            );

          enabled.dataset.opPhraseId =
            phrase.id;

          enabled.dataset.opField =
            "enabled";


          const enabledText =
            document.createElement(
              "span"
            );

          enabledText.textContent =
            "使用";


          enabledLabel.append(
            enabled,
            enabledText
          );


          const remove =
            createButton(
              "削除",
              "next-heaven-settings-remove"
            );

          remove.dataset.removeOpPhraseId =
            phrase.id;


          row.append(
            name,
            text,
            enabledLabel,
            remove
          );

          host.appendChild(
            row
          );
        }
      );
  }


  function setStaticFields() {

    if (!state.settings) {
      return;
    }

    const settings =
      state.settings;


    $(
      '[name="signature"]'
    ).value =
      settings.basic.signature
      || "";


    $(
      '[name="avoid_same_day"]'
    ).checked =
      Boolean(
        settings.basic
          .avoid_same_day
      );


    $(
      '[name="reroll_enabled"]'
    ).checked =
      Boolean(
        settings.basic
          .reroll_enabled
      );


    $(
      '[name="paragraphs"]'
    ).value =
      String(
        settings.basic.paragraphs
        || 3
      );


    $(
      '[name="minimum_minutes"]'
    ).value =
      String(
        settings.rules
          .minimum_minutes
      );


    $(
      '[name="buffer_minutes"]'
    ).value =
      String(
        settings.rules
          .buffer_minutes
      );


    $(
      '[name="title_recommended"]'
    ).value =
      String(
        settings.title
          .recommended
      );


    $(
      '[name="title_warning"]'
    ).value =
      String(
        settings.title
          .warning
      );


    $(
      '[name="title_strong"]'
    ).value =
      String(
        settings.title
          .strong
      );


    view
      .querySelectorAll(
        "[data-thank-you-setting]"
      )
      .forEach(
        input => {

          const key =
            input.dataset
              .thankYouSetting;

          input.value =
            String(
              settings
                .thank_you[
                  key
                ]
              ?? ""
            );
        }
      );


    view
      .querySelectorAll(
        '[data-title-template="thank_you_new"],'
        + '[data-title-template="thank_you_repeat"]'
      )
      .forEach(
        input => {

          input.value =
            String(
              settings
                .title_templates[
                  input.dataset
                    .titleTemplate
                ]
              ?? ""
            );
        }
      );
  }


  function render() {

    if (!state.settings) {
      return;
    }

    setStaticFields();
    renderTitleTemplates();
    renderPhraseGroups();
    renderOpPhrases();

    updatePreview(
      null
    );
  }


  function collectForm() {

    if (!state.settings) {
      return;
    }

    const settings =
      state.settings;


    settings.basic = {
      signature:
        $(
          '[name="signature"]'
        ).value,

      avoid_same_day:
        $(
          '[name="avoid_same_day"]'
        ).checked,

      reroll_enabled:
        $(
          '[name="reroll_enabled"]'
        ).checked,

      paragraphs:
        Number(
          $(
            '[name="paragraphs"]'
          ).value
        ),
    };


    settings.rules = {
      minimum_minutes:
        Number(
          $(
            '[name="minimum_minutes"]'
          ).value
        ),

      buffer_minutes:
        Number(
          $(
            '[name="buffer_minutes"]'
          ).value
        ),
    };


    settings.title = {
      recommended:
        Number(
          $(
            '[name="title_recommended"]'
          ).value
        ),

      warning:
        Number(
          $(
            '[name="title_warning"]'
          ).value
        ),

      strong:
        Number(
          $(
            '[name="title_strong"]'
          ).value
        ),
    };


    view
      .querySelectorAll(
        "[data-title-template]"
      )
      .forEach(
        input => {

          const key =
            input.dataset
              .titleTemplate;

          settings
            .title_templates[
              key
            ] =
            input.value;
        }
      );


    view
      .querySelectorAll(
        "[data-thank-you-setting]"
      )
      .forEach(
        input => {

          settings
            .thank_you[
              input.dataset
                .thankYouSetting
            ] =
            input.value;
        }
      );


    view
      .querySelectorAll(
        "[data-phrase-id]"
      )
      .forEach(
        input => {

          const phrase =
            settings.phrases.find(
              item =>
                item.id
                === input.dataset
                  .phraseId
            );

          if (!phrase) {
            return;
          }


          if (
            input.type
            === "checkbox"
          ) {

            phrase.enabled =
              input.checked;

          } else {

            phrase.text =
              input.value;
          }
        }
      );


    view
      .querySelectorAll(
        "[data-op-phrase-id]"
      )
      .forEach(
        input => {

          const phrase =
            settings
              .op_phrases
              .find(
                item =>
                  item.id
                  === input.dataset
                    .opPhraseId
              );

          if (!phrase) {
            return;
          }


          const key =
            input.dataset
              .opField;


          phrase[key] =
            input.type
            === "checkbox"
              ? input.checked
              : input.value;
        }
      );
  }


  function validateTitleTemplate(
    value
  ) {

    const stripped =
      String(
        value
        || ""
      )
        .replace(
          /\{time\}/g,
          ""
        )
        .replace(
          /\{customer\}/g,
          ""
        );

    return !/[{}]/.test(
      stripped
    );
  }


  function validateThankYouTemplate(
    value
  ) {

    const stripped =
      String(
        value
        || ""
      )
        .replace(
          /\{place\}/g,
          ""
        )
        .replace(
          /\{course\}/g,
          ""
        )
        .replace(
          /\{options_part\}/g,
          ""
        )
        .replace(
          /\{repeat\}/g,
          ""
        )
        .replace(
          /\{body\}/g,
          ""
        )
        .replace(
          /\{signature\}/g,
          ""
        );

    return !/[{}]/.test(
      stripped
    );
  }


  function validate() {

    const settings =
      state.settings;

    if (!settings) {
      return "設定を読み込めていません。";
    }


    if (
      ![
        2,
        3,
        4,
      ].includes(
        settings.basic
          .paragraphs
      )
    ) {
      return "本文段落数を確認してください。";
    }


    if (
      settings.rules
        .minimum_minutes < 1
      ||
      settings.rules
        .minimum_minutes > 600
    ) {
      return "最小受付時間を確認してください。";
    }


    if (
      settings.rules
        .buffer_minutes < 0
      ||
      settings.rules
        .buffer_minutes > 180
    ) {
      return "予約間バッファを確認してください。";
    }


    if (
      settings.title
        .recommended < 1
      ||
      settings.title
        .recommended
        >= settings.title.warning
      ||
      settings.title.warning
        > settings.title.strong
    ) {
      return "タイトル文字数の設定を確認してください。";
    }


    for (
      const [
        key,
        value,
      ]
      of Object.entries(
        settings.title_templates
      )
    ) {

      if (
        !validateTitleTemplate(
          value
        )
      ) {
        return (
          `タイトルテンプレ「${key}」の`
          + "placeholderを確認してください。"
        );
      }
    }


    if (
      !validateThankYouTemplate(
        settings
          .thank_you
          .body_template
      )
    ) {
      return (
        "個別お礼日記の本文テンプレに"
        + "未対応の変数があります。"
      );
    }


    return "";
  }


  function todayString() {

    const now =
      new Date();

    return [
      now.getFullYear(),
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        "0"
      ),
      String(
        now.getDate()
      ).padStart(
        2,
        "0"
      ),
    ].join("-");
  }


  async function loadSettings() {

    if (state.loading) {
      return;
    }

    state.loading =
      true;

    setStatus(
      "本番設定を読み込み中…"
    );


    try {

      const response =
        await fetch(
          SETTINGS_API,
          {
            credentials:
              "same-origin",

            cache:
              "no-store",
          }
        );


      const payload =
        await response.json();


      if (
        !response.ok
        ||
        payload?.success
        !== true
      ) {
        throw new Error(
          payload?.error
          || "設定取得に失敗しました。"
        );
      }


      const settings =
        payload?.data?.settings
        ?? defaults();


      state.settings =
        normalizeLocal(
          settings
        );

      state.dirty =
        false;


      runtime()?.apply(
        state.settings
      );


      render();


      setStatus(
        "✓ 本番設定を読み込みました"
      );

    } catch (error) {

      console.error(
        "Failed to load Heaven settings.",
        error
      );

      state.settings =
        normalizeLocal(
          runtime()?.current
          || defaults()
        );

      render();

      setStatus(
        "⚠ 設定取得に失敗しました。現在値を表示しています。",
        true
      );

    } finally {

      state.loading =
        false;
    }
  }


  function showSavedToast() {

    document
      .getElementById(
        "next-heaven-settings-toast"
      )
      ?.remove();


    const toast =
      document.createElement(
        "div"
      );

    toast.id =
      "next-heaven-settings-toast";

    toast.className =
      "next-heaven-settings-toast";

    toast.textContent =
      "✓ 保存しました";


    document.body.appendChild(
      toast
    );


    requestAnimationFrame(
      () => {
        toast.classList.add(
          "is-visible"
        );
      }
    );


    window.setTimeout(
      () => {
        toast.classList.remove(
          "is-visible"
        );
      },
      1500
    );


    window.setTimeout(
      () => {
        toast.remove();
      },
      1850
    );
  }


  async function saveSettings() {

    collectForm();

    const error =
      validate();

    if (error) {

      setStatus(
        `⚠ ${error}`,
        true
      );

      return;
    }


    const saveButton =
      $(
        "[data-save-heaven-settings]"
      );

    if (saveButton) {
      saveButton.disabled =
        true;
    }

    setStatus(
      "保存中…"
    );


    try {

      const response =
        await fetch(
          SETTINGS_API,
          {
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                settings:
                  state.settings,
              }),
          }
        );


      const payload =
        await response.json();


      if (
        !response.ok
        ||
        payload?.success
        !== true
      ) {
        throw new Error(
          payload?.error
          || "設定保存に失敗しました。"
        );
      }


      state.settings =
        normalizeLocal(
          payload?.data?.settings
          || state.settings
        );

      state.dirty =
        false;


      runtime()?.apply(
        state.settings
      );


      render();

      setStatus(
        "✓ 保存しました"
      );

      showSavedToast();

    } catch (error) {

      console.error(
        "Failed to save Heaven settings.",
        error
      );

      setStatus(
        "⚠ 保存できませんでした",
        true
      );

    } finally {

      if (saveButton) {
        saveButton.disabled =
          false;
      }
    }
  }


  function resetToDefaults() {

    collectForm();


    if (
      !window.confirm(
        "設定フォームを初期値へ戻しますか？"
        + "\n保存するまでは本番DBへ反映されません。"
      )
    ) {
      return;
    }


    state.settings =
      defaults();

    state.dirty =
      true;

    render();

    setStatus(
      "初期値をフォームへ反映しました / 未保存"
    );
  }


  function addPhrase(
    category
  ) {

    collectForm();


    state.settings
      .phrases
      .push({
        id:
          "phrase_"
          + Date.now()
          + "_"
          + Math.random()
            .toString(36)
            .slice(
              2,
              8
            ),

        category,

        text:
          "",

        enabled:
          true,
      });


    markDirty();

    renderPhraseGroups();
  }


  function removePhrase(
    id
  ) {

    collectForm();


    if (
      !window.confirm(
        "このフレーズを削除しますか？"
      )
    ) {
      return;
    }


    state.settings.phrases =
      state.settings
        .phrases
        .filter(
          phrase =>
            phrase.id
            !== id
        );


    markDirty();

    renderPhraseGroups();
  }


  function addOpPhrase() {

    collectForm();


    state.settings
      .op_phrases
      .push({
        id:
          "op_phrase_"
          + Date.now()
          + "_"
          + Math.random()
            .toString(36)
            .slice(
              2,
              7
            ),

        op_name:
          "",

        text:
          "",

        enabled:
          true,
      });


    markDirty();

    renderOpPhrases();
  }


  function removeOpPhrase(
    id
  ) {

    collectForm();


    if (
      !window.confirm(
        "このOPルールを削除しますか？"
      )
    ) {
      return;
    }


    state.settings.op_phrases =
      state.settings
        .op_phrases
        .filter(
          phrase =>
            phrase.id
            !== id
        );


    markDirty();

    renderOpPhrases();
  }


  function expandTitleTemplate(
    value
  ) {

    return String(
      value
      || ""
    )
      .replace(
        /\{time\}/g,
        "18:30"
      )
      .replace(
        /\{customer\}/g,
        "仲良しさん"
      );
  }


  function expandThankYouTemplate(
    value
  ) {

    return String(
      value
      || ""
    )
      .replace(
        /\{place\}/g,
        "ホテルで"
      )
      .replace(
        /\{course\}/g,
        "90"
      )
      .replace(
        /\{options_part\}/g,
        "聖水希望の"
      )
      .replace(
        /\{repeat\}/g,
        "リピの"
      )
      .replace(
        /\{body\}/g,
        "今日も会いに来てくれてありがと♡"
      )
      .replace(
        /\{signature\}/g,
        (
          state.settings
            ?.thank_you
            ?.signature
          || "❄︎こはく❄︎"
        )
      );
  }


  function updatePreview(
    field
  ) {

    const mode =
      $(
        "[data-heaven-preview-mode]"
      );

    const target =
      $(
        "[data-heaven-preview-target]"
      );

    const title =
      $(
        "[data-heaven-preview-title]"
      );

    const body =
      $(
        "[data-heaven-preview-body]"
      );


    if (
      !mode
      || !target
      || !title
      || !body
    ) {
      return;
    }


    if (!field) {

      mode.textContent =
        "通常ヘブン日記";

      target.textContent =
        "設定項目をタップ";

      title.textContent =
        "出勤準備中♡最速18:30〜！";

      body.textContent =
        "設定項目を選ぶと、"
        + "反映イメージをここに表示します。";

      return;
    }


    const titleKey =
      field.dataset
        ?.titleTemplate;


    if (titleKey) {

      const thankYou =
        titleKey.startsWith(
          "thank_you_"
        );


      mode.textContent =
        thankYou
          ? "個別お礼日記"
          : "通常ヘブン日記";

      target.textContent =
        "タイトルテンプレ";

      title.textContent =
        expandTitleTemplate(
          field.value
        )
        || "（未設定）";

      body.textContent =
        thankYou
          ? "予約カードから作るお礼日記のタイトルに反映されます。"
          : "出勤 / 次回予告の生成タイトルに反映されます。";

      return;
    }


    const phraseId =
      field.dataset
        ?.phraseId;


    if (
      phraseId
      &&
      field.type
      !== "checkbox"
    ) {

      const category =
        field.dataset
          .phraseCategory
        || "";

      mode.textContent =
        "通常ヘブン日記";

      target.textContent =
        categoryLabels[
          category
        ]
        || "言い回し辞書";

      title.textContent =
        "生成本文の候補";

      body.textContent =
        field.value
        || "（空のフレーズ）";

      return;
    }


    const thankYouKey =
      field.dataset
        ?.thankYouSetting;


    if (
      thankYouKey
      === "body_template"
    ) {

      mode.textContent =
        "個別お礼日記";

      target.textContent =
        "本文テンプレ";

      title.textContent =
        state.settings
          ?.title_templates
          ?.thank_you_repeat
        || "リピートお礼日記♡♡♡";

      body.textContent =
        expandThankYouTemplate(
          field.value
        );

      return;
    }


    if (
      thankYouKey
      === "signature"
    ) {

      mode.textContent =
        "個別お礼日記";

      target.textContent =
        "署名";

      title.textContent =
        "お礼日記の末尾";

      body.textContent =
        field.value
        || "（署名なし）";

      return;
    }


    if (
      field.dataset
        ?.opPhraseId
    ) {

      mode.textContent =
        "通常ヘブン日記";

      target.textContent =
        "OP別フレーズ";

      title.textContent =
        "対象OPが一致した時";

      body.textContent =
        field.value
        || "OP専用候補を設定";

      return;
    }


    mode.textContent =
      "ヘブン設定";

    target.textContent =
      field.closest(
        ".next-heaven-field"
      )?.querySelector(
        "span"
      )?.textContent
      || "基本設定";

    title.textContent =
      "設定値";

    body.textContent =
      "この値は保存後、"
      + "次回の日記生成から反映されます。";
  }


  view.addEventListener(
    "focusin",
    event => {

      const field =
        event.target.closest(
          "input, textarea, select"
        );

      if (field) {
        updatePreview(
          field
        );
      }
    }
  );


  view.addEventListener(
    "input",
    event => {

      if (
        event.target.matches(
          "input, textarea, select"
        )
      ) {

        markDirty();

        updatePreview(
          event.target
        );
      }
    }
  );


  view.addEventListener(
    "change",
    event => {

      if (
        event.target.matches(
          "input, textarea, select"
        )
      ) {

        markDirty();

        updatePreview(
          event.target
        );
      }
    }
  );


  view.addEventListener(
    "click",
    event => {

      const addPhraseButton =
        event.target.closest(
          "[data-add-phrase-category]"
        );

      if (addPhraseButton) {

        addPhrase(
          addPhraseButton.dataset
            .addPhraseCategory
        );

        return;
      }


      const removePhraseButton =
        event.target.closest(
          "[data-remove-phrase-id]"
        );

      if (removePhraseButton) {

        removePhrase(
          removePhraseButton.dataset
            .removePhraseId
        );

        return;
      }


      if (
        event.target.closest(
          "[data-add-op-phrase]"
        )
      ) {

        addOpPhrase();

        return;
      }


      const removeOpButton =
        event.target.closest(
          "[data-remove-op-phrase-id]"
        );

      if (removeOpButton) {

        removeOpPhrase(
          removeOpButton.dataset
            .removeOpPhraseId
        );

        return;
      }


      if (
        event.target.closest(
          "[data-save-heaven-settings]"
        )
      ) {

        void saveSettings();

        return;
      }


      if (
        event.target.closest(
          "[data-reset-heaven-settings]"
        )
      ) {

        resetToDefaults();
      }
    }
  );


  document.addEventListener(
    "click",
    event => {

      if (
        event.target.closest(
          '[data-next-view="heaven-settings"]'
        )
      ) {

        window.setTimeout(
          () => {
            void loadSettings();
          },
          0
        );
      }
    }
  );


  if (
    view.classList.contains(
      "is-active"
    )
  ) {
    void loadSettings();
  }

})();
