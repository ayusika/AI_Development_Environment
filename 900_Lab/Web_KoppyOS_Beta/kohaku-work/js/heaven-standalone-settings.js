/* ========================================
   STANDALONE HEAVEN SETTINGS
======================================== */

const heavenStandaloneSettingsApiUrl = '/api/v1/heaven-diary-settings.php';
const heavenStandaloneUsageApiUrl = '/api/v1/heaven-diary-phrase-usage.php';

const heavenStandaloneDefaultSettings = {
  basic: {
    signature: '❄︎こはく❄︎',
    avoid_same_day: true,
    reroll_enabled: true,
    paragraphs: 3,
  },
  rules: { minimum_minutes: 60, buffer_minutes: 15 },
  title: { recommended: 23, warning: 24, strong: 28 },
  phrases: [
    { id: 'attendance_empty_1', category: 'attendance_empty', text: 'ただいま出勤準備中♡', enabled: true },
    { id: 'attendance_empty_2', category: 'attendance_empty', text: '今日も元気にがんばるよー！！', enabled: true },
    { id: 'attendance_new_1', category: 'attendance_new', text: 'スタートからはじめましてさんよろしくね♡', enabled: true },
    { id: 'attendance_new_2', category: 'attendance_new', text: '最初からお兄さんありがと♡', enabled: true },
    { id: 'attendance_repeat_1', category: 'attendance_repeat', text: 'スタートから仲良しさんありがと♡', enabled: true },
    { id: 'attendance_repeat_2', category: 'attendance_repeat', text: '最初から仲良しさんうれしい♡', enabled: true },
    { id: 'attendance_start_open_1', category: 'attendance_start_open', text: 'スタートはまだ空いてるよ☆', enabled: true },
    { id: 'attendance_start_open_2', category: 'attendance_start_open', text: '最初の時間もお誘いまってるね♡', enabled: true },
    { id: 'attendance_invite_1', category: 'attendance_invite', text: 'どしどしお誘いまってるからね♡', enabled: true },
    { id: 'attendance_invite_2', category: 'attendance_invite', text: 'いっぱい楽しもー☺️', enabled: true },
    { id: 'attendance_last_1', category: 'attendance_last', text: 'ラスト1枠もよろしくね♡', enabled: true },
    { id: 'attendance_last_2', category: 'attendance_last', text: '最後までえっちなお誘い大歓迎♪', enabled: true },
    { id: 'attendance_consultation_1', category: 'attendance_consultation', text: 'まだ続けるよー！要相談♡', enabled: true },
    { id: 'attendance_consultation_2', category: 'attendance_consultation', text: 'まだまだ要相談でまってるね♡', enabled: true },
    { id: 'attendance_finished_1', category: 'attendance_finished', text: '本日終了！今日もありがと♡', enabled: true },
    { id: 'attendance_finished_2', category: 'attendance_finished', text: '今日はおしまい。また遊んでね☺️', enabled: true },
    { id: 'next_new_1', category: 'next_new', text: 'お兄さんありがと♡', enabled: true },
    { id: 'next_new_2', category: 'next_new', text: 'はじめましてさんありがとー♡', enabled: true },
    { id: 'next_repeat_1', category: 'next_repeat', text: '仲良しさんありがと♡', enabled: true },
    { id: 'next_repeat_2', category: 'next_repeat', text: 'また会えるのうれしい♡', enabled: true },
    { id: 'next_fun_1', category: 'next_fun', text: '会えるの楽しみ♡', enabled: true },
    { id: 'next_fun_2', category: 'next_fun', text: 'いっぱい楽しもー☺️', enabled: true },

    { id: 'next_op_generic_1', category: 'next_op_generic', text: '{op}つけてくれたから楽しみ☺️', enabled: true },
    { id: 'next_op_generic_2', category: 'next_op_generic', text: '{op}ありがと♡いっぱい楽しもー！', enabled: true },

    { id: 'next_invite_1', category: 'next_invite', text: 'どんどんお誘いまってるよー！', enabled: true },
    { id: 'next_invite_2', category: 'next_invite', text: 'まだまだえっちなお誘い大歓迎♪', enabled: true },
    { id: 'next_last_1', category: 'next_last', text: 'ラスト1枠よろしくね♡', enabled: true },
    { id: 'next_last_2', category: 'next_last', text: '最後の1枠も楽しもうね☺️', enabled: true },
    { id: 'next_consultation_1', category: 'next_consultation', text: '要相談でまってるね♡', enabled: true },
    { id: 'next_consultation_2', category: 'next_consultation', text: 'まだ続けるよー！要相談♡', enabled: true },
    { id: 'next_finished_1', category: 'next_finished', text: '今日もありがと♡', enabled: true },
    { id: 'next_finished_2', category: 'next_finished', text: 'また遊びにきてね☺️', enabled: true },
    { id: 'common_close_1', category: 'common_close', text: 'どしどしお誘いまってるよー！', enabled: true },
    { id: 'common_close_2', category: 'common_close', text: '❄︎こはく❄︎', enabled: true },
    { id: 'common_close_3', category: 'common_close', text: 'いっぱいえちえちしちゃおー！', enabled: true },
  ],
  op_phrases: [],

  thank_you: {
    body_template:
      'さっき{place}{course}分{options_part}{repeat}お兄さん♡\n\n\n{body}\n\n\n{signature}',

    signature:
      '❄︎こはく❄︎',
  },

  title_templates: {
    attendance_empty: '出勤準備中♡',
    attendance_available: '出勤準備中♡最速{time}〜！',
    attendance_last: '出勤準備中♡{time}〜ラスト1枠！',
    attendance_consultation: '出勤準備中♡{time}〜要相談',
    attendance_finished: '本日終了！',
    next_new: '{customer}ありがと♡最速{time}〜！',
    next_repeat: '{customer}ありがと♡最速{time}〜！',
    next_sequence_2: '連続ありがと♡最速{time}〜！',
    next_sequence_3: '3連続ありがと♡最速{time}〜！',
    next_last: '{customer}♡{time}〜ラスト1枠！',
    next_consultation: '次回{time}〜要相談♡',

    thank_you_new:
      'お礼日記♡',

    thank_you_repeat:
      'リピートお礼日記♡♡♡',
  },
};

