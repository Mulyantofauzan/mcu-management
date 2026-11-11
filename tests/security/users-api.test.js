const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.SUPABASE_JWT_SECRET = 'test-secret';

const { hashPassword, verifyPassword } = require('../../server/auth-utils');
const { createUsersHandler } = require('../../api/users');

const root = path.resolve(__dirname, '../..');

function fakeSupabase(rows) {
  return {
    from() {
      const state = { filters: [], op: 'select', patch: null, row: null };
      const matches = row => state.filters.every(([type, col, val]) => (type === 'eq' ? row[col] === val : row[col] !== val));
      const run = async () => {
        if (state.op === 'insert') {
          if (rows.some(r => r.username === state.row.username)) {
            return { data: null, error: { code: '23505', message: 'duplicate' } };
          }
          rows.push({ ...state.row });
          return { data: [{ ...state.row }], error: null };
        }
        if (state.op === 'update') {
          const hit = rows.filter(matches);
          hit.forEach(r => Object.assign(r, state.patch));
          return { data: hit.map(r => ({ ...r })), error: null };
        }
        if (state.op === 'delete') {
          const hit = rows.filter(matches);
          hit.forEach(r => rows.splice(rows.indexOf(r), 1));
          return { data: hit, error: null };
        }
        return { data: rows.filter(matches).map(r => ({ ...r })), error: null };
      };
      const chain = {
        select: () => chain,
        insert: row => { state.op = 'insert'; state.row = row; return chain; },
        update: patch => { state.op = 'update'; state.patch = patch; return chain; },
        delete: () => { state.op = 'delete'; return chain; },
        eq: (col, val) => { state.filters.push(['eq', col, val]); return chain; },
        neq: (col, val) => { state.filters.push(['neq', col, val]); return chain; },
        maybeSingle: async () => { const r = await run(); return { data: r.data?.[0] || null, error: r.error }; },
        single: async () => { const r = await run(); return { data: r.data?.[0] || null, error: r.error }; },
        then: (resolve, reject) => run().then(resolve, reject)
      };
      return chain;
    }
  };
}

function setup() {
  const rows = [
    { user_id: 'A1', username: 'admin', password_hash: hashPassword('adminpass'), display_name: 'Admin', role: 'Admin', active: true },
    { user_id: 'A2', username: 'admin2', password_hash: hashPassword('adminpass'), display_name: 'Admin Dua', role: 'Admin', active: true },
    { user_id: 'P1', username: 'petugas', password_hash: hashPassword('petugas1'), display_name: 'Petugas', role: 'Petugas', active: true }
  ];
  const handler = createUsersHandler({
    getSupabaseAdmin: () => fakeSupabase(rows),
    authenticate: req => {
      if (!req.headers.authorization) throw new Error('no token');
      return { app_user_id: req.headers.authorization.replace('Bearer ', '') };
    }
  });
  return { rows, handler };
}

function makeRes() {
  const res = { headers: {}, statusCode: 200, body: null };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { res.body = body; return res; };
  res.end = () => res;
  return res;
}

async function call(handler, actor, payload) {
  const res = makeRes();
  await handler({ method: 'POST', headers: actor ? { authorization: `Bearer ${actor}` } : {}, body: payload }, res);
  return res;
}

test('missing token is rejected and non-admin is forbidden', async () => {
  const { handler } = setup();
  assert.equal((await call(handler, null, { action: 'create' })).statusCode, 401);
  assert.equal((await call(handler, 'P1', { action: 'create', username: 'x', password: 'secret1', displayName: 'X', role: 'Petugas' })).statusCode, 403);
});

test('admin creates a user with a bcrypt hash and no hash in the response', async () => {
  const { handler, rows } = setup();
  const res = await call(handler, 'A1', { action: 'create', username: 'baru', password: 'rahasia1', displayName: 'Baru', role: 'Dokter' });
  assert.equal(res.statusCode, 200);
  const stored = rows.find(r => r.username === 'baru');
  assert.match(stored.password_hash, /^\$2[aby]\$/);
  assert.equal(verifyPassword('rahasia1', stored.password_hash), true);
  assert.equal(stored.active, true);
  assert.match(stored.user_id, /^USR-/);
  assert.equal(JSON.stringify(res.body).includes('password'), false);
});

