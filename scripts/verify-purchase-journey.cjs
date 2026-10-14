const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const root = path.resolve(__dirname, '..');
const origin = 'https://yamamoto-mycar.com';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const output = path.join(root, 'reports', 'purchase-layout');
fs.mkdirSync(output, { recursive: true });

async function localPage(browser, width, count, optOut = false, options = {}) {
  const page = await browser.newPage({ viewport: { width, height: options.height || 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ optOut }) => {
    window.testEvents = [];
    window.gtag = (...args) => { if (args[0] === 'event') window.testEvents.push({ name: args[1], params: args[2] }); };
    window.clarity = () => {};
    if (optOut) localStorage.setItem('mcc_analytics_optout', '1');
  }, { optOut });
  // All network requests are intercepted; tests cannot create live analytics or inquiries.
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === '/.netlify/functions/inventory-feed') {
      if (options.inventoryDelay) await new Promise(resolve => setTimeout(resolve, options.inventoryDelay));
      if (options.inventoryError) return route.fulfill({ status: 503, json: { ok: false } });
      return route.fulfill({ json: { ok: true, cars: Array.from({ length: count }, (_, i) => ({
        title: i === 0 ? 'スズキ アルトラパン S 衝突軽減ブレーキ 全方位モニター フルセグ SDナビ ETC 運転席シートヒーター' : `検証用車両 ${i + 1}`,
        url: `https://www.goo-net.com/test-car-${i}`,
        image: '/image/fa-store.webp', year: '2018', mileage: '3.0万km', price: '101.3万円',
        priceDetails: { total: '101.3万円', vehicle: '90万円', fees: '11.3万円' }
      })) } });
    }
    const pathname = decodeURIComponent(url.pathname);
    const file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      return route.fulfill({ status: 404, body: 'Not found' });
    }
    return route.fulfill({ contentType: types[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
  });
  return { page, errors };
}

