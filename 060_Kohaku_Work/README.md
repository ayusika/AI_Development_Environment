# Kohaku Work OS

## 概要

Kohaku Work OS は、こはくの仕事に関する情報を一元管理し、
Koppy World 上から入力・閲覧・分析・AI相談できるようにするための仕事管理システム。

単なる売上管理表ではなく、

- 写メ日記
- 顧客
- 来店・接客
- 出勤
- 売上
- 経費
- 分析
- Koppyによる相談・提案

を同じデータベース上で関連付けることを目的とする。

---

## 基本構成

iPhone / Mac
↓
Koppy World
↓
認証付きAPI
↓
Database

GitHubはDB本体として使用せず、

- ソースコード
- 設計書
- DBスキーマ
- 変更履歴

の管理に使用する。

---

## 基本設計思想

### 人間側

Koppy Worldを、

「スプレッドシートの自由度」
+
「専用アプリの入力しやすさ」

を合わせたUIとして使用する。

### AI側

KoppyはDBに保存された構造化データを参照し、

- 写メ日記作成
- 売上分析
- 店舗比較
- 顧客履歴確認
- リピート分析
- 出勤戦略
- 改善提案

などを行える状態を目指す。

---

## 実装予定順

1. 写メ日記
2. 顧客
3. 接客
4. 出勤
5. 売上
6. 分析
7. Koppy相談

最初から全機能を完成させず、
実際に使用しながらUI・DB設計を改善する。

---

## 現在の状態

2026-09-22

Pro production運用・改善フェーズ。

Kohaku WorkはMacBook Pro 2018 / Koppy Base Server上のprivate production applicationとして稼働中。

Production URL:

```text
https://koppy-worker-pro.tailba49c0.ts.net/work/
```

Current runtime:

```text
Tailscale Serve
→ nginx
→ password auth
→ PHP-FPM 9001 / _koppyweb
→ production SQLite
```

iPhone 14から最新production data表示まで実機確認済み。

### 直近の完了事項

- 予約追加・予約編集機能
- 顧客ステータス管理
- 未紐付けリピート客の顧客DB検索・紐付け
- 予約編集画面からの顧客新規登録
- 顧客新規登録 / 顧客DB検索の切替UI
- 顧客名・カシコイ名の登録
- 顧客詳細・来店履歴表示
- 予約詳細ドロワーのUI整理
- Deploy Monitorの運用改善
- 顧客紐付け時のrepeatステータス正規化
- ヘブン個別日記の入力内容をlocalStorageへ自動保存
- ヘブン個別日記のクラウド下書き保存・端末間復元
- 正式日記DB保存後のクラウド下書き・localStorage削除
- 正式保存済み日記がある場合の別端末旧下書き再出現防止
- シフト作成画面の右側に共有カレンダーを常時表示
- シフト作成中の日付・勤務時間・休み・店舗変更を共有カレンダーへリアルタイム仮表示
- 仮シフトプレビューはDBへ保存せず、iframe間通信による一時表示として実装
- 仮出勤は薄い水色、仮休みは薄いピンクで保存済みシフトと視覚的に区別
- シフト確定内容からLINE提出用本文を自動生成
- 月またぎの日付を「７月３１、８月１、３日」形式で自動整形
- LINE提出用本文のワンタップコピーをMac・iPhone向けに実装
- Kohaku Workページ認証のセッション保持期間を30日に統一
- GitHub OAuth / API認証のセッション保持期間も30日に統一
- 認証済み状態で利用するたび最終利用時刻とCookie有効期限を30日先へ更新するスライド式セッションを実装
- PHPサーバ側のセッション保存期間も30日に設定し、ブラウザ終了後もログイン状態を維持する構成へ変更
- 30日間まったく利用しなかった場合のみセッションを失効する方針

### Production cutover

2026-09-22に以下を確認済み。

- Lolipop source 38 user tablesをKohaku 33 / KoppyOS 5へownership split
- Final Kohaku DBをProへatomic cutover
- PHP-FPM 9001 runtime read
- actual write commit
- separate request readback
- temporary probe cleanup
- `quick_check=ok`
- test前後でschema / business table data論理一致
- Lolipop旧DBはmode 0444でrollback-only freeze

### 現在の方針

- GitHubをsource of truthとして維持
- Kohaku Work production authorityはPro
- `refactor/koppy-world-graduation` はまだmainへmergeしない
- codeはimmutable releaseとしてProへ配置
- DB / session / secret / logはrelease外へ分離
- 旧Lolipop deploy / workflowはrollback window終了まで保持
- 実運用しながらUI / API / DBを安全に改善する

### 次

- 1〜2日のproduction burn-in
- 予約追加・編集・売上等の通常実運用確認
- 発見したUI / データ不整合の修正
- 顧客管理機能の続きを実装
- 写メ日記・売上など他機能との連携強化
- Backup / Restore automation
- Monitoring / log rotation
- rollback window終了後のLolipop retirement判断
- Koppy World本体 / KoppyOS DB / OAuth移行は別phase
