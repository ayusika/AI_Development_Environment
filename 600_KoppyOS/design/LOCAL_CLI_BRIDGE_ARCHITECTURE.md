# Koppy Local CLI Bridge Architecture

Version: v0.2.0  
Status: ACTIVE

---

# 1. Purpose

Koppy Local CLI Bridgeは、

通常のChatGPTチャットから
ユーザーのMacローカル環境へ直接アクセスできない場合でも、

Koppy
↓
短い標準CMD
↓
ユーザーによるTerminal実行
↓
標準化された結果
↓
Koppy

という経路によって、

ローカルrepo・Git状態・GitHub同期状態・実ファイル・検索結果・diff・テスト結果等を
一貫した形式でKoppyが観測できるようにするためのLocal Bridgeである。

主な目的は、

- ローカル状態確認の往復回数削減
- ad-hoc CMDの再生成削減
- チャットごとの操作差異削減
- Koppyが古い会話や推測だけで判断することの防止
- ユーザーが複雑なCLI操作を覚える必要の削減
- チャット引き継ぎ時のContext圧縮
- Codex / Writer / VS Code Agent実行後の検証標準化

である。

---

# 2. Position in KoppyOS

Koppy Local CLI Bridgeは、

Executorではない。

役割は、

Local Observation
Inspection
Verification
Context Transfer

である。

基本構造：

