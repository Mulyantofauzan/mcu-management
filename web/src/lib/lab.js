import { labItemById } from './labItems.js';

/* Hasil lab: urutan tampil dan status terhadap rentang rujukan (dipindahkan dari labItemsMapping.js dan kelola-karyawan.js). */
const DISPLAY_ORDER = [5, 6, 3, 7, 31, 8, 10, 11, 9, 32, 12, 13, 1, 2];
const ORDER_INDEX = Object.fromEntries(DISPLAY_ORDER.map((id, index) => [id, index]));

export function sortLabResults(results) {
  const rank = result => ORDER_INDEX[result.lab_item_id] ?? 999;
  return [...results].sort((a, b) => rank(a) - rank(b));
}

export function labStatus(result) {
  const { min_range_reference: min, max_range_reference: max } = result;
  if (min === null || min === undefined || max === null || max === undefined) return { label: '-', cls: 'pm' };
  const value = parseFloat(result.value);
  if (Number.isNaN(value)) return { label: '-', cls: 'pm' };
  if (value < parseFloat(min)) return { label: 'Rendah', cls: 'p1' };
  if (value > parseFloat(max)) return { label: 'Tinggi', cls: 'p3' };
  return { label: 'Normal', cls: 'p0' };
}

export function labRange(result) {
  const { min_range_reference: min, max_range_reference: max } = result;
  const has = value => value !== null && value !== undefined;
  return has(min) && has(max) ? `${min} - ${max}` : '-';
}

/* Nama dari relasi lab_items; bila kosong, dari tabel item lab lokal. */
export function labName(result) {
  return result.lab_items?.name || labItemById(result.lab_item_id)?.name || 'N/A';
}
