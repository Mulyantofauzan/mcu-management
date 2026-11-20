/* Sebaran untuk grafik Dashboard. Semua fungsi murni dan menerima model yang sudah disaring. */
import { resultOf } from './filter.js';
import { percentOf, formatPercent } from '../../../lib/percent.js';

export const STATUS_ORDER = ['Fit', 'Fit With Note', 'Follow-Up', 'Temporary Unfit', 'Unfit'];
export const TYPE_ORDER = ['Pre-Employee', 'Annual', 'Khusus', 'Final'];
export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function countBy(models, keyOf, order) {
  const counts = Object.fromEntries(order.map(key => [key, 0]));
  models.forEach(model => {
    const key = keyOf(model);
    if (key in counts) counts[key]++;
  });
  return order.map(label => ({ label, value: counts[label] }));
}

export const statusCounts = models => countBy(models, ({ mcu }) => resultOf(mcu), STATUS_ORDER);
export const typeCounts = models => countBy(models, ({ mcu }) => mcu.mcuType, TYPE_ORDER);
export const bloodTypeCounts = models => countBy(models, ({ employee }) => employee.bloodType, BLOOD_TYPES);

export function departmentCounts(models, departments) {
  const names = departments.map(department => department.name).filter(Boolean);
  return countBy(models, ({ employee }) => employee.department, names)
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

export const AGE_BUCKETS = [
  { label: 'Di bawah 25', test: age => age < 25 },
  { label: '25 sampai 34', test: age => age >= 25 && age < 35 },
  { label: '35 sampai 44', test: age => age >= 35 && age < 45 },
  { label: '45 sampai 54', test: age => age >= 45 && age < 55 },
  { label: '55 ke atas', test: age => age >= 55 }
];

export function ageOn(birthDate, today = new Date()) {
  return Math.floor((today - new Date(birthDate)) / (365.25 * 24 * 60 * 60 * 1000));
}

export function ageCounts(models, today = new Date()) {
  const counts = AGE_BUCKETS.map(bucket => ({ label: bucket.label, value: 0 }));
  models.forEach(({ employee }) => {
    if (!employee.birthDate) return;
    const age = ageOn(employee.birthDate, today);
    const index = AGE_BUCKETS.findIndex(bucket => bucket.test(age));
    if (index >= 0) counts[index].value++;
  });
  return counts;
}

export function bmiCounts(models) {
  const counts = { Kurus: 0, Normal: 0, Berlebih: 0, Obesitas: 0, 'Tanpa data': 0 };
  models.forEach(({ mcu }) => {
    if (!mcu.bmi) { counts['Tanpa data']++; return; }
    const bmi = parseFloat(mcu.bmi);
    if (bmi < 18.5) counts.Kurus++;
    else if (bmi < 25) counts.Normal++;
    else if (bmi < 30) counts.Berlebih++;
    else counts.Obesitas++;
  });
  return Object.entries(counts).map(([label, value]) => ({ label, value }));
}

export function withShare(items) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return items.map(item => ({ ...item, share: percentOf(item.value, total), percent: formatPercent(item.value, total) }));
}
