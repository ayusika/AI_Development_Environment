# Kohaku Work DB Design v1.0

更新日：2026-08-14  
状態：本番β運用前・正式DB設計

---

# 1. 目的

Kohaku Workで使用する仕事データの正本DBを構築する。

Kohaku Workは単なる記録アプリではなく、

- 出勤スケジュール
- 予約・接客
- 顧客管理
- 写メ日記
- 売上
- 分析
- Koppyによる文章生成・仕事相談

を同じデータから扱う仕事OSとして設計する。

β版であっても実データを保存しながら運用するため、
DBは使い捨てのLite構成ではなく、
将来の本番運用を前提とした構造を採用する。

---

# 2. DB実装方式

DB：

SQLite

接続：

PHP PDO_SQLITE

DB本体：

/home/users/2/her.jp-mikipiano/.koppy-private/database/kohaku-work.sqlite

DB本体はWeb公開領域の外に置く。

GitHubには実データを保存しない。

GitHubで管理するもの：

- DB設計書
- schema.sql
- migration
- APIコード
- DB運用ルール

SQLite / PDO_SQLITE のサーバ動作確認済み。

---

# 3. 最重要設計原則

## 3-1. visitsを仕事データの中心にする

Kohaku Workでは、

「スケジュールに予約・接客を登録する」

ことを基本的な動作起点とする。

スケジュール登録時に visits レコードを作成する。

その後、同じvisitから

- 顧客情報
- 日記作成
- 売上入力
- 接客情報編集

へ移動する。

同じ情報を複数画面で再入力しない。

---

## 3-2. 予約と実際の接客を別テーブルに分離しない

通常は予約内容をそのまま接客記録として扱う。

大きな時間変更・コース延長などが発生した場合のみ、
接客後に編集する。

予約時刻と実開始時刻を別々に保存する運用は行わない。

---

## 3-3. UI制約とDB制約を分ける

開始時間はUIでは10分単位で選択する。

ただしDBでは任意の時刻を保存可能にする。

コース時間もUIでは候補を表示するが、
DBは任意の正整数を保存可能にする。

これによりイレギュラー時の手修正を可能にする。

---

## 3-4. 生データを保存し、計算結果は原則保存しない

人数・リピ人数・月間手取り・日平均など、
DBから計算できる値は重複保存しない。

正本となる事実データを保存し、
集計画面で算出する。

---

## 3-5. 不明な情報を捏造しない

過去データなどで不明な値はNULLとして保存する。

推測によって、

- コース時間
- 新規 / リピ
- 顧客
- OP
- 金額

などを補完しない。

---

# 4. 全体データ構造

stores
│
├── work_shifts
│
├── visits ───────── customers
│     │                 │
│     │                 └── customer_names
│     │
│     ├── visit_options ─── options
│     │
│     ├── visit_diary_notes
│     │
│     ├── visit_sales
│     │
│     └── diary_visits ─── diaries
│
├── store_course_rates
│
└── store_option_rates

合計13テーブル。

---

# 5. stores

店舗マスタ。

## 主なカラム

- id
- name
- active
- created_at
- updated_at

初期店舗：

- 札幌
- 千葉
- 東京
- 名古屋

店舗追加に対応する。

---

# 6. work_shifts

出勤予定。

## 主なカラム

- id
- store_id
- start_at
- end_at
- note
- created_at
- updated_at

例：

2026-08-14  
千葉  
12:00〜23:00

スケジュール画面の勤務可能時間・空き枠表示に使用する。

---

# 7. customers

顧客そのものを表すマスタ。

SNS名や店舗名は直接ここへ保存しない。

## 主なカラム

- id
- customer_code
- general_notes
- created_at
- updated_at

customer_codeはシステム側で自動発番する。

例：

KH-000001

直接識別情報を積極的に保存しない。

実名・電話番号・住所等は原則保存対象外。

---

# 8. customer_names

顧客が持つ複数の名前・アカウント名。

## 主なカラム

- id
- customer_id
- name_type
- name
- store_id
- is_primary
- note
- created_at
- updated_at

## name_type例

- line
- x
- instagram
- store
- nickname
- other

1人の顧客に複数名義を登録できる。

例：

LINE：たろちゃん  
X：@xxxxx  
Instagram：abc123  
千葉店：山田さん  
呼び名：たろくん

---

# 9. visits

Kohaku Work DBの中心テーブル。

1回の予約・接客を1レコードとして保存する。

## 主なカラム

- id
- source_id
- store_id
- customer_id
- started_at
- course_minutes
- customer_status
- customer_features
- conversation_notes
- visit_notes
- is_dummy
- status
- created_at
- updated_at

source_idはCSV移行等の外部データ識別用。

