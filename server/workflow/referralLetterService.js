const PDFDocument = require('pdfkit');
const path = require('path');
const { createHash } = require('crypto');
const { LOOPING_MEDICAL_RESULTS, WORKFLOW_ERROR_CODES } = require('./constants');
const { WorkflowError } = require('./errors');

const ASSET_DIR = path.join(__dirname, 'assets');
const FONT_REGULAR = path.join(ASSET_DIR, 'Poppins-Regular.ttf');
const FONT_BOLD = path.join(ASSET_DIR, 'Poppins-Bold.ttf');
const CLINIC_LOGO = path.join(ASSET_DIR, 'sekata-medical-center-logo.png');

const CLINIC = Object.freeze({
  name: 'SEKATA MEDICAL CENTER',
  street: 'Jl. Pangeran Suryanata No.27 RT.15, Kel. Air Putih',
  area: 'Kec. Samarinda Ulu, Kota Samarinda, Kalimantan Timur',
  phone: '0541 2921958',
  email: 'sekatamedicalcenter@gmail.com',
  city: 'Samarinda'
});

const MONTHS = Object.freeze([
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]);

function clean(value, fallback = '-') {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text || fallback;
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function calculateAge(dateOfBirth, referenceDate) {
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  const reference = new Date(referenceDate);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(reference.getTime())) return '-';
  let age = reference.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday = reference.getUTCMonth() < birth.getUTCMonth()
    || (reference.getUTCMonth() === birth.getUTCMonth()
      && reference.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? `${age} tahun` : '-';
}

function companyName(employee) {
  if (employee.employee_type === 'Karyawan PST') return 'PT. Putra Sarana Transborneo';
  return clean(employee.vendor_name, 'Vendor');
}

function drawLabelValue(doc, label, value, options = {}) {
  const y = doc.y;
  const labelWidth = options.labelWidth || 120;
  doc.font('Poppins-Bold').fontSize(9).text(`${label}:`, 50, y, { width: labelWidth });
  doc.font('Poppins').fontSize(options.valueFontSize || 9).text(clean(value), 50 + labelWidth, y, {
    width: 495 - labelWidth,
    lineGap: options.lineGap ?? 2
  });
  doc.y = Math.max(doc.y, y + 11.5);
}

function drawHeader(doc) {
  doc.image(CLINIC_LOGO, 48, 34, { fit: [145, 70], align: 'left', valign: 'center' });
  doc.font('Poppins-Bold').fontSize(11).fillColor('#1e3a8a')
    .text(CLINIC.name, 225, 38, { width: 320, align: 'right' });
  doc.font('Poppins').fontSize(7.7).fillColor('#111827')
    .text(CLINIC.street, 225, 56, { width: 320, align: 'right' })
    .text(CLINIC.area, { width: 320, align: 'right' })
    .text(`Telp: ${CLINIC.phone} | ${CLINIC.email}`, { width: 320, align: 'right' });
  doc.moveTo(50, 115).lineTo(545, 115).lineWidth(1).strokeColor('#334155').stroke();
  doc.y = 128;
}

function drawReturnReferral(doc, employee) {
  doc.moveDown(0.2);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.7).strokeColor('#94a3b8').stroke();
  doc.moveDown(0.4);
  doc.font('Poppins-Bold').fontSize(11).fillColor('#111827')
    .text('SURAT RUJUKAN BALIK', { align: 'center', underline: true });
  doc.moveDown(0.2);
  doc.font('Poppins').fontSize(8.5)
    .text('Yth. Rekan Sejawat,')
    .text('Bersama ini kami kirim kembali pasien berikut:');
  doc.moveDown(0.15);
  drawLabelValue(doc, 'Nama', employee.name);
  ['Diagnosa', 'Terapi', 'Saran', 'Keterangan', 'Kesimpulan'].forEach(label => {
    drawLabelValue(doc, label, '................................................................................................');
  });
}

function assertReferralData(data) {
  const required = ['employee', 'mcu', 'reviewCycle', 'doctorProfile', 'signatureBuffer'];
  const missing = required.find(field => !data[field]);
  if (missing) {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.DOCUMENT_FAILED, {
      message: `Data surat rujukan belum lengkap: ${missing}.`
    });
  }
  if (!LOOPING_MEDICAL_RESULTS.includes(data.reviewCycle.medical_result)) {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.INVALID_TRANSITION, {
      message: 'Surat rujukan hanya dibuat untuk Follow-Up atau Temporary Unfit.'
    });
  }
  if (!Buffer.isBuffer(data.signatureBuffer) || data.signatureBuffer.length === 0) {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.DOCUMENT_FAILED, {
      message: 'Tanda tangan dokter belum tersedia.'
    });
  }
}

function generateReferralLetter(data) {
  assertReferralData(data);
  const { employee, mcu, reviewCycle, doctorProfile, signatureBuffer } = data;

  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 35, bottom: 35, left: 50, right: 50 },
      info: {
        Title: `Surat Rujukan ${employee.name}`,
        Author: CLINIC.name,
        Subject: `MCU ${mcu.mcu_id} siklus ${reviewCycle.cycle_number}`
      }
    });
    doc.registerFont('Poppins', FONT_REGULAR);
    doc.registerFont('Poppins-Bold', FONT_BOLD);
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve({
        buffer,
        sha256: createHash('sha256').update(buffer).digest('hex')
      });
    });

    drawHeader(doc);
    doc.font('Poppins-Bold').fontSize(12).fillColor('#111827')
      .text('SURAT RUJUKAN', { align: 'center', underline: true });
    doc.moveDown(0.6);
    doc.font('Poppins').fontSize(9)
      .text('Kepada Yth. Dokter Spesialis Penyakit Dalam')
      .text('Di Tempat')
      .moveDown(0.4)
      .font('Poppins-Bold').text('Dengan hormat,')
      .font('Poppins').text('Mohon pemeriksaan dan penanganan lebih lanjut untuk pasien berikut:');
    doc.moveDown(0.5);

    drawLabelValue(doc, 'Nama', employee.name);
    drawLabelValue(doc, 'ID Karyawan', employee.employee_id);
    drawLabelValue(doc, 'Umur', calculateAge(employee.date_of_birth, reviewCycle.finalized_at));
    drawLabelValue(doc, 'Jenis Kelamin', employee.jenis_kelamin);
    drawLabelValue(doc, 'Perusahaan/Jabatan', `${companyName(employee)} / ${clean(employee.job_title)}`);
    drawLabelValue(doc, 'MCU', `${clean(mcu.mcu_type)} - ${formatDate(`${mcu.mcu_date}T00:00:00Z`)}`);
    drawLabelValue(doc, 'Siklus Review', reviewCycle.cycle_number);
    drawLabelValue(doc, 'Hasil Dokter', reviewCycle.medical_result);
    drawLabelValue(doc, 'Tekanan Darah', mcu.blood_pressure ? `${mcu.blood_pressure} mmHg` : '-');
    drawLabelValue(doc, 'Catatan Klinis', reviewCycle.clinical_notes, {
      valueFontSize: 8,
      lineGap: 0
    });

    const signatureTop = Math.max(doc.y + 12, 430);
    doc.font('Poppins').fontSize(8.5)
      .text(`${CLINIC.city}, ${formatDate(reviewCycle.finalized_at)}`, 340, signatureTop, {
        width: 205,
        align: 'center'
      })
      .text('Dokter Pemeriksa', { width: 205, align: 'center' });
    try {
      doc.image(signatureBuffer, 375, signatureTop + 27, {
        fit: [135, 64],
        align: 'center',
        valign: 'center'
      });
    } catch (error) {
      reject(new WorkflowError(WORKFLOW_ERROR_CODES.DOCUMENT_FAILED, {
        message: 'Format gambar tanda tangan tidak dapat dibaca.',
        cause: error
      }));
      doc.end();
      return;
    }
    doc.font('Poppins-Bold').fontSize(8.5)
      .text(clean(doctorProfile.professional_name), 340, signatureTop + 95, {
        width: 205,
        align: 'center',
        underline: true
      });
    if (doctorProfile.registration_number) {
      doc.font('Poppins').fontSize(7.5)
        .text(`No. registrasi: ${doctorProfile.registration_number}`, {
          width: 205,
          align: 'center'
        });
    }

    doc.y = Math.max(doc.y, signatureTop + 128);
    drawReturnReferral(doc, employee);
    doc.moveDown(0.6);
    doc.roundedRect(50, doc.y, 495, 42, 3).fillAndStroke('#fff7cc', '#d6b656');
    doc.fillColor('#5c4800').font('Poppins').fontSize(7.3)
      .text('Perhatian: Surat rujukan harus sesuai dengan asli. Dilarang memalsukan data atau berkas hasil rujukan/MCU. Pelanggaran dikenai sanksi hukum dan ketentuan perusahaan.', 60, doc.y + 10, {
        width: 475,
        align: 'justify'
      });
    doc.end();
  });
}

function referralObjectKey(reviewCycle, contentSha256) {
  const mcuId = String(reviewCycle.mcu_id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const hash = String(contentSha256 || '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.DOCUMENT_FAILED, {
      message: 'Hash dokumen rujukan tidak valid.'
    });
  }
  return `referral-letters/${mcuId}/${reviewCycle.id}-${hash.slice(0, 16)}.pdf`;
}

module.exports = {
  CLINIC,
  calculateAge,
  formatDate,
  generateReferralLetter,
  referralObjectKey
};
