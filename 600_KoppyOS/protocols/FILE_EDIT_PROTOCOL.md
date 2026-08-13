# KoppyOS File Edit Protocol

このファイルは、
KoppyOSが管理対象ファイルを安全かつ一貫した方法で編集するための
正式なFile Edit Protocolを定義する。

ファイル編集では、
操作の簡便さより実ファイルの保全を優先する。

Koppy側の作業量を減らすために、
必要以上に大きな範囲を書き換えてはならない。

既存ファイルは可能な限り保持し、
安全に特定できる最小の意味単位で変更する。

---

# 1. Purpose

このProtocolの目的は、
KoppyOSにおけるファイル編集事故を防止し、

- 編集対象の誤認
- 意図しない範囲の変更
- Exact Matchの誤爆
- 全文置換による既存内容の消失
- Writer指示の省略による欠落
- 古いファイル状態を基準とした編集
- WRITERマーカーの破損
- 複数編集途中の状態不整合

を防ぐことである。

---

# 2. Scope

このProtocolは、
KoppyOSがGitHub正本またはその他の管理対象ファイルへ
変更を加える場合に適用する。

主な対象TASK：

```text
WRITE
```

対象操作：

```text
APPEND
PARTIAL REPLACE
FULL REPLACE
CREATE
```

このProtocolはWriter専用ではない。

Writerは、
このProtocolに従ってファイル編集を実行する
Executorの一つとして扱う。

将来Writer以外の編集手段が導入された場合でも、
File Edit Protocolの基本安全原則は維持する。

---

# 3. Core Safety Principles

ファイル編集では、
以下を基本原則とする。

## 3.1 Existing File Preservation

既存ファイルの保全を、
編集操作の簡便さより優先する。

Koppy側の指示作成が簡単になるという理由だけで、
全文置換や大規模置換を選択してはならない。

---

## 3.2 Partial Replace First

既存ファイルの変更では、
安全に編集範囲を特定できる場合、
PARTIAL REPLACEを標準操作として優先する。

---

## 3.3 Minimum Safe Change

変更範囲は、
単純な最小文字数ではなく、

「安全に一意特定できる最小の意味単位」

とする。

短い文字列であっても、
意味的な編集境界が不明確な場合は使用しない。

---

## 3.4 Progressive Hardening

既存ファイルを一括してWriter対応へ改修しない。

編集する箇所から段階的に、
WRITERマーカー等の安全構造を導入する。

これにより、
既存ファイルは実際の編集機会に合わせて
徐々に安全な編集構造へ移行する。

---

## 3.5 Fail Closed

安全性を確認できない場合は、
推測して編集を続行しない。

```text
安全に特定できる
→ 続行

安全性を確認できない
→ STOP
```

「たぶんこの場所」
「おそらく同じ内容」
という判断でWRITEを実行してはならない。

---

# 4. Edit Operations

File Edit Protocolでは、
以下の4操作を使用する。

---

## 4.1 🟦 APPEND

既存内容を変更・削除せず、
新しい内容を明確な追加位置へ追加する操作。

主な用途：

- 設計書末尾への章追加
- CHANGELOGへの履歴追加
- 既存リストへの項目追加
- 明確な末尾追記

既存文字列の途中へ内容を挿入する必要がある場合は、
原則としてAPPENDではなくPARTIAL REPLACEを使用する。

追記位置が曖昧な場合も、
APPENDを使用しない。

---

## 4.2 🟨 PARTIAL REPLACE

既存ファイルの特定範囲だけを、
Exact Matchによって置き換える操作。

既存ファイル編集における
標準操作として扱う。

基本フロー：

```text
現在の実ファイル取得
↓
安全な編集境界を特定
↓
Exact Match確認
↓
PARTIAL REPLACE
↓
POST-FLIGHT
```

WRITERマーカーが存在する場合は、
その境界を優先的に使用する。

