/* Riwayat perubahan MCU: label kolom dan status diubah/tidak (dari kelola-karyawan.js lama). */
export const FIELD_LABELS = {
  mcuDate: 'Tanggal MCU', mcuType: 'Jenis MCU', bmi: 'BMI', bloodPressure: 'Tekanan Darah',
  respiratoryRate: 'RR (Frekuensi Nafas)', pulse: 'Nadi', temperature: 'Suhu', chestCircumference: 'Lingkar Perut',
  vision: 'Penglihatan', audiometry: 'Audiometri', spirometry: 'Spirometri', xray: 'X-Ray', ekg: 'EKG',
  treadmill: 'Treadmill', hbsag: 'HBsAg', sgot: 'SGOT', sgpt: 'SGPT', cbc: 'CBC', napza: 'NAPZA',
  colorblind: 'Buta Warna',
  medicalHistory: 'Riwayat Penyakit', familyHistory: 'Riwayat Penyakit Keluarga',
  smokingStatus: 'Status Merokok', exerciseFrequency: 'Frekuensi Olahraga',
  visionDistantUnaidedLeft: 'Visus Jauh Mata Kiri (Tanpa Koreksi)', visionDistantUnaidedRight: 'Visus Jauh Mata Kanan (Tanpa Koreksi)',
  visionDistantSpectaclesLeft: 'Visus Jauh Mata Kiri (Dengan Kacamata)', visionDistantSpectaclesRight: 'Visus Jauh Mata Kanan (Dengan Kacamata)',
  visionNearUnaidedLeft: 'Visus Dekat Mata Kiri (Tanpa Koreksi)', visionNearUnaidedRight: 'Visus Dekat Mata Kanan (Tanpa Koreksi)',
  visionNearSpectaclesLeft: 'Visus Dekat Mata Kiri (Dengan Kacamata)', visionNearSpectaclesRight: 'Visus Dekat Mata Kanan (Dengan Kacamata)',
  created: 'Dibuat', doctor: 'Dokter', recipient: 'Penerima Rujukan', keluhanUtama: 'Keluhan Utama',
  diagnosisKerja: 'Diagnosis Kerja', alasanRujuk: 'Alasan Rujuk', initialResult: 'Hasil Awal',
  initialNotes: 'Catatan Awal', finalResult: 'Hasil Akhir', finalNotes: 'Catatan Akhir', status: 'Status', labResult: 'Hasil Lab'
};

export function changeRows(changes) {
  return changes.map(change => {
    const before = change.oldValue || '-';
    const after = change.newValue || '-';
    return { label: FIELD_LABELS[change.fieldName] || change.fieldName, before, after, changed: before !== after, at: change.changedAt };
  });
}
