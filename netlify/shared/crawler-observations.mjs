export const STORE_NAME = 'yamamoto-crawler-observations';
export const RETENTION_DAYS = 90;

const agents = [
  ['chatgpt-user', 'ai-fetch'], ['oai-searchbot', 'ai-search'], ['gptbot', 'ai-training'],
  ['claude-user', 'ai-fetch'], ['claude-searchbot', 'ai-search'], ['claudebot', 'ai-training'],
  ['perplexity-user', 'ai-fetch'], ['perplexitybot', 'ai-search'],
  ['googlebot', 'search-crawler'], ['bingbot', 'search-crawler']
];

export function dateInJapan(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function classifyAgent(userAgent = '', category = '') {
  for (const [agent, purpose] of agents) {
    if (new RegExp('(?:^|[\\s;(])' + agent + '(?:/|[\\s;)]|$)', 'i').test(userAgent)) {
      return { agent, purpose };
    }
  }
  if (/^ai-agent(?:;|$)/.test(category)) return { agent: 'other-ai-agent', purpose: 'ai-fetch' };
  if (category === 'crawler;ai') return { agent: 'other-ai-crawler', purpose: 'ai-crawler' };
  return null;
}

export function observationFor(request, now = new Date()) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== 'https://yamamoto-mycar.com') return null;
  // Accept public page shapes only. Query strings, IPs and raw headers are never stored.
  const path = url.pathname.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '') || '/';
  if (!/^(?:\/|\/[a-z0-9-]+|\/(?:column|recruit-column)\/[a-z0-9-]+)$/.test(path)) return null;
  if (/^\/(?:analytics-optout|privacy|404|google[a-z0-9]+)$/.test(path)) return null;
  const classification = classifyAgent(request.headers.get('user-agent') || '', request.headers.get('netlify-agent-category') || '');
  if (!classification) return null;
  return { date: dateInJapan(now), ...classification, path };
}

export function observationKey(observation, diagnostic = false) {
  return `${diagnostic ? 'diagnostics' : 'days'}/${observation.date}/${observation.agent}/${encodeURIComponent(observation.path)}`;
}

export function observationFromKey(key) {
  const match = /^(days|diagnostics)\/(\d{4}-\d{2}-\d{2})\/([a-z-]+)\/([^/]+)$/.exec(key);
  if (!match) return null;
  const known = agents.find(([name]) => name === match[3]);
  const purpose = known?.[1] || ({ 'other-ai-agent': 'ai-fetch', 'other-ai-crawler': 'ai-crawler' })[match[3]];
  if (!purpose) return null;
  try { return { date: match[2], agent: match[3], purpose, path: decodeURIComponent(match[4]) }; }
  catch { return null; }
}

export async function readObservations(store, { days = 28, diagnostic = false, now = new Date() } = {}) {
  const end = dateInJapan(now);
  const start = dateInJapan(new Date(now.getTime() - (days - 1) * 86400000));
  const prefix = diagnostic ? 'diagnostics/' : 'days/';
  const observations = [];
  for await (const page of store.list({ prefix, paginate: true })) {
    for (const { key } of page.blobs) {
      const observation = observationFromKey(key);
      if (observation && observation.date >= start && observation.date <= end) observations.push(observation);
    }
  }
  observations.sort((a, b) => b.date.localeCompare(a.date) || a.agent.localeCompare(b.agent) || a.path.localeCompare(b.path));
  return { start, end, observations };
}

export async function pruneObservations(store, now = new Date()) {
  const cutoff = dateInJapan(new Date(now.getTime() - (RETENTION_DAYS - 1) * 86400000));
  let removed = 0;
  for (const prefix of ['days/', 'diagnostics/']) {
    for await (const page of store.list({ prefix, paginate: true })) {
      const keys = page.blobs.filter(({ key }) => {
        const observation = observationFromKey(key);
        return observation && observation.date < cutoff;
      });
      for (let index = 0; index < keys.length; index += 20) {
        await Promise.all(keys.slice(index, index + 20).map(({ key }) => store.delete(key)));
      }
      removed += keys.length;
    }
  }
  return removed;
}
