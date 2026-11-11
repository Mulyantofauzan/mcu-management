/**
 * Single source of truth for which role may open which page.
 * The sidebar only hides links; this is what actually blocks navigation.
 * Real data protection is enforced by database policies and server APIs.
 */

const STAFF = ['Admin', 'Petugas'];
const ADMIN = ['Admin'];
const DOCTOR = ['Dokter'];

export const PAGE_ROLES = Object.freeze({
  dashboard: STAFF,
  'tambah-karyawan': STAFF,
  'kelola-karyawan': STAFF,
  'follow-up': STAFF,
  'data-master': STAFF,
  'mcu-expiry-management': STAFF,
  'assessment-rahma': STAFF,
  analysis: STAFF,
  'report-period': STAFF,
  'employee-health-history': STAFF,
  'kelola-user': ADMIN,
  'activity-log': ADMIN,
  'data-terhapus': ADMIN,
  'keputusan-bergabung': ADMIN,
  'validasi-mcu': DOCTOR,
  'profil-dokter': DOCTOR
});

const HOME_PAGE = Object.freeze({ Admin: 'dashboard', Petugas: 'dashboard', Dokter: 'validasi-mcu' });

export function pageFromPath(pathname = '') {
  const file = String(pathname).split('/').filter(Boolean).pop() || '';
  const name = file.replace(/\.html$/, '');
  return !name || name === 'index' || name === 'mcu-management' ? 'dashboard' : name;
}

export function resolveAccess({ role, page }) {
  const allowedRoles = PAGE_ROLES[page];
  if (!allowedRoles || !allowedRoles.includes(role)) {
    return { allowed: false, redirectPage: HOME_PAGE[role] || null };
  }
  return { allowed: true, redirectPage: null };
}
