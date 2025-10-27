/**
 * Surat Rujukan Configuration
 * Customize format, logo, clinic info, etc.
 * Matches professional template with logo and dual referral letters
 */

export const rujukanConfig = {
  // Clinic Information
  clinic: {
    name: 'SEKATA MEDICAL CENTER',
    // Logo URL - menggunakan logo dari Supabase storage
    logo: 'https://s3.nevaobjects.id/saffix-storige/saffmedic-sekata/company/klinik_sekata_medical_center-1-09052025084603.png',
    logoWidth: 112,  // pixels (disesuaikan dengan template)
    logoHeight: 112,

    address: {
      street: 'Jl. Pangeran Suryanata No.27 RT.15, Kelurahan Air Putih',
      district: 'Kecamatan Samarinda Ulu, Kota Samarinda Kalimantan Timur',
      phone: '0541 2921958',
      email: 'sekatamedicalcenter@gmail.com'
    },

    doctorName: 'dr. Pahroni',
    doctorTitle: 'Dokter FAR PT.PST',
    city: 'Samarinda'
  },

  // Surat Rujukan (Forward Referral)
  rujukan: {
    title: 'SURAT RUJUKAN',
    greeting: {
      salutation: 'Kepada Yth.',
      recipient: 'Ts. Dokter Spesialis Penyakit Dalam',
      place: 'Di Tempat',
      opening: 'Dengan Hormat,',
      request: 'Mohon perawatan lebih lanjut pasien tersebut di bawah ini:'
    },
    labels: {
      name: 'Nama',
      age: 'Umur',
      gender: 'Jenis Kelamin',
      company_job: 'Perusahaan/Jabatan',
      physical_exam: 'Pemeriksaan Fisik',
      blood_pressure: 'Tekanan Darah',
      respiratory_rate: 'RR',
      pulse: 'Nadi',
      temperature: 'Suhu',
      chief_complaint: 'Keluhan Utama',
      diagnosis: 'Diagnosis Kerja',
      referral_reason: 'Alasan dirujuk'
    },
    units: {
      blood_pressure: 'mmHg',
      respiratory_rate: '/m',
      pulse: '/m',
      temperature: '°C'
    }
  },

  // Surat Rujukan Balik (Return Referral)
  rujukanBalik: {
    title: 'SURAT RUJUKAN BALIK',
    greeting: 'Yang Terhormat Rekan Sejawat,',
    opening: 'Bersama ini kami kirim kembali pasien dengan data sebagai berikut:',
    labels: {
      name: 'Nama',
      age: 'Usia',
      diagnosis: 'Diagnosa',
      therapy: 'Terapi',
      suggestion: 'Saran',
      notes: 'Keterangan',
      conclusion: 'Kesimpulan'
    }
  },

  // Warning message
  warning: 'Perhatian: Surat rujukan harus sesuai dengan asli. Dilarang memalsukan data/berkas hasil rujukan/MCU. Segala bentuk kecurangan akan diberikan sanksi hukum sesuai dengan ketentuan hukum dan undang-undang yang berlaku beserta sanksi sesuai ketentuan perusahaan.',

  // Page settings
  page: {
    size: 'A4',
    format: 'portrait',
    margin: '40px'
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
