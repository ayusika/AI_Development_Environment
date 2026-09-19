# Architecture

## 全体像
Koppy AI Base は、4本柱構成で動くしいちゃん専用のAI基盤です。

- Air = Koppy Command Center
- Pro = Koppy Base Server
- iPhone = Koppy Pocket
- Gaming PC = GPU AI Factory

## 4本柱の役割

### 1. MacBook Air
**役割:** Koppy Command Center / 設計脳 / メイン開発端末

- Koppyとの会話
- 設計判断
- Koppy → CMD
- GitHub・設計書確認
- コード編集・検証
- 全体統括

### 2. MacBook Pro 2018
**役割:** Koppy Base Server

- Private Web Server
- API / DB
- Git / GitHub
- PHP / SQLite
- launchd等による自動処理
- 監視 / Log
- Backup
- NAS / Storage補助
- tmux常駐
- SSH / 画面共有
- AirとのThunderbolt Bridge直結
- Qwen 7B / Aiderは実験用として休眠

#### Storage
- 内蔵SSD: 約500GB
- 外付け: SanDisk Extreme Portable SSD V2 500GB
- 型番: SDSSDE61-500G-GH25
- USB 3.2 Gen 2
- 読出最大1050MB/s
- 所有済み / Proへの接続予定
- File System / Mount / Data Layout / Backup設計は未確定
- 実接続確認前のため物理接続関係はまだ確定しない

### 3. iPhone 18 Pro Max
**役割:** Koppy Pocket

- 音声入力
- 外出先確認
- 承認
- 通知受信
- 素材撮影

### 4. Gaming PC
**役割:** GPU AI Factory

- ComfyUI
- 画像生成
- リアル画像生成
- inpaint
- LoRA学習
- 顔学習
- 重いローカルAI処理

## 実行レーン分離

### 開発Executorレーン
1. Koppy → CMD
   - Main Executor
   - Air上でKoppyが設計・変更・検証を統括

2. Codex
   - Intelligent Code Executor
   - 大規模・複数ファイル・高度な実装

3. VS Code Agent
   - Intelligent Local Workspace Executor
   - Workspace / Terminal / Local Runtime

4. Koppy World Writer
   - Deterministic / Safe Write Executor
   - 確定済み変更の安全な反映

MacBook Pro 2018は開発Executorから外し、Koppy Base ServerとしてInfrastructureを担当する。

### 画像AIレーン
- 主司令: Air
- 実行: Gaming PC
- 補助確認: iPhone
- 保存補助: Pro

### 自宅Serverレーン
- 主操作: Air
- 常時稼働: Pro
- Air ↔ Proの自宅開発通信はThunderbolt Bridgeを優先
- Pro上にPrivate Web / API / DB / Automation / Storageを集約
- 外部Private Access用VPNは方式未確定のため保留
- マンション回線制約を踏まえ、自前VPNまたは外部VPN方式を将来再検討

## 基本思想
- 1台で全部やらない
- 各端末に役割を持たせる
- 開発ExecutorとServer Infrastructureを分離する
- Koppyが設計し、Airを中心に開発Executorを選択する
- Proは24時間稼働可能なServer / Infrastructureへ専念する
- 重いGPU処理はGaming PCへ分離する
- 外部公開よりPrivate Networkを優先する
- 将来的な拡張性を最初から確保する