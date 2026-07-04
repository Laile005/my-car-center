const SHOP_URL = 'https://www.goo-net.com/usedcar_shop/1010169/stock.html';

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

function pickImage(block) {
  const img = /<img[^>]+(?:data-src|src)=["']([^"']+)["']/i.exec(block)?.[1];
  return absolutize(img);
}

function pickPrice(block) {
  const text = stripTags(block);
  const price = /(?:支払総額|車両本体価格|本体価格|価格)\s*([0-9.]+万円|ASK|応談)/i.exec(text);
  return price ? price[1] : '';
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

function parseStock(html) {
  const normalized = html.replace(/\r?\n/g, ' ');
  const linkMatches = [...normalized.matchAll(/<a[^>]+href=["']([^"']*(?:usedcar|ucar|catalog)[^"']*\.html[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const seen = new Set();
  const cars = [];

  for (const match of linkMatches) {
    const href = absolutize(match[1]);
    if (!href || seen.has(href) || !href.includes('goo-net.com')) continue;
    seen.add(href);

    const start = Math.max(0, match.index - 2200);
    const end = Math.min(normalized.length, match.index + 3200);
    const block = normalized.slice(start, end);
    const anchorTitle = stripTags(match[2]);
    const title = anchorTitle && !/詳細|在庫|一覧|グーネット|画像/.test(anchorTitle) ? anchorTitle : pickTitle(block);
    const image = pickImage(block);
    const price = pickPrice(block);
    const text = stripTags(block);
    const year = /(20\d{2}|令和\d+|平成\d+)年/.exec(text)?.[0] || '';
    const mileage = /([0-9.]+万?km)/i.exec(text)?.[1] || '';

    if (!title || title.length > 80) continue;
    cars.push({ title, price, year, mileage, image, url: href });
    if (cars.length >= 30) break;
  }

  return cars;
}

exports.handler = async () => {
  const headers = {
    'access-control-allow-origin': '*',
    'cache-control': 'public, max-age=1800, stale-while-revalidate=86400',
    'content-type': 'application/json; charset=utf-8'
  };

  try {
    const response = await fetch(SHOP_URL, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; MyCarCenterSite/1.0; +https://mycarcenter.netlify.app/)',
        'accept-language': 'ja,en;q=0.8'
      }
    });
    if (!response.ok) throw new Error(`goo-net responded ${response.status}`);

    const buffer = await response.arrayBuffer();
    const html = decodeHtml(buffer, response.headers.get('content-type') || '');
    const cars = parseStock(html);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: cars.length > 0,
        source: SHOP_URL,
        updatedAt: new Date().toISOString(),
        cars
      })
    };
  } catch (error) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: false,
        source: SHOP_URL,
        error: String(error),
        cars: []
      })
    };
  }
};
