/* Nomor halaman yang ditampilkan: jendela di sekitar halaman aktif, plus 1 dan terakhir. */
export function pageWindow(current, total, max = 5) {
  if (total <= 1) return [];
  let start = Math.max(1, current - Math.floor(max / 2));
  const end = Math.min(total, start + max - 1);
  start = Math.max(1, end - max + 1);
  const pages = [];
  if (start > 1) { pages.push(1); if (start > 2) pages.push('...'); }
  for (let page = start; page <= end; page++) pages.push(page);
  if (end < total) { if (end < total - 1) pages.push('...'); pages.push(total); }
  return pages;
}
