# KoppyOS Executor Selection Protocol

Version: v0.1  
Status: ACTIVE

---

# 1. Purpose

このProtocolは、

KoppyOSにおいて変更・開発・正本更新を行う際に、

「何を変更するか」

を決定したあと、

「どのExecutorで実行するか」

を安全かつ一貫して選択するための正式ルールを定義する。

KoppyOSでは、

Koppy
↓
Task Design
↓
Executor Selection
↓
Execution
↓
Verification

の順序を基本とする。

Executorを先に選び、
そのExecutorに合わせて作業内容を歪めてはならない。

---

# 2. Roles

KoppyOSでは以下の役割を分離する。

## 2.1 Koppy

Koppyは、

Architect
Controller
Decision Maker

として扱う。

Koppyは、

- 目的の整理
- 仕様の決定
- 安全性の判断
- Executorの選択
- 実行結果の確認
- 正本との整合確認

を担当する。

---

## 2.2 Writer

Writerは、

Deterministic Executor

として扱う。

Koppyが確定した変更内容を、
指定された範囲へ安全かつ機械的に反映する。

主な用途：

- 設計書
- 現在地
- 次にやること
- 決定事項
- 更新履歴
- セーブ処理
- 小規模なExact Match編集
- Koppyが変更内容そのものを確定している編集

Writerによる編集は、
`FILE_EDIT_PROTOCOL.md`
に従う。

---

## 2.3 Codex

Codexは、

Intelligent Code Executor

として扱う。

Codexはローカル実ファイルを読み、
Koppyから渡された仕様・制約・成功条件をもとに実装を行う。

主な用途：

- HTML
- CSS
- JavaScript
- PHP
- その他のプログラムコード
- 複数ファイルをまたぐ実装
- リファクタリング
- 動作確認
- diff確認
- Git操作
- commit / push

Codexは、
Koppyの代わりに設計方針を決定する存在ではない。

---

# 3. Executor Modes

KoppyOSでは以下の3モードを使用する。

AUTO
WRITER
CODEX

---

## 3.1 AUTO

標準モード。

ユーザーがExecutorを指定しなかった場合、
Koppyが作業内容を判断して適切なExecutorを選択する。

AUTOでは、

Task
↓
Koppy判定
↓
WRITER または CODEX

とする。

---

## 3.2 WRITER

ユーザーがWriterを明示指定した場合に使用する。

例：

writer用で
writerで進めたい
今回はwriter

この場合、
原則としてWriter形式で出力する。

ただしWriterでは安全または合理的に実行できない場合、
Koppyは理由を説明し、
Codexへの切り替えを提案できる。

最終判断はユーザーが行う。

---

## 3.3 CODEX

ユーザーがCodexを明示指定した場合に使用する。

例：

codex用で
codexで進めたい
今回はcodex

この場合、
原則としてCodex用の実装指示を出力する。

ただしCodexを使用する必要がない単純な正本更新や、
Writerの方が安全性・再現性が高い場合は、
KoppyがWriterを提案できる。

最終判断はユーザーが行う。

---

# 4. AUTO Selection Rules

AUTOでは以下を基本とする。

## CODEX優先

以下はCodexを優先する。

- 実コードの変更
- HTML / CSS / JavaScript / PHP等
- 複数ファイルをまたぐ変更
- リファクタリング
- コード構造の解析が必要
- 現在の実装を読んで実装方法を判断する必要がある
- テスト・lint・diff確認が必要
- Git操作と一体で行う開発作業

---

## WRITER優先

以下はWriterを優先する。

- 設計思想の記録
- 運用ルール
- 現在の状態
- 次にやること
- 決定事項
- 更新履歴
- 引き継ぎ情報
- セーブ処理
- 小規模で変更内容が完全に確定している編集
- Exact Matchによる限定的変更
- Codexを使用するメリットが小さい作業

---

# 5. Save Policy

`セーブ！`

によるKoppyOSの状態確定処理は、
原則としてWriterを使用する。

対象例：

