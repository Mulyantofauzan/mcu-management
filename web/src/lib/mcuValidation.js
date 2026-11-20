/* Validasi MCU: aturan validateMCUForm lama ditambah pemeriksaan semua item lab terisi (labResultWidget lama). */
import { LAB_ITEMS } from './labItems.js';

export function validateMcuPayload(data, today = new Date()) {
  const errors = [];
  if (!data.mcuType) errors.push('Jenis MCU harus dipilih');
  if (!data.mcuDate) errors.push('Tanggal MCU harus diisi');
  else if (new Date(data.mcuDate) > today) errors.push('Tanggal MCU tidak boleh di masa depan');

  if (data.bloodPressure) {
    if (!/^\d{2,3}\/\d{2,3}$/.test(data.bloodPressure)) errors.push('Format tekanan darah harus XXX/YY (contoh: 170/80)');
    const [systolic, diastolic] = data.bloodPressure.split('/').map(Number);
    if (systolic < 50 || systolic > 300) errors.push('Tekanan darah sistolik tidak valid (harus 50-300)');
    if (diastolic < 30 || diastolic > 180) errors.push('Tekanan darah diastolik tidak valid (harus 30-180)');
  }
  const outside = (value, min, max) => { const number = parseFloat(value); return Number.isNaN(number) || number < min || number > max; };
  if (data.respiratoryRate && outside(parseInt(data.respiratoryRate, 10), 8, 60)) errors.push('RR (Pernapasan) tidak valid (harus 8-60 /menit)');
  if (data.pulse && outside(parseInt(data.pulse, 10), 30, 200)) errors.push('Nadi tidak valid (harus 30-200 bpm)');
  if (data.temperature && outside(data.temperature, 35, 42)) errors.push('Suhu tidak valid (harus 35-42 °C)');
  if (data.bmi && outside(data.bmi, 10, 100)) errors.push('BMI tidak valid (harus 10-100)');
  if (!data.doctor) errors.push('Dokter pemeriksa harus dipilih');
  if (!data.initialResult) errors.push('Hasil MCU harus dipilih');
  if (!data.initialNotes) errors.push('Catatan awal harus diisi');
  return { isValid: errors.length === 0, errors };
}

/* Semua item lab wajib berisi angka positif (aturan labResultWidget dan mcuBatchService lama). */
export function validateLabValues(labs) {
  const errors = [];
  LAB_ITEMS.forEach(item => {
    const raw = String(labs[item.id] ?? '').trim();
    if (!raw) { errors.push(`${item.name} harus diisi`); return; }
    const value = parseFloat(raw);
    if (Number.isNaN(value)) errors.push(`${item.name}: nilai harus angka`);
    else if (value <= 0) errors.push(`${item.name}: nilai harus lebih dari 0`);
  });
  return { isValid: errors.length === 0, errors };
}
