# 美輝 Miki Piano

## プロジェクト概要

美輝 Miki Piano の公式Webサイト。

- 本番URL：`https://miki-piano.com/`
- Repository：`ayusika/AI_Development_Environment`
- サイト本体：`200_Miki_Piano/site/`
- ローカル作業場所：`/Users/ayukawa/Documents/AI_Development_Environment`
- 本番サーバー：Lolipop
- 本番Webルート：`/home/users/2/her.jp-mikipiano/web/miki-piano.com`
- SSH接続：`ssh mikipiano`

2026-09-13 時点で、新サイトへの本番切替は完了済み。

---

# 現在の状態

## 本番公開

新しい静的HTMLサイトを `https://miki-piano.com/` で公開済み。

旧WordPressは本番表示から撤去済み。
WordPress関連バックアップはサーバー側のバックアップ領域へ保存済み。

サーバー公開領域も整理済みで、不要な旧ファイルや初期 `welcome.html` などは公開領域から退避済み。

---

# 現在の主要ページ

- `/`
  - トップページ
- `/story.html`
  - 「私の想い」
- `/adult-beginner.html`
  - 大人の初心者向けオンラインピアノレッスン
- `/privacy-policy.html`
  - プライバシーポリシー

サイトマップ：

- `/sitemap.xml`

robots：

- `/robots.txt`

---

# デザイン方針

全体は、落ち着いた北欧・エディトリアル寄りの雰囲気。

主な方針：

- カードUIを使いすぎない
- 文章と余白を大切にする
- 柔らかいグリーン系を基調にする
- ピアノ教室らしさは残しつつ、古典的すぎない印象
- PC / スマートフォン両方で読みやすくする
- 「私の想い」はトップに詰め込まず独立ページとして扱う

---

# 講師・レッスン情報

講師：

- 鮎川美輝
- ピアノ講師
- 指導歴30年以上
- 3歳児グループレッスン経験あり
- 幼児から80歳代まで指導
- 音楽科 ピアノ専攻卒業
- 中学校二種免許（音楽）

対応内容：

- クラシック
- ポップス
- コード奏法
- アレンジ
- 保育士試験対策
- 学校の伴奏

オンラインレッスン：

- Zoom使用
- ピアノ / 電子ピアノ / キーボードで受講可能
- スマートフォン / タブレット / PCから参加可能

---

# 料金

## ポピュラーコース

- 月3回
- 1回30分
- 月額12,000円

## クラシックコース

- 月3回 / 1回40分 / 月額10,000円
- 月2回 / 1回45分 / 月額8,000円
- 月1回 / 1回50分 / 月額5,000円

その他：

- 入会金なし
- 教材費は必要に応じて数千円程度
- 無料体験レッスン30分

---

# お問い合わせフォーム

本番フォームは稼働済み。

- Lolipop SMTPを使用
- 管理者通知メールあり
- お客様への自動返信あり
- BCC設定あり
- DKIM / SPF / DMARC設定済み
- SMTPパスワードなどの秘密情報はGitHubへ保存しない
- 秘密情報はLolipopサーバー側のみで管理する

---

# SEO / AEO / GEO

## 完了済み

- canonical設定
- title / meta description設定
- OGP設定
- Twitter Card設定
- favicon設定
- `robots.txt`
- `sitemap.xml`
- JSON-LD構造化データ
- WebSite
- EducationalOrganization
- Person
- Service
- WebPage
- ProfilePage
- BreadcrumbList
- Google Search Console登録
- DNSによる所有権確認
- sitemap送信
- トップページのインデックス確認
- `story.html` インデックス登録リクエスト
- `adult-beginner.html` インデックス登録リクエスト
- Schema.org Validator確認
- Google Rich Results Test確認

---

# パフォーマンス

2026-09-13 時点のPageSpeed Insights モバイル計測：

- Performance：99
- Accessibility：97
- Best Practices：100
- SEO：100

主な計測値：

- FCP：約1.2秒
- LCP：約1.8秒
- TBT：0ms
- CLS：0

オンラインレッスン画像：

