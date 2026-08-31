# Koppy Writer

Koppy World から分離した GitHub Writer 専用画面。

## 役割

- GitHub 正本への変更Proposal作成
- 変更内容の確認
- 手動承認後のみGitHubへ保存
- Exact Matchによる安全な部分置換
- 認証Session切れ時の再ログイン案内

## 構成

- `index.html`
  - Writer専用UI
- `../assets/css/writer.css`
  - Writer専用レイアウト
- `../assets/js/writer.js`
  - Writer処理
- `../assets/js/auth.js`
  - 共通GitHub認証

## 運用

WriterはAIではない。

GitHub正本を確認したうえで、
File Edit Protocolに従った指示だけを実行する。

新規作成・追記・全文置換・部分置換を扱い、
部分置換ではExact Matchが1件のときだけ変更する。

## Self Test

Koppy Writer専用画面からのGitHub書き込み動作を確認済み。