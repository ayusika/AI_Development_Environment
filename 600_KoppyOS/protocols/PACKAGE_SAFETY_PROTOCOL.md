# KoppyOS Package Safety Protocol

Version: v0.1.2
Status: ACTIVE

---

# 1. Purpose

このProtocolは、

ZIPその他のPackageとして受け取った複数ファイルを
KoppyOS管理repositoryへ安全に反映するための
Inspection、Staging、Diff、Apply、Rollbackの原則を定義する。

目的は利便性よりも、

- 意図しない上書き
- Path Traversal
- repository外への展開
- Git metadata破壊
- secret混入
- dirty worktreeへの上書き
- stale package適用
- package構造の誤推測
- apply途中失敗による中途半端な状態

を防止することである。

---

# 2. Position

Package処理は
Koppy Local CLI Bridge本体の責務とは分離する。

Koppy Local CLI Bridge：

- Observation
- Inspection
- Verification
- Context Transfer

Package Utility：

- Package Inspection
- Safe Staging
- Package / Repository Diff
- Explicit Apply
- Explicit Rollback

Package Utilityは必要に応じて、

- `koppy preflight`
- `koppy test`
- `koppy review`

等の既存Bridge機能を再利用できる。

ただし、
Package Utilityの存在を理由に
Koppy Local CLI Bridge自体をExecutorとして扱わない。

---

# 3. Command Contract and Implementation Status

Package Utility Runtime v0.1.0で実装済み：

```text
kpackage inspect <package.zip>
```

Phase 1ではZIPのみ対応する。

未実装・将来候補：

```text
kpackage stage <package>
kpackage diff <session>
kpackage apply <session>
kpackage rollback <session>
```

未実装Commandを実行可能として案内しない。

---

# 4. Package Path Rule

Package内部のファイルパスは
repository root relative pathとして扱う。

例：

```text
600_KoppyOS/...
900_Lab/...
AGENTS.md
```

Package内部に余分な親ディレクトリが存在しても、

```text
project/
repo/
src/
package/
```

等を自動的に除去してはならない。

Path変換が必要な場合はSTOPし、
Koppy / ユーザーが明示的に判断する。

推測によるPath normalizationを禁止する。

## 4.1 Local Package Inbox

Current Macの既定Package Inbox：

```text
/Users/ayukawa/1.作業フォルダ/tempzip
```

Package Inboxは、
ユーザーがKoppy生成ZIPや確認対象Packageを置く
ローカル受け渡し場所とする。

Package Inboxはtrusted directoryではない。
Inbox内に存在することを理由にPackageを安全とみなさない。

Package Inboxは以下とは分離する。

- repository
- Staging Area
- Session Backup
- Runtime Source of Truth

Package関連のcopy-paste CMDでは、
ユーザーから別指定がない限り
このInboxを既定参照先とする。

Package filenameが既知の場合は、
Inbox直下のexact pathを使用する。

例：

```text
/Users/ayukawa/1.作業フォルダ/tempzip/example.zip
```

標準手順として、
`find "$HOME"` 等でHome Directory全体を探索しない。

対象Packageを一意に決められない場合や
同名・類似候補が複数存在する場合は、
先頭候補を自動採用せずSTOP / 確認する。

InboxからPackageを取得した場合も、
Stage前に`inspect`による安全確認を行う。

---

# 5. Inspect

`inspect` はrepositoryへ書き込まない。

Phase 1 Runtime v0.1.0ではZIPのみ対応し、
archiveを展開せずmetadataを検査する。

確認対象：

- package形式
- package hash
- file count
- directory count
- total uncompressed size
- entry paths
- control / format character in path
- absolute / rooted path
- `..` path traversal
- symlink
- `.git`
- encrypted entry
- secret / credential filename候補
- 異常に巨大なentry
- 高compression ratio
- 重複 / collision path
- その他危険entry

Phase 1のResult：

```text
PASS
REVIEW
BLOCK
```

`PASS` はPhase 1 metadata inspectionで
blocking / review findingが検出されなかった状態。

`REVIEW` はsecret / credential filename候補、
大容量entry等、
Koppy / ユーザーによる確認が必要な状態。

`BLOCK` はcontrol / format character、absolute path、
path traversal、symlink、`.git`、encrypted entry、
duplicate / collision等、
次工程へ進めてはならない状態。

Phase 1 Runtimeの既定review threshold：

- 1 entry: 100 MiB超
- total uncompressed size: 500 MiB超
- compression ratio: 1000x以上かつuncompressed 10 MiB以上
- entry count: 10000超

これらthresholdは危険性の完全判定ではなく、
人間/Koppy reviewへ送るための保守的な基準とする。

秘密情報候補を検出した場合、
entry path以外の内容そのものを
TerminalやConversationへ不用意に表示しない。

Inspectはfile contentを表示しない。

Archive-controlled pathをTerminalへ表示する場合は、
改行・TAB・ESCその他のnon-printable characterを
そのままTerminal controlとして出力せず、
安全なescaped representationで表示する。

危険性を判定できない場合はFail Closedとする。

---

# 6. Stage

`stage` はpackageを
repository外の専用Staging Areaへ展開する。

Package Inboxそのものへ展開せず、
Inboxとは分離したSession固有Staging Areaを使用する。

repository直下へ直接展開してはならない。

Stage時にSessionを作成し、
最低限以下を保存する。

