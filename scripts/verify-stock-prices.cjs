const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = { require: () => ({}), exports: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'netlify/functions/goo-stock.js'), 'utf8'), context);
const result = context.pickPriceDetails(`
  <p>支払総額<span>(税込・リ済込)</span></p><p>101.3<span>万円</span></p>
  <p>車両本体価格<span>(税込)</span></p><p>90<span>万円</span></p>
  <p>諸費用</p><p>11.3<span>万円</span></p>
  <aside>おすすめ車両 支払総額(税込) 45.8万円</aside>
`);
assert.equal(result.total, '101.3万円');
assert.equal(result.vehicle, '90万円');
assert.equal(result.fees, '11.3万円');
assert.equal(context.pickPriceDetails('<p>支払総額（税込） 80万円</p>').total, '80万円');
assert.equal(context.pickPriceDetails('<p>支払総額 ASK</p>').total, 'ASK');
assert.equal(context.pickPriceDetails('<p>価格はお問い合わせください</p>').total, '');
console.log('Stock price extraction checks passed; recommended vehicle price is not selected.');
