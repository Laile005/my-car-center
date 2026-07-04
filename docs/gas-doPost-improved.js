function doPost(e) {
  const SHEET_ID = '1xEsB3YJvbvD5JKaSU95RmczIKUJpROQulwzYEardG4Q';
  const SHEET_NAME = '応募者名簿';
  const ALLOWED_ORIGINS = ['https://mycarcenter.netlify.app'];
  const TO = 'mmaika@eos.ocn.ne.jp';
  const CC = 'ac.side.job19@gmail.com';

  const p = (e && e.parameter) || {};
  const origin = ALLOWED_ORIGINS.includes(p.origin) ? p.origin : ALLOWED_ORIGINS[0];

  try {
    if (p.hp) return HtmlService.createHtmlOutput('OK');

    const required = ['last_name', 'first_name', 'kana_last', 'kana_first', 'email', 'phone', 'exp_years'];
    const missing = required.filter((key) => !String(p[key] || '').trim());
    if (missing.length) throw new Error('必須項目が不足しています: ' + missing.join(', '));

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email || '')) {
      throw new Error('メールアドレスの形式が正しくありません');
    }
    if (!/^(070|080|090)-\d{4}-\d{4}$/.test(p.phone || '')) {
      throw new Error('電話番号の形式が正しくありません');
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const ss = SpreadsheetApp.openById(SHEET_ID);
      let sh = ss.getSheetByName(SHEET_NAME);
      if (!sh) {
        sh = ss.insertSheet(SHEET_NAME);
        sh.getRange(1, 1, 1, 11).setValues([[
          'timestamp', 'last_name', 'first_name', 'kana_last', 'kana_first',
          'email', 'phone', 'exp_years', 'age', 'msg', 'origin'
        ]]);
      }

      sh.appendRow([
        new Date(),
        p.last_name || '', p.first_name || '',
        p.kana_last || '', p.kana_first || '',
        p.email || '', p.phone || '',
        p.exp_years || '', p.age || '',
        p.msg || '', p.origin || ''
      ]);
    } finally {
      lock.releaseLock();
    }

    const name = `${p.last_name || ''} ${p.first_name || ''}`.trim();
    const subject = `【新しい応募者のお知らせ】${name} さんが採用サイトから求人に応募しました`;
    const body = [
      '採用サイトから求人に応募がありました。',
      '',
      `姓: ${p.last_name || ''}`,
      `名: ${p.first_name || ''}`,
      `姓(カナ): ${p.kana_last || ''}`,
      `名(カナ): ${p.kana_first || ''}`,
      `メール: ${p.email || ''}`,
      `電話: ${p.phone || ''}`,
      `経験年数: ${p.exp_years || ''}`,
      `年齢: ${p.age || ''}`,
      'メッセージ:',
      p.msg || ''
    ].join('\n');

    MailApp.sendEmail({ to: TO, cc: CC, subject, body });
    return postMessageOutput(origin, { ok: true });
  } catch (err) {
    return postMessageOutput(origin, { ok: false, error: String(err) });
  }
}

function postMessageOutput(targetOrigin, payload) {
  const html = `
    <!doctype html><meta charset="utf-8">
    <script>
      try {
        window.top && window.top.postMessage(${JSON.stringify(payload)}, ${JSON.stringify(targetOrigin)});
      } catch(e) {}
    </script>
    <p>${payload.ok ? 'OK' : 'NG'}</p>`;

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
