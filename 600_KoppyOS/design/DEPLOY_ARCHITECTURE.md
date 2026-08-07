# KoppyOS Server Deploy Architecture

Version: v0.1  
Status: Design / Not Yet Implemented  
Created: 2026-08-07

---

## 1. Purpose

Koppy WorldからGitHubへ保存されたKoppyOS Serverコードを、
ユーザーの明示承認のもとで実働サーバーへ安全に反映する。

目的は単なるSFTP操作の自動化ではない。

GitHubを正本として維持しながら、

Koppy World
→ GitHub
→ Koppy Server

という一貫した開発経路を構築する。

最終的には、通常のKoppyOS開発において
VS Code、Terminal、SFTPクライアントを毎回操作する必要のない環境を目指す。

---

## 2. Core Principle

DeployはGitHub Writeとは別の権限として扱う。

GitHubへ書き込めることは、
実働サーバーへDeployできることを意味しない。

処理は必ず以下の順序を守る。

Koppy World UI

→ Change Proposal

→ User Approval

→ GitHub Executor

→ GitHub Commit

→ Deploy Proposal

→ User Deploy Approval

→ Deploy Executor

→ Deploy Allowlist

→ GitHub正本取得

→ Koppy Serverへ反映

→ Verification

→ Deploy Log

GitHub Commit成功だけを理由として、
自動的に本番Deployしてはならない。

---

## 3. Source of Truth

Deploy元は必ずGitHubの確定済み正本とする。

ブラウザから送信された任意のコード本文を
そのまま実働サーバーへ書き込んではならない。

Deploy Executorは、

- repository
- branch
- target path
- GitHub commit SHA

を確認し、
GitHubから対象ファイルを取得してDeployする。

これにより、

GitHub上の内容

と

実働サーバー上の内容

が意図せず分離することを防ぐ。

---

## 4. GitHub Write and Deploy Separation

KoppyOSでは以下を別レイヤーとして扱う。

### GitHub Write

目的：

GitHub正本を更新する。

現在のWrite Allowlist：

- `600_KoppyOS/`
- `900_Lab/`

### Server Deploy

目的：

GitHubに確定したServerコードを
実働Koppy Serverへ反映する。

Write Allowlistに含まれていても、
Deploy Allowlistに含まれていないファイルはDeployできない。

---

## 5. Deploy Allowlist v1

初期Deployでは対象領域を最小限に限定する。

GitHub側：

`600_KoppyOS/server/api/`

Server側：

`/koppy/api/`

対応関係：

`600_KoppyOS/server/api/RELATIVE_PATH`

↓

`/koppy/api/RELATIVE_PATH`

例：

`600_KoppyOS/server/api/v1/chat.php`

↓

`/koppy/api/v1/chat.php`

Deploy Executorはこの対応規則から外れるパスを拒否する。

---

## 6. Protected Files

Deploy Allowlist内部であっても、
秘密情報またはサーバー固有設定を含む可能性があるファイルはDeploy禁止とする。

初期Protected Files：

- `config.php`
- `.env`
- `.env.local`
- `.env.production`
- `credentials.json`
- `secrets.json`

Protected Filesは、
Deploy Proposalが承認されていてもExecutor側で拒否する。

秘密情報はGitHub正本からDeployする設計に含めない。

---

## 7. Path Safety

Deploy Executorは最低限、以下を拒否する。

- 空のpath
- `/` から始まるGitHub target path
- `..` を含むpath
- NULL byteを含むpath
- 不正なpath separator
- Deploy Allowlist外
- Protected Files

ユーザー入力をそのままServer filesystem pathとして使用しない。

Server側の保存先は、
Deploy Executor内部の固定されたDeploy Rootと
検証済みrelative pathから生成する。

---

## 8. Approval Model

Deployには明示承認を必要とする。

GitHubへの変更をユーザーが承認したことと、
ServerへのDeploy承認は別扱いとする。

初期UIでは、

1. GitHubへ保存
2. GitHub Commit成功を確認
3. 「Koppy Serverへ反映」
4. Deploy内容を確認
5. Deploy承認
6. Deploy実行

の順序とする。

将来的に操作を簡略化する場合でも、
内部ではGitHub WriteとDeployの権限境界を維持する。

---

## 9. Commit Binding

Deploy Proposalは、
対象ファイルだけでなくGitHub commit SHAも保持する。

Deploy Executorは実行時に、
Deploy Proposalが指しているCommitと
実際に取得するGitHub正本が一致していることを確認する。

これにより、

Proposal確認後にGitHub内容が変更され、
確認していない別内容がDeployされる

という競合を防止する。

---

## 10. Deploy Execution

Deploy Executorは以下の順序で処理する。

