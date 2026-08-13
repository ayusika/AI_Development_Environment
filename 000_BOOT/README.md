# KoppyOS BOOT

このディレクトリは、KoppyがGitHub上の情報を参照・編集する際に最初に通る起動層である。

`000_BOOT` は日常的な作業情報を保存する場所ではない。
KoppyOSの起動、参照、ルーティングに必要な最小限のルールのみを保持する。

---

## 1. BOOT開始条件

KoppyがGitHub上の情報を参照または編集するすべての作業は、
このファイルから開始する。

特定の合言葉には依存しない。

例：

- 「GitHub読みにいって」
- GitHub上のファイル内容を確認する
- GitHub上の設計を参照する
- GitHub上のファイルを修正する
- GitHubへ新しいファイルを作成する
- GitHubを正本とするプロジェクトの作業を再開する

---

## 2. BOOT MODE判定

このファイルを確認したあと、
`FULL BOOT` または `FAST BOOT` を判定する。

### FULL BOOT

以下のいずれかに該当する場合はFULL BOOTとする。

- 新しいチャットで作業を開始した
- 前回の作業から長期間空いた
- `000_BOOT` またはKoppyOSの根幹構造が変更された
- ユーザーから「現在地確認」を指示された
- Koppyが現在地を十分に把握していない
- GitHub上の情報と現在の認識に矛盾を検知した
- 復旧作業を行う
- FULL / FASTの判断に迷う

### FAST BOOT

現在の作業状態を十分に把握しており、
FULL BOOT条件に該当しない場合はFAST BOOTとする。

---

## 3. FULL BOOT

FULL BOOTでは以下の順序で確認する。

1. `000_BOOT/KOPPY_KERNEL.md`
2. `000_HOME` の現在地・決定事項・必要な履歴
3. `000_BOOT/ROUTING_RULES.md`
4. 必要に応じて `000_BOOT/PROTOCOL_INDEX.md`
5. 作業に必要なProtocol
6. 対象Projectの正本

---

## 4. FAST BOOT

FAST BOOTでは以下の順序で確認する。

1. `000_HOME` の現在地に関係する情報
2. `000_BOOT/ROUTING_RULES.md`
3. 必要に応じて `000_BOOT/PROTOCOL_INDEX.md`
4. 作業に必要なProtocol
5. 対象Projectの正本

FAST BOOTでは原則として `KOPPY_KERNEL.md` の再読を省略できる。

---

## 5. 000_HOMEの読み方

FAST BOOTでは、
`000_HOME` 全体を毎回読む必要はない。

現在の状態や次に行う作業など、
変動性の高い現在地情報を優先して確認する。

FULL BOOTでは必要に応じて、
決定事項や更新履歴を含めて広く確認する。

---

## 6. Protocolの読み方

すべてのProtocolを毎回読む必要はない。

`ROUTING_RULES.md` に従って作業内容を判定し、
その作業に必要なProtocolのみを参照する。

Protocolの正式な所在は
`PROTOCOL_INDEX.md` を正本とする。

---

## 7. Koppy OS表示の最小原則

Koppyは、通常の会話・説明・補足・感想・判断などを原則としてKoppy OSパネルへ表示しない。

Koppy OSパネルは、ユーザーへ渡す明確なコピペ対象データを表示する場合に使用する。

Koppy OSパネルおよびその他の表示形式では、
ユーザーがコピーした結果の完全性を最優先する。

Koppy OSパネルで実データの完全性を保証できない場合は、
実データを表示形式へ合わせて変更・省略せず、
完全性を保持できる別の表示形式へ切り替える。

Koppy OSパネルとKoppy OS表示の詳細仕様は、
`040_Koppy/性格/README.md`
を正本として参照する。

---

## 8. BOOTの原則

- GitHub上に存在しない構造を推測で補完しない
- 現在のGitHubを正本として確認する
- 必要なProtocolを未確認のまま対象作業へ進まない
- 読み順に迷った場合は安全側へ倒しFULL BOOTを行う
- `000_BOOT` に日常的な作業ログやプロジェクト固有情報を蓄積しない

---

## 9. 役割分離

`000_BOOT`
: KoppyOSの起動・ルーティングを担当する。

`000_HOME`
: Koppy World全体の現在地・次の行動・決定・履歴を管理する。

`KOPPY_KERNEL.md`
: KoppyOSの根幹原則を管理する。

`ROUTING_RULES.md`
: 作業内容から参照すべき情報への経路を管理する。

`PROTOCOL_INDEX.md`
: 各Protocolの正式な所在と役割を管理する。

各Project
: プロジェクト固有の設計・状態・データを管理する。