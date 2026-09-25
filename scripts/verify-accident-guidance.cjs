const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pages = [
  'insurance-repair/index.html',
  'column/accident-repair-first/index.html',
  'column/accident-car-still-drivable/index.html',
  'column/insurance-repair-customer-flow/index.html',
  'column/insurance-use-or-self-pay/index.html',
  'column/bankin-paint-insurance/index.html',
  'column/insurance-repair-ja-kyosai/index.html',
  'column/insurance-repair-loaner-delivery/index.html',
];

for (const relativePath of pages) {
  const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const body = html.slice(html.indexOf('<body'));
  const police = body.indexOf('警察への届出');
  const shop = Math.max(body.indexOf('山本マイカーへ', police), body.indexOf('当社へお電話', police));
  const insurer = Math.max(body.indexOf('保険会社への事故', shop), body.indexOf('JA共済への事故', shop));

  assert.ok(police >= 0, `${relativePath}: police-report guidance is missing`);
  assert.ok(shop > police, `${relativePath}: shop call must follow police-report guidance`);
  assert.ok(insurer > shop, `${relativePath}: customer insurer report must follow shop guidance`);
  assert.doesNotMatch(body, /保険会社への(?:事故受付|事故連絡|契約確認)[^。]{0,40}(?:代行|当社が行)/, `${relativePath}: insurer reporting must not be presented as shop work`);

  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    assert.doesNotThrow(() => JSON.parse(match[1]), `${relativePath}: invalid JSON-LD`);
  }
}

console.log(`Accident guidance checks passed for ${pages.length} pages.`);