customer_idは顧客不明の場合NULL可。

---

## started_at

接客開始日時。

形式：

YYYY-MM-DD HH:MM

UIでは10分単位で選択する。

DBでは任意時刻を許可する。

---

## course_minutes

UI候補：

- 40
- 60
- 80
- 90
- 100
- 120
- 150
- 180
- その他

その他の場合は直接入力。

DBでは候補値に限定しない。

---

## customer_status

- new
- repeat
- other_store_repeat
- repeat_unknown_id

UI表示：

- 新規
- リピ
- 他店リピ
- リピ・ID不明

customer_statusとcustomer_idは別概念として扱う。

リピでも顧客IDが分からない場合がある。

---

## customer_features

今回の接客で分かった顧客特徴。

例：

- ○○に似ている
- M男
- 何回いける
- 性格
- 好み

自由記載。

---

## conversation_notes

今回話した内容。

例：

- 仕事内容
- 住んでいる地域
- 趣味
- 次回予定
- 会話で分かった情報

自由記載。

---

## visit_notes

その他の接客備考。

---

## status

候補：

- scheduled
- completed
- cancelled
- no_show

将来スケジュール画面から管理する。

---

# 10. options

OPマスタ。

## 主なカラム

- id
- name
- active
- sort_order
- created_at
- updated_at

初期OP：

- 聖水
- 射精
- 逆AF
- コスプレ
- ハイヒール
- 前立腺マッサージ
- 咀嚼
- ごっくん
- 動画撮影
- パンツお持ち帰り
- パンスト

その他自由入力にも対応する。

---

# 11. visit_options

接客とOPを紐付ける。

1接客に複数OPを登録可能。

## 主なカラム

- id
- visit_id
- option_id
- custom_name
- income_amount
- created_at
- updated_at

custom_nameは「その他OP」用。

income_amountは実際のOP手取り。

OPは基本フルバックだが、
実績金額を正本として保持する。

---

# 12. visit_diary_notes

顧客単位の写メ日記素材。

これは実際の投稿単位ではない。

## 主なカラム

- id
- visit_id
- body
- created_at
- updated_at

例：

12:00 Aさん
→ Aさん専用の日記素材

14:30 Bさん
→ Bさん専用の日記素材

千葉では複数顧客の素材をまとめて1本の日記へ変換できる。

通常店舗では1顧客の素材から個別お礼日記を作成できる。

---

# 13. diaries

実際の写メ日記1投稿を1レコードとして保存する。

## 主なカラム

- id
- source_id
- store_id
- platform
- diary_type
- title
- body
- scheduled_at
- posted_at
- is_dummy
- status
- created_at
- updated_at

---

## platform

当面は文字列管理。

例：

- nukinavi
- heaven
- other

platformマスタは現段階では作成しない。

---

## diary_type

当面は文字列管理。

例：

- morning
- thanks
- thanks_summary
- chat
- schedule
- availability
- finished
- other

必要になった時点で追加する。

diary_typeマスタは現段階では作成しない。

---

## scheduled_at / posted_at

scheduled_at：

投稿予定日時。

posted_at：

実際に投稿した日時。

未投稿の場合posted_atはNULL。

---

## is_dummy

0：

実体験・実データに基づく日記。

1：

Koppyによる創作を許可したダミー日記。

通常のお礼日記では、
入力されていない事実をKoppyが追加しない。

---

# 14. diary_visits

日記と接客を紐付ける中間テーブル。

## 主なカラム

- id
- diary_id
- visit_id
- sort_order

1つの日記に複数接客を紐付け可能。

1接客から複数媒体の日記を作成することも可能。

---

## 千葉ぬきナビ例

8/14まとめ日記

- 12:00 Aさん
- 14:30 Bさん
- 17:00 Cさん
- 21:00 Dさん

4visits → 1diary

---

## 通常ヘブン例

12:00 Aさん

1visit → 1個別お礼diary

---

# 15. visit_sales

1接客ごとの実績金額。

## 主なカラム

- id
- visit_id
- base_price
- base_income
- option_income
- tip_income
- adjustment_income
- created_at
- updated_at

---

## base_price

お客さんから受け取る基本料金。

---

## base_income

基本料金のうち本人に入る手取り。

---

## option_income

OPによる実際の手取り。

基本フルバック。

---

## tip_income

チップ。

UIでは1000円単位を基本とする。

DBでは整数金額を保存する。

---

## adjustment_income

イレギュラー調整。

例：

- +2000
- -1000

UIでは1000円単位を基本とするが、
DBでは任意金額を許可する。

---

# 16. store_course_rates

店舗ごとの標準コース料金マスタ。

## 主なカラム

- id
- store_id
- course_minutes
- base_price
- base_income
- effective_from
- effective_to
- active
- created_at
- updated_at

