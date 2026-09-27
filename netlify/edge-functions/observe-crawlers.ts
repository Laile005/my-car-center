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
  context.waitUntil((async () => {
    try {
      await getStore(STORE_NAME).setJSON(observationKey(observation, diagnostic), observation, { onlyIfNew: true });
    } catch {
      console.error('Crawler observation write failed');
    }
  })());
  return response;
};

export const config: Config = {
  path: '/*',
  excludedPath: ['/image/*', '/images/*', '/.netlify/*', '/netlify/*', '/scripts/*', '/docs/*', '/reports/*'],
  header: { 'netlify-agent-category': '^(ai-agent|crawler)(;|$)' },
  onError: 'bypass'
};
