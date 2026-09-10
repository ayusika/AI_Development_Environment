# 07_Koppy_AI_Base

## 概要
Koppy AI Base は、しいちゃん専用の AI 実行基盤・開発基盤・画像生成基盤をまとめて設計・管理するためのディレクトリです。

このディレクトリでは、以下の4本柱を中心に管理します。

- MacBook Air（Koppy本体 / 司令塔 / メインAI）
- MacBook Pro 2018（Koppy Worker / Git / 自動処理 / 補助サーバー）
- iPhone 18 Pro Max（ポケットKoppy / 音声入力 / 確認 / 通知）
- Gaming PC（GPU工場 / 画像生成 / LoRA学習 / ComfyUI）

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
   - Koppy Worker
   - Git / GitHub / tmux
   - PHP / ripgrep
   - 自動処理
   - 画面共有 / SSH / Worker運用

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
- Air = 考える
- Pro = 支える・実行する
- iPhone = 呼ぶ・確認する
- Gaming PC = 重いAI処理を回す

## 関連ファイル
- `CURRENT_STATUS.md`
- `ROADMAP.md`
- `01_Overview/Architecture.md`