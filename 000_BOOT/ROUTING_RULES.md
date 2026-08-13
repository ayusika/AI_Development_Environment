# KoppyOS Routing Rules

このファイルは、
KoppyOSがユーザーの要求から必要な正本・Protocol・Context・作業対象へ到達するための
正式なRouting規則を定義する。

Routingの役割は「どこへ行くべきか」を決定することである。

具体的な操作方法・安全条件・編集方法などは、
各Protocol・Architecture・Project正本へ委譲する。

---

# 1. Routingの基本構造

Routingは原則として、

TASK
+
TARGET

の2つを入力として判定する。

```text
USER REQUEST
      ↓
TASK
何をするか
      +
TARGET
何に対して行うか
      ↓
ROUTING
      ↓
必要なProtocol
必要な正本
必要なContext
最終的な作業対象
```

Routing自身は、
到達したProtocolの具体的な処理内容を代行しない。

---

# 2. TASK

TASKは、
ユーザーの要求に対してKoppyが何を行うかを表す。

初期TASKは以下の5種類とする。

## READ

読む・探す・確認する・比較する。

例：

- ファイル内容を確認する
- GitHubを検索する
- 現在地を確認する
- 既存仕様を調べる
- 複数の設計を比較する

---

## DESIGN

考える・設計する・仕様を決める。

例：

- 新しい機能を設計する
- 既存仕様を見直す
- Architectureを検討する
- Protocolを設計する
- Project構造を考える

DESIGNでは、
既存仕様・決定事項・関連Architectureなど、
設計判断に必要なContextを確認する。

---

## WRITE

GitHub正本または管理対象ファイルへ変更を加える。

例：

- 既存ファイルを変更する
- 内容を追記する
- 新しいファイルを作成する
- 新しいディレクトリを作成する
- 設計結果を正本へ保存する

具体的な編集方式の判定はRoutingでは行わない。

適用されるFile Edit Protocol等へ処理を委譲する。

---

## EXECUTE

実環境へ処理または変更を実行する。

例：

- Deploy
- Server処理
- 外部環境への反映
- 実行系操作

EXECUTEでは、
対象環境に適用されるProtocol・Architectureを確認する。

---

## RECOVER

状態を復旧する。

例：

- 壊れた環境の復旧
- Recovery手順の実行
- Backupからの復元
- 正常状態への復帰

RECOVERでは、
通常作業より復旧用の正本・Protocolを優先して参照する。

---

# 3. TASK分類の拡張原則

TASK分類は必要以上に増やさない。

新しいTASKを追加するのは、

「既存TASKでは異なる参照経路を適切に区別できない」

場合に限定する。

操作方法の違いだけを理由に、
新しいTASKを追加しない。

---

# 4. TARGET

TARGETは、

SCOPE
+
SUBJECT

の2つで表す。

---

## SCOPE

どの領域を対象としているか。

例：

- Repository全体
- 000_BOOT
- 000_HOME
- 060_Kohaku_Work
- 200_Miki_Piano
- 600_KoppyOS
- 900_Lab

SCOPEは必ずしもProjectである必要はない。

System・Repository・Project・管理領域など、
要求の対象範囲を表す。

---

## SUBJECT

SCOPE内の何を対象としているか。

例：

- Writer
- Auth
- DB設計
- 写メ日記UI
- index.html
- Deploy
- File Edit

SUBJECTは固定カテゴリとして管理しない。

ユーザー要求から特定できる範囲で表現する。

---

# 5. TARGETの推測禁止

TARGETを特定するために、
実在未確認のファイル名・ディレクトリ・設計構造を
記憶から補完しない。

ユーザー要求から、

SCOPEは分かるがSUBJECTの実ファイルが不明

という場合は、
不明な部分を無理に確定せずRoutingを開始する。

Routing中に正本を確認し、
実在する対象へ到達する。

---

# 6. Route Resolution

TASKとTARGETを判定した後、
以下の順序で必要な参照先を解決する。

1. 必須Protocolの有無を確認する
2. SCOPEの正本を確認する
3. SUBJECTを理解するために必要なContextを確認する
4. 最終的な作業対象を確認する

```text
TASK + TARGET
      ↓
Required Protocol
      ↓
Scope Source of Truth
      ↓
Required Context
      ↓
Work Target
```

ただし、
存在しない参照先を推測で生成してはならない。

---

# 7. 必要最小限参照原則

Routingは、
現在のTASKとTARGETを処理するために必要な参照先のみを選択する。

「関係がありそう」という理由だけで、
すべてのProtocol・Architecture・Projectファイルを毎回読む必要はない。

ただし、
判断に必要な情報が不足した場合は参照範囲を追加できる。

参照量の削減より、
正しい判断に必要な情報の確保を優先する。

---

# 8. Protocol適用判定

Protocolは、
SUBJECTだけではなくTASKとの組み合わせで適用を判定する。

例：

```text
READ + File
→ File Edit Protocolは原則不要

WRITE + File
→ File Edit Protocolを確認

EXECUTE + Deploy
→ Deploy関連Protocol / Architectureを確認

DESIGN + Auth
→ Auth関連Architecture・既存決定を確認

RECOVER + System
→ Recovery関連正本を確認
```

