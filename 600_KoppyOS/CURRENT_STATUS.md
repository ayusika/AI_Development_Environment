---

## 2026-08-09 Writer Adaptive Chunk Transport v3 E2E成功

Koppy Writerの長文Proposal Transportについて、
WAFを無効化せず長文を安全に送信する経路のE2E動作確認に成功した。

### 確認済みフロー

Writer本文
→ UTF-8
→ Base64
→ Chunk分割
→ WAFで403となるChunkのみ再分割
→ 全ChunkをPrivate Temporary Storageへ保存
→ Base64再構築
→ SHA-256完全性検証
→ Finalize
→ Proposal生成
→ Approval
→ GitHub Executor
→ GitHub正本反映

### Adaptive Chunk Transport v3

初期Chunk Sizeは64文字。

送信時にWAFから403となったChunkのみ、

64
→ 32
→ 16

のように再帰的に細分化する。

安全に送信できるChunkはそのまま使用し、
問題のあるChunkだけを小さくする。

これにより、
すべての長文を極端に小さいChunkへ固定する必要がない。

### 完全性確認

本番テストでは、

- Base64 Reconstruction Check成功
- 全Chunk保存成功
- Finalize HTTP 200
- SHA-256一致
- integrity_verified = true
- Temporary Upload削除成功
- Proposal生成成功
- Approval成功
- GitHub Executor成功
- GitHub正本への反映確認成功

まで確認した。

### 本番反映テスト

対象：

600_KoppyOS/design/AUTH_ARCHITECTURE.md

Proposal ID：

88c7926db73215d4

GitHub Commit：

4af27080adf2863f55e8283d92f26feb3e47f506

追加内容：

- Secret情報の取り扱いルール
- 手動編集箇所の♦︎♦︎表示ルール

GitHub正本を再取得し、
追加内容が正しい実文字列で保存されていることまで確認済み。

### Safety

Chunk Upload中はGitHubを書き換えない。

FinalizeもProposal生成までとし、
GitHub書き込みは行わない。

GitHub変更は、

Proposal
→ Approval
→ Executor

の既存Safety Flowを維持する。

WAFは有効なままとする。

### 次工程

現在DevTools Console上で実証している
Adaptive Chunk Transport処理を
Koppy Writer UIへ統合する。

最終目標は、

しいちゃんがWriterへ内容を入力
→ 「変更案をつくる」
→ Transport方式を意識せずProposal生成

までを自動化すること。

Adaptive分割、Chunk Upload、Finalize、完全性検証は
Writer内部処理として隠蔽する。

---

## 2026-09-08 Writer / Codex Dual Executor運用開始

KoppyOSに、
WriterとCodexを役割分担して使用する
Dual Executor構成を正式導入した。

### 基本構成

```text
Koppy
↓
作業内容・仕様・安全性を判断
↓
Executor Selection
├─ Writer
└─ Codex
↓
Execution
↓
Verification

```

Koppyを設計・判断の主体とし、
WriterとCodexは異なる性質を持つExecutorとして扱う。

### Executor Selection Protocol

以下を新規作成した。

```text
600_KoppyOS/protocols/EXECUTOR_SELECTION_PROTOCOL.md
```

標準モードとして、

```text
AUTO
WRITER
CODEX
```

の3モードを定義した。

ユーザーがExecutorを指定しない場合はAUTOとし、
Koppyが作業内容を判断してWriterまたはCodexを選択する。

### Writerの役割

Writerは、
Koppyが確定した変更を正確に反映する
Deterministic Executorとして扱う。

主な対象：

- 設計
- 運用ルール
- 現在地
- 次にやること
- 決定事項
- 更新履歴
- セーブ処理
- Exact Matchによる小規模変更

`セーブ！` によるKoppyOS状態確定は、
原則としてWriterを使用する。

### Codexの役割

Codexは、
ローカル実ファイルを確認してコードを実装する
Intelligent Code Executorとして扱う。

