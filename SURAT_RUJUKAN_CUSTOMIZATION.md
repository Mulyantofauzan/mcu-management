# Panduan Customization Surat Rujukan

## Gambaran Umum

Fitur Surat Rujukan sekarang **fully customizable**. Anda dapat mengubah:
- ✅ Nama klinik dan informasi kontak
- ✅ Logo klinik
- ✅ Teks greeting dan pesan
- ✅ Semua label field (dalam bahasa apapun)
- ✅ Unit pengukuran
- ✅ Footer text
- ✅ Nama dan gelar dokter

## File Konfigurasi

**File Utama**: `js/utils/rujukanConfig.js`

Semua konfigurasi terpusat di satu file. Edit file ini untuk mengubah format surat rujukan.

## Cara Mengubah Konfigurasi

### 1. Mengubah Informasi Klinik

**File**: `js/utils/rujukanConfig.js`

**Bagian**: `rujukanConfig.clinic`

```javascript
clinic: {
  name: 'SEKATA',              // Nama klinik
  subtitle: 'MEDICAL CENTER',   // Subtitle
  address: {
    street: 'Jl. Pangeran Suryanata No.27 RT.15, Kelurahan Air Putih',
    district: 'Kecamatan Samarinda Ulu, Kota Samarinda Kalimantan Timur',
    phone: '0541 2921958',
    email: 'sekatamedicalcenter@gmail.com'
  },
  logo: null,                   // LOGO DISINI (lihat bagian 2)
  logoWidth: 30,                // Width logo (mm)
  logoHeight: 30,               // Height logo (mm)
  doctorName: 'dr. Pahroni',
  doctorTitle: 'Dokter FAR PT.PST',
  city: 'Samarinda'             // Kota di tanda tangan
}
```

**Contoh Perubahan**:

```javascript
// Ubah nama klinik
name: 'KLINIK KESEHATAN MAJU JAYA',
subtitle: 'HEALTH CENTER',

// Ubah alamat
address: {
  street: 'Jl. Sudirman No. 123',
  district: 'Jakarta Selatan',
  phone: '021-12345678',
  email: 'info@klinikmaju.com'
},

// Ubah dokter
doctorName: 'dr. Budi Santoso',
doctorTitle: 'Spesialis Penyakit Dalam'
```

### 2. Menambahkan Logo Klinik

Ada 2 cara untuk menambahkan logo:

#### **Opsi A: Menggunakan URL**

Jika logo sudah hosted di internet:

```javascript
clinic: {
  logo: 'https://example.com/path/to/logo.png',
  logoWidth: 40,   // Atur ukuran sesuai kebutuhan
  logoHeight: 40
}
```

#### **Opsi B: Menggunakan Base64**

Jika ingin embed image langsung (untuk offline):

```javascript
clinic: {
  logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...',
  logoWidth: 35,
  logoHeight: 35
}
```

**Cara mengconvert gambar ke base64**:

1. Tools online: https://www.base64encode.org/
2. Upload gambar
3. Copy hasil base64
4. Paste di config

#### **Opsi C: Tidak Ada Logo**

Jika tidak ingin logo, biarkan `null`:

```javascript
clinic: {
  logo: null,  // Tidak ada logo
}
```

### 3. Mengubah Label dan Teks

**Bagian**: `rujukanConfig.greeting` dan `rujukanConfig.labels`

#### Ubah Greeting:

```javascript
greeting: {
  salutation: 'Kepada Yang Terhormat',      // Default: 'Kepada Yth.'
  recipient: 'Dokter Spesialis Penyakit',   // Recipient
  place: 'Di Tempat',                       // Tidak berubah
  opening: 'Dengan Hormat',
  request: 'Kami merujuk pasien berikut untuk penanganan lanjutan:'
}
```

#### Ubah Labels (untuk support bahasa lain):

```javascript
labels: {
  name: 'Full Name',                    // Bahasa Inggris
  age: 'Age',
  gender: 'Gender',
  company_job: 'Company/Position',
  physical_exam: 'Physical Examination',
  blood_pressure: 'Blood Pressure',
  respiratory_rate: 'Respiratory Rate',
  pulse: 'Pulse',
  temperature: 'Temperature',
  chief_complaint: 'Chief Complaint',
  diagnosis: 'Working Diagnosis',
  referral_reason: 'Reason for Referral'
}
```

### 4. Mengubah Unit Pengukuran

**Bagian**: `rujukanConfig.units`

```javascript
units: {
  age: 'years',            // Ubah dari 'tahun' ke 'years'
  blood_pressure: 'mmHg',  // Tidak perlu diubah biasanya
  respiratory_rate: 'breaths/min',  // Ubah format
  pulse: 'bpm',            // Beats per minute
  temperature: '°Celsius'  // Ubah dari '°C'
}
```

### 5. Mengubah Footer

