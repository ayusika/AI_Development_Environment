# CURRENT_STATUS

## 現在地
2026-09-21 JST: Koppy Base ServerのPrivate Web初期基盤を構築し、Thunderbolt / Tailscale経由の動作と、今回の再起動後・GUI未ログインでの復旧を実機確認。
Koppy World / Kohaku Work本体および実DBは未移行。詳細は本書末尾のcheckpointを参照。

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

### iPhone 14
- Tailscale導入済み
- Wi-Fi OFF・4GでProのPrivate Web / HTTPS接続を実機確認

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
- iPhoneは補助・確認・音声・Private Access導線（現在の実機検証はiPhone 14）
- Pro上のQwen 7B / Aiderは実験用として休眠
- 現マンション回線は端末へ172.16.15.xのPrivate IPv4を配布しており、upstream NATが存在する
- 現回線では通常のInbound Self-hosted VPNを前提にしない
- 暫定Private Remote AccessとしてTailscaleを採用
- RTX830はHome Gateway / Firewall / 将来のSelf-hosted VPN endpoint候補
- RTX830によるSelf-hosted VPNは、外部着信可能な回線を確保できた後の将来Phaseとする
- 自宅開発ではAir ↔ ProのThunderbolt Bridgeを優先する

## 次の優先タスク
1. tailnetのAccess Control / Funnel無効状態を設定面から確認し、iPhoneの到達範囲を必要最小限にする
2. 常設Directory Layout / Service実行ユーザー / 権限 / ログと監視の設計
3. Koppy World / Kohaku Workの現行コード・認証・DB依存を確認し、認証を維持した移行計画を作成
4. 実DBの保存先・整合性のあるBackup / Restore手順と復元テストを設計
5. SanDisk Extreme Portable SSD V2 500GBの接続・File System / Mount / 用途を決定
6. Thunderbolt未接続起動・停電復旧等、今回未確認のService lifecycle条件を検証
7. 必要に応じてtailnet経由SSHを確認（今回のSSHはThunderbolt経由）
8. Gaming PC 現物スペック確認・画像AI基盤の導入計画作成

## 2026-09-21 JST｜Private Web初期基盤 checkpoint

### 実機構成
- Pro: MacBook Pro 13-inch 2018 / Intel Core i7 / 16GB RAM / 内蔵SSD約500GB
- macOS Sequoia 15.7.9 (24G830)、hostname: Koppy-Worker-Pro、user: kwpro
- Air → Pro: `ssh koppy-worker`、接続先 `10.77.0.2`（Thunderbolt Bridge）
- MacPorts: nginx 1.30.4、php83 / php83-fpm / php83-sqlite 8.3.33、sqlite3 3.53.4
- Tailscale 1.102.4 Standalone版、bundle ID: `io.tailscale.ipn.macsys`
- Tailscale Network Extensionはactivated / enabled
- Pro Tailscale IP: `100.89.19.32`、iPhone 14: `100.124.178.3`

### 接続とService管理
- nginxの待受: `127.0.0.1:8080` と `10.77.0.2:8080`
- PHP-FPMの待受: `127.0.0.1:9000`（Pro内部限定）
- Tailscale Serve: `tailscale serve --bg http://127.0.0.1:8080`
- VPN内HTTPS: https://koppy-worker-pro.tailba49c0.ts.net/health.php
- Airの直接接続: http://10.77.0.2:8080/health.php
- MacPortsの `org.macports.nginx` / `org.macports.php83-fpm` を `port load` で有効化
- launchd + daemondoで管理。plistのKeepAliveは有効。異常終了を意図的に起こす復旧試験は未実施
- 現在のworker / PHP-FPM poolは `nobody`。本番アプリ用ユーザーと書込権限は未設計
- HTTPのThunderbolt経路は確認用。認証付きアプリ移行時にHTTPS / Secure Cookie / Proxy経由HTTPS判定を設計する
- Public port forwarding・Funnelは使用しない方針を維持。Serve出力は「Available within your tailnet」
- VPN OFFで当該URLに接続不可を確認したが、tailnet全体の権限監査・他Serviceの公開範囲監査の完了は意味しない

