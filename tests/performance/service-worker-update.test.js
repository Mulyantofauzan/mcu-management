const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('first service-worker install never triggers an application reload', () => {
  const bootstrap = read('mcu-management/js/appBootstrap.js');
  assert.match(bootstrap, /const hadController = Boolean\(navigator\.serviceWorker\.controller\)/);
  assert.match(bootstrap, /if \(!hadController\) return/);
  assert.doesNotMatch(bootstrap, /url\.searchParams\.set\('appVersion'/);
});
test('updates expose one explicit activation path', () => {
  const bootstrap = read('mcu-management/js/appBootstrap.js');
  const worker = read('mcu-management/sw.js');

  assert.match(bootstrap, /madis:update-available/);
  assert.match(bootstrap, /activateWaitingWorker/);
  assert.doesNotMatch(worker, /\.then\(\(\) => self\.skipWaiting\(\)\)/);
  assert.match(worker, /event\.data\?\.type === 'SKIP_WAITING'/);
});

test('private API responses remain network-only', () => {
  const worker = read('mcu-management/sw.js');
  const apiBranch = worker.match(/if \(url\.pathname\.includes\('\/api\/'\)\)[\s\S]*?\n  }/)?.[0] || '';

  assert.match(apiBranch, /networkOnlyStrategy/);
  assert.doesNotMatch(apiBranch, /caches|cache\.put|API_CACHE/);
});
