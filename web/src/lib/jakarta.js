/* Skor Jakarta Cardiovascular. Rumus dipindahkan apa adanya dari aplikasi lama (assessment-rahma-dashboard.js). */

function ageFrom(dateOfBirth, today = new Date()) {
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function genderPoints(gender) {
  const value = String(gender || '').toLowerCase();
  return value === 'laki-laki' || value === 'male' || value === 'm' ? 1 : 0;
}

function agePoints(age) {
  if (age < 35) return -4;
  if (age <= 39) return -3;
  if (age <= 44) return -2;
  if (age <= 49) return 0;
  if (age <= 54) return 1;
  if (age <= 59) return 2;
  return 3;
}

function bloodPressurePoints(bloodPressure) {
  const [systolic, diastolic] = String(bloodPressure).split('/').map(part => parseInt(part, 10));
  if (systolic >= 180 || diastolic >= 110) return 4;
  if ((systolic >= 160 && systolic <= 179) || (diastolic >= 100 && diastolic <= 109)) return 3;
  if ((systolic >= 140 && systolic <= 159) || (diastolic >= 90 && diastolic <= 99)) return 2;
  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 85 && diastolic <= 89)) return 1;
  return 0;
}

function bmiPoints(bmi) {
  const value = parseFloat(bmi);
  if (value >= 30) return 2;
  if (value >= 26) return 1;
  return 0;
}

function smokingPoints(status) {
  const value = String(status).toLowerCase();
  if (value.includes('tidak') || value.includes('none') || value.includes('no')) return 0;
  if (value.includes('mantan') || value.includes('bekas') || value.includes('former')) return 3;
  if (value.includes('aktif') || value.includes('current')) return 4;
  return 0;
}

function exercisePoints(frequency) {
  const value = String(frequency).toLowerCase();
  if (value.includes('tidak pernah')) return 2;
  if (value.includes('1-2x sebulan')) return 1;
  if (value.includes('1-2x seminggu')) return 0;
  if (value.includes('2x seminggu') || value.includes('>2x seminggu') || value.includes('>2')) return -3;
  return 0;
}

export function jakartaScore(employee, mcu, hasDiabetes, today = new Date()) {
  const scores = { jk: 0, umur: 0, td: 0, imt: 0, merokok: 0, diabetes: 0, aktivitasFisik: 0 };
  scores.jk = genderPoints(employee?.gender);
  if (employee?.birthDate) scores.umur = agePoints(ageFrom(employee.birthDate, today));
  if (mcu?.bloodPressure) scores.td = bloodPressurePoints(mcu.bloodPressure);
  if (mcu?.bmi) scores.imt = bmiPoints(mcu.bmi);
  if (mcu?.smokingStatus) scores.merokok = smokingPoints(mcu.smokingStatus);
  if (hasDiabetes) scores.diabetes = 2;
  if (mcu?.exerciseFrequency) scores.aktivitasFisik = exercisePoints(mcu.exerciseFrequency);
  const score = Object.values(scores).reduce((sum, value) => sum + value, 0);
  return { score, scores };
}

/* 1 rendah (-7..1), 2 sedang (2..4), 3 tinggi (5+), 0 tidak dikenal. */
export function jakartaLevel(score) {
  if (score >= -7 && score <= 1) return 1;
  if (score >= 2 && score <= 4) return 2;
  if (score >= 5) return 3;
  return 0;
}

export function hasDiabetesHistory(histories = []) {
  return histories.some(history => {
    const disease = String(history.diseaseName || '').toLowerCase();
    return disease.includes('diabetes') || disease.includes('dm');
  });
}

/* Untuk kalkulator: masukan langsung (usia dalam tahun), rumus poin yang sama. */
export function jakartaScoreFromInputs({ gender, age, bloodPressure, bmi, smoking, exercise, diabetes }) {
  const scores = {
    jk: genderPoints(gender),
    umur: Number.isFinite(age) ? agePoints(age) : 0,
    td: bloodPressure ? bloodPressurePoints(bloodPressure) : 0,
    imt: bmi ? bmiPoints(bmi) : 0,
    merokok: smoking ? smokingPoints(smoking) : 0,
    diabetes: diabetes ? 2 : 0,
    aktivitasFisik: exercise ? exercisePoints(exercise) : 0
  };
  return { score: Object.values(scores).reduce((sum, value) => sum + value, 0), scores };
}
