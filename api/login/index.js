const { createClient } = require('@supabase/supabase-js');
const {
  setCorsHeaders,
  signJwt,
  readJsonBody,
  hashPassword,
  verifyPassword,
  isLegacyPasswordHash
} = require('../auth-utils');

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

module.exports = async (req, res) => {
  setCorsHeaders(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_JWT_SECRET) {
      return res.status(500).json({ success: false, error: 'Server auth is not configured' });
    }

    const { username, password } = await readJsonBody(req);
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username dan password wajib diisi' });
    }

    const supabase = getSupabaseAdmin();
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

    const updates = { last_login: new Date().toISOString() };
    if (isLegacyPasswordHash(user.password_hash)) {
      updates.password_hash = hashPassword(password);
    }

    await supabase
      .from('users')
      .update(updates)
      .eq('user_id', user.user_id);

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
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
