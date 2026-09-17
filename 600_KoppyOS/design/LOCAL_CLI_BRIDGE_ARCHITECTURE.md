# Koppy Local CLI Bridge Architecture

Version: v0.2.6
Status: ACTIVE

## 1. Purpose

Koppy Local CLI Bridgeは、通常のChatGPTチャットからMacローカル環境へ直接アクセスできない場合でも、短い標準CMDをユーザーが実行することで、Koppyがローカル状態を正確かつ一貫した形式で観測するためのBridgeである。

主な目的：

- ローカル状態確認の往復削減
- ad-hoc CMDの再生成削減
- チャットごとの操作差異削減
- 古い会話や推測だけを根拠にした判断の防止
- ユーザーのCLI操作負担削減
- Conversation Contextの圧縮
- Executor実行後の検証標準化

## 2. Position in KoppyOS

Koppy Local CLI BridgeはExecutorではない。

役割は以下。

- Local Observation
- Inspection
- Verification
- Context Transfer

基本フロー：

Koppy
→ 必要な観測内容を判断
→ Koppy Local CLI Bridge用CMDを提示
→ しいちゃんがTerminalで実行
→ OutputをKoppyへ返却
→ Koppyが判断・設計
→ Executor Selection
→ WRITER / CODEX / VSCODE_AGENT

ファイル変更・削除・移動・commit・push等の実作業は、既存のExecutor Selectionに従う。

## 3. Source of Truth and Runtime

Architecture正本：

`600_KoppyOS/design/LOCAL_CLI_BRIDGE_ARCHITECTURE.md`

Mac側Runtime Implementation：

`~/.koppy_cli.sh`

Bash起動時に `~/.bashrc` から読み込む。

ArchitectureとRuntime Implementationに不整合がある場合、推測で補完せず確認する。

## 4. Command Namespace

統一Command：

`koppy <command>`

Clipboard Bridge：

`kclip <command>`

Current Runtime Version：

`0.2.0`

## 5. Command Contract

### preflight
`koppy preflight` / `kclip preflight`

開発開始前の軽量診断。repository、branch、upstream、local HEAD、GitHub remote HEAD、staged、unstaged、untracked、Ready判定を確認する。

### doctor
`koppy doctor` / `kclip doctor`

CLI・GitHub認証・Runtimeを含む詳細診断。

### locate
`koppy locate <filename-or-fragment> [path]`

ファイル名から対象を探索する。

### structure
`koppy structure [path] [depth]`

ディレクトリ構造を取得する。

### file
`koppy file <file> [start_line] [end_line]`

Git状態・行数・最新commit・行番号付き本文を取得する。

### search
`koppy search <text> [path]`

repository内の文字列を検索する。

### context
`koppy context <file> [start_line] [end_line]`

basename参照箇所、Git history、current diff、file contentをまとめて取得する。特定実装を調査する際の標準Deep Inspection Commandとする。

### diff
`koppy diff [file]`

現在のGit差分を取得する。

### test
`koppy test [file]`

安全なsyntax / static checkを実行する。Current対応はPHP、JavaScript、JSON、YAML、Bash、Python。BashではShellCheckも使用する。

### review
`koppy review` / `kclip review`

Executor編集後の標準Review Command。Git state → diff → automatic checks → review result をまとめて取得する。

### history
`koppy history <file> [count]`

特定ファイルのGit履歴を取得する。

### changes
`koppy changes [count]`

最近のcommitと変更ファイルを取得する。

### snapshot
`koppy snapshot` / `kclip snapshot`

チャット引き継ぎ・作業再開用Context Pack。主にpreflight、recent commits、local diffをまとめる。

### api
`koppy api <url>`

HTTP GETによるread-only inspectionを行う。

## 6. Clipboard Bridge

`kclip` は `koppy` のOutputをTerminalへ表示しながらmacOS Clipboardへコピーする。

ユーザーが内部Commandを記憶する必要はない。Koppyが必要なCommandを提示する。

## 7. Standard Workflow

開発開始前：`kclip preflight`

環境異常調査：`kclip doctor`

対象場所が不明：`kclip locate "<name>"` または `kclip search "<text>"`

対象ファイル調査：`kclip context <file> <start> <end>`

Executor編集後：`kclip review`

チャット引き継ぎ：`kclip snapshot`

## 8. Remote-first Write Sync Rule

Writer・GitHub Connector・Web UI・別端末などがGitHub remoteへ直接commit / pushした場合、Macローカルは自動更新されない。

