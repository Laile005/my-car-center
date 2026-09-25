const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rows = [['timestamp', 'last_name', 'first_name', 'kana_last', 'kana_first', 'email', 'phone', 'exp_years', 'age', 'msg']];
let maxColumns = 10;
let failMail = false;
const sent = [];
const sheet = {
  getMaxColumns: () => maxColumns,
  insertColumnsAfter: (_after, count) => { maxColumns += count; },
  getLastRow: () => rows.length,
  getRange(row, col, height = 1, width = 1) {
    return {
      getValues: () => Array.from({ length: height }, (_, i) =>
        Array.from({ length: width }, (_, j) => rows[row + i - 1]?.[col + j - 1] || '')),
      setValues(values) {
        values.forEach((valuesRow, i) => {
          rows[row + i - 1] ||= [];
          valuesRow.forEach((value, j) => { rows[row + i - 1][col + j - 1] = value; });
        });
      },
      setValue(value) { rows[row - 1][col - 1] = value; },
      createTextFinder(needle) {
        return {
          matchEntireCell() { return this; },
          findNext() { return rows.slice(row - 1, row - 1 + height).some((item) => item[col - 1] === needle); },
        };
      },
    };
  },
  appendRow(values) { rows.push(values); },
};

const context = {
  SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }), flush() {} },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  MailApp: { sendEmail(message) { if (failMail) throw new Error('Mail unavailable'); sent.push(message); } },
  Utilities: { getUuid: () => 'fallback-id' },
  Logger: { log() {} },
  HtmlService: {
    XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
    createHtmlOutput(html) { return { html, setXFrameOptionsMode() { return this; } }; },
  },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'docs', 'gas-doPost-improved.js'), 'utf8'), context);

function submit(overrides = {}) {
  const parameter = {
    origin: 'https://yamamoto-mycar.com',
    submission_id: 'a'.repeat(32),
    last_name: '山田', first_name: '太郎', kana_last: 'やまだ', kana_first: 'たろう',
    email: 'test@example.com', phone: '090-1234-5678', exp_years: '未経験', age: '', msg: '',
    ...overrides,
  };
  const result = context.doPost({ parameter });
  const match = result.html.match(/postMessage\((\{.*?\}), "https:\/\/yamamoto-mycar.com"\)/);
  assert.ok(match, 'response must target the site origin');
  return JSON.parse(match[1]);
}

assert.equal(submit().ok, true);
assert.equal(rows.length, 2);
assert.equal(rows[0][10], 'submission_id');
assert.equal(rows[1][11], 'sent');
assert.equal(sent.length, 1);

assert.equal(submit().ok, true);
assert.equal(rows.length, 2, 'retry with the same ID must not append again');
assert.equal(sent.length, 1, 'retry with the same ID must not email again');

failMail = true;
assert.equal(submit({ submission_id: 'b'.repeat(32), msg: '=SUM(1,1)' }).ok, true);
assert.equal(rows.length, 3);
assert.equal(rows[2][9], "'=SUM(1,1)");
assert.equal(rows[2][11], 'failed');
assert.equal(submit({ submission_id: 'b'.repeat(32) }).ok, true);
assert.equal(rows.length, 3);

assert.equal(submit({ submission_id: 'c'.repeat(32), phone: '123' }).ok, false);
assert.equal(rows.length, 3);
console.log('Recruit GAS save, retry, mail failure, and validation checks passed.');
