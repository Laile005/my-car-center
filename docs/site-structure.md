# サイト構造

## 公開URL

- 本番: `https://yamamoto-mycar.com/`
- Netlify既定URL: `https://mycarcenter.netlify.app/`（独自ドメインへ転送）
- GitHub: `Laile005/my-car-center`
- Netlify publish directory: リポジトリ直下

## 主要ファイル

- `index.html`
  - 企業トップ。
  - サービス、車を買う、お役立ち情報、よくある質問、作業の流れ、施工事例、会社案内を持つ。

- `recruit.html`
  - 採用トップ。
  - 採用フォームはGASへ送信する。

- `styles.css`
  - メインサイト共通CSS。
  - サービスページ、コラム、カード、電話モーダルなどもここで管理。

- `recruit.css`
  - 採用ページ専用CSS。

- `script.js`
  - メニュー、フォーム送信、Goo-net在庫表示、電話モーダル、クリック可能カードなど。

- `analytics-config.js`
  - GA4 ID、Clarity ID、計測ON/OFF設定。

- `analytics.js`
  - GA4 / Clarity 読み込み、イベント送信、CTA計測、スクロール計測、表示セクション計測。
  - 一部トップページのカード差し替えも担当しているため、単純に削除しない。

- `sitemap.xml`
  - Search Console向けサイトマップ。
  - 記事やページを増やしたら更新する。

- `robots.txt`
  - 検索エンジンとLLMクローラー向け設定。
  - `analytics-optout/` は検索に出さない。

- `llms.txt` / `llms-full.txt`
  - LLM向け補助ファイル。
  - 重要ページやサービス内容をまとめている。

## 主要ページ

### メインページ

- `/`
  - 企業トップ。

- `/bankin-toso/`
  - 板金塗装・キズへこみ修理。

- `/repair-maintenance/`
  - 修理・整備・車検相談の入口ページ。
  - 板金塗装、保険修理、車検、点検、日常メンテナンスへつなぐ。

- `/shaken/`
  - 車検・整備。

- `/maintenance/`
  - オイル交換・タイヤ・日常メンテナンス。

- `/used-cars/`
  - 中古車探し・新車購入相談。
  - 現在は中古車問い合わせが重要なので、掲載在庫より「条件から探す相談」を主役にしている。

- `/new-cars/`
  - 新車相談・国内全メーカー対応。
  - 新車は優先度低めだが、国内全メーカー対応を明記する受け皿ページ。

- `/business/`
  - 法人向け車両整備・中古車調達。
  - 中古車販売前の修理・仕上げ、社用車の点検整備、営業車の中古車調達、引き取り・納車を案内する。
  - ヘッダーでは「法人のお客様」と表示する。

- `/company-guide/`
  - 会社・サービス早見表。

- `/column/`
  - 顧客向けお役立ち情報。
  - 板金塗装、保険修理、中古車、車検、メンテナンスの記事を掲載。

- `/recruit`
  - 採用トップ。

- `/recruit-column/`
  - 採用向け記事。
  - 採用トップから導線を出す。

- `/analytics-optout/`
  - 自社アクセスをGA4/Clarityから除外するための管理用ページ。
  - `noindex, nofollow` で、robotsにも除外を明記。

- `/partner-repair-preview/`
  - 旧社内確認用URL。
  - 正式公開後は `/business/` へ301リダイレクトする。

## Netlify Functions

- `netlify/functions/goo-stock.js`
  - Goo-netの在庫ページを取得し、最大3台をJSONで返す。
  - 詳細ページも取得し、画像、年式、走行距離、価格情報を補完する。
  - 24時間のメモリキャッシュと、Netlify CDNの `stale-while-revalidate` を使う。

- `netlify/functions/inventory-feed.js`
  - `goo-stock.js` の別名エンドポイント。

- `netlify/functions/warm-goo-stock.mjs`
  - 1日1回、Goo-net在庫取得関数を起こしてキャッシュを温める。

## 中古車在庫表示の考え方

- Goo-netには公式APIがないため、Netlify Functionでページを取得して表示している。
- 取得に失敗した場合、ダミーの3台を表示しない。
- 取得できない時も「掲載在庫は変動します」「条件から探せます」という相談導線を残す。
- 在庫表示は問い合わせのきっかけであり、主役は「掲載外の車も条件から探せる」こと。

## ヘッダーの考え方

- メインサイト用ヘッダーと採用用ヘッダーの2種類だけにする。
- メインサイト内でページごとにメニュー構造をバラバラにしない。
- メインサイトの順番は、おおむねページ構成順にする。
- 採用ページでは求職者向け導線を優先する。
- 現在は `script.js` の `initSharedHeader()` で共通ヘッダーを生成する。
- 静的HTML内のヘッダーが古くても、表示時にはJavaScriptで統一される。

## 電話導線

- スマホでは `tel:0849761000` を使う。
- PCでは電話アプリ起動より、電話番号を大きく表示するモーダルを出す。
- 「Zoom」「オンライン面談」は使わない。電話を主導線にする。

## 計測除外

本番反映後、社内PCや確認用スマホでは次を開く。

`https://yamamoto-mycar.com/analytics-optout/`

「このブラウザを計測しない」を押すと、そのブラウザではGA4とClarityを読み込まない。

ローカルIP `192.168.x.x` はGA4/ClarityのIP除外には使えない。管理画面でIP除外する場合はグローバルIPが必要。
