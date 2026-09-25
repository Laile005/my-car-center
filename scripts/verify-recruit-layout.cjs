const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(data);
  });
});

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const width of [1365, 768, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(`${base}/recruit.html`, { waitUntil: 'domcontentloaded' });
      const boxes = await page.locator('.rg-decision-guide .decision-guide__actions > *').evaluateAll((nodes) =>
        nodes.map((node) => ({ top: node.getBoundingClientRect().top, bottom: node.getBoundingClientRect().bottom })));
      assert.equal(boxes.length, 3);
      assert.ok(boxes[1].top >= boxes[0].bottom, `${width}px: first link must be below the button`);
      assert.ok(boxes[2].top >= boxes[1].bottom, `${width}px: second link must be below the first`);
      assert.equal(await page.locator('h2#entry-title').textContent(), '応募・見学の相談');

      if (width === 1365 || width === 390) {
        const size = width === 1365 ? 'desktop' : 'mobile';
        await page.locator('.rg-decision-guide').screenshot({ path: path.join(os.tmpdir(), `recruit-guide-${size}.png`) });
        await page.locator('.rg-entry').screenshot({ path: path.join(os.tmpdir(), `recruit-entry-${size}.png`) });
      }

      const phone = page.locator('input[name="phone"]');
      await phone.fill('084-976-1000');
      assert.equal(await phone.evaluate((el) => el.checkValidity()), true);
      await phone.fill('09012345678');
      assert.equal(await phone.evaluate((el) => el.checkValidity()), true);
      await phone.fill('123');
      assert.equal(await phone.evaluate((el) => el.checkValidity()), false);

      if (width === 1365) {
        let posted;
        await page.route('https://script.google.com/macros/s/**', async (route) => {
          posted = new URLSearchParams(route.request().postData());
          const payload = JSON.stringify({ ok: true, submissionId: posted.get('submission_id') });
          await route.fulfill({ status: 200, contentType: 'text/html', body: `<script>window.top.postMessage(${payload}, ${JSON.stringify(base)});</script>` });
        });
        await page.locator('input[name="last_name"]').fill('山田');
        await page.locator('input[name="first_name"]').fill('太郎');
        await page.locator('input[name="kana_last"]').fill('やまだ');
        await page.locator('input[name="kana_first"]').fill('たろう');
        await page.locator('input[name="email"]').fill('test@example.com');
        await phone.fill('09012345678');
        await page.locator('select[name="exp_years"]').selectOption({ label: '未経験' });
        await page.locator('#consent').check();
        await page.locator('#submit-btn').click();
        await page.locator('#entry-result').getByText('送信ありがとうございました。担当よりご連絡します。').waitFor();
        assert.match(posted.get('submission_id'), /^[a-f0-9]{32}$/);
        assert.equal(await page.locator('#origin-field').inputValue(), base);
        assert.equal(await page.locator('#submission-id-field').inputValue(), '');
      }
      await page.close();
    }
    console.log('Recruit guide layout, phone validation, and mocked form submission passed.');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error); server.close(); process.exitCode = 1; });
