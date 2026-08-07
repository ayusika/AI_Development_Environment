# KoppyOS Authentication Architecture

Version: v0.1  
Status: Design / Not Yet Implemented  
Created: 2026-08-08

---

## 1. Purpose

Koppy WorldおよびKoppy APIを、
許可されたユーザーだけが利用できる認証構造を構築する。

Koppy WorldのURLやGitHub PagesのURLを第三者が知っていても、

- GitHub Writer
- Proposal
- Approve
- Executor
- 将来のDeploy
- その他の保護API

を利用できない状態を作る。

認証は、

GitHub Appによる本人確認

と

Koppy API側のServer Session

を組み合わせる。

---

## 2. Core Principle

GitHubは本人確認に使用する。

KoppyOSの最終的なアクセス許可は、
Koppy API側で判断する。

構成：

Koppy World

→ Login

→ GitHub Authorization

→ Koppy Auth Callback

→ GitHub User Identity確認

→ Koppy User Allowlist確認

→ Server Session発行

→ Koppy World

→ Protected API

GitHubへログインできることだけでは、
KoppyOS利用許可とはしない。

---

## 3. Authentication Provider

KoppyOS Authentication v1では、
GitHub Appを認証Providerとして利用する。

GitHub Appは、
KoppyOSのGitHub Write Executorとは別の責務を持つ。

Authentication GitHub App：

本人確認のみ。

GitHub Writer Token：

GitHub正本への書き込み専用。

この2つを混同しない。

---

## 4. Minimum GitHub Permissions

Authentication用GitHub Appには、
KoppyOS RepositoryへのWrite権限を与えない。

認証に必要な最小限のUser Identity情報だけを利用する。

KoppyOSのGitHub変更処理は、
既存のGitHub Writer / Executor経路でのみ行う。

認証Credentialを、
Repository Write Credentialとして使用しない。

---

## 5. User Allowlist

Authentication v1では、
KoppyOSを利用できるGitHub Userを明示Allowlistで制限する。

初期Allowlist：

- `ayusika`

GitHub認証成功後、
取得したGitHub User IdentityがAllowlistに存在しない場合はログインを拒否する。

将来的には、

- owner
- developer
- viewer

などのRoleへ拡張可能な構造とする。

---

## 6. Authentication Flow

初期ログインフロー：

1. Koppy Worldを開く
2. 現在のAuthentication Sessionを確認
3. 未認証の場合はLogin Gateを表示
4. 「GitHubでログイン」を押す
5. Koppy APIへLogin開始Request
6. Koppy APIがstateを生成
7. PKCE用code verifier / challengeを生成
8. state等をServer Sessionへ保存
9. GitHub AuthorizationへRedirect
10. UserがGitHubで認証
11. GitHubからKoppy Auth Callbackへ戻る
12. Callbackがstateを検証
13. Authorization CodeをUser Access Tokenへ交換
14. GitHub User Identityを取得
15. Koppy User Allowlistを確認
16. 許可UserならKoppy SessionをAuthentication済みにする
17. GitHub User Access Tokenは必要最小限だけ利用する
18. Koppy WorldへRedirect
19. Koppy WorldがAuthentication状態を再確認
20. Protected UIを表示

---

## 7. State Protection

Authorization開始時に、
暗号学的に十分ランダムなstateを生成する。

stateはServer Sessionへ保存する。

Callback時に、

GitHubから返されたstate

と

Server Session内のstate

を完全一致で比較する。

一致しない場合はAuthenticationを拒否する。

使用済みstateは再利用しない。

---

## 8. PKCE

GitHub Authenticationでは、
可能な限りPKCEを使用する。

Authorization開始時に、

- code_verifier
- code_challenge

を生成する。

code_verifierはServer Session側へ保持する。

Authorization Code交換時に、
保存済みcode_verifierを使用する。

これによりAuthorization Codeの横取りによるリスクを低減する。

---

## 9. Server Session

Authentication状態は、
ブラウザJavaScriptだけで保持しない。

Koppy API側のPHP Sessionを使用する。

Sessionには最低限、

- authenticated
- GitHub user id
- GitHub login
- authenticated_at
- last_activity_at
- role

を保持する。

秘密情報やGitHub Writer TokenはSessionへ保存しない。

---

## 10. Session Cookie

Authentication Cookieは、
可能な限り以下の属性を利用する。

- Secure
- HttpOnly
- SameSite

JavaScriptからAuthentication Cookieを直接読ませない。

