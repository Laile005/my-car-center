import type { Config, Context } from '@netlify/edge-functions';
import { getStore } from '@netlify/blobs';
import { observationFor, observationKey, STORE_NAME } from '../shared/crawler-observations.mjs';

export default async (request: Request, context: Context) => {
  const observation = observationFor(request);
  if (!observation) return;
  const response = await context.next();
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) return response;
  const diagnostic = request.headers.get('x-mcc-crawler-test') === '1';
  // One record per JST day, declared agent and page, not request counts or users.
  const persist = async () => {
    try {
      // Repeated writes are identical, so overwriting cannot inflate the daily count.
      await getStore(STORE_NAME).setJSON(observationKey(observation, diagnostic), observation);
      return 'stored';
    } catch {
      console.error('Crawler observation write failed');
      return 'storage-error';
    }
  };
  if (diagnostic) {
    const result = await persist();
    const checkedResponse = new Response(response.body, response);
    checkedResponse.headers.set('X-MCC-Crawler-Test-Result', result);
    checkedResponse.headers.set('Cache-Control', 'private, no-store');
    return checkedResponse;
  }
  context.waitUntil(persist());
  return response;
};

export const config: Config = {
  path: '/*',
  excludedPath: ['/image/*', '/images/*', '/.netlify/*', '/netlify/*', '/scripts/*', '/docs/*', '/reports/*'],
  header: { 'user-agent': '(ChatGPT-User|chatgpt-user|OAI-SearchBot|oai-searchbot|GPTBot|gptbot|Claude-User|claude-user|Claude-SearchBot|claude-searchbot|ClaudeBot|claudebot|Perplexity-User|perplexity-user|PerplexityBot|perplexitybot|Googlebot|googlebot|bingbot|Bingbot)' },
  onError: 'bypass'
};
