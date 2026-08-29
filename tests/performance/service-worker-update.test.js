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

test('warm code navigation uses stale while revalidate without private API cache', () => {
  const worker = read('mcu-management/sw.js');
  const codeBranch = worker.match(/if \(url\.pathname\.endsWith\('\.js'\)[\s\S]*?\n  }/)?.[0] || '';

  assert.match(codeBranch, /staleWhileRevalidateStrategy/);
  assert.doesNotMatch(worker, /const API_CACHE|apiNetworkFirstStrategy/);
});

test('login critical path contains no demo database seeding', () => {
  const login = read('mcu-management/pages/login.html');

  assert.doesNotMatch(login, /seedData|checkAndSeedIfEmpty|dbReady|initDatabase/);
});

test('application and service-worker release versions stay aligned', () => {
  const worker = read('mcu-management/sw.js');
  const manifest = JSON.parse(read('mcu-management/version.json'));
  const cacheVersion = worker.match(/const CACHE_VERSION = 'madis-v([^']+)'/)?.[1];

  assert.equal(cacheVersion, manifest.version);
  assert.match(worker, /'\/js\/utils\/pageLifecycleManager\.js'/);
});
