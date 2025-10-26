/**
 * Surat Rujukan PDF Generator
 * Generates professional referral letter with logo
 * Supports both Surat Rujukan (forward) and Surat Rujukan Balik (return)
 * Uses browser's native print dialog
 */

import { rujukanConfig } from './rujukanConfig.js';

/**
 * Generate Surat Rujukan (Forward Referral) PDF
 * Surat Rujukan dan Surat Rujukan Balik dalam satu dokumen
 */
export function generateRujukanPDF(employee, mcu) {
  if (!employee || !mcu) {
    throw new Error('Data karyawan atau MCU tidak lengkap');
  }

  const content = generateRujukanHTML(employee, mcu);
  openPrintDialog(content);
}

/**
 * Generate Surat Rujukan Balik (Return Referral) PDF
 * Digunakan untuk referral balik terpisah
 */
export function generateRujukanBalikPDF(employee) {
  if (!employee) {
    throw new Error('Data karyawan tidak lengkap');
  }

  const content = generateRujukanBalikHTML(employee);
  openPrintDialog(content);
}

/**
 * Open browser print dialog
 */
function openPrintDialog(content) {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(content);
  printWindow.document.close();

  printWindow.onload = function() {
    printWindow.focus();
    printWindow.print();
    setTimeout(() => {
      printWindow.close();
    }, 500);
  };
}

/**
 * Generate HTML untuk Surat Rujukan dan Surat Rujukan Balik
 * Sesuai template yang diberikan user
 */
