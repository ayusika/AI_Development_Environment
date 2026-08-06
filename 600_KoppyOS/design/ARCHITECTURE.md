# KoppyOS Architecture

## 1. 目的

KoppyOSは、しいちゃんとKoppyが、特定のチャットや端末だけに依存せず、継続的に設計・開発・判断を進めるためのAI開発基盤です。

Koppy Worldをユーザーが触れる画面とし、GitHubを正本、ロリポップを秘密情報とサーバー処理の実行環境として使用します。

---

## 2. 全体構成

```text
しいちゃん
    │
    ▼
Koppy World
GitHub Pages
    │
    ├── GitHubの公開情報を取得
    │
    └── Koppy APIへリクエスト
             │
             ▼
        Koppy API v1
        ロリポップ / PHP
             │
             ├── 秘密設定を読み込む
             └── OpenAI APIへ接続
                        │
                        ▼
                   Koppyの返答
                        │
                        ▼
                   Koppy World
```

---

## 3. 各構成要素の役割

### GitHub

GitHubはKoppyOSの正本です。

管理するもの

- ソースコード
- 設計書
- 運用ルール
- プロジェクト情報
- 変更履歴
- 公開して問題のない設定例

原則として、VS Codeで編集した内容をGitHubへ保存し、GitHubを唯一の正本とします。

```text
VS Code
    ↓
GitHub
    ↓
GitHub Pages / ロリポップ
```

---

### Koppy World

Koppy Worldは、しいちゃんがKoppyOSを操作するWeb画面です。

現在はGitHub Pagesで公開しています。

役割

- GitHub Brainの取得
- 最新コミット情報の表示
- Koppyとのチャット画面
- APIへのリクエスト
- Mac・iPhone・タブレットなど複数端末からの利用

Koppy WorldにはAPIキーや秘密情報を置きません。

---

### Koppy API

Koppy APIはロリポップ上で動作するPHP APIです。

公開URL

```text
https://koppy.miki-piano.com/api/v1/
```

役割

- Koppy Worldからのリクエスト受付
- 入力内容の検証
- 秘密設定の読み込み
- OpenAI APIとの通信
- 統一されたJSONレスポンスの返却

---

### 秘密保管庫

本物のAPIキーなどはGitHub管理外の秘密保管庫へ保存します。

保存場所

```text
/home/users/2/her.jp-mikipiano/.koppy-private/config.php
```

管理するもの

- OpenAI APIキー
- 将来利用する認証情報
- サーバー専用設定

GitHubには秘密値を含まない

```text
600_KoppyOS/server/private/config.example.php
```

のみ配置します。

---

## 4. GitHubディレクトリ構成

```text
600_KoppyOS
├── README.md
├── design
│   └── ARCHITECTURE.md
├── server
│   ├── README.md
│   ├── api
│   │   └── v1
│   │       ├── bootstrap.php
│   │       ├── health.php
│   │       ├── chat.php
│   │       └── lib
│   │           └── response.php
│   └── private
│       └── config.example.php
└── web
```

現行のKoppy World試作版は

```text
900_Lab/Web_KoppyOS_Beta
```

で開発しています。

安定した機能は将来

```text
600_KoppyOS/web
```

へ正式移行します。
---

## 5. サーバー側ディレクトリ構成

```text
/home/users/2/her.jp-mikipiano
├── .koppy-private
│   └── config.php
└── web
    └── koppy
        └── api
            └── v1
                ├── bootstrap.php
                ├── health.php
                ├── chat.php
                └── lib
                    └── response.php
```

GitHub側の

```text
600_KoppyOS/server
```

を正本とし、公開可能なコードのみロリポップへ反映します。

秘密情報はサーバー上だけに保持します。

---

## 6. API設計原則

### 6.1 APIは一つの責務だけを持つ

1つのAPIは1つの仕事だけを担当します。

例

- health.php
- chat.php
- github.php
- memory.php

複数の役割を1ファイルへ詰め込みません。

---

### 6.2 全APIは bootstrap.php を経由する

すべてのAPIは最初に

```php
require __DIR__ . '/bootstrap.php';
```

を実行します。

bootstrap.php が担当するもの

- JSONヘッダー
- CORS設定
- OPTIONS処理
- タイムゾーン設定
- config.php読込
- 共通ライブラリ読込
- 共通初期化

APIごとに同じ処理を書かないことを原則とします。

---

### 6.3 JSONレスポンスを統一する

