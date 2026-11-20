/* Riwayat Kesehatan (murni): filter periode, ringkasan status, dan titik timeline. Aturan dari employee-health-history.html lama. */
const DAY = 24 * 60 * 60 * 1000;
const LEVEL = { Fit: 3, 'Fit With Note': 2.5, 'Follow-Up': 2, 'Temporary Unfit': 1.5, Unfit: 1 };

export const VIEWS = [
  { value: 'all', label: 'Semua Waktu' }, { value: 'year', label: 'Tahun Ini' }, { value: '6months', label: '6 Bulan Terakhir' }, { value: '3months', label: '3 Bulan Terakhir' }
];

export const resultOfInitial = mcu => mcu.initialResult || mcu.status || '';

export function filterByPeriod(mcus, view, now = new Date()) {
  const start = { year: new Date(now.getFullYear(), 0, 1), '6months': new Date(now.getTime() - 180 * DAY), '3months': new Date(now.getTime() - 90 * DAY) }[view];
  return start ? mcus.filter(mcu => new Date(mcu.mcuDate) >= start) : mcus;
}

export const newestFirst = mcus => [...mcus].sort((a, b) => new Date(b.mcuDate) - new Date(a.mcuDate));

export function summarize(mcus) {
  const ordered = newestFirst(mcus);
  const count = result => mcus.filter(mcu => resultOfInitial(mcu) === result).length;
  return { fit: count('Fit'), unfit: count('Unfit'), followUp: count('Follow-Up'), latest: ordered.length ? resultOfInitial(ordered[0]) || '-' : '-' };
}

/* Titik timeline dari yang terlama; y 0..1 (1 = Fit). */
export function timelinePoints(mcus) {
  const ordered = [...mcus].sort((a, b) => new Date(a.mcuDate) - new Date(b.mcuDate));
  return ordered.map((mcu, index) => ({
    mcuId: mcu.mcuId, date: mcu.mcuDate, result: resultOfInitial(mcu), index,
    level: LEVEL[resultOfInitial(mcu)] ?? 0
  }));
}

export const noteOf = mcu => String(mcu.initialNotes || mcu.finalNotes || '').trim();
export const shortNote = (mcu, max = 100) => { const note = noteOf(mcu); return note.length > max ? `${note.slice(0, max)}...` : note; };
