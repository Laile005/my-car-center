import { getStore } from '@netlify/blobs';
import gooStock from './goo-stock.js';

const { buildInventory } = gooStock;
const STORE_NAME = 'yamamoto-goo-stock';
const STORE_KEY = 'latest.json';
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

export default async () => {
  const store = getStore(STORE_NAME);

  try {
    const current = await store.get(STORE_KEY, { type: 'json' });
    const updatedAt = Date.parse(current?.updatedAt || '');
    if (Number.isFinite(updatedAt) && Date.now() - updatedAt < REFRESH_INTERVAL_MS) {
      console.log('goo-stock refresh skipped: daily inventory is still current');
      return Response.json({ ok: true, refreshed: false, updatedAt: current.updatedAt });
    }

    const inventory = await buildInventory();
    await store.setJSON(STORE_KEY, inventory);
    console.log(`goo-stock refreshed: ${inventory.cars.length} vehicle(s)`);

    return Response.json({ ok: true, refreshed: true, updatedAt: inventory.updatedAt });
  } catch (error) {
    console.log(`goo-stock refresh failed: ${String(error)}`);
    return Response.json({ ok: false }, { status: 200 });
  }
};
