const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

process.env.SUPABASE_JWT_SECRET = 'test-secret-not-real';

const { signJwt, verifyJwt, requireAuth, requireActiveAuth } = require('../../server/auth-utils');

function b64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function rawToken(header, payload, secret = process.env.SUPABASE_JWT_SECRET) {
  const head = b64url(header);
  const body = b64url(payload);
  const sig = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${head}.${body}.${sig}`;
}

function response() {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (value) => { res.body = value; return res; };
  return res;
}

const request = (token) => ({ headers: { authorization: `Bearer ${token}` } });

const appToken = (claims = {}) => signJwt({ app_user_id: 'USR-1', app_role: 'Admin', ...claims });

test('an app-issued token is accepted by requireAuth', () => {
  const res = response();
  const claims = requireAuth(request(appToken()), res);
  assert.equal(claims.app_user_id, 'USR-1');
  assert.equal(res.statusCode, null);
});

test('a validly signed Supabase anon-style token is rejected', () => {
  const anon = rawToken({ alg: 'HS256', typ: 'JWT' }, { iss: 'supabase', role: 'anon', exp: Math.floor(Date.now() / 1000) + 3600 });
  const res = response();
  assert.equal(requireAuth(request(anon), res), null);
  assert.equal(res.statusCode, 401);
});

test('a token without exp is rejected', () => {
  assert.throws(
    () => verifyJwt(rawToken({ alg: 'HS256', typ: 'JWT' }, { iss: 'madis', aud: 'authenticated', app_user_id: 'U', app_role: 'Admin' })),
    /expired/i
  );
});

test('a token with a different algorithm header is rejected', () => {
  assert.throws(
    () => verifyJwt(rawToken({ alg: 'none', typ: 'JWT' }, { exp: Math.floor(Date.now() / 1000) + 60 })),
    /algorithm/i
  );
});

test('an app token with an unknown role or no user id is rejected', () => {
  for (const claims of [{ app_role: 'Dokter' }, { app_user_id: '' }]) {
    const res = response();
    assert.equal(requireAuth(request(appToken(claims)), res), null);
    assert.equal(res.statusCode, 401);
  }
});

function database(user) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({ data: user, error: null })
  };
  return { from: () => builder };
}

test('requireActiveAuth rejects a deactivated Admin even with a valid token', async () => {
  const res = response();
  const session = await requireActiveAuth(request(appToken()), res, {
    roles: ['Admin'],
    supabase: database({ user_id: 'USR-1', username: 'a', display_name: 'A', role: 'Admin', active: false })
  });
  assert.equal(session, null);
  assert.equal(res.statusCode, 403);
});

test('requireActiveAuth uses the database role, not the token role', async () => {
  const res = response();
  const session = await requireActiveAuth(request(appToken({ app_role: 'Admin' })), res, {
    roles: ['Admin'],
    supabase: database({ user_id: 'USR-1', username: 'a', display_name: 'A', role: 'Petugas', active: true })
  });
  assert.equal(session, null);
  assert.equal(res.statusCode, 403);
});

test('requireActiveAuth accepts an active Admin', async () => {
  const res = response();
  const session = await requireActiveAuth(request(appToken()), res, {
    roles: ['Admin'],
    supabase: database({ user_id: 'USR-1', username: 'a', display_name: 'A', role: 'Admin', active: true })
  });
  assert.equal(session.user.role, 'Admin');
  assert.equal(res.statusCode, null);
});
