# CLI Codex向け: アクセス解析タグ再実装・検証指示書

## この作業の目的

独自ドメイン `https://yamamoto-mycar.com/` への移行後の本番サイトで、GA4とMicrosoft Clarityを公式推奨に近い方法で早期に読み込み、全ページを漏れなく、重複なく計測できる状態にする。

既存の独自イベント、自己アクセス除外、採用フォームの個人情報保護を維持する。単にタグを追加するだけでなく、管理画面と実際の通信の両方で動作を確認する。

## 作業開始時の指示

この文書を最後まで読んでから作業すること。

1. リポジトリと現在のブランチ、未コミット変更、直近の履歴を確認する。
2. ユーザーや別のCodexが作成した変更をリセット、破棄、上書きしない。
3. `main` へ直接変更せず、最新の `main` から作業ブランチ `chore/analytics-reinstall` を作る。
4. 公式ドキュメントの現行仕様を確認してから実装する。
5. プレビュー環境で検証し、結果を報告する。本番反映はユーザーの明示承認後に行う。

直近の関連コミット候補は `c624c86 Switch analytics stream and retire Netlify URL`。ローカルとリモートの双方に存在するか確認し、存在しなくても強制的な履歴操作はしないこと。

## 現在の確定情報

- 本番URL: `https://yamamoto-mycar.com/`
- 旧URL: `https://mycarcenter.netlify.app/`
- GA4測定ID: `G-65GV6BS65C`
- Microsoft ClarityプロジェクトID: `xh8bpqs76a`
- Search Console確認ファイル: `google45bdb2885daf7421.html`
- サイトは静的HTML中心で、Netlifyから配信される。
- `script.js` は各HTMLの `<head>` から `defer` で読み込まれる。
- `script.js` の `initMarketingAnalytics()` が `/analytics.js` を後から追加する。
- `/analytics.js` が `/analytics-config.js` を読み、GA4とClarityをさらに動的に追加する。
- この方式でも計測は可能だが、HTML解析後に複数段階で読み込まれるため、タグの開始が遅い。
- `analytics-config.js` では現在 `disableClarityOnRecruit: true` になっている。
- `?mcc_analytics=off` で同じブラウザの計測を停止し、`?mcc_analytics=on` で解除する仕組みがある。
- 旧Netlify URLから新ドメインへの301転送設定が `netlify.toml` に追加されている。実際の本番レスポンスも確認すること。

## 最初に調査するファイル

- `analytics-config.js`
- `analytics.js`
- `script.js`
- `netlify.toml`
- `recruit.html`
- ルートの `index.html`
- `used-cars/index.html`
- `column/index.html`
- `business/index.html`
- `docs/marketing-measurement-plan.md`
- `docs/operations-playbook.md`

全HTMLを最初から全文読まず、`rg` で `<head>`、`script.js`、既存タグ、フォーム、計測IDの分布を調べてから必要なファイルだけ読むこと。

## 公式情報

作業時点の最新版を確認すること。最低限、次を参照する。

- Google tag設置:
  https://developers.google.com/tag-platform/gtagjs
- Google tagの設定とイベント:
  https://developers.google.com/tag-platform/gtagjs/configure
- GA4内部トラフィック除外:
  https://support.google.com/analytics/answer/10104470
- Clarity手動設置:
  https://learn.microsoft.com/clarity/setup-and-installation/clarity-setup
- Clarity APIとマスキング:
  https://learn.microsoft.com/clarity/setup-and-installation/clarity-api
- ClarityのIPブロック、Consent、Privacy関連:
  https://learn.microsoft.com/clarity/setup-and-installation/
- Netlify設定:
  https://docs.netlify.com/manage/routing/redirects/redirect-options/

GoogleはGoogle tagを各ページの開始側の `<head>` に置くよう案内している。Clarityも `<head>` 内への設置を案内している。

## 推奨する実装方針

### 1. 計測の起動処理とイベント処理を分離する

既存の多段後読みを整理する。

- GA4とClarityのキュー作成および外部タグ読み込みは、ページの `<head>` の早い位置で開始する。
- クリック、スクロール、表示到達などDOMを必要とする独自イベントは、既存の `analytics.js` 側に残す。
- GA4の `page_view` は1ページ表示につき1回だけ送る。
- GA4、Clarityとも外部スクリプトを1回だけ読み込む。
- IDと有効化設定の管理場所を1か所にする。
- 51前後あるHTMLへIDを直接複製しない。

静的HTMLの保守性を優先し、次の構成を第一候補として検討する。

1. `/analytics-head.js` のような小さな共通ブートストラップを作る。
2. 全HTMLの開始側の `<head>` から、この共通ファイルを読み込む。
3. このファイルがGA4とClarityのキューを即時作成し、公式外部スクリプトを非同期読み込みする。
4. `analytics.js` から外部タグの重複読み込み処理を除き、独自イベント登録に専念させる。

