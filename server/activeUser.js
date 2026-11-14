/** Resolve the signed-in user from JWT claims against the database. */

const STAFF_ROLES = ['Admin', 'Petugas'];

function httpError(statusCode, message, cause) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (cause) error.cause = cause;
  return error;
}

function getClaimUserId(claims) {
  return claims?.app_user_id || claims?.sub || null;
}

async function loadActiveUser(claims, supabase) {
  const database = supabase || require('./supabaseAdmin').getSupabaseAdmin();
  const userId = getClaimUserId(claims);
  if (!userId) throw httpError(401, 'Sesi tidak valid.');

  const { data: user, error } = await database
    .from('users')
    .select('user_id, username, display_name, role, active')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw httpError(500, 'Gagal membaca user.', error);
  if (!user || user.active !== true) throw httpError(403, 'User tidak aktif.');
  if (!STAFF_ROLES.includes(user.role)) throw httpError(403, 'Peran tidak dikenali.');

  return {
    userId: user.user_id,
    username: user.username,
    displayName: user.display_name,
    role: user.role
  };
}

module.exports = { STAFF_ROLES, getClaimUserId, loadActiveUser };