店舗ごとに料金が異なるため分離する。

料金変更履歴を壊さないため、
適用開始日・終了日を持つ。

スケジュール・売上入力時の自動補完に使用する。

このマスタの値は「候補」。

実績の正本はvisit_salesに保存する。

---

# 17. store_option_rates

店舗ごとの標準OP手取りマスタ。

## 主なカラム

- id
- store_id
- option_id
- income_amount
- effective_from
- effective_to
- active
- created_at
- updated_at

店舗差・将来の料金変更に対応する。

実際のOP手取りはvisit_options / visit_sales側へ保存する。

---

# 18. 基本操作フロー

## Step 1 出勤登録

カレンダーへ、

- 店舗
- 出勤開始
- 出勤終了

を登録。

work_shifts作成。

---

## Step 2 スケジュールへ予約登録

時間軸をタップ。

入力：

- 店舗
- 開始時間
- コース時間
- 新規 / リピ / 他店リピ / リピID不明
- 顧客ID（分かれば）
- OP

保存するとvisit作成。

これをKohaku Workの基本動作起点とする。

---

## Step 3 予定をタップ

表示：

- 接客情報を編集
- 顧客情報を見る
- 日記を書く
- 売上を入力

すべて同じvisit_idを参照する。

---

## Step 4 日記作成

スケジュールから取得：

- 店舗
- 時間
- コース
- 顧客区分
- 顧客
- OP

追加入力：

- 顧客の特徴
- 話した内容
- 顧客単位の日記本文
- その他備考

必要なデータをDBへ保存。

KoppyがB案 / C案を生成する。

通常日記では事実の捏造禁止。

ダミー日記のみ創作を許可する。

---

## Step 5 売上入力

visitから店舗・コース・OPを取得。

store_course_rates / store_option_ratesから標準金額を自動補完。

入力・確認：

- 基本料金
- 基本手取り
- OP手取り
- チップ
- イレギュラー調整

確定値をvisit_salesへ保存する。

---

# 19. 売上・分析

元データから自動算出する。

主な集計：

- 日別手取り
- 月別手取り
- 店舗別手取り
- 基本手取り
- OP手取り
- チップ
- 調整金額
- 総客数
- 新規人数
- リピ人数
- 他店リピ人数
- 店舗別人数
- コース別件数
- OP別件数
- 日平均
- 月平均
- リピ率
- 時間帯別
- 曜日別

集計結果そのものは原則DBへ重複保存しない。

---

# 20. 写メ日記モード

## 千葉 / ぬきナビ

基本：

前日の複数接客のお礼をまとめて1本投稿。

複数visitをdiary_visitsで1diaryへ接続する。

---

## 札幌・通常出稼ぎ / ヘブン

複数投稿。

例：

- おはよう
- 出勤
- 個別お礼
- 空き枠
- 雑談
- 完売
- 受付終了
- 退勤

通常は個別接客ごとの日記作成にも対応する。

---

# 21. 顧客情報の扱い

顧客情報は仕事上必要な範囲のみ保存する。

原則保存しないもの：

- 本名
- 電話番号
- 詳細住所
- 不要な直接識別情報

保存対象：

- サービス上の表示名
- 呼び名
- 接客傾向
- 好み
- 会話メモ
- 来店履歴
- 日記作成に必要な情報

---

# 22. 編集方針

データ登録経路は主に3つ。

1. スケジュール登録
2. 日記作成画面から追記・更新
3. DB編集画面から手動修正

どこから編集しても同じ正本データを更新する。

---

# 23. β運用方針

Kohaku Work βは実データを使用する。

そのためDBを「後で捨てる仮DB」として扱わない。

UI・機能はβとして変更可能だが、
DBは本番へ継続利用できることを前提に設計する。

DB schema変更時は、

- schema変更記録
- migration
- バックアップ
- 動作確認

を行う。

DB本体はGitHubへ保存しない。

---

# 24. 実装順

## Phase 1
DB正式schema作成

## Phase 2
スケジュール / work_shifts / visits

## Phase 3
予定詳細画面
顧客・日記・売上への導線

## Phase 4
顧客管理

## Phase 5
日記DB連携・Koppy生成

## Phase 6
売上入力・店舗別料金自動補完

## Phase 7
集計・分析

## Phase 8
Koppy DB相談

---

# 25. 現在地

SQLite動作確認：完了

private DB領域作成：完了

SQLite接続テスト：完了

DB往復テスト：完了

旧Lite schema：

本番データ投入前のため廃止予定。

次：

この設計v1.0を正本化し、
正式schema.sqlを新規設計する。

その後、
スケジュール機能をKohaku Workの次の実装起点とする。