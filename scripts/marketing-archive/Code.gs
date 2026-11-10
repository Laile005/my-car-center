/* Private standalone Apps Script. Secrets belong in Script Properties, never here. */
var ARCHIVE_VERSION = 1;
var ARCHIVE_ZONE = 'Asia/Tokyo';
var GOOGLE_READ_SCOPES = 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly';
var ACTION_EVENTS = ['phone_click', 'phone_prompt_open', 'phone_dial', 'directions_click', 'goo_net_click', 'cta_click', 'article_card_click', 'llm_referral_visit', 'used_car_consultation_click', 'used_car_consultation_view', 'used_car_stock_view', 'new_car_consultation_click', 'new_car_consultation_view', 'new_car_flow_click', 'new_car_guide_click', 'new_car_service_click', 'indeed_apply_click', 'recruit_form_start', 'recruit_form_submit_start', 'recruit_form_submit_success', 'recruit_form_submit_error', 'recruit_form_response_timeout'];

function installArchive() {
  var config = archiveConfig_();
  var root = archiveRoot_(config);
  archiveReplace_(root, 'README.txt', archiveReadme_());
  var handlers = ScriptApp.getProjectTriggers().map(function(t) { return t.getHandlerFunction(); });
  if (handlers.indexOf('runDailyArchive') < 0) ScriptApp.newTrigger('runDailyArchive').timeBased().atHour(9).everyDays(1).inTimezone(ARCHIVE_ZONE).create();
  if (handlers.indexOf('runRecoveryArchive') < 0) ScriptApp.newTrigger('runRecoveryArchive').timeBased().atHour(15).everyDays(1).inTimezone(ARCHIVE_ZONE).create();
  console.log(JSON.stringify({ folder: root.getUrl(), triggers: archiveTriggerStatus_() }));
  return runDailyArchive();
}

function runDailyArchive() { return runArchive_(false); }
function runRecoveryArchive() { return runArchive_(true); }

function runClarityRecovery() {
  var p = PropertiesService.getScriptProperties();
  var id = p.getProperty('CLARITY_RETRY_TRIGGER_ID');
  ScriptApp.getProjectTriggers().filter(function(t) { return t.getUniqueId() === id; }).forEach(function(t) { ScriptApp.deleteTrigger(t); });
  p.deleteProperty('CLARITY_RETRY_TRIGGER_ID');
  p.deleteProperty('CLARITY_RETRY_AT');
  return runRecoveryArchive();
}

function archiveStatus() {
  var p = PropertiesService.getScriptProperties();
  var keys = ['ARCHIVE_FOLDER_ID', 'LAST_SUCCESS_GA4', 'LAST_SUCCESS_GSC', 'LAST_SUCCESS_CLARITY', 'LAST_SUCCESS_CRAWLERS', 'LAST_SUCCESS_CHANGES', 'BACKFILL_CURSOR', 'LAST_RUN_STATUS', 'CLARITY_RETRY_AT'];
  var result = { triggers: archiveTriggerStatus_() };
  keys.forEach(function(k) { result[k] = p.getProperty(k); });
  console.log(JSON.stringify(result));
  return result;
}

function archiveTriggerStatus_() {
  return ScriptApp.getProjectTriggers().filter(function(t) { return ['runDailyArchive', 'runRecoveryArchive'].indexOf(t.getHandlerFunction()) >= 0; }).map(function(t) { return { handler: t.getHandlerFunction(), event: String(t.getEventType()) }; });
}

