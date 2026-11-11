const {
  setCorsHeaders,
  verifyJwt,
  readJsonBody,
  hashPassword
} = require('../../server/auth-utils');

const ROLES = ['Admin', 'Petugas', 'Dokter'];
const PUBLIC_COLUMNS = 'user_id, username, display_name, role, active, last_login, created_at, updated_at';
const MIN_PASSWORD = 6;
const MAX_PASSWORD = 72;

class UsersApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function publicUser(row) {
  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    active: row.active !== false
  };
}

function generateUserId() {
  const crypto = require('crypto');
  return `USR-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function bearerClaims(req) {
  const match = String(req.headers?.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!match) throw new UsersApiError(401, 'Sesi tidak valid. Silakan login kembali.');
  try {
    return verifyJwt(match[1]);
  } catch (error) {
    throw new UsersApiError(401, 'Sesi tidak valid. Silakan login kembali.');
  }
}

function cleanText(value, label, max) {
  const text = String(value ?? '').trim();
  if (!text) throw new UsersApiError(400, `${label} wajib diisi`);
  if (text.length > max) throw new UsersApiError(400, `${label} terlalu panjang`);
  return text;
}

function cleanRole(value) {
  if (!ROLES.includes(value)) throw new UsersApiError(400, 'Role tidak valid');
  return value;
}

function cleanPassword(value) {
  const password = String(value ?? '');
  if (password.length < MIN_PASSWORD) throw new UsersApiError(400, `Password minimal ${MIN_PASSWORD} karakter`);
  if (password.length > MAX_PASSWORD) throw new UsersApiError(400, `Password maksimal ${MAX_PASSWORD} karakter`);
  return password;
}

function createUsersHandler(dependencies = {}) {
  const getAdmin = dependencies.getSupabaseAdmin
    || (() => require('../../server/supabaseAdmin').getSupabaseAdmin());
  const authenticate = dependencies.authenticate || bearerClaims;

  async function findById(db, userId) {
    const { data, error } = await db.from('users').select(PUBLIC_COLUMNS).eq('user_id', userId).maybeSingle();
    if (error) throw new UsersApiError(500, 'Gagal memeriksa user');
    return data;
  }

  async function usernameTaken(db, username, exceptUserId) {
    const { data, error } = await db.from('users').select('user_id').eq('username', username).maybeSingle();
    if (error) throw new UsersApiError(500, 'Gagal memeriksa username');
    return Boolean(data && data.user_id !== exceptUserId);
  }

  async function hasOtherActiveAdmin(db, exceptUserId) {
    const { data, error } = await db
      .from('users')
      .select('user_id')
      .eq('role', 'Admin')
      .eq('active', true)
      .neq('user_id', exceptUserId);
    if (error) throw new UsersApiError(500, 'Gagal memeriksa Admin');
    return Array.isArray(data) && data.length > 0;
  }

  async function requireAdmin(db, claims) {
    const actorId = claims?.app_user_id || claims?.sub;
    const actor = actorId ? await findById(db, actorId) : null;
    if (!actor || actor.active === false || actor.role !== 'Admin') {
      throw new UsersApiError(403, 'Hanya Admin yang dapat mengelola user');
    }
    return actor;
  }

  const actions = {
    async create(db, payload) {
      const username = cleanText(payload.username, 'Username', 100);
      const displayName = cleanText(payload.displayName, 'Nama', 200);
      const role = cleanRole(payload.role);
      const password = cleanPassword(payload.password);

      if (await usernameTaken(db, username, null)) throw new UsersApiError(409, 'Username sudah digunakan');

      const row = {
        user_id: generateUserId(),
        username,
        password_hash: hashPassword(password),
        display_name: displayName,
        role,
        active: true
      };
      const { error } = await db.from('users').insert(row);
      if (error) {
        if (error.code === '23505') throw new UsersApiError(409, 'Username sudah digunakan');
        throw new UsersApiError(500, 'Gagal menambahkan user');
      }
      return publicUser(row);
    },

    async update(db, payload, actor) {
      const target = await findById(db, payload.userId);
      if (!target) throw new UsersApiError(404, 'User tidak ditemukan');

      const patch = {};
      if (payload.username !== undefined) patch.username = cleanText(payload.username, 'Username', 100);
      if (payload.displayName !== undefined) patch.display_name = cleanText(payload.displayName, 'Nama', 200);
      if (payload.role !== undefined) patch.role = cleanRole(payload.role);
      if (payload.active !== undefined) patch.active = payload.active === true;
      if (payload.password) patch.password_hash = hashPassword(cleanPassword(payload.password));

      if (patch.username && await usernameTaken(db, patch.username, target.user_id)) {
        throw new UsersApiError(409, 'Username sudah digunakan oleh user lain');
      }

      const losesAdmin = target.role === 'Admin' && target.active !== false
        && ((patch.role && patch.role !== 'Admin') || patch.active === false);
      if (losesAdmin) {
        if (target.user_id === actor.user_id) {
          throw new UsersApiError(400, 'Anda tidak dapat menonaktifkan atau menurunkan akun Anda sendiri');
        }
        if (!await hasOtherActiveAdmin(db, target.user_id)) {
          throw new UsersApiError(400, 'Harus ada minimal satu Admin aktif');
        }
      }

      patch.updated_at = new Date().toISOString();
      const { error } = await db.from('users').update(patch).eq('user_id', target.user_id);
      if (error) {
        if (error.code === '23505') throw new UsersApiError(409, 'Username sudah digunakan oleh user lain');
        throw new UsersApiError(500, 'Gagal mengupdate user');
      }
      return publicUser({ ...target, ...patch });
    },

    async delete(db, payload, actor) {
      const target = await findById(db, payload.userId);
      if (!target) throw new UsersApiError(404, 'User tidak ditemukan');
      if (target.user_id === actor.user_id) throw new UsersApiError(400, 'Tidak dapat menghapus user yang sedang login');
      if (target.role === 'Admin' && target.active !== false && !await hasOtherActiveAdmin(db, target.user_id)) {
        throw new UsersApiError(400, 'Harus ada minimal satu Admin aktif');
      }

      const { error } = await db.from('users').delete().eq('user_id', target.user_id);
      if (error) throw new UsersApiError(500, 'Gagal menghapus user');
      return { userId: target.user_id };
    }
  };

  return async function usersHandler(req, res) {
    setCorsHeaders(req, res, 'POST, OPTIONS');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
      let claims;
      try {
        claims = authenticate(req);
      } catch (error) {
        throw new UsersApiError(401, 'Sesi tidak valid. Silakan login kembali.');
      }
      const db = getAdmin();
      const actor = await requireAdmin(db, claims);
      const payload = await readJsonBody(req);
      const action = actions[payload.action];
      if (!Object.prototype.hasOwnProperty.call(actions, payload.action) || !action) {
        throw new UsersApiError(400, 'Aksi tidak dikenal');
      }
      const user = await action(db, payload, actor);
      return res.status(200).json({ success: true, user });
    } catch (error) {
      if (error instanceof UsersApiError) {
        return res.status(error.status).json({ success: false, error: error.message });
      }
      console.error('[users] unexpected failure:', error.message);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };
}

module.exports = createUsersHandler();
module.exports.createUsersHandler = createUsersHandler;
