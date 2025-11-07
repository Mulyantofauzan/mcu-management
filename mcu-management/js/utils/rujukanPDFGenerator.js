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

  // Use doctor name from employee data if provided, otherwise use fallback
  const doctorName = employee.doctorName || 'Dr. -';
  const content = generateRujukanHTML(employee, mcu, doctorName);
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
 * Compatible with Safari and other browsers
 */
function openPrintDialog(content) {
  try {
    const printWindow = window.open('', '_blank');

    // Check if window.open was blocked or failed (Safari may block or delay)
    if (!printWindow) {
      throw new Error('Tidak dapat membuka jendela print. Pastikan pop-up tidak diblokir browser.');
    }

    // Ensure document is accessible before writing
    if (printWindow.document && typeof printWindow.document.write === 'function') {
      printWindow.document.write(content);
      printWindow.document.close();

      // For Safari compatibility, use setTimeout to ensure content is rendered
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (e) {
          // Silent fail - print dialog may have been cancelled
        }
      }, 300);

      // Close after print (user may cancel, so delay)
      setTimeout(() => {
        try {
          printWindow.close();
        } catch (e) {
          // Window may have been closed by user
        }
      }, 2000);
    } else {
      throw new Error('Tidak dapat akses document di print window');
    }
  } catch (error) {
    throw new Error('Gagal membuka jendela print: ' + error.message);
  }
}

/**
 * Helper function untuk mendapatkan nama perusahaan berdasarkan employment status
 */
function getCompanyName(employee) {
  if (employee.employmentStatus === 'Karyawan PST') {
    return 'PT. Putra Sarana Transborneo';
  } else if (employee.employmentStatus === 'Vendor' && employee.vendorName) {
    return employee.vendorName;
  }
  return '';
}

/**
 * Generate HTML untuk Surat Rujukan dan Surat Rujukan Balik
 * Sesuai template yang diberikan user
 */
