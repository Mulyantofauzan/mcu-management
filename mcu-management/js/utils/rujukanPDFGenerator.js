/**
 * Surat Rujukan PDF Generator
 * Generates referral letter as print-friendly HTML
 * Uses browser's native print dialog instead of external library
 */

/**
 * Generate PDF using browser print dialog
 * Opens a formatted document ready to print/save as PDF
 */
export function generateRujukanPDF(employee, mcu) {
  // Validate input
  if (!employee || !mcu) {
    throw new Error('Data karyawan atau MCU tidak lengkap');
  }

  // Generate HTML content
  const content = generatePDFContent(employee, mcu);

  // Create temporary window for printing
  const printWindow = window.open('', '_blank');
  printWindow.document.write(content);
  printWindow.document.close();

  // Trigger print dialog after content loads
  printWindow.onload = function() {
    printWindow.focus();
    printWindow.print();
    // Close window setelah user selesai print
    setTimeout(() => {
      printWindow.close();
    }, 500);
  };
}

/**
 * Generate HTML content untuk PDF/Print
 */
function generatePDFContent(employee, mcu) {
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
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Courier New', monospace;
          background: white;
          padding: 20px;
        }

        .container {
          max-width: 210mm;
          height: 297mm;
          margin: 0 auto;
          background: white;
          padding: 20mm;
          line-height: 1.6;
          font-size: 11pt;
        }

        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
        }

        .clinic-name {
          font-size: 16pt;
          font-weight: bold;
          letter-spacing: 3px;
        }

        .clinic-subtitle {
          font-size: 11pt;
          margin-top: 3px;
        }

        .clinic-address {
          font-size: 9pt;
          margin-top: 8px;
          text-align: right;
          line-height: 1.3;
        }

        .title {
          text-align: center;
          font-size: 13pt;
          font-weight: bold;
          margin: 25px 0;
          text-decoration: underline;
        }

        .greeting {
          margin-bottom: 15px;
        }

        .greeting div {
          margin-bottom: 3px;
        }

        .section {
          margin: 15px 0;
        }

        .section-title {
          font-weight: bold;
          margin-bottom: 8px;
          text-decoration: underline;
        }

        .field {
          display: flex;
          margin-bottom: 6px;
          align-items: flex-start;
        }

        .field-label {
          width: 140px;
          font-weight: normal;
        }

        .field-value {
          flex: 1;
          word-break: break-word;
        }

        .separator {
          border-bottom: 1px solid #000;
          margin: 20px 0;
        }

        .signature-section {
          margin-top: 40px;
          text-align: center;
        }

        .signature-date {
          margin-bottom: 30px;
        }

        .signature-line {
          border-top: 1px solid #000;
          width: 250px;
          margin: 50px auto 0;
          height: 1px;
        }

        .signature-name {
          margin-top: 10px;
          font-weight: bold;
        }

        .signature-title {
          font-size: 9pt;
          margin-top: 3px;
        }

        .footer {
          font-size: 8pt;
          text-align: center;
          margin-top: 30px;
          color: #333;
          line-height: 1.3;
          border-top: 1px solid #ccc;
          padding-top: 10px;
        }

        @media print {
          * {
            margin: 0;
            padding: 0;
          }

          body {
            margin: 0;
            padding: 0;
            background: white;
          }

          .container {
            margin: 0;
            padding: 15mm;
            height: auto;
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="clinic-name">SEKATA</div>
          <div class="clinic-subtitle">MEDICAL CENTER</div>
          <div class="clinic-address">
            Jl. Pangeran Suryanata No.27 RT.15, Kelurahan Air Putih<br>
            Kecamatan Samarinda Ulu, Kota Samarinda Kalimantan Timur<br>
            Telp: 0541 2921958<br>
            Email: sekatamedicalcenter@gmail.com
          </div>
        </div>

        <div class="title">SURAT RUJUKAN</div>

        <div class="greeting">
          <div>Kepada Yth.</div>
          <div>Ts. Dokter Spesialis Penyakit Dalam</div>
          <div>Di Tempat</div>
          <div style="margin-top: 10px;">Dengan Hormat,</div>
          <div>Mohon perawatan lebih lanjut pasien tersebut di bawah ini :</div>
        </div>

        <div class="section">
          <div class="field">
            <div class="field-label">Nama</div>
            <div class="field-value">: ${employee.name || '___________________________'}</div>
          </div>
          <div class="field">
            <div class="field-label">Umur</div>
            <div class="field-value">: ${employee.age || '___'} tahun</div>
          </div>
          <div class="field">
            <div class="field-label">Jenis Kelamin</div>
            <div class="field-value">: ${employee.jenisKelamin || '___________'}</div>
          </div>
          <div class="field">
            <div class="field-label">Perusahaan/Jabatan</div>
            <div class="field-value">: ${employee.department && employee.jobTitle ? employee.department + ' / ' + employee.jobTitle : '___________________________'}</div>
          </div>
        </div>

        <div class="separator"></div>

        <div class="section">
          <div class="section-title">Pemeriksaan Fisik</div>
          <div class="field">
            <div class="field-label">Tekanan Darah</div>
            <div class="field-value">: ${mcu.bloodPressure || '____'} mmHg</div>
          </div>
          <div class="field">
            <div class="field-label">RR (Frequensi Nafas)</div>
            <div class="field-value">: ${mcu.respiratoryRate || '____'} /m</div>
          </div>
          <div class="field">
            <div class="field-label">Nadi</div>
            <div class="field-value">: ${mcu.pulse || '____'} /m</div>
          </div>
          <div class="field">
            <div class="field-label">Suhu</div>
            <div class="field-value">: ${mcu.temperature || '____'} °C</div>
          </div>
        </div>

        <div class="separator"></div>

        <div class="section">
          <div class="section-title">Keluhan Utama</div>
          <div style="margin-left: 140px;">${mcu.keluhanUtama || '______________________________________________________________________'}</div>
        </div>

        <div class="section">
          <div class="section-title">Diagnosis Kerja</div>
          <div style="margin-left: 140px;">${mcu.diagnosisKerja || '______________________________________________________________________'}</div>
        </div>

        <div class="section">
          <div class="section-title">Alasan Dirujuk</div>
          <div style="margin-left: 140px;">${mcu.alasanRujuk || '______________________________________________________________________'}</div>
        </div>

        <div class="signature-section">
          <div class="signature-date">Samarinda, ${day} ${getMonthName(parseInt(month))} ${year}</div>
          <div class="signature-line"></div>
          <div class="signature-name">dr. Pahroni</div>
          <div class="signature-title">Dokter FAR PT.PST</div>
        </div>

        <div class="footer">
          Surat rujukan harus disertai dengan RL, Ringkasan hasil tes lab dan atau pemeriksaan lain yang relevan dengan urutan masalah
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