**Bagian**: `rujukanConfig.footer`

```javascript
footer: 'Referral letter must be accompanied by medical records, lab results, and other relevant examination results'
```

### 6. Mengubah Setting Halaman

**Bagian**: `rujukanConfig.page`

```javascript
page: {
  size: 'A4',        // Ukuran kertas (A4, Letter, dll)
  format: 'portrait', // Orientasi (portrait/landscape)
  margin: '15mm'     // Margin halaman
}
```

## Contoh Penggunaan Lengkap

### Contoh 1: Klinik Baru dengan Logo

```javascript
export const rujukanConfig = {
  clinic: {
    name: 'KLINIK MITRA SEHAT',
    subtitle: 'HEALTH AND WELLNESS CENTER',
    address: {
      street: 'Jl. Merdeka No. 45',
      district: 'Jakarta, Indonesia',
      phone: '021-5555555',
      email: 'mitasehat@gmail.com'
    },
    logo: 'https://cdn.example.com/logo-klinik-mitra.png',
    logoWidth: 40,
    logoHeight: 40,
    doctorName: 'dr. Siti Nurhaliza',
    doctorTitle: 'Dokter Umum Bersertifikat',
    city: 'Jakarta'
  },
  // ... rest of config
};
```

### Contoh 2: Surat Rujukan dalam Bahasa Inggris

```javascript
export const rujukanConfig = {
  clinic: {
    name: 'HEALTH CLINIC',
    subtitle: 'MEDICAL SERVICES',
    // ... alamat dalam English
  },
  greeting: {
    salutation: 'To the Attention Of',
    recipient: 'Specialist Doctor in Internal Medicine',
    place: 'At the Above Address',
    opening: 'Dear Sir/Madam,',
    request: 'We hereby refer our patient for further medical evaluation and treatment:'
  },
  labels: {
    name: 'Name',
    age: 'Age',
    gender: 'Gender',
    company_job: 'Company/Position',
    // ... all in English
  },
  units: {
    age: 'years',
    blood_pressure: 'mmHg',
    respiratory_rate: '/min',
    pulse: '/min',
    temperature: '°C'
  },
  // ... rest
};
```

## Testing Perubahan

Setelah edit `rujukanConfig.js`:

1. **Refresh browser** (Ctrl+F5)
2. **Buka Follow-Up menu**
3. **Click tombol "📄 Rujukan"**
4. **Periksa print preview** apakah perubahan sudah tampil

Jika perubahan tidak muncul:
- Clear browser cache (Ctrl+Shift+Delete)
- Restart development server jika menggunakan local

## Debugging

Jika ada error saat generate surat rujukan:

1. Buka **Browser Console** (F12)
2. Lihat error message
3. Periksa syntax di `rujukanConfig.js` (pastikan tidak ada typo)

**Contoh error**:
```
ReferenceError: rujukanConfig is not defined
```

Solusi: Pastikan `import { rujukanConfig }` di `rujukanPDFGenerator.js` berfungsi.

## API Programmatic

Anda juga bisa mengubah config secara dinamis di code:

```javascript
import { updateRujukanConfig } from './js/utils/rujukanConfig.js';

// Ubah clinic name saat runtime
updateRujukanConfig({
  clinic: { name: 'KLINIK BARU' }
});

// Get nilai config tertentu
import { getRujukanConfig } from './js/utils/rujukanConfig.js';
const clinicName = getRujukanConfig('clinic.name');
```

## Struktur Logo yang Didukung

Semua format image yang bisa di-render HTML:
- ✅ PNG
- ✅ JPG/JPEG
- ✅ GIF
- ✅ SVG
- ✅ WebP

## Tips & Tricks

### Gunakan Logo yang Berkualitas
- Resolusi minimal: 300x300px
- Format: PNG dengan transparency (recommended)
- Ukuran file: < 500KB

### Atur Logo Size
```javascript
logoWidth: 25,   // Kecil (untuk surat yang crowded)
logoHeight: 25,

// atau

logoWidth: 50,   // Besar (untuk fokus pada logo)
logoHeight: 50
```

### Gunakan Font Monospace
Font saat ini adalah 'Courier New' untuk professional/clean look. Jika ingin ubah, edit di `rujukanPDFGenerator.js`:

```css
font-family: 'Arial', sans-serif;  // Ganti di sini
```

## Rollback ke Default

Jika ingin kembali ke setting default, lihat file original di git:

```bash
git checkout mcu-management/js/utils/rujukanConfig.js
```

## Kesimpulan

Surat rujukan sudah sepenuhnya customizable. Edit `rujukanConfig.js` sesuai kebutuhan klinik Anda dan semua surat rujukan akan otomatis menggunakan konfigurasi baru.

Untuk bantuan lebih lanjut, lihat comments di `rujukanConfig.js` dan `rujukanPDFGenerator.js`.