function archiveConfig_() {
  var p = PropertiesService.getScriptProperties();
  var names = ['GA4_PROPERTY_ID', 'GOOGLE_SERVICE_ACCOUNT_JSON', 'CLARITY_TOKEN', 'CRAWLER_TOKEN'];
  var missing = names.filter(function(k) { return !p.getProperty(k); });
  if (missing.length) throw new Error('Missing Script Properties: ' + missing.join(', '));
  var c = {};
  names.forEach(function(k) { c[k] = p.getProperty(k); });
  c.GSC_PROPERTY = p.getProperty('GSC_PROPERTY') || 'sc-domain:yamamoto-mycar.com';
  c.ARCHIVE_FOLDER_ID = p.getProperty('ARCHIVE_FOLDER_ID');
  c.BACKFILL_START = p.getProperty('BACKFILL_START') || '2026-07-01';
  c.BACKFILL_END = p.getProperty('BACKFILL_END');
  if (!c.BACKFILL_END) {
    c.BACKFILL_END = archiveShift_(archiveDate_(new Date(), ARCHIVE_ZONE), -3);
    p.setProperty('BACKFILL_END', c.BACKFILL_END);
  }
  c.GOOGLE_SERVICE_ACCOUNT = JSON.parse(c.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (c.GOOGLE_SERVICE_ACCOUNT.type !== 'service_account') throw new Error('Expected existing read-only service-account credentials');
  return c;
}

function archiveRoot_(config) {
  var p = PropertiesService.getScriptProperties();
  if (config.ARCHIVE_FOLDER_ID) return archiveDriveFolder_(Drive.Files.get(config.ARCHIVE_FOLDER_ID, { fields: 'id,name,webViewLink' }));
  var folder = archiveDriveFolder_(Drive.Files.create({ name: '山本マイカー_分析アーカイブ', mimeType: 'application/vnd.google-apps.folder' }, null, { fields: 'id,name,webViewLink' }));
  p.setProperty('ARCHIVE_FOLDER_ID', folder.getId());
  config.ARCHIVE_FOLDER_ID = folder.getId();
  folder.createFile('README.txt', archiveReadme_(), MimeType.PLAIN_TEXT);
  return folder;
}

function archiveReadme_() {
  return '山本マイカー 分析アーカイブ\n\n' +
    'Google Apps Scriptで毎日9時台（日本時間）に取得。15時台は失敗分の再取得と履歴の補完。PCは不要です。\n' +
    'raw: 取得時刻ごとのJSON。APIで取得した集計値と対象期間、成否、上限・注意点を保存。過去の取得ファイルは上書きしません。\n' +
    'exports: 比較用CSV。GA4とSearch Consoleは日付・ページ等のキーで更新し、再取得分を二重加算しません。\n' +
    'runs.csv: 実行履歴。latest.json: 最後の実行の状況。失敗はゼロ件と区別します。\n' +
    'legacy: 以前PCに保存した記録。期間不明の値を日次データとして混ぜないでください。\n\n' +
    'GA4は直近7日を再取得。Search Consoleは確定データを対象に直近10日（3日前まで）を再取得。履歴補完は2026年7月以降を月単位で処理します。\n' +
    'GA4の日別ユーザー数を足しても月間のユニーク人数にはなりません。CTR・平均順位等はそのまま平均しないでください。\n' +
    'Clarityは直近24時間の移動窓。遅延・欠測時は72時間の補助記録も保存します。暦日ではなく取得時刻と対象時間で比較し、重なった窓を合算しないでください。APIは1000行上限・ページ送り不可のため完全な全件とは限りません。録画・ヒートマップの動画等は保存しません。\n' +
    'Search Consoleのクエリーは匿名化等で全件取得できるわけではありません。API行上限・ページ送り状態もJSONに保存します。\n' +
    'クローラー記録は自己申告User-Agentによる日別・エージェント別・ページ別の取得有無。人の訪問・引用回数・学習採用とは別です。\n' +
    '電話・地図クリックは実来店・受注ではありません。Googleビジネスプロフィール、BingのAI専用レポートは未取得です。\n' +
    'サイト変更の証拠としてGitHubのコミット、または公開ページ・共通ファイルのハッシュと更新情報を保存します。GitHub側で取得制限がある場合は後者を使います。相関だけで受注増の原因とは断定しません。\n' +
    '認証情報は非公開GASのスクリプトプロパティにあり、このフォルダ・GitHubには保存しません。編集権限を持つ人はプロパティを参照できるので、GASを公開・共有しないでください。\n';
}

function runArchive_(recovery) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { skipped: 'another archive is running' };
  try {
    var start = new Date();
    var config = archiveConfig_();
    var root = archiveRoot_(config);
    var p = PropertiesService.getScriptProperties();
    var day = archiveDate_(start, ARCHIVE_ZONE);
    var context = { root: root, config: config, runId: start.toISOString().replace(/[:.]/g, '-') + '_' + Utilities.getUuid().slice(0, 8), startedAt: start.toISOString(), day: day, results: [], failures: [] };
    var jobs = [
      { name: 'GA4', run: function() { archiveGa_(context, archiveShift_(day, -7), archiveShift_(day, -1)); } },
      { name: 'GSC', run: function() { archiveGsc_(context, archiveShift_(day, -12), archiveShift_(day, -3)); } },
      { name: 'CLARITY', run: function() { archiveClarity_(context); } },
      { name: 'CRAWLERS', run: function() { archiveCrawlers_(context); } },
      { name: 'CHANGES', run: function() { archiveChanges_(context); } }
    ];
    jobs.forEach(function(job) {
      if (recovery && (p.getProperty('LAST_SUCCESS_' + job.name) || '').slice(0, 10) === day) return;
      try { job.run(); p.setProperty('LAST_SUCCESS_' + job.name, day); }
      catch (error) { context.failures.push({ source: job.name, error: archiveSafeError_(error), at: new Date().toISOString() }); }
    });
    if (recovery && Date.now() - start.getTime() < 120000) {
      try { archiveBackfillChunk_(context); }
      catch (error) { context.failures.push({ source: 'BACKFILL', error: archiveSafeError_(error), at: new Date().toISOString() }); }
    }
    var hardFailures = context.failures.filter(function(f) { return !/^Local Clarity request budget reached; retry scheduled after /.test(f.error); });
    var result = { version: ARCHIVE_VERSION, runId: context.runId, startedAt: context.startedAt, finishedAt: new Date().toISOString(), timezone: ARCHIVE_ZONE, recovery: recovery, status: hardFailures.length ? 'partial-failure' : context.failures.length ? 'deferred' : 'success', captures: context.results, failures: context.failures, backfillCursor: p.getProperty('BACKFILL_CURSOR'), clarityRetryAt: p.getProperty('CLARITY_RETRY_AT') };
    archiveSave_(context, 'run', 'manifest', { start: day, end: day }, result);
    archiveReplace_(root, 'latest.json', JSON.stringify(result, null, 2));
    var runs = archiveFile_(root, 'runs.csv');
    var header = 'run_id,started_at,finished_at,status,captures,failures\n';
    var line = [result.runId, result.startedAt, result.finishedAt, result.status, context.results.length, context.failures.length].map(archiveCsvCell_).join(',') + '\n';
    archiveReplace_(root, 'runs.csv', (runs ? runs.getBlob().getDataAsString('UTF-8') : header) + line);
    p.setProperty('LAST_RUN_STATUS', JSON.stringify({ runId: result.runId, status: result.status, failures: context.failures.map(function(f) { return f.source; }) }));
    console.log(JSON.stringify({ folder: root.getUrl(), runId: result.runId, status: result.status, captures: result.captures.length, failures: result.failures, backfillCursor: result.backfillCursor }));
    if (hardFailures.length) throw new Error('Archive incomplete: ' + hardFailures.map(function(f) { return f.source; }).join(', ') + '. Details saved to latest.json.');
    return { folder: root.getUrl(), status: result.status, captures: result.captures.length };
  } finally { lock.releaseLock(); }
}

