# KoppyOS Executor Selection Protocol

Version: v0.2  
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

## 2.4 VS Code Agent

VS Code Agentは、

Intelligent Local Workspace Executor

として扱う。

VS Code Agentは、
VS Codeからアクセス可能なローカル実ファイル・workspace・Terminalを使用し、
Koppyから渡された仕様・制約・成功条件をもとに作業を行う。

主な用途：

- VS Code workspace内のコード編集
- ローカルファイルの作成・編集・削除
- 複数ファイルをまたぐ実装
- Terminalコマンドの実行
- テスト・lint・動作確認
- diff / Git状態の確認
- Codexが利用できない場合のコード作業fallback
- Koppyが安全と判断したローカル作業
- macOS上でローカルファイルとして利用可能なiCloud Drive同期ファイルの操作

iCloud Drive等の同期領域を扱う場合も、
推測したパスへ書き込まず、
対象実ファイル・親ディレクトリ・アクセス可能状態を確認してから作業する。

VS Code Agentは、
Koppyの代わりに設計方針を決定する存在ではない。

---

# 3. Executor Modes

KoppyOSでは以下の4モードを使用する。

AUTO
WRITER
CODEX
VSCODE_AGENT

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
WRITER / CODEX / VSCODE_AGENT

とする。

コード作業では原則としてCodexを優先する。

ただしCodexが利用できない場合や、
VS Code上のローカルworkspace・ローカルファイル操作が適している場合は、
VSCODE_AGENTを選択できる。

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
CodexまたはVS Code Agentへの切り替えを提案できる。

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

Codexが利用できない場合は、
VSCODE_AGENTへのfallbackを提案できる。

ユーザーがCODEXを明示指定している場合、
Koppyは無断でVSCODE_AGENTへ切り替えない。

最終判断はユーザーが行う。

---

## 3.4 VSCODE_AGENT

ユーザーがVS Code Agentを明示指定した場合に使用する。

例：

VS Code Agentで
VSCODE_AGENTで
VSコードのAIで
今回はVS Code Agent

この場合、
原則としてVS Code Agent用の作業指示を出力する。

VS Code Agentが対象ファイル・workspace・Terminalへ安全にアクセスできない場合は、
無理に作業を継続しない。

必要に応じて、
CodexまたはWriterへの切り替えをKoppyが提案できる。

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

Codexが利用可能で、
Codexを使用することに明確な不利益がない場合、
通常のコード開発ではCodexを第一候補とする。

---

## VSCODE_AGENT優先・適合

以下ではVS Code Agentを選択できる。

- Codexが利用上限等で使用できない
- VS Code workspace内で直接作業することが合理的
- ローカルファイル操作が中心
- Terminal実行を伴うローカル作業
- ローカル環境で実行・確認・自己修正する必要がある
- Git管理外のローカルファイルを扱う
- iCloud Drive等、Mac上で利用可能な同期ファイルを扱う
- CodexよりVS Code Agentの方が対象へのアクセス経路として適している

VSCODE_AGENTは、
単なるCodexの縮小版ではなく、

Intelligent Local Workspace Executor

として独立した適性を持つExecutorとして扱う。

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
- Intelligent Executorを使用するメリットが小さい作業

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

CodexまたはVS Code Agentによる実装作業と、
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

# 7. Intelligent Executor Output Format

CodexまたはVS Code Agentを選択した場合、
Koppyは原則として置換前・置換後コードそのものを作成しない。

代わりにExecutorへ、

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

Executorはその指示をもとに、
アクセス可能な実ファイルと実環境を確認して作業する。

---

# 8. Standard Intelligent Executor Instruction

Codex / VS Code Agent用出力の基本構造は以下とする。

【Executor用】

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
1. 現在の実ファイルを確認
2. Git管理対象の場合はgit statusを確認
3. 必要に応じてorigin/mainとの差分を確認
4. 最小安全変更で実装
5. 実行・テスト・diff等で結果を確認
6. 結果を報告

commit / push:
その時点のKoppyまたはユーザー指示に従う。

Git管理外の作業では、
不要なGit操作を要求しない。

実際のタスクに不要な項目は省略できる。

ただし、
安全性に必要な制約を省略してはならない。

---

# 9. Intelligent Executor Safety Rules

CodexまたはVS Code Agentを使用する場合でも、
File Edit Protocolの基本安全原則を維持する。