マーカーが存在しない場合でも、
安全な意味単位を一意に特定できる場合は
PARTIAL REPLACEを使用できる。

---

## 4.3 🟪 FULL REPLACE

対象ファイルの既存内容をすべて置き換え、
新しい全文へ変更する操作。

既存ファイルに対するFULL REPLACEは
高リスク操作として扱う。

FULL REPLACEは、

「実行可能だから使用する」

のではなく、

「PARTIAL REPLACE等より安全かつ合理的である」

場合にのみ使用する。

Koppy側の指示作成が簡単になることは、
FULL REPLACEを選択する理由にならない。

---

## 4.4 🟥 CREATE

存在しないファイルを新しく作成する操作。

CREATE前には、
対象パスに同名ファイルが存在しないことを確認する。

既に存在する場合：

```text
CREATE
↓
Existing File Detected
↓
STOP
```

勝手にFULL REPLACEへ変更してはならない。

新規ファイルが将来Writerによって
独立編集されることが明確に予想できる場合は、
作成時点から適切なWRITERマーカーを設置できる。

---

# 5. Operation Selection

編集操作は、
以下を基本として選択する。

```text
新規ファイル？
├─ YES
│   ↓
│  🟥 CREATE
│
└─ NO
    ↓
既存内容を変更せず安全に追加できる？
├─ YES
│   ↓
│  🟦 APPEND
│
└─ NO
    ↓
変更範囲を安全に一意特定できる？
├─ YES
│   ↓
│  🟨 PARTIAL REPLACE
│
└─ NO
    ↓
FULL REPLACE Safety Gateを満たす？
├─ YES
│   ↓
│  🟪 FULL REPLACE
│
└─ NO
    ↓
STOP
```

PARTIAL REPLACEが失敗したことを理由に、
自動的にFULL REPLACEへ切り替えてはならない。

失敗した場合は、
最新状態を再取得して操作方式を再判定する。

---

# 6. WRITER Marker Specification

Writerによる安全な編集境界として、
以下の形式を使用する。

```text
<!-- WRITER:<BLOCK_ID>:START -->
...
<!-- WRITER:<BLOCK_ID>:END -->
```

例：

```html
<!-- WRITER:NUKINAVI_VISIT_LIST:START -->
<section>
  ...
</section>
<!-- WRITER:NUKINAVI_VISIT_LIST:END -->
```

---

## 6.1 WRITER Prefix

`WRITER` は固定プレフィックスとする。

これは、
そのマーカーがWriter編集境界であることを示す。

File Edit Protocol自体を
Writer専用Protocolとして扱うことを意味しない。

---

## 6.2 BLOCK_ID

BLOCK_IDは、

```text
UPPER_SNAKE_CASE
```

で記述する。

例：

```text
NUKINAVI_VISIT_LIST
HEAVEN_DIARY_FORM
CUSTOMER_PROFILE
```

名前は、
見た目ではなく役割を表すものとする。

避ける例：

```text
BLUE_BOX
LEFT_AREA
SECTION_3
```

---

## 6.3 Marker Uniqueness

同じBLOCK_IDは、
同一ファイル内で一意でなければならない。

同じBLOCK_IDが複数存在する場合、
そのマーカーを使用した編集を実行しない。

---

## 6.4 START / END Pair

STARTとENDは必ずペアで存在する。

以下は異常状態とする。

- STARTのみ存在
- ENDのみ存在
- STARTとENDのBLOCK_IDが異なる
- 同じBLOCK_IDが複数存在
- 境界が不明確

異常状態を検知した場合はSTOPする。

---

## 6.5 Marker Inclusion

PARTIAL REPLACEでWRITERマーカーを使用する場合、
原則としてマーカー自体もExact Match範囲へ含める。

```text
START
内容
END
```

全体を、

```text
探す文字列
```

と、

```text
置換後
```

の両方へ含める。