function archiveBackfillChunk_(context) {
  var p = PropertiesService.getScriptProperties();
  var cursor = p.getProperty('BACKFILL_CURSOR') || context.config.BACKFILL_START;
  var end = context.config.BACKFILL_END;
  if (cursor > end) return;
  var chunkEnd = archiveShift_(cursor, 27);
  if (chunkEnd > end) chunkEnd = end;
  archiveGa_(context, cursor, chunkEnd);
  archiveGsc_(context, cursor, chunkEnd);
  p.setProperty('BACKFILL_CURSOR', archiveShift_(chunkEnd, 1));
}

function backfillArchiveHistory() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('Another archive is running');
  try {
    var config = archiveConfig_();
    var now = new Date();
    var context = { root: archiveRoot_(config), config: config, runId: now.toISOString().replace(/[:.]/g, '-') + '_backfill_' + Utilities.getUuid().slice(0, 8), startedAt: now.toISOString(), day: archiveDate_(now, ARCHIVE_ZONE), results: [], failures: [] };
    for (var i = 0; i < 3 && Date.now() - now.getTime() < 210000; i++) archiveBackfillChunk_(context);
    var result = { captures: context.results, cursor: PropertiesService.getScriptProperties().getProperty('BACKFILL_CURSOR') };
    archiveSave_(context, 'run', 'backfill', { start: config.BACKFILL_START, end: config.BACKFILL_END }, result);
    console.log(JSON.stringify(result));
    return result;
  } finally { lock.releaseLock(); }
}

