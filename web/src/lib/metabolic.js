/* Sindrom metabolik: lima kriteria. Dipindahkan dari metabolicSyndromeService.js lama. Nilai tidak ada = undefined. */
const isMale = gender => ['pria', 'laki-laki', 'male', 'm'].includes(String(gender || '').toLowerCase());
const missing = value => !value;

export function waistScore(waist, gender) {
  if (missing(waist)) return undefined;
  const value = parseFloat(waist);
  return value >= (isMale(gender) ? 90 : 80) ? 1 : 0;
}

export function triglycerideScore(value) {
  if (missing(value)) return undefined;
  return parseFloat(value) >= 150 ? 1 : 0;
}

export function hdlScore(value, gender) {
  if (missing(value)) return undefined;
  return parseFloat(value) < (isMale(gender) ? 40 : 50) ? 1 : 0;
}

export function pressureScore(bloodPressure) {
  if (!bloodPressure) return undefined;
  const [systolic, diastolic] = String(bloodPressure).split('/').map(part => parseInt(part, 10));
  return systolic >= 130 || diastolic >= 85 ? 1 : 0;
}

export function glucoseScore(value, hasDiabetes) {
  if (hasDiabetes) return 1;
  if (missing(value)) return undefined;
  return parseFloat(value) >= 100 ? 1 : 0;
}

/* 3 = sindrom metabolik (skor 3 ke atas); selain itu 2 bila lingkar perut berisiko, 1 bila tidak. */
export function metabolicRisk(totalScore, lpScore) {
  if (totalScore >= 3) return 3;
  if (totalScore <= 2) return (lpScore ?? 0) === 1 ? 2 : 1;
  return 0;
}

export const METABOLIC_LABEL = { 1: 'Normal', 2: 'Medium', 3: 'Sindrom Metabolik' };

/* labs: [{ lab_item_id, value }] -> Trigliserida 9, HDL 10, GDP 7. */
export function metabolicAssessment(employee, mcu, labs, hasDiabetes) {
  const byItem = Object.fromEntries((labs || []).map(lab => [lab.lab_item_id, lab.value]));
  const scores = {
    lp: waistScore(mcu?.chestCircumference, employee?.gender),
    tg: triglycerideScore(byItem[9]),
    hdl: hdlScore(byItem[10], employee?.gender),
    td: pressureScore(mcu?.bloodPressure),
    gdp: glucoseScore(byItem[7], hasDiabetes)
  };
  const counted = Object.values(scores).filter(score => score !== undefined);
  const totalScore = counted.reduce((sum, score) => sum + score, 0);
  return { scores, totalScore, countedCriteria: counted.length, risk: metabolicRisk(totalScore, scores.lp) };
}