function isLegacyHeavenSignaturePhrase(phrase) {
  return Boolean(
    phrase
    && phrase.id === 'common_close_2'
    && phrase.category === 'common_close'
    && phrase.text === '❄︎こはく❄︎'
  );
}

function cloneHeavenStandaloneDefaults() {
  const defaults =
    JSON.parse(
      JSON.stringify(
        heavenStandaloneDefaultSettings
      )
    );

  defaults.phrases =
    defaults.phrases.filter(
      (phrase) =>
        !isLegacyHeavenSignaturePhrase(phrase)
    );

  return defaults;
}

function normalizeHeavenStandaloneSettings(value) {
  const defaults = cloneHeavenStandaloneDefaults();

  if (!value || typeof value !== 'object') {
    return defaults;
  }

  const merged = {
    ...defaults,
    ...value,
    basic: {
      ...defaults.basic,
      ...(value.basic || {}),
    },
    rules: {
      ...defaults.rules,
      ...(value.rules || {}),
    },
    title: {
      ...defaults.title,
      ...(value.title || {}),
    },

    thank_you: {
      ...defaults.thank_you,
      ...(value.thank_you || {}),
    },

    phrases:
      Array.isArray(value.phrases)
        ? value.phrases
        : defaults.phrases,

    op_phrases:
      Array.isArray(value.op_phrases)
        ? value.op_phrases
        : [],

    title_templates: {
      ...defaults.title_templates,
      ...(value.title_templates || {}),
    },
  };

  merged.phrases =
    merged.phrases.filter(
      (phrase) =>
        !isLegacyHeavenSignaturePhrase(phrase)
    );

  merged.rules.minimum_minutes =
    Math.min(
      600,
      Math.max(
        1,
        Number(
          merged.rules.minimum_minutes
        ) || 60
      )
    );

  merged.rules.buffer_minutes =
    Math.min(
      180,
      Math.max(
        0,
        Number(
          merged.rules.buffer_minutes
        ) || 0
      )
    );

  merged.basic.paragraphs =
    [2, 3, 4].includes(
      Number(
        merged.basic.paragraphs
      )
    )
      ? Number(
        merged.basic.paragraphs
      )
      : 3;

  return merged;
}

function validateHeavenTemplate(value) {
  return !/[{}]/.test(String(value || '').replace(/\{(time|customer)\}/g, ''));
}

function renderHeavenSettingsPhraseList(container, category, settings) {
  container.replaceChildren();
  settings.phrases.filter((phrase) => phrase.category === category).forEach((phrase) => {
    const row = document.createElement('div');
    row.className = 'heaven-settings-phrase-row';
    const input = document.createElement('input');
    input.className = 'text-input';
    input.value = phrase.text;
    input.dataset.phraseId = phrase.id;
    input.dataset.phraseCategory = category;
    const enabled = document.createElement('input');
    enabled.type = 'checkbox';
    enabled.checked = phrase.enabled;
    enabled.dataset.phraseId = phrase.id;
    enabled.setAttribute('aria-label', 'このフレーズを使う');
    const remove = document.createElement('button');
    remove.className = 'text-button';
    remove.type = 'button';
    remove.textContent = '削除';
    remove.dataset.removePhraseId = phrase.id;
    row.append(input, enabled, remove);
    container.append(row);
  });
}

