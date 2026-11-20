/* Definisi menu: satu sumber untuk sidebar, judul halaman, dan pemeriksaan peran. */
import { PAGE_ROLES } from './roleAccess.js';

export const NAV_GROUPS = Object.freeze([
  { label: 'Utama', items: [{ key: 'dashboard', label: 'Dashboard', icon: 'dash' }] },
  {
    label: 'Data',
    items: [
      { key: 'kelola-karyawan', label: 'Kelola Karyawan', icon: 'users' },
      { key: 'tambah-karyawan', label: 'Tambah Karyawan', icon: 'plus' },
      { key: 'follow-up', label: 'Follow-up', icon: 'pulse' },
      { key: 'mcu-expiry-management', label: 'Masa Berlaku MCU', icon: 'cal' },
      { key: 'employee-health-history', label: 'Riwayat Kesehatan', icon: 'history' },
      { key: 'data-master', label: 'Data Master', icon: 'gear' }
    ]
  },
  {
    label: 'Analisis',
    items: [
      { key: 'analysis', label: 'Analisis', icon: 'chart' },
      { key: 'report-period', label: 'Laporan Periode', icon: 'file' },
      { key: 'assessment-rahma', label: 'Rahma - Jakarta Cardiovascular', icon: 'heart' }
    ]
  },
  {
    label: 'Pengaturan',
    items: [
      { key: 'kelola-user', label: 'Kelola User', icon: 'lock' },
      { key: 'activity-log', label: 'Log Aktivitas', icon: 'list' },
      { key: 'data-terhapus', label: 'Data Terhapus', icon: 'trash' }
    ]
  }
]);

export function menuForRole(role) {
  return NAV_GROUPS
    .map(group => ({ ...group, items: group.items.filter(item => (PAGE_ROLES[item.key] || []).includes(role)) }))
    .filter(group => group.items.length > 0);
}

export function pageLabel(key) {
  for (const group of NAV_GROUPS) {
    const found = group.items.find(item => item.key === key);
    if (found) return found.label;
  }
  return 'MADIS';
}

export function pathFor(key) {
  return key === 'dashboard' ? '/' : `/${key}`;
}