- Session ID
- package path
- package hash
- repository root
- branch
- repository HEAD
- staging path
- staged file list
- staged file hashes
- created timestamp

Stage時点ではrepositoryを変更しない。

---

# 7. Package Diff

`diff` はStagingとrepositoryを比較する。

初期Classification：

```text
NEW
REPLACE
IDENTICAL
```

Packageに存在しないrepository fileを
自動削除対象として扱わない。

初期Versionでは、
PackageによるDELETE操作を標準機能に含めない。

必要な削除は別Taskとして
FILE_EDIT_PROTOCOLおよびExecutor Selectionに従う。

---

# 8. Apply Safety Gate

`apply` の直前に
最低限以下を再確認する。

- repositoryが期待したrepositoryである
- branchが期待したbranchである
- current HEADがStage時HEADと一致する
- worktreeが安全な状態である
- package hashがStage時と一致する
- staged filesのhashがStage時と一致する
- staging directoryがSessionと一致する
- unexpected fileが追加されていない
- apply対象pathがrepository内に収まる

条件不一致時：

```text
STOP
```

勝手に最新状態へ合わせたり、
packageを再解釈して続行しない。

---

# 9. Backup

既存ファイルを置換する前に、
置換前状態をSession Backupへ保存する。

最低限保存するもの：

- replaced file backup
- newly created file list
- pre-apply hash
- apply対象一覧

Backupはrepository外に保持する。

---

# 10. Apply

`apply` は
明示的に確認されたSessionのみをrepositoryへ反映する。

初期Versionでは、

- commitしない
- pushしない
- force pushしない
- dependency installしない
- production deployしない

Apply後は可能な場合、

```text
koppy review
```

を使用して、

- Git state
- diff
- syntax / static check

を確認する。

---

# 11. Apply Failure

ファイルcopy途中等でApply処理自体が失敗した場合、
Package Utilityは可能な範囲で
Apply開始前状態への復旧を試みる。

復旧結果を必ず報告する。

復旧に成功したと推測して処理を継続してはならない。

復旧確認ができない場合はSTOPする。

---

# 12. Post-Apply Test Failure

Applyそのものが完了した後、

- syntax check failure
- static check failure
- review failure

が発生しても、
自動Rollbackは行わない。

理由：

適用されたdiff自体を
Koppy / ユーザーが確認すべき場合があるため。

この場合：

```text
STOP
→ Review
→ Koppy / User Decision
```

とする。

---

# 13. Rollback

`rollback <session>` は
明示的なRollback操作とする。

Rollback前にも現在状態を確認する。

Apply後に対象ファイルへ
別変更が加えられている場合、
勝手に上書きRollbackしない。

安全にRollback可能と確認できない場合はSTOPする。

Rollback後も、

```text
koppy review
```

等で状態を確認する。

---

# 14. Git Responsibility

Package Utilityは
repository fileの安全反映までを責務とする。

以下は責務に含めない。

- commit
- push
- force push
- merge
- conflict resolution

Package反映後のGit操作は
EXECUTOR_SELECTION_PROTOCOLおよび
FILE_EDIT_PROTOCOLに従う。

---

# 15. Runtime Source of Truth

Package Runtimeの正本：

```text
600_KoppyOS/runtime/koppy_package.sh
```

Mac Runtime：

```text
~/.koppy_package.sh
```

Installer正本：

```text
600_KoppyOS/runtime/install_kpackage.sh
```

Runtime test正本：

```text
600_KoppyOS/runtime/test_koppy_package.sh
```

Installerは明示的な`--apply`指定でのみ
Mac RuntimeおよびBash起動設定を変更する。

既存Mac Runtimeや`~/.bashrc`が存在する場合は、
変更前にbackupを作成する。

RuntimeはGitHub正本からMac Runtimeへcopyし、
`~/.bashrc`から読み込む。

Installerを子Shellで実行しても
親Shellのfunction定義は更新されないため、
install後はユーザーが明示的に

```text
source ~/.bashrc
```

を実行する。

Runtime Source of TruthとMac Runtimeに不整合がある場合、
推測して続行しない。

---

# 16. Security Principles

Package処理では以下を禁止する。

- repositoryへの直接ZIP展開
- Package InboxをStaging Areaとして再利用
- 複数候補から無確認で先頭Packageを採用
- Home Directory全体の不要なPackage探索を標準化
- absolute path entry
- `..` によるrepository外参照
- `.git` 上書き
- symlinkを利用したrepository外書き込み
- secret内容の不用意な出力
- dirty worktreeへの無条件上書き
- stale Sessionの無確認Apply
- path structureの自動推測
- Applyとcommit / pushの自動連結
- conflictの自動解決

安全性を確認できない場合はFail Closedとする。

---

# 17. Implementation Order

Runtime実装は段階的に行う。

推奨順：

```text
1. inspect
2. stage
3. diff
4. apply safety gate
5. backup
6. apply
7. review integration
8. rollback
```

各段階で実Runtimeを確認し、
一度に巨大な実装へ置換しない。

---

# 18. Related Source of Truth

- `AGENTS.md`
- `600_KoppyOS/design/LOCAL_CLI_BRIDGE_ARCHITECTURE.md`
- `600_KoppyOS/design/LOCAL_CLI_BRIDGE_CHAT_BOOTSTRAP.md`
- `600_KoppyOS/protocols/EXECUTOR_SELECTION_PROTOCOL.md`
- `600_KoppyOS/protocols/FILE_EDIT_PROTOCOL.md`
