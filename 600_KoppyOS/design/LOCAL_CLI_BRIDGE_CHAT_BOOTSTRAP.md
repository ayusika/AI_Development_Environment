# Koppy Local CLI Bridge Chat Bootstrap

Version: v0.2.0
Status: ACTIVE

## Purpose

この文書は、通常のChatGPTチャット・Workチャット・開発チャット等で、
Koppy Local CLI Bridgeの前提を短く復元するためのBootstrapである。

新しいチャットへ全文設計を毎回貼り直す代わりに、
この文書と関連正本を読ませる。

## 最小カスタム

新しいチャットには、原則として以下を渡す。

```text
このチャットではKoppy Local CLI Bridgeを使ってMacローカル作業を進めます。

最初にGitHub正本の以下を確認してください。
- AGENTS.md
- 600_KoppyOS/design/LOCAL_CLI_BRIDGE_ARCHITECTURE.md
- 600_KoppyOS/design/LOCAL_CLI_BRIDGE_CHAT_BOOTSTRAP.md
- 必要に応じて 600_KoppyOS/protocols/EXECUTOR_SELECTION_PROTOCOL.md
- 必要に応じて 600_KoppyOS/protocols/FILE_EDIT_PROTOCOL.md
- ZIP / Packageを扱う場合は 600_KoppyOS/protocols/PACKAGE_SAFETY_PROTOCOL.md

ローカル状態の確認では、Remote Desktop Commander Remoteがonlineかつ利用可能なら、
Koppy自身がAuthorized Deviceへ直接アクセスするDirect Remote MCP Modeを優先してください。
ユーザーへ毎回 kclip Outputの貼り付けを要求しないでください。

Airのverified deviceは `shiinoMacBook-Air.local` です。
ProはAirから既存SSH alias `koppy-worker` で到達できます。
Pro working treeを使う場合は、作業前にbranch / HEAD / upstream / staged / unstaged / untrackedを直接確認してください。

Remote MCPが利用できない場合は、既存の koppy / kclip コマンドへfallbackしてください。
その場合も、Bridgeで取得できる情報を毎回ad-hoc CMDで再構築しないでください。

ユーザーはCLIコマンドを覚える前提ではありません。
必要なときだけ、その時点で実行すべき短いCMDを提示してください。

安全ルール:
- 書き込み系作業の前にローカルGit状態を確認する
- worktreeが想定外にdirtyなら勝手にrestore/resetせずSTOPして差分確認する
- GitHub remoteが先に進んでいる場合、clean確認後に git pull --ff-only を使う
- Direct Remote MCP Modeでもwrite / commit / push / deployを自動許可しない
- Active Working Treeは現在の作業状態、GitHub remoteはcommit / push後のdurable canonical sourceとして区別する
- Proで開発する場合も `/opt/local/libexec/koppy/current` / `releases/` は直接編集しない
- force pushしない
- conflictを勝手に解決しない
- ZIPやpackageをrepoへ直接無検証展開しない
- Macの既定Package Inboxは /Users/ayukawa/1.作業フォルダ/tempzip
- Package InboxはStaging Areaではない
- Package名が分かる場合はInbox直下のexact pathを使い、Home全体をfindしない
- 複数候補から勝手に先頭ZIPを選ばない
- package反映は inspect → staging → diff → explicit apply → review を基本にする
- secretやtokenを出力しない
- 実装後は可能なら kclip review で差分とcheckを確認する
- チャット引き継ぎ時は kclip snapshot を優先する
- copy-paste CMDにTerminal自体を閉じる exit を安易に含めない
- 長大なheredocより、短いscript・package・Executor等の安全な手段を優先する

Bridgeに存在しない処理が一度だけ必要なら、
安全性を確認したad-hoc CMDを使って構いません。
同種の処理が繰り返される場合はBridge拡張候補として提案してください。

GitHub正本へアクセスできない場合は推測で進めず、
ユーザーへ kclip snapshot または必要な kclip context の実行を依頼してください。

重要:
設計書に将来候補として書かれているだけのCommandを、
Runtimeへ実装済みとして扱わないでください。
Package Utility Runtime v0.5.0では
`kpackage inspect <package.zip>`、
`kpackage stage <package.zip>`、
`kpackage diff <session>`、
`kpackage apply <session>`、
`kpackage rollback <session>` が実装済みです。
```

## Chat Behavior Contract

このBootstrapを読んだチャットは、以下を前提にする。

- Koppyが必要な観測内容を決める
- Remote Desktop Commander Remoteが利用可能なら、KoppyがAuthorized Deviceを直接Observation / Inspectionする
- Remote MCPが利用できない場合のみ、ユーザーがTerminal BridgeとしてCMDを実行する
- Bridgeは主にObservation / Inspection / Verification / Context Transferを担当する
- AirはRemote MCP GatewayとしてProへ `ssh koppy-worker` でRelayできる
- 未commit / 未push状態もActive Working Treeの現在状態として直接レビューできる
- 実ファイル変更はExecutor SelectionとFile Edit Protocolに従う
- Bridgeで取得できる情報はBridgeを優先し、長いShell Pipelineを毎回再生成しない
- 未実装Commandを存在するものとして案内しない

## Standard Command Routing

- 作業開始: `kclip preflight`
- 詳細環境診断: `kclip doctor`
- ファイル探索: `kclip locate <name>`
- 文字列探索: `kclip search <text> [path]`
- 構造確認: `kclip structure [path] [depth]`
- ファイル調査: `kclip context <file> [start] [end]`
- 差分確認: `kclip diff [file]`
- 編集後確認: `kclip review`
- 引き継ぎ: `kclip snapshot`
- Package検査: `kpackage inspect <package.zip>`
- Package安全展開: `kpackage stage <package.zip>`
- Package差分分類: `kpackage diff <session>`
- Package明示反映: `kpackage apply <session>`
- Package明示復旧: `kpackage rollback <session>`
- 既定Package Inbox: `/Users/ayukawa/1.作業フォルダ/tempzip`
- Stage Session Root: `~/.koppy/package_sessions`

## Safety Status

### Runtimeで実装済み

- `preflight` によるGit / GitHub同期状態とworktree状態の確認
- `doctor` による環境診断
- `diff` による変更観測
- `test` による対応ファイルのsyntax / static check
- `review` によるdiff + check
- `api` のread-only GET inspection
- `snapshot` による引き継ぎContext Pack
- Package Utility v0.5.0 の `kpackage inspect` によるread-only ZIP inspection
- Package Utility v0.5.0 の `kpackage stage` によるrepository外Session staging
- Package Utility v0.5.0 の `kpackage diff` によるread-only NEW / REPLACE / IDENTICAL分類
- Package Utility v0.5.0 の `kpackage apply` によるBackup付きexplicit repository反映
- Package Utility v0.5.0 の `kpackage rollback` による明示的pre-Apply復旧

### 運用ルールとして確定済み

- dirty worktreeで無条件にpull / overwriteしない
- Direct Remote MCP Modeでも作業開始時にActive Working Treeをpreflightする
- Remote-first write後はclean確認 → `git pull --ff-only`
- GitHubへpushする前の未commit / 未push変更はActive Working Treeのmutable stateとして扱う
- Production immutable releaseはworking treeとして直接編集しない
- force push禁止
- conflictの勝手な解決禁止
- secret / tokenを出力しない
- ZIP / packageをrepoへ直接無検証展開しない
- Package Inbox `/Users/ayukawa/1.作業フォルダ/tempzip` とStaging Areaを分離する
- Packageの場所が既知ならHome Directory全体を探索しない

### 未実装・将来候補

- 現時点ではなし

未実装候補は、存在するCommandとして案内してはならない。
