/* Ekspor Excel Rahma - Jakarta Cardiovascular: lembar Resume dan lembar data (kolom dan warna mengikuti excelExportService lama). ExcelJS dimuat saat dibutuhkan. */
import { RISK_LEVELS, riskCounts } from '../../pages/rahma/assessment.js';

const BORDER = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } }, left: { style: 'thin', color: { argb: 'FFD1D5DB' } }, bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, right: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const RISK_TOTAL_FILL = { 1: 'FFDCFCE7', 2: 'FFDCFCE7', 3: 'FFFEF3C7', 4: 'FFFEF3C7', 6: 'FFFED7AA', 9: 'FFFCA5A5' };
const LEVEL_FILL = { 1: 'FFF0FDF4', 2: 'FFFEF3C7', 3: 'FFFEF2F2', 4: 'FFFAF5FF' };
const dash = value => (value === undefined || value === null ? '-' : value);

function style(row, fillFor, { bold = false, size = 10 } = {}) {
  row.eachCell((cell, col) => {
    const color = fillFor(col);
    if (color) cell.fill = fill(color);
    cell.font = { bold, size, color: { argb: 'FF1F2937' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = BORDER;
  });
}

const groupFill = (strong = false) => col => (col <= 4 ? 'FFFFFFFF' : col <= 13 ? (strong ? 'FFFCD34D' : 'FFFEF3C7') : col <= 20 ? (strong ? 'FF93C5FD' : 'FFDBEAFE') : col === 21 ? 'FFFECACA' : 'FFE5E7EB');

export function dataRows(rows) {
  return rows.map((item, index) => {
    const m = item.metabolic || {};
    return [index + 1, item.name || '-', item.jobTitle || '-', item.department || '-',
      item.scores?.jk ?? 0, item.scores?.umur ?? 0, item.scores?.td ?? 0, item.scores?.imt ?? 0, item.scores?.merokok ?? 0, item.scores?.diabetes ?? 0, item.scores?.aktivitasFisik ?? 0, item.score, item.cvLevel || '-',
      dash(m.scores?.lp), dash(m.scores?.tg), dash(m.scores?.hdl), dash(m.scores?.td), dash(m.scores?.gdp), dash(m.totalScore), dash(m.risk), item.riskTotal || 0, RISK_LEVELS[item.riskLevel] || 'Unknown'];
  });
}

export async function buildWorkbook(ExcelJS, rows, allRows) {
  const workbook = new ExcelJS.Workbook();
  const resume = workbook.addWorksheet('Resume', { views: [] });
  resume.columns = [{ width: 25 }, { width: 15 }, { width: 15 }];
  resume.addRow(['Jakarta Cardiovascular Score - Resume']).font = { bold: true, size: 14 };
  resume.addRow([]);
  resume.addRow([`Generated: ${new Date().toLocaleDateString('id-ID')}`]);
  resume.addRow([]);
  style(resume.addRow(['Risk Level', 'Count', 'Percentage']), () => 'FFE5E7EB', { bold: true });
  riskCounts(allRows).forEach(item => style(resume.addRow([`${item.label}${item.level < 4 ? ' Risk' : ''}`, item.count, item.percentText]), () => 'FFFFFFFF'));
  resume.addRow([]);
  style(resume.addRow(['TOTAL', allRows.length, '100%']), () => 'FFE5E7EB', { bold: true });

  const sheet = workbook.addWorksheet('Jakarta Cardiovascular');
  sheet.columns = [8, 25, 24, 20, 12, 12, 12, 12, 15, 15, 18, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 15].map(width => ({ width }));
  sheet.addRow(['Jakarta Cardiovascular Assessment Report']).font = { bold: true, size: 14 };
  sheet.addRow([]);
  sheet.addRow([`Generated: ${new Date().toLocaleDateString('id-ID')}`]);
  sheet.addRow([]);
  const group = sheet.addRow(['No', 'Nama', 'Jabatan', 'Departemen', 'Jakarta Cardiovascular Score', '', '', '', '', '', '', '', '', 'Sindrom Metabolik', '', '', '', '', '', '', 'Risk Total', 'Risk Level']);
  sheet.mergeCells(`E${group.number}:M${group.number}`);
  sheet.mergeCells(`N${group.number}:T${group.number}`);
  style(group, groupFill(true), { bold: true, size: 11 });
  const heads = sheet.addRow(['No', 'Nama', 'Jabatan', 'Departemen', 'JK', 'Umur', 'TD', 'IMT', 'Merokok', 'Diabetes', 'Aktivitas Fisik', 'Nilai', 'Risk', 'LP', 'TG', 'HDL', 'TD', 'GDP', 'Nilai', 'Risk', 'Risk Total', 'Risk Level']);
  style(heads, groupFill(false), { bold: true });
  dataRows(rows).forEach((values, index) => {
    const item = rows[index];
    style(sheet.addRow(values), col => (col === 21 ? RISK_TOTAL_FILL[item.riskTotal] || 'FFFFFFFF' : col === 22 ? LEVEL_FILL[item.riskLevel] || 'FFFFFFFF' : groupFill(false)(col)));
  });
  sheet.views = [{ state: 'frozen', xSplit: 4, ySplit: heads.number }];
  return workbook;
}

export const workbookFileName = (now = new Date()) => `Jakarta Cardiovascular - ${now.toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`;

export async function exportRahmaExcel(rows, allRows) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = await buildWorkbook(ExcelJS, rows, allRows);
  const buffer = await workbook.xlsx.writeBuffer();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  link.download = workbookFileName();
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
