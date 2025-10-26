/**
 * Surat Rujukan Configuration
 * Customize format, logo, clinic info, etc.
 */

export const rujukanConfig = {
  // Clinic Information
  clinic: {
    name: 'SEKATA',
    subtitle: 'MEDICAL CENTER',
    address: {
      street: 'Jl. Pangeran Suryanata No.27 RT.15, Kelurahan Air Putih',
      district: 'Kecamatan Samarinda Ulu, Kota Samarinda Kalimantan Timur',
      phone: '0541 2921958',
      email: 'sekatamedicalcenter@gmail.com'
    },
    // Logo - dapat berupa URL gambar atau data:image/png;base64,...
    logo: null, // Set ke URL atau base64 data untuk menampilkan logo
    logoWidth: 30, // Width logo dalam mm
    logoHeight: 30, // Height logo dalam mm
    doctorName: 'dr. Pahroni',
    doctorTitle: 'Dokter FAR PT.PST',
    city: 'Samarinda'
  },

  // Letter Greeting (dapat disesuaikan)
  greeting: {
    salutation: 'Kepada Yth.',
    recipient: 'Ts. Dokter Spesialis Penyakit Dalam',
    place: 'Di Tempat',
    opening: 'Dengan Hormat,',
    request: 'Mohon perawatan lebih lanjut pasien tersebut di bawah ini :'
  },

  // Field Labels (dapat diterjemahkan atau disesuaikan)
  labels: {
    name: 'Nama',
    age: 'Umur',
    gender: 'Jenis Kelamin',
    company_job: 'Perusahaan/Jabatan',
    physical_exam: 'Pemeriksaan Fisik',
    blood_pressure: 'Tekanan Darah',
    respiratory_rate: 'RR (Frequensi Nafas)',
    pulse: 'Nadi',
    temperature: 'Suhu',
    chief_complaint: 'Keluhan Utama',
    diagnosis: 'Diagnosis Kerja',
    referral_reason: 'Alasan Dirujuk'
  },

  // Units
  units: {
    age: 'tahun',
    blood_pressure: 'mmHg',
    respiratory_rate: '/m',
    pulse: '/m',
    temperature: '°C'
  },

  // Footer note
  footer: 'Surat rujukan harus disertai dengan RL, Ringkasan hasil tes lab dan atau pemeriksaan lain yang relevan dengan urutan masalah',

  // Page settings
  page: {
    size: 'A4',
    format: 'portrait',
    margin: '15mm'
  }
};

/**
 * Function untuk update config
 * Contoh penggunaan:
 * updateRujukanConfig({
 *   clinic: { name: 'KLINIK BARU' },
 *   greeting: { salutation: 'Kepada Yang Terhormat' }
 * })
 */
export function updateRujukanConfig(newConfig) {
  // Deep merge configuration
  Object.keys(newConfig).forEach(key => {
    if (typeof newConfig[key] === 'object' && newConfig[key] !== null) {
      rujukanConfig[key] = {
        ...rujukanConfig[key],
        ...newConfig[key]
      };
    } else {
      rujukanConfig[key] = newConfig[key];
    }
  });

  console.log('[RujukanConfig] Updated configuration:', rujukanConfig);
}

/**
 * Get current config value
 */
export function getRujukanConfig(path) {
  if (!path) return rujukanConfig;

  const keys = path.split('.');
  let value = rujukanConfig;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return null;
    }
  }

  return value;
}