function archiveGa_(context, start, end) {
  var token = archiveGoogleToken_(context.config);
  var url = 'https://analyticsdata.googleapis.com/v1beta/properties/' + encodeURIComponent(context.config.GA4_PROPERTY_ID) + ':runReport';
  var definitions = [
    { name: 'daily', dimensions: ['date'], metrics: ['activeUsers', 'sessions', 'totalUsers', 'screenPageViews', 'eventCount'] },
    { name: 'pages', dimensions: ['date', 'pagePath'], metrics: ['screenPageViews', 'activeUsers', 'sessions', 'userEngagementDuration'] },
    { name: 'acquisition', dimensions: ['date', 'sessionSourceMedium', 'landingPage'], metrics: ['sessions', 'activeUsers', 'screenPageViews', 'engagedSessions'] },
    { name: 'actions', dimensions: ['date', 'eventName', 'pagePath'], metrics: ['eventCount'], dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ACTION_EVENTS } } } },
    { name: 'purchase', dimensions: ['date', 'eventName', 'newVsReturning', 'sessionSourceMedium', 'pagePath'], metrics: ['eventCount', 'totalUsers', 'sessions'], dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['goo_net_click', 'used_car_consultation_click', 'used_car_consultation_view', 'new_car_consultation_click', 'new_car_consultation_view'] } } } }
  ];
  definitions.forEach(function(d) {
    var body = { dateRanges: [{ startDate: start, endDate: end }], dimensions: d.dimensions.map(function(n) { return { name: n }; }), metrics: d.metrics.map(function(n) { return { name: n }; }), limit: 10000, orderBys: d.dimensions.map(function(n) { return { dimension: { dimensionName: n } }; }) };
    if (d.dimensionFilter) body.dimensionFilter = d.dimensionFilter;
    var response = archivePagedGa_(url, token, body);
    var range = { start: start, end: end, timezone: response.metadata && response.metadata.timeZone || 'property timezone (see API metadata)', state: 'recent data may be revised' };
    archiveSave_(context, 'ga4', d.name, range, response);
    var rows = (response.rows || []).map(function(row) { return row.dimensionValues.map(function(v) { return v.value; }).concat(row.metricValues.map(function(v) { return v.value; })); });
    archiveUpsertCsv_(context.root, 'ga4_' + d.name + '.csv', d.dimensions.concat(d.metrics), rows, d.dimensions.length, start, end, response.archiveComplete);
  });
}

function archivePagedGa_(url, token, body) {
  var result = null;
  var rows = [];
  for (var offset = 0; offset < 100000; offset += 10000) {
    body.offset = offset;
    var page = archiveJson_(url, { token: token, body: body });
    if (!result) result = page;
    rows = rows.concat(page.rows || []);
    if (rows.length >= Number(page.rowCount || 0) || (page.rows || []).length < 10000) break;
  }
  result.rows = rows;
  result.archiveComplete = rows.length >= Number(result.rowCount || 0);
  result.archiveLimitations = 'Aggregated report, not raw events. Thresholding/sampling and API metadata are retained. Daily users cannot be summed into period-unique users.';
  return result;
}