ただし、公式仕様や現在のサイト構造を確認した結果、より安全で保守しやすい方式があれば理由を説明して採用してよい。

### 2. 本番ドメインだけを計測する

原則として次だけを本番計測対象にする。

- `yamamoto-mycar.com`
- `www.yamamoto-mycar.com` を実際に利用する場合のみ追加

次はGA4とClarityのどちらにも送信しない。

- `localhost`
- `127.0.0.1`
- `file:`
- `deploy-preview-*--mycarcenter.netlify.app`
- ブランチデプロイ
- その他の開発用ホスト

旧 `mycarcenter.netlify.app` はHTMLを表示せず301転送するため、旧ホスト側でタグを発火させない。

### 3. GA4

- 測定IDは `G-65GV6BS65C` を使用する。
- 旧ID `G-ZR46K2ME6D` がコード、HTML、Netlify設定に残っていないことを確認する。
- `gtag('config', 'G-65GV6BS65C')` を重複実行しない。
- 拡張計測との重複を確認する。特に `scroll` と独自 `scroll_depth` は別イベントとして意図を明確にする。
- 既存イベント名を不用意に変更しない。
- イベントパラメータにメールアドレス、電話番号、氏名、フォーム入力値を送らない。

維持する主なイベント:

- `phone_click`
- `goo_net_click`
- `cta_click`
- `article_card_click`
- `recruit_link_click`
- `recruit_form_submit_start`
- `recruit_form_submit_success`
- `recruit_form_submit_error`
- `scroll_depth`
- `recruit_entry_view`
- `sales_section_view`
- `column_section_view`
- `used_car_stock_view`

GA4管理画面では少なくとも次をキーイベント候補として確認する。

- `phone_click`
- `recruit_form_submit_success`

`goo_net_click` は問い合わせに近い重要行動だが、キーイベントにするかは既存レポート設計を確認して決める。

### 4. Microsoft Clarity

- プロジェクトIDは `xh8bpqs76a`。
- Clarity管理画面で対象URLが `https://yamamoto-mycar.com/` になっているか確認する。
- 旧ドメイン用プロジェクトをそのまま使うか、新規プロジェクトに分けるかは、Microsoft公式仕様と管理画面を確認して判断する。
- 同じサイトのドメイン移行として既存プロジェクトのURL更新で履歴を維持できるなら、その方法を優先する。
- 新規プロジェクトが必要な場合は、新しいプロジェクトIDをコードへ反映する前にユーザーへ報告する。

採用ページもUX改善に重要なので、Clarity対象に含める方向で実装する。ただし次を必須とする。

- 応募フォーム全体へ `data-clarity-mask="true"` を付ける。
- 氏名、カナ、メール、電話、年齢、メッセージ、送信結果を録画で読めないようにする。
- Microsoftの標準マスキングだけに頼らず、フォームと個人情報表示領域を明示的にマスクする。
- プレビューまたはテスト送信後、Clarity録画で入力内容が見えないことを実際に確認する。
- マスキング確認ができない場合は、採用ページでのClarity有効化を保留し、その理由を報告する。

### 5. 自己アクセス除外

既存の次の仕組みを維持する。

- `https://yamamoto-mycar.com/?mcc_analytics=off`
- `https://yamamoto-mycar.com/?mcc_analytics=on`

`off` を一度開いたブラウザでは、ローカルストレージによりGA4とClarityの両方を停止する。停止時に外部タグ自体を読み込まないこと。

加えて管理画面側も設定する。

- GA4: 公開IPを「内部トラフィック」として定義する。
- 最初はデータフィルタを `Testing` にする。
- 24〜36時間程度確認後、問題なければ `Active` にする。
- Clarity: SettingsのIP blockingへ公開IPを登録する。

`192.168.11.10` は家庭内LANのプライベートIPなので、GA4やClarityの管理画面には登録しない。CLIから現在の公開IPを確認できるが、動的IPの可能性をユーザーへ説明すること。

### 6. Google Tag Manager

今回は原則導入しない。

理由:

- 現在はGA4とClarityの2種類が中心で、コード側に独自イベント実装がある。
- GTMを途中追加するとGA4やClarityの二重発火が起きやすい。
- GTMコンテナIDが未確定。

将来、広告タグや複数媒体を非エンジニアが頻繁に追加する段階になったら再検討する。導入する場合は、直書きタグを先に整理して二重発火を防ぐ移行計画を提示する。

### 7. プライバシー表示

現状は採用フォーム内に「個人情報の取扱い」があるが、サイト全体のGA4・Clarity利用を説明する公開ページまたは明確な記載が不足している可能性がある。

次を確認し、不足していれば実装案を提示する。

