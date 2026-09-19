# CURRENT_STATUS

## 現在地
Koppy AI Base の初期設計を開始。

## 現在の進捗
### MacBook Pro 2018
- 初期化完了
- Koppy Base Server運用へ役割変更
- コンピュータ名 `Koppy-Worker-Pro` は現時点では維持
- Apple Account ログイン済み
- iCloud同期は最小化済み
- Thunderbolt Bridge 固定IP設定済み
- SSH接続成功
- SSH鍵認証成功
- `ssh koppy-worker` 接続成功
- 画面共有接続成功
- `tmux` 導入済み
- `gh` 認証済み
- GitHub 正本 `AI_Development_Environment` clone 済み
- PHP / SQLite / ripgrep 利用可能
- MacPorts を主系として設定済み
- Qwen 2.5 Coder 7B / llama.cpp / Aider実験済み
- ローカル7Bは主開発Executorには採用せず、実験用として休眠
- SanDisk Extreme Portable SSD V2 500GBを所有済み
- SSDはKoppy Base Server用StorageとしてProへ接続予定
- SSDのFile System / Mount / Data Layoutは未確定

### MacBook Air
- Koppy Command Centerとして運用中
- Koppy → CMDをメイン開発Executorとして運用
- Codex / VS Code Agent / Koppy World WriterをサブExecutorとして利用
- VSD経由でPro操作用ショートカット作成済み
- `PRO SHOT` 構成確認済み
- `Remote Desktop` 起動用アプリ作成済み

### iPhone 18 Pro Max
- 導入予定
- 将来的に Koppy Pocket として利用予定

### Gaming PC
- 導入予定
- 想定スペック:
  - Ryzen 7 系
  - DDR4 32GB
  - RTX 2070
  - SSD 250GB
- 画像生成AI本体候補として計画中

## 現時点の判断
- 開発の中心はAir上のKoppy → CMD
- サブExecutorはCodex / VS Code Agent / Koppy World Writer
- Proは開発Executorから外し、Koppy Base Serverへ役割変更
- 画像AIの中心はGaming PC
- iPhoneは補助・確認・音声・将来のPrivate Access導線
- Pro上のQwen 7B / Aiderは実験用として休眠
- 外部VPN構想は現時点で保留
- 自宅開発ではAir ↔ ProのThunderbolt Bridgeを優先する

## 次の優先タスク
1. Koppy Base ServerのWeb / API / DB基盤設計
2. SanDisk Extreme Portable SSD V2 500GBをProへ接続
3. SSDのFile System / Mount / Data Layout / Backup方針決定
4. Proの常時稼働Service / Automation / Monitoring設計
5. Gaming PC 現物スペック確認
6. 画像AI基盤の導入計画作成
7. VPN / 外部Private Accessは必要時に再検討