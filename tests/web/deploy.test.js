'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const web = JSON.parse(read('vercel.web.json'));
const old = JSON.parse(read('vercel.json'));
const header = (config, key) => config.headers.filter(h => h.source === '/(.*)').flatMap(h => h.headers).find(x => x.key === key)?.value;

test('preview config builds and serves web/dist', () => {
  assert.match(web.buildCommand, /npm --prefix web ci/);
  assert.match(web.buildCommand, /npm --prefix web run build/);
  assert.equal(web.outputDirectory, 'web/dist');
  assert.deepEqual(web.functions, old.functions);
});

test('SPA rewrite sends app routes to index.html but never API, assets or fonts', () => {
  const spa = web.rewrites.find(r => r.destination === '/index.html');
  const pattern = new RegExp(`^${spa.source}$`);
  ['/', '/login', '/kelola-karyawan', '/tambah-karyawan', '/analysis'].forEach(p => assert.ok(pattern.test(p), `${p} must be handled by the SPA`));
  ['/api/login', '/api/users', '/assets/index-abc.js', '/fonts/plus-jakarta-sans-latin-wght-normal.woff2', '/sw.js', '/theme-init.js'].forEach(p => assert.ok(!pattern.test(p), `${p} must not be rewritten`));
  assert.ok(web.rewrites.some(r => r.source === '/api/compress-upload' && r.destination === '/api/mcu-file-upload'));
});

test('CSP is stricter than the old app and keeps the Supabase and R2 hosts', () => {
  const csp = header(web, 'Content-Security-Policy');
  const oldCsp = header(old, 'Content-Security-Policy');
  assert.match(csp, /script-src 'self';/);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-(inline|eval)/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  const connect = value => value.match(/connect-src ([^;]+)/)[1];
  assert.equal(connect(csp), connect(oldCsp));
  assert.ok(header(web, 'Strict-Transport-Security'));
});

test('hashed assets are cached forever, entry points are not', () => {
  const cache = source => web.headers.find(h => h.source === source)?.headers.find(x => x.key === 'Cache-Control')?.value;
  assert.match(cache('/assets/(.*)'), /immutable/);
  assert.match(cache('/index.html'), /no-store/);
  assert.match(cache('/sw.js'), /no-store/);
});

test('the app ships no inline script and carries the old service worker kill switch', () => {
  assert.doesNotMatch(read('web/index.html'), /<script>(?!\s*<\/script>)/);
  assert.match(read('web/index.html'), /src="\/theme-init\.js"/);
  assert.match(read('web/public/sw.js'), /unregister\(\)/);
  assert.match(read('web/public/sw.js'), /caches\.delete/);
  assert.match(read('web/public/theme-init.js'), /sehatra-theme/);
});