function archiveGsc_(context, start, end) {
  var token = archiveGoogleToken_(context.config);
  var url = 'https://searchconsole.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(context.config.GSC_PROPERTY) + '/searchAnalytics/query';
  var definitions = [{ name: 'daily', dimensions: ['date'] }, { name: 'pages', dimensions: ['date', 'page'] }, { name: 'queries', dimensions: ['date', 'query'] }, { name: 'query_pages', dimensions: ['date', 'query', 'page'] }];
  definitions.forEach(function(d) {
    var rows = [];
    var complete = false;
    var pages = [];
    for (var offset = 0; offset < 50000; offset += 25000) {
      var page = archiveJson_(url, { token: token, body: { startDate: start, endDate: end, dimensions: d.dimensions, type: 'web', dataState: 'final', rowLimit: 25000, startRow: offset } });
      pages.push(page);
      rows = rows.concat(page.rows || []);
      if ((page.rows || []).length < 25000) { complete = true; break; }
    }
    archiveSave_(context, 'gsc', d.name, { start: start, end: end, timezone: 'America/Los_Angeles', state: 'final', property: context.config.GSC_PROPERTY }, { rows: rows, responses: pages, paginationComplete: complete, limitations: 'Top rows only; anonymized queries and internal API limits can omit data even after pagination. Missing days are not proof of zero traffic.' });
    archiveUpsertCsv_(context.root, 'gsc_' + d.name + '.csv', d.dimensions.concat(['clicks', 'impressions', 'ctr', 'position']), rows.map(function(row) { return row.keys.concat([row.clicks, row.impressions, row.ctr, row.position]); }), d.dimensions.length, start, end, complete);
  });
}

function archiveClarity_(context) {
  var p = PropertiesService.getScriptProperties();
  var last = p.getProperty('CLARITY_LAST_COMPLETE_AT');
  var gap = last && Date.now() - Date.parse(last) > 30 * 3600000;
  var windows = gap ? [1, 3] : [1];
  archiveClarityBudget_(windows.length * 3);
  windows.forEach(function(days) {
    ['Channel', 'URL', 'Device'].forEach(function(dimension) {
      var recent = JSON.parse(p.getProperty('CLARITY_REQUEST_TIMES') || '[]').filter(function(t) { return Date.now() - t < 24 * 3600000; });
      if (recent.length >= 6) throw new Error('Local Clarity request budget reached; leaving room for the weekly report. Retry later.');
      recent.push(Date.now());
      p.setProperty('CLARITY_REQUEST_TIMES', JSON.stringify(recent));
      var begin = new Date();
      var response = archiveJson_('https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=' + days + '&dimension1=' + dimension, { token: context.config.CLARITY_TOKEN });
      archiveSave_(context, 'clarity', dimension.toLowerCase() + '_' + days + 'd', { startApproximate: new Date(begin.getTime() - days * 86400000).toISOString(), endApproximate: begin.toISOString(), rollingHours: days * 24, semantics: 'rolling window relative to each API request; not calendar dates; do not sum overlapping windows' }, { metrics: response, limitations: '1000-row limit, no pagination, aggregated dashboard data only; no recordings or heatmap media.' });
    });
  });
  p.setProperty('CLARITY_LAST_COMPLETE_AT', new Date().toISOString());
}

function archiveClarityBudget_(required) {
  var p = PropertiesService.getScriptProperties();
  var recent = JSON.parse(p.getProperty('CLARITY_REQUEST_TIMES') || '[]').filter(function(t) { return Date.now() - t < 24 * 3600000; }).sort(function(a, b) { return a - b; });
  if (recent.length + required <= 6) return;
  var availableAt = recent[recent.length + required - 7] + 24 * 3600000 + 60000;
  var existing = p.getProperty('CLARITY_RETRY_TRIGGER_ID');
  var scheduled = ScriptApp.getProjectTriggers().some(function(t) { return t.getUniqueId() === existing; });
  if (!scheduled) {
    var trigger = ScriptApp.newTrigger('runClarityRecovery').timeBased().at(new Date(availableAt)).create();
    p.setProperty('CLARITY_RETRY_TRIGGER_ID', trigger.getUniqueId());
    p.setProperty('CLARITY_RETRY_AT', new Date(availableAt).toISOString());
  }
  throw new Error('Local Clarity request budget reached; retry scheduled after ' + new Date(availableAt).toISOString());
}

function archiveCrawlers_(context) {
  var data = archiveJson_('https://yamamoto-mycar.com/.netlify/functions/crawler-report?days=90', { token: context.config.CRAWLER_TOKEN });
  archiveSave_(context, 'crawlers', 'observations', { start: data.start, end: data.end, timezone: data.timezone || ARCHIVE_ZONE }, data);
}

