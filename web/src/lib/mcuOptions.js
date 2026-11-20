/* Pilihan isian form MCU (dari form aplikasi lama). "Lainnya" membuka kolom isian sendiri. */
export const OTHER = 'Lainnya';
export const MCU_TYPES = ['Pre-Employee', 'Annual', 'Khusus', 'Final'];
export const RESULTS = ['Fit', 'Fit With Note', 'Temporary Unfit', 'Follow-Up', 'Unfit'];
export const VISION_VALUES = ['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', OTHER];
export const AUDIO = ['Normal', 'Gangguan Ringan', OTHER];
export const SPIRO = ['Normal', 'Restriktif', 'Obstruktif', OTHER];
export const HBSAG = ['Negatif', 'Positif', 'Reaktif', 'Non-Reaktif'];
export const SMOKING = ['Tidak Merokok', 'Mantan Perokok', 'Perokok Aktif'];
export const EXERCISE = ['Tidak Pernah', '2x Seminggu', '1-2x Seminggu', '1-2x Sebulan'];
export const XRAY = ['Normal', OTHER];
export const EKG = ['Normal', 'Normal Resting ECG', OTHER];
export const TREADMILL = ['Normal', 'Tidak diperiksa', OTHER];
export const NAPZA = ['Negatif', OTHER];
export const COLORBLIND = ['Normal', 'Buta Warna Parsial', OTHER];
export const CUSTOM_DISEASE = 'Lainnya (isi sendiri)';
export const DISEASES = [
  'Hipertensi', 'Penyakit Jantung Koroner', 'Stroke/Serangan Otak', 'Aritmia Jantung', 'Diabetes Tipe 1', 'Diabetes Tipe 2',
  'Hiperkolesterolemia', 'Asma', 'PPOK (Penyakit Paru Obstruktif Kronis)', 'Tuberkulosis', 'Hepatitis B', 'Hepatitis C',
  'Kanker', 'Artritis/Radang Sendi', 'Gangguan Tiroid', CUSTOM_DISEASE
];
export const FAMILY_MEMBERS = ['Ayah', 'Ibu', 'Kakak', 'Adik', 'Anak', 'Kakek', 'Nenek', 'Paman/Bibi', 'Keluarga Lain'];

export const VISION_FIELDS = [
  { key: 'visionDistantUnaidedLeft', col: 'vision_distant_unaided_left' },
  { key: 'visionDistantUnaidedRight', col: 'vision_distant_unaided_right' },
  { key: 'visionDistantSpectaclesLeft', col: 'vision_distant_spectacles_left' },
  { key: 'visionDistantSpectaclesRight', col: 'vision_distant_spectacles_right' },
  { key: 'visionNearUnaidedLeft', col: 'vision_near_unaided_left' },
  { key: 'visionNearUnaidedRight', col: 'vision_near_unaided_right' },
  { key: 'visionNearSpectaclesLeft', col: 'vision_near_spectacles_left' },
  { key: 'visionNearSpectaclesRight', col: 'vision_near_spectacles_right' }
];