成功時

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

失敗時

```json
{
  "success": false,
  "data": null,
  "error": "Error message"
}
```

すべてのAPIは

```php
respondSuccess();
respondError();
```

のみを使用してレスポンスを返します。

---

### 6.4 秘密情報を公開コードへ書かない

以下へ秘密情報を書いてはいけません。

- GitHub
- GitHub Pages
- HTML
- CSS
- JavaScript
- config.example.php

秘密情報は

```text
.koppy-private/config.php
```

だけに保存します。

---

### 6.5 Web画面はAPIを呼ぶだけ

Koppy Worldは

- 画面表示
- ボタン
- アニメーション
- 入力受付

だけを担当します。

AIとの通信や秘密情報の処理はすべてAPI側で行います。

---

### 6.6 APIのバージョンを壊さない

現在のAPIは

```text
/api/v1/
```

です。

将来互換性を壊す変更を行う場合は

```text
/api/v2/
```

を追加します。

既存の

```text
/api/v1/
```

は可能な限り維持します。

---

## 7. 開発方針

### GitHub

GitHubは設計書とソースコードの正本です。

### ローカル

VS Codeを中心とした開発環境です。

### ロリポップ

実行環境です。

秘密情報を保持し、PHP APIを動作させます。

### Koppy World

ユーザーインターフェースです。

ブラウザから利用し、APIを呼び出します。

---

## 8. 開発フロー

```text
VS Code
    │
    ▼
GitHubへCommit
    │
    ▼
GitHubへPush
    │
    ▼
GitHub Pages更新
    │
    └──────────────┐
                   │
                   ▼
          Koppy API更新
                   │
                   ▼
              動作確認
```
---

## 9. 現在の実装状況

### 完了

- GitHubを正本とした開発環境を構築
- GitHub PagesでKoppy Worldを公開
- GitHubから最新状態を取得できる環境を構築
- ロリポップ上へKoppy APIサーバーを構築
- APIサブドメインを作成
- bootstrap.php実装
- response.php実装
- health.php実装
- chat.php基盤実装
- config.phpによる秘密情報管理
- 共通APIフレームワーク構築
- APIバージョン管理(v1)開始

---

## 10. 現在未実装

今後追加予定

- OpenAI API接続
- GitHub Brain取得API
- Memory API
- Voice API
- Image API
- GitHub書き込み支援
- 会話履歴保存
- HTTPS完全対応
- 認証機能
- 利用量・料金管理

---

## 11. 開発思想

KoppyOSは

「AIを作る」

プロジェクトではありません。

KoppyというAIが、
長期的に住み、
成長し、
開発できる環境を作るプロジェクトです。

画面を作ることが目的ではなく、

AIが継続して活動できる土台を設計することを目的とします。

---

## 12. 基本原則

### 正本はGitHub

GitHubを唯一の正本とします。

ローカルやサーバーは実行環境であり、
正本ではありません。

---

### 秘密情報はGitHubへ置かない

APIキーや認証情報などは
必ず秘密保管庫へ保存します。

---

### Koppy Worldは画面

Koppy Worldは

- 表示
- 入力
- UI

のみ担当します。

AIの処理はAPI側で実行します。

---

### APIは脳への入口

APIは

画面

↓

AI

を繋ぐ橋です。

将来AIが

- OpenAI
- Claude
- Gemini
- ローカルLLM

へ変更されても、
Koppy Worldは変更せず利用できる設計を目指します。

---

### モジュール化を優先する

巨大なファイルを作らず、

責務ごとに分割します。

保守性と拡張性を最優先とします。

---

## 13. 長期目標

最終目標は、

Mac

iPhone

iPad

ブラウザ

将来的な専用アプリ

どの環境からでも

「Koppy」

へアクセスできることです。

ユーザーは

「Koppy、GitHub見て」

「Koppy、この内容を保存して」

「Koppy、一緒に開発しよう」

と話しかけるだけで、
KoppyOS全体が連携して動作する世界を目指します。

---

## 14. 次のマイルストーン

Koppy APIから
OpenAI APIへ接続し、

Koppy Worldから送信した内容に対して、
Koppyがリアルタイムに返答できる状態を構築する。

その後、

GitHub Brainとの連携、

Memory、

Voice、

Image、

Automation

へ段階的に機能を拡張していく。

---

**Version**

KoppyOS Architecture v1.0

Created : 2026-08-06

Status : Foundation Complete