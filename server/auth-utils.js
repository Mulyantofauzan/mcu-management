const crypto = require('crypto');

const DEFAULT_ALLOWED_ORIGINS = [
  'https://madis.sabdamu.my.id'
];

function normalizeSecret(value) {
  if (!value) return '';

  const trimmed = String(value).trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function getAllowedOrigins() {
  const origins = new Set(DEFAULT_ALLOWED_ORIGINS);

  if (process.env.APP_ORIGIN) {
    process.env.APP_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean).forEach((origin) => origins.add(origin));
  }

  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean).forEach((origin) => origins.add(origin));
  }

  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`);
  }

  return origins;
}

function isAllowedOrigin(origin) {
  if (!origin) return true;

  try {
    const url = new URL(origin);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return true;
    }
  } catch (error) {
    return false;
  }

  return getAllowedOrigins().has(origin);
}

function setCorsHeaders(req, res, methods = 'GET, OPTIONS') {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || DEFAULT_ALLOWED_ORIGINS[0]);
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signJwt(payload, expiresInSeconds = 8 * 60 * 60) {
  const secret = normalizeSecret(process.env.SUPABASE_JWT_SECRET);
  if (!secret) {
    throw new Error('SUPABASE_JWT_SECRET is not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    aud: 'authenticated',
    role: 'authenticated',
    iss: 'madis',
    iat: now,
    exp: now + expiresInSeconds,
    ...payload
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedBody}.${signature}`;
}

function verifyJwt(token) {
  const secret = normalizeSecret(process.env.SUPABASE_JWT_SECRET);
  if (!secret) {
    throw new Error('SUPABASE_JWT_SECRET is not configured');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token');
  }

  const [encodedHeader, encodedBody, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(base64UrlDecode(encodedBody));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp <= now) {
    throw new Error('Token expired');
  }

  return payload;
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function requireAuth(req, res, options = {}) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ success: false, error: 'Unauthorized: missing bearer token' });
      return null;
    }

    const claims = verifyJwt(token);
    if (options.roles?.length && !options.roles.includes(claims.app_role)) {
      res.status(403).json({ success: false, error: 'Forbidden: insufficient role' });
      return null;
    }

    return claims;
  } catch (error) {
    res.status(401).json({ success: false, error: 'Unauthorized: invalid or expired token' });
    return null;
  }
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return JSON.parse(req.body || '{}');
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) : {};
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const saltString = Array.from(salt).map((byte) => String.fromCharCode(byte)).join('');
  const hash = crypto.createHash('sha256').update(password + saltString, 'utf8').digest();
  return Buffer.concat([salt, hash]).toString('base64');
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;

  try {
    const combined = Buffer.from(storedHash, 'base64');
    if (combined.length === 48) {
      const salt = combined.subarray(0, 16);
      const stored = combined.subarray(16);
      const saltString = Array.from(salt).map((byte) => String.fromCharCode(byte)).join('');
      const hash = crypto.createHash('sha256').update(password + saltString, 'utf8').digest();

      return stored.length === hash.length && crypto.timingSafeEqual(stored, hash);
    }

    const legacyHash = Buffer.from(password, 'binary').toString('base64');
    const legacyHashUtf8 = Buffer.from(password, 'utf8').toString('base64');
    return storedHash === legacyHash || storedHash === legacyHashUtf8;
  } catch (error) {
    return false;
  }
}

function isLegacyPasswordHash(storedHash) {
  try {
    return Buffer.from(storedHash || '', 'base64').length !== 48;
  } catch (error) {
    return true;
  }
}

module.exports = {
  setCorsHeaders,
  signJwt,
  verifyJwt,
  requireAuth,
  readJsonBody,
  hashPassword,
  verifyPassword,
  isLegacyPasswordHash
};