これにより、
編集後も同じWRITER境界を維持する。

---

## 6.6 Marker Preservation

通常の内容編集によって、
WRITERマーカーを削除しない。

マーカーの削除・改名・移動を行う場合は、
それ自体を意図した構造変更として扱う。

---

## 6.7 Marker Nesting

v0.1では、
WRITERマーカーのネストを禁止する。

禁止例：

```text
WRITER:A:START

    WRITER:B:START
    WRITER:B:END

WRITER:A:END
```

---

## 6.8 Marker Granularity

WRITERマーカーは、
独立して編集される意味単位へ設置する。

例：

- section
- component
- 設定ブロック
- 独立したUI領域

ファイル全体を巨大な1ブロックとして囲うことや、
1行単位で大量のマーカーを設置することは避ける。

---

# 7. Marker Bootstrap

既存ファイルの編集対象に
適切なWRITERマーカーが存在しない場合でも、
安全な既存ブロックを一意に特定できるなら、

今回のPARTIAL REPLACEと同時に
WRITERマーカーを導入できる。

例：

```text
既存ブロック
↓
PARTIAL REPLACE
↓
WRITER:BLOCK_ID:START
新しいブロック
WRITER:BLOCK_ID:END
```

ただし、
マーカーを導入するためだけに
置換範囲を不必要に巨大化してはならない。

安全な境界を特定できない場合は、
マーカー導入を見送る。

---

# 8. Exact Match Safety Gate

PARTIAL REPLACEでは、
Exact Match Safety Gateを必須とする。

---

## 8.1 Current File Source

探す文字列は、
可能な限り最新の実ファイルから取得する。

以下を根拠に作成してはならない。

- 過去の記憶
- 古いコード
- 推測
- 未確認のSnapshot
- 「たぶん現在も同じ」という判断

---

## 8.2 Exact Match Count

PARTIAL REPLACEで使用する
探す文字列の一致件数は、

```text
必ず1件
```

でなければならない。

```text
1件
→ PASS

0件
→ STOP

2件以上
→ STOP
```

例外は設けない。

---

## 8.3 No Automatic Relaxation

Exact Matchが0件または複数件だった場合、
探す文字列を勝手に短縮・緩和してはならない。

禁止：

- 一部分だけに短縮する
- 空白を適当に削除する
- 改行を変更する
- 似ている別コードへ置換する
- 最初に一致した場所だけを使用する

失敗した場合は、
最新の実ファイルを再取得し、
安全な編集範囲を再設計する。

---

## 8.4 Whitespace Preservation

Exact Matchでは、

- スペース
- タブ
- 改行
- インデント

も現在の実ファイルの文字列として扱う。

Koppy側で勝手に正規化しない。

---

## 8.5 Minimum Safe Semantic Unit

Exact Match対象は、
単純に短い文字列を選ぶのではなく、

「意味的な編集境界が明確で、
一意に特定できる最小範囲」

とする。

---

# 9. Full Replace Safety Gate

FULL REPLACEでは、
SOURCE SIZEとOUTPUT SIZEを別々に評価する。

---

## 9.1 SOURCE SIZE

SOURCE SIZEは、
置換前の既存ファイル全文の文字数とする。

v0.1では以下を使用する。

```text
FULL_REPLACE_SOFT_LIMIT = 15,000 characters
FULL_REPLACE_HARD_LIMIT = 30,000 characters
```

判定：

```text
0 ～ 15,000文字
→ 通常Safety Gate

15,001 ～ 30,000文字
→ HIGH RISK
→ 原則PARTIAL REPLACEを優先

30,001文字以上
→ FULL REPLACE禁止
```

---

## 9.2 OUTPUT SIZE

OUTPUT SIZEは、
置換後に生成される全文の文字数とする。

SOURCE SIZEが小さくても、
OUTPUT SIZEが大規模であり、
生成・転送・保存の完全性を保証できない場合は
FULL REPLACEを実行しない。

