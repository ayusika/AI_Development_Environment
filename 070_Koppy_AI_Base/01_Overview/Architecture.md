# Architecture

## 全体像
Koppy AI Base は、4本柱構成で動くしいちゃん専用のAI基盤です。

- Air = 司令塔
- Pro = Worker
- iPhone = ポケット端末
- Gaming PC = GPU工場

## 4本柱の役割

### 1. MacBook Air
**役割:** Koppy本体 / 設計脳 / メイン端末

- Koppyとの会話
- 設計判断
- ローカルAIの中枢候補
- GitHub・設計書確認
- 全体統括

### 2. MacBook Pro 2018
**役割:** Koppy Worker

- Git操作
- PHP実行
- 自動処理
- tmux常駐
- SSH / 画面共有
- 補助サーバー
- 軽いNAS的運用

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

## AIレーン分離

### 開発AIレーン
- 主司令: Air
- 実行: Pro
- 補助: iPhone

### 画像AIレーン
- 主司令: Air
- 実行: Gaming PC
- 補助確認: iPhone
- 保存補助: Pro

## 基本思想
- 1台で全部やらない
- 各端末に役割を持たせる
- AI本体と作業実行機を分離する
- Koppyが設計し、各端末が役割分担して動く
- 将来的な拡張性を最初から確保する