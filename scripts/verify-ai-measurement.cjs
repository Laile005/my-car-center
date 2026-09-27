const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const bootstrap = fs.readFileSync('analytics-head.js', 'utf8');
function runBrowser({ url = 'https://yamamoto-mycar.com/used-cars/', referrer = '', storedOptOut = false, twice = false } = {}) {
  const location = new URL(url);
  const data = new Map(storedOptOut ? [['mcc_analytics_optout', '1']] : []);
  const appended = [];
  const window = { location, localStorage: { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) } };
  const context = vm.createContext({ window, URL, URLSearchParams, document: { referrer, createElement: () => ({}), head: { appendChild: el => appended.push(el) } } });
  vm.runInContext(bootstrap, context);
  if (twice) vm.runInContext(bootstrap, context);
  const events = (window.dataLayer || []).filter(args => args[0] === 'event').map(args => args[2]);
  return { window, events, appended };
}

assert.equal(runBrowser({ referrer: 'https://chatgpt.com/c/example', twice: true }).events.length, 1);
assert.equal(runBrowser({ referrer: 'https://chatgpt.com/c/example' }).events[0].llm_source, 'openai');
assert.equal(runBrowser({ url: 'https://yamamoto-mycar.com/?utm_source=chatgpt.com' }).events[0].referral_signal, 'utm');
for (const referrer of ['https://evil.example/chatgpt.com', 'https://chatgpt.com.evil.example/', 'https://notclaude.ai/', 'https://openai.com/careers/', 'invalid']) {
  assert.equal(runBrowser({ referrer }).events.length, 0, referrer);
}
for (const [host, source] of [['www.perplexity.ai', 'perplexity'], ['claude.ai', 'claude'], ['gemini.google.com', 'gemini'], ['copilot.microsoft.com', 'copilot'], ['poe.com', 'poe']]) {
  assert.equal(runBrowser({ referrer: `https://${host}/` }).events[0].llm_source, source);
}
for (const options of [
  { url: 'http://localhost/?utm_source=chatgpt.com' },
  { url: 'https://mycarcenter.netlify.app/?utm_source=chatgpt.com' },
  { url: 'https://yamamoto-mycar.com/?utm_source=chatgpt.com&mcc_analytics=off' },
  { storedOptOut: true, referrer: 'https://chatgpt.com/' }
]) {
  const result = runBrowser(options);
  assert.equal(result.events.length, 0);
  assert.equal(result.appended.length, 0);
}
assert.equal(runBrowser({ storedOptOut: true, url: 'https://yamamoto-mycar.com/?utm_source=chatgpt.com&mcc_analytics=on' }).events.length, 1);
assert.equal(runBrowser({ url: 'https://yamamoto-mycar.com/?utm_source=notchatgpt' }).events.length, 0);
assert(!fs.readFileSync('analytics.js', 'utf8').includes('llm_referral_visit'), 'No duplicate referral emission in UI script');

(async () => {
  const { observationFor, observationKey, observationFromKey, readObservations, pruneObservations, dateInJapan } = await import('../netlify/shared/crawler-observations.mjs');
  const now = new Date('2026-09-28T00:00:00Z');
  const request = (path = '/used-cars/', headers = {}, method = 'GET') => new Request(`https://yamamoto-mycar.com${path}`, { method, headers: { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0)', ...headers } });
  const observation = observationFor(request('/used-cars/?email=private@example.com', { 'x-forwarded-for': '192.0.2.1' }), now);
  assert.deepEqual(observation, { date: '2026-09-28', agent: 'chatgpt-user', purpose: 'ai-fetch', path: '/used-cars' });
  assert.equal(dateInJapan(new Date('2026-09-27T16:00:00Z')), '2026-09-28');
  for (const path of ['/image/car.webp', '/.netlify/functions/goo-stock', '/docs/private.html', '/analytics-head.js', '/analytics-optout/', '/google45bdb2885daf7421.html']) assert.equal(observationFor(request(path), now), null, path);
  assert.equal(observationFor(request('/', {}, 'HEAD'), now), null);
  assert.equal(observationFor(request('/', { 'user-agent': 'Mozilla/5.0 Chrome/120.0' }), now), null);
  assert.equal(observationFor(new Request('https://preview.netlify.app/', { headers: { 'user-agent': 'GPTBot/1.0' } }), now), null);
  for (const [agent, purpose] of [['GPTBot', 'ai-training'], ['OAI-SearchBot', 'ai-search'], ['Claude-User', 'ai-fetch'], ['PerplexityBot', 'ai-search'], ['Googlebot', 'search-crawler']]) {
    assert.equal(observationFor(request('/', { 'user-agent': `${agent}/1.0` }), now).purpose, purpose);
  }
  assert.deepEqual(observationFromKey(observationKey(observation)), observation);
  assert.notEqual(observationKey(observation), observationKey(observation, true));
  const records = new Map([
    [observationKey(observation), observation],
    [observationKey({ ...observation, date: '2026-01-01' }), {}],
    [observationKey(observation, true), observation]
  ]);
  const store = {
    async *list({ prefix }) { yield { blobs: [...records.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }; },
    async delete(key) { records.delete(key); }
  };
  assert.equal((await readObservations(store, { now })).observations.length, 1);
  assert.equal((await readObservations(store, { now, diagnostic: true })).observations.length, 1);
  assert.equal(await pruneObservations(store, now), 1);
  assert.equal(records.size, 2);

  global.Netlify = { env: { get: () => 'test-token-not-a-real-secret' } };
  const { default: report } = await import('../netlify/functions/crawler-report.mjs');
  const endpoint = 'https://yamamoto-mycar.com/.netlify/functions/crawler-report';
  const auth = { authorization: 'Bearer test-token-not-a-real-secret' };
  assert.equal((await report(new Request(endpoint))).status, 401);
  assert.equal((await report(new Request(endpoint, { headers: { authorization: 'Bearer invalid' } }))).status, 401);
  assert.equal((await report(new Request(endpoint + '?days=91', { headers: auth }))).status, 400);
  assert.equal((await report(new Request(endpoint, { method: 'POST', headers: auth }))).status, 405);
  console.log('AI acquisition, privacy, crawler classification, retention and report-auth checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
