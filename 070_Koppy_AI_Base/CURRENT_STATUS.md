# CURRENT_STATUS

## 現在地
2026-09-22 JST: Kohaku Workと共有カレンダーをMacBook Pro 2018 / Koppy Base Serverへproduction cutover済み。
Kohaku Work production authorityはPro。iPhone 14からTailscale Serve HTTPS経由で認証・最新データ読込・formal API・production DB実書込・別requestからの再読込まで実機確認済み。
KoppyOS 5-table DBもProへ分離移行済み。共有カレンダーはOPPOからLAN HTTPS `https://koppy-worker-pro.local/work/calendar/` で表示・作成・編集・削除まで実機確認済み。
Kohaku Workの外出先向けProduction URLは `https://koppy-worker-pro.tailba49c0.ts.net/work/`。このTailscale hostnameはRTX830 / Self-hosted VPN / private DNSを再設計するまで暫定production endpointとして維持する。
Lolipop旧Kohaku DBはmode 0444で凍結し短期rollback window用に保持。Koppy World本体 / OAuthのPro移行とmain mergeは未実施。

## 現在の進捗
### MacBook Pro 2018
- 初期化完了
- Koppy Base Server運用へ役割変更
- Kohaku Work production runtimeとして稼働中
- dedicated service user `_koppyweb` を採用
- production PHP-FPM `127.0.0.1:9001` / service user `_koppyweb` を運用
- Kohaku Work production SQLiteを `/opt/local/var/lib/koppy/kohaku-work/kohaku-work.sqlite` で運用
- KoppyOS production SQLiteを `/opt/local/var/lib/koppy/koppyos/koppyos.sqlite` で運用
- PHP-FPMへ `KOHAKU_WORK_DATABASE_PATH` / `KOPPYOS_DATABASE_PATH` を明示注入
- calendar API依存としてMacPorts `php83-mbstring` を導入済み
- immutable release `/opt/local/libexec/koppy/current` を採用
- current production release: `8ce84b3152485280bf6329fc9e4d3c5a051f84ba`
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
- TailscaleはStandalone版からMacPorts CLI-only版へ移行済み
- `tailscaled` はlaunchd + daemondoで常駐し、GUI未ログイン状態でも起動確認済み
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
- Kohaku Work productionへloginし、最新データ表示を実機確認済み

### OPPO
- Android 13 / model OPD2102A
- Home LANから `https://koppy-worker-pro.local/work/calendar/` へHTTPS接続
- local Koppy CAをtrust済み
- 共有カレンダーをPWAとしてホーム画面運用
- 既存予定 / shift読込、予定作成・編集・削除を実機確認済み

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
1. Pro productionを1〜2日実運用し、予約追加・編集・売上等の通常業務を確認
2. rollback window終了後、Lolipop旧配信・旧deploy/workflowのretirementを判断
3. Backup / Restore automation、retention、restore testを設計
4. SanDisk Extreme Portable SSD V2 500GBの接続・File System / Mount / Backup用途を決定
5. Koppy World本体 / OAuthのPro migrationを別Phaseとして設計
6. Automation / Monitoring / log rotationを設計
7. Thunderbolt未接続起動・停電復旧・蓋閉じ等のService lifecycle条件を検証
8. RTX830導入条件とSelf-hosted VPN migration gateを継続管理
9. Gaming PC現物スペック確認・画像AI基盤の導入計画作成

## 2026-09-22 JST｜Shared Calendar / KoppyOS DB Production checkpoint

### KoppyOS DB cutover
- KoppyOS ownershipは5 tables:
  - `calendar_color_palette`
  - `calendar_events`
  - `home_connections`
  - `home_devices`
  - `home_rooms`
- production DB: `/opt/local/var/lib/koppy/koppyos/koppyos.sqlite`
- owner / group: `_koppyweb:_koppyweb`
- DB mode: `0600`
- directory mode: `0750`
- `PRAGMA quick_check=ok`
- `calendar_events=26`
- `calendar_color_palette=6`
- PHP-FPM poolへ `KOPPYOS_DATABASE_PATH` を設定しruntime参照を確定

### Shared Calendar production
- canonical path: `/work/calendar/`
- OPPO LAN URL: `https://koppy-worker-pro.local/work/calendar/`
- PWA `id` / `start_url` / `scope`: `/work/calendar/`
- calendar pageは既存password authを継承
- calendar static assetsはexact route allowlistのみ公開
- `/work/calendar/index.html` と未知のcalendar配下pathは404
- `calendar-events.php` / `calendar-color-palette.php` はKoppyOS serverへexact route
- `shifts.php` はKohaku Work server routeを維持
- 未認証APIは401を確認
- OPPO実機で表示 / 読込 / create / update / deleteをPASS
- `php83-mbstring` 未導入によりcreate時 `mb_strlen()` が失敗したためMacPortsで導入し、PHP-FPM graceful reload後にCRUD PASS