OUTPUT SIZEの具体的な安全上限値は、
実機検証後に確定する。

安全上限が未確定であることを理由に、
無制限の出力を許可してはならない。

不確実な場合は安全側へ倒す。

---

## 9.3 Change Scope

SOURCE SIZEが安全上限以内でも、
実際の変更範囲が局所的である場合は
PARTIAL REPLACEを優先する。

例：

```text
SOURCE = 10,000文字
変更対象 = 50文字
```

この場合、
サイズ上FULL REPLACE可能でも、
原則PARTIAL REPLACEを使用する。

---

## 9.4 Full Source Availability

FULL REPLACE前には、
現在のファイル全文を確実に取得している必要がある。

全文を確認できていない場合は、
FULL REPLACEを実行しない。

---

## 9.5 Existing Specification Preservation

既存機能・設定・構造を
新しい全文へ安全に保持できることを確認する。

保持できる確信がない場合は、
FULL REPLACEを使用しない。

---

## 9.6 Post-Flight Availability

FULL REPLACE後に、
十分なPOST-FLIGHT検証を実行できる必要がある。

検証できない大規模全文置換は避ける。

---

## 9.7 Full Replace Principle

FULL REPLACE可能であることと、
FULL REPLACEを選択してよいことは同義ではない。

FULL REPLACEは、

- SOURCE SIZE
- OUTPUT SIZE
- Change Scope
- Full Source Availability
- Existing Specification Preservation
- Post-Flight Availability

を総合して判断する。

---

# 10. Writer Instruction Format

WriterをExecutorとして使用する場合、
Writerへ渡す編集指示は
操作ごとに正式な形式を使用する。

---

## 10.1 File Path

変更するファイルは必ず、

```text
Repository Root基準のフルパス
```

で指定する。

ファイルパスは、
実在する対象と完全一致しなければならない。

禁止例：

```text
index.html
kohaku-work/index.html
さっきのHTML
例のCSS
```

正しい例：

```text
900_Lab/Web_KoppyOS_Beta/kohaku-work/index.html
```

曖昧なパスをWriterへ渡してはならない。

---

## 10.2 🟨 PARTIAL REPLACE Format

必須項目：

```text
変更するファイル：

操作：
🟨 部分置換

変更理由：

探す文字列：

置換後：
```

`探す文字列` と `置換後` は
必ず完全な文字列を記載する。

---

## 10.3 🟦 APPEND Format

```text
変更するファイル：

操作：
🟦 追記

変更理由：

追記内容：
```

追記位置が曖昧な場合は、
APPENDを使用しない。

---

## 10.4 🟪 FULL REPLACE Format

```text
変更するファイル：

操作：
🟪 全文置換

変更理由：

置換後：
```

`置換後` には、
新しいファイル全文を完全に記載する。

---

## 10.5 🟥 CREATE Format

```text
変更するファイル：

操作：
🟥 新規作成

変更理由：

作成内容：
```

`作成内容` には、
新しいファイル全文を完全に記載する。

---

# 11. Writer Instruction Safety

Writerへ渡す実データ欄では、
省略表現を絶対に使用しない。

この規則は、

- PARTIAL REPLACE
- APPEND
- FULL REPLACE
- CREATE

すべてに適用する。

禁止例：

```text
...
以下同じ
以下省略
既存部分はそのまま
残りは変更なし
前と同じ
省略
```

PARTIAL REPLACEでは特に、

```text
探す文字列
置換後
```

の省略を絶対に禁止する。

FULL REPLACEでは全文、
CREATEでは作成全文、
APPENDでは実際の追記内容を
完全な形でWriterへ渡す。

Writerに、
省略された内容の補完を期待してはならない。

---

# 12. PRE-FLIGHT

WRITE実行前に、
以下を必要な範囲で確認する。