function renderHeavenSettingsOpList(container, settings) {
  container.replaceChildren();
  settings.op_phrases.forEach((phrase) => {
    const row = document.createElement('div');
    row.className = 'heaven-settings-phrase-row';
    const opName = document.createElement('input'); opName.className = 'text-input'; opName.placeholder = 'OP名'; opName.value = phrase.op_name; opName.dataset.opPhraseId = phrase.id; opName.dataset.opField = 'op_name';
    const text = document.createElement('input'); text.className = 'text-input'; text.placeholder = 'フレーズ'; text.value = phrase.text; text.dataset.opPhraseId = phrase.id; text.dataset.opField = 'text';
    const enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.checked = phrase.enabled; enabled.dataset.opPhraseId = phrase.id; enabled.dataset.opField = 'enabled';
    const remove = document.createElement('button'); remove.className = 'text-button'; remove.type = 'button'; remove.textContent = '削除'; remove.dataset.removeOpPhraseId = phrase.id;
    row.append(opName, text, enabled, remove); container.append(row);
  });
}

function initializeHeavenSettingsUi() {
  const view = document.getElementById('view-heaven-settings');
  if (!view || view.dataset.bound === 'true') return;
  view.dataset.bound = 'true';
  const state = { settings: cloneHeavenStandaloneDefaults(), dirty: false };
  const status = view.querySelector('[data-heaven-settings-status]');
  const categories = [
    ['attendance_empty', '出勤・予約なし'], ['attendance_new', '出勤・新規'],
    ['attendance_repeat', '出勤・リピ'], ['attendance_start_open', '出勤・スタート空き'],
    ['attendance_invite', '出勤・通常のお誘い'], ['attendance_last', '出勤・ラスト1枠'],
    ['attendance_consultation', '出勤・要相談'], ['attendance_finished', '出勤・本日終了'],
    ['next_new', '次回・新規'], ['next_repeat', '次回・リピ'], ['next_fun', '次回・楽しみ'],
    ['next_op_generic', '次回・OPあり汎用'],
    ['next_invite', '次回・お誘い'], ['next_last', '次回・ラスト1枠'],
    ['next_consultation', '次回・要相談'], ['next_finished', '次回・本日終了'],
    ['common_close', '共通・締め文'],
  ];
  const render = () => {
    categories.forEach(([category]) => renderHeavenSettingsPhraseList(view.querySelector(`[data-phrase-list="${category}"]`), category, state.settings));
    view.querySelector('[name="signature"]').value = state.settings.basic.signature;
    view.querySelector('[name="avoid_same_day"]').checked = state.settings.basic.avoid_same_day;
    view.querySelector('[name="reroll_enabled"]').checked = state.settings.basic.reroll_enabled;
    view.querySelector('[name="paragraphs"]').value = String(state.settings.basic.paragraphs);
    view.querySelector('[name="minimum_minutes"]').value = String(state.settings.rules.minimum_minutes);
    view.querySelector('[name="buffer_minutes"]').value = String(state.settings.rules.buffer_minutes);
    view.querySelector('[name="title_recommended"]').value = String(state.settings.title.recommended);
    view.querySelector('[name="title_warning"]').value = String(state.settings.title.warning);
    view.querySelector('[name="title_strong"]').value = String(state.settings.title.strong);
    Object.entries(state.settings.title_templates).forEach(([key, value]) => {
      const input = view.querySelector(`[data-title-template="${key}"]`);
      if (input) input.value = value;
    });

    view
      .querySelectorAll(
        '[data-thank-you-setting]'
      )
      .forEach(
        (input) => {

          const key =
            input.dataset
              .thankYouSetting;

          if (
            !key
            || !Object.prototype.hasOwnProperty.call(
              state.settings.thank_you,
              key
            )
          ) {
            return;
          }

          input.value =
            String(
              state.settings
                .thank_you[
                  key
                ]
              ?? ''
            );
        }
      );

    renderHeavenSettingsOpList(view.querySelector('[data-op-phrase-list]'), state.settings);
  };
  const markDirty = () => { state.dirty = true; if (status) status.textContent = '変更あり'; };
  view.addEventListener('input', markDirty);
  view.addEventListener('change', markDirty);
  view.addEventListener('click', (event) => {
    const add = event.target.closest('[data-add-phrase-category]');
    if (add) {
      state.settings.phrases.push({ id: `phrase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, category: add.dataset.addPhraseCategory, text: '', enabled: true });
      render(); markDirty();
    }
    const remove = event.target.closest('[data-remove-phrase-id]');
    if (remove && window.confirm('このフレーズを削除しますか？')) {
      state.settings.phrases = state.settings.phrases.filter((phrase) => phrase.id !== remove.dataset.removePhraseId);
      render(); markDirty();
    }
    const addOp = event.target.closest('[data-add-op-phrase]');
    if (addOp) {
      state.settings.op_phrases.push({ id: `op_phrase_${Date.now()}`, op_name: '', text: '', enabled: true });
      render(); markDirty();
    }
    const removeOp = event.target.closest('[data-remove-op-phrase-id]');
    if (removeOp && window.confirm('このOPルールを削除しますか？')) {
      state.settings.op_phrases = state.settings.op_phrases.filter((phrase) => phrase.id !== removeOp.dataset.removeOpPhraseId);
      render(); markDirty();
    }
    if (event.target.closest('[data-save-heaven-settings]')) void save();
    if (event.target.closest('[data-reset-heaven-settings]') && window.confirm('写メ日記設定を初期値へ戻しますか？')) {
      state.settings = cloneHeavenStandaloneDefaults(); render(); markDirty();
    }
  });
  async function save() {
    const minimum = Number(view.querySelector('[name="minimum_minutes"]').value);
    const buffer = Number(view.querySelector('[name="buffer_minutes"]').value);
    const recommended = Number(view.querySelector('[name="title_recommended"]').value);
    const warning = Number(view.querySelector('[name="title_warning"]').value);
    const strong = Number(view.querySelector('[name="title_strong"]').value);
    if (recommended >= warning || warning > strong || minimum < 1 || minimum > 600 || buffer < 0 || buffer > 180) {
      if (status) status.textContent = '⚠ 設定値を確認してください'; return;
    }
    for (const input of view.querySelectorAll('[data-title-template]')) {
      if (!validateHeavenTemplate(input.value)) { if (status) status.textContent = '⚠ タイトルplaceholderを確認してください'; return; }
    }
    state.settings.basic = { signature: view.querySelector('[name="signature"]').value, avoid_same_day: view.querySelector('[name="avoid_same_day"]').checked, reroll_enabled: view.querySelector('[name="reroll_enabled"]').checked, paragraphs: Number(view.querySelector('[name="paragraphs"]').value) };
    state.settings.rules = { minimum_minutes: minimum, buffer_minutes: buffer };
    state.settings.title = { recommended, warning, strong };

    view
      .querySelectorAll(
        '[data-thank-you-setting]'
      )
      .forEach(
        (input) => {

          const key =
            input.dataset
              .thankYouSetting;

          if (!key) {
            return;
          }

          state.settings
            .thank_you[
              key
            ] =
            input.value;
        }
      );

    view.querySelectorAll('[data-phrase-id]').forEach((input) => {
      const phrase = state.settings.phrases.find((item) => item.id === input.dataset.phraseId);
      if (!phrase) return;
      if (input.type === 'checkbox') phrase.enabled = input.checked; else phrase.text = input.value;
    });
    view.querySelectorAll('[data-op-phrase-id]').forEach((input) => {
      const phrase = state.settings.op_phrases.find((item) => item.id === input.dataset.opPhraseId);
      if (phrase) phrase[input.dataset.opField] = input.type === 'checkbox' ? input.checked : input.value;
    });
    view.querySelectorAll('[data-title-template]').forEach((input) => { state.settings.title_templates[input.dataset.titleTemplate] = input.value; });
    if (status) status.textContent = '保存中…';
    try {
      const response = await fetch(heavenStandaloneSettingsApiUrl, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ settings: state.settings }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error('save failed');
      state.settings =
        normalizeHeavenStandaloneSettings(
          payload.data.settings
        );

      state.dirty =
        false;

      if (status) {
        status.textContent =
          '✓ 保存しました';
      }

      window.KohakuHeavenSettings?.apply(
        state.settings
      );


      const saveButton =
        view.querySelector(
          '[data-save-heaven-settings]'
        );


      if (saveButton) {

        document
          .getElementById(
            'heaven-settings-save-popup'
          )
          ?.remove();


        const popup =
          document.createElement(
            'div'
          );


        popup.id =
          'heaven-settings-save-popup';

        popup.textContent =
          '✓ 保存しました';


        Object.assign(
          popup.style,
          {
            position:
              'fixed',

            zIndex:
              '9999',

            padding:
              '8px 14px',

            borderRadius:
              '999px',

            background:
              'rgba(55, 181, 226, 0.96)',

            color:
              '#ffffff',

            fontSize:
              '13px',

            fontWeight:
              '700',

            lineHeight:
              '1',

            boxShadow:
              '0 6px 20px rgba(28, 117, 156, 0.22)',

            opacity:
              '0',

            transform:
              'translateY(4px)',

            transition:
              'opacity 160ms ease, transform 160ms ease',

            pointerEvents:
              'none',
          }
        );


        document.body.appendChild(
          popup
        );


        const buttonRect =
          saveButton.getBoundingClientRect();

        const popupRect =
          popup.getBoundingClientRect();


        const left =
          Math.min(
            window.innerWidth
            - popupRect.width
            - 12,

            Math.max(
              12,

              buttonRect.left
              + (
                buttonRect.width
                - popupRect.width
              ) / 2
            )
          );


        const top =
          Math.max(
            12,

            buttonRect.top
            - popupRect.height
            - 10
          );


        popup.style.left =
          `${left}px`;

        popup.style.top =
          `${top}px`;


        requestAnimationFrame(
          () => {

            popup.style.opacity =
              '1';

            popup.style.transform =
              'translateY(0)';
          }
        );


        window.setTimeout(
          () => {

            popup.style.opacity =
              '0';

            popup.style.transform =
              'translateY(-3px)';
          },
          1500
        );


        window.setTimeout(
          () => {

            popup.remove();
          },
          1800
        );
      }
    } catch (error) { console.error('Failed to save Heaven settings.', error); if (status) status.textContent = '⚠ 保存できませんでした'; }
  }
  window.KohakuHeavenSettingsUi = { open: async () => { try { const response = await fetch(heavenStandaloneSettingsApiUrl, { credentials: 'same-origin', cache: 'no-store' }); const payload = await response.json(); if (response.ok && payload.success && payload.data.settings) state.settings = normalizeHeavenStandaloneSettings(payload.data.settings); } catch (error) { console.error('Failed to load Heaven settings.', error); } render(); showView('heavenSettings'); } };
  render();
}

window.KohakuHeavenSettings = {
  defaults: cloneHeavenStandaloneDefaults(),
  current: cloneHeavenStandaloneDefaults(),
  usage: new Set(),
  apply(settings) { this.current = normalizeHeavenStandaloneSettings(settings); },
  async load(businessDate) {
    try {
      const [settingsResponse, usageResponse] = await Promise.all([
        fetch(heavenStandaloneSettingsApiUrl, { credentials: 'same-origin', cache: 'no-store' }),
        fetch(`${heavenStandaloneUsageApiUrl}?business_date=${encodeURIComponent(businessDate)}`, { credentials: 'same-origin', cache: 'no-store' }),
      ]);
      const settingsPayload = await settingsResponse.json();
      const usagePayload = await usageResponse.json();
      if (settingsResponse.ok && settingsPayload.success && settingsPayload.data.settings) this.apply(settingsPayload.data.settings);
      if (usageResponse.ok && usagePayload.success) this.usage = new Set((usagePayload.data.usage || []).map((item) => item.phrase_id));
      return this.current;
    } catch (error) { console.error('Failed to load Heaven settings.', error); return this.current; }
  },
  pick(category, recent = []) {
    const candidates = this.current.phrases.filter((phrase) => phrase.category === category && phrase.enabled && phrase.text.trim());
    if (!candidates.length) return { text: '', phrase_id: '' };
    const fresh = this.current.basic.avoid_same_day ? candidates.filter((phrase) => !this.usage.has(phrase.id)) : candidates;
    const pool = (this.current.basic.reroll_enabled ? fresh.filter((phrase) => !recent.includes(phrase.id)) : fresh);
    const selected = (pool.length ? pool : fresh.length ? fresh : candidates)[Math.floor(Math.random() * (pool.length ? pool : fresh.length ? fresh : candidates).length)];
    return { text: selected.text, phrase_id: selected.id };
  },
  async record(businessDate, phrases) {
    const valid = phrases.filter((phrase) => phrase?.phrase_id);
    if (!valid.length) return;
    try { await fetch(heavenStandaloneUsageApiUrl + `?business_date=${encodeURIComponent(businessDate)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ phrases: valid }) }); valid.forEach((phrase) => this.usage.add(phrase.phrase_id)); } catch (error) { console.error('Failed to record Heaven phrase usage.', error); }
  },
};