標準Flow：

Remote Write完了
→ `kclip preflight`
→ Local worktreeがcleanか確認
→ `git pull --ff-only`
→ `kclip preflight`
→ Local Context取得

`git pull --ff-only` を使用し、意図しないmerge commitを自動生成しない。

ローカルに未commit変更がある場合は、無条件でpullせずSTOPする。

## 9. Ad-hoc Command Reduction Rule

Bridgeで同等処理が可能な場合、Koppyは原則として毎回 `git status`、`git log`、`git diff`、`rg`、`fd`、`bat`、`gh api`、`curl`、`jq`、`tree` 等を複数組み合わせた長いCMDを再構築しない。

既存Bridge Commandを優先する。

例外：

- Bridge自身のdebug
- Bridgeでは取得できない情報
- 一回限りの特殊調査
- Executor内部で必要な処理

同種のad-hoc処理が繰り返される場合は、Bridgeへの正式Command追加を検討する。

## 10. Safety Boundary

Current v0.2はObservation、Inspection、Verification、Context Transferを中心とする。

Bridgeの存在だけを理由に、managed fileの書き換え、delete、rename / move、package展開による上書き、commit、push、force push、dependency install、macOS設定変更、secret変更、production変更を自動許可しない。

これらは既存のExecutor Selection、FILE_EDIT_PROTOCOL、Project固有ルールに従う。

## 11. ZIP / Package Handling

ZIP / Packageのrepository反映は、
Koppy Local CLI Bridge本体の責務には含めない。

Bridgeは引き続き、

- Observation
- Inspection
- Verification
- Context Transfer

を担当する。

PackageのInspection・展開・repository反映は、
Bridgeとは責務を分離した独立Utilityとして扱う。

詳細な安全仕様の正本：

`600_KoppyOS/protocols/PACKAGE_SAFETY_PROTOCOL.md`

Package Runtime Source of Truth：

`600_KoppyOS/runtime/koppy_package.sh`

Current Mac Package Inbox：

`/Users/ayukawa/1.作業フォルダ/tempzip`

Package Inboxは、ユーザーがKoppy生成ZIPや確認対象Packageを置く
ローカル受け渡し場所であり、Staging Areaではない。

Package関連のcopy-paste CMDでは、
ユーザーから別指定がない限り上記Inboxを既定参照先とする。

Package名が既知の場合はInbox直下のexact pathを使用し、
`find "$HOME"` 等によるHome Directory全体の探索を標準手順にしない。

同名候補が複数ある場合や対象Packageを一意に決められない場合は、
勝手に先頭候補を採用せずSTOP / 確認する。

Current Package Utility Runtime：

`0.3.0`

Current Runtimeで実装済み：

- `kpackage inspect <package.zip>`
- `kpackage stage <package.zip>`
- `kpackage diff <session>`

Phase 1の`inspect`はread-onlyであり、
ZIPを展開せずmetadataのみを検査する。

Phase 2の`stage`はPASS Packageのみを受け付け、
repository外のSession固有Staging Areaへ安全展開する。
Stageはrepository fileを変更しない。

Phase 3の`diff`はSessionとStage時repository状態を再検証し、
staged fileを`NEW / REPLACE / IDENTICAL`へ分類するread-only Commandとする。
repository-only fileからDELETEを推測しない。

Current Stage Session Root：

`~/.koppy/package_sessions`

未実装・将来候補：

- `kpackage apply`
- `kpackage rollback`

未実装Commandを実行可能として案内してはならない。

基本Flow：

Package
→ Inspect
→ Repository外Staging
→ Repositoryとの差分確認
→ Safety Gate
→ Explicit Apply
→ `koppy review`

基本原則：

- ZIP / Packageをrepositoryへ直接展開しない
- Package Inboxは `/Users/ayukawa/1.作業フォルダ/tempzip` を既定とする
- Package InboxをStaging Areaとして扱わない
- stagingはrepository外の専用領域に作成する
- package pathを推測変換しない
- apply前にGit / HEAD / worktree / package状態を再確認する
- applyはcommit / pushを行わない
- apply後は既存の `koppy review` を使用する
- 正常反映後のtest失敗では自動rollbackしない
- copy途中等のapply失敗では可能な範囲で元状態へ復旧する
- rollbackは明示的Commandとして分離する

Package UtilityはBridgeの安全機能を再利用できるが、
BridgeそのものをExecutorへ変更するものではない。

