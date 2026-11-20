'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const lib = name => import(pathToFileURL(path.resolve(__dirname, '../../web/src/lib', name)).href);

test('theme: stored choice wins, otherwise system preference', async () => {
  const { resolveTheme, nextTheme } = await lib('theme.js');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme('bogus', false), 'light');
  assert.equal(nextTheme('dark'), 'light');
  assert.equal(nextTheme('light'), 'dark');
});

test('router: normalizes paths and falls back to the wildcard route', async () => {
  const { normalizePath, matchRoute, parseQuery } = await lib('router.js');
  const routes = [{ path: '/' }, { path: '/follow-up' }, { path: '*', key: 'nf' }];
  assert.equal(normalizePath('/follow-up/?a=1#x'), '/follow-up');
  assert.equal(normalizePath(''), '/');
  assert.equal(matchRoute(routes, '/follow-up/').path, '/follow-up');
  assert.equal(matchRoute(routes, '/nope').key, 'nf');
  assert.equal(matchRoute([{ path: '/' }], '/nope'), null);
  assert.deepEqual(parseQuery('?q=a%20b&x=1'), { q: 'a b', x: '1' });
});

test('nav: Petugas never sees admin-only pages, Admin sees all 13', async () => {
  const { menuForRole, pathFor, pageLabel } = await lib('nav.js');
  const keys = role => menuForRole(role).flatMap(group => group.items.map(item => item.key));
  assert.equal(keys('Admin').length, 13);
  ['kelola-user', 'activity-log', 'data-terhapus'].forEach(key => {
    assert.ok(keys('Admin').includes(key));
    assert.ok(!keys('Petugas').includes(key));
  });
  assert.equal(pathFor('dashboard'), '/');
  assert.equal(pathFor('follow-up'), '/follow-up');
  assert.equal(pageLabel('assessment-rahma'), 'Rahma - Jakarta Cardiovascular');
  assert.deepEqual(menuForRole('Unknown'), []);
});

test('roleAccess: unknown pages and wrong roles are redirected home', async () => {
  const { resolveAccess } = await lib('roleAccess.js');
  assert.deepEqual(resolveAccess({ role: 'Admin', page: 'kelola-user' }), { allowed: true, redirectPage: null });
  assert.deepEqual(resolveAccess({ role: 'Petugas', page: 'kelola-user' }), { allowed: false, redirectPage: 'dashboard' });
  assert.equal(resolveAccess({ role: 'Admin', page: 'nope' }).allowed, false);
});

test('session: token expiry is honoured and login errors surface server text', async () => {
  const { isTokenValid, loginRequest } = await lib('session.js');
  const token = exp => ['h', Buffer.from(JSON.stringify({ exp })).toString('base64url'), 's'].join('.');
  assert.equal(isTokenValid(token(2000), 1000), true);
  assert.equal(isTokenValid(token(500), 1000), false);
  assert.equal(isTokenValid(null), false);
  const reply = (status, body) => async () => ({ ok: status < 300, status, json: async () => body });
  const ok = await loginRequest('a', 'b', reply(200, { success: true, user: { role: 'Admin' }, token: 't' }));
  assert.equal(ok.token, 't');
  await assert.rejects(loginRequest('a', 'b', reply(401, { error: 'Username atau password salah' })), /password salah/);
  await assert.rejects(loginRequest('a', 'b', reply(500, null)), /belum siap/);
});

test('storage: survives a blocked localStorage', async () => {
  const { readStored, writeStored } = await lib('storage.js');
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(readStored('k', blocked), null);
  assert.equal(writeStored('k', 'v', blocked), false);
});

test('people: initials skip titles and roles map to labels', async () => {
  const { initials, roleTitle } = await lib('people.js');
  assert.equal(initials('dr. Anindya Larasati'), 'AL');
  assert.equal(roleTitle('Admin'), 'Administrator');
  assert.equal(roleTitle('Petugas'), 'Petugas');
});