```text
Koppy
  ↓
必要な観測内容を判断
  ↓
Koppy Local CLI Bridge
  ↓
しいちゃんがCMDを実行
  ↓
Terminal Output / Clipboard
  ↓
Koppy
  ↓
判断・設計
  ↓
Executor Selection
  ↓
WRITER / CODEX / VSCODE_AGENT

ファイル変更・削除・移動・commit・push等の実作業は、
既存のExecutor Selection Protocolに従う。

Bridgeの存在を理由に、
Koppy自身がExecutor Selectionを迂回してはならない。

3. Runtime Implementation

現在のLocal Runtime実装：

~/.koppy_cli.sh

Bash起動時に：

~/.bashrc

から読み込む。

GitHub上の本Architectureは、

Bridgeの役割・公開Command Contract・運用原則

のSource of Truthとする。

ローカルの

~/.koppy_cli.sh

はRuntime Implementationであり、
Architectureの正本そのものではない。

将来、
Runtime ImplementationのGitHub管理・Installer化を行う場合も、
ArchitectureとRuntime実装の役割を区別する。

4. Current Command Contract

現在の正式Command Namespace：

koppy

Version確認：

koppy version

現在：

Koppy Local CLI Bridge 0.2.0
5. Preflight / Environment Inspection
5.1 preflight
koppy preflight
kclip preflight

主な確認：

repository
branch
upstream
local HEAD
GitHub remote HEAD
staged
unstaged
untracked
edit開始前のReady判定

通常の開発開始前は、

kclip preflight

を優先する。

5.2 doctor
koppy doctor
kclip doctor

preflightより詳細な環境診断を行う。

主な確認：

必須CLI
optional CLI
GitHub authentication
repository
branch
upstream
worktree
live GitHub sync
runtime versions

環境異常調査時に使用する。

6. File / Repository Inspection
6.1 locate
koppy locate <filename-or-fragment> [path]
kclip locate <filename-or-fragment> [path]

ファイル名またはその一部から対象ファイルを探索する。

6.2 structure
koppy structure [path] [depth]
kclip structure [path] [depth]

ディレクトリ構造を取得する。

6.3 file
koppy file <file> [start_line] [end_line]
kclip file <file> [start_line] [end_line]

以下をまとめて取得する。

absolute path
line count
byte count
requested range
Git状態
latest commit
line-numbered content

巨大ファイルは必要範囲のみ読む。

6.4 search
koppy search <text> [path]
kclip search <text> [path]

repository内の文字列検索を行う。

結果は、

file:line:column:content

形式を基本とする。

大量結果はtruncateする。

6.5 context
koppy context <file> [start_line] [end_line]
kclip context <file> [start_line] [end_line]

特定ファイルについて、

basename参照箇所
Git history
current diff
requested file content

をまとめて取得する。

Koppyが特定実装を調査するときの
標準的なDeep Inspection Commandとする。

7. Change Inspection / Verification
7.1 diff
koppy diff [file]
kclip diff [file]

現在の

status
diff summary
unstaged diff
staged diff

をKoppy向けに取得する。

巨大diffはtruncateし、
必要に応じてfile単位へ分割する。

7.2 test
koppy test [file]

対象ファイルまたは変更ファイルへ、
安全なsyntax / static checkを実行する。

現在の主な対応：

PHP
JavaScript
JSON
YAML
Bash
Python

Bashでは可能な場合ShellCheckも使用する。

このCommandはRuntimeやApplication全体の完全な動作保証を意味しない。

7.3 review
koppy review
kclip review

編集後の標準Review Command。

主に、

git state
↓
diff
↓
automatic syntax checks
↓
review result

をまとめて取得する。

Codex / Writer / VS Code Agent等による編集後は、
可能な場合、

kclip review

を優先する。

自動テストがPASSしていても、
Koppyによるdiff確認を省略してよいことを意味しない。

8. History / Handoff
8.1 history
koppy history <file> [count]

特定ファイルのGit履歴を取得する。

8.2 changes
koppy changes [count]

最近のcommitと変更ファイルを取得する。

8.3 snapshot
koppy snapshot
kclip snapshot

チャット引き継ぎ・作業再開用のContext Pack。

現在は主に、

preflight
recent commits
local diff

をまとめる。

新しい開発チャットへ移動した場合や、
現在状態を短時間で再取得したい場合は、

kclip snapshot

を優先する。

9. HTTP Inspection
9.1 api
koppy api <url>
kclip api <url>

HTTP GETによるread-only inspectionを行う。

主な出力：

HTTP status
content type
final URL
selected headers
body preview
JSON formatting

BridgeのAPI Commandは、
原則としてread-only observation用途とする。

POST / PUT / PATCH / DELETE等による変更操作を、
このArchitectureのread-only Commandとして暗黙追加してはならない。

10. Clipboard Bridge
kclip

は、

koppy <command>

のOutputを

Terminalへ表示
macOS clipboardへコピー

するためのBridgeである。

基本形：

kclip <command> ...

これにより、

Koppy
↓
CMD提示
↓
しいちゃん実行
↓
⌘V
↓
Koppy

という最小往復でLocal Contextを渡す。

ユーザーは各内部Commandの構造を記憶する必要はない。

Koppyが必要なCommandを提示する。

11. Standard Workflows
11.1 開発開始前
kclip preflight

必要に応じて：

kclip doctor
11.2 対象場所が不明
kclip locate "<name>"

または：

kclip search "<text>"
11.3 対象ファイル調査
kclip context <file> <start> <end>
11.4 Executor編集後
kclip review
11.5 チャット引き継ぎ
kclip snapshot
12. Ad-hoc Command Reduction Rule

Koppy Local CLI Bridgeで同等処理を実行できる場合、

Koppyは原則として、

毎回独自に、

git status
git log
git diff
rg
fd
bat
gh api
curl
jq
tree

等を複数組み合わせた長いCMDを再構築しない。

Bridge Commandを優先する。

目的：

Conversation Context削減
Command再設計削減
操作ミス削減
出力形式統一
チャット間の挙動統一

ただし、

Bridge自身のdebug
Bridgeでは取得できない情報
一回限りの特殊調査
Executor内部で必要な処理

ではad-hoc CMDを使用できる。

同一種類のad-hoc処理が繰り返し必要になった場合は、
Bridgeの正式Command追加を検討する。

13. Safety Boundary

Current v0.2は、

Observation / Inspection / Verification

を中心とする。

以下を、
Bridgeの存在だけを理由に自動許可しない。

managed fileの書き換え
delete
rename / move
package展開による上書き
commit
push
force push
dependency install
macOS設定変更
secret変更
production変更

これらは、

Executor Selection
FILE_EDIT_PROTOCOL
Project固有ルール

等の既存正本に従う。

14. ZIP / Package Handling

ZIP download → Terminal展開 → repository反映

のような処理は、
Current v0.2の正式Command Contractには含めない。

理由：

直接repositoryへ展開した場合、

意図しないoverwrite
不要ファイル混入
stale file混入
path誤認
未確認差分

を発生させる可能性がある。

将来候補：

kpackage inspect
kpackage stage
kpackage diff
kpackage apply

想定Flow：

Package
↓
Temporary / Staging Area
↓
Contents Inspection
↓
Repositoryとの差分確認
↓
Safety Check
↓
Explicit Apply
↓
Review

原則として、

ZIPを直接repositoryへ無検証展開するCommandを
標準Bridgeとして採用しない。

15. Context Reduction Principle

Koppyは、

Local CLI BridgeのCommand仕様を
毎チャットのConversation Memoryだけへ依存させない。

新しいチャット・Executor・開発Sessionでは、

GitHub上の本Architectureを参照することで、

使用可能Command
標準Workflow
Safety Boundary
運用思想

を復元できる状態を維持する。

これにより、

同一Command群の説明・再設計・長いShell Script生成を
毎回繰り返す必要を減らす。

16. Versioning

Bridge Command Contractまたは重要な挙動を変更した場合は、
Architecture Versionを更新する。

現在：

v0.2.0

実戦利用で不足を発見した場合、
必要な機能のみv0.3以降へ追加する。

機能数を増やすこと自体を目的としない。

17. Source of Truth

Architecture Source of Truth：

600_KoppyOS/design/LOCAL_CLI_BRIDGE_ARCHITECTURE.md

関連正本：

AGENTS.md
600_KoppyOS/protocols/EXECUTOR_SELECTION_PROTOCOL.md
600_KoppyOS/protocols/FILE_EDIT_PROTOCOL.md
600_KoppyOS/design/ARCHITECTURE.md

Runtime Implementation：

~/.koppy_cli.sh

ArchitectureとRuntime Implementationに不整合が見つかった場合、
推測で補完せず確認・修正する。

━━━━━━━━━━━━━━━━━━
■ 変更ファイル 2
━━━━━━━━━━━━━━━━━━

AGENTS.md

操作:
限定追記

変更理由:
新しいチャット・Codex・Executorが、
Mac Terminal作業時にKoppy Local CLI Bridgeの存在を発見できるようにする。

現在の「必ず参照する正本」一覧の後、
「必要に応じて〜」の段落より前またはその直後に、
以下を1回だけ追記する。

追記内容:

Local CLI Bridge

MacローカルTerminal経由でrepo・ファイル・Git状態・diff・テスト結果等を
調査・検証する場合は、

600_KoppyOS/design/LOCAL_CLI_BRIDGE_ARCHITECTURE.md

を確認し、既存のKoppy Local CLI Bridgeを優先して使用する。

同等処理を実行できるBridge Commandが存在する場合は、
複数のad-hoc CMDを毎回再構築しない。

Bridgeは原則として観測・調査・検証レイヤーであり、
ファイル変更等の実作業は既存のExecutor Selectionと
FILE_EDIT_PROTOCOL.mdに従う。

━━━━━━━━━━━━━━━━━━
■ 変更禁止
━━━━━━━━━━━━━━━━━━

000_HOME/次にやること.md を変更しない
CURRENT_STATUS.md を変更しない
PROTOCOL_INDEX.md を変更しない
EXECUTOR_SELECTION_PROTOCOL.md を変更しない
FILE_EDIT_PROTOCOL.md を変更しない
既存AGENTS.md内容を削除・再構成しない
他ファイルを変更しない

━━━━━━━━━━━━━━━━━━
■ 確認
━━━━━━━━━━━━━━━━━━

作業前:

現在のGitHub正本を確認
git status確認

作業後:

新規Architectureが存在すること
AGENTS.mdからArchitectureへ到達できること
他ファイルに意図しない変更がないこと
git diff確認

commit message:

KoppyOS: document local CLI bridge architecture

commit:
true

push:
true


これをWriterに通したあと、こっちではもう長い確認CMDを作らなくていい。

**pushが終わったら、この2本だけで検収できる。**

```bash
kclip preflight