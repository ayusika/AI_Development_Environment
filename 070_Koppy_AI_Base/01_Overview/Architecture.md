# Architecture

## 全体像
Koppy AI Base は、4本柱構成で動くしいちゃん専用のAI基盤です。

- Air = Koppy Command Center
- Pro = Koppy Base Server
- iPhone = Koppy Pocket
- Gaming PC = GPU AI Factory

## 2026-09-22 Production State

Kohaku Work productionとKoppyOS shared calendar productionはProへ移行済み。

```text
External private access

iPhone
→ Tailscale tailnet
→ Tailscale Serve HTTPS
→ nginx
→ password auth
→ PHP-FPM 127.0.0.1:9001 / _koppyweb
→ Kohaku Work DB
   /opt/local/var/lib/koppy/kohaku-work/kohaku-work.sqlite
```

```text
Home LAN shared calendar

OPPO
→ https://koppy-worker-pro.local/work/calendar/
→ LAN HTTPS
→ nginx
→ password auth
→ PHP-FPM 127.0.0.1:9001 / _koppyweb
→ KoppyOS DB
   /opt/local/var/lib/koppy/koppyos/koppyos.sqlite
```

Kohaku Work private remote URL:

```text
https://koppy-worker-pro.tailba49c0.ts.net/work/
```

Shared Calendar home LAN URL:

```text
https://koppy-worker-pro.local/work/calendar/
```

DB ownershipはKohaku Work 33 tables / KoppyOS 5 tablesに分離し、
PHP-FPMへ `KOHAKU_WORK_DATABASE_PATH` / `KOPPYOS_DATABASE_PATH` を明示する。

Runtime codeは`/opt/local/libexec/koppy/releases/`のimmutable releaseと
`/opt/local/libexec/koppy/current` symlinkで管理し、
DB / session / secret / logはrelease外へ分離する。

Current production release:

```text
8ce84b3152485280bf6329fc9e4d3c5a051f84ba
```

Calendar APIはmultibyte title validationに `mb_strlen()` を使用するため、
Pro runtime dependencyとしてMacPorts `php83-mbstring` を導入する。

Lolipop旧Kohaku DBはmode 0444のrollback-only legacy。
現在のTailscale hostnameはRTX830 / Self-hosted VPN / private DNS phaseまで維持する。

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
- Kohaku Work / KoppyOSの分離production DB
- `php83-mbstring` を含むproduction PHP runtime
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
- Home LANではOPPOから `koppy-worker-pro.local` のHTTPSへ必要なWeb surfaceのみ接続
- Airの管理経路はThunderbolt Bridgeを優先し、OPPO向けLAN Web経路と分離
- 外部Private Accessは当面Tailscaleを採用
- TailscaleはPublic InternetへWeb / SSH / DBを直接公開せず、tailnet内で利用する
- 現マンション回線は172.16.15.xのPrivate IPv4が配布され、upstream NATが存在する
- RTX830はHome Gateway / Firewall / 将来のSelf-hosted VPN endpoint候補とする
- Self-hosted VPNは外部着信可能なGlobal IPv4等を持つ回線を確保できた後に再検討する

## 基本思想
- 1台で全部やらない
- 各端末に役割を持たせる
- 開発ExecutorとServer Infrastructureを分離する
- Koppyが設計し、Airを中心に開発Executorを選択する
- Proは24時間稼働可能なServer / Infrastructureへ専念する
- 重いGPU処理はGaming PCへ分離する
- 外部公開よりPrivate Networkを優先する
- 将来的な拡張性を最初から確保する