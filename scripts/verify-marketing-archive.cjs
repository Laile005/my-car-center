const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const source = fs.readFileSync('scripts/marketing-archive/Code.gs', 'utf8');
const stores = new Map();
let sequence = 0;
class Folder {
  constructor(name) { this.name = name; this.id = `folder-${++sequence}`; this.files = []; this.folders = []; stores.set(this.id, this); }
  getId() { return this.id; }
  getUrl() { return `https://drive.google.com/drive/folders/${this.id}`; }
  createFolder(name) { const folder = new Folder(name); this.folders.push(folder); return folder; }
  getFoldersByName(name) { return iterator(this.folders.filter(folder => folder.name === name)); }
  getFilesByName(name) { return iterator(this.files.filter(file => file.name === name)); }
  createFile(name, content) {
    const file = { name, content, id: `file-${++sequence}`, getId() { return this.id; }, getUrl() { return `https://drive.google.com/file/d/${this.id}`; }, setContent(value) { this.content = value; return this; }, getBlob() { return { getDataAsString: () => this.content }; } };
    this.files.push(file);
    return file;
  }
}
function iterator(items) { let i = 0; return { hasNext: () => i < items.length, next: () => items[i++] }; }
function parseCsv(text) {
  const result = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (c === ',' || c === '\n')) { row.push(value); value = ''; if (c === '\n') { result.push(row); row = []; } }
    else value += c;
  }
  if (value || row.length) { row.push(value); result.push(row); }
  return result;
}
const props = new Map(Object.entries({ GA4_PROPERTY_ID: '123', GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ type: 'service_account', private_key: 'test-key', client_email: 'test@example.test' }), CLARITY_TOKEN: 'clarity-secret', CRAWLER_TOKEN: 'crawler-secret', BACKFILL_START: '2026-07-01' }));
const triggers = [];
const calls = [];
const failures = new Set();
let busy = false;
let googlePageSize = null;
const properties = { getProperty: key => props.get(key) || null, setProperty: (key, value) => { props.set(key, String(value)); return properties; } };
const context = vm.createContext({
  console: { log() {} },
  Date, JSON, Math,
  MimeType: { PLAIN_TEXT: 'text/plain' },
  PropertiesService: { getScriptProperties: () => properties },
  DriveApp: { createFolder: name => new Folder(name), getFolderById: id => { assert(stores.has(id)); return stores.get(id); } },
  Drive: { Files: { get: id => ({ id }), create: meta => ({ id: new Folder(meta.name).id }) } },
  LockService: { getScriptLock: () => ({ tryLock: () => !busy, releaseLock() {} }) },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
  ScriptApp: { getProjectTriggers: () => triggers, newTrigger(handler) { const builder = { timeBased() { return this; }, atHour(hour) { this.hour = hour; return this; }, everyDays(days) { assert.equal(days, 1); return this; }, inTimezone(zone) { assert.equal(zone, 'Asia/Tokyo'); return this; }, create() { triggers.push({ handler, hour: this.hour, getHandlerFunction: () => handler, getEventType: () => 'CLOCK' }); } }; return builder; } },
  Utilities: { getUuid: () => crypto.randomUUID(), base64EncodeWebSafe: input => Buffer.from(input).toString('base64url'), computeRsaSha256Signature: () => Buffer.from('test-signature'), formatDate: date => { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date); return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key).value).join('-'); }, parseCsv },
  UrlFetchApp: { fetch(url, options) {
    calls.push({ url, options });
    if ([...failures].some(name => url.includes(name))) return { getResponseCode: () => 503, getContentText: () => 'secret-error-body' };
    let body;
    if (url.includes('oauth2.googleapis.com')) body = { access_token: 'google-test-token' };
    else if (url.includes('analyticsdata.googleapis.com')) {
      const request = JSON.parse(options.payload);
      const day = request.dateRanges[0].startDate.replace(/-/g, '');
      const count = googlePageSize === null ? 1 : googlePageSize;
      body = { rowCount: count, dimensionHeaders: request.dimensions, metricHeaders: request.metrics, metadata: { timeZone: 'Asia/Tokyo' }, rows: (Number(request.offset) ? [] : Array.from({ length: count }, () => ({ dimensionValues: request.dimensions.map(d => ({ value: d.name === 'date' ? day : '/' })), metricValues: request.metrics.map(() => ({ value: '2' })) }))) };
    } else if (url.includes('searchconsole.googleapis.com')) { const request = JSON.parse(options.payload); body = { rows: [{ keys: request.dimensions.map(d => d === 'date' ? request.startDate : '/'), clicks: 1, impressions: 8, ctr: 0.125, position: 4 }] }; }
    else if (url.includes('clarity.ms')) body = [{ metricName: 'Traffic', information: [{ totalSessionCount: '2', Url: 'https://yamamoto-mycar.com/?email=private@example.test' }] }];
    else if (url.includes('crawler-report')) body = { start: '2026-08-12', end: '2026-11-09', timezone: 'Asia/Tokyo', observations: [] };
    else if (url.includes('api.github.com')) body = [{ sha: 'test-sha', commit: { committer: { date: '2026-11-09T01:00:00Z' }, message: 'Test release' }, html_url: 'https://github.com/Laile005/my-car-center/commit/test-sha' }];
    else if (url.startsWith('https://yamamoto-mycar.com/')) body = 'Public site file';
    else throw new Error(`Unexpected endpoint ${url}`);
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify(body), getContent: () => Buffer.from(JSON.stringify(body)), getAllHeaders: () => ({ ETag: 'test-etag' }) };
  } }
});
vm.runInContext(source, context);
context.archiveDriveFolder_ = metadata => stores.get(metadata.id);
context.Utilities.DigestAlgorithm = { SHA_256: 'sha256' };
context.Utilities.computeDigest = (_, data) => [...crypto.createHash('sha256').update(data).digest()];
assert.equal(context.archiveShift_('2026-03-01', -1), '2026-02-28');
assert.equal(context.archiveShift_('2024-03-01', -1), '2024-02-29');
assert.equal(context.archiveCsvCell_('=SUM(A1)'), '"\'=SUM(A1)"');
assert.equal(context.archiveSafeError_(new Error('Bearer private-secret')), 'Bearer [redacted]');
const cleaned = JSON.parse(JSON.stringify(context.archiveSanitize_({ access_token: 'not-saved', userId: 'not-saved', rows: [{ url: 'https://yamamoto-mycar.com/?phone=123#private', visits: 2 }] })));
assert.deepEqual(cleaned, { rows: [{ url: 'https://yamamoto-mycar.com/', visits: 2 }] });
let result = context.installArchive();
assert.equal(result.status, 'success');
assert.equal(triggers.length, 2);
assert.deepEqual(triggers.map(t => t.hour), [9, 15]);
const root = stores.get(props.get('ARCHIVE_FOLDER_ID'));
const exported = root.folders.find(f => f.name === 'exports');
assert.equal(exported.files.length, 9);
const daily = exported.files.find(f => f.name === 'ga4_daily.csv');
const before = daily.content;
props.set('CLARITY_REQUEST_TIMES', '[]');
context.installArchive();
assert.equal(triggers.length, 2, 'Installing again must not duplicate triggers');
assert.equal(daily.content, before, 'Replaying the same dates must not double counts');
assert.equal(JSON.parse(context.archiveFile_(root, 'latest.json').content).captures.length, 14);
assert.equal(JSON.stringify([...stores.values()].flatMap(f => f.files.map(file => file.content))).includes('clarity-secret'), false);
assert.equal(JSON.stringify([...stores.values()].flatMap(f => f.files.map(file => file.content))).includes('private@example.test'), false);
failures.add('analyticsdata.googleapis.com');
props.set('CLARITY_REQUEST_TIMES', '[]');
assert.throws(() => context.runDailyArchive(), /Archive incomplete: GA4/);
const partial = JSON.parse(context.archiveFile_(root, 'latest.json').content);
assert.equal(partial.status, 'partial-failure');
assert.equal(partial.failures[0].error, 'API request failed (HTTP 503)');
assert(partial.captures.some(c => c.source === 'clarity'), 'Other sources must survive one source failing');
assert.equal(daily.content, before, 'A failed fetch must not replace stored data with zero');
failures.clear();
failures.add('api.github.com');
context.archiveChanges_({ root, config: context.archiveConfig_(), runId: 'fallback-test', day: '2026-11-09', results: [] });
assert([...stores.values()].some(folder => folder.files.some(file => file.name.endsWith('site_public_version.json'))), 'Public-version evidence must work without GitHub quota or a new token');
failures.clear();
props.set('BACKFILL_END', '2026-07-28');
const priorClarity = calls.filter(call => call.url.includes('clarity.ms')).length;
context.runRecoveryArchive();
assert.equal(calls.filter(call => call.url.includes('clarity.ms')).length, priorClarity, 'Recovery must not reread a successful Clarity window');
assert.equal(props.get('BACKFILL_CURSOR'), '2026-07-29');
context.backfillArchiveHistory();
assert.equal(props.get('BACKFILL_CURSOR'), '2026-07-29', 'Completed historical backfill must stop at its fixed endpoint');
props.set('CLARITY_REQUEST_TIMES', JSON.stringify(Array(6).fill(Date.now())));
assert.throws(() => context.archiveClarity_({ config: context.archiveConfig_() }), /request budget/);
busy = true;
assert.equal(context.runDailyArchive().skipped, 'another archive is running');
assert(calls.every(call => !call.url.includes('secret')), 'Secrets must not appear in URLs');
const manifest = JSON.parse(fs.readFileSync('scripts/marketing-archive/appsscript.json', 'utf8'));
assert(!JSON.stringify(manifest).includes('webapp'), 'No public web app should be created');
assert(manifest.oauthScopes.includes('https://www.googleapis.com/auth/drive.file'));
assert(!manifest.oauthScopes.includes('https://www.googleapis.com/auth/drive'), 'Do not request full-Drive access');
console.log('Marketing archive passed: full collection, cloud triggers, idempotent CSV updates, partial failures, recovery/backfill, request budget, locking, secret redaction and privacy.');
