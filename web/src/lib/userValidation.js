/* Validasi form user (aturan halaman lama dan batas API: password 6 sampai 72 karakter). */
export const MIN_PASSWORD = 6;
export const MAX_PASSWORD = 72;

export function validatePassword(password, confirm) {
  if (password !== confirm) return 'Password dan konfirmasi password tidak sama';
  if (String(password).length < MIN_PASSWORD) return `Password minimal ${MIN_PASSWORD} karakter`;
  if (String(password).length > MAX_PASSWORD) return `Password maksimal ${MAX_PASSWORD} karakter`;
  return '';
}

export function validateNewUser({ username, displayName, role, password, confirm }) {
  const errors = [];
  if (!String(username || '').trim()) errors.push('Username wajib diisi');
  if (!String(displayName || '').trim()) errors.push('Nama lengkap wajib diisi');
  if (!['Admin', 'Petugas'].includes(role)) errors.push('Role harus dipilih');
  const passwordError = validatePassword(password ?? '', confirm ?? '');
  if (passwordError) errors.push(passwordError);
  return { isValid: errors.length === 0, errors };
}

export function validateEditUser({ username, displayName, role }) {
  const errors = [];
  if (!String(username || '').trim()) errors.push('Username wajib diisi');
  if (!String(displayName || '').trim()) errors.push('Nama lengkap wajib diisi');
  if (!['Admin', 'Petugas'].includes(role)) errors.push('Role harus dipilih');
  return { isValid: errors.length === 0, errors };
}
