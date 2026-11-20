/* Persentase untuk tampilan. Aturan: bila jumlah > 0, hasilnya tidak pernah "0%" (data kecil tetap terlihat). */
export const percentOf = (count, total) => (total ? (count / total) * 100 : 0);

export function formatPercent(count, total) {
  if (!total || !count) return '0%';
  const value = percentOf(count, total);
  if (value >= 100) return '100%';
  if (value < 0.01) return '<0,01%';
  let text = value.toFixed(value >= 1 ? 1 : 2);
  if (text.startsWith('100')) text = '99.9';
  text = text.includes('.') ? text.replace(/\.?0+$/, '') : text;
  return `${text.replace('.', ',')}%`;
}

/* "12 (24%)": jumlah selalu mendampingi persen. */
export const countWithPercent = (count, total) => `${count} (${formatPercent(count, total)})`;
