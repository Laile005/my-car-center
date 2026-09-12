const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = { URL, document: { addEventListener() {} } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8'), context);

for (const origin of [
  'https://script.google.com',
  'https://script.googleusercontent.com',
  'https://n-123-example-script.googleusercontent.com',
]) {
  assert.equal(context.isGasSubmissionResponse(origin, { ok: true }), true, origin);
  assert.equal(context.isGasSubmissionResponse(origin, { ok: false }), true, origin);
  for (const data of [null, {}, { ok: 'true' }, { ok: 1 }, 'success']) {
    assert.equal(context.isGasSubmissionResponse(origin, data), false);
  }
}
for (const origin of [
  'http://script.google.com',
  'https://script.google.com:8080',
  'https://script.google.com.example.org',
  'https://example-script.googleusercontent.com.example.org',
  'https://example.org',
  'null',
]) {
  assert.equal(context.isGasSubmissionResponse(origin, { ok: true }), false, origin);
}
console.log('Recruit feedback origin/payload checks passed.');
