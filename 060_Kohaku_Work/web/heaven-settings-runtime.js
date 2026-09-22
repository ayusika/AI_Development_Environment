(() => {
  "use strict";

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
window.KohakuHeavenSettings = {
  defaults:
    cloneHeavenStandaloneDefaults(),

  current:
    cloneHeavenStandaloneDefaults(),

  usage:
    new Set(),

  apply(settings) {
    this.current =
      normalizeHeavenStandaloneSettings(
        settings
      );
  },

  async load(businessDate) {

    try {

      const [
        settingsResponse,
        usageResponse,
      ] =
        await Promise.all([
          fetch(
            heavenStandaloneSettingsApiUrl,
            {
              credentials:
                'same-origin',

              cache:
                'no-store',
            }
          ),

          fetch(
            heavenStandaloneUsageApiUrl
            + '?business_date='
            + encodeURIComponent(
              businessDate
            ),
            {
              credentials:
                'same-origin',

              cache:
                'no-store',
            }
          ),
        ]);


      const settingsPayload =
        await settingsResponse.json();

      const usagePayload =
        await usageResponse.json();


      if (
        settingsResponse.ok
        && settingsPayload.success
        && settingsPayload.data?.settings
      ) {

        this.apply(
          settingsPayload.data.settings
        );
      }


      if (
        usageResponse.ok
        && usagePayload.success
      ) {

        this.usage =
          new Set(
            (
              usagePayload.data?.usage
              || []
            ).map(
              item =>
                item.phrase_id
            )
          );
      }


      return this.current;

    } catch (error) {

      console.error(
        'Failed to load Heaven settings.',
        error
      );

      return this.current;
    }
  },

  async record(
    businessDate,
    phrases
  ) {

    const valid =
      (
        Array.isArray(phrases)
          ? phrases
          : []
      ).filter(
        phrase =>
          phrase?.phrase_id
      );


    if (!valid.length) {
      return;
    }


    try {

      await fetch(
        heavenStandaloneUsageApiUrl
        + '?business_date='
        + encodeURIComponent(
          businessDate
        ),
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          credentials:
            'same-origin',

          body:
            JSON.stringify({
              phrases:
                valid,
            }),
        }
      );


      valid.forEach(
        phrase => {
          this.usage.add(
            phrase.phrase_id
          );
        }
      );

    } catch (error) {

      console.error(
        'Failed to record Heaven phrase usage.',
        error
      );
    }
  },
};

})();