function generateRujukanHTML(employee, mcu) {
  const config = rujukanConfig;
  const currentDate = new Date();
  const day = String(currentDate.getDate()).padStart(2, '0');
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const year = String(currentDate.getFullYear()).slice(-2); // 2 digit tahun

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Surat Rujukan - ${employee.name}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @media print {
          body { background: white; }
          .page { box-shadow: none !important; margin: 0; }
        }
      </style>
    </head>
    <body class="bg-white">
     <div class="page bg-white w-[900px] shadow-md p-6 relative">
    <div class="flex justify-between items-start">
      <!-- Logo kiri -->
      <div class="flex-shrink-0">
        <img 
          src="https://s3.nevaobjects.id/saffix-storige/saffmedic-sekata/company/klinik_sekata_medical_center-1-09052025084603.png"
          alt="Sekata Medical Center Logo"
          class="w-40 object-contain">
      </div>

      <!-- Area kanan -->
      <div class="flex">
        <!-- Kolom teks kanan -->
        <div class="flex flex-col text-sm text-right leading-snug mr-4 justify-center">
          <!-- Alamat sejajar dengan ikon lokasi -->
          <div class="flex justify-end items-start mb-1">
            <div class="max-w-[360px]">
              <p>Jl. Pangeran Suryanata No.27 RT.15, Kelurahan Air Putih</p>
              <p>Kecamatan Samarinda Ulu, Kota Samarinda</p>
              <p>Kalimantan Timur</p>
            </div>
          </div>

          <!-- Telepon sejajar dengan ikon telepon -->
          <div class="flex justify-end items-center mb-1 mt-1">
            <p>0541 2921958</p>
          </div>

          <!-- Email sejajar dengan ikon email -->
          <div class="flex justify-end items-center">
            <p>sekatamedicalcenter@gmail.com</p>
          </div>
        </div>

        <!-- Kolom biru ikon vertikal -->
        <div class="flex flex-col justify-around items-center bg-[#1E3A8A] text-white w-10 rounded-l-lg py-4">
          <div class="text-xl">📍</div>
          <div class="text-xl">☎️</div>
          <div class="text-xl">✉️</div>
        </div>
      </div>
    </div>

    <!-- Garis bawah tunggal -->
    <div class="border-t border-black mt-4"></div>
  </div>

        <hr style="border: none; border-top: 1px solid #999; margin: 6px 0;">

        <!-- SURAT RUJUKAN -->
        <h2 style="text-align: center; font-weight: 600; text-decoration: underline; font-size: 13px; margin: 4px 0;">SURAT RUJUKAN</h2>

        <div style="font-size: 13px; line-height: 1.4;">
          <p style="margin: 2px 0;">Kepada Yth.</p>
          <p style="margin: 0;">Ts. Dokter Spesialis Penyakit Dalam</p>
          <p style="margin: 0 0 3px 0;">Di Tempat</p>

          <p style="margin: 3px 0 0 0; font-weight: 600;">Dengan Hormat,</p>
          <p style="margin: 0 0 4px 0;">Mohon perawatan lebih lanjut pasien tersebut di bawah ini:</p>

          <div style="margin: 3px 0;">
            <p style="margin: 2px 0;">Nama: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 480px;">${employee.name}</span></p>
            <p style="margin: 2px 0;">Umur: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 480px;">${employee.age || ''}</span></p>
            <p style="margin: 2px 0;">Jenis Kelamin: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 420px;">${employee.jenisKelamin || ''}</span></p>
            <p style="margin: 2px 0;">Perusahaan/Jabatan: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 380px;">${employee.department && employee.jobTitle ? employee.department + ' / ' + employee.jobTitle : ''}</span></p>
          </div>

          <div style="margin: 3px 0;">
            <p style="margin: 2px 0 1px 0; font-weight: 600;">Pemeriksaan Fisik:</p>
            <p style="margin: 1px 0; margin-left: 20px;">Tekanan Darah: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 80px;">${mcu.bloodPressure || ''}</span> mmHg &nbsp; RR: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 50px;">${mcu.respiratoryRate || ''}</span> /m</p>
            <p style="margin: 1px 0; margin-left: 20px;">Nadi: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 70px;">${mcu.pulse || ''}</span> /m &nbsp; Suhu: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 70px;">${mcu.temperature || ''}</span> °C</p>
          </div>

          <div style="margin: 3px 0;">
            <p style="margin: 2px 0;">Keluhan Utama: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 430px;">${mcu.keluhanUtama || ''}</span></p>
            <p style="margin: 2px 0;">Diagnosis Kerja: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 430px;">${mcu.diagnosisKerja || ''}</span></p>
            <p style="margin: 2px 0;">Alasan dirujuk: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 430px;">${mcu.alasanRujuk || ''}</span></p>
          </div>

          <div style="text-align: right; margin: 4px 0;">
            <p style="margin: 2px 0;">${config.clinic.city}, <span style="border-bottom: 1px dotted #666; display: inline-block; width: 150px;">${day} ${getMonthName(parseInt(month))}</span> 20${year}</p>
            <p style="margin: 2px 0;">Dokter FAR PT. PST</p>
            <div style="height: 35px;"></div>
            <p style="margin: 2px 0; font-weight: 600;">${config.clinic.doctorName}</p>
          </div>
        </div>

        <hr style="border: none; border-top: 1px solid #999; margin: 4px 0;">

        <!-- SURAT RUJUKAN BALIK -->
        <h2 style="text-align: center; font-weight: 600; text-decoration: underline; font-size: 13px; margin: 4px 0;">SURAT RUJUKAN BALIK</h2>

        <div style="font-size: 13px; line-height: 1.4;">
          <p style="margin: 2px 0;">Yang Terhormat Rekan Sejawat,</p>
          <p style="margin: 0 0 3px 0;">Bersama ini kami kirim kembali pasien dengan data sebagai berikut:</p>

          <div style="margin: 3px 0;">
            <p style="margin: 2px 0;">Nama: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 480px;"></span></p>
            <p style="margin: 2px 0;">Usia: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 480px;"></span></p>
            <p style="margin: 2px 0;">Diagnosa: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 450px;"></span></p>
            <p style="margin: 2px 0;">Terapi: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 475px;"></span></p>
            <p style="margin: 2px 0;">Saran: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 485px;"></span></p>
            <p style="margin: 2px 0;">Keterangan: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 430px;"></span></p>
            <p style="margin: 2px 0;">Kesimpulan: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 430px;"></span></p>
          </div>

          <div style="text-align: right; margin: 4px 0;">
            <p style="margin: 2px 0;">${config.clinic.city}, <span style="border-bottom: 1px dotted #666; display: inline-block; width: 120px;"></span> 20<span style="border-bottom: 1px dotted #666; display: inline-block; width: 30px;"></span></p>
            <div style="height: 35px;"></div>
            <p style="margin: 2px 0;">(.................................................)</p>
          </div>
        </div>

        <!-- Peringatan -->
        <div style="border: 1px solid #ccc; background-color: #fffacd; padding: 6px; font-size: 11px; line-height: 1.3; margin-top: 4px;">
          <strong>Perhatian:</strong> Surat rujukan harus sesuai dengan asli. Dilarang memalsukan data/berkas hasil rujukan/MCU. Segala bentuk kecurangan akan diberikan sanksi hukum sesuai dengan ketentuan hukum dan undang-undang yang berlaku beserta sanksi sesuai ketentuan perusahaan.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML untuk Surat Rujukan Balik (Return Referral)
 * Kosong - hanya template untuk diisi manual
 */
function generateRujukanBalikHTML(employee) {
  const config = rujukanConfig;
  const currentDate = new Date();
  const day = String(currentDate.getDate()).padStart(2, '0');
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const year = currentDate.getFullYear();

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Surat Rujukan Balik - ${employee.name}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @media print {
          body { background: white; }
          .page { box-shadow: none !important; margin: 0; }
        }
      </style>
    </head>
    <body class="bg-gray-100 flex justify-center py-8">
      <div class="page bg-white w-[800px] p-10 shadow-lg">
        <!-- Header dengan Logo -->
        <div class="flex items-start gap-5">
          <img src="${config.clinic.logo}"
               alt="Logo ${config.clinic.name}"
               class="w-28 h-28 object-contain" />
          <div class="text-center flex-1">
            <h1 class="text-xl font-bold uppercase">${config.rujukanBalik.title}</h1>
            <p class="text-sm mt-1">Dokumen ini merupakan surat rujukan balik/hasil rujukan pasien.<br>
            Harap isi dengan benar sesuai hasil penanganan.</p>
          </div>
        </div>

        <hr class="border-gray-400 my-5">

        <!-- Surat Rujukan Balik -->
        <h2 class="text-center font-semibold underline text-base mb-3">${config.rujukanBalik.title}</h2>

        <div class="text-sm leading-relaxed">
          <p>${config.rujukanBalik.greeting}</p>
          <p>${config.rujukanBalik.opening}</p>

          <div class="mt-3 space-y-2">
            <p>${config.rujukanBalik.labels.name}: <span class="border-b border-dotted border-gray-500 inline-block w-[450px]"></span></p>
            <p>${config.rujukanBalik.labels.age}: <span class="border-b border-dotted border-gray-500 inline-block w-[500px]"></span></p>
            <p>${config.rujukanBalik.labels.diagnosis}: <span class="border-b border-dotted border-gray-500 inline-block w-[425px]"></span></p>
            <p>${config.rujukanBalik.labels.therapy}: <span class="border-b border-dotted border-gray-500 inline-block w-[460px]"></span></p>
            <p>${config.rujukanBalik.labels.suggestion}: <span class="border-b border-dotted border-gray-500 inline-block w-[470px]"></span></p>
            <p>${config.rujukanBalik.labels.notes}: <span class="border-b border-dotted border-gray-500 inline-block w-[400px]"></span></p>
            <p>${config.rujukanBalik.labels.conclusion}: <span class="border-b border-dotted border-gray-500 inline-block w-[400px]"></span></p>
          </div>

          <div class="flex justify-end mt-10 text-sm">
            <div class="text-right">
              <p>${config.clinic.city}, <span class="border-b border-dotted border-gray-500 inline-block w-40"></span> ${year}</p>
              <div class="h-16"></div>
              <p>(.................................................)</p>
            </div>
          </div>
        </div>

        <!-- Warning -->
        <div class="border border-gray-300 bg-yellow-50 p-3 text-xs leading-tight mt-5">
          <strong>Perhatian:</strong> ${config.warning}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Helper: Get Indonesian month name
 */
function getMonthName(month) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[month - 1] || '';
}
