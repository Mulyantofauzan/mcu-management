const test = require('node:test');
const assert = require('node:assert/strict');
const { loadActiveUser } = require('../../server/activeUser');

function database(row, error = null) {
  const query = {};
  ['select', 'eq'].forEach(method => { query[method] = () => query; });
  query.maybeSingle = async () => ({ data: row, error });
  return { from: () => query };
}

test('returns the active Admin or Petugas user', async () => {
  const user = await loadActiveUser({ app_user_id: 'U1' },
    database({ user_id: 'U1', username: 'ani', display_name: 'Ani', role: 'Petugas', active: true }));
  assert.deepEqual(user, { userId: 'U1', username: 'ani', displayName: 'Ani', role: 'Petugas' });
});

test('claims without a user id are unauthorized (401)', async () => {
  await assert.rejects(loadActiveUser({}, database(null)), { statusCode: 401 });
});

test('inactive or missing users are forbidden (403)', async () => {
  await assert.rejects(loadActiveUser({ sub: 'U1' }, database({ user_id: 'U1', role: 'Admin', active: false })), { statusCode: 403 });
  await assert.rejects(loadActiveUser({ sub: 'U1' }, database(null)), { statusCode: 403 });
});

test('a stale session of the removed Dokter role is forbidden (403)', async () => {
  await assert.rejects(
    loadActiveUser({ sub: 'D1' }, database({ user_id: 'D1', username: 'dok', role: 'Dokter', active: true })),
    { statusCode: 403 }
  );
});

test('database failures surface as 500', async () => {
  await assert.rejects(loadActiveUser({ sub: 'U1' }, database(null, { message: 'down' })), { statusCode: 500 });
});