1. 対象ファイルまたは対象パスを確認
2. Repository Root基準フルパスを確認
3. 対象の実在状態を確認
4. 最新状態を取得
5. Edit Operationを確認
6. Exact Matchが必要なら一致件数1件を確認
7. WRITERマーカーを使用する場合は構造確認
8. FULL REPLACEの場合はSafety Gate確認
9. 省略表現がないことを確認
10. 変更範囲が最小安全意味単位であることを確認

PRE-FLIGHTを通過できない場合は、
WRITEを実行しない。

---

## 12.1 Preserve Existing Content Rule

PARTIAL REPLACEで既存内容の一部または全部を保持する場合、
保持したい既存文字列は、
置換後にも完全な形で再掲しなければならない。

PARTIAL REPLACEは、

```text
探す文字列
↓
置換後
```

へ完全に置き換える操作である。

そのため、
探す文字列に含まれている既存内容であっても、
置換後に記載されていない内容は保持されず消失する。

既存内容Aを保持したまま、
その後ろへ新しい内容Bを追加する場合は、

```text
SEARCH:
A

REPLACE:
A
B
```

とする。

以下の形式にしてはならない。

```text
SEARCH:
A

REPLACE:
B
```

この場合、
Aは保持されずBへ置き換わる。

既存内容AとCの間へ
新しい内容Bを挿入する場合も同様に、

```text
SEARCH:
A
C

REPLACE:
A
B
C
```

とする。

保持したいAおよびCを、
置換後から省略してはならない。

PARTIAL REPLACEでは、
置換後にも保持したい既存内容を
すべて明示的かつ完全な文字列として記載する。

以下のような省略・補完指示によって
既存内容が保持されることを期待してはならない。

```text
既存部分はそのまま
残りは変更なし
以下同じ
以下省略
...
```

この規則は、
PARTIAL REPLACEを利用して

- 既存ブロックの末尾へ内容を追加する場合
- 既存ブロックの先頭へ内容を追加する場合
- 既存ブロックの途中へ内容を挿入する場合
- 既存内容の一部だけを変更し、その他を保持する場合

すべてに適用する。

保持する既存内容を置換後へ完全に再掲できない場合、
そのPARTIAL REPLACEを実行してはならない。

---

## 12.2 Repository Sync Before Edit

新しいファイルを扱い始める場合、
または新しい編集作業単位を開始する場合は、
編集前にRepositoryの同期状態を確認する。

基本順序：

```text
git status
↓
ローカル変更確認
↓
安全にpull可能か確認
↓
git pull
↓
最新状態確認
↓
対象実ファイル取得
↓
PRE-FLIGHT
```

`git pull` の前には必ず `git status` を確認する。

未コミット変更が存在する場合は、
勝手に以下を行わない。

- stash
- commit
- restore
- discard
- reset

安全にpullできない場合はSTOPし、
ローカル変更の扱いを確認する。

新しい対象ファイルを扱う場合は、
最新のRepository状態を確認した後に
その実ファイルを取得して編集判断を開始する。

古いローカル状態や過去に取得した内容を、
最新状態として扱ってはならない。

---

# 13. EXECUTION

PRE-FLIGHT通過後、
選択されたExecutorを使用してWRITEを実行する。

Writerを使用する場合は、
Writer Instruction Formatに従う。

Executorから成功応答が返っただけでは、
編集成功と確定しない。

WRITE後はPOST-FLIGHTへ進む。

---

# 14. POST-FLIGHT

WRITE後は、
対象ファイルを再取得し、
編集結果を検証する。

基本フロー：

```text
WRITE
↓
対象ファイル再取得
↓
意図した変更を確認
↓
意図しない変更を確認
↓
構造・Marker・Syntax等を確認
↓
Verification Status決定
```

---

## 14.1 Common Verification

最低限、
以下を必要な範囲で確認する。