- GA4とClarityを利用していること
- Cookie等を用いてアクセス情報を取得すること
- 利用目的がサイト改善と問い合わせ導線の改善であること
- 個人を直接特定するフォーム入力値を分析イベントへ送らないこと
- 各サービス提供者のプライバシー情報へのリンク
- 計測停止方法

法的断定や独自の法解釈はせず、一般的な開示として作成する。公開前にユーザー確認を取る。

## 実装時の注意

- すべてのHTMLで同じタグが1回だけ読み込まれるよう、機械的な検査スクリプトを用意する。
- HTMLを一括変更する場合も、意図しない本文・改行・文字コード変更を避ける。
- 既存の電話ポップアップ、Goo-net、フォーム、ページネーション、共通ヘッダーを壊さない。
- Search Console確認ファイルを削除しない。
- Clarity IDとGA4測定IDは公開識別子であり、秘密鍵ではない。Measurement Protocol API secretなどの秘密情報はリポジトリへ保存しない。
- GA4のカスタムイベントをクライアント側から送るためにMeasurement Protocol API secretは不要。
- CSPを追加・変更する場合は、GA4、Clarity、Netlify Functions、Goo-net画像取得など既存通信を壊さないこと。

## 必須検証

### 静的検査

- 全HTMLが共通の計測ブートストラップを参照している。
- GA4新IDが1か所の設定だけに存在する。
- 旧GA4 IDが残っていない。
- Clarity IDが1か所の設定だけに存在する。
- `script.js`、`analytics.js`、新規JSの構文チェックに通る。
- `git diff --check` に通る。
- `netlify.toml` をパースできる。
- JSON-LDとsitemap.xmlを壊していない。

### ブラウザ検証

最低限、次のページをPC幅とスマホ幅で開く。

- `/`
- `/used-cars/`
- `/repair-maintenance/`
- `/column/`
- 任意のコラム記事
- `/business/`
- `/recruit`

本番相当ホストで次を確認する。

- `googletagmanager.com/gtag/js?id=G-65GV6BS65C` が1回だけ読み込まれる。
- GA4の収集リクエストが送信される。
- `clarity.ms/tag/xh8bpqs76a` が1回だけ読み込まれる。
- `clarity.ms/collect` が送信される。
- Consoleにエラーがない。
- 1回の表示で `page_view` が重複しない。
- 電話ボタンで `phone_click` が1回送信される。
- Goo-netリンクで `goo_net_click` が1回送信される。
- CTAで `cta_click` が1回送信される。
- 採用フォームの成功・失敗イベントが正しく区別される。
- 採用フォームの入力値がGA4リクエストやClarity録画に含まれない。

開発・プレビュー環境では次を確認する。

- GA4とClarityの外部タグが読み込まれない。
- サイト機能には影響しない。

オプトアウトも確認する。

1. `?mcc_analytics=off` を開く。
2. ページを再読込する。
3. GA4とClarityの通信がないことを確認する。
4. `?mcc_analytics=on` を開く。
5. 再読込後に通信が復帰することを確認する。

### 管理画面検証

- Google Tag Assistantで `G-65GV6BS65C` が検出される。
- GA4リアルタイムまたはDebugViewにテストアクセスが出る。
- GA4に旧IDとの二重送信がない。
- ClarityのLive usersまたは録画にテストアクセスが出る。
- Clarity録画で採用フォームの値がマスクされる。
- GA4キーイベント設定を確認する。
- 内部トラフィック除外は最初にTestingで確認する。

## ドメイン移行の確認

以下を実際のHTTPレスポンスで確認する。

- `https://mycarcenter.netlify.app/`
  → `https://yamamoto-mycar.com/` へ301
- `https://mycarcenter.netlify.app/used-cars/`
  → `https://yamamoto-mycar.com/used-cars/` へ301
- クエリ文字列が必要に応じて維持される。
- 新ドメイン側のcanonical、sitemap、robots.txtが新ドメインを参照する。
- Search Consoleでは新ドメインのプロパティとsitemapを確認する。
- 旧Search Consoleプロパティは移行確認のため当面削除しない。

## 完了時の報告形式

次の順番で簡潔に報告する。

1. 調査で見つかった問題
2. 採用したタグ構成と、その理由
3. 変更ファイル
4. GA4・Clarity・採用フォーム保護の検証結果
5. プレビューURL
6. 管理画面でユーザー操作が必要な項目
7. 本番反映後に確認する項目

検証に失敗した項目を「問題なし」と扱わない。未確認事項は未確認と明記する。

## CLI Codexへの実行メッセージ

CLIでこのリポジトリのルートへ移動し、次の内容で開始する。

```text
docs/cli-analytics-reimplementation.md を最後まで読み、記載された順序と制約に従って、GA4・Microsoft Clarityの現状調査、公式推奨との比較、再実装、プレビュー検証まで進めてください。既存変更を破棄せず、mainへ直接変更せず、作業ブランチを作成してください。本番デプロイは私の承認を待ってください。
```
