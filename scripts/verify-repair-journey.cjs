const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { localPage, assertNoOverflow } = require('./verify-purchase-journey.cjs');

const origin = 'https://yamamoto-mycar.com';
const output = path.resolve(__dirname, '..', 'reports', 'repair-layout');
fs.mkdirSync(output, { recursive: true });

async function checkMap(page, link) {
  const url = new URL(await link.getAttribute('href'));
  assert.equal(url.hostname, 'www.google.com');
  assert.equal(url.pathname, '/maps/search/');
  assert.equal(url.searchParams.get('api'), '1');
  assert(url.searchParams.get('query').includes('福山市駅家町坊寺174-2'));
  const before = await page.evaluate(() => window.testEvents.filter(event => event.name === 'directions_click').length);
  await link.evaluate(node => node.addEventListener('click', event => event.preventDefault(), { once: true }));
  await link.click();
  assert.equal(await page.evaluate(() => window.testEvents.filter(event => event.name === 'directions_click').length), before + 1);
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const width of [320, 390, 768, 1365]) {
      const { page, errors } = await localPage(browser, width, 0);
      for (const route of ['/bankin-toso/', '/column/bankin-price-varies/', '/column/old-car-disposal-cost/', '/company-guide/', '/']) {
        await page.goto(origin + route, { waitUntil: 'networkidle' });
        assert.equal(await page.locator('h1').count(), 1);
        await assertNoOverflow(page, `${route} ${width}`);
        const maps = page.locator('[data-directions-link]');
        if (await maps.count()) await checkMap(page, maps.first());
        if (route === '/bankin-toso/') {
          const titleUnits = await page.locator('.repair-title-unit').evaluateAll(nodes => nodes.map(node => {
            const range = document.createRange();
            range.selectNodeContents(node);
            return range.getClientRects().length;
          }));
          assert.equal(titleUnits.length, 6);
          assert(titleUnits.every(lines => lines === 1), 'Repair title terms must not split across lines');
          assert.equal(await page.locator('#repair-cost-options .guide-card').count(), 3);
          if (width === 390 || width === 1365) {
            await page.locator('#repair-cost-options').screenshot({ path: path.join(output, `repair-cost-options-${width}.png`), style: '.site-header { visibility: hidden !important; }' });
          }
          if (width === 1365) {
            const cards = await page.locator('#repair-cost-options .guide-card').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
            assert(Math.max(...cards) - Math.min(...cards) <= 1, 'Repair cards must be equal height');
            await page.locator('.service-detail-hero a[href^="tel:"]').click();
            assert.equal(await page.locator('.phone-modal').evaluate(node => node.classList.contains('show')), true);
            await page.locator('.phone-modal__close').click();
          }
        }
        if (route === '/column/old-car-disposal-cost/') {
          const article = await page.evaluate(() => JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent));
          assert.equal(article.headline, await page.locator('h1').textContent());
          assert.equal(article.datePublished, '2026-11-09');
          assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), origin + route);
          const body = await page.locator('.article__body').textContent();
          assert(body.includes('無理に運転して持ち込まないでください'));
          assert(body.includes('無料での引取を保証するものではありません'));
          assert(body.includes('自治体に登録された引取業者'));
          assert.equal(await page.locator('.article__body a[href^="https://www.jarc.or.jp/"]').count(), 3);
          assert.equal(await page.locator('.article__body a[href^="https://www.kokusen.go.jp/"]').count(), 1);
        }
        const bounds = await page.locator('main .decision-guide__actions a').evaluateAll(nodes => nodes.map(node => ({ left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right })));
        assert(bounds.every(rect => rect.left >= 0 && rect.right <= width + 1), `${route} ${width}: action overflow`);
        if (width !== 768 && route !== '/') {
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: path.join(output, `${route.split('/').filter(Boolean).pop()}-${width}.png`) });
        }
      }
      await page.goto(origin + '/column/', { waitUntil: 'networkidle' });
      const total = await page.locator('#all-articles .column-card').count();
      const seen = new Set();
      const pages = await page.locator('.article-pagination__button').count();
      for (let number = 1; number <= pages; number++) {
        await page.locator(`.article-pagination__button[data-page="${number}"]`).click();
        const visible = await page.locator('#all-articles .column-card:visible a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
        assert.equal(visible.length, Math.min(12, total - (number - 1) * 12));
        visible.forEach(href => seen.add(href));
      }
      assert.equal(seen.size, total, 'Every article must be reachable through pagination');
      assert(seen.has('old-car-disposal-cost/'));
      assert(seen.has('used-car-order-consultation/'));
      assert(seen.has('used-car-order-repair-sourcing/'));
      await assertNoOverflow(page, `article hub ${width}`);
      assert.deepEqual(errors, []);
      await page.close();
    }
    const { page } = await localPage(browser, 1365, 0, true);
    await page.goto(origin + '/bankin-toso/', { waitUntil: 'networkidle' });
    const link = page.locator('[data-directions-link]').first();
    await link.evaluate(node => node.addEventListener('click', event => event.preventDefault(), { once: true }));
    await link.click();
    assert.equal(await page.evaluate(() => window.testEvents.length), 0, 'Opt-out must also suppress map tracking');
    await page.close();
    console.log('Repair journey passed: 4 screen widths, cost cards, disposal article sources and caveats, phone/map actions, privacy, and complete article pagination.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
