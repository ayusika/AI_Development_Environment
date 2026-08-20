Kohaku Work DB の料金v2マスタを、予約カードから読み込むためのREAD ONLY APIを新規作成してください。

既存の 600_KoppyOS/server/api/v1/database.php および customers.php と同じDB接続・レスポンス・CORS等の設計規則を踏襲してください。

GETパラメータ:
store_id 必須
at 任意。予約日時 YYYY-MM-DD HH:MM:SS。未指定時は現在日時。

返却する情報:

1. store
- id
- name

2. courses
store_courses と store_course_rates_v2 を結合する。

条件:
- store_courses.store_id = 指定store_id
- store_courses.active = 1
- store_course_rates_v2.active = 1
- at が effective_from 以降
- effective_to がNULL、または at が effective_to 以下

各コース:
- store_course_id
- store_course_rate_id
- course_code
- course_name
- course_minutes
- course_type
- pricing_category
- base_price
- take_home
- sort_order

sort_order昇順。

base_price がNULLの場合は0へ変換せず、JSONでも null のまま返してください。

3. options
options と store_option_rates_v2 を結合する。

条件:
- store_id = 指定store_id
- options.active = 1
- store_option_rates_v2.active = 1
- at が effective_from 以降
- effective_to がNULL、または at が effective_to 以下

各OP:
- option_id
- name
- store_option_rate_id
- price
- take_home
- sort_order

sort_order昇順。

店舗料金が未登録のOPは返さないでください。

4. daily_fee_rule
store_daily_fee_rules から指定店舗・日時に有効なルールを1件取得。

- id
- min_visit_count
- fee_amount
- effective_from
- effective_to

存在しなければ null。

正常レスポンス例:

{
  "ok": true,
  "store": {...},
  "courses": [...],
  "options": [...],
  "daily_fee_rule": {...}
}

store_id がない場合は400。
店舗が存在しない場合は404。
DBエラー等は既存APIと同じエラー形式にしてください。

このAPIではDBを変更しないでください。