1. 対象ファイルが実在する
2. 意図した新しい内容が存在する
3. 変更対象外の重要部分が失われていない
4. WRITERマーカーを使用した場合は正常に残っている
5. 検証できない項目を確認済みとして扱わない

---

## 14.2 PARTIAL REPLACE Verification

PARTIAL REPLACE後は原則として、

```text
旧文字列 = 0件
新文字列 = 1件
```

を確認する。

WRITERマーカーを使用した場合は、

```text
WRITER:<BLOCK_ID>:START = 1件
WRITER:<BLOCK_ID>:END   = 1件
```

も確認する。

BLOCK_IDの重複も確認する。

---

## 14.3 APPEND Verification

APPEND後は、

- 追加内容が存在する
- 既存内容が失われていない
- 意図しない重複追記がない

ことを確認する。

重複の可能性がある追記では、
実行前にも既存内容を確認する。

---

## 14.4 FULL REPLACE Verification

FULL REPLACE後は、
通常より強い検証を行う。

必要に応じて以下を確認する。

- ファイルが空になっていない
- 期待した先頭が存在する
- 期待した末尾が存在する
- 必須セクションが残っている
- 必須ID / class / data属性等が残っている
- WRITERマーカー構造が正常
- 編集前後のサイズ差が異常でない

大幅なサイズ減少等を検知した場合は、
書き込み成功だけを理由にVERIFIEDとしない。

---

## 14.5 CREATE Verification

CREATE後は、

- 対象ファイルが実在する
- 内容が空でないことが期待される場合は空でない
- 必要な初期構造が存在する
- 必要なWRITERマーカーが正常

ことを確認する。

---

# 15. Syntax Verification

ファイル種類に応じて、
可能な場合は構文確認を行う。

例：

```text
HTML
→ タグ構造・重要な閉じタグ等

CSS
→ ブロック構造等

JavaScript
→ 利用可能なら構文チェック

JSON
→ parse可能性

PHP
→ 利用可能ならsyntax check
```

利用可能な検証手段がない場合は、
構文確認済みとして扱わない。

例：

```text
Content Verification = PASS
Syntax Verification = NOT AVAILABLE
```

---

# 16. Unintended Change Detection

可能な場合は、
変更予定範囲以外に意図しない変更がないことを確認する。

PARTIAL REPLACEでは原則として、
対象境界外は変更されていないことを期待する。

利用可能であれば、

- diff
- hash
- Git差分
- 前後アンカー

等を使用して確認する。

厳密な比較が利用できない場合でも、
確認できていない変更を
確認済みとして扱わない。

---

# 17. Verification Status

単一編集の結果は、
以下の状態で扱う。

## VERIFIED

意図した変更と、
必要なPOST-FLIGHT検証が完了している。

---

## UNVERIFIED

WRITE自体は実行されたが、
必要な検証の一部を完了できていない。

UNVERIFIEDをVERIFIEDとして扱わない。

---

## FAILED

WRITEに失敗した、
または編集後に不整合・破損・期待しない状態を検知した。

---

# 18. Multi-Edit Rules

複数ファイルまたは複数箇所を編集する場合でも、
編集単位を明確に分離する。

原則：

```text
1 Writer Instruction
=
1 File Operation
```

例：

```text
EDIT 1
index.html
🟨 PARTIAL REPLACE

EDIT 2
styles.css
🟦 APPEND

EDIT 3
app.js
🟨 PARTIAL REPLACE
```

ただし、
密接に依存する変更を過度に細分化することで
途中状態が危険になる場合は、

「最小安全操作単位」

を優先する。

---

# 19. Edit Group

複数編集が一つの機能変更として依存している場合は、
論理的なEDIT GROUPとして扱う。

例：

```text
EDIT GROUP

01 HTML
02 CSS
03 JavaScript
```

一部のみ成功した場合、
Group全体を成功扱いにしない。

---

# 20. Multi-Edit Failure