主な対象：

- HTML
- CSS
- JavaScript
- PHP
- その他のコード
- 複数ファイル実装
- リファクタリング
- テスト
- diff確認
- Git操作

Codexが設計判断の主体になるのではなく、
Koppy / ユーザーが決定した仕様・制約・成功条件をもとに実装する。

### File Edit Protocolとの接続

```text
600_KoppyOS/protocols/FILE_EDIT_PROTOCOL.md
```

へExecutor Selection Protocolとの役割分担を追加した。

```text
EXECUTOR_SELECTION_PROTOCOL
↓
どのExecutorを使用するか決定

FILE_EDIT_PROTOCOL
↓
選択されたExecutorが
どのように安全にファイルを変更するか定義
```

File Edit ProtocolはWriter専用ではなく、
Codexを含む他のExecutorでも基本安全原則を維持する。

### Koppy OS表示ルール

```text
040_Koppy/性格/README.md
```

へAUTO / WRITER / CODEXのExecutor別表示ルールを追加した。

Writerでは、
変更内容そのものを個別にコピーできる形式を使用する。

Codexでは、
置換コードをKoppyが先に生成するのではなく、

- 目的
- 対象
- 変更要件
- 変更禁止事項
- 必ず読むファイル
- 実行手順
- 確認項目
- commit / push方針

等を含む完全なCodex用実装指示を渡す。

### Writer target_pathルール修正

Writer API / Executorが受け取るファイルパスは、
repository nameを含まない
repo-relative pathを正式形式とした。

正：

```text
600_KoppyOS/protocols/FILE_EDIT_PROTOCOL.md
```

誤：

```text
AI_Development_Environment/600_KoppyOS/protocols/FILE_EDIT_PROTOCOL.md
```

この不一致により発生していた
Writer ExecutorのAllowlist 403を解消した。

### Codex Repository Guide

リポジトリルートへ、

```text
AGENTS.md
```

を新規作成した。

AGENTS.mdは巨大な仕様書ではなく、
Codexが作業開始時に参照する短い入口・地図として扱う。

CodexはAGENTS.mdから、

- Executor Selection Protocol
- File Edit Protocol
- KoppyOS CURRENT_STATUS
- 000_HOME 現在の状態
- 次にやること
- 決定事項
- プロジェクト固有の設計書

等のGitHub正本へ移動する。

### Codex Git動作確認

Codexについて以下を実動作確認済み。

```text
local repository read
↓
file edit
↓
git status / diff
↓
commit
↓
non-fast-forward検知
↓
fetch / rebase
↓
normal push
↓
GitHub正本反映
↓
KoppyがGitHubから再読込
```

force pushは使用しない。

conflictが発生した場合は
Codexが勝手に解決せずSTOPする。

### 現在の標準開発フロー

```text
しいちゃん
↓
Koppyへ作業依頼
↓
Koppyが目的・仕様を判断
↓
AUTO / WRITER / CODEX判定
↓
Executor実行
↓
GitHub正本反映
↓
Koppyが再確認
↓
必要な節目でセーブ！
```

WriterとCodexは競合させず、
それぞれ得意な作業へ割り当てる。

今後は実際のKohaku Work等の開発で
AUTO → CODEXを使用し、
不足するCodexルールが判明した場合のみ
AGENTS.mdまたは追加ルールを段階的に拡張する。

---

## 2026-09-08 VS Code Agent Executor正式採用

Codexの利用上限をきっかけに、
VS Code AgentがKoppyOSの代替・補完Executorとして安全に利用できるか実機検証を行った。

検証結果を受け、
VS Code Agentを正式に

Intelligent Local Workspace Executor

としてKoppyOSへ追加した。

### 現在のExecutor構成

```text
AUTO
├─ WRITER
├─ CODEX
└─ VSCODE_AGENT
```

Koppyが作業内容・対象環境・安全性を判断し、
最適なExecutorを選択する。

### VS Code Agentの役割

