/* Logika murni log aktivitas: rentang tanggal, jendela nomor halaman, CSV, dan nama berkas. */
export const PAGE_SIZE = 20;

const stamp = value => (value ? new Date(value).toLocaleString('id-ID') : '-');
export const detailOf = activity => activity.details || activity.targetId || '-';

export function activityCsv(activities, filters, now = new Date()) {
  const cell = value => {
    const text = String(value);
    return text.includes(',') || text.includes('"') ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = ['# Activity Log Export', `# Exported: ${now.toLocaleString('id-ID')}`];
  if (Object.values(filters).some(Boolean)) {
    lines.push('# Filters Applied:');
    if (filters.action) lines.push(`# - Action: ${filters.action}`);
    if (filters.target) lines.push(`# - Target: ${filters.target}`);
    if (filters.userName) lines.push(`# - User: ${filters.userName}`);
    if (filters.fromDate) lines.push(`# - From Date: ${filters.fromDate}`);
    if (filters.toDate) lines.push(`# - To Date: ${filters.toDate}`);
  }
  lines.push('#', 'Waktu,User,Aksi,Target,Detail');
  activities.forEach(activity => {
    lines.push([stamp(activity.timestamp), activity.userName || 'System', activity.action, activity.target || '-', detailOf(activity)].map(cell).join(','));
  });
  return '﻿' + lines.join('\n');
}

export function exportFileName(filters, now = new Date()) {
  const parts = [];
  if (filters.action) parts.push(`action-${filters.action}`);
  if (filters.target) parts.push(`target-${filters.target}`);
  return `activity-log${parts.length ? `-${parts.join('-')}` : ''}-${now.toISOString().split('T')[0]}.csv`;
}
