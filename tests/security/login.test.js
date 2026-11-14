const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

process.env.SUPABASE_JWT_SECRET = 'test-secret';

const { hashPassword, verifyPassword, isLegacyPasswordHash } = require('../../server/auth-utils');
const { createLoginRateLimiter } = require('../../server/loginRateLimiter');
const { createLoginHandler } = require('../../api/login');

function saltedSha256(password) {
  const salt = crypto.randomBytes(16);
  const saltString = Array.from(salt).map(b => String.fromCharCode(b)).join('');
  const hash = crypto.createHash('sha256').update(password + saltString, 'utf8').digest();
  return Buffer.concat([salt, hash]).toString('base64');
}

test('new password hashes use bcrypt', () => {
  const hash = hashPassword('rahasia123');
  assert.match(hash, /^\$2[aby]\$\d{2}\$/);
  assert.equal(verifyPassword('rahasia123', hash), true);
  assert.equal(verifyPassword('salah', hash), false);
  assert.equal(isLegacyPasswordHash(hash), false);
});

test('older salted SHA-256 and base64 hashes still verify but are flagged for upgrade', () => {
  const sha = saltedSha256('lama123');
  assert.equal(verifyPassword('lama123', sha), true);
  assert.equal(verifyPassword('lain', sha), false);
  assert.equal(isLegacyPasswordHash(sha), true);

  const base64 = Buffer.from('purba1').toString('base64');
  assert.equal(verifyPassword('purba1', base64), true);
  assert.equal(isLegacyPasswordHash(base64), true);
});

test('empty or malformed stored hashes never verify', () => {
  assert.equal(verifyPassword('x', ''), false);
  assert.equal(verifyPassword('x', null), false);
  assert.equal(verifyPassword('x', '$2a$10$short'), false);
});

test('rate limiter blocks after repeated failures and resets on success', () => {
  let now = 1000;
  const limiter = createLoginRateLimiter({ maxFailures: 3, windowMs: 60000, now: () => now });
  assert.equal(limiter.check('a').blocked, false);
  limiter.fail('a'); limiter.fail('a');
  assert.equal(limiter.check('a').blocked, false);
  limiter.fail('a');
  const blocked = limiter.check('a');
  assert.equal(blocked.blocked, true);
  assert.ok(blocked.retryAfterSeconds > 0 && blocked.retryAfterSeconds <= 60);
  assert.equal(limiter.check('b').blocked, false);
  now += 61000;
  assert.equal(limiter.check('a').blocked, false);
  limiter.fail('a'); limiter.success('a');
  limiter.fail('a'); limiter.fail('a');
  assert.equal(limiter.check('a').blocked, false);
});

function makeRes() {
  const res = { headers: {}, statusCode: 200, body: null };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { res.body = body; return res; };
  res.end = () => res;
  return res;
}

function makeHandler(users, overrides = {}) {
  const updates = [];
  const supabase = {
    from() {
      const chain = {
        select: () => chain,
        eq: (_c, value) => { chain.value = value; return chain; },
        maybeSingle: async () => ({ data: users.find(u => u.username === chain.value) || null, error: null }),
        update: patch => ({ eq: async () => { updates.push(patch); return { error: null }; } })
      };
      return chain;
    }
  };
  const handler = createLoginHandler({
    getSupabaseAdmin: () => supabase,
    hasSupabaseAdminConfig: () => true,
    rateLimiter: createLoginRateLimiter({ maxFailures: 3, windowMs: 60000 }),
    ...overrides
  });
  return { handler, updates };
}

const request = (username, password, ip = '1.1.1.1') => ({
  method: 'POST', headers: { 'x-forwarded-for': ip }, body: { username, password }
});

test('unknown user, wrong password and inactive account give the same answer', async () => {
  const { handler } = makeHandler([
    { user_id: 'u1', username: 'ani', password_hash: hashPassword('benar'), role: 'Petugas', active: true },
    { user_id: 'u2', username: 'budi', password_hash: hashPassword('benar'), role: 'Petugas', active: false }
  ]);
  const unknown = makeRes(); await handler(request('tidak-ada', 'x'), unknown);
  const wrong = makeRes(); await handler(request('ani', 'salah', '2.2.2.2'), wrong);
  const inactive = makeRes(); await handler(request('budi', 'benar', '3.3.3.3'), inactive);
  for (const res of [unknown, wrong, inactive]) assert.equal(res.statusCode, 401);
  assert.deepEqual(unknown.body, wrong.body);
  assert.deepEqual(unknown.body, inactive.body);
});

test('repeated failures are rate limited with Retry-After', async () => {
  const { handler } = makeHandler([
    { user_id: 'u1', username: 'ani', password_hash: hashPassword('benar'), role: 'Petugas', active: true }
  ]);
  for (let i = 0; i < 3; i += 1) await handler(request('ani', 'salah'), makeRes());
  const blocked = makeRes();
  await handler(request('ani', 'benar'), blocked);
  assert.equal(blocked.statusCode, 429);
  assert.ok(Number(blocked.headers['Retry-After']) > 0);
});

test('successful login returns a token and upgrades a legacy hash to bcrypt', async () => {
  const { handler, updates } = makeHandler([
    { user_id: 'u1', username: 'ani', password_hash: saltedSha256('benar'), role: 'Admin', active: true, display_name: 'Ani' }
  ]);
  const res = makeRes();
  await handler(request('ani', 'benar'), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.token);
  assert.equal(res.body.user.role, 'Admin');
  assert.ok(updates.some(patch => /^\$2[aby]\$/.test(patch.password_hash || '')));
  assert.equal(JSON.stringify(res.body).includes('password_hash'), false);
});

test('a Dokter account can no longer sign in and gets the generic answer', async () => {
  const { handler } = makeHandler([
    { user_id: 'd1', username: 'dok', password_hash: hashPassword('benar'), role: 'Dokter', active: true, display_name: 'Dok' }
  ]);
  const doctor = makeRes(); await handler(request('dok', 'benar'), doctor);
  const unknown = makeRes(); await handler(request('tidak-ada', 'x', '9.9.9.9'), unknown);
  assert.equal(doctor.statusCode, 401);
  assert.deepEqual(doctor.body, unknown.body);
  assert.equal(doctor.body.token, undefined);
});