## 12. Context Reduction Principle

Bridge仕様をConversation Memoryだけへ依存させない。

新しいチャット・Executor・開発SessionではGitHub上の本Architectureを参照し、使用可能Command・Standard Workflow・Safety Boundary・運用思想を復元できる状態を維持する。

これにより同じCommand説明・Shell Script生成・操作設計を毎回繰り返す必要を減らす。

## 13. Versioning

Command Contractまたは重要な挙動を変更した場合はVersionを更新する。

Current：`v0.2.6`

実戦で不足が確認された機能のみ追加する。機能数を増やすこと自体を目的としない。

## 14. Related Source of Truth

- `AGENTS.md`
- `600_KoppyOS/protocols/EXECUTOR_SELECTION_PROTOCOL.md`
- `600_KoppyOS/protocols/FILE_EDIT_PROTOCOL.md`
- `600_KoppyOS/protocols/PACKAGE_SAFETY_PROTOCOL.md`
- `600_KoppyOS/design/ARCHITECTURE.md`

## 15. Safety Capability Levels

Koppy Local CLI Bridgeの安全性は、
「Runtimeへ実装済みの機能」
「運用ルールとして確定している安全策」
「将来候補」
を明確に区別する。

### 15.1 Runtimeで実装済み

Current v0.2.xでRuntimeへ実装済みとして扱う主な安全・検証機能：

- `preflight` によるrepository / branch / upstream / local HEAD / remote HEAD / staged / unstaged / untracked確認
- `doctor` による環境・GitHub authentication・runtime診断
- `diff` による変更内容の観測
- `test` による対応ファイルのsyntax / static check
- `review` によるGit state + diff + automatic checks
- `api` のread-only HTTP GET inspection
- `snapshot` による引き継ぎContext Pack

これらはObservation / Inspection / Verificationを補助するものであり、
Application全体の完全な安全性や動作保証を意味しない。

### 15.2 Operational Safety Rules

以下はKoppyOSの運用ルールとして扱う。

- 書き込み系作業前にローカルGit状態を確認する
- worktreeが想定外にdirtyな場合、勝手にrestore / reset / overwriteしない
- Remote-first write後はclean確認後に `git pull --ff-only` を使用する
- force pushしない
- conflictを勝手に解決しない
- secret / tokenをTerminal Outputやチャットへ不用意に出力しない
- ZIP / packageをrepositoryへ直接無検証展開しない
- copy-paste CMDへTerminal自体を終了させる `exit` を安易に含めない
- 長大なheredocをTerminalへ貼り付ける必要がある場合、短いscript・package・Executor等のより安全な手段を優先する
- 実装・編集後は可能な場合 `kclip review` を使用する

### 15.3 Planned Only

以下はArchitecture上の将来候補であり、
Current Runtimeへ実装済みとは扱わない。

- `kpackage apply`
- `kpackage rollback`

設計書に名前が存在することを理由に、
未実装Commandをユーザーへ実行Commandとして提示してはならない。

### 15.4 Package Utility Runtime

Koppy Local CLI Bridgeとは別Runtimeとして、
Package Utility Runtime v0.3.0に以下を実装済みとする。

- `kpackage inspect <package.zip>`
- `kpackage stage <package.zip>`
- `kpackage diff <session>`

Runtime Source of Truth：

`600_KoppyOS/runtime/koppy_package.sh`

Mac Runtime：

`~/.koppy_package.sh`

Installer Source of Truth：

`600_KoppyOS/runtime/install_kpackage.sh`

Package Utilityの詳細な安全仕様は
`600_KoppyOS/protocols/PACKAGE_SAFETY_PROTOCOL.md`
を正本とする。

## 16. Chat Bootstrap

新しいChatGPTチャット・Workチャット・開発チャット等で
Local CLI Bridgeの前提を短く復元するための正本：

`600_KoppyOS/design/LOCAL_CLI_BRIDGE_CHAT_BOOTSTRAP.md`

他チャットへBridge利用前提を渡す場合、
全文ArchitectureをConversationへ複製するより、
BootstrapからGitHub正本を読ませる方法を優先する。

GitHub正本へアクセスできない場合は、
古いConversation Memoryだけで補完せず、
ユーザーへ `kclip snapshot` または必要な `kclip context` の実行を依頼する。

BootstrapはArchitectureの代替ではない。
詳細仕様とSafety Boundaryの正本は本Architectureと関連Protocolである。