### Production release
- GitHub commit: `8ce84b3152485280bf6329fc9e4d3c5a051f84ba`
- release: `/opt/local/libexec/koppy/releases/8ce84b3152485280bf6329fc9e4d3c5a051f84ba`
- `current` symlinkを同releaseへatomic switch済み
- existing `/work/` / login / Kohaku APIsのhealthを維持
- old release `b28b616e693c10bee51758355c0d3281b55fb65d` はrollback sourceとして保持

## 2026-09-22 JST｜Kohaku Work Production Cutover checkpoint

### Production runtime
- Pro: MacBook Pro 2018 / Koppy Base Server
- URL: `https://koppy-worker-pro.tailba49c0.ts.net/work/`
- Access: Tailscale Serve / tailnet only
- nginx: `127.0.0.1:8080`
- Kohaku PHP-FPM: `127.0.0.1:9001`
- Service user: `_koppyweb`
- DB: `/opt/local/var/lib/koppy/kohaku-work/kohaku-work.sqlite`
- Immutable release: `/opt/local/libexec/koppy/current`
- Cutover時release: `b28b616e693c10bee51758355c0d3281b55fb65d`

### DB cutover
- Lolipop source 38 user tablesをKohaku 33 / KoppyOS 5へownership split
- cross-boundary FKなし、views/triggersなし、row counts preserved
- Final Kohaku DBをsame-filesystem staging後にatomic rename
- post-cutover `quick_check=ok`
- `tables=33`
- `visits=107`
- `sqlite_sequence(visits)=197`
- `_koppyweb` read/write permission確認
- PHP-FPM 9001がfinal production DBを実際に参照することをFastCGI direct probeで確認

### Production write validation
- write test前recovery point:
  `/opt/local/var/lib/koppy/kohaku-work/backups/kohaku-work-final-production-before-write-test-20260922-155550.sqlite`
- PHP-FPM 9001経由でtemporary probe tableへ実write commit: PASS
- 別FastCGI requestからcommit済みtoken read: PASS
- probe table cleanup: PASS
- cleanup後 `quick_check=ok`, tables=33, visits=107, sequence=197
- pre-write backupとcurrent DBのschema / 全table dataは論理一致
- business data changed=NO

### Rollback state
- Lolipop旧Kohaku DBはmode 0444でfreeze
- 新規業務書込先として使用しない
- 旧deploy / workflow /配信経路は1〜2日のproduction burn-in中は保持
- rollback window終了後にretirementを判断

### Network decision
- 現在のTailscale URLは変更しない
- RTX830 / Self-hosted VPN phaseで private/split DNS、custom HTTPS hostname、certificate managementをまとめて再設計
- Tailscaleはその時点で撤去またはemergency fallback化を再評価

## 2026-09-21 JST｜Private Web初期基盤 checkpoint

### 実機構成
- Pro: MacBook Pro 13-inch 2018 / Intel Core i7 / 16GB RAM / 内蔵SSD約500GB
- macOS Sequoia 15.7.9 (24G830)、hostname: Koppy-Worker-Pro、user: kwpro
- Air → Pro: `ssh koppy-worker`、接続先 `10.77.0.2`（Thunderbolt Bridge）
- MacPorts: nginx 1.30.4、php83 / php83-fpm / php83-sqlite 8.3.33、sqlite3 3.53.4
- Tailscale 1.102.3 MacPorts CLI-only版へ移行済み
- binary: `/opt/local/bin/tailscale` / `/opt/local/bin/tailscaled`
- `sudo port load tailscale` によりlaunchd + daemondoで常駐
- 旧Standalone版 `Tailscale.app` とNetwork Extensionは削除済み
- Pro Tailscale IP: `100.122.158.90`、iPhone 14: `100.124.178.3`
- 旧Standalone node `100.89.19.32` はtailnetから削除済み

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
- Public port forwarding・Funnelは使用しない方針を維持。Serveは `tailnet only`
- Tailscale Access Controlは iPhone 14 `100.124.178.3` → Pro `100.122.158.90` の `tcp:443` のみ許可
- iPhoneでTailscale ON時のみPrivate Webへ到達し、OFF時は接続不可を実機確認
- Air → Proの管理経路はThunderbolt Bridgeを使用しており、このTailscale grantとは独立

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
- Standalone版ではGUI未ログイン時のTailscale復旧に再現性の揺れが見られたため、MacPorts CLI-only版へ移行
- Proへ `sudo shutdown -r now` を実行し、再起動後 `stat -f "%Su" /dev/console` が `root` のGUI未ログイン状態を確認
- GUI未ログインのままAir → Thunderbolt SSH: PASS
- GUI未ログインのまま `tailscaled`: PASS
- GUI未ログインのままTailscale Serve復旧: PASS
- GUI未ログインのままiPhone 14・Wi-Fi OFF・4G・Tailscale ON → HTTPS health.php: PASS
- Tailscale OFF → 接続不可、ON → 復旧: PASS
- CLI-only版で無人再起動後のPrivate Web自動復旧を実機確認済み
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
