/* Riwayat perubahan MCU: label kolom dan status diubah/tidak (dari kelola-karyawan.js lama). */
export const FIELD_LABELS = {
  mcuDate: 'Tanggal MCU', mcuType: 'Jenis MCU', bmi: 'BMI', bloodPressure: 'Tekanan Darah',
  respiratoryRate: 'RR (Frekuensi Nafas)', pulse: 'Nadi', temperature: 'Suhu', chestCircumference: 'Lingkar Perut',
  vision: 'Penglihatan', audiometry: 'Audiometri', spirometry: 'Spirometri', xray: 'X-Ray', ekg: 'EKG',
  treadmill: 'Treadmill', hbsag: 'HBsAg', sgot: 'SGOT', sgpt: 'SGPT', cbc: 'CBC', napza: 'NAPZA',
  colorblind: 'Buta Warna', doctor: 'Dokter', recipient: 'Penerima Rujukan', keluhanUtama: 'Keluhan Utama',
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