1. Deploy Proposalを取得
2. Deploy承認状態を確認
3. 二重実行でないことを確認
4. target pathを検証
5. Deploy Allowlistを検証
6. Protected Filesを検証
7. GitHub commit SHAを検証
8. GitHubから対象ファイルを取得
9. Server側target pathを安全に生成
10. 現在のServerファイルを必要に応じて退避
11. 一時ファイルへ書き込み
12. 書き込み結果を検証
13. 正式ファイルへ置換
14. Verificationを実行
15. Deploy Logを保存
16. Deploy Proposalをexecutedへ更新

途中で失敗した場合は処理を停止する。

別ファイルへ処理を波及させない。

---

## 11. Atomic Write

可能な限り、
実働ファイルへ直接途中書き込みを行わない。

基本方式：

GitHub content

→ temporary file

→ write verification

→ rename / replace

→ production file

とする。

これにより書き込み途中の不完全なPHPファイルが
実働APIとして読み込まれるリスクを減らす。

---

## 12. Verification

Deploy成功は、
ファイルを書き込めたことだけでは判定しない。

可能な範囲でDeploy後Verificationを行う。

初期候補：

### File Verification

- ファイル存在確認
- file size確認
- hash確認

### PHP Verification

PHPファイルについては、
可能であればsyntax checkを行う。

### Endpoint Verification

API endpointの場合は、
安全に確認可能なGETまたは専用health checkを利用する。

Verification失敗時は、

`deploy_failed`

または

`verification_failed`

として記録する。

GitHub Commit成功とDeploy成功を混同しない。

---

## 13. Deploy Log

すべてのDeployについて記録を残す。

最低限記録する情報：

- deploy id
- proposal id
- target GitHub path
- target Server path
- GitHub commit SHA
- deployed_at
- status
- verification result
- error message
- previous version information

Deploy Logは公開Web領域へ保存しない。

---

## 14. Rollback Foundation

Deploy v1では、
将来Rollback可能な構造を最初から維持する。

Deploy前に可能であれば、

- previous GitHub SHA
- previous Server file hash
- backup location

を記録する。

将来的にはKoppy World UIから、

「このDeployの直前へ戻す」

操作を追加できる設計とする。

Rollbackも通常Deployと同様に
明示承認を必要とする。

---

## 15. Failure Rules

Deploy途中でエラーが発生した場合、

勝手な代替処理を行わない。

勝手に別CommitをDeployしない。

勝手にAllowlistを拡張しない。

勝手にProtected Fileを書き換えない。

UIには状態を明確に区別して表示する。

例：

- GitHub保存成功 / Deploy未実行
- GitHub保存成功 / Deploy成功
- GitHub保存成功 / Deploy失敗
- Deploy拒否
- Verification失敗

---

## 16. Initial Implementation Scope

Deploy v1では以下のみを実装対象とする。

- 単一ファイルDeploy
- `600_KoppyOS/server/api/` のみ
- 明示承認
- Deploy Allowlist
- Protected Files
- GitHub Commit Binding
- Atomic Write
- Deploy Log
- 基本Verification

以下はv1では行わない。

- ディレクトリ一括Deploy
- 自動Deploy
- Allowlist外Deploy
- 複数ファイル同時Deploy
- GitHub以外をDeploy元にする処理
- Protected FilesのDeploy

---

## 17. Cyberduck Graduation Condition

Cyberduckを通常開発経路から外す条件は、
以下をすべて実動作で確認した時点とする。

1. Koppy WorldからServerコードをGitHubへ保存できる
2. GitHub Commit SHAを固定したDeploy Proposalを作成できる
3. ユーザーがDeploy内容を確認できる
4. 明示承認後のみDeployされる
5. Deploy Allowlist外が拒否される
6. Protected Filesが拒否される
7. Allowlist内の実ファイルDeployが成功する
8. Deploy後Verificationが成功する
9. Deploy Logが保存される
10. GitHubと実働Serverの内容一致を確認できる

この条件を満たした時点で、

Cyberduckは緊急時・保守時の手動経路として残し、
通常のKoppyOS開発経路から卒業とする。

---

## 18. Target Development Experience

最終的な通常開発フロー：

しいちゃん
「ここ直したい」

↓

Koppyが変更案を作成

↓

Koppy WorldにProposal表示

↓

しいちゃんが内容確認

↓

採用

↓

GitHub Commit

↓

必要なServer変更の場合のみDeploy Proposal

↓

しいちゃんがDeploy確認

↓

Serverへ反映

↓

Verification

↓

Koppyが結果確認

通常開発では、
VS Code、Terminal、Cyberduckを
毎回操作する必要をなくす。

ただし各ツールは、
緊急時・復旧時・低レイヤー変更時の
Manual Recovery Pathとして維持する。

---

## 19. Design Philosophy

自動化の目的は、
人間から制御権を奪うことではない。

人間が判断すべき場所だけを残し、
機械的な転記・Commit・Upload・Verificationを
KoppyOSへ移すことである。

KoppyOSは、

「勝手に変更するAI」

ではなく、

「変更を考え、説明し、承認を待ち、
承認された変更だけを安全に実行できる共同開発環境」

として設計する。