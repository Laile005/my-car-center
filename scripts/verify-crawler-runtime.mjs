import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import * as shared from '../netlify/shared/crawler-observations.mjs';

const records = new Map();
let failStorage = false;
const store = {
  async setJSON(key, value, options) {
    if (failStorage) throw new Error('private storage detail');
    assert.equal(options.onlyIfNew, true);
    if (!records.has(key)) records.set(key, value);
  },
  async *list({ prefix }) {
    if (failStorage) throw new Error('private storage detail');
    yield { blobs: [...records.keys()].filter(key => key.startsWith(prefix)).map(key => ({ key })) };
  }
};
const context = vm.createContext({
  Request, Response, URL, Buffer,
  Netlify: { env: { get: () => 'test-token' } },
  console: { error: message => assert.equal(message, 'Crawler observation write failed') }
});
const synthetic = (exports) => new vm.SyntheticModule(Object.keys(exports), function () {
  for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
}, { context });
const mocks = {
  '@netlify/blobs': synthetic({ getStore: () => store }),
  '../shared/crawler-observations.mjs': synthetic(shared),
  'node:crypto': synthetic({ timingSafeEqual: (await import('node:crypto')).timingSafeEqual })
};
const load = async (path, ts = false) => {
  const source = fs.readFileSync(path, 'utf8');
  const module = new vm.SourceTextModule(ts ? stripTypeScriptTypes(source) : source, { context });
  await module.link(name => { assert(mocks[name], name); return mocks[name]; });
  await module.evaluate();
  return module.namespace;
};
const edge = await load('netlify/edge-functions/observe-crawlers.ts', true);
const ua = 'Mozilla/5.0 (compatible; ChatGPT-User/1.0)';
const req = (path = '/used-cars/', extra = {}) => new Request('https://yamamoto-mycar.com' + path, { headers: { 'user-agent': ua, ...extra } });
const waits = [];
let nextCalls = 0;
const html = '<!doctype html><title>Original page</title>';
const edgeContext = {
  next: async () => { nextCalls++; return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public,max-age=0' } }); },
  waitUntil: promise => waits.push(promise)
};
assert.equal(await edge.default(req('/', { 'user-agent': 'Mozilla/5.0 Chrome/120.0' }), edgeContext), undefined);
assert.equal(nextCalls, 0);
const [first, second] = await Promise.all([edge.default(req(), edgeContext), edge.default(req(), edgeContext)]);
await Promise.all(waits.splice(0));
assert.equal(await first.text(), html);
assert.equal(first.headers.get('cache-control'), 'public,max-age=0');
assert.equal(second.status, 200);
assert.equal(records.size, 1);
await edge.default(req('/used-cars/?email=private', { 'x-mcc-crawler-test': '1' }), edgeContext);
await Promise.all(waits.splice(0));
assert.equal(records.size, 2);
assert(!JSON.stringify([...records]).includes('private'));
await edge.default(req('/missing/'), { ...edgeContext, next: async () => new Response('Missing', { status: 404, headers: { 'content-type': 'text/html' } }) });
assert.equal(waits.length, 0);
await edge.default(req('/asset/'), { ...edgeContext, next: async () => Response.json({ ok: true }) });
assert.equal(waits.length, 0);
failStorage = true;
assert.equal((await edge.default(req(), edgeContext)).status, 200);
await Promise.all(waits.splice(0));
failStorage = false;
assert.equal(edge.config.onError, 'bypass');
assert.equal(new RegExp(edge.config.header['netlify-agent-category']).test('browser'), false);
assert.equal(new RegExp(edge.config.header['netlify-agent-category']).test('ai-agent;user'), true);

const report = await load('netlify/functions/crawler-report.mjs');
const reportRequest = (query = '') => new Request('https://yamamoto-mycar.com/.netlify/functions/crawler-report' + query, { headers: { authorization: 'Bearer test-token' } });
const response = await report.default(reportRequest());
assert.equal(response.status, 200);
assert.equal(response.headers.get('cache-control'), 'private, no-store');
assert.equal((await response.json()).observations.length, 1);
assert.equal((await (await report.default(reportRequest('?diagnostics=1'))).json()).observations.length, 1);
failStorage = true;
const unavailable = await report.default(reportRequest());
assert.equal(unavailable.status, 503);
assert(!(await unavailable.text()).includes('private storage detail'));
console.log('Crawler runtime: original responses, async storage, deduplication, fail-open, diagnostics and protected reads passed.');
