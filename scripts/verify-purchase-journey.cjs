const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const root = path.resolve(__dirname, '..');
const origin = 'https://yamamoto-mycar.com';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const output = path.join(root, 'reports', 'purchase-layout');
fs.mkdirSync(output, { recursive: true });

async function localPage(browser, width, count, optOut = false) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
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
      return route.fulfill({ json: { ok: true, cars: Array.from({ length: count }, (_, i) => ({
        title: `Test car ${i + 1} with equipment and a longer model description`,
        url: `https://www.goo-net.com/test-car-${i}`,
        image: '/image/fa-store.webp', year: '2018', mileage: '3.0万km', price: '45.8万円'
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

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
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
      await assertNoOverflow(page, `new-car article ${width}`);
      await page.screenshot({ path: path.join(output, `new-car-${width}.png`), fullPage: true });
      assert.deepEqual(errors, []);
      await page.close();
    }
    const { page } = await localPage(browser, 1365, 1, true);
    await page.goto(`${origin}/used-cars/`, { waitUntil: 'networkidle' });
    await page.locator('.stock-consultation [data-used-car-action="flow"]').click();
    assert.equal(await page.evaluate(() => window.testEvents.length), 0, 'Opt-out must suppress all analytics');
    await page.close();
    console.log('Purchase journey passed: 0/1/2/3 cars at desktop/tablet/mobile, stacked links, consultation tracking, phone prompt, opt-out, and sourced article layout.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
