/* Koppy Home floorplan v0.1
 * Source: user-provided unit-02 recruitment drawing.
 * Privacy: exact address and building-identifying metadata are intentionally
 * omitted from this web payload.
 * Private-room lifestyle mapping remains unassigned until explicitly confirmed.
 */
'use strict';

window.KOPPY_HOME_LAYOUT = {
  version: '2026-09-25.1',

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
      '自宅の2号室タイプ間取り図。LDK16.6帖と洋室5.6帖、5.4帖、5.7帖を含む。',
  },

  spaces: [
    {
      id: 'ldk',
      label: 'LDK',
      size: '16.6帖',
      kind: 'shared',
      current_room_code: 'living',
      current_room_label: 'リビング・キッチン',
    },
    {
      id: 'private-left',
      label: '洋室',
      size: '5.6帖',
      kind: 'private',
      current_room_code: null,
      current_room_label: null,
    },
    {
      id: 'private-center',
      label: '洋室',
      size: '5.4帖',
      kind: 'private',
      current_room_code: null,
      current_room_label: null,
    },
    {
      id: 'private-right',
      label: '洋室',
      size: '5.7帖',
      kind: 'private',
      current_room_code: null,
      current_room_label: null,
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
    '3つの洋室は物理部屋IDだけを先に固定しています。',
    '化粧部屋・寝室・ゲーム部屋との対応は、確認できるまで推測で割り当てません。',
    'CLなどの収納は、次段階で座標付き配置へ拡張します。',
  ],
};
