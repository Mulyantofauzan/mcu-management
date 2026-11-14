const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const app = path.join(root, 'mcu-management');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

function walk(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'vendor'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else found.push(full);
  }
  return found;
}

test('approval workflow pages, assets and server code are gone', () => {
  const removed = [
    'mcu-management/pages/validasi-mcu.html',
    'mcu-management/pages/profil-dokter.html',
    'mcu-management/pages/keputusan-bergabung.html',
    'mcu-management/js/pages/validasi-mcu.js',
    'mcu-management/js/pages/profil-dokter.js',
    'mcu-management/js/pages/keputusan-bergabung.js',
    'api/workflow',
    'server/workflow'
  ];
  for (const file of removed) {
    assert.equal(fs.existsSync(path.join(root, file)), false, file);
  }
});

test('no route or menu points at a removed workflow page', () => {
  const router = read('mcu-management/js/router/spaRouter.js');
  assert.doesNotMatch(router, /validasi-mcu|profil-dokter|keputusan-bergabung/);
});

test('every service worker precache path exists on disk', () => {
  const source = read('mcu-management/sw.js');
  const list = source.match(/const STATIC_ASSETS = \[([\s\S]*?)\];/)[1];
  const paths = [...list.matchAll(/'([^']+)'/g)].map(match => match[1]);
  assert.ok(paths.length > 10);
  for (const asset of paths) {
    if (asset === '/') continue;
    assert.equal(fs.existsSync(path.join(app, asset)), true, `${asset} is missing`);
  }
});

test('every relative import in app scripts resolves to a file', () => {
  const importPattern = /(?:import\s[^'"]*?from\s*|import\s*\(\s*|import\s+)['"](\.[^'"]+)['"]/g;
  const missing = [];
  for (const file of walk(path.join(app, 'js')).filter(item => /\.(js|mjs)$/.test(item))) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(importPattern)) {
      const target = path.resolve(path.dirname(file), match[1].split('?')[0]);
      if (!fs.existsSync(target)) missing.push(`${path.relative(root, file)} -> ${match[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('MCU expiry page has no admin threshold panel', () => {
  const html = read('mcu-management/pages/mcu-expiry-management.html');
  const script = read('mcu-management/js/pages/mcu-expiry-management.js');
  assert.doesNotMatch(html, /expiry-months-input|preview-expiry-button|apply-expiry-button|expiry-setting/);
  assert.doesNotMatch(script, /expirySetting|previewExpiryImpact|applyExpirySetting|workflowService/);
  assert.match(html, /MCU berlaku 12 bulan sejak tanggal pemeriksaan\./);
});