- 現在の状態
- 次にやること
- 決定事項
- 更新履歴
- Continue状態
- 設計上の確定事項

理由：

セーブ処理はコード実装ではなく、

KoppyOSの認識・判断・状態を正本へ固定する処理

だからである。

Codexによるコード作業と、
KoppyOSの状態確定処理は分離する。

---

# 6. Writer Output Format

Writerを選択した場合、
Koppyは変更内容そのものを確定して出力する。

基本項目：

変更するファイル
操作
変更理由
探す文字列
置換後

必要に応じて：

追記内容
新規ファイル全文
commit message

を追加する。

Writer指示では、

Koppyが

何を
どこへ
どの文字列として
変更するか

まで決定する。

表示方法は、
Koppy OSパネル / Koppy OS表示の既存ルールと
`FILE_EDIT_PROTOCOL.md`
に従う。

---

# 7. Codex Output Format

Codexを選択した場合、
Koppyは原則として置換前・置換後コードそのものを作成しない。

代わりにCodexへ、

何を実現するか
何を変更してよいか
何を変更してはいけないか
何を成功条件とするか

を渡す。

標準項目：

目的
対象
変更要件
変更禁止
必ず読むファイル
実行手順
確認項目
commit / push方針

Codexはその指示をもとに、
ローカル正本を確認して実装する。

---

# 8. Standard Codex Instruction

Codex用出力の基本構造は以下とする。

【Codex用】

目的:
...

対象:
...

変更要件:
- ...
- ...

変更禁止:
- ...
- ...

必ず読む:
- AGENTS.md
- 600_KoppyOS/protocols/FILE_EDIT_PROTOCOL.md
- 対象ファイル
- 必要な関連ファイル

実行:
1. 現在のローカル実ファイルを確認
2. git statusを確認
3. origin/mainとの差分を確認
4. 最小安全変更で実装
5. diffを確認
6. 結果を報告

commit / push:
その時点のKoppyまたはユーザー指示に従う。

実際のタスクに不要な項目は省略できる。

ただし、
安全性に必要な制約を省略してはならない。

---

# 9. Codex Safety Rules

Codexを使用する場合でも、
File Edit Protocolの基本安全原則を維持する。

特に以下を守る。

- 古い記憶だけで変更しない
- ローカル実ファイルを確認する
- git statusを確認する
- 必要に応じてorigin/mainとの差分を確認する
- 意図しないファイルを変更しない
- 最小安全変更を優先する
- force pushを行わない
- conflictを勝手に解決しない
- 不明な仕様を推測して確定しない
- ユーザーが禁止した操作を行わない

---

# 10. Commit / Push Policy

Codexでコード変更を行った場合でも、

commit / pushを自動的に行うことを標準とはしない。

タスクごとにKoppyまたはユーザーが、

編集のみ
diffまで
commitまで
pushまで

のどこまで行うか決定する。

force pushは原則禁止する。

---

# 11. Fallback

Codexが、

- 利用上限
- 接続問題
- アプリ不具合
- 権限問題
- その他の理由

によって使用できない場合、

KoppyはWriterで安全に代替できるか判定する。

安全に代替可能：

CODEX
↓
WRITER fallback

安全に代替できない：

STOP
↓
理由を説明

Codexが使用できないことを理由に、
危険なWriter変更を作成してはならない。

---

# 12. User Override

Executorの最終決定権はユーザーにある。

AUTO判定後でも、

writerで
codexで

と指定された場合は、
その指定を優先する。

ただし安全上重大な問題がある場合は、
Koppyが警告・代替案を提示する。

---

# 13. Core Principle

KoppyOSでは、

Koppy = 考える
Writer = 決めた変更を正確に反映する
Codex = 実装を理解してコードを変更する

を基本とする。

WriterとCodexは競合する仕組みではない。

異なる性質を持つExecutorとして併存させる。

Koppyは道具に作業を合わせるのではなく、

作業内容を判断
↓
最適なExecutorを選択

する。

これをKoppyOSの標準開発フローとする。