function archiveChanges_(context) {
  try {
    var commits = archiveJson_('https://api.github.com/repos/Laile005/my-car-center/commits?sha=main&per_page=100', {});
    var data = commits.map(function(c) { return { sha: c.sha, date: c.commit.committer.date, message: c.commit.message.split('\n')[0], url: c.html_url }; });
    archiveSave_(context, 'site', 'commits', { observedAt: new Date().toISOString(), limit: 100, branch: 'main' }, data);
  } catch (error) {
    var resources = ['/', '/sitemap.xml', '/styles.css', '/analytics.js'].map(function(path) {
      var url = 'https://yamamoto-mycar.com' + path;
      var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      if (response.getResponseCode() !== 200) throw new Error('Public site version check failed (HTTP ' + response.getResponseCode() + ')');
      var headers = response.getAllHeaders();
      var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, response.getContent()).map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
      return { url: url, sha256: digest, etag: headers.ETag || headers.etag || null, lastModified: headers['Last-Modified'] || headers['last-modified'] || null };
    });
    archiveSave_(context, 'site', 'public_version', { observedAt: new Date().toISOString() }, { mode: 'public-resource-fingerprints', githubStatus: archiveSafeError_(error), resources: resources, limitations: 'Hashes show changes between observations, not commit messages, precise release time, causal impact, or full historical versions.' });
  }
}

