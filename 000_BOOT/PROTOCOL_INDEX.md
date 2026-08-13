# KoppyOS Protocol Index

このファイルは、
KoppyOSで現在正式に利用可能なProtocolの所在・役割・適用条件を管理する正式Indexである。

`PROTOCOL_INDEX.md` 自体には、
各Protocolの具体的な操作手順や詳細仕様を複製しない。

Protocol本文はそれぞれのSource of Truthを正本とし、
このファイルはRoutingからProtocolへ到達するための住所録として機能する。

---

# 1. Protocol Definition

Protocolとは、

「特定種類の作業を、安全かつ一貫した方法で実行するための正式手順」

である。

Protocolは、
System ArchitectureやProject固有設計とは役割を分離する。

### Architecture

何を、
なぜ、
どのような構造で成立させるかを定義する。

### Protocol

実際の作業時に、
何を確認し、
どの順序で処理し、
どの条件を守るかを定義する。

---

# 2. Protocol Registration Requirements

ProtocolをこのIndexへ正式登録するには、
以下の条件をすべて満たす必要がある。

1. GitHub上にProtocol本文が実在する
2. その本文が自身を正式なProtocolとして明示している
3. Source of Truthが一意に特定できる
4. 適用条件が定義されている
5. 正式採用が確定している

この条件を満たしていないものを、
ACTIVE Protocolとして登録してはならない。

PROTOCOL_INDEXへの登録は、
Protocolを正式化する行為そのものではない。

正式化されたProtocolを、
Routingから発見可能にするための登録行為である。

---

# 3. Protocol Status

Protocol Indexで使用するStatusは、
以下の2種類とする。

## ACTIVE

現在正式に利用可能なProtocol。

Routingによって適用対象と判断された場合、
実作業前に参照する。

---

## DEPRECATED

正式に廃止されたProtocol。

新しい作業には使用しない。

必要に応じて、
後継Protocolまたは現在の正式手順への参照を保持する。

廃止されたProtocolをIndexから完全に消去せず、
過去のProject正本や履歴から参照された場合に
存在履歴を確認できる状態を維持する。

---

# 4. DRAFT / Planned Protocol

設計中・検討中・将来予定のProtocolは、
このIndexへ登録しない。

以下はProtocol Registryの対象外とする。

- DRAFT
- Candidate
- Planned
- Experiment
- Idea

正式採用され、
Registration Requirementsを満たした時点で
ACTIVEとして登録する。

Protocol候補や開発予定は、
HOME・Roadmap・Project・Lab等の
適切な領域で管理する。

---

# 5. Routing Usage

`000_BOOT/ROUTING_RULES.md` が
TASK + TARGETからProtocol適用の必要性を判定した場合、
このIndexを使用して正式なProtocolの所在を解決する。

基本フロー：

```text
TASK + TARGET
      ↓
ROUTING_RULES
      ↓
Protocolが必要
      ↓
PROTOCOL_INDEX
      ↓
ACTIVE Protocol確認
      ↓
Source of Truth
      ↓
Protocol本文を読む
      ↓
作業開始
```

Indexに登録されていないProtocolを、
記憶や推測だけで存在するものとして扱わない。

---

# 6. Protocol Registry Format

ACTIVEまたはDEPRECATED Protocolは、
原則として以下の形式で登録する。

```text
Protocol Name:

Status:

TASK:

Applies To:

Source of Truth:

Replacement:
DEPRECATEDの場合のみ必要に応じて記載
```

具体的な操作方法はこのIndexへ記載しない。

---

# 7. ACTIVE PROTOCOLS

現在、Registration Requirementsを満たし、
正式にACTIVEとして登録されているProtocolは以下。

```text
Protocol Name:
FILE_EDIT_PROTOCOL

Status:
ACTIVE

TASK:
WRITE

Applies To:
KoppyOSが管理対象ファイルへ変更を加える作業

Source of Truth:
600_KoppyOS/protocols/FILE_EDIT_PROTOCOL.md
```

---

# 8. DEPRECATED PROTOCOLS

現在、正式にDEPRECATEDとして登録されているProtocolはない。

```text
None
```

---

# 9. Architectureとの境界

Architecture内に具体的な処理順序や安全ルールが記載されていても、
それだけを理由にProtocolとして扱わない。

Protocolとして利用するには、
正式なProtocol化とIndex登録を必要とする。

既存ArchitectureがProtocol的役割を一部含んでいる場合でも、

Architecture
=
Systemまたは機能の構造設計

Protocol
=
作業時の正式手順

として役割を区別する。

---

# 10. Source of Truth Principle

各Protocolの正式仕様は、
そのProtocol自身のSource of Truthのみで管理する。

PROTOCOL_INDEXへ、
Protocol本文を複製しない。

Indexには、

- Protocol名
- Status
- 適用TASK
- 適用範囲
- 正本の場所

など、
Routingに必要な最小限の情報のみを保持する。

---

# 11. Index Maintenance

Protocolを新規登録・廃止・置換する場合は、
PROTOCOL_INDEXも同時に更新する。

以下の状態を作らない。

- Protocol本文は存在するがIndexに登録されていない
- IndexにはACTIVEとあるが正本が存在しない
- Source of Truthの場所が古い
- DEPRECATED ProtocolがACTIVEとして残っている

IndexとProtocol正本の不整合を検知した場合は、
不整合を黙って補完せず確認・修正する。

---

# 12. Protocol Index Boundary

このファイルは、
Protocolの住所録である。

ここには以下を保存しない。

- Protocol本文
- Project固有仕様
- 作業ログ
- 設計中の候補
- 一時的なメモ
- 実験内容
- 現在の進捗
- 操作結果

「これは今使える正式Protocolを探すために必要か？」

YES
→ PROTOCOL_INDEX候補

NO
→ HOME / Project / Architecture / Lab等の
適切な領域へ保存する。