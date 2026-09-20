# ROADMAP

## Phase 1: Koppy Base Server 基盤
- [x] 初期化
- [x] SSH
- [x] 固定IP
- [x] 画面共有
- [x] tmux
- [x] GitHub認証
- [x] 正本clone
- [x] ローカル7B / Aider試作
- [x] Proを主開発Executorにしない方針を確定
- [x] Koppy Base Serverへ役割変更
- [ ] Private Web Server基盤
- [ ] API / DB基盤
- [ ] SanDisk Extreme Portable SSD V2 500GB接続
- [ ] SSD File System決定
- [ ] Mount / Directory Layout決定
- [ ] Backup方針決定
- [ ] Automation / Monitoring設計

## Phase 2: 開発Executor基盤
- [x] Koppy → CMDをメインExecutor化
- [x] CodexをサブExecutorとして維持
- [x] VS Code AgentをサブExecutorとして維持
- [x] Koppy World WriterをSafe Write Executorとして維持
- [ ] Executor Selection ProtocolへKoppy → CMD主系を正式反映
- [ ] ProとのServer連携フロー整理

## Phase 3: Private Remote Access
- [x] 現マンション回線でupstream NATを確認
- [x] 暫定Private Remote AccessとしてTailscaleを採用
- [ ] ProへTailscale導入
- [ ] iPhoneへTailscale導入
- [ ] tailnet内疎通確認
- [ ] tailnet経由SSH確認
- [ ] Private Web接続確認
- [ ] iPhoneから利用可能なService範囲を必要最小限へ制限
- [ ] Public InternetへのWeb / SSH / DB直接公開を行わない
- [ ] Tailscale Funnelを使用しない
- [ ] RTX830をHome Gateway / Firewallとして導入
- [ ] 外部着信可能な回線確保後にSelf-hosted VPNを再検討

## Phase 4: Gaming PC の画像AI基盤
- [ ] 現物スペック確認
- [ ] SSD拡張検討
- [ ] ComfyUI導入
- [ ] 画像生成基本動作確認
- [ ] inpaintワークフロー構築
- [ ] 顔学習方針整理
- [ ] LoRA学習方針整理

## Phase 5: iPhone 18 Pro Max 連携
- [ ] ショートカット方針
- [ ] Koppy Pocket 構想整理
- [ ] 通知 / 承認フロー検討
- [ ] 音声入力導線整理
- [ ] Tailscale経由Private AccessをKoppy Pocket導線へ統合

## Phase 6: 4本柱統合
- [ ] Air ↔ Pro Thunderbolt Server接続の運用確定
- [ ] Pro ↔ Gaming PC接続方針確定
- [ ] Server Storage保存先ルール確定
- [ ] 結果確認フロー確定
- [ ] Koppy統合指令フロー作成
- [ ] 将来的なPrivate Web UI方針検討
