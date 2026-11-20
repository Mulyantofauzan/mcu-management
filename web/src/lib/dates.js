/* Batas hari lokal sebagai ISO (untuk filter rentang tanggal). */
export function dayStartIso(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day.toISOString();
}

export function dayEndIso(date) {
  const day = new Date(date);
  day.setHours(23, 59, 59, 999);
  return day.toISOString();
}
