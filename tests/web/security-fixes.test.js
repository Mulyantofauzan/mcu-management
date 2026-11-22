import test from 'node:test';
import assert from 'node:assert/strict';

test('csv: cells that start a spreadsheet formula are neutralised, placeholders and numbers are not', async () => {
  const { toCsv } = await import('../../web/src/lib/csv.js');
  const out = toCsv([{ a: '=HYPERLINK("http://x","y")', b: '@SUM(1)', c: '+62812', d: '-', e: -5, f: '-12.5', g: 'Budi' }]);
  const line = out.split('\n')[1];
  assert.ok(line.startsWith('"\'=HYPERLINK(""http://x"",""y"")"'), line);
  assert.ok(line.includes(",'@SUM(1),"), line);
  assert.ok(line.includes(",'+62812,"), line);
  assert.ok(line.includes(',-,-5,-12.5,Budi'), line);
});

test('client: the bearer token is read on every request, not frozen at client creation', async () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: key => store.delete(key)
  };
  const token = exp => ['h', Buffer.from(JSON.stringify({ exp })).toString('base64url'), 's'].join('.');
  const seen = [];
  globalThis.fetch = async (_url, init) => {
    seen.push(new Headers(init.headers).get('Authorization'));
    return { status: 200 };
  };
  const { sessionAwareFetch } = await import('../../web/src/data/client.js');
  const future = Math.floor(Date.now() / 1000) + 3600;

  store.set('madisAccessToken', token(future));
  await sessionAwareFetch('https://example.test/a', { headers: { apikey: 'anon' } });
  const adminToken = store.get('madisAccessToken');
  store.set('madisAccessToken', ['h', Buffer.from(JSON.stringify({ exp: future + 1 })).toString('base64url'), 'other'].join('.'));
  await sessionAwareFetch('https://example.test/b', { headers: { apikey: 'anon' } });

  assert.equal(seen[0], `Bearer ${adminToken}`);
  assert.notEqual(seen[1], seen[0]);
  assert.ok(seen[1].endsWith('.other'));
});

test('session: a token without exp is not treated as valid', async () => {
  const { isTokenValid } = await import('../../web/src/lib/session.js');
  const noExp = ['h', Buffer.from(JSON.stringify({ sub: 'x' })).toString('base64url'), 's'].join('.');
  assert.equal(isTokenValid(noExp, 1000), false);
});
