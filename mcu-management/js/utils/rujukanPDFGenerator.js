/**
 * Surat Rujukan PDF Generator
 * Generates professional referral letter with logo
 * Supports both Surat Rujukan (forward) and Surat Rujukan Balik (return)
 * Uses browser's native print dialog
 */

import { rujukanConfig } from './rujukanConfig.js';

/**
 * Generate Surat Rujukan (Forward Referral) PDF
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
 * Rujukan balik kosong - hanya template dengan fields kosong untuk diisi manual
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
 * Generate HTML untuk Surat Rujukan
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
            <h1 class="text-xl font-bold uppercase">${config.rujukan.title}</h1>
            <p class="text-sm mt-1">Dokumen ini merupakan surat rujukan pasien untuk penanganan lanjutan.<br>
            Harap isi dengan benar sesuai data asli pasien.</p>
          </div>
        </div>

        <hr class="border-gray-400 my-5">

        <!-- Surat Rujukan -->
        <h2 class="text-center font-semibold underline text-base mb-3">${config.rujukan.title}</h2>

        <div class="text-sm leading-relaxed">
          <p>${config.rujukan.greeting.salutation}</p>
          <p>${config.rujukan.greeting.recipient}</p>
          <p>${config.rujukan.greeting.place}</p>

          <p class="mt-3 font-semibold">${config.rujukan.greeting.opening}</p>
          <p>${config.rujukan.greeting.request}</p>

          <div class="mt-3 space-y-2">
            <p>${config.rujukan.labels.name}: <strong>${employee.name}</strong></p>
            <p>${config.rujukan.labels.age}: <strong>${employee.age || '___'} tahun</strong></p>
            <p>${config.rujukan.labels.gender}: <strong>${employee.jenisKelamin || '___'}</strong></p>
            <p>${config.rujukan.labels.company_job}: <strong>${employee.department && employee.jobTitle ? employee.department + ' / ' + employee.jobTitle : '___'}</strong></p>
          </div>

          <div class="mt-3">
            <p class="font-semibold">${config.rujukan.labels.physical_exam}:</p>
            <div class="ml-4 space-y-1">
              <p>${config.rujukan.labels.blood_pressure}: <strong>${mcu.bloodPressure || '____'}</strong> ${config.rujukan.units.blood_pressure} &nbsp;
                 ${config.rujukan.labels.respiratory_rate}: <strong>${mcu.respiratoryRate || '____'}</strong> ${config.rujukan.units.respiratory_rate}</p>
              <p>${config.rujukan.labels.pulse}: <strong>${mcu.pulse || '____'}</strong> ${config.rujukan.units.pulse} &nbsp;
                 ${config.rujukan.labels.temperature}: <strong>${mcu.temperature || '____'}</strong> ${config.rujukan.units.temperature}</p>
            </div>
          </div>

          <div class="mt-3 space-y-2">
            <p>${config.rujukan.labels.chief_complaint}: <strong>${mcu.keluhanUtama || '_________________________'}</strong></p>
            <p>${config.rujukan.labels.diagnosis}: <strong>${mcu.diagnosisKerja || '_________________________'}</strong></p>
            <p>${config.rujukan.labels.referral_reason}: <strong>${mcu.alasanRujuk || '_________________________'}</strong></p>
          </div>

          <div class="flex justify-end mt-8 text-sm">
            <div class="text-right">
              <p>${config.clinic.city}, ${day} ${getMonthName(parseInt(month))} ${year}</p>
              <p class="mt-1">${config.clinic.doctorTitle}</p>
              <div class="h-16"></div>
              <p><strong>${config.clinic.doctorName}</strong></p>
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
