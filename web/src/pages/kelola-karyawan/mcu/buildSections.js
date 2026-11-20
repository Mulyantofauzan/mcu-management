/* Menyusun pasangan label-nilai untuk panel detail MCU. Murni dan diuji. */
import { formatDate, formatDateTime } from '../../../lib/format.js';

const NUMERIC = /^[\d.,/\s-]+$/;
const dash = value => (value === null || value === undefined || String(value).trim() === '' ? '-' : String(value));
export const withUnit = (value, unit) => (NUMERIC.test(String(value ?? '')) && String(value).trim() ? `${String(value).trim()} ${unit}` : dash(value));

export function infoRows(mcu) {
  return [
    ['ID MCU', dash(mcu.mcuId)],
    ['Tanggal MCU', formatDate(mcu.mcuDate)],
    ['Jenis MCU', dash(mcu.mcuType)],
    ['Terakhir diubah', mcu.updatedAt ? formatDateTime(mcu.updatedAt) : '-']
  ];
}

export function examRows(mcu) {
  return [
    ['BMI', withUnit(mcu.bmi, 'kg/m²')],
    ['Tekanan darah', withUnit(mcu.bloodPressure, 'mmHg')],
    ['Frekuensi napas (RR)', withUnit(mcu.respiratoryRate, 'x/menit')],
    ['Nadi', withUnit(mcu.pulse, 'x/menit')],
    ['Suhu', withUnit(mcu.temperature, '°C')],
    ['Lingkar perut', withUnit(mcu.chestCircumference, 'cm')],
    ['Audiometri', dash(mcu.audiometry)],
    ['Spirometri', dash(mcu.spirometry)],
    ['HBsAg', dash(mcu.hbsag)],
    ['Status merokok', dash(mcu.smokingStatus)],
    ['Frekuensi olahraga', dash(mcu.exerciseFrequency)],
    ['X-Ray', dash(mcu.xray)],
    ['EKG', dash(mcu.ekg)],
    ['Treadmill', dash(mcu.treadmill)],
    ['NAPZA', dash(mcu.napza)],
    ['Buta warna', dash(mcu.colorblind)]
  ];
}

export function visionRows(mcu) {
  const v = key => dash(mcu[key]);
  return [
    { label: 'Jauh', cells: [v('visionDistantUnaidedLeft'), v('visionDistantUnaidedRight'), v('visionDistantSpectaclesLeft'), v('visionDistantSpectaclesRight')] },
    { label: 'Dekat', cells: [v('visionNearUnaidedLeft'), v('visionNearUnaidedRight'), v('visionNearSpectaclesLeft'), v('visionNearSpectaclesRight')] }
  ];
}

/* Dokter dicocokkan lewat id, seperti kode lama; bila tidak ketemu tampil "ID: x". */
export function doctorName(doctorId, doctors) {
  if (doctorId === null || doctorId === undefined || doctorId === '') return '-';
  const wanted = String(doctorId).trim();
  const found = doctors.find(doctor => String(doctor.id).trim() === wanted);
  return found?.name || `ID: ${wanted}`;
}

export function referralRows(mcu, doctors) {
  return [
    ['Diberikan oleh (dokter)', doctorName(mcu.doctor, doctors)],
    ['Kepada Yth', dash(mcu.recipient)],
    ['Keluhan utama', dash(mcu.keluhanUtama)],
    ['Diagnosis kerja', dash(mcu.diagnosisKerja)],
    ['Alasan dirujuk', dash(mcu.alasanRujuk)]
  ];
}
