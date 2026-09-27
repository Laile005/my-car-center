import { getStore } from '@netlify/blobs';
import { pruneObservations, STORE_NAME } from '../shared/crawler-observations.mjs';

export default async () => {
  const removed = await pruneObservations(getStore(STORE_NAME));
  console.log(`Expired crawler page-day records removed: ${removed}`);
};

export const config = { schedule: '@daily' };
