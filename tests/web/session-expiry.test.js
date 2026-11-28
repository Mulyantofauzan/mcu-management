import test from 'node:test';
import assert from 'node:assert/strict';

const jwtWithExp = (exp, tail = 's') => ['h', Buffer.from(JSON.stringify({ exp })).toString('base64url'), tail].join('.');
const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;
const justExpired = () => Math.floor(Date.now() / 1000) - 5;

function fakeStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: key => store.delete(key)
  };
  return store;
}

function fakeLocation(t, pathname) {
  const moved = [];
  globalThis.location = { pathname, assign: to => moved.push(to) };
  t.after(() => { delete globalThis.location; });
  return moved;
}

test('client: an expired token ends the session and goes to /login instead of showing "JWT expired"', async t => {
  const store = fakeStorage();
  const moved = fakeLocation(t, '/kelola-karyawan');
  let sent = 0;
  globalThis.fetch = async () => { sent += 1; return { status: 200 }; };
  const { sessionAwareFetch } = await import('../../web/src/data/client.js');

  store.set('madisAccessToken', jwtWithExp(justExpired()));
  store.set('currentUser', '{"role":"Admin"}');
  const response = await sessionAwareFetch('https://example.test/rest');

  assert.equal(response.status, 401);
  assert.equal(sent, 0, 'no request is sent with a dead session');
  assert.deepEqual(moved, ['/login']);
  assert.equal(store.size, 0);
});

test('client: a 401 from the server also ends the session', async t => {
  const store = fakeStorage();
  const moved = fakeLocation(t, '/');
  globalThis.fetch = async () => ({ status: 401 });
  const { sessionAwareFetch } = await import('../../web/src/data/client.js');

  store.set('madisAccessToken', jwtWithExp(inOneHour()));
  await sessionAwareFetch('https://example.test/rest');

  assert.deepEqual(moved, ['/login']);
  assert.equal(store.size, 0);
});

test('client: the bearer token is read on every request', async () => {
  const store = fakeStorage();
  const seen = [];
  globalThis.fetch = async (_url, init) => {
    seen.push(new Headers(init.headers).get('Authorization'));
    return { status: 200 };
  };
  const { sessionAwareFetch } = await import('../../web/src/data/client.js');

  store.set('madisAccessToken', jwtWithExp(inOneHour(), 'first'));
  await sessionAwareFetch('https://example.test/a', { headers: { apikey: 'anon' } });
  store.set('madisAccessToken', jwtWithExp(inOneHour(), 'second'));
  await sessionAwareFetch('https://example.test/b', { headers: { apikey: 'anon' } });

  assert.ok(seen[0].endsWith('.first'));
  assert.ok(seen[1].endsWith('.second'));
});

test('session: an idle tab is signed out once the token expires', async () => {
  const store = fakeStorage();
  const { watchSession } = await import('../../web/src/lib/session.js');
  const listeners = {};
  const doc = {
    addEventListener: (name, fn) => { listeners[name] = fn; },
    removeEventListener: name => { delete listeners[name]; }
  };
  store.set('madisAccessToken', jwtWithExp(inOneHour()));
  let expired = 0;
  const stop = watchSession(() => { expired += 1; }, { intervalMs: 60000, doc });

  listeners.visibilitychange();
  assert.equal(expired, 0);
  store.set('madisAccessToken', jwtWithExp(justExpired()));
  listeners.visibilitychange();
  assert.equal(expired, 1);
  assert.equal(listeners.visibilitychange, undefined, 'watcher stops after firing');
  stop();
});