window.addEventListener('load', initializeHeavenSettingsUi);

/* ========================================
   HEAVEN SETTINGS LIVE PREVIEW
======================================== */

const heavenSettingsPreviewPhraseMeta = {

  attendance_empty: {
    mode:
      '通常ヘブン日記・出勤',

    target:
      '本文 / 予約なし時',

    line:
      0,

    title:
      '出勤準備中♡',
  },

  attendance_new: {
    mode:
      '通常ヘブン日記・出勤',

    target:
      '本文 / 新規のお客様へのお礼',

    line:
      0,

    title:
      '出勤準備中♡最速18:30〜！',
  },

  attendance_repeat: {
    mode:
      '通常ヘブン日記・出勤',

    target:
      '本文 / リピのお客様へのお礼',

    line:
      0,

    title:
      '出勤準備中♡最速18:30〜！',
  },

  attendance_start_open: {
    mode:
      '通常ヘブン日記・出勤',

    target:
      '本文 / スタート空き案内',

    line:
      2,

    title:
      '出勤準備中♡最速18:30〜！',
  },

  attendance_invite: {
    mode:
      '通常ヘブン日記・出勤',

    target:
      '本文 / お誘い・締め',

    line:
      2,

    title:
      '出勤準備中♡最速18:30〜！',
  },

  attendance_last: {
    mode:
      '通常ヘブン日記・出勤',

    target:
      '本文 / ラスト1枠案内',

    line:
      2,

    title:
      '出勤準備中♡21:00〜ラスト1枠！',
  },

  attendance_consultation: {
    mode:
      '通常ヘブン日記・出勤',

    target:
      '本文 / 要相談案内',

    line:
      2,

    title:
      '出勤準備中♡23:00〜要相談',
  },

  attendance_finished: {
    mode:
      '通常ヘブン日記・出勤',

    target:
      '本文 / 本日終了時',

    line:
      2,

    title:
      '本日終了！',
  },

  next_new: {
    mode:
      '通常ヘブン日記・次回予告',

    target:
      '本文 / 新規のお客様へのお礼',

    line:
      0,

    title:
      'お兄さんありがと♡最速18:30〜！',
  },

  next_repeat: {
    mode:
      '通常ヘブン日記・次回予告',

    target:
      '本文 / リピのお客様へのお礼',

    line:
      0,

    title:
      '仲良しさんありがと♡最速18:30〜！',
  },

  next_fun: {
    mode:
      '通常ヘブン日記・次回予告',

    target:
      '本文 / 楽しみ文',

    line:
      1,

    title:
      '仲良しさんありがと♡最速18:30〜！',
  },

  next_op_generic: {
    mode:
      '通常ヘブン日記・次回予告',

    target:
      '本文 / OPあり時の文章',

    line:
      1,

    title:
      '仲良しさんありがと♡最速18:30〜！',
  },

  next_invite: {
    mode:
      '通常ヘブン日記・次回予告',

    target:
      '本文 / お誘い・締め',

    line:
      2,

    title:
      '仲良しさんありがと♡最速18:30〜！',
  },

  next_last: {
    mode:
      '通常ヘブン日記・次回予告',

    target:
      '本文 / ラスト1枠案内',

    line:
      2,

    title:
      '仲良しさん♡21:00〜ラスト1枠！',
  },

  next_consultation: {
    mode:
      '通常ヘブン日記・次回予告',

    target:
      '本文 / 要相談案内',

    line:
      2,

    title:
      '次回23:00〜要相談♡',
  },

  next_finished: {
    mode:
      '通常ヘブン日記・次回予告',

    target:
      '本文 / 本日終了時',

    line:
      2,

    title:
      '本日終了！',
  },

  common_close: {
    mode:
      '通常ヘブン日記・共通',

    target:
      '本文 / 共通の締め候補',

    line:
      2,

    title:
      '仲良しさんありがと♡最速18:30〜！',
  },
};


