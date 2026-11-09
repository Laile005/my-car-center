const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..', '..');
const source = path.join(root, 'reports', 'marketing-data');
const output = path.join(root, 'reports', 'marketing-archive-bootstrap');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8'), context);
const snapshots = [];
function visit(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) visit(file);
    else if (item.name === 'report-data.json') {
      const stat = fs.statSync(file);
      const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
      const data = context.archiveSanitize_(JSON.parse(text));
      const encoded = JSON.stringify(data);
      if (/-----BEGIN (RSA )?PRIVATE KEY-----|"(?:authorization|access_token|refresh_token|private_key|client_secret)"\s*:/i.test(encoded)) throw new Error('Potential credential in archive; aborting');
      snapshots.push({ originalPath: path.relative(source, file).split(path.sep).join('/'), localFileModifiedAt: stat.mtime.toISOString(), ranges: { ga4: 'unknown unless independently documented in the associated report', searchConsole: data.searchConsole ? { start: data.searchConsole.startDate || null, end: data.searchConsole.endDate || null } : null, clarity: 'rolling window at the original collection time; exact request time may not be preserved in legacy data' }, data });
    }
  }
}
visit(source);
fs.mkdirSync(output, { recursive: true });
const destination = path.join(output, 'legacy-marketing-snapshots.json');
fs.writeFileSync(destination, JSON.stringify({ schemaVersion: 1, preparedAt: new Date().toISOString(), kind: 'legacy-import', limitations: 'Preserves available historical report snapshots. Not a continuous daily series; overlapping periods must not be summed. Local file modification time is provenance, not proof of the original API collection time. Credentials and sensitive URL query parameters are excluded.', snapshots }, null, 2));
console.log(JSON.stringify({ snapshots: snapshots.length, file: destination, bytes: fs.statSync(destination).size }));