特に以下を守る。

- 古い記憶だけで変更しない
- アクセス可能な実ファイルを確認する
- Git管理対象ではgit statusを確認する
- 必要に応じてorigin/mainとの差分を確認する
- 意図しないファイルを変更しない
- 最小安全変更を優先する
- force pushを行わない
- conflictを勝手に解決しない
- 不明な仕様を推測して確定しない
- ユーザーが禁止した操作を行わない
- 必要なruntime / toolが存在しない場合、勝手にインストールしない
- 必要なruntime / toolがなく安全に続行できない場合はSTOPする
- OS・アプリ・権限・環境設定を無断で変更しない
- 同期領域では対象の実在・アクセス可能状態を確認してから変更する

ExecutorがSTOPした場合、
Koppyはその理由を確認し、
仕様判断・代替手段・Executor変更のいずれが適切か判断する。

---

# 10. Commit / Push Policy

Intelligent Executorでコード変更を行った場合でも、

commit / pushを自動的に行うことを標準とはしない。

タスクごとにKoppyまたはユーザーが、

編集のみ
diffまで
commitまで
pushまで

のどこまで行うか決定する。

force pushは原則禁止する。

Git管理外のファイルでは、
commit / pushを要求しない。

---

# 11. Fallback

Executorが利用できない場合、
Koppyは作業内容と利用可能なExecutorを再評価する。

通常のコード作業では、

CODEX
↓
VSCODE_AGENT
↓
WRITERで安全に代替可能か判定
↓
安全に代替できなければSTOP

を基本fallbackとする。

Codexが、

- 利用上限
- 接続問題
- アプリ不具合
- 権限問題
- その他の理由

によって使用できない場合、
VSCODE_AGENTで安全に代替できるかを先に判定する。

VSCODE_AGENTも利用できない場合のみ、
Writerで安全に代替できるかを判定する。

Writerで安全に代替可能：

CODEX / VSCODE_AGENT
↓
WRITER fallback

安全に代替できない：

STOP
↓
理由を説明

Intelligent Executorが使用できないことを理由に、
危険なWriter変更を作成してはならない。

ユーザーがExecutorを明示指定している場合は、
無断で別Executorへ切り替えず、
fallback候補として提案する。

---

# 12. User Override

Executorの最終決定権はユーザーにある。

AUTO判定後でも、

writerで
codexで
VS Code Agentで
VSCODE_AGENTで

と指定された場合は、
その指定を優先する。

ただし安全上重大な問題がある場合は、
Koppyが警告・代替案を提示する。

---

# 13. Verified VS Code Agent Capabilities

2026-09-08の実機試験で、
VS Code Agentについて以下を確認した。

- `AGENTS.md`を参照できる
- `EXECUTOR_SELECTION_PROTOCOL.md`を参照できる
- `FILE_EDIT_PROTOCOL.md`を参照できる
- Git状態・branch・origin/mainとの差分を確認できる
- ローカルファイルを新規作成できる
- 既存ファイルを読み戻して変更できる
- Terminalコマンドを実行できる
- 実行結果を確認して追加修正できる
- unrelated filesを変更せず作業できる
- 必要runtimeが存在しない場合にSTOPできる
- ローカルテストファイルを安全確認後に削除できる
- iCloud Drive同期領域の実パスを確認できる
- iCloud Drive同期ファイルと同一ディレクトリへファイルを作成できる
- 作成ファイルを読み戻して検証できる
- 既存ファイルの不変性を確認できる
- テストファイルを削除して後片付けできる

これらは、

VS Code Agentがすべてのローカルファイルへ無条件にアクセスできる

ことを意味しない。

実際のアクセス可否は、
macOS権限・VS Codeの権限・workspace・同期状態・対象ファイルの状態等に依存する。

そのため、
実タスクでは毎回対象へのアクセス可能性を確認する。

---

# 14. Core Principle

KoppyOSでは、

Koppy = 考える
Writer = 決めた変更を正確に反映する
Codex = 実装を理解してコードを変更する
VS Code Agent = ローカルworkspaceと実環境を使って作業する

を基本とする。

Writer / Codex / VS Code Agentは競合する仕組みではない。

異なる性質を持つExecutorとして併存させる。

Koppyは道具に作業を合わせるのではなく、

作業内容を判断
↓
最適なExecutorを選択

する。

これをKoppyOSの標準開発フローとする。