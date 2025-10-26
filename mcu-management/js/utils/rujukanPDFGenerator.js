/**
 * Surat Rujukan PDF Generator
 * Generates referral letter as print-friendly HTML
 * Uses browser's native print dialog instead of external library
 * Supports customizable config and logo
 */

import { rujukanConfig } from './rujukanConfig.js';

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
 * Generate HTML content untuk PDF/Print menggunakan config
 */
function generatePDFContent(employee, mcu) {
  const config = rujukanConfig;
  const currentDate = new Date();
  const day = String(currentDate.getDate()).padStart(2, '0');
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const year = currentDate.getFullYear();

  // Build logo HTML if exists
  const logoHTML = config.clinic.logo ? `
    <div class="logo-container">
      <img src="${config.clinic.logo}" alt="Logo" class="clinic-logo">
    </div>
  ` : '';

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
          display: flex;
          align-items: center;
          gap: 15px;
          justify-content: center;
        }

        .logo-container {
          flex-shrink: 0;
        }

        .clinic-logo {
          max-width: 30mm;
          max-height: 30mm;
          height: auto;
        }

        .header-text {
          text-align: center;
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
          ${logoHTML}
          <div class="header-text">
            <div class="clinic-name">${config.clinic.name}</div>
            <div class="clinic-subtitle">${config.clinic.subtitle}</div>
            <div class="clinic-address">
              ${config.clinic.address.street}<br>
              ${config.clinic.address.district}<br>
              Telp: ${config.clinic.address.phone}<br>
              Email: ${config.clinic.address.email}
            </div>
          </div>
        </div>

        <div class="title">SURAT RUJUKAN</div>

        <div class="greeting">
          <div>${config.greeting.salutation}</div>
          <div>${config.greeting.recipient}</div>
          <div>${config.greeting.place}</div>
          <div style="margin-top: 10px;">${config.greeting.opening}</div>
          <div>${config.greeting.request}</div>
        </div>

        <div class="section">
          <div class="field">
            <div class="field-label">${config.labels.name}</div>
            <div class="field-value">: ${employee.name || '___________________________'}</div>
          </div>
          <div class="field">
            <div class="field-label">${config.labels.age}</div>
            <div class="field-value">: ${employee.age || '___'} ${config.units.age}</div>
          </div>
          <div class="field">
            <div class="field-label">${config.labels.gender}</div>
            <div class="field-value">: ${employee.jenisKelamin || '___________'}</div>
          </div>
          <div class="field">
            <div class="field-label">${config.labels.company_job}</div>
            <div class="field-value">: ${employee.department && employee.jobTitle ? employee.department + ' / ' + employee.jobTitle : '___________________________'}</div>
          </div>
        </div>

        <div class="separator"></div>

        <div class="section">
          <div class="section-title">${config.labels.physical_exam}</div>
          <div class="field">
            <div class="field-label">${config.labels.blood_pressure}</div>
            <div class="field-value">: ${mcu.bloodPressure || '____'} ${config.units.blood_pressure}</div>
          </div>
          <div class="field">
            <div class="field-label">${config.labels.respiratory_rate}</div>
            <div class="field-value">: ${mcu.respiratoryRate || '____'} ${config.units.respiratory_rate}</div>
          </div>
          <div class="field">
            <div class="field-label">${config.labels.pulse}</div>
            <div class="field-value">: ${mcu.pulse || '____'} ${config.units.pulse}</div>
          </div>
          <div class="field">
            <div class="field-label">${config.labels.temperature}</div>
            <div class="field-value">: ${mcu.temperature || '____'} ${config.units.temperature}</div>
          </div>
        </div>

        <div class="separator"></div>

        <div class="section">
          <div class="section-title">${config.labels.chief_complaint}</div>
          <div style="margin-left: 140px;">${mcu.keluhanUtama || '______________________________________________________________________'}</div>
        </div>

        <div class="section">
          <div class="section-title">${config.labels.diagnosis}</div>
          <div style="margin-left: 140px;">${mcu.diagnosisKerja || '______________________________________________________________________'}</div>
        </div>

        <div class="section">
          <div class="section-title">${config.labels.referral_reason}</div>
          <div style="margin-left: 140px;">${mcu.alasanRujuk || '______________________________________________________________________'}</div>
        </div>

        <div class="signature-section">
          <div class="signature-date">${config.clinic.city}, ${day} ${getMonthName(parseInt(month))} ${year}</div>
          <div class="signature-line"></div>
          <div class="signature-name">${config.clinic.doctorName}</div>
          <div class="signature-title">${config.clinic.doctorTitle}</div>
        </div>

        <div class="footer">
          ${config.footer}
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