async function assertNoOverflow(page, label) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${label}: horizontal overflow`);
}

async function assertStockFirstView(page, count, label) {
  const visible = await page.evaluate(() => {
    const image = document.querySelector('.stock-card__image') || document.querySelector('.stock-empty') || document.getElementById('stock-status');
    const rect = image.getBoundingClientRect();
    const header = document.querySelector('.site-header').getBoundingClientRect();
    return { top: rect.top, height: rect.height, visibleHeight: Math.min(rect.bottom, innerHeight) - Math.max(rect.top, header.bottom), statusOnly: image.id === 'stock-status', scrollY };
  });
  assert.equal(visible.scrollY, 0, `${label}: initial view must not auto-scroll`);
  assert(visible.visibleHeight >= (count ? Math.min(160, visible.height) - 1 : visible.statusOnly ? 24 : 60), `${label}: inventory must be visible without scrolling: ${JSON.stringify(visible)}`);
  if (count) {
    await page.waitForFunction(() => window.testEvents.filter(event => event.name === 'used_car_stock_view').length === 1);
    assert.equal(await page.locator('.stock-card img').first().evaluate(img => img.complete && img.naturalWidth > 0), true);
  } else {
    assert.equal(await page.evaluate(() => window.testEvents.filter(event => event.name === 'used_car_stock_view').length), 0, 'Empty inventory is not a car view');
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const [width, height] of [[320, 568], [375, 667], [390, 844], [768, 800], [1024, 768], [1365, 768], [1920, 1080]]) {
      for (const count of [0, 1, 2, 3]) {
        const { page, errors } = await localPage(browser, width, count, false, { height });
        await page.goto(`${origin}/used-cars/`, { waitUntil: 'networkidle' });
        assert.equal(await page.locator('main > section').first().getAttribute('id'), 'stock');
        assert.equal(await page.locator('h1').count(), 1);
        await assertStockFirstView(page, count, `${width}x${height}/${count}`);
        await assertNoOverflow(page, `first view ${width}x${height}/${count}`);
        if (count > 1 && width > 700) {
          const cards = await page.locator('.stock-card').evaluateAll(nodes => nodes.map(node => ({ top: node.getBoundingClientRect().top, height: node.getBoundingClientRect().height })));
          assert(cards.every(card => Math.abs(card.top - cards[0].top) <= 1 && Math.abs(card.height - cards[0].height) <= 1), 'Inventory cards must align and have equal heights');
        }
        if ([320, 390, 1365].includes(width) && count > 0) await page.screenshot({ path: path.join(output, `inventory-first-view-${width}-${count}.png`) });
        assert.deepEqual(errors, []);
        await page.close();
      }
    }
    for (const inventoryError of [false, true]) {
      const { page, errors } = await localPage(browser, 375, 1, false, { height: 667, inventoryDelay: 1500, inventoryError });
      await page.goto(`${origin}/used-cars/`, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.locator('#stock-status').textContent(), '在庫情報を読み込んでいます…');
      await assertStockFirstView(page, 0, 'Loading');
      await page.waitForFunction(() => document.getElementById('stock-grid').dataset.state);
      assert.equal(await page.locator('#stock-grid').getAttribute('data-state'), inventoryError ? 'unavailable' : 'ready');
      await assertStockFirstView(page, inventoryError ? 0 : 1, inventoryError ? 'API error' : 'Delayed inventory');
      assert.deepEqual(errors, []);
      await page.close();
    }
    for (const width of [1365, 768, 390]) {
      for (const count of [0, 1, 2, 3]) {
        const { page, errors } = await localPage(browser, width, count);
        await page.goto(`${origin}/used-cars/`, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => typeof window.MCCTrackEvent === 'function');
        assert.equal(await page.locator('#stock-grid').getAttribute('data-count'), String(count));
        assert.equal(await page.locator('.stock-card').count(), count);
        await page.locator('.stock-consultation').scrollIntoViewIfNeeded();
        await page.waitForFunction(() => window.testEvents.some(event => event.name === 'used_car_consultation_view'));
        const actions = await page.locator('.stock-consultation .decision-guide__actions > a').evaluateAll(nodes => nodes.map(node => ({ top: node.getBoundingClientRect().top, bottom: node.getBoundingClientRect().bottom })));
        assert.equal(actions.length, 3);
        assert(actions[1].top >= actions[0].bottom, `${width}/${count}: flow link must be below phone button`);
        assert(actions[2].top >= actions[1].bottom, `${width}/${count}: urgent link must be below flow link`);
        await assertNoOverflow(page, `stock ${width}/${count}`);
        await page.locator('.stock-consultation [data-used-car-action="flow"]').click();
        const flowClicks = await page.evaluate(() => window.testEvents.filter(event => event.name === 'used_car_consultation_click' && event.params.consultation_action === 'flow').length);
        assert.equal(flowClicks, 1);
        if (width === 1365 && count === 1) {
          await page.locator('.stock-consultation [data-used-car-action="phone"]').click();
          assert.equal(await page.locator('.phone-modal').evaluate(node => node.classList.contains('show')), true);
          assert.equal(await page.evaluate(() => window.testEvents.filter(event => event.name === 'used_car_consultation_click' && event.params.consultation_action === 'phone').length), 1);
          assert.equal(await page.evaluate(() => window.testEvents.filter(event => event.name === 'phone_prompt_open').length), 1);
          await page.locator('.phone-modal__close').click();
        }
        if (count === 1 && width !== 768) await page.locator('#stock').screenshot({ path: path.join(output, `stock-${width}.png`) });
        assert.deepEqual(errors, []);
        await page.close();
      }
      const { page, errors } = await localPage(browser, width, 1);
      await page.goto(`${origin}/column/used-car-order-repair-sourcing/`, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('.article__note [data-used-car-action="flow"]').getAttribute('href'), '../../used-cars/#order-consultation');
      await assertNoOverflow(page, `sourcing article ${width}`);
      await page.goto(`${origin}/column/new-car-delivery-regional-stock/`, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('.article__body a[href^="https://"]').count() >= 16, true);
      const serviceLink = page.locator('.article__note [data-new-car-action="service"]');
      assert.equal(await serviceLink.getAttribute('href'), '../../new-cars/#new-car-flow');
      await serviceLink.evaluate(node => node.addEventListener('click', event => event.preventDefault(), { once: true }));
      await serviceLink.click();
      assert.equal(await page.evaluate(() => window.testEvents.filter(event => event.name === 'new_car_service_click').length), 1);
      await assertNoOverflow(page, `new-car article ${width}`);
      await page.screenshot({ path: path.join(output, `new-car-${width}.png`), fullPage: true });
      await page.goto(`${origin}/new-cars/`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => typeof window.MCCTrackEvent === 'function');
      await page.locator('[data-new-car-consultation]').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => window.testEvents.some(event => event.name === 'new_car_consultation_view'));
      const newCarActions = await page.locator('#new-car-delivery-consultation .decision-guide__actions > a').evaluateAll(nodes => nodes.map(node => ({ top: node.getBoundingClientRect().top, bottom: node.getBoundingClientRect().bottom })));
      assert(newCarActions[1].top >= newCarActions[0].bottom, `new-car ${width}: guide must be below phone button`);
      await page.locator('.service-detail-hero [data-new-car-action="flow"]').click();
      assert.equal(await page.evaluate(() => window.testEvents.filter(event => event.name === 'new_car_flow_click').length), 1);
      const guideLink = page.locator('#new-car-delivery-consultation [data-new-car-action="guide"]');
      await guideLink.evaluate(node => node.addEventListener('click', event => event.preventDefault(), { once: true }));
      await guideLink.click();
      assert.equal(await page.evaluate(() => window.testEvents.filter(event => event.name === 'new_car_guide_click').length), 1);
      if (width === 1365) {
        await page.locator('#new-car-delivery-consultation [data-new-car-action="phone"]').click();
        assert.equal(await page.locator('.phone-modal').evaluate(node => node.classList.contains('show')), true);
        assert.equal(await page.evaluate(() => window.testEvents.filter(event => event.name === 'new_car_consultation_click').length), 1);
        assert.equal(await page.evaluate(() => window.testEvents.filter(event => event.name === 'phone_prompt_open').length), 1);
        await page.locator('.phone-modal__close').click();
      }
      await assertNoOverflow(page, `new-car service ${width}`);
      await page.screenshot({ path: path.join(output, `new-car-service-${width}.png`), fullPage: true });
      for (const slug of ['new-car-domestic-makers', 'new-car-aftermarket-parts']) {
        await page.goto(`${origin}/column/${slug}/`, { waitUntil: 'networkidle' });
        assert.equal(await page.locator('[data-new-car-action="service"]').getAttribute('href'), '../../new-cars/');
        assert.equal(await page.locator('[data-new-car-action="guide"]').getAttribute('href'), '../new-car-delivery-regional-stock/');
        await assertNoOverflow(page, `${slug} ${width}`);
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    const { page } = await localPage(browser, 1365, 1, true);
    await page.goto(`${origin}/used-cars/`, { waitUntil: 'networkidle' });
    await page.locator('.stock-consultation [data-used-car-action="flow"]').click();
    assert.equal(await page.evaluate(() => window.testEvents.length), 0, 'Opt-out must suppress all analytics');
    await page.goto(`${origin}/new-cars/`, { waitUntil: 'networkidle' });
    await page.locator('.service-detail-hero [data-new-car-action="flow"]').click();
    assert.equal(await page.evaluate(() => window.testEvents.length), 0, 'Opt-out must suppress new-car analytics');
    await page.close();
    console.log('Purchase journey passed: stock first view at 7 screen sizes with 0/1/2/3 cars, loading/errors, equal card heights, image rendering, consultation tracking, phone prompt, and opt-out.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
