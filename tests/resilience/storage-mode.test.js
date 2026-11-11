const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '../..');
const load = relative => import(pathToFileURL(path.join(root, relative)).href);

test('production never falls back to browser-only storage', async () => {
  const { resolveStorageMode, StorageUnavailableError } = await load('mcu-management/js/utils/storageMode.mjs');
  assert.throws(
    () => resolveStorageMode({ supabaseEnabled: false, hostname: 'madis.sabdamu.my.id', protocol: 'https:' }),
    error => error instanceof StorageUnavailableError && error.code === 'SUPABASE_UNAVAILABLE'
  );
});

test('supabase is used whenever it is enabled', async () => {
  const { resolveStorageMode } = await load('mcu-management/js/utils/storageMode.mjs');
  assert.equal(resolveStorageMode({ supabaseEnabled: true, hostname: 'madis.sabdamu.my.id', protocol: 'https:' }), 'supabase');
});

test('local fallback is allowed only for localhost, 127.0.0.1 and file:', async () => {
  const { resolveStorageMode } = await load('mcu-management/js/utils/storageMode.mjs');
  for (const hostname of ['localhost', '127.0.0.1']) {
    assert.equal(resolveStorageMode({ supabaseEnabled: false, hostname, protocol: 'http:' }), 'local');
  }
  assert.equal(resolveStorageMode({ supabaseEnabled: false, hostname: '', protocol: 'file:' }), 'local');
  assert.throws(() => resolveStorageMode({ supabaseEnabled: false, hostname: 'localhost.evil.com', protocol: 'https:' }));
});

test('database adapter routes through resolveStorageMode', () => {
  const source = fs.readFileSync(path.join(root, 'mcu-management/js/services/databaseAdapter.js'), 'utf8');
  assert.match(source, /resolveStorageMode/);
  assert.doesNotMatch(source, /const enabled = isSupabaseEnabled\(\);\s*return enabled;/);
});

test('session expiry is recognised from PostgREST responses', async () => {
  const { isSessionExpiredResponse } = await load('mcu-management/js/utils/sessionExpiry.mjs');
  assert.equal(isSessionExpiredResponse(401, { code: 'PGRST301', message: 'JWT expired' }), true);
  assert.equal(isSessionExpiredResponse(401, { message: 'JWT expired' }), true);
  assert.equal(isSessionExpiredResponse(401, null), true);
  assert.equal(isSessionExpiredResponse(403, { message: 'permission denied' }), false);
  assert.equal(isSessionExpiredResponse(200, { message: 'JWT expired' }), false);
  assert.equal(isSessionExpiredResponse(500, { message: 'boom' }), false);
});

test('expired session clears credentials, notifies once and redirects to login', async () => {
  const { createSessionExpiryHandler } = await load('mcu-management/js/utils/sessionExpiry.mjs');
  const calls = [];
  const handle = createSessionExpiryHandler({
    clearSession: () => calls.push('clear'),
    notify: () => { calls.push('notify'); return Promise.resolve(); },
    redirect: target => calls.push(`redirect:${target}`),
    loginUrl: () => 'pages/login.html'
  });
  await handle();
  await handle();
  assert.deepEqual(calls, ['clear', 'notify', 'redirect:pages/login.html']);
});

test('supabase client reports expired sessions through a fetch wrapper', () => {
  const source = fs.readFileSync(path.join(root, 'mcu-management/js/config/supabase.js'), 'utf8');
  assert.match(source, /sessionExpiry\.mjs/);
  assert.match(source, /fetch:/);
});
