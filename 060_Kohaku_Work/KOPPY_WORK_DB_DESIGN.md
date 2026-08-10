# Koppy Work DB Design v0.1

更新日：2026-08-11
状態：初期設計確定 / 実装前

---

# 1. 目的

こはくの仕事に関するデータを一元管理し、
Koppy Worldから入力・閲覧・分析できる仕事DBを構築する。

将来的にはKoppyがDBを参照し、
仕事上の分析・提案・写メ日記作成などを行える状態を目指す。

---

# 2. システム構成

iPhone / Mac
↓ HTTPS
Koppy World
↓
認証付きAPI
↓
Database

GitHubはDB本体ではなく、
コード・設計・変更履歴・バックアップ方針の管理に使用する。

DB候補はロリポップ上のMySQLを第一候補とする。
正式採用は実装前に決定する。

---

# 3. コアテーブル

## customers

顧客マスター。

- customer_id
- display_name
- okini_talk_name
- x_name
- instagram_name
- line_name
- first_visit_date
- first_visit_estimate
- first_visit_precision
- estimated_total_visits
- primary_area
- customer_status
- preference_summary
- general_notes
- created_at
- updated_at

### 初回来店

first_visit_precision：

- exact
- approximate
- unknown

正確な初回来店日が分からない場合、
「2024年夏ごろ」などを first_visit_estimate に保存する。

### 来店回数

過去込み概算：

- 1
- 2
- 3
- 4
- 5
- 6-9
- 10+
- unknown

これは記録開始後の正確な来店回数とは別物。

正確な来店回数は visits のレコード数から自動算出し、
customersには重複保存しない。

Koppy Worldでは例として、

記録開始後：4回
過去込み概算：10回以上

のように表示する。

---

## visits

1回の接客・来店を1レコードとして保存。

- visit_id
- customer_id
- shift_id
- visit_date
- start_time
- area
- shop
- course_minutes
- is_repeat
- options
- service_summary
- conversation_summary
- customer_reaction
- next_visit_hint
- sales_amount
- tip_amount
- gift_note
- thank_you_diary_id
- created_at
- updated_at

### 会話メモ

将来的に音声入力へ対応する。

録音
↓
文字起こし
↓
Koppy / AIによる要約
↓
conversation_summary に保存
↓
元音声は破棄

元音声はDB・サーバー等に保存しない。

---

## shifts

出勤単位のデータ。

- shift_id
- work_date
- area
- shop
- platform
- start_time
- end_time
- scheduled_minutes
- actual_minutes
- booking_count_start
- available_slots_note
- shift_note
- created_at

---

## sales

売上データ。

- sales_id
- shift_id
- gross_sales
- net_sales
- visit_count_exact
- total_service_minutes
- sales_note
- created_at

※ 来店回数など、他テーブルから正確に算出できる値については
将来的に重複保存を避ける方向で再検討する。

---

## expenses

経費データ。

- expense_id
- shift_id
- expense_date
- category
- amount
- note
- created_at

主なcategory：

- 交通費
- 宿泊費
- 衣装
- その他

---

## diaries

写メ日記。

- diary_id
- diary_date
- area
- shop
- platform
- diary_type
- title
- body
- photo_path
- availability_note
- is_posted
- posted_at
- shift_id
- created_at
- updated_at

主なdiary_type：

- 出勤
- お礼
- 出稼ぎ告知
- 空き枠・次回案内
- 雑談
- 完売
- 受付終了
- 退勤

---

## diary_rules

写メ日記作成ルール。

- rule_id
- area
- platform
- rule_category
- rule_text
- priority
- is_active
- created_at
- updated_at

priority：

- 必須
- 推奨
- 参考

プロンプトだけにルールを埋め込まず、
媒体・地域別のルール自体をデータとして管理する。

---

# 4. 写メ日記 現行3モード

## 札幌

媒体：ヘブン

複数投稿。

主な内容：

- 出勤
- 個別お礼
- 空き枠
- 告知
- 雑談
- 完売 / 受付終了 / 退勤

---

## 通常出稼ぎ

媒体：ヘブン

複数投稿。

主な内容：

- 出稼ぎ告知
- 出勤
- 個別お礼
- 空き枠
- 雑談
- 完売 / 受付終了 / 退勤

---

## 千葉出稼ぎ

媒体：ぬきナビ

