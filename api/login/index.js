const {
  setCorsHeaders,
  signJwt,
  readJsonBody,
  hashPassword,
  verifyPassword,
  isLegacyPasswordHash
} = require('../../server/auth-utils');
const { createLoginRateLimiter } = require('../../server/loginRateLimiter');

const INVALID_CREDENTIALS = 'Username atau password salah';
// Compared against when the user does not exist, so timing does not reveal it.
const DUMMY_HASH = hashPassword('timing-equalizer');

function clientIp(req) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket?.remoteAddress || 'unknown';
}

function createLoginHandler(dependencies = {}) {
  const getAdmin = dependencies.getSupabaseAdmin
    || (() => require('../../server/supabaseAdmin').getSupabaseAdmin());
  const hasAdminConfig = dependencies.hasSupabaseAdminConfig
    || (() => require('../../server/supabaseAdmin').hasSupabaseAdminConfig());
  const accountLimiter = dependencies.rateLimiter
    || createLoginRateLimiter({ maxFailures: 5, windowMs: 15 * 60 * 1000 });
  const ipLimiter = dependencies.ipRateLimiter
    || createLoginRateLimiter({ maxFailures: 30, windowMs: 15 * 60 * 1000 });

  return async function loginHandler(req, res) {
    setCorsHeaders(req, res, 'POST, OPTIONS');
    let failureStage = 'request';

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
      failureStage = 'configuration';
      if (!hasAdminConfig() || !String(process.env.SUPABASE_JWT_SECRET || '').trim()) {
        return res.status(500).json({ success: false, error: 'Server auth is not configured' });
      }

      failureStage = 'body';
      const { username, password } = await readJsonBody(req);
      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username dan password wajib diisi' });
      }

      const ip = clientIp(req);
      const accountKey = `${ip}|${String(username).toLowerCase()}`;
      const blocked = [accountLimiter.check(accountKey), ipLimiter.check(ip)].find(result => result.blocked);
      if (blocked) {
        res.setHeader('Retry-After', String(blocked.retryAfterSeconds));
        return res.status(429).json({
          success: false,
          error: 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.'
        });
      }

      const rejectCredentials = () => {
        accountLimiter.fail(accountKey);
        ipLimiter.fail(ip);
        return res.status(401).json({ success: false, error: INVALID_CREDENTIALS });
      };

      failureStage = 'database-client';
      const supabase = getAdmin();
      failureStage = 'database-query';
      const { data: user, error } = await supabase
        .from('users')
        .select('user_id, username, password_hash, display_name, role, active')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        return res.status(500).json({ success: false, error: 'Gagal memeriksa user' });
      }

      if (!user || user.active === false || !['Admin', 'Petugas'].includes(user.role)) {
        verifyPassword(password, DUMMY_HASH);
        return rejectCredentials();
      }

      if (!verifyPassword(password, user.password_hash)) {
        return rejectCredentials();
      }

      accountLimiter.success(accountKey);

      failureStage = 'database-update';
      const updates = { last_login: new Date().toISOString() };
      if (isLegacyPasswordHash(user.password_hash)) {
        updates.password_hash = hashPassword(password);
      }

      await supabase
        .from('users')
        .update(updates)
        .eq('user_id', user.user_id);

      failureStage = 'token';
      const sessionUser = {
        userId: user.user_id,
        username: user.username,
        displayName: user.display_name,
        role: user.role
      };

      const expiresIn = 8 * 60 * 60;
      const token = signJwt({
        sub: user.user_id,
        app_user_id: user.user_id,
        app_username: user.username,
        app_role: user.role
      }, expiresIn);

      return res.status(200).json({
        success: true,
        user: sessionUser,
        token,
        expiresIn
      });
    } catch (error) {
      console.error(`[login] Failure during ${failureStage}:`, error.message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: `LOGIN_${failureStage.toUpperCase().replace(/-/g, '_')}_FAILED`
      });
    }
  };
}

module.exports = createLoginHandler();
module.exports.createLoginHandler = createLoginHandler;
