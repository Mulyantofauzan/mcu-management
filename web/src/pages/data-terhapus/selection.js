/* Pilihan baris untuk aksi massal (murni). */
export const toggle = (selected, id) => (selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]);
export const toggleAll = (selected, ids) => (ids.length && ids.every(id => selected.includes(id)) ? [] : [...ids]);
export const prune = (selected, ids) => selected.filter(id => ids.includes(id));

/* Menjalankan aksi berurutan; satu kegagalan tidak menghentikan yang lain. */
export async function runBatch(ids, action) {
  const failed = [];
  let ok = 0;
  for (const id of ids) {
    try { await action(id); ok += 1; } catch (error) { failed.push({ id, message: error.message || String(error) }); }
  }
  return { ok, failed };
}

export function batchMessage(noun, verb, { ok, failed }) {
  if (!failed.length) return { text: `${ok} ${noun} berhasil ${verb}`, warning: false };
  return { text: `${ok} berhasil, ${failed.length} gagal (${failed[0].message})`, warning: true };
}