function archiveGoogleToken_(config) {
  var cache = CacheService.getScriptCache();
  var key = 'google-read-token-v1';
  var cached = cache.get(key);
  if (cached) return cached;
  var account = config.GOOGLE_SERVICE_ACCOUNT;
  var now = Math.floor(Date.now() / 1000);
  var encode = function(value) { return Utilities.base64EncodeWebSafe(JSON.stringify(value)).replace(/=+$/, ''); };
  var unsigned = encode({ alg: 'RS256', typ: 'JWT' }) + '.' + encode({ iss: account.client_email, scope: GOOGLE_READ_SCOPES, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  var signed = unsigned + '.' + Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(unsigned, account.private_key)).replace(/=+$/, '');
  var response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', { method: 'post', payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signed }, muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) throw new Error('Google credential exchange failed (HTTP ' + response.getResponseCode() + ')');
  var token = JSON.parse(response.getContentText()).access_token;
  if (!token) throw new Error('Google credential exchange returned no access token');
  cache.put(key, token, 3000);
  return token;
}

function archiveJson_(url, options) {
  var headers = { Accept: 'application/json' };
  if (options.token) headers.Authorization = 'Bearer ' + options.token;
  var request = { method: options.body ? 'post' : 'get', headers: headers, muteHttpExceptions: true, followRedirects: false };
  if (options.body) { request.contentType = 'application/json'; request.payload = JSON.stringify(options.body); }
  var response = UrlFetchApp.fetch(url, request);
  var code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error('API request failed (HTTP ' + code + ')');
  return JSON.parse(response.getContentText());
}

function archiveSave_(context, source, dataset, range, data) {
  var folder = archiveFolder_(archiveFolder_(context.root, 'raw'), context.day);
  var payload = { schemaVersion: ARCHIVE_VERSION, source: source, dataset: dataset, runId: context.runId, retrievedAt: new Date().toISOString(), requestedRange: range, data: archiveSanitize_(data) };
  var file = folder.createFile(context.runId + '_' + source + '_' + dataset + '.json', JSON.stringify(payload, null, 2), MimeType.PLAIN_TEXT);
  if (source !== 'run') context.results.push({ source: source, dataset: dataset, fileId: file.getId(), url: file.getUrl() });
  return file;
}

function archiveSanitize_(value) {
  if (Array.isArray(value)) return value.map(archiveSanitize_);
  if (value && typeof value === 'object') {
    var clean = {};
    Object.keys(value).forEach(function(key) {
      if (/^(authorization|access_token|refresh_token|private_key|client_secret|password|cookie|ip|userId|userPseudoId|sessionId)$/i.test(key)) return;
      clean[key] = archiveSanitize_(value[key]);
    });
    return clean;
  }
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value.split(/[?#]/)[0];
  return value;
}

function archiveUpsertCsv_(root, name, headers, rows, keyCount, start, end, replaceRange) {
  var folder = archiveFolder_(root, 'exports');
  var file = archiveFile_(folder, name);
  var old = file ? Utilities.parseCsv(file.getBlob().getDataAsString('UTF-8')).slice(1).filter(function(row) { return row.length === headers.length; }) : [];
  var dateValue = function(value) { return /^\d{8}$/.test(value) ? value.slice(0, 4) + '-' + value.slice(4, 6) + '-' + value.slice(6, 8) : value; };
  var map = {};
  old.forEach(function(row) {
    var day = dateValue(row[0]);
    if (!replaceRange || day < start || day > end) map[JSON.stringify(row.slice(0, keyCount))] = row;
  });
  rows.forEach(function(row) { map[JSON.stringify(row.slice(0, keyCount))] = row; });
  var ordered = Object.keys(map).sort().map(function(k) { return map[k]; });
  archiveReplace_(folder, name, [headers].concat(ordered).map(function(row) { return row.map(archiveCsvCell_).join(','); }).join('\n') + '\n');
}

function archiveCsvCell_(value) {
  var text = value == null ? '' : String(value);
  if (/^[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

function archiveSafeError_(error) {
  var text = String(error && error.message || error);
  return text.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').replace(/-----BEGIN[\s\S]*?-----END[^-]+-----/g, '[redacted key]').slice(0, 400);
}

function archiveDriveFolder_(metadata) {
  return {
    getId: function() { return metadata.id; },
    getUrl: function() { return metadata.webViewLink || 'https://drive.google.com/drive/folders/' + metadata.id; },
    getFilesByName: function(name) { return archiveDriveList_(metadata.id, name, false); },
    getFoldersByName: function(name) { return archiveDriveList_(metadata.id, name, true); },
    createFolder: function(name) { return archiveDriveFolder_(Drive.Files.create({ name: name, mimeType: 'application/vnd.google-apps.folder', parents: [metadata.id] }, null, { fields: 'id,name,webViewLink' })); },
    createFile: function(name, content) { return archiveDriveFile_(Drive.Files.create({ name: name, mimeType: 'text/plain', parents: [metadata.id] }, Utilities.newBlob(content, 'text/plain', name), { fields: 'id,name,webViewLink' })); }
  };
}

function archiveDriveList_(parent, name, folder) {
  var escape = function(text) { return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); };
  var query = "'" + escape(parent) + "' in parents and name = '" + escape(name) + "' and trashed = false and mimeType " + (folder ? '=' : '!=') + " 'application/vnd.google-apps.folder'";
  var files = Drive.Files.list({ q: query, fields: 'files(id,name,webViewLink)', pageSize: 100 }).files || [];
  var index = 0;
  return { hasNext: function() { return index < files.length; }, next: function() { return folder ? archiveDriveFolder_(files[index++]) : archiveDriveFile_(files[index++]); } };
}

function archiveDriveFile_(metadata) {
  return {
    getId: function() { return metadata.id; },
    getUrl: function() { return metadata.webViewLink || 'https://drive.google.com/file/d/' + metadata.id + '/view'; },
    setContent: function(content) { Drive.Files.update({}, metadata.id, Utilities.newBlob(content, 'text/plain', metadata.name), { fields: 'id' }); return this; },
    getBlob: function() { return { getDataAsString: function() {
      var response = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(metadata.id) + '?alt=media', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
      if (response.getResponseCode() !== 200) throw new Error('Archive file read failed (HTTP ' + response.getResponseCode() + ')');
      return response.getContentText();
    } }; }
  };
}

function archiveFile_(folder, name) { var files = folder.getFilesByName(name); return files.hasNext() ? files.next() : null; }
function archiveFolder_(folder, name) { var folders = folder.getFoldersByName(name); return folders.hasNext() ? folders.next() : folder.createFolder(name); }
function archiveReplace_(folder, name, content) { var file = archiveFile_(folder, name); return file ? file.setContent(content) : folder.createFile(name, content, MimeType.PLAIN_TEXT); }
function archiveDate_(date, zone) { return Utilities.formatDate(date, zone, 'yyyy-MM-dd'); }
function archiveShift_(day, days) { var date = new Date(day + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
