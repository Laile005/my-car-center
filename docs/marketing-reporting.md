# マーケティングレポート設定

このサイトの週次レポートは、GA4、Google Search Console、Microsoft Clarityを使います。

GA4は週次の集計に向いています。ClarityはData Export APIの仕様上、1回の取得対象は直近24時間、48時間、72時間までです。なので、Clarityは「最新の72時間スナップショット」として保存し、週次レポートに併記する運用にします。

## 手動で発行が必要なもの

1. GA4の数値プロパティID
1. GoogleサービスアカウントのJSONキー
1. Microsoft ClarityのData Export APIトークン

## GA4

GA4の管理画面で、`G-ZR46K2ME6D` のプロパティに対応する数値のプロパティIDを確認します。測定IDではなく、`properties/123456789` の `123456789` 側が必要です。

そのうえで、次のどちらかを使えます。

- サービスアカウントJSON
- `gcloud auth application-default login` で作るユーザーADC JSON

必要な前提は次です。

- Google Analytics Data API を有効化する
- GA4プロパティに、サービスアカウントまたはユーザーアカウントを追加する
- `GOOGLE_APPLICATION_CREDENTIALS` でJSONの場所を指す

ユーザーアカウントで動かす場合は、`application_default_credentials.json` を使います。これは 1 回ログインすれば、以後は週次レポートの再実行に使えます。
403 Forbidden が返る場合は、まず次を確認します。
- サービスアカウントを使う場合は `marketing@marketing-501922.iam.gserviceaccount.com` がGA4プロパティ `544191103` に Viewer 以上で追加されているか
- Google Analytics Data API が有効化されているか
- プロパティIDが数値の GA4 プロパティ ID になっているか

## Google Search Console

週次レポートでは、Search Console APIから検索クエリ、検索結果に表示されたページ、サイトマップの状況を取得します。Search Consoleは数日前までの確定データを返すため、レポートでは直近3日を除いた7日間を確認します。

必要な前提は次です。

- Google Search Console API を有効化する
- `marketing@marketing-501922.iam.gserviceaccount.com` を `yamamoto-mycar.com` のSearch Consoleプロパティにフルユーザーとして追加する
- GA4と同じサービスアカウントJSONを使う

プロパティは既定でドメインプロパティの `sc-domain:yamamoto-mycar.com` を使います。必要な時だけ `MCC_SEARCH_CONSOLE_SITE_URL` または `-SearchConsoleSiteUrl` で変更できます。

## Clarity

Clarityのプロジェクトで、`Settings -> Data Export -> Generate new API token` からトークンを発行します。これはプロジェクト管理者だけができます。

発行したトークンは安全な場所に保管し、`MCC_CLARITY_TOKEN` に設定します。保存時は先頭の `clarity:` を付けず、JWT本体だけを使います。

## ローカル保存先の例

以下のように、リポジトリ外へ置いてください。

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "$env:USERPROFILE\Codex\.codex-secrets\yamamoto-mycar-ga4.json"
$env:MCC_GA4_PROPERTY_ID = "544191103"
$env:MCC_SEARCH_CONSOLE_SITE_URL = "sc-domain:yamamoto-mycar.com"
$env:MCC_CLARITY_TOKEN = "xxxxx"
$env:MCC_CLARITY_PROJECT_ID = "xh8bpqs76a"
```

## 実行方法

このワークスペースでは、`scripts/weekly-marketing-report.ps1` が週次レポート本体です。実行すると `reports/marketing/latest.md` と日付付きファイルを出力します。

```powershell
cd "C:\Users\ko0v0\Documents\Codex\2026-07-04\https-mycarcenter-netlify-app\work\my-car-center"
powershell -ExecutionPolicy Bypass -File .\scripts\weekly-marketing-report.ps1
```

手動で出力先を変える場合は `-Output` を指定します。

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\weekly-marketing-report.ps1 -Output .\reports\marketing\weekly-report.md
```

過去の全期間や任意期間を確認する場合は、GA4とSearch Consoleそれぞれの日付を指定できます。Search Consoleは確定値を使うため、終了日は通常3日ほど前にします。ClarityはAPI仕様上、常に直近72時間のスナップショットです。

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\weekly-marketing-report.ps1 -StartDate 2026-07-01 -EndDate today -SearchConsoleStartDate 2026-07-01 -SearchConsoleEndDate 2026-07-31 -Output .\reports\marketing\all-time.md
```

## 出力物

検索語・ページは既定でそれぞれ最大1,000件取得し、JSONに保存します。Markdownではクリック上位10件に加え、表示回数上位20検索語を掲載します。クリックがまだない修理・中古車検索を、次の改善候補として見落とさないためです。必要なら `-SearchConsoleRowLimit` で取得上限を変更できます。検索語には非表示のものもあり、検索語合計とページ合計は一致しません。

`recruit_form_response_timeout` は、GASから30秒以内に結果を確認できなかった回数です。応募の失敗や未着とは断定せず、応募フォームの到達・入力開始・送信開始・成功・明示的なエラーと分けて評価します。

- `reports/marketing/latest.md`
- `reports/marketing/weekly-report-YYYY-MM-DD.md`
- `reports/marketing-data/YYYY-MM-DD/report-data.json`

## 失敗時の見方

- GA4の403は、サービスアカウントにGA4プロパティ権限がない時に起きやすいです。
- Clarityの403は、トークンの形式か権限不足の可能性があります。
- Clarityは72時間制限があるため、週次レポートでは最新スナップショットとして扱います。
- Search Consoleのデータが表示されない場合は、サービスアカウントのユーザー権限とAPIの有効化を確認します。新しいプロパティでは、検索データがたまるまで数日から数週間かかります。
- どちらかが失敗しても、レポートは残りのデータで生成します。失敗内容は `## Notes` に出します。
