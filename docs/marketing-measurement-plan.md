# マーケティング計測・運用メモ

## 目的

広告費をかけずに、山本マイカーセンターのサイト改善を数字で判断できる状態にする。

見るべき数字はPVだけではなく、問い合わせに近い行動を中心にする。

## 入れるツール

- Google Search Console: 検索キーワード、表示回数、クリック、掲載順位、インデックス状況を見る。
- Google Analytics 4: ページ閲覧、電話クリック、Goo-net遷移、採用フォーム送信開始/成功、CTAクリック、スクロール到達率を見る。
- Microsoft Clarity: ヒートマップと録画で、どこを読まれているか、どこで迷っているかを見る。採用ページも対象とし、応募フォームと送信結果は明示的にマスクする。

## サイト側の設定

`analytics-head.js` の設定オブジェクトにIDを入れる。このファイルは本番ドメインでのみGA4とClarityを起動し、`analytics.js` は独自イベントだけを担当する。

```js
window.MCC_ANALYTICS = {
  ga4Id: 'G-XXXXXXXXXX',
  clarityId: 'xxxxxxxxxx',
  enableScrollDepth: true,
  enableCtaTracking: true,
  enableVisibilityTracking: true
};
```

採用フォームと送信結果には `data-clarity-mask="true"` を付け、録画へ入力値を送信しない。

## GA4で見るイベント

- `phone_click`: 電話リンクが押された
- `goo_net_click`: Goo-netへ遷移した
- `cta_click`: CTAボタンが押された
- `recruit_link_click`: 採用導線が押された
- `recruit_form_submit_start`: 採用フォーム送信が開始された
- `recruit_form_submit_success`: 採用フォーム送信が成功した
- `recruit_form_submit_error`: 採用フォーム送信でエラー応答を受けた
- `scroll_depth`: 25%、50%、75%、90%到達

## 月次で見ること

1. Search Console
   - どの検索語で表示されているか
   - クリック率が低いページはタイトル・説明文を直す
   - 掲載順位が10位前後の記事は追記して上げる

2. GA4
   - 電話クリックが多いページ
   - Goo-net遷移が多いページ
   - 採用フォーム開始と成功の差
   - よく読まれている記事

3. Clarity
   - ファーストビューで迷っていないか
   - 電話・問い合わせ導線までスクロールされているか
   - スマホで押しにくい要素がないか

## 改善判断

- 表示回数が多いがクリックが少ない: タイトルとdescriptionを改善
- 閲覧は多いが電話が少ない: CTA位置、文言、電話導線を改善
- 記事は読まれるがサービスページへ移動しない: 記事内リンクを追加
- 採用フォーム開始は多いが成功が少ない: 入力項目、エラー表示、GAS応答を確認
- Goo-net遷移が多い: 中古車ページの需要あり。中古車関連記事を増やす

## まず欲しい初期設定

- GA4測定ID
- Search Consoleの所有権確認
- Microsoft ClarityプロジェクトID
- Googleビジネスプロフィールの管理権限
