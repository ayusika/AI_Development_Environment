/* Koppy Home floorplan v0.1
 * Source: user-provided unit-02 recruitment drawing.
 * Privacy: exact address and building-identifying metadata are intentionally
 * omitted from this web payload.
 * Private-room lifestyle mapping was explicitly confirmed on 2026-09-26.
 */
'use strict';

window.KOPPY_HOME_LAYOUT = {
  version: '2026-09-26.2',

  source: {
    label: 'ユーザー提供図面 / 2号室タイプ',
    verification: '実居住間取りと一致確認済み',
  },

  unit: {
    type: '3LDK',
    area_sqm: 75.79,
  },

  floorplan: {
    src: 'assets/floorplan-unit-02.png',
    alt:
      '自宅の2号室タイプ間取り図。LDK16.6帖、ゲーム部屋5.6帖、寝室5.4帖、化粧部屋5.7帖と実測寸法矢印を含む。',
  },

  spaces: [
    {
      id: 'ldk',
      label: 'LDK',
      size: '16.6帖',
      kind: 'shared',
      measurements: {
        width_cm: 600,
        depth_cm: 330,
        scope: 'LDKメイン領域の長方形部分。キッチン側の張り出しは含まない。',
        source: 'user_hand_measurement',
        measured_on: '2026-09-26',
        status: 'confirmed',
      },
      current_room_code: 'living',
      current_room_label: 'リビング・キッチン',
    },
    {
      id: 'private-left',
      label: '洋室',
      size: '5.6帖',
      kind: 'private',
      measurements: {
        width_cm: 280,
        depth_cm: 305,
        source: 'user_hand_measurement',
        measured_on: '2026-09-26',
        status: 'measured',
      },
      current_room_code: 'gaming',
      current_room_label: '第三部屋・ゲーム部屋',
    },
    {
      id: 'private-center',
      label: '洋室',
      size: '5.4帖',
      kind: 'private',
      measurements: {
        width_cm: 320,
        depth_cm: 240,
        source: 'user_hand_measurement',
        measured_on: '2026-09-26',
        status: 'measured',
      },
      current_room_code: 'bedroom',
      current_room_label: '第二部屋・寝室',
    },
    {
      id: 'private-right',
      label: '洋室',
      size: '5.7帖',
      kind: 'private',
      measurements: {
        width_cm: 310,
        depth_cm: 245,
        source: 'user_hand_measurement',
        measured_on: '2026-09-26',
        status: 'measured',
      },
      current_room_code: 'dressing',
      current_room_label: '第一部屋・化粧部屋',
    },
    {
      id: 'entrance',
      label: '玄関',
      size: null,
      kind: 'service',
      current_room_code: 'entrance',
      current_room_label: '玄関',
    },
    {
      id: 'hallway',
      label: '廊下',
      size: null,
      kind: 'service',
      measurements: {
        recorded_span_cm: 250,
        recorded_label: '寸法チェック用紙 No.13',
        semantic_dimension: null,
        source: 'user_hand_measurement',
        measured_on: '2026-09-26',
        status: 'needs_remap',
        note: '印刷用チェックシートの間取り表現に差異があったため、幅としては未確定。',
      },
      current_room_code: 'hallway',
      current_room_label: '廊下',
    },
    {
      id: 'utility',
      label: 'UT',
      size: null,
      kind: 'service',
      current_room_code: 'bathroom',
      current_room_label: '洗面所・風呂',
    },
    {
      id: 'bath',
      label: 'UB',
      size: null,
      kind: 'service',
      current_room_code: 'bathroom',
      current_room_label: '洗面所・風呂',
    },
    {
      id: 'toilet',
      label: 'トイレ',
      size: null,
      kind: 'service',
      current_room_code: 'toilet',
      current_room_label: 'トイレ',
    },
    {
      id: 'balcony',
      label: 'バルコニー',
      size: null,
      kind: 'service',
      current_room_code: null,
      current_room_label: null,
    },
  ],

  notes: [
    '洋室5.6帖はゲーム部屋、5.4帖は寝室、5.7帖は化粧部屋として確認済みです。',
    '間取り画像には確認済みの実測寸法を縦横の矢印で表示しています。',
    'CLなどの収納は、次段階で座標付き配置へ拡張します。',
  ],
};
