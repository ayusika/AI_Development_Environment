# 070_Koppy_AI_Base

## 概要
Koppy AI Base は、しいちゃん専用の AI 実行基盤・開発基盤・画像生成基盤をまとめて設計・管理するためのディレクトリです。

このディレクトリでは、以下の4本柱を中心に管理します。

- MacBook Air（Koppy本体 / 司令塔 / メインAI）
- MacBook Pro 2018（Koppy Base Server / Web / API / DB / 自動処理 / 保存）
- iPhone 18 Pro Max（ポケットKoppy / 音声入力 / 確認 / 通知）
- Gaming PC（GPU工場 / 画像生成 / LoRA学習 / ComfyUI）

## Current Production State

2026-09-22 JST、Kohaku Workと共有カレンダーはMacBook Pro 2018 / Koppy Base Serverへproduction cutover済み。

```text
External private access
iPhone
→ Tailscale Serve HTTPS
→ nginx
→ PHP-FPM 9001 / _koppyweb
→ Kohaku Work DB

Home LAN
OPPO
→ https://koppy-worker-pro.local/work/calendar/
→ nginx
→ PHP-FPM 9001 / _koppyweb
→ KoppyOS DB
```

Current endpoints:

```text
Kohaku Work:
https://koppy-worker-pro.tailba49c0.ts.net/work/

Shared Calendar:
https://koppy-worker-pro.local/work/calendar/
```

Production DB ownership:

```text
Kohaku Work:
 /opt/local/var/lib/koppy/kohaku-work/kohaku-work.sqlite
 33 user tables

KoppyOS:
 /opt/local/var/lib/koppy/koppyos/koppyos.sqlite
 5 user tables
```

KoppyOS 5-table DBはPro移行済み。
共有カレンダーはOPPO実機で表示・作成・編集・削除とPWA運用まで確認済み。
Runtime codeはimmutable release `/opt/local/libexec/koppy/current` で管理し、current production releaseは `8ce84b3152485280bf6329fc9e4d3c5a051f84ba`。

Lolipop旧Kohaku DBはmode 0444で凍結し、短期rollback window用として保持する。
Koppy World本体 / OAuthは別phaseでProへ移行する。

## 目的
- KoppyOS全体のAI基盤を整理する
- ローカルAI開発環境を一貫して管理する
- コーディングAIと画像AIを分離しつつ連携させる
- 各端末の役割を明確にする
- 将来的な拡張（音声、Web UI、Agent統合）に備える

## 位置づけ
このディレクトリは、単なる実験メモではなく、KoppyOS全体に関わる中核インフラ設計を扱います。

そのため `90_Lab` ではなく、第一階層ディレクトリとして独立管理します。

## 管理対象
- 端末ごとの役割
- AI実行基盤
- 開発用Agent基盤
- 画像生成基盤
- 接続構成
- 保存・バックアップ方針
- セキュリティ・プライバシー方針
- 今後の拡張ロードマップ

## 現在の4本柱
1. **MacBook Air**
   - Koppy本体
   - メイン会話端末
   - 設計・判断
   - ローカルLLM候補
   - メイン作業環境

2. **MacBook Pro 2018**
   - Koppy Base Server
   - Web / API / DB
   - Git / GitHub / tmux
   - PHP / SQLite / ripgrep
   - Kohaku Work DB / KoppyOS DBの分離production runtime
   - MacPorts `php83-mbstring` をcalendar API dependencyとして導入済み
   - 自動処理 / 監視 / バックアップ
   - 画面共有 / SSH
   - SanDisk Extreme Portable SSD V2 500GBを外付けServer Storageとして利用予定
   - Qwen 7B / Aiderは実験用として休眠

3. **iPhone 18 Pro Max**
   - Koppy Pocket
   - 音声入力
   - 結果確認
   - 通知
   - 外出先からの補助操作

4. **Gaming PC**
   - GPU AI Factory
   - ComfyUI
   - リアル画像生成
   - LoRA学習
   - 顔学習
   - inpaint / ControlNet

## 優先方針
- Air = Koppy Command Center / メイン開発環境
- Pro = Koppy Base Server / 常時稼働インフラ
- iPhone = 呼ぶ・確認する
- Gaming PC = 重いGPU AI処理を回す

## 開発Executor 4本柱
1. **Koppy → CMD**
   - メインExecutor
   - Koppyが設計・変更内容を判断し、AirのローカルCMD経由で実行・検証する

2. **Codex**
   - 大規模実装
   - 複数ファイル
   - 高度なコード変更

3. **VS Code Agent**
   - Local Workspace
   - Terminal
   - ローカル実環境を使う作業

4. **Koppy World Writer**
   - Deterministic / Safe Write
   - GitHub正本への限定的・確定的変更

MacBook Pro 2018は開発Executor 4本柱には含めず、Server / Infrastructureを担当する。

## 関連ファイル
- `CURRENT_STATUS.md`
- `ROADMAP.md`
- `01_Overview/Architecture.md`