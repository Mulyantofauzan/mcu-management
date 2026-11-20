/* Penilaian Rahma - Jakarta Cardiovascular (murni): risiko total, tingkat, baris, filter, dan hitungan kartu. */
import { jakartaScore, jakartaLevel, hasDiabetesHistory } from '../../lib/jakarta.js';
import { metabolicAssessment } from '../../lib/metabolic.js';
import { calculateAge } from '../../lib/people.js';
import { percentOf, formatPercent } from '../../lib/percent.js';

export const RISK_LEVELS = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };

/* Total = level Jakarta x risiko metabolik (bila ada). Hanya hasil kali 1,2,3,4,6,9 yang dikenal. */
export function riskTotalOf(cvLevel, metabolic) {
  if (!cvLevel) return 0;
  return metabolic > 0 ? cvLevel * metabolic : cvLevel;
}

export function riskLevelFromTotal(total) {
  if (total === 1 || total === 2) return 1;
  if (total === 3 || total === 4) return 2;
  if (total === 6) return 3;
  if (total === 9) return 4;
  return 0;
}

export function buildAssessments(models, historiesByMcu, labsByMcu, today = new Date()) {
  const rows = [];
  models.forEach(({ employee, mcu }) => {
    if (!employee?.isActive || !mcu) return;
    const diabetes = hasDiabetesHistory(historiesByMcu.get(mcu.mcuId));
    const { score, scores } = jakartaScore(employee, mcu, diabetes, today);
    const metabolic = metabolicAssessment(employee, mcu, labsByMcu.get(String(mcu.mcuId)) || [], diabetes);
    const cvLevel = jakartaLevel(score);
    const riskTotal = riskTotalOf(cvLevel, metabolic.risk);
    rows.push({
      employeeId: employee.employeeId, name: employee.name, gender: employee.gender, age: calculateAge(employee.birthDate, today),
      department: employee.department, jobTitle: employee.jobTitle, bloodPressure: mcu.bloodPressure, bmi: mcu.bmi, smoking: mcu.smokingStatus,
      exercise: mcu.exerciseFrequency, waist: mcu.chestCircumference, diabetes, score, scores, cvLevel, metabolic, riskTotal, riskLevel: riskLevelFromTotal(riskTotal), mcu
    });
  });
  return rows.sort((a, b) => b.score - a.score);
}

export function filterAssessments(rows, { department = '', jobTitle = '', riskLevel = '', search = '' } = {}) {
  const term = search.trim().toLowerCase();
  return rows.filter(row => (!department || row.department === department) && (!jobTitle || row.jobTitle === jobTitle)
    && (!riskLevel || row.riskLevel === Number(riskLevel)) && (!term || String(row.name).toLowerCase().includes(term)));
}

export function riskCounts(rows) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  rows.forEach(row => { if (row.riskLevel) counts[row.riskLevel] += 1; });
  const total = rows.length;
  return [1, 2, 3, 4].map(level => ({ level, label: RISK_LEVELS[level], count: counts[level], percent: percentOf(counts[level], total), percentText: formatPercent(counts[level], total) }));
}

export const optionsOf = (rows, key) => [...new Set(rows.map(row => row[key]).filter(Boolean))].sort();