const heavenSettingsPreviewTitleMeta = {

  attendance_available: {
    mode:
      '通常ヘブン日記・出勤',

    target:
      'タイトル / 通常空き',
  },

  attendance_last: {
    mode:
      '通常ヘブン日記・出勤',

    target:
      'タイトル / ラスト1枠',
  },

  attendance_consultation: {
    mode:
      '通常ヘブン日記・出勤',

    target:
      'タイトル / 要相談',
  },

  next_new: {
    mode:
      '通常ヘブン日記・次回予告',

    target:
      'タイトル / 新規',
  },

  next_repeat: {
    mode:
      '通常ヘブン日記・次回予告',

    target:
      'タイトル / リピ',
  },

  next_last: {
    mode:
      '通常ヘブン日記・次回予告',

    target:
      'タイトル / ラスト1枠',
  },

  next_consultation: {
    mode:
      '通常ヘブン日記・次回予告',

    target:
      'タイトル / 要相談',
  },

  thank_you_new: {
    mode:
      '個別お礼日記',

    target:
      '予約カード / 新規タイトル',

    thankYou:
      true,
  },

  thank_you_repeat: {
    mode:
      '個別お礼日記',

    target:
      '予約カード / リピタイトル',

    thankYou:
      true,
  },
};


function heavenSettingsPreviewExpandTemplate(
  value
) {

  return String(
    value
    || ''
  )
    .replace(
      /\{time\}/g,
      '18:30'
    )
    .replace(
      /\{customer\}/g,
      '仲良しさん'
    );
}


