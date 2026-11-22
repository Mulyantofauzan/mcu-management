/* Ekspor CSV. Aturan kutip dan BOM UTF-8 sama dengan exportHelpers.js lama (agar terbuka benar di Excel). */
export function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const cell = value => {
    if (value === null || value === undefined) return '';
    let text = String(value);
    /* Sel yang diawali = + - @ tab atau CR dibaca spreadsheet sebagai rumus; awali dengan kutip tunggal. */
    const harmless = typeof value === 'number' || text === '-' || /^-?\d+([.,]\d+)?$/.test(text);
    if (/^[=+\-@\t\r]/.test(text) && !harmless) text = `'${text}`;
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headers.join(','), ...rows.map(row => headers.map(key => cell(row[key])).join(','))];
  return '﻿' + lines.join('\n');
}

export function downloadCsv(rows, filename) {
  downloadCsvFile(rows, `${filename}_${Date.now()}.csv`);
}

export function downloadCsvFile(rows, fileName) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
