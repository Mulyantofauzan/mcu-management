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
 * Dalam satu dokumen - atas bawah
 */
function generateRujukanHTML(employee, mcu) {
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
      <title>Surat Rujukan - ${employee.name}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @media print {
          body { background: white; margin: 0; padding: 0; }
          .page { box-shadow: none !important; margin: 0; page-break-after: auto; }
          .page-break { page-break-before: always; }
        }
        body { margin: 0; padding: 0; }
      </style>
    </head>
    <body class="bg-white">
      <!-- SURAT RUJUKAN (Bagian Atas) -->
      <div class="page bg-white w-[800px] p-10 mx-auto">
        <!-- Header dengan Logo -->
        <div class="flex items-start gap-5">
          <img src="${config.clinic.logo}"
               alt="Logo ${config.clinic.name}"
               class="w-28 h-28 object-contain flex-shrink-0" />
          <div class="text-center flex-1">
            <h1 class="text-lg font-bold uppercase">${config.clinic.name}</h1>
            <p class="text-xs mt-1">${config.clinic.address.street}</p>
            <p class="text-xs">${config.clinic.address.district}</p>
            <p class="text-xs">Telepon: ${config.clinic.phone} | Email: ${config.clinic.email}</p>
          </div>
        </div>

        <hr class="border-gray-800 my-4">

        <!-- Judul Surat Rujukan -->
        <h2 class="text-center font-bold text-lg mb-4 underline">${config.rujukan.title}</h2>

        <!-- Isi Surat Rujukan -->
        <div class="text-sm leading-relaxed">
          <p>${config.rujukan.greeting.salutation}</p>
          <p>${config.rujukan.greeting.recipient}</p>
          <p>${config.rujukan.greeting.place}</p>

          <p class="mt-3 font-semibold">${config.rujukan.greeting.opening}</p>
          <p>${config.rujukan.greeting.request}</p>

          <table class="mt-3 w-full text-sm">
            <tr>
              <td class="w-32 font-semibold">${config.rujukan.labels.name}</td>
              <td class="px-2">:</td>
              <td>${employee.name}</td>
            </tr>
            <tr>
              <td class="font-semibold">${config.rujukan.labels.age}</td>
              <td class="px-2">:</td>
              <td>${employee.age || '___'} tahun</td>
            </tr>
            <tr>
              <td class="font-semibold">${config.rujukan.labels.gender}</td>
              <td class="px-2">:</td>
              <td>${employee.jenisKelamin || '___'}</td>
            </tr>
            <tr>
              <td class="font-semibold">${config.rujukan.labels.company_job}</td>
              <td class="px-2">:</td>
              <td>${employee.department && employee.jobTitle ? employee.department + ' / ' + employee.jobTitle : '___'}</td>
            </tr>
          </table>

          <p class="font-semibold mt-3">${config.rujukan.labels.physical_exam}:</p>
          <table class="ml-4 w-full text-sm">
            <tr>
              <td class="w-32">${config.rujukan.labels.blood_pressure}</td>
              <td class="px-2">:</td>
              <td class="w-24">${mcu.bloodPressure || '____'} ${config.rujukan.units.blood_pressure}</td>
              <td class="w-32">${config.rujukan.labels.respiratory_rate}</td>
              <td class="px-2">:</td>
              <td>${mcu.respiratoryRate || '____'} ${config.rujukan.units.respiratory_rate}</td>
            </tr>
            <tr>
              <td>${config.rujukan.labels.pulse}</td>
              <td class="px-2">:</td>
              <td>${mcu.pulse || '____'} ${config.rujukan.units.pulse}</td>
              <td>${config.rujukan.labels.temperature}</td>
              <td class="px-2">:</td>
              <td>${mcu.temperature || '____'} ${config.rujukan.units.temperature}</td>
            </tr>
          </table>

          <table class="mt-3 w-full text-sm">
            <tr>
              <td class="font-semibold w-32">${config.rujukan.labels.chief_complaint}</td>
              <td class="px-2">:</td>
              <td>${mcu.keluhanUtama || '_________________________'}</td>
            </tr>
            <tr>
              <td class="font-semibold">${config.rujukan.labels.diagnosis}</td>
              <td class="px-2">:</td>
              <td>${mcu.diagnosisKerja || '_________________________'}</td>
            </tr>
            <tr>
              <td class="font-semibold">${config.rujukan.labels.referral_reason}</td>
              <td class="px-2">:</td>
              <td>${mcu.alasanRujuk || '_________________________'}</td>
            </tr>
          </table>

          <!-- Tanda Tangan -->
          <div class="flex justify-end mt-8 text-sm">
            <div class="text-center w-48">
              <p>${config.clinic.city}, ${day} ${getMonthName(parseInt(month))} ${year}</p>
              <div class="h-16"></div>
              <p class="font-semibold">${config.clinic.doctorName}</p>
              <p class="text-xs">${config.clinic.doctorTitle}</p>
            </div>
          </div>
        </div>

        <!-- Warning -->
        <div class="border border-gray-400 bg-yellow-50 p-2 text-xs leading-tight mt-4">
          <strong>Perhatian:</strong> ${config.warning}
        </div>
      </div>

      <!-- SURAT RUJUKAN BALIK (Bagian Bawah) -->
      <div class="page bg-white w-[800px] p-10 mx-auto mt-8 border-t-4 border-gray-800 pt-8">
        <!-- Header dengan Logo -->
        <div class="flex items-start gap-5">
          <img src="${config.clinic.logo}"
               alt="Logo ${config.clinic.name}"
               class="w-28 h-28 object-contain flex-shrink-0" />
          <div class="text-center flex-1">
            <h1 class="text-lg font-bold uppercase">${config.clinic.name}</h1>
            <p class="text-xs mt-1">${config.clinic.address.street}</p>
            <p class="text-xs">${config.clinic.address.district}</p>
            <p class="text-xs">Telepon: ${config.clinic.phone} | Email: ${config.clinic.email}</p>
          </div>
        </div>

        <hr class="border-gray-800 my-4">

        <!-- Judul Surat Rujukan Balik -->
        <h2 class="text-center font-bold text-lg mb-4 underline">${config.rujukanBalik.title}</h2>

        <!-- Isi Surat Rujukan Balik -->
        <div class="text-sm leading-relaxed">
          <p>${config.rujukanBalik.greeting}</p>
          <p>${config.rujukanBalik.opening}</p>

          <table class="mt-3 w-full text-sm">
            <tr>
              <td class="font-semibold w-32">${config.rujukanBalik.labels.name}</td>
              <td class="px-2">:</td>
              <td class="border-b border-dotted border-gray-600 min-h-5"></td>
            </tr>
            <tr>
              <td class="font-semibold">${config.rujukanBalik.labels.age}</td>
              <td class="px-2">:</td>
              <td class="border-b border-dotted border-gray-600 min-h-5"></td>
            </tr>
            <tr>
              <td class="font-semibold">${config.rujukanBalik.labels.diagnosis}</td>
              <td class="px-2">:</td>
              <td class="border-b border-dotted border-gray-600 min-h-5"></td>
            </tr>
            <tr>
              <td class="font-semibold">${config.rujukanBalik.labels.therapy}</td>
              <td class="px-2">:</td>
              <td class="border-b border-dotted border-gray-600 min-h-5"></td>
            </tr>
            <tr>
              <td class="font-semibold">${config.rujukanBalik.labels.suggestion}</td>
              <td class="px-2">:</td>
              <td class="border-b border-dotted border-gray-600 min-h-5"></td>
            </tr>
            <tr>
              <td class="font-semibold">${config.rujukanBalik.labels.notes}</td>
              <td class="px-2">:</td>
              <td class="border-b border-dotted border-gray-600 min-h-5"></td>
            </tr>
            <tr>
              <td class="font-semibold">${config.rujukanBalik.labels.conclusion}</td>
              <td class="px-2">:</td>
              <td class="border-b border-dotted border-gray-600 min-h-5"></td>
            </tr>
          </table>

          <!-- Tanda Tangan -->
          <div class="flex justify-end mt-8 text-sm">
            <div class="text-center w-48">
              <p>${config.clinic.city}, <span class="border-b border-dotted border-gray-600 inline-block w-20"></span> ${year}</p>
              <div class="h-16"></div>
              <p>(.................................................)</p>
            </div>
          </div>
        </div>

        <!-- Warning -->
        <div class="border border-gray-400 bg-yellow-50 p-2 text-xs leading-tight mt-4">
          <strong>Perhatian:</strong> ${config.warning}
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
