/* Logika halaman Masa Berlaku MCU (murni): daftar perhatian, filter, urutan, KPI, dan baris ekspor. */
import { formatDate } from '../../lib/format.js';
import { percentOf, formatPercent } from '../../lib/percent.js';

export const PAGE_SIZE = 10;
export const STATUS_LABEL = { EXPIRED: 'Expired', WARNING: 'Warning' };
const STATUS_RANK = { EXPIRED: 0, WARNING: 1, OK: 2 };

export const attentionRows = overview => overview.filter(row => row.expiryStatus === 'EXPIRED' || row.expiryStatus === 'WARNING');

export function departmentsOf(rows) {
  return [...new Set(rows.map(row => row.department))].filter(Boolean).sort();
}

export function filterAndSort(rows, { department = '', status = '', sort = 'days' } = {}) {
  const list = rows.filter(row => (!department || row.department === department) && (!status || row.expiryStatus === status));
  const daysOf = row => (row.daysLeft === null || row.daysLeft === undefined ? 999999 : row.daysLeft);
  const rank = row => STATUS_RANK[row.expiryStatus] ?? 999;
  return list.sort(sort === 'status' ? (a, b) => rank(a) - rank(b) : (a, b) => daysOf(a) - daysOf(b));
}

export function daysText(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return '-';
  if (daysLeft < 0) return `${Math.abs(daysLeft)} hari lewat`;
  if (daysLeft === 0) return 'Hari ini';
  return `${daysLeft} hari`;
}

const percent = (part, whole) => percentOf(part, whole);

export function kpiStats(overview) {
  const expired = overview.filter(row => row.expiryStatus === 'EXPIRED').length;
  const warning = overview.filter(row => row.expiryStatus === 'WARNING').length;
  const total = expired + warning;
  return {
    expired, warning, total,
    expiredShare: percent(expired, total), warningShare: percent(warning, total), totalShare: percent(total, overview.length),
    expiredText: `${expired} dari ${total} · ${formatPercent(expired, total)}`, warningText: `${warning} dari ${total} · ${formatPercent(warning, total)}`,
    totalText: `${total} dari ${overview.length} karyawan · ${formatPercent(total, overview.length)}`
  };
}

export function exportRows(rows) {
  return rows.map((row, index) => ({
    No: index + 1,
    'ID Karyawan': row.employeeId || '-',
    Nama: row.name,
    Departemen: row.department || '-',
    Jabatan: row.jobTitle || '-',
    'Tanggal Pemeriksaan': row.lastMcuDate ? formatDate(row.lastMcuDate) : '-',
    'Berlaku Sampai': row.expiryDate ? formatDate(row.expiryDate) : '-',
    'Hari Tersisa': row.daysLeft === null || row.daysLeft === undefined ? '-' : row.daysLeft,
    Status: row.expiryStatus
  }));
}
