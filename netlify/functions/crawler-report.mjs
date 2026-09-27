import { timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { readObservations, RETENTION_DAYS, STORE_NAME } from '../shared/crawler-observations.mjs';

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' } });
}

export default async (request) => {
  const expected = Netlify.env.get('MCC_CRAWLER_REPORT_TOKEN');
  if (!expected) return json({ error: 'Reporting is not configured' }, 503);
  const provided = request.headers.get('authorization') || '';
  const target = Buffer.from(`Bearer ${expected}`);
  const actual = Buffer.from(provided);
  if (actual.length !== target.length || !timingSafeEqual(actual, target)) return json({ error: 'Unauthorized' }, 401);
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  const params = new URL(request.url).searchParams;
  const days = Number(params.get('days') || 28);
  if (!Number.isInteger(days) || days < 1 || days > RETENTION_DAYS) return json({ error: 'days must be 1 through 90' }, 400);
  try {
    const result = await readObservations(getStore({ name: STORE_NAME, consistency: 'strong' }), { days, diagnostic: params.get('diagnostics') === '1' });
    return json({ version: 1, timezone: 'Asia/Tokyo', unit: 'agent-page-days', identity: 'self-declared-not-IP-verified', ...result });
  } catch {
    return json({ error: 'Observation storage is temporarily unavailable' }, 503);
  }
};