VS Code Agentは、
VS Codeからアクセス可能なローカルworkspace・実ファイル・Terminalを使用して作業する。

主な用途：

- VS Code workspace内のコード編集
- ローカルファイルの作成・編集・削除
- 複数ファイル実装
- Terminalコマンド実行
- テスト・lint・動作確認
- diff / Git状態確認
- Codex利用不能時のfallback
- Git管理外ローカルファイルの操作
- macOS上で利用可能なiCloud Drive同期ファイルの操作

### 実機検証結果

2026-09-08のテストで以下を確認した。

```text
正本参照
↓
Git状態確認
↓
ローカルファイル作成
↓
実行
↓
既存ファイルとして再読込
↓
部分変更
↓
再実行
↓
結果検証
↓
自己修正
↓
最終確認
```

確認済み：

- AGENTS.md参照
- EXECUTOR_SELECTION_PROTOCOL.md参照
- FILE_EDIT_PROTOCOL.md参照
- git status / branch / origin/main差分確認
- ローカルファイル作成
- 既存ファイル編集
- Terminal実行
- 実行結果確認
- 問題検出後の追加修正
- unrelated filesを変更しない作業
- commit / push禁止指示の遵守
- テストファイルの安全な削除

### Safe STOP確認

Node.jsを必要とする初回テストでは、
ローカル環境に`node` / `nodejs`が存在しなかった。

VS Code Agentは、
勝手にNode.jsをインストールせず、

```text
runtime unavailable
↓
STOP
```

と判断した。

この結果から、
Intelligent Executor共通ルールとして、

- 必要なruntime / toolが存在しない場合は勝手にインストールしない
- OS・アプリ・権限・環境設定を無断変更しない
- 安全に継続できない場合はSTOPする

を正式化した。

### iCloud Drive実機確認

VS Code Agentについて、
Finder上の

```text
iCloud Drive / Userscripts
```

に対応する実パスを特定し、
同一ディレクトリ内でテストファイルの

```text
作成
↓
読込
↓
内容検証
↓
削除
```

を正常完了した。

既存の

```text
kohaku-heaven-bridge.user.js
```

については、
読み取り前後でSHA-256不変を確認し、
既存ファイルへ変更を加えていないことを確認した。

iCloud Drive操作は無条件に可能とみなさず、
毎回、

- 実パス
- 対象実ファイル
- 親ディレクトリ
- 同期状態
- アクセス可能状態

を確認してから変更する。

### Fallback更新

通常のコード作業では、

```text
CODEX
↓
VSCODE_AGENT
↓
WRITERで安全に代替可能か判定
↓
安全に代替できなければSTOP
```

を基本fallbackとする。

ただし、
VS Code Agentは単なるCodexの縮小版ではなく、

Intelligent Local Workspace Executor

として独立した適性を持つ。

ローカルworkspace・Git管理外ファイル・iCloud Drive同期ファイル等では、
AUTO判定でVS Code Agentを直接選択できる。

### 正本更新

以下を更新した。

```text
600_KoppyOS/protocols/EXECUTOR_SELECTION_PROTOCOL.md
040_Koppy/性格/README.md
```

Executor Selection Protocolはv0.2へ更新し、
VSCODE_AGENTモード・fallback・安全ルール・確認済み能力を追加した。

Koppy OS表示ルールにも、
VS Code Agentへそのまま渡せる完全な作業指示形式を追加した。

### 現在の標準開発フロー

```text
しいちゃん
↓
Koppyへ作業依頼
↓
Koppyが目的・仕様・対象環境・安全性を判断
↓
AUTO
├─ WRITER
├─ CODEX
└─ VSCODE_AGENT
↓
Executor実行
↓
結果検証
↓
必要に応じてGitHub正本反映
↓
Koppyが再確認
↓
節目でセーブ！
```

Writer / Codex / VS Code Agentは競合させず、
それぞれ得意な作業へ割り当てる。
