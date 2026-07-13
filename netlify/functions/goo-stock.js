const SHOP_URL = 'https://www.goo-net.com/usedcar_shop/1010169/stock.html';
const MAX_VISIBLE_CARS = 3;
const SHOP_FETCH_TIMEOUT_MS = 6000;
const DETAIL_FETCH_TIMEOUT_MS = 4500;
const { connectLambda, getStore } = require('@netlify/blobs');

const STORE_NAME = 'yamamoto-goo-stock';
const STORE_KEY = 'latest.json';

async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function decodeHtml(buffer, contentType = '') {
  const charset = /charset=([^;]+)/i.exec(contentType)?.[1]?.trim();
  const candidates = [charset, 'shift_jis', 'utf-8'].filter(Boolean);
  for (const enc of candidates) {
    try {
      return new TextDecoder(enc).decode(buffer);
    } catch (_) {}
  }
  return new TextDecoder().decode(buffer);
}

function stripTags(value = '') {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function absolutize(url) {
  if (!url) return '';
  try {
    return new URL(url, 'https://www.goo-net.com').toString();
  } catch (_) {
    return '';
  }
}

function isVehicleDetailUrl(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('goo-net.com')) return false;
    return /\/usedcar\/spread\//.test(parsed.pathname);
  } catch (_) {
    return false;
  }
}

function vehicleIdFromUrl(url) {
  const pathname = new URL(url).pathname;
  return /\/([0-9]{12,})\.html$/.exec(pathname)?.[1] || '';
}

function isPlaceholderImage(url) {
  return /(?:no[_-]?image|no[_-]?photo|nophoto|nowprinting|dummy|blank|placeholder|comingsoon|star|icon|logo|common)/i.test(url);
}

function imageCandidates(block) {
  const candidates = [];
  const imgMatches = [...block.matchAll(/<img[^>]+>/gi)];
  for (const [tag] of imgMatches) {
    const attrs = [...tag.matchAll(/\s(?:data-src|data-original|data-lazy|data-url|src)=["']([^"']+)["']/gi)];
    attrs.forEach((match) => candidates.push(match[1]));
    const srcset = /\s(?:data-srcset|srcset)=["']([^"']+)["']/i.exec(tag)?.[1];
    if (srcset) {
      srcset.split(',').forEach((part) => candidates.push(part.trim().split(/\s+/)[0]));
    }
  }
  const sourceMatches = [...block.matchAll(/<source[^>]+(?:data-srcset|srcset)=["']([^"']+)["']/gi)];
  sourceMatches.forEach((match) => {
    match[1].split(',').forEach((part) => candidates.push(part.trim().split(/\s+/)[0]));
  });
  return [...new Set(candidates.map(absolutize).filter(Boolean))];
}

function pickImage(block, detailUrl = '') {
  const vehicleId = detailUrl ? vehicleIdFromUrl(detailUrl) : '';
  const candidates = imageCandidates(block).filter((url) => !isPlaceholderImage(url));
  const matchingVehicle = candidates.find((url) => vehicleId && url.includes(vehicleId));
  if (matchingVehicle) return matchingVehicle;
  return candidates.find((url) => /img\.goo-net\.com|picture|photo|car/i.test(url)) || '';
}

function pickPrice(block) {
  const text = stripTags(block);
  const price = /(?:支払総額|車両本体価格|本体価格|価格)\s*([0-9.]+万円|ASK|応談)/i.exec(text);
  return price ? price[1] : '';
}

function pickLabeledPrice(text, labels) {
  const labelPattern = labels.join('|');
  const pattern = new RegExp(`(?:${labelPattern})\\s*(?:[（(]\\s*税込\\s*[）)])?\\s*([0-9]+(?:\\.[0-9]+)?\\s*万円|ASK|応談)`, 'i');
  const match = pattern.exec(text);
  return match ? match[1].replace(/\s+/g, '') : '';
}

function pickPriceDetails(block) {
  const text = stripTags(block);
  const total = pickLabeledPrice(text, ['支払総額', '総額']);
  const vehicle = pickLabeledPrice(text, ['車両本体価格', '本体価格']);
  const fees = pickLabeledPrice(text, ['諸費用']);
  return { total, vehicle, fees };
}