HTTPS通信を前提とする。

Session IDをURL Queryへ含めない。

---

## 11. Session Regeneration

Login成功時には、
Session IDを再生成する。

これによりSession Fixation対策を行う。

Logout時には、
Server Sessionを破棄する。

---

## 12. Session Expiration

Authentication Sessionは永続化しない。

一定時間操作がない場合はSessionを失効させる。

初期設計では、
Last ActivityによるTimeout方式を使用する。

具体的なTimeout時間は実装時に決定する。

将来的に、

「この端末を信頼する」

などを追加する場合でも、
通常Sessionより強い安全設計を別途行う。

---

## 13. API Authentication Guard

認証が必要なAPIは、
共通Authentication Guardを通す。

例：

- Proposal作成
- Proposal承認
- GitHub Executor
- Deploy Proposal
- Deploy Executor
- Memory Write
- KoppyOS管理機能

各APIへ個別にAuthentication処理を複製しない。

共通Guardを利用する。

---

## 14. Protected API Behavior

未認証UserがProtected APIへアクセスした場合は、

HTTP 401

を返す。

Authentication済みでも権限不足の場合は、

HTTP 403

を返す。

例：

401 Unauthorized

認証されていない。

403 Forbidden

認証済みだが、その操作権限を持たない。

---

## 15. Koppy World Login Gate

Koppy Worldは起動時にAuthentication状態を確認する。

未認証の場合：

- KoppyOS本体UIを非表示
- Writerを非表示
- Proposal操作を非表示
- GitHub Executor操作を非表示
- Login Gateのみ表示

Login Gate：

Koppy World

「この世界はしいちゃん専用だよ」

[ GitHubでログイン ]

認証成功後にKoppyOS UIを表示する。

---

## 16. Public UI and Protected Functions

GitHub Pages自体はPublicであってもよい。

ただし、

Public HTMLを見られること

と

KoppyOS機能を利用できること

を分離する。

HTML / CSS / JavaScriptを閲覧されても、
Protected APIへAuthenticationなしでアクセスできない設計を安全境界とする。

ブラウザ側だけの表示制御をSecurity Boundaryとして使用しない。

---

## 17. Proposal Protection

Proposal作成APIはAuthentication必須とする。

未認証UserはProposalを作成できない。

Proposalには可能であれば、

- created_by_user_id
- created_by_login

を記録する。

将来複数User対応した場合にも、
誰が作成したProposalか追跡できる構造とする。

---

## 18. Approval Protection

Proposal Approval APIはAuthentication必須とする。

さらにApproval可能Roleを確認する。

Authentication v1では、
許可されたowner UserのみApproval可能とする。

Proposal作成とApprovalは、
内部的に別操作として維持する。

---

## 19. Executor Protection

GitHub ExecutorはAuthentication必須とする。

さらに、

- Proposalが存在する
- Proposalがapproved
- Proposalが未実行
- UserがExecutor権限を持つ
- Write Allowlist内
- Protected Fileではない

という既存Safety Checkを維持する。

Authenticationを追加しても、
既存の安全装置を削除しない。

---

## 20. Deploy Protection

将来のDeploy ExecutorもAuthentication必須とする。

GitHub Write PermissionとDeploy Permissionは分離する。

Authentication済みだからといって、
自動的にDeployを許可しない。

Deploy Approvalを別途必要とする。

---

## 21. Login Endpoint Structure

初期候補：

`/api/v1/auth/login.php`

役割：

- Session開始
- state生成
- PKCE生成
- GitHub Authorization URL生成
- GitHubへRedirect

---

## 22. Callback Endpoint Structure

初期候補：

`/api/v1/auth/callback.php`

役割：

- GitHub Callback受付
- state検証
- Authorization Code検証
- Token交換
- GitHub User取得
- User Allowlist確認
- Session Regeneration
- Authentication状態保存
- Koppy WorldへRedirect

---

## 23. Session Endpoint Structure

初期候補：

`/api/v1/auth/session.php`

役割：

現在のAuthentication状態をJSONで返す。

例：

authenticated:

true / false

認証済みの場合のみ、
必要最小限のUser情報を返す。

GitHub Access TokenなどのCredentialは返さない。

---

## 24. Logout Endpoint Structure

初期候補：

`/api/v1/auth/logout.php`

役割：

- Koppy Session破棄
- Authentication情報削除
- Cookie無効化
- Koppy Worldへ戻す