test('create validates role, password length, required fields and duplicates', async () => {
  const { handler } = setup();
  const base = { action: 'create', username: 'baru', password: 'rahasia1', displayName: 'Baru', role: 'Petugas' };
  assert.equal((await call(handler, 'A1', { ...base, role: 'Raja' })).statusCode, 400);
  assert.equal((await call(handler, 'A1', { ...base, password: '123' })).statusCode, 400);
  assert.equal((await call(handler, 'A1', { ...base, username: '  ' })).statusCode, 400);
  assert.equal((await call(handler, 'A1', { ...base, username: 'petugas' })).statusCode, 409);
});

test('update changes profile, rehashes password and rejects duplicate usernames', async () => {
  const { handler, rows } = setup();
  const ok = await call(handler, 'A1', { action: 'update', userId: 'P1', displayName: 'Nama Baru', password: 'passbaru1' });
  assert.equal(ok.statusCode, 200);
  const row = rows.find(r => r.user_id === 'P1');
  assert.equal(row.display_name, 'Nama Baru');
  assert.equal(verifyPassword('passbaru1', row.password_hash), true);
  assert.equal((await call(handler, 'A1', { action: 'update', userId: 'P1', username: 'admin' })).statusCode, 409);
  assert.equal((await call(handler, 'A1', { action: 'update', userId: 'TIDAK-ADA', displayName: 'X' })).statusCode, 404);
});

test('admin cannot deactivate or demote themselves, nor remove the last active admin', async () => {
  const { handler, rows } = setup();
  assert.equal((await call(handler, 'A1', { action: 'update', userId: 'A1', active: false })).statusCode, 400);
  assert.equal((await call(handler, 'A1', { action: 'update', userId: 'A1', role: 'Petugas' })).statusCode, 400);

  rows.find(r => r.user_id === 'A2').active = false;
  assert.equal((await call(handler, 'A1', { action: 'update', userId: 'P1', role: 'Petugas' })).statusCode, 200);
  assert.equal((await call(handler, 'A1', { action: 'delete', userId: 'A2' })).statusCode, 200);
});

test('delete refuses self and unknown users, and removes others', async () => {
  const { handler, rows } = setup();
  assert.equal((await call(handler, 'A1', { action: 'delete', userId: 'A1' })).statusCode, 400);
  assert.equal((await call(handler, 'A1', { action: 'delete', userId: 'NOPE' })).statusCode, 404);
  assert.equal((await call(handler, 'A1', { action: 'delete', userId: 'P1' })).statusCode, 200);
  assert.equal(rows.some(r => r.user_id === 'P1'), false);
});

test('demoting another admin is blocked when it would leave no active admin', async () => {
  const { handler, rows } = setup();
  rows.find(r => r.user_id === 'A1').active = true;
  rows.splice(rows.findIndex(r => r.user_id === 'A2'), 1);
  const res = await call(handler, 'A1', { action: 'update', userId: 'A1', role: 'Petugas' });
  assert.equal(res.statusCode, 400);
});

test('browser code stops writing password hashes directly', () => {
  const auth = fs.readFileSync(path.join(root, 'mcu-management/js/services/authService.js'), 'utf8');
  assert.match(auth, /\/api\/users/);
  const page = fs.readFileSync(path.join(root, 'mcu-management/js/pages/kelola-user.js'), 'utf8');
  assert.doesNotMatch(page, /database\.delete\('users'/);
});

test('migration removes client write policies on users', () => {
  const sql = fs.readFileSync(path.join(root, 'migrations/20261111_01_users_server_write_only.sql'), 'utf8');
  assert.match(sql, /DROP POLICY IF EXISTS "users_insert_admin"/);
  assert.match(sql, /DROP POLICY IF EXISTS "users_update_admin"/);
  assert.match(sql, /DROP POLICY IF EXISTS "users_delete_admin"/);
});

test('user reads from the browser never request the password hash', () => {
  const adapter = fs.readFileSync(path.join(root, 'mcu-management/js/services/databaseAdapter.js'), 'utf8');
  const usersBlock = adapter.slice(adapter.indexOf('export const Users'), adapter.indexOf('export const Employees'));
  assert.doesNotMatch(usersBlock, /\.select\('\*'\)/);
});