function pickTitle(block) {
  const headings = [
    /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i,
    /<img[^>]+alt=["']([^"']+)["']/i,
    /<img[^>]+title=["']([^"']+)["']/i,
    /class=["'][^"']*(?:carName|vehicleName|ttl|title)[^"']*["'][^>]*>([\s\S]*?)<\//i,
    /<a[^>]+href=["'][^"']*usedcar[^"']*["'][^>]*>([\s\S]*?)<\/a>/i
  ];
  for (const pattern of headings) {
    const raw = pattern.exec(block)?.[1];
    const title = stripTags(raw);
    if (title && !/詳細|在庫|一覧|グーネット/.test(title)) return title;
  }
  return '';
}

function pickDetailMileage(html) {
  const text = stripTags(html);
  return /走行距離\s*([0-9.,]+(?:万)?km)/i.exec(text)?.[1] || '';
}

function pickDetailYear(html) {
  const text = stripTags(html);
  return /年式(?:\s*（初度登録）)?\s*((?:20\d{2}\s*\([^)]*\)|20\d{2}|令和\d+|平成\d+)年)/.exec(text)?.[1] || '';
}

async function fetchDetailData(url) {
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; MyCarCenterSite/1.0; +https://yamamoto-mycar.com/)',
        'accept-language': 'ja,en;q=0.8'
      }
    }, DETAIL_FETCH_TIMEOUT_MS);
    if (!response.ok) return {};

    const buffer = await response.arrayBuffer();
    const html = decodeHtml(buffer, response.headers.get('content-type') || '');
    const vehicleId = vehicleIdFromUrl(url);
    const metaImages = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1],
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1]
    ].map(absolutize).filter(Boolean);
    const allImages = [...metaImages, ...imageCandidates(html)].filter((src) => !isPlaceholderImage(src));
    return {
      image: allImages.find((src) => vehicleId && src.includes(vehicleId)) || allImages[0] || '',
      mileage: pickDetailMileage(html),
      year: pickDetailYear(html),
      priceDetails: pickPriceDetails(html)
    };
  } catch (_) {
    return {};
  }
}

async function enrichCars(cars) {
  return Promise.all(cars.map(async (car) => {
    const detail = await fetchDetailData(car.url);
    return {
      ...car,
      image: detail.image || (car.image && !isPlaceholderImage(car.image) ? car.image : ''),
      mileage: detail.mileage || car.mileage || '',
      year: detail.year || car.year || '',
      priceDetails: {
        total: detail.priceDetails?.total || car.priceDetails?.total || '',
        vehicle: detail.priceDetails?.vehicle || car.priceDetails?.vehicle || '',
        fees: detail.priceDetails?.fees || car.priceDetails?.fees || ''
      }
    };
  }));
}

function parseStock(html, limit = MAX_VISIBLE_CARS) {
  const normalized = html.replace(/\r?\n/g, ' ');
  const linkMatches = [...normalized.matchAll(/<a[^>]+href=["']([^"']*\/usedcar\/spread\/[^"']*\.html[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const seen = new Set();
  const cars = [];

  for (const match of linkMatches) {
    const href = absolutize(match[1]);
    if (!href || seen.has(href) || !isVehicleDetailUrl(href)) continue;
    seen.add(href);

    const start = Math.max(0, match.index - 2200);
    const end = Math.min(normalized.length, match.index + 3200);
    const block = normalized.slice(start, end);
    const anchorTitle = stripTags(match[2]);
    const title = anchorTitle && !/詳細|在庫|一覧|グーネット|画像/.test(anchorTitle) ? anchorTitle : pickTitle(block);
    const image = pickImage(block, href);
    const priceDetails = pickPriceDetails(block);
    const price = priceDetails.total || priceDetails.vehicle || pickPrice(block);
    const text = stripTags(block);
    const year = /(20\d{2}|令和\d+|平成\d+)年/.exec(text)?.[0] || '';
    const mileage = /走行距離\s*([0-9.,]+(?:万)?km)/i.exec(text)?.[1] || '';

    if (!title || title.length > 160) continue;
    cars.push({ title, price, priceDetails, year, mileage, image, url: href });
    if (cars.length >= limit) break;
  }

  return cars;
}

async function buildInventory() {
  const response = await fetchWithTimeout(SHOP_URL, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; MyCarCenterSite/1.0; +https://yamamoto-mycar.com/)',
      'accept-language': 'ja,en;q=0.8'
    }
  }, SHOP_FETCH_TIMEOUT_MS);
  if (!response.ok) throw new Error(`goo-net responded ${response.status}`);

  const buffer = await response.arrayBuffer();
  const html = decodeHtml(buffer, response.headers.get('content-type') || '');
  const cars = await enrichCars(parseStock(html, MAX_VISIBLE_CARS));

  if (!cars.length) throw new Error('no listed cars found');

  return {
    ok: true,
    source: SHOP_URL,
    updatedAt: new Date().toISOString(),
    cars
  };
}

exports.buildInventory = buildInventory;

exports.handler = async (event) => {
  const headers = {
    'access-control-allow-origin': '*',
    // Visitors only read the prepared inventory. Goo-net is never fetched here.
    'cache-control': 'public, max-age=300, stale-while-revalidate=600',
    'netlify-cdn-cache-control': 'public, max-age=900, stale-while-revalidate=3600',
    'content-type': 'application/json; charset=utf-8'
  };

  try {
    connectLambda(event);
    const inventory = await getStore(STORE_NAME).get(STORE_KEY, { type: 'json' });
    if (!inventory || !Array.isArray(inventory.cars) || inventory.cars.length === 0) {
      return {
        statusCode: 200,
        headers: { ...headers, 'x-mcc-stock': 'not-ready' },
        body: JSON.stringify({ ok: false, source: SHOP_URL, cars: [] })
      };
    }

    return {
      statusCode: 200,
      headers: { ...headers, 'x-mcc-stock': 'stored' },
      body: JSON.stringify(inventory)
    };
  } catch (error) {
    return {
      statusCode: 200,
      headers: { ...headers, 'x-mcc-stock': 'read-error' },
      body: JSON.stringify({
        ok: false,
        source: SHOP_URL,
        cars: []
      })
    };
  }
};