LogoutはPOSTを基本とする。

---

## 25. Authentication Secrets

Authentication用秘密情報は、
GitHubへ保存しない。

例：

- GitHub App Client ID
- GitHub App Client Secret
- その他Authentication Secret

保存先：

Koppy Private Config

GitHubにはExample値または設定項目名のみ保存する。

---

## 26. GitHub User Token Handling

GitHub User Access Tokenは、
User Identity確認に必要な最小範囲で利用する。

Koppy WorldのJavaScriptへ返さない。

GitHub Writer Tokenと共有しない。

Authentication v1で継続利用する必要がない場合は、
必要以上に長期間保存しない。

---

## 27. CORS and Credentials

Koppy WorldはGitHub Pages上で動作し、
Koppy APIは別Originで動作する。

そのためAuthentication Sessionを利用するAPIでは、

Cross-Origin Credential通信

を正しく設計する必要がある。

Koppy API側は任意Originを許可しない。

許可するKoppy World Originを固定する。

ブラウザ側Requestでは、
Authentication Cookieを利用するためのCredential設定を行う。

具体的なCORS HeaderとCookie属性は、
実装時にBrowser挙動を確認して確定する。

---

## 28. CSRF Protection

Cookie Based Authenticationを利用するため、
Write系RequestではCSRF対策を行う。

GitHub Authorization Flowではstateを利用する。

KoppyOS APIのWrite操作では、
Origin確認などを含むCSRF Defenseを導入する。

必要に応じてCSRF Token方式も利用する。

---

## 29. Error Handling

Authentication失敗時は、
秘密情報をErrorへ含めない。

表示候補：

- Login required
- Authentication failed
- GitHub identity could not be verified
- User is not allowed
- Session expired

以下はブラウザへ表示しない。

- Client Secret
- Access Token
- Session ID
- Internal filesystem path
- Secret config values

---

## 30. Authentication Log

Authentication関連の重要イベントを、
非公開領域へ記録可能な構造とする。

候補：

- Login success
- Login denied
- Logout
- Session expired
- Invalid state
- Unauthorized API access

秘密CredentialそのものはLogへ保存しない。

---

## 31. Fail Closed

Authentication判定に失敗した場合は、
アクセスを許可しない。

例：

- GitHub APIへ接続できない
- User情報を取得できない
- Session情報が壊れている
- Allowlistを読み込めない

この場合は、

「たぶん本人」

として通さない。

必ず拒否側へ倒す。

---

## 32. Manual Recovery Path

Authentication実装後も、
VS Code、GitHub、Cyberduck等のManual Recovery Pathは維持する。

Authentication障害によってKoppy Worldへ入れなくなっても、
低レイヤーから復旧できる状態を残す。

---

## 33. Initial Implementation Scope

Authentication v1で実装するもの：

- GitHub App User Authentication
- state
- PKCE
- Koppy User Allowlist
- PHP Session
- Secure Session Cookie
- Session Regeneration
- Login
- Callback
- Session確認
- Logout
- Authentication Guard
- Proposal API保護
- Approval API保護
- GitHub Executor保護
- Koppy World Login Gate

v1では行わないもの：

- 一般公開User登録
- Password Authentication
- Password Reset
- Email Login
- Social Login追加
- 複雑なRole管理
- 多人数Organization運用

---

## 34. Acceptance Test

Authentication v1完成条件：

1. 未ログイン状態でKoppy Worldを開く
2. Login Gateのみ表示される
3. GitHub認証が成功する
4. 許可Userでログインできる
5. 非許可GitHub Userは拒否される
6. Authentication Sessionが発行される
7. Session確認APIが正常動作する
8. 未認証状態ではProposal APIが401になる
9. 未認証状態ではApprove APIが401になる
10. 未認証状態ではExecutor APIが401になる
11. 認証済み状態では既存Writerが正常動作する
12. LogoutでSessionが破棄される
13. Logout後はProtected APIへアクセスできない
14. Session Timeout後は再Loginが必要になる
15. GitHub Writer Token等の秘密情報がBrowserへ露出しない

---

## 35. Design Philosophy

Koppy WorldがPublic URL上に存在することと、
KoppyOS内部機能をPublicにすることは別である。

Security Boundaryは、
画面を隠すことではなく、
Server側Authorizationによって作る。

KoppyOSは、

「URLを知っている人」

ではなく、

「本人確認され、KoppyOSから明示的に許可されたUser」

だけが操作できる共同開発環境とする。