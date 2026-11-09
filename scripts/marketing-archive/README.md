# Cloud Marketing Archive

Private standalone Google Apps Script. This is separate from the public website and the recruitment form. No web-app deployment or public endpoint is needed.

## Runtime

- `installArchive`: idempotently installs two clock triggers and performs a first collection.
- `runDailyArchive`: around 09:00 Asia/Tokyo, saves GA4, Search Console, Clarity, crawler observations, and the latest public GitHub changes.
- `runRecoveryArchive`: around 15:00 Asia/Tokyo, retries sources that did not finish successfully that local day, then processes one historical backfill chunk.
- `backfillArchiveHistory`: optional manual acceleration, up to three 28-day chunks per run. The fixed backfill endpoint prevents an endless moving queue.
- `archiveStatus`: safe status only; never prints credentials.

Google determines the exact minute inside the trigger hour. These are cloud triggers, not Codex desktop automations, and do not depend on a running PC. Trigger failures use Google's normal failure notifications; no new email recipient or public webhook is added.

## Cost Constraint

The owner explicitly requires no additional spending. Use the existing standard GA4/Search Console/Clarity APIs, Apps Script quotas, and available free Drive storage. Do not enable Google Cloud billing, create a paid plan, buy storage, add an automatic top-up, or upgrade a service to handle quota errors. These changes require a separate explicit request. Quota/capacity errors must stop or mark the source as failed, not trigger an upgrade. The existing private crawler endpoint is read only once on a successful day; no extra Netlify function or paid monitoring service is created. Existing platform usage remains subject to the site's current plan.

## Deployment Receipt

The native Google approval was completed by the owner on 2026-11-09. Private project/folder locations and validation evidence are recorded in the ignored local `reports/marketing-archive-bootstrap/deployment-receipt.json`, not published into the website. First-run source validation and backfill status are recorded in `latest.json` and the execution log; creating clock triggers alone is not proof that all sources succeeded. An earlier personal-account draft has no credentials or active trigger and is not the operational project; do not share or transfer it automatically.

The Drive connector and the browser may use different Google accounts. A connector 404 does not establish that a folder is empty or deleted. Do not broaden sharing to work around this. Use the chosen owner's browser session, or ask the user to reconnect Drive under the intended account before API-based archive reading.

## Private Script Properties

| Name | Value |
| --- | --- |
| `GA4_PROPERTY_ID` | Existing site property ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Existing Google credential JSON, with site-specific read permissions |
| `CLARITY_TOKEN` | Existing Clarity export token |
| `CRAWLER_TOKEN` | Existing private crawler-report bearer token |
| `GSC_PROPERTY` | `sc-domain:yamamoto-mycar.com` |
| `BACKFILL_START` | Optional, defaults to `2026-07-01` |
| `ARCHIVE_FOLDER_ID` | Automatically created; do not guess a folder ID |

Keep the project private. Anyone who can edit the project can read Script Properties. Do not paste these properties into a source file, GitHub, a chat, a spreadsheet, or an archive JSON. Do not create a new service-account key when the existing restricted credential works. Credential exchange is limited to the Analytics and Search Console read-only scopes.

The manifest enables Drive API v3 and requests `drive.file`, external HTTP requests, and project trigger management. It does not request access to every Drive file, Gmail, or Google Calendar. Drive access is limited to files created/authorized for this application. Initial Google consent must be completed by the owner.

## Storage And Interpretation

- `raw/YYYY-MM-DD/`: immutable, timestamped source/dataset JSON, with target period, fetch time, API metadata, pagination state, and limitations.
- `exports/ga4_*.csv` and `exports/gsc_*.csv`: latest normalized values by date and dimensions. Re-fetch replaces that date range only after the complete paginated response succeeds. It does not add the same period twice. Source files retain the previous snapshots.
- `runs.csv`: append-only run summary.
- `latest.json`: latest run manifest, including partial failures. A partial failure is not zero traffic or a successful full collection.
- `legacy/`: historical local report snapshots imported separately, never silently converted into daily data when their period is unknown.

GA4 refreshes the prior seven days; property timezone and thresholding metadata remain in the JSON. Day-level users are not additive into monthly unique users. Source/page/user rows must not be summed as if they were disjoint people. Queries/landing-page URL parameters are not requested; URL values in Clarity snapshots are stripped of query and fragment. No user ID, IP, recording, or cookies are added.

Search Console fetches final Web Search data for ten dates ending three days ago, in Pacific time. API omissions/anonymization remain possible despite pagination; query totals need not equal the unfiltered total. CTR and average rank are not additive. Missing date rows do not establish zero activity. Backfill is a new observation of the old period, not the originally reported value at that historical time.

Clarity saves the previous 24 hours for Channel, URL, and Device. After a gap exceeding 30 hours, a 72-hour recovery window is also saved. These are rolling windows, not a perfect calendar-day series, and cannot be added when they overlap. No attempt is made to subtract windows to infer people, engagement averages, or historical days. The API has a 1,000-row cap and no pagination. Limit this job to six Clarity requests in a rolling 24-hour budget, reserving four of the provider's ten daily requests for the existing report/manual checks. Provider quota failures are recorded rather than repeatedly retried.

Crawler observations are archived before the site's 90-day deletion. They use self-declared agents and agent/page/day presence, not authenticated bot identities, raw request counts, humans, or citations. Site-change evidence uses the latest 100 public `main` commits when the unauthenticated GitHub API is available. If that endpoint is limited, save SHA-256 fingerprints and response update headers for the public homepage, sitemap, stylesheet, and analytics script instead. This does not require a new GitHub credential. Fingerprints establish a difference between observations, not the exact release time, a full historical version, or a causal effect on inquiries.

## Tests And Deployment

Run `node scripts/verify-marketing-archive.cjs` with the verified Node runtime. This uses fake Google/Drive/Clarity responses and cannot create real triggers or analytics visits.

Publish `Code.gs` and `appsscript.json` only into the dedicated private Apps Script project, configure its private properties, and run `installArchive` once. Verify that the first run has no failed sources, that CSV files exist, and that the trigger screen lists both clock handlers. Re-running installation does not duplicate triggers. Run `backfillArchiveHistory` until its cursor passes the fixed endpoint, or let the daily recovery job finish it. Verify the native failure notification settings in the owner's trigger UI.

There is no website content change or Netlify function deployment in this feature. Keep local credentials outside the site's publish root.

Official references checked 2026-11-09:

- https://developers.google.com/apps-script/guides/triggers/installable
- https://developers.google.com/apps-script/guides/service-account
- https://developers.google.com/apps-script/guides/properties
- https://developers.google.com/drive/api/guides/api-specific-auth
- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api
