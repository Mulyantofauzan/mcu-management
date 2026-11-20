/* Analisis (murni): data set per periode, filter, dan semua sebaran. Aturan dari analysisDashboardService.js lama. */
import { evaluateVision, gradeLabel } from '../../lib/vision.js';
import { LAB_ITEMS } from '../../lib/labItems.js';

export const STATUSES = ['Fit', 'Fit With Note', 'Follow-Up', 'Temporary Unfit', 'Unfit'];
const yearOf = item => new Date(item.mcu.mcuDate).getFullYear();

/* Riwayat: satu MCU per karyawan per tahun (yang pertama pada urutan terbaru), hanya karyawan aktif. */
export function yearlyEntries(history) {
  const seen = new Set();
  const entries = [];
  [...history].sort((a, b) => new Date(b.mcu.mcuDate) - new Date(a.mcu.mcuDate)).forEach(item => {
    if (!item.employee?.isActive || !item.mcu?.mcuDate) return;
    const key = `${item.mcu.employeeId}-${yearOf(item)}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push(item);
  });
  return entries;
}

export const yearsOf = entries => [...new Set(entries.map(yearOf))].sort((a, b) => b - a);

export function applyFilters(items, { department = '', jobTitle = '', status = '', year = '' } = {}) {
  return items.filter(item => {
    if (department && item.employee.department !== department) return false;
    if (jobTitle && item.employee.jobTitle !== jobTitle) return false;
    if (status && item.mcu.status !== status) return false;
    if (year && yearOf(item) !== Number(year)) return false;
    return true;
  });
}

export function summary(items) {
  const count = status => items.filter(item => item.mcu.status === status).length;
  return { total: items.length, fit: count('Fit'), fitWithNote: count('Fit With Note'), unfit: count('Unfit') };
}

/* Tren: jumlah MCU per tahun per status (status kosong dihitung Unfit, seperti kode lama). */
export function trendByYear(items) {
  const map = {};
  items.forEach(item => {
    const year = yearOf(item);
    const status = item.mcu.status || 'Unfit';
    map[year] ||= {};
    map[year][status] = (map[year][status] || 0) + 1;
  });
  const years = Object.keys(map).map(Number).sort((a, b) => a - b);
  return { years, series: STATUSES.map(status => ({ label: status, values: years.map(year => map[year][status] || 0) })) };
}

export const BMI_BUCKETS = [
  { label: 'Underweight (<18.5)', test: bmi => bmi < 18.5 }, { label: 'Normal (18.5-24.9)', test: bmi => bmi >= 18.5 && bmi < 25 },
  { label: 'Overweight (25-29.9)', test: bmi => bmi >= 25 && bmi < 30 }, { label: 'Obese (≥30)', test: bmi => bmi >= 30 }
];

export function bmiDistribution(items) {
  const counts = BMI_BUCKETS.map(bucket => ({ label: bucket.label, value: 0 }));
  items.forEach(({ mcu }) => {
    const bmi = parseFloat(mcu.bmi);
    if (Number.isNaN(bmi)) return;
    const index = BMI_BUCKETS.findIndex(bucket => bucket.test(bmi));
    if (index >= 0) counts[index].value += 1;
  });
  return counts;
}

export const BP_BUCKETS = [
  { label: '<130/<85', test: (s, d) => s <= 129 && d <= 84 }, { label: '130-139/85-89', test: (s, d) => s >= 130 && s <= 139 && d >= 85 && d <= 89 },
  { label: '140-159/90-99', test: (s, d) => s >= 140 && s <= 159 && d >= 90 && d <= 99 }, { label: '160-179/100-109', test: (s, d) => s >= 160 && s <= 179 && d >= 100 && d <= 109 },
  { label: '≥180/≥110', test: (s, d) => s >= 180 && d >= 110 }
];

/* Pasangan sistolik/diastolik yang tidak masuk satu kelompok (campuran) tidak dihitung, sama seperti kode lama. */
export function bloodPressureDistribution(items) {
  const counts = BP_BUCKETS.map(bucket => ({ label: bucket.label, value: 0 }));
  items.forEach(({ mcu }) => {
    if (!mcu.bloodPressure) return;
    const [systolic, diastolic] = String(mcu.bloodPressure).split('/').map(part => parseInt(part, 10));
    if (Number.isNaN(systolic) || Number.isNaN(diastolic)) return;
    const index = BP_BUCKETS.findIndex(bucket => bucket.test(systolic, diastolic));
    if (index >= 0) counts[index].value += 1;
  });
  return counts;
}

export function visionDistribution(items) {
  const order = ['normal', 'ringan', 'sedang', 'berat', 'unmeasured'];
  const counts = Object.fromEntries(order.map(id => [id, 0]));
  items.forEach(({ mcu }) => { counts[evaluateVision(mcu)] += 1; });
  return order.map(id => ({ label: gradeLabel(id), value: counts[id] }));
}

export function smokingDistribution(items) {
  const labels = ['Tidak Merokok', 'Mantan Perokok', 'Perokok'];
  const counts = Object.fromEntries(labels.map(label => [label, 0]));
  items.forEach(({ mcu }) => {
    const raw = mcu.smokingStatus;
    const mapped = raw === 'Perokok Aktif' ? 'Perokok' : raw;
    if (mapped in counts) counts[mapped] += 1;
  });
  return labels.map(label => ({ label, value: counts[label] }));
}

export function exerciseDistribution(items) {
  const labels = ['>2x Seminggu', '1-2x Seminggu', '1-2x Sebulan', 'Tidak Pernah'];
  const counts = Object.fromEntries(labels.map(label => [label, 0]));
  items.forEach(({ mcu }) => { if (mcu.exerciseFrequency in counts) counts[mcu.exerciseFrequency] += 1; });
  return labels.map(label => ({ label, value: counts[label] }));
}

const NORMALIZE = { normal: 'Normal', nornal: 'Normal', normall: 'Normal', noraml: 'Normal', positive: 'Positive', positif: 'Positive', negatif: 'Negative', negative: 'Negative', good: 'Good', baik: 'Good', poor: 'Poor', buruk: 'Poor', fair: 'Fair', sedang: 'Fair', fit: 'Fit', 'not fit': 'Not Fit', unfit: 'Not Fit' };

export function normalizeExamValue(value) {
  if (!value) return 'Not Recorded';
  const text = String(value).trim();
  const lower = text.toLowerCase();
  if (lower.includes('6/') || lower.includes('visus') || lower.includes('vods')) {
    const match = text.match(/6\/\d+/i);
    if (match) {
      const acuity = match[0].toUpperCase();
      if (/jauh|distance|distand/.test(lower)) return `${acuity} (Far)`;
      if (/dekat|near/.test(lower)) return `${acuity} (Near)`;
      return acuity;
    }
  }
  if (NORMALIZE[lower]) return NORMALIZE[lower];
  return text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

export const EXAMS = [['audiometry', 'Audiometri'], ['spirometry', 'Spirometri'], ['hbsag', 'HBsAg'], ['xray', 'X-Ray'], ['ekg', 'EKG'], ['treadmill', 'Treadmill'], ['napza', 'NAPZA'], ['colorblind', 'Buta Warna']];

export function examDistribution(items, key) {
  const counts = new Map();
  items.forEach(({ mcu }) => {
    const raw = mcu[key];
    if (!raw || String(raw).trim() === '') return;
    const value = normalizeExamValue(raw);
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/* Lab: status dibaca dari kolom notes (Normal/High/Low), seperti aplikasi lama; rata-rata dari nilai yang ada. */
export function labStats(items, labsByMcu) {
  return LAB_ITEMS.map(item => {
    const counts = { Normal: 0, Low: 0, High: 0, 'Not Recorded': 0 };
    const values = [];
    items.forEach(({ mcu }) => {
      const lab = (labsByMcu.get(String(mcu.mcuId)) || []).find(row => Number(row.lab_item_id) === item.id);
      if (!lab) { counts['Not Recorded'] += 1; return; }
      if (lab.value || lab.value === 0) values.push(parseFloat(lab.value));
      const note = String(lab.notes || '').trim();
      counts[['Normal', 'High', 'Low'].includes(note) ? note : 'Not Recorded'] += 1;
    });
    const total = counts.Normal + counts.Low + counts.High + counts['Not Recorded'];
    return { id: item.id, name: item.name, unit: item.unit, counts, total, average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null };
  }).filter(stat => stat.total > 0);
}

export const optionsOf = (items, pick) => [...new Set(items.map(pick).filter(Boolean))].sort();
