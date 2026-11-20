/* Teks aktivitas terbaru. Aturan pemilihan dan kata kerja mengikuti dashboard lama. */
const EMPLOYEE_ACTIONS = { create: 'Menambah karyawan', delete: 'Menghapus karyawan' };
const MCU_ACTIONS = { create: 'Menambah MCU', update: 'Memperbarui MCU', delete: 'Menghapus MCU' };
const TAGS = { create: 'Tambah', update: 'Ubah', delete: 'Hapus' };

export function describeActivity(activity, { employeeName, mcuOwnerName }) {
  const { target, action, targetId, details } = activity;
  if (target === 'Employee') {
    const verb = EMPLOYEE_ACTIONS[action];
    if (!verb) return null;
    return { who: activity.userName || 'System', text: `${verb} ${employeeName(targetId) || targetId || 'Karyawan'}`, tag: TAGS[action] };
  }
  if (target === 'MCU') {
    const verb = MCU_ACTIONS[action];
    if (!verb) return null;
    const followUp = action === 'update' && String(details || '').toLowerCase().includes('follow-up');
    const owner = mcuOwnerName(targetId) || targetId || 'Karyawan';
    return { who: activity.userName || 'System', text: `${followUp ? 'Melakukan Follow-Up' : verb} ${owner}`, tag: followUp ? 'Follow-Up' : TAGS[action] };
  }
  return null;
}

export function recentActivities(activities, lookups, limit = 5) {
  return activities
    .map(activity => {
      const described = describeActivity(activity, lookups);
      return described ? { ...described, timestamp: activity.timestamp } : null;
    })
    .filter(Boolean)
    .slice(0, limit);
}