Protocolの具体的な処理方法は、
Routingでは決定しない。

---

# 9. ProjectとProtocolの分離

Project正本とProtocolは別軸として扱う。

例：

```text
TASK
WRITE

TARGET
SCOPE = 060_Kohaku_Work
SUBJECT = Web UI

↓

Project側
060_Kohaku_Workの必要な正本

+

Protocol側
File Edit Protocol
```

同じProtocolをProjectごとに複製しない。

Project固有仕様はProject側、
作業方式はProtocol側を正本とする。

---

# 10. Work Targetの確定

最終的な作業対象は、
Routing開始時の推測だけで確定しない。

必要な正本・Contextを確認し、
GitHub上で実在を確認した後にWork Targetを確定する。

例：

```text
「Kohaku Workのindex.htmlを直す」
        ↓
対象Project確認
        ↓
必要な正本確認
        ↓
実在するindex.html確認
        ↓
Work Target確定
```

---

# 11. Routingの責務境界

Routingが決定するもの：

- 必要なProtocol
- 必要なScope正本
- 必要なContext
- 最終的なWork Target

Routingが決定しないもの：

- Protocol内部の操作方法
- File Editの具体的な編集方式
- 部分置換の安全条件
- Deployの具体的な実行方法
- Recoveryの具体的な復旧方法

これらは到達先のProtocol・Architecture等へ委譲する。

---

# 12. TASK Transition

1つのユーザー要求または作業セッション内で、
複数のTASKが連続することがある。

例：

```text
READ
既存仕様を確認
 ↓
DESIGN
新仕様を設計
 ↓
WRITE
正本へ保存
```

TASKが変化した場合、
新しいTASKとしてRoutingを再判定する。

特に、

READ → WRITE
DESIGN → WRITE
READ → EXECUTE
DESIGN → EXECUTE

など、
参照のみの状態から変更・実行へ移行する場合は
適用Protocolを再確認する。

以前のTASKでProtocolが不要だったことを理由に、
再Routingを省略してはならない。

---

# 13. 競合判定

複数の正本・ルール間に矛盾がある場合、
まず同じ論点について競合しているか確認する。

異なる役割・異なる論点の情報は、
単純な優先順位で排除しない。

同じ論点で矛盾する場合のみ、
役割階層を確認する。

---

# 14. 役割階層

同一論点で競合した場合の基本階層は以下とする。

1. Kernel
2. 適用Protocol
3. Scope / System Architecture
4. Project正式仕様
5. Current State
6. Temporary Context

上位層は、
下位層より広い範囲へ適用される原則を保持する。

ただし、
異なる論点の情報に対して
この順位を機械的に適用しない。

---

# 15. 同階層内の競合

同じ階層に複数の情報があり矛盾する場合は、

1. 明示的な現行 / 廃止 / 最新指定を確認する
2. 現在のGitHub正本を確認する
3. 関連する決定事項・履歴を必要に応じて確認する
4. それでも判定できなければユーザーへ確認する

更新日時だけを理由に、
自動的に新しい方を正しい仕様として採用しない。

---

# 16. ユーザーによる未保存の新決定

現在の会話でユーザーが既存仕様の変更を明示的に決定した場合、
GitHubへ未反映でも、

「未保存の新決定」

として扱う。

```text
GitHub既存正本
      ↓
ユーザーが変更を決定
      ↓
未保存の新決定
      ↓
WRITE
      ↓
GitHubへ保存
      ↓
新しい正本
```

未保存の新決定を、
すでにGitHubへ保存済みの正本として扱わない。

また、
未保存の新決定はKernelや適用される安全Protocolを
自動的に無効化するものではない。

Kernel変更など、
別途正式な変更手順が必要な場合はその手順に従う。

---

# 17. 矛盾の透明性

作業結果へ影響する矛盾を検知した場合、
Koppyは矛盾を黙って都合よく解消しない。

必要に応じて、

- どの情報同士が競合しているか
- どの階層に属するか
- どのルールを適用したか
- 判断できない点は何か

を明示する。

---

# 18. Routing Fallback

Routing先を解決できない場合は、
以下の順序で確認する。

1. ROUTING_RULESを再確認する
2. PROTOCOL_INDEXを確認する
3. 関連する実在正本を探索する
4. 必要なContextを追加確認する
5. それでも解決できない場合はユーザーへ確認する

推測だけでRouting先を作成しない。

Routing中に、
現在地そのものへ矛盾・不確実性を検知した場合は、
`000_BOOT/README.md` のBOOT判定に従い、
必要に応じてFULL BOOTへ切り替える。

---

# 19. Routing Completion

以下が必要な範囲で解決された時点で、
Routing完了とする。

- TASK
- TARGET
- Required Protocol
- Scope Source of Truth
- Required Context
- Work Target

すべての項目が毎回必要とは限らない。

現在のTASKを安全かつ正確に処理するために
不要な参照先まで強制的に解決しない。

Routing完了後、
具体的な処理は各Protocol・Architecture・Project正本に従って行う。