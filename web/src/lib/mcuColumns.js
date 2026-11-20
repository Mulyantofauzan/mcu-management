/* Pemetaan kunci aplikasi (camelCase) ke kolom tabel mcus. */
import { VISION_FIELDS } from './mcuOptions.js';

export const FIELD_COLUMN = Object.freeze({
  mcuType: 'mcu_type', mcuDate: 'mcu_date', bmi: 'bmi', bloodPressure: 'blood_pressure', respiratoryRate: 'respiratory_rate',
  pulse: 'pulse', temperature: 'temperature', chestCircumference: 'chest_circumference',
  ...Object.fromEntries(VISION_FIELDS.map(({ key, col }) => [key, col])),
  audiometry: 'audiometry', spirometry: 'spirometry', xray: 'xray', ekg: 'ekg', treadmill: 'treadmill', hbsag: 'hbsag', napza: 'napza', colorblind: 'colorblind',
  smokingStatus: 'smoking_status', exerciseFrequency: 'exercise_frequency', doctor: 'doctor', recipient: 'recipient',
  keluhanUtama: 'keluhan_utama', diagnosisKerja: 'diagnosis_kerja', alasanRujuk: 'alasan_rujuk',
  initialResult: 'initial_result', initialNotes: 'initial_notes', finalResult: 'final_result', finalNotes: 'final_notes', status: 'status'
});