### 実ファイル
- nginx設定: `/opt/local/etc/nginx/nginx.conf`
- FastCGI設定: `/opt/local/etc/nginx/fastcgi.conf`
- PHP-FPM設定: `/opt/local/etc/php83/php-fpm.conf`
- pool設定: `/opt/local/etc/php83/php-fpm.d/www.conf`
- 確認用PHP: `/opt/local/var/www/koppy-base-check/health.php`
- nginxは `location = /health.php` だけを確認用PHPへ転送。確認用rootと `fastcgi.conf` を使用
- `fastcgi_params` は存在せず、初回のnginx設定検査が失敗。reload前に停止し、確認済みの `fastcgi.conf` へ修正後に検査・reload成功
- nginx設定変更前のコピーは同ディレクトリに保存:
  - `nginx.conf.koppy-before-loopback`
  - `nginx.conf.koppy-before-php-check`
  - `nginx.conf.koppy-before-fastcgi-fix`（検査失敗時の設定。復元用正常版として扱わない）
  - `nginx.conf.koppy-before-thunderbolt`
- これらは同一ディスク内の作業用コピーであり、災害・ディスク故障対策のBackupではない
- 実機設定・health.phpそのもののGit管理と再構築用スクリプト化は未実施

### 検証結果
- nginx / PHP-FPMの設定検査: PASS
- Pro localhost → nginx → PHP-FPM → PDO SQLite: PASS
- SQLiteは `sqlite::memory:` で `SELECT 1`。実DBの永続化・書込権限・移行・復元は未検証
- 応答: `{"php":"ok","sqlite":"ok"}`。health.phpは `Cache-Control: no-store` を送信
- Air → Thunderbolt → health.php: PASS
- iPhone 14、Wi-Fi OFF・4G・Tailscale ON → HTTPS health.php: PASS
- 同条件でTailscale OFF → 接続不可、ONへ戻す → 復旧: PASS
- Proへ `sudo shutdown -r now` を実行後、ユーザー申告でProのGUI未ログインを確認
- 再起動後、Air / iPhoneの両経路で応答成功。新しいquery `?check=after-reboot-01` でも両方成功を確認
- これは今回の構成・再起動条件での実機結果。Standalone版の一般的なログイン前動作保証には拡張しない
- 公式比較表のログイン前動作に関する記載との相違があるため、CLI版への変更はいったん保留し現構成を継続
- 参照: https://tailscale.com/docs/concepts/macos-variants

### 電源・実験環境
- AC接続時: sleep 0 / displaysleep 10 / disksleep 0
- Battery時: sleep 1。蓋閉じ・バッテリー切れ・停電からの無人復旧は未確認
- FileVaultは今回の観測時点でOFF。恒久的な暗号化方針の決定を意味しない
- 残っていた `llama-server`（127.0.0.1:8080）をSIGTERMで停止し、停止と待受解除を確認
- 停止操作でモデルやtmuxを削除していない。ただしtmuxセッションの再起動後復元は未設定
- 作業開始時に `koppy-private-web` は一覧になく、8787の待受も出力なし。仮テスト用ファイルの削除は未実施

### 移行方針と未完了範囲
- Koppy World / Kohaku Workの既存認証は維持して移行する。ログイン操作の簡略化は移行後に検討
- 本体コード・実DB・secretは今回移行していない
- ロリポップ / 旧GitHub Pagesの停止・削除はしていない。移行検証後に旧配信経路を整理する
- 実DB永続化、Backup / Restore、外付けStorage、Automation、ログローテーション・Monitoringは未完了
- Thunderboltが利用できない起動時のnginx bind挙動、停電・蓋閉じ、更新後の復旧は未検証
