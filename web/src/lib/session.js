/* Sesi login. Kunci penyimpanan sama dengan aplikasi lama supaya login tetap berlaku. */
import { readStored, writeStored, removeStored } from './storage.js';

const USER_KEY = 'currentUser';
const TOKEN_KEY = 'madisAccessToken';

function decodeExpiry(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).exp || null;
  } catch {
    return null;
  }
}

export function isTokenValid(token, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!token) return false;
  const exp = decodeExpiry(token);
  return exp === null || exp > nowSeconds;
}

export function getAccessToken() {
  const token = readStored(TOKEN_KEY);
  return isTokenValid(token) ? token : null;
}

export function getCurrentUser() {
  if (!getAccessToken()) return null;
  try {
    const user = JSON.parse(readStored(USER_KEY) || 'null');
    return user && user.role ? user : null;
  } catch {
    return null;
  }
}

export function saveSession(user, token) {
  writeStored(USER_KEY, JSON.stringify(user));
  writeStored(TOKEN_KEY, token);
}

export function clearSession() {
  removeStored(USER_KEY);
  removeStored(TOKEN_KEY);
}

export async function loginRequest(username, password, fetcher = globalThis.fetch) {
  const response = await fetcher('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const result = await response.json().catch(() => null);
  if (response.ok && result?.success && result.user && result.token) return { user: result.user, token: result.token };
  if (response.status === 401 || response.status === 403 || response.status === 429) {
    throw new Error(result?.error || 'Username atau password salah');
  }
  throw new Error(result?.error || 'Server login belum siap');
}
