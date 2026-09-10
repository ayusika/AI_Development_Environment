# CURRENT_STATUS

## 現在地
Koppy AI Base の初期設計を開始。

## 現在の進捗
### MacBook Pro 2018
- 初期化完了
- Koppy Worker Pro として再構成
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

### MacBook Air
- Koppy司令塔として運用中
- VSD経由で Worker 操作用ショートカット作成済み
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
- 開発AIの中心は Air + Pro
- 画像AIの中心は Gaming PC
- iPhone は補助・確認・音声導線
- Pro は画像AI本体ではなく Worker に専念させる

## 次の優先タスク
1. Koppy Worker Pro の開発Executor化設計
2. Gaming PC 現物スペック確認
3. 4本柱ネットワーク・保存設計
4. 画像AI基盤の導入計画作成