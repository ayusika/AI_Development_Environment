# AI Development Environment - Codex Guide

このリポジトリでは、GitHub上の設計・知識・履歴を正本として扱う。

CodexはKoppyOSにおけるIntelligent Code Executorである。設計判断の主体はKoppy / ユーザーであり、Codexが未確定の仕様を勝手に決定してはならない。

## 作業ルール

- 作業前に対象ファイルと関連する正本を読む。
- 古い会話・記憶・推測だけを根拠に実装しない。
- `git status`を確認し、必要に応じて`origin/main`との差分を確認する。
- unrelated filesを変更せず、Minimum Safe Changeを優先する。
- force pushを行わない。
- conflictを勝手に解決しない。
- 不明な仕様は推測で確定せず、STOPしてKoppy / ユーザーへ確認する。
- プロジェクト固有の作業では、対象ディレクトリ内のREADME、設計書、関連ファイルも追加で読む。

## 必ず参照する正本

- [`600_KoppyOS/protocols/EXECUTOR_SELECTION_PROTOCOL.md`](600_KoppyOS/protocols/EXECUTOR_SELECTION_PROTOCOL.md) — Executorの役割・選択
- [`600_KoppyOS/protocols/FILE_EDIT_PROTOCOL.md`](600_KoppyOS/protocols/FILE_EDIT_PROTOCOL.md) — ファイル編集の安全原則
- [`600_KoppyOS/CURRENT_STATUS.md`](600_KoppyOS/CURRENT_STATUS.md) — KoppyOSの現在状態
- [`000_HOME/現在の状態.md`](000_HOME/現在の状態.md) — リポジトリ全体の現在地
- [`000_HOME/次にやること.md`](000_HOME/次にやること.md) — 次の作業
- [`000_HOME/決定事項.md`](000_HOME/決定事項.md) — 確定済み判断

必要に応じて、[`600_KoppyOS/README.md`](600_KoppyOS/README.md)と[`040_Koppy/性格/README.md`](040_Koppy/性格/README.md)も参照する。詳細仕様や現在地はこのファイルへ複製せず、各正本で確認する。
