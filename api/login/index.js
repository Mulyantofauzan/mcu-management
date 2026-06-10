const {
  setCorsHeaders,
  signJwt,
  readJsonBody,
  hashPassword,
  verifyPassword,
  isLegacyPasswordHash
} = require('../../server/auth-utils');
const { getSupabaseAdmin, hasSupabaseAdminConfig } = require('../../server/supabaseAdmin');

module.exports = async (req, res) => {
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
    if (!hasSupabaseAdminConfig() || !String(process.env.SUPABASE_JWT_SECRET || '').trim()) {
      return res.status(500).json({ success: false, error: 'Server auth is not configured' });
    }

    failureStage = 'body';
    const { username, password } = await readJsonBody(req);
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username dan password wajib diisi' });
    }

    failureStage = 'database-client';
    const supabase = getSupabaseAdmin();
    failureStage = 'database-query';
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, username, password_hash, display_name, role, active')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, error: 'Gagal memeriksa user' });
    }

    if (!user || user.active === false) {
      return res.status(401).json({ success: false, error: 'Username tidak ditemukan atau akun tidak aktif' });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ success: false, error: 'Password salah' });
    }

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
    const response = {
      success: false,
      error: 'Internal server error',
      code: `LOGIN_${failureStage.toUpperCase().replace(/-/g, '_')}_FAILED`
    };

    if (failureStage === 'database-client') {
      response.diagnostic = String(error.message || 'Unknown client initialization error').slice(0, 160);
    }

    return res.status(500).json(response);
  }
};