基本は当日朝に1本。

前日の接客のお礼をまとめて掲載する。

出稼ぎ初日は出勤開始案内。

出稼ぎ最終日の次の日記のみ、
次回出稼ぎ日程を告知する。

千葉はリピーターが特に多く、
事前予約で多数の枠が埋まる傾向がある。

---

# 5. こはく写メ日記 共通文体

源氏名：

こはく

署名：

❄︎こはく❄︎

基本文体：

- タメ語
- 元気
- 若い雰囲気
- 親近感重視
- ひらがな多め
- 感情表現を自然に使用

使用例：

- ありがとー！
- ありがと🥺
- 嬉しい♡
- 嬉しい🥺
- いっぱい
- ほんっっと
- すごーく
- まってるよ〜♪

使用する絵文字・記号例：

♡
☺️
🥺
😳
🥰
♪
⭐︎

重要：

文章をAI的に綺麗に整えすぎない。

敬語へ統一しない。

本人が普段使う表現の重複を無理に言い換えない。

「広告コピー」ではなく、
こはく本人が喋っているような文章を優先する。

---

# 6. Koppy World 基本画面

## ホーム

今日の仕事の司令室。

表示候補：

- 今日の出勤
- 今日の予約件数
- 今日の売上
- 次の空き枠
- 今日の日記状況
- 今日の記録を追加
- 写メ日記を作る
- 顧客を探す

---

## 写メ日記

タブ：

- 新規作成
- 過去ログ
- ルール

将来的にKoppyが、

- 地域・媒体ルール
- 過去日記
- 空き状況
- 写真
- 前日のvisits

を参照して日記を作成する。

---

## 顧客

検索対象：

- 顧客名
- オキニトーク名
- X名
- Instagram名
- LINE名

顧客詳細：

- 基本情報
- 来店履歴
- 会話メモ
- 好み

---

## 接客

スマホから短時間で入力できるUIを優先。

主な入力：

- 顧客
- 開始時刻
- コース
- オプション
- 売上
- チップ
- 差し入れ
- 会話メモ
- 接客メモ

---

## 出勤

カレンダー表示と一覧表示。

1日の勤務詳細から、

- 予約
- 接客
- 売上
- 空き枠
- 写メ日記

を横断して確認できるようにする。

---

## 売上

スプレッドシート型表示を基本とする。

表示候補：

- 日付
- 店舗
- 本数
- 売上
- チップ
- 経費
- 手取り
- 稼働時間
- 時間単価

---

## 分析

候補：

- 月別売上
- 店舗別売上
- 時間単価
- 新規 / リピ比率
- 平均コース時間
- 曜日別
- 時間帯別
- 出稼ぎ別利益
- 経費込み利益
- 事前予約数と最終売上
- 顧客の来店間隔
- 店舗別リピート率
- 写メ日記と予約状況の関係

---

## Koppy相談

将来的にDBをKoppyが参照し、

- 今回の千葉どう？
- 札幌と比較して
- 最近来ていない常連は？
- 明日の写メ日記を作って
- 今月どこを改善すべき？

などを自然言語で相談できる状態を目指す。

---

# 7. UI基本方針

Mac：

左サイドバー中心。

iPhone：

下部ナビゲーション中心。

基本ナビ：

ホーム
写メ日記
顧客
接客
出勤
売上
分析
Koppy

入力画面は専用アプリ的に簡単にする。

一覧・分析画面はスプレッドシート的な自由度を持たせる。

---

# 8. データ設計原則

## 生データと分析結果を分離する

事実となる元データをDBに保存する。

計算可能な分析結果は、
原則として元データから都度算出する。

重複保存による不整合を避ける。

## 顧客情報

仕事上必要な範囲のみ保存する。

実名・電話番号・住所などの直接識別情報は基本的に保存しない。

各SNS・サービスについては、
顧客を識別するための表示名のみ管理する。

---

# 9. 実装順

Phase 1
写メ日記

Phase 2
顧客

Phase 3
接客

Phase 4
出勤

Phase 5
売上・経費

Phase 6
分析

Phase 7
Koppy相談

---

# 10. 次の作業

- ホーム画面ワイヤーフレーム
- 写メ日記画面ワイヤーフレーム
- DB実装方式確定
- MySQL採用可否確認
- API / 認証方式設計
- Phase 1実装