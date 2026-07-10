# 運用手順

## デプロイ

通常は `main` にpushするとNetlifyで本番デプロイされる。

Codexデスクトップ環境から外部通信や `git push` が詰まる場合があるため、最後のpushはユーザーのPowerShellで行うことが多い。

```powershell
cd "C:\Users\ko0v0\Documents\Codex\2026-07-04\https-mycarcenter-netlify-app\work\my-car-center"
git -c http.sslBackend=openssl push origin main
```

## 作業前の確認

```powershell
cd "C:\Users\ko0v0\Documents\Codex\2026-07-04\https-mycarcenter-netlify-app\work\my-car-center"
git status -sb
git pull origin main
```

競合が出た場合は、未解決のままpushしない。

## 本番反映後の確認

- トップページが表示される
- `https://yamamoto-mycar.com/` がHTTPSで表示される
- `www`とNetlify既定URLが独自ドメインへ転送される
- `/used-cars/` が表示される
- Goo-net在庫カードが表示される、または取得失敗時も相談導線が崩れない
- `/column/` と記事が表示される
- `/recruit` のフォームが表示される
- 電話ボタンがスマホでは電話、PCでは番号表示になる
- Search Consoleでサイトマップが読める

独自ドメイン移行後は、Search Consoleに `yamamoto-mycar.com` のドメインプロパティを追加し、
`https://yamamoto-mycar.com/sitemap.xml` を送信する。GA4とClarityは同じ測定IDを継続利用する。

## 自社アクセスを計測から除外する

本番反映後、確認に使うPC・スマホで次を開く。

`https://yamamoto-mycar.com/analytics-optout/`

「このブラウザを計測しない」を押す。

これでGA4とClarityのタグ自体が読み込まれない。

戻す場合は同じページで「計測対象に戻す」を押す。

## GA4で見るイベント

- `phone_click`: 電話リンククリック
- `goo_net_click`: Goo-net遷移
- `cta_click`: CTAクリック
- `article_card_click`: 記事カードクリック
- `used_car_stock_view`: 中古車在庫セクション表示
- `sales_section_view`: 車を買うセクション表示
- `column_section_view`: コラムセクション表示
- `recruit_form_submit_start`: 採用フォーム送信開始
- `recruit_form_submit_success`: 採用フォーム送信成功
- `recruit_form_submit_error`: 採用フォーム送信エラー

## 週次レポート

GA4とClarityの週次レポートは [marketing-reporting.md](./marketing-reporting.md) の手順で実行する。

ClarityはData Export APIの仕様上、1回の取得で直近72時間までしか取れない。週次では最新スナップショットを残して、前回分と比較する運用にする。

キーイベント候補:

- `phone_click`
- `goo_net_click`
- `recruit_form_submit_success`
- `used_car_stock_view`

## Search Console

Search Consoleで検索キーワードを確認できる。

GA4だけでは検索キーワードは基本的にわからない。

見るべきもの:

- 表示回数
- クリック数
- CTR
- 平均掲載順位
- クエリ
- ページ

## Clarity

見るべきもの:

- スマホで押しにくい場所
- デッドクリック
- どこまでスクロールされているか
- Goo-netリンクや電話導線の前で迷っていないか

採用ページもClarityの対象とする。応募フォームと送信結果には
`data-clarity-mask="true"` を付けているため、変更時に属性を削除しない。
本番反映後はテスト送信を行い、録画で氏名、カナ、メール、電話、年齢、
メッセージ、送信結果が読めないことを確認する。

## 記事追加時の手順

1. `column/` または `recruit-column/` に記事フォルダを作る
2. `index.html` を作る
3. `column/index.html` または採用ページ側の一覧にカードを追加
4. 関連サービスページに記事カードを追加する
5. `sitemap.xml` にURLを追加する
6. `llms.txt` / `llms-full.txt` を必要に応じて更新する
7. 表示確認

記事内の基本構成:

- 読者の疑問をタイトルにする
- 冒頭で短く要点を言う
- 理由を説明する
- 具体的な確認ポイントを書く
- 最後に山本マイカーセンターへ相談できることを書く

本文上の見出しは自然にする。機械的に「質問→結論→理由」と見せすぎない。

## 中古車在庫が崩れた時

確認するファイル:

- `netlify/functions/goo-stock.js`
- `used-cars/index.html`
- `script.js`

よくある原因:

- Goo-netのHTML構造変更
- Goo-net側の画像URL仕様変更
- Netlify Functionのタイムアウト
- キャッシュが古い

方針:

- 取得できない時に固定車両を表示しない
- 相談導線が残っていればOK
- 価格や年式が取れない場合は空欄にして、無理に仮値を出さない

## 採用フォーム

採用フォームはGASへ送信する。

GASの注意:

- コード更新後はWebアプリを再デプロイする
- 初回はSpreadsheetAppとMailAppの権限承認が必要
- メール送信とスプレッドシート保存の両方を見る
- GASのレスポンス仕様により、サイト側で通常のfetchのように扱うとエラーっぽく見える場合がある

GAS改善案は [gas-doPost-improved.js](./gas-doPost-improved.js) を参照。