- 元：約1.6MB
- 最適化後：約189KB
- 1536 × 1024
- `loading="lazy"`
- `decoding="async"`
- `width` / `height` 指定済み

---

# Search Console

Google Search Console の Domain Property：

`miki-piano.com`

`sitemap.xml` は送信済み。

新規ページを追加した場合は：

1. sitemap.xmlへ追加
2. 本番反映
3. Search Consoleの「URL検査」
4. インデックス登録をリクエスト

サイトマップ自体は毎回再送する必要はない。

---

# デプロイ方針

基本手順：

1. GitHub正本を確認
2. ローカルで編集
3. `git diff --check`
4. 差分確認
5. commit
6. push
7. SSHでLolipopへ接続
8. 本番ファイルをバックアップ
9. GitHub Rawから本番へ反映
10. chmod確認
11. HTTP確認
12. ブラウザで表示確認

重要：

- 推測だけでコードを編集しない
- 編集前にGitHubの現在の正本を確認する
- 本番反映前にバックアップを取る
- 秘密情報をGitHubへ保存しない

---

# 今後やること

優先度は高くない。
必要になった時に再開する。

## 1. Search Consoleの経過観察

今後、検索データが蓄積されたら確認する。

見るもの：

- 検索クエリ
- 表示回数
- クリック数
- CTR
- 平均掲載順位
- インデックス状況
- sitemapの検出ページ数

`adult-beginner.html` を追加したため、
sitemapの検出ページ数が将来的に 3 → 4 へ更新されるか確認する。

---

## 2. Accessibility 97 → 100 の調査

PageSpeed Insightsで残っているアクセシビリティ項目を確認する。

急ぎではない。

---

## 3. 残り画像の width / height 整備

必要に応じて以下を確認する。

- ヘッダーロゴ
- ヒーロー画像
- 講師画像
- 認定証
- storyページ画像
- その他画像

CLSは現在0のため、優先度は低め。

---

## 4. オンラインレッスン案内ページ

将来的な追加候補。

内容候補：

- オンラインレッスンとは
- 必要な機材
- Zoomについて
- ピアノ / 電子ピアノ / キーボード
- スマートフォン / タブレット / PC
- レッスン開始までの流れ
- 初めてオンラインレッスンを受ける方向けFAQ

AEO / GEO / SEO向けの検索入口として利用可能。

---

## 5. 保育士試験対策ページ

追加候補だが、現時点では保留。

理由：

「保育士試験対策に対応できる」ことは確定しているが、
具体的にどこまで対応するかが未確定。

専用ページを作る前に講師へ確認する。

確認候補：

- ピアノ実技
- 課題曲
- 楽譜の読み方
- 伴奏
- 初心者への対応範囲
- 試験直前対策
- その他対応可能な内容

内容確認後に作成する。

---

## 6. Bing Webmaster Tools

必要になれば登録する。

Google Search Consoleを優先しているため、
現時点では必須ではない。

---

## 7. 検索流入ページの追加

Search Consoleで実際の検索クエリが溜まってから判断する。

先にページを量産せず、
実際に検索されている言葉を見て追加する方針。

候補例：

- 大人の初心者
- ピアノ再開
- オンラインピアノ
- コード奏法
- 学校の伴奏
- 保育士試験対策

---

# 再開時の最初の確認

このプロジェクトを再開する時は、まず以下を行う。

1. `200_Miki_Piano/README.md` を読む
2. GitHubの最新commitを確認する
3. `200_Miki_Piano/site/` の現在の正本を確認する
4. 本番 `https://miki-piano.com/` の状態を確認する
5. Search Consoleの新しいデータがあれば確認する
6. このREADMEの「今後やること」から次の作業を選ぶ

過去チャットや記憶だけを根拠にコード変更しない。

---

# Save Point

**2026-09-13**

美輝 Miki Piano の新サイト制作、本番公開、フォーム、
SEO基盤、Search Console、構造化データ、
大人の初心者向け検索ページまで完了。

この時点で大きな必須作業はなし。

次回は運用・検索データを見ながら改善フェーズへ進む。