function generateRujukanHTML(employee, mcu, doctorName) {
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
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: white !important;
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      padding: 10px;
    }
    .page {
      max-width: 820px;
      margin: 0 auto;
      padding: 15px 25px;
    }
    .icon-column {
      background-color: rgb(30, 58, 138);
      color: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    hr {
      border: none;
      border-top: 1px solid #999;
      margin: 10px 0;
    }
    h2 {
      text-align: center;
      font-weight: 600;
      text-decoration: underline;
      font-size: 13px;
      margin: 10px 0 8px 0;
    }
    p { margin: 4px 0; }
    @media print {
      @page { size: A4; margin: 10mm; }
      body { padding: 0; }
      .page { box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- HEADER -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div><img src="https://s3.nevaobjects.id/saffix-storige/saffmedic-sekata/company/klinik_sekata_medical_center-1-09052025084603.png" style="width: 150px; object-fit: contain;"></div>

      <div style="display: flex;">
        <div style="text-align: right; font-size: 12px; line-height: 1.3;">
          <p>Jl. Pangeran Suryanata No.27 RT.15, Kel. Air Putih</p>
          <p>Kec. Samarinda Ulu, Kota Samarinda</p>
          <p>Kalimantan Timur</p>
          <p>Telp: 0541 2921958</p>
          <p>Email: sekatamedicalcenter@gmail.com</p>
        </div>
        <div class="icon-column" style="display:flex;flex-direction:column;align-items:center;justify-content:space-around;width:36px;border-radius:0 6px 6px 0;padding:8px 0;margin-left:5px;">
          <div>📍</div><div>☎️</div><div>✉️</div>
        </div>
      </div>
    </div>

    <hr>

    <!-- SURAT RUJUKAN -->
    <h2>SURAT RUJUKAN</h2>
    <div>
      <p>Kepada Yth.</p>
      <p>${mcu.recipient}</p>
      <p>Di Tempat</p>

      <p style="margin-top:8px;"><strong>Dengan Hormat,</strong></p>
      <p>Mohon perawatan lebih lanjut pasien tersebut di bawah ini:</p>

      <div style="margin-top:6px;">
        <p>Nama: <span style="border-bottom:1px dotted #666;display:inline-block;width:400px;">${employee.name}</span></p>
        <p>Umur: <span style="border-bottom:1px dotted #666;display:inline-block;width:400px;">${employee.age || ''}</span></p>
        <p>Jenis Kelamin: <span style="border-bottom:1px dotted #666;display:inline-block;width:360px;">${employee.jenisKelamin || ''}</span></p>
        <p>Perusahaan/Jabatan: <span style="border-bottom:1px dotted #666;display:inline-block;width:330px;">${getCompanyName(employee)} / ${employee.jobTitle || ''}</span></p>
      </div>

      <div style="margin-top:8px;">
        <p><strong>Pemeriksaan Fisik:</strong></p>
        <p style="margin-left:20px;">Tekanan Darah: <span style="border-bottom:1px dotted #666;display:inline-block;width:70px;">${mcu.bloodPressure || ''}</span> mmHg &nbsp; RR: <span style="border-bottom:1px dotted #666;display:inline-block;width:40px;">${mcu.respiratoryRate || ''}</span> /m</p>
        <p style="margin-left:20px;">Nadi: <span style="border-bottom:1px dotted #666;display:inline-block;width:60px;">${mcu.pulse || ''}</span> /m &nbsp; Suhu: <span style="border-bottom:1px dotted #666;display:inline-block;width:60px;">${mcu.temperature || ''}</span> °C</p>
      </div>

      <div style="margin-top:8px;">
        <p>Keluhan Utama: <span style="border-bottom:1px dotted #666;display:inline-block;width:350px;">${mcu.keluhanUtama || ''}</span></p>
        <p>Diagnosis Kerja: <span style="border-bottom:1px dotted #666;display:inline-block;width:350px;">${mcu.diagnosisKerja || ''}</span></p>
        <p>Alasan dirujuk: <span style="border-bottom:1px dotted #666;display:inline-block;width:350px;">${mcu.alasanRujuk || ''}</span></p>
      </div>

      <div style="text-align:right;margin-top:12px;">
        <p>${config.clinic.city}, <span style="border-bottom:1px dotted #666;display:inline-block;width:120px;">${day} ${getMonthName(parseInt(month))}</span> 20${year}</p>
        <p>Dokter FAR PT. PST</p>
        <div style="height:24px;"></div>
        <p><strong>${doctorName || config.clinic.doctorName}</strong></p>
      </div>
    </div>

    <hr style="margin:12px 0;">

    <!-- SURAT RUJUKAN BALIK -->
    <h2>SURAT RUJUKAN BALIK</h2>
    <div>
      <p>Yth. Rekan Sejawat,</p>
      <p>Bersama ini kami kirim kembali pasien berikut:</p>

      <div style="margin-top:6px;">
        <p>Nama: <span style="border-bottom:1px dotted #666;display:inline-block;width:400px;"></span></p>
        <p>Usia: <span style="border-bottom:1px dotted #666;display:inline-block;width:400px;"></span></p>
        <p>Diagnosa: <span style="border-bottom:1px dotted #666;display:inline-block;width:370px;"></span></p>
        <p>Terapi: <span style="border-bottom:1px dotted #666;display:inline-block;width:390px;"></span></p>
        <p>Saran: <span style="border-bottom:1px dotted #666;display:inline-block;width:390px;"></span></p>
        <p>Keterangan: <span style="border-bottom:1px dotted #666;display:inline-block;width:350px;"></span></p>
        <p>Kesimpulan: <span style="border-bottom:1px dotted #666;display:inline-block;width:350px;"></span></p>
      </div>

      <div style="text-align:right;margin-top:10px;">
        <p>${config.clinic.city}, <span style="border-bottom:1px dotted #666;display:inline-block;width:100px;"></span> 20<span style="border-bottom:1px dotted #666;display:inline-block;width:25px;"></span></p>
        <div style="height:24px;"></div>
        <p>(...........................................)</p>
      </div>
    </div>

    <div style="border:1px solid #ccc;background-color:#fffacd;padding:8px;font-size:11px;margin-top:10px;line-height:1.3;">
      <strong>Perhatian:</strong> Surat rujukan harus sesuai dengan asli. Dilarang memalsukan data atau berkas hasil rujukan/MCU. Pelanggaran akan dikenai sanksi hukum dan sanksi perusahaan.
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
