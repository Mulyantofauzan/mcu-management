/* Laporan Periode (murni): baris laporan, statistik, dan ekspor konsolidasi. Aturan dari report-period.html dan reportExportService.js lama. */
import { formatDate } from '../../lib/format.js';
import { formatPercent } from '../../lib/percent.js';

const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function defaultRange(now = new Date()) {
  return { from: iso(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)), to: iso(now) };
}

export function buildReport(mcus, employees, { department = '', status = '' } = {}) {
  const byId = new Map(employees.map(employee => [employee.employeeId, employee]));
  const rows = [];
  const unique = new Set();
  const used = [];
  mcus.forEach(mcu => {
    const employee = byId.get(mcu.employeeId);
    if (!employee || employee.deletedAt || mcu.deletedAt) return;
    if (department && (employee.department || '').trim() !== department) return;
    if (status && mcu.initialResult !== status) return;
    unique.add(employee.employeeId);
    used.push(mcu);
    rows.push({
      employeeId: employee.employeeId,
      employeeName: employee.name,
      department: (employee.department || '').trim() || 'N/A',
      jobTitle: (employee.jobTitle || '').trim() || 'N/A',
      mcuDate: formatDate(mcu.mcuDate),
      mcuType: mcu.mcuType || 'N/A',
      status: mcu.initialResult || '-',
      initialResult: mcu.initialResult || '-',
      finalResult: mcu.finalResult || '-'
    });
  });
  return { rows, mcus: used, employeeCount: unique.size };
}

const pct = formatPercent;

export function reportStats(rows, employeeCount) {
  const fit = rows.filter(row => row.status === 'Fit').length;
  const unfit = rows.filter(row => row.status === 'Unfit' || row.status === 'Follow-Up').length;
  return { employees: employeeCount, mcus: rows.length, fit, fitPercent: pct(fit, rows.length), unfit, unfitPercent: pct(unfit, rows.length) };
}

const COLUMN_ORDER = ['nama_karyawan', 'departemen', 'jabatan', 'tanggal_lahir', 'jenis_kelamin', 'golongan_darah', 'tanggal_mcu', 'tipe_mcu', 'dokter',
  'tekanan_darah', 'nadi', 'suhu', 'respiratory_rate', 'bmi', 'vision', 'colorblind', 'audiometry', 'spirometry', 'napza', 'hbsag', 'xray', 'ekg', 'treadmill',
  'keluhan_utama', 'diagnosis_kerja', 'alasan_rujuk', 'recipient', 'status_kesehatan', 'hasil_awal', 'hasil_akhir', 'catatan_awal', 'catatan_akhir'];

export const labColumn = name => `lab_${String(name).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;

/* Satu baris per karyawan (MCU pertama pada urutan terbaru), lengkap dengan kolom lab per item. */
export function consolidate(mcus, employees, { labsByMcu, labItems, doctors }) {
  const byId = new Map(employees.map(employee => [employee.employeeId, employee]));
  const doctorName = id => doctors.find(doctor => String(doctor.id) === String(id))?.name || id || '-';
  const seen = new Set();
  const out = [];
  const items = [...labItems].sort((a, b) => a.id - b.id);
  mcus.forEach(mcu => {
    const employee = byId.get(mcu.employeeId);
    if (!employee || employee.deletedAt || mcu.deletedAt || seen.has(employee.employeeId)) return;
    seen.add(employee.employeeId);
    const labs = new Map((labsByMcu.get(String(mcu.mcuId)) || []).map(lab => [Number(lab.lab_item_id), lab]));
    const dash = value => (value === null || value === undefined || value === '' ? '-' : value);
    const row = {
      nama_karyawan: dash(employee.name), departemen: dash((employee.department || '').trim()), jabatan: dash((employee.jobTitle || '').trim()),
      tanggal_lahir: dash(employee.birthDate), jenis_kelamin: dash(employee.gender), golongan_darah: dash(employee.bloodType),
      tanggal_mcu: formatDate(mcu.mcuDate), tipe_mcu: dash(mcu.mcuType), dokter: doctorName(mcu.doctor),
      tekanan_darah: dash(mcu.bloodPressure), nadi: dash(mcu.pulse), suhu: dash(mcu.temperature), respiratory_rate: dash(mcu.respiratoryRate), bmi: dash(mcu.bmi),
      vision: '-', colorblind: dash(mcu.colorblind), audiometry: dash(mcu.audiometry), spirometry: dash(mcu.spirometry), napza: dash(mcu.napza), hbsag: dash(mcu.hbsag),
      xray: dash(mcu.xray), ekg: dash(mcu.ekg), treadmill: dash(mcu.treadmill),
      keluhan_utama: dash(mcu.keluhanUtama), diagnosis_kerja: dash(mcu.diagnosisKerja), alasan_rujuk: dash(mcu.alasanRujuk), recipient: dash(mcu.recipient),
      status_kesehatan: dash(mcu.initialResult), hasil_awal: dash(mcu.initialResult), hasil_akhir: dash(mcu.finalResult), catatan_awal: dash(mcu.initialNotes), catatan_akhir: dash(mcu.finalNotes)
    };
    items.forEach(item => {
      const lab = labs.get(Number(item.id));
      row[labColumn(item.name)] = lab && lab.value !== null && lab.value !== undefined && lab.value !== '' ? String(lab.value).trim() : '-';
    });
    out.push(row);
  });
  return out;
}

export function consolidatedCsv(rows) {
  if (!rows.length) return '';
  const labKeys = [...new Set(rows.flatMap(row => Object.keys(row).filter(key => key.startsWith('lab_'))))].sort();
  const keys = [...COLUMN_ORDER, ...labKeys];
  const header = keys.map(key => `"${key.replace(/_/g, ' ').toUpperCase()}"`).join(',');
  const lines = rows.map(row => keys.map(key => {
    let value = row[key] === null || row[key] === undefined ? '' : String(row[key]);
    value = value.replace(/\n/g, ' ').replace(/\r/g, '').trim();
    if (value !== '' && value !== '-' && (/^[\d.]+$/.test(value) || /^\d+[\d.,]*$/.test(value))) value = ` ${value}`;
    return `"${value.replace(/"/g, '""')}"`;
  }).join(','));
  return '﻿' + [header, ...lines].join('\n');
}

export function reportFileName(now = new Date()) {
  const time = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
  return `laporan-mcu-lengkap-${now.toISOString().split('T')[0]}-${time}.csv`;
}
