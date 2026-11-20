/* Warna seri grafik: hanya token tema, jadi otomatis benar di terang dan gelap. */
export const SERIES = ['var(--good)', 'var(--info)', 'var(--warn)', 'var(--crit)', 'var(--fg)', 'var(--accent)', 'var(--muted)', 'var(--faint)'];

export const STATUS_COLORS = {
  Fit: 'var(--good)',
  'Fit With Note': 'var(--info)',
  'Follow-Up': 'var(--warn)',
  'Temporary Unfit': 'var(--crit)',
  Unfit: 'var(--fg)'
};

export const TYPE_COLORS = {
  'Pre-Employee': 'var(--info)',
  Annual: 'var(--good)',
  Khusus: 'var(--warn)',
  Final: 'var(--fg)'
};

export const RISK_COLORS = ['var(--good)', 'var(--warn)', 'var(--crit)'];

export function colorFor(map, label, index) {
  return map?.[label] ?? SERIES[index % SERIES.length];
}
