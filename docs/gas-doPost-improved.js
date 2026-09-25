// Copy this file into the existing Apps Script project, then update its current web-app deployment.
function doPost(e) {
  const SHEET_ID = '1xEsB3YJvbvD5JKaSU95RmczIKUJpROQulwzYEardG4Q';
  const SHEET_NAME = '応募者名簿';
  const SITE_ORIGIN = 'https://yamamoto-mycar.com';
  const TO = 'mmaika@eos.ocn.ne.jp';
  const CC = 'ac.side.job19@gmail.com';
  const p = (e && e.parameter) || {};

  if (p.hp) return HtmlService.createHtmlOutput('OK');

  const reply = (payload) => postMessageOutput(SITE_ORIGIN, payload);
  let saved = false;
  let row = 0;
  let sheet;
  let submissionId;

  try {
    if (p.origin !== SITE_ORIGIN) throw new Error('Unexpected form origin');

    const required = ['last_name', 'first_name', 'kana_last', 'kana_first', 'email', 'phone', 'exp_years'];
    if (required.some((key) => !String(p[key] || '').trim())) throw new Error('Missing required field');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(p.email))) throw new Error('Invalid email');
    if (!/^0\d{9,10}$/.test(String(p.phone).replace(/-/g, ''))) throw new Error('Invalid phone');

    // The current site sends this ID. Older cached pages can still submit without one.
    submissionId = /^[a-f0-9]{32}$/i.test(String(p.submission_id || ''))
      ? String(p.submission_id).toLowerCase()
      : Utilities.getUuid();

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const ss = SpreadsheetApp.openById(SHEET_ID);
      sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
      ensureSubmissionColumns(sheet);

      if (sheet.getLastRow() > 1) {
        const ids = sheet.getRange(2, 11, sheet.getLastRow() - 1, 1);
        if (ids.createTextFinder(submissionId).matchEntireCell(true).findNext()) {
          return reply({ ok: true, submissionId });
        }
      }

      sheet.appendRow([
        new Date(),
        safeSheetText(p.last_name), safeSheetText(p.first_name),
        safeSheetText(p.kana_last), safeSheetText(p.kana_first),
        safeSheetText(p.email), safeSheetText(p.phone),
        safeSheetText(p.exp_years), safeSheetText(p.age),
        safeSheetText(p.msg), submissionId, 'pending'
      ]);
      row = sheet.getLastRow();
      saved = true;
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    const name = `${p.last_name} ${p.first_name}`;
    const subject = `【採用サイトからの応募・相談】${name} さんから連絡がありました`;
    const body = [
      '採用サイトから応募または相談がありました。', '',
      `姓: ${p.last_name}`, `名: ${p.first_name}`,
      `姓(カナ): ${p.kana_last}`, `名(カナ): ${p.kana_first}`,
      `メール: ${p.email}`, `電話: ${p.phone}`,
      `経験年数: ${p.exp_years}`, `年齢: ${p.age || ''}`,
      '相談内容・コメント:', p.msg || ''
    ].join('\n');

    let notificationStatus = 'sent';
    try {
      MailApp.sendEmail({ to: TO, cc: CC, subject, body });
    } catch (mailError) {
      notificationStatus = 'failed';
      Logger.log('Recruit notification failed for row ' + row + ': ' + mailError);
    }
    try {
      sheet.getRange(row, 12).setValue(notificationStatus);
    } catch (statusError) {
      Logger.log('Recruit status update failed for row ' + row + ': ' + statusError);
    }
    // A saved application is successful even if the notification email failed.
    return reply({ ok: true, submissionId });
  } catch (err) {
    Logger.log('Recruit submission failed: ' + err);
    return reply({ ok: saved, submissionId, error: saved ? undefined : '送信を確認できませんでした' });
  }
}

function ensureSubmissionColumns(sheet) {
  const headers = [
    'timestamp', 'last_name', 'first_name', 'kana_last', 'kana_first',
    'email', 'phone', 'exp_years', 'age', 'msg', 'submission_id', 'notification_status'
  ];
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }
  const extraHeaders = sheet.getRange(1, 11, 1, 2).getValues()[0];
  if (extraHeaders.some((value, index) => value && value !== headers[index + 10])) {
    throw new Error('Unexpected existing columns after msg');
  }
  sheet.getRange(1, 11, 1, 2).setValues([[headers[10], headers[11]]]);
}

function safeSheetText(value) {
  const text = String(value || '');
  return /^\s*[=+\-@]/.test(text) ? "'" + text : text;
}

function postMessageOutput(targetOrigin, payload) {
  const data = JSON.stringify(payload).replace(/</g, '\\u003c');
  const html = `<!doctype html><meta charset="utf-8"><script>
    try { window.top.postMessage(${data}, ${JSON.stringify(targetOrigin)}); } catch(e) {}
  </script><p>${payload.ok ? 'OK' : 'NG'}</p>`;
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