function heavenSettingsPreviewSetTitle(
  element,
  text,
  highlighted = false
) {

  if (!element) {
    return;
  }


  element.replaceChildren();


  if (!highlighted) {

    element.textContent =
      text;

    return;
  }


  const mark =
    document.createElement(
      'mark'
    );


  mark.textContent =
    text;


  element.appendChild(
    mark
  );
}


function heavenSettingsPreviewSetBody(
  element,
  lines,
  highlightedLine = -1
) {

  if (!element) {
    return;
  }


  element.replaceChildren();


  lines.forEach(
    (
      line,
      index
    ) => {

      const paragraph =
        document.createElement(
          'p'
        );


      if (
        index
        === highlightedLine
      ) {

        const mark =
          document.createElement(
            'mark'
          );


        mark.textContent =
          line;


        paragraph.appendChild(
          mark
        );

      } else {

        paragraph.textContent =
          line;
      }


      element.appendChild(
        paragraph
      );
    }
  );
}


function heavenSettingsPreviewShowForField(
  field
) {

  const view =
    field.closest(
      '#view-heaven-settings'
    );


  if (!view) {
    return;
  }


  const preview =
    view.querySelector(
      '[data-heaven-settings-preview]'
    );

  const modeElement =
    view.querySelector(
      '[data-heaven-preview-mode]'
    );

  const targetElement =
    view.querySelector(
      '[data-heaven-preview-target]'
    );

  const titleElement =
    view.querySelector(
      '[data-heaven-preview-title]'
    );

  const bodyElement =
    view.querySelector(
      '[data-heaven-preview-body]'
    );


  if (!preview) {
    return;
  }


  let mode =
    '通常ヘブン日記';

  let target =
    '設定の反映先';

  let title =
    '出勤準備中♡最速18:30〜！';

  let lines = [
    'スタートから仲良しさんありがと♡',
    '聖水つけてくれたから楽しみ☺️',
    'どしどしお誘いまってるよー！',
  ];

  let highlightedLine =
    -1;

  let highlightTitle =
    false;

  let thankYou =
    false;


  const titleTemplate =
    field.dataset
      .titleTemplate;


  if (titleTemplate) {

    const meta =
      heavenSettingsPreviewTitleMeta[
        titleTemplate
      ];


    if (meta) {

      mode =
        meta.mode;

      target =
        meta.target;

      thankYou =
        Boolean(
          meta.thankYou
        );
    }


    title =
      heavenSettingsPreviewExpandTemplate(
        field.value
      )
      || '（タイトル未設定）';


    highlightTitle =
      true;


    if (thankYou) {

      lines = [
        titleTemplate
          === 'thank_you_repeat'
          ? '仲良しさん今日もありがと♡'
          : '今日は会いに来てくれてありがと♡',

        'いっぱい楽しかったよ☺️',

        'また会えるの楽しみにしてるね♡',
      ];
    }


    preview.classList.toggle(
      'is-thank-you',
      thankYou
    );


    if (modeElement) {
      modeElement.textContent =
        mode;
    }


    if (targetElement) {
      targetElement.textContent =
        target;
    }


    heavenSettingsPreviewSetTitle(
      titleElement,
      title,
      highlightTitle
    );


    heavenSettingsPreviewSetBody(
      bodyElement,
      lines,
      highlightedLine
    );


    return;
  }


  const phraseCategory =
    field.dataset
      .phraseCategory;


  if (phraseCategory) {

    const meta =
      heavenSettingsPreviewPhraseMeta[
        phraseCategory
      ];


    if (meta) {

      mode =
        meta.mode;

      target =
        meta.target;

      title =
        meta.title;

      highlightedLine =
        meta.line;
    }


    const phraseText =
      String(
        field.value
        || ''
      ).trim()
      || '（この候補は空欄です）';


    lines[
      Math.max(
        0,
        highlightedLine
      )
    ] =
      phraseText;


    preview.classList.remove(
      'is-thank-you'
    );


    if (modeElement) {
      modeElement.textContent =
        mode;
    }


    if (targetElement) {
      targetElement.textContent =
        target;
    }


    heavenSettingsPreviewSetTitle(
      titleElement,
      title
    );


    heavenSettingsPreviewSetBody(
      bodyElement,
      lines,
      highlightedLine
    );


    return;
  }


  const opField =
    field.dataset
      .opField;


  if (opField) {

    const row =
      field.closest(
        '.heaven-settings-phrase-row'
      );

    const opNameInput =
      row
        ?.querySelector(
          '[data-op-field="op_name"]'
        );

    const opTextInput =
      row
        ?.querySelector(
          '[data-op-field="text"]'
        );


    const opName =
      String(
        opNameInput
          ?.value
        || 'OP名'
      ).trim()
      || 'OP名';

    const opText =
      String(
        opTextInput
          ?.value
        || 'OPフレーズ'
      ).trim()
      || 'OPフレーズ';


    mode =
      '通常ヘブン日記・次回予告';

    target =
      opField
      === 'op_name'
        ? `使用条件 / OP「${opName}」`
        : '本文 / OP別フレーズ';


    title =
      '仲良しさんありがと♡最速18:30〜！';

    lines = [
      '仲良しさん今日もありがと♡',
      opText,
      'どんどんお誘いまってるよー！',
    ];


    preview.classList.remove(
      'is-thank-you'
    );


    if (modeElement) {
      modeElement.textContent =
        mode;
    }


    if (targetElement) {
      targetElement.textContent =
        target;
    }


    heavenSettingsPreviewSetTitle(
      titleElement,
      title
    );


    heavenSettingsPreviewSetBody(
      bodyElement,
      lines,
      1
    );


    return;
  }


  switch (
    field.name
  ) {

    case 'signature':

      mode =
        '通常ヘブン日記';

      target =
        '本文 / 最後に付く署名';

      lines = [
        'スタートから仲良しさんありがと♡',
        'いっぱい楽しもー☺️',
        'どしどしお誘いまってるよー！',
        String(
          field.value
          || ''
        )
        || '（署名なし）',
      ];

      highlightedLine =
        3;

      break;


    case 'paragraphs':

      mode =
        '通常ヘブン日記';

      target =
        `本文 / ${field.value}段落に整形`;

      lines = [
        '文章の内容はそのままで、',
        `最終的に${field.value}段落へ組み直します。`,
        '署名も段落構成に合わせて配置されます。',
      ];

      break;


    case 'minimum_minutes':

      mode =
        '通常ヘブン日記・受付計算';

      target =
        `次回受付計算 / 最小${field.value || 60}分`;

      title =
        '例：最速18:30〜！';

      lines = [
        '本文へ直接入る文章ではありません。',
        '次に受付できる時刻の計算へ反映されます。',
      ];

      break;


    case 'buffer_minutes':

      mode =
        '通常ヘブン日記・受付計算';

      target =
        `次回受付計算 / バッファ${field.value || 0}分`;

      title =
        '例：最速18:30〜！';

      lines = [
        '予約と予約の間に必要な余白です。',
        '「最速○○〜」の判定へ反映されます。',
      ];

      break;


    case 'title_recommended':
    case 'title_warning':
    case 'title_strong':

      mode =
        '通常ヘブン日記・タイトル';

      target =
        'タイトル / 文字数カウンター・警告';

      title =
        '仲良しさんありがと♡最速18:30〜！';

      lines = [
        'タイトル本文そのものは変わりません。',
        '入力中の文字数表示と警告タイミングに反映されます。',
      ];

      highlightTitle =
        true;

      break;


    case 'avoid_same_day':

      mode =
        '通常ヘブン日記・候補選択';

      target =
        '言い回し候補の選び方';

      lines = [
        '本文へ直接表示される値ではありません。',
        '同じ日に同じフレーズが続くのを避ける設定です。',
      ];

      break;


    case 'reroll_enabled':

      mode =
        '通常ヘブン日記・候補選択';

      target =
        '作り直し時の候補選択';

      lines = [
        '本文へ直接表示される値ではありません。',
        '押し直した時に別候補を優先する設定です。',
      ];

      break;


    default:

      return;
  }


  preview.classList.remove(
    'is-thank-you'
  );


  if (modeElement) {
    modeElement.textContent =
      mode;
  }


  if (targetElement) {
    targetElement.textContent =
      target;
  }


  heavenSettingsPreviewSetTitle(
    titleElement,
    title,
    highlightTitle
  );


  heavenSettingsPreviewSetBody(
    bodyElement,
    lines,
    highlightedLine
  );
}


function heavenSettingsPreviewHandleEvent(
  event
) {

  let field =
    event.target;


  if (
    !(
      field
      instanceof HTMLInputElement
    )
    && !(
      field
      instanceof HTMLSelectElement
    )
  ) {
    return;
  }


  if (
    !field.closest(
      '#view-heaven-settings'
    )
  ) {
    return;
  }


  if (
    field.matches(
      'input[type="checkbox"][data-phrase-id]'
    )
  ) {

    const row =
      field.closest(
        '.heaven-settings-phrase-row'
      );


    const phraseInput =
      row
        ?.querySelector(
          '[data-phrase-category]'
        );


    if (
      phraseInput
      instanceof HTMLInputElement
    ) {

      field =
        phraseInput;
    }
  }


  heavenSettingsPreviewShowForField(
    field
  );
}


document.addEventListener(
  'focusin',
  heavenSettingsPreviewHandleEvent
);


document.addEventListener(
  'input',
  heavenSettingsPreviewHandleEvent
);


document.addEventListener(
  'change',
  heavenSettingsPreviewHandleEvent
);
