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
    <body class="bg-gray-100 flex justify-center py-8">

      <div class="page bg-white w-[800px] p-10 shadow-lg">
        <!-- Header -->
        <div class="flex items-start gap-5">
          <img src="${config.clinic.logo}"
               alt="Logo Klinik"
               class="w-28 h-28 object-contain" />
          <div class="text-center flex-1">
            <h1 class="text-xl font-bold uppercase">Format Surat Follow Up</h1>
            <p class="text-sm mt-1">Dokumen ini digunakan sebagai format surat rujukan dan rujukan balik.<br>
            Harap isi dengan benar sesuai data asli pasien.</p>
          </div>
        </div>

        <hr class="border-gray-400 my-5">

        <!-- ================== SURAT RUJUKAN ================== -->
        <h2 class="text-center font-semibold underline text-base mb-3">SURAT RUJUKAN</h2>

        <div class="text-sm leading-relaxed">
          <p>Kepada Yth.</p>
          <p>Ts. Dokter Spesialis Penyakit Dalam</p>
          <p>Di Tempat</p>

          <p class="mt-3 font-semibold">Dengan Hormat,</p>
          <p>Mohon perawatan lebih lanjut pasien tersebut di bawah ini:</p>

          <div class="mt-3 space-y-2">
            <p>Nama: <span class="border-b border-dotted border-gray-500 inline-block w-[500px]">${employee.name}</span></p>
            <p>Umur: <span class="border-b border-dotted border-gray-500 inline-block w-[480px]">${employee.age || ''}</span></p>
            <p>Jenis Kelamin: <span class="border-b border-dotted border-gray-500 inline-block w-[435px]">${employee.jenisKelamin || ''}</span></p>
            <p>Perusahaan/Jabatan: <span class="border-b border-dotted border-gray-500 inline-block w-[390px]">${employee.department && employee.jobTitle ? employee.department + ' / ' + employee.jobTitle : ''}</span></p>
          </div>

          <div class="mt-3">
            <p class="font-semibold">Pemeriksaan Fisik:</p>
            <div class="ml-4 space-y-1">
              <p>Tekanan Darah: <span class="border-b border-dotted border-gray-500 inline-block w-32">${mcu.bloodPressure || ''}</span> mmHg &nbsp;
                 RR: <span class="border-b border-dotted border-gray-500 inline-block w-16">${mcu.respiratoryRate || ''}</span> /m</p>
              <p>Nadi: <span class="border-b border-dotted border-gray-500 inline-block w-24">${mcu.pulse || ''}</span> /m &nbsp;
                 Suhu: <span class="border-b border-dotted border-gray-500 inline-block w-24">${mcu.temperature || ''}</span> °C</p>
            </div>
          </div>

          <div class="mt-3 space-y-2">
            <p>Keluhan Utama: <span class="border-b border-dotted border-gray-500 inline-block w-[480px]">${mcu.keluhanUtama || ''}</span></p>
            <p>Diagnosis Kerja: <span class="border-b border-dotted border-gray-500 inline-block w-[470px]">${mcu.diagnosisKerja || ''}</span></p>
            <p>Alasan dirujuk: <span class="border-b border-dotted border-gray-500 inline-block w-[480px]">${mcu.alasanRujuk || ''}</span></p>
          </div>

          <div class="flex justify-end mt-8 text-sm">
            <div class="text-right">
              <p>${config.clinic.city}, <span class="border-b border-dotted border-gray-500 inline-block w-40">${day} ${getMonthName(parseInt(month))}</span> 20${year}</p>
              <p class="mt-1">Dokter FAR PT. PST</p>
              <div class="h-16"></div>
              <p><strong>${config.clinic.doctorName}</strong></p>
            </div>
          </div>
        </div>

        <hr class="border-gray-400 my-6">

        <!-- ================== SURAT RUJUKAN BALIK ================== -->
        <h2 class="text-center font-semibold underline text-base mb-3">SURAT RUJUKAN BALIK</h2>

        <div class="text-sm leading-relaxed">
          <p>Yang Terhormat Rekan Sejawat,</p>
          <p>Bersama ini kami kirim kembali pasien dengan data sebagai berikut:</p>

          <div class="mt-3 space-y-2">
            <p>Nama: <span class="border-b border-dotted border-gray-500 inline-block w-[500px]"></span></p>
            <p>Usia: <span class="border-b border-dotted border-gray-500 inline-block w-[500px]"></span></p>
            <p>Diagnosa: <span class="border-b border-dotted border-gray-500 inline-block w-[470px]"></span></p>
            <p>Terapi: <span class="border-b border-dotted border-gray-500 inline-block w-[495px]"></span></p>
            <p>Saran: <span class="border-b border-dotted border-gray-500 inline-block w-[505px]"></span></p>
            <p>Keterangan: <span class="border-b border-dotted border-gray-500 inline-block w-[455px]"></span></p>
            <p>Kesimpulan: <span class="border-b border-dotted border-gray-500 inline-block w-[455px]"></span></p>
          </div>

          <div class="flex justify-end mt-10 text-sm">
            <div class="text-right">
              <p>${config.clinic.city}, <span class="border-b border-dotted border-gray-500 inline-block w-44"></span> 20<span class="border-b border-dotted border-gray-500 inline-block w-10"></span></p>
              <div class="h-16"></div>
              <p>(.................................................)</p>
            </div>
          </div>
        </div>

        <!-- Peringatan -->
        <div class="border border-gray-300 bg-yellow-50 p-3 text-sm leading-tight mb-5">
          <strong>Perhatian:</strong> Surat rujukan harus sesuai dengan asli. Dilarang memalsukan data/berkas hasil rujukan/MCU.
          Segala bentuk kecurangan akan diberikan sanksi hukum sesuai dengan ketentuan hukum dan undang-undang yang berlaku beserta sanksi sesuai ketentuan perusahaan.
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