複数編集の途中で失敗した場合は、
以下の手順を使用する。

```text
FAIL
↓
即STOP
↓
後続EDITを実行しない
↓
現在の実ファイル状態を再取得
↓
成功済み / 失敗 / 未実行を区別
↓
次の対応を再判定
```

---

## 20.1 No Automatic Rollback

失敗時に、
成功済み編集を自動Rollbackしてはならない。

Rollback自体も新しいWRITEである。

必要な場合は、
現在状態を確認した上で
正式な新しい編集操作として実行する。

---

## 20.2 State Refresh

一度WRITEが実行された後は、
作業開始時に取得した状態が
古くなっている可能性がある。

失敗後の再試行では、
必ず現在の実ファイル状態を再取得する。

古いExact Match文字列を
そのまま再利用してはならない。

---

## 20.3 Re-evaluation

失敗後は、

- 同じ編集を修正して再実行
- 別のEdit Operationへ変更
- 意図的なRollback
- 作業停止

のどれが適切かを再判定する。

自動的に危険度の高い操作へ切り替えない。

---

# 21. Group Status

EDIT GROUP全体は、
以下の状態で扱う。

## VERIFIED

必要なすべての編集が成功し、
検証も完了している。

---

## PARTIAL

一部編集は成功しているが、
Group全体は未完了。

---

## FAILED

必要な編集が成立していない、
または不整合を検知した。

---

## UNVERIFIED

編集は実行されたが、
Group全体の十分な検証が完了していない。

---

# 22. Fail Closed Rules

以下の場合は、
推測してWRITEを継続せずSTOPする。

- 対象ファイルを一意に特定できない
- フルパスを確認できない
- 最新実ファイルを確認できない
- Exact Matchが0件
- Exact Matchが複数件
- WRITERマーカーが壊れている
- WRITER BLOCK_IDが重複している
- 編集境界が不明
- FULL REPLACE Safety Gateを満たさない
- OUTPUTの完全性を保証できない
- CREATE対象が既に存在する
- Writer指示に省略が必要になる
- POST-FLIGHTを十分に実施できない高リスク編集
- その他、実ファイル保全に合理的な確信を持てない

STOPは失敗ではない。

危険なWRITEを防止するための
正常な安全動作として扱う。

---

# 23. Protocol Boundary

このProtocolが定義するもの：

- File Edit Operation
- 編集方式の選択原則
- WRITERマーカー
- Exact Match安全規則
- FULL REPLACE安全規則
- Writer Instruction安全規則
- PRE-FLIGHT
- POST-FLIGHT
- Verification Status
- Multi-Edit Failure処理

このProtocolが定義しないもの：

- Project固有仕様
- UIデザイン仕様
- Deploy Architecture
- Authentication Architecture
- Projectごとの機能要件
- Writerそのものの内部実装

Project固有の「何を変更するか」と、
File Edit Protocolの「どう安全に変更するか」を分離する。

---

# 24. Source of Truth

このファイルを、
KoppyOSにおけるFile Edit ProtocolのSource of Truthとする。

```text
600_KoppyOS/protocols/FILE_EDIT_PROTOCOL.md
```

File Editに関する正式手順を変更する場合は、
この正本を更新する。

他ファイルへ同一仕様を複製して
複数の正本を作らない。

---

# 25. Protocol Status

```text
Protocol:
FILE_EDIT_PROTOCOL

Version:
v0.1

Status:
DRAFT

TASK:
WRITE

Applies To:
KoppyOSが管理対象ファイルへ変更を加える作業

Source of Truth:
600_KoppyOS/protocols/FILE_EDIT_PROTOCOL.md
```

正式採用が確定するまでは、
`000_BOOT/PROTOCOL_INDEX.md` の
ACTIVE Protocol Registryへ登録しない。

正式採用後に、

```text
Status:
ACTIVE
```

へ変更し、
PROTOCOL_INDEXへ登録する。