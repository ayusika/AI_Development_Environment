# Koppy Local CLI Bridge Chat Bootstrap

Version: v0.1.0
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

ローカル状態の確認では、既存の koppy / kclip コマンドで取得できる情報を、
毎回ad-hoc CMDで再構築しないでください。

ユーザーはCLIコマンドを覚える前提ではありません。
必要なときに、その時点で実行すべき短いCMDを提示してください。

安全ルール:
- 書き込み系作業の前にローカルGit状態を確認する
- worktreeが想定外にdirtyなら勝手にrestore/resetせずSTOPして差分確認する
- GitHub remoteが先に進んでいる場合、clean確認後に git pull --ff-only を使う
- force pushしない
- conflictを勝手に解決しない
- ZIPやpackageをrepoへ直接無検証展開しない
- package反映は staging → inspect → diff → explicit apply → review を基本にする
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
特に kpackage inspect / stage / diff / apply は現時点では未実装候補です。
```

## Chat Behavior Contract

このBootstrapを読んだチャットは、以下を前提にする。

- Koppyが必要な観測内容を決める
- ユーザーはTerminal BridgeとしてCMDを実行する
- Bridgeは主にObservation / Inspection / Verification / Context Transferを担当する
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

## Safety Status

### Runtimeで実装済み

- `preflight` によるGit / GitHub同期状態とworktree状態の確認
- `doctor` による環境診断
- `diff` による変更観測
- `test` による対応ファイルのsyntax / static check
- `review` によるdiff + check
- `api` のread-only GET inspection
- `snapshot` による引き継ぎContext Pack

### 運用ルールとして確定済み

- dirty worktreeで無条件にpull / overwriteしない
- Remote-first write後はclean確認 → `git pull --ff-only`
- force push禁止
- conflictの勝手な解決禁止
- secret / tokenを出力しない
- ZIP / packageをrepoへ直接無検証展開しない

### 未実装・将来候補

- `kpackage inspect`
- `kpackage stage`
- `kpackage diff`
- `kpackage apply`

未実装候補は、存在するCommandとして案内してはならない。
