const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  calculateAge,
  generateReferralLetter,
  referralObjectKey
} = require('../../server/workflow/referralLetterService');

function signaturePng() {
  return fs.readFileSync(path.join(
    __dirname,
    '../../server/workflow/assets/sekata-medical-center-logo.png'
  ));
}

function signatureJpeg() {
  return fs.readFileSync(path.join(__dirname, 'fixtures/signature.jpg'));
}

function pdfPageCount(buffer) {
  return (buffer.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
}

function validData(medicalResult = 'Follow-Up') {
  return {
    employee: {
      employee_id: 'EMP-001',
      name: 'Budi Santoso',
      date_of_birth: '1990-08-03',
      jenis_kelamin: 'Laki-laki',
      employee_type: 'Karyawan PST',
      job_title: 'Operator'
    },
    mcu: {
      mcu_id: 'MCU-001',
      mcu_type: 'Pre-Employee',
      mcu_date: '2026-08-01',
      blood_pressure: '120/80'
    },
    reviewCycle: {
      id: '11111111-1111-4111-8111-111111111111',
      mcu_id: 'MCU-001',
      cycle_number: 1,
      medical_result: medicalResult,
      clinical_notes: 'Evaluasi spesialis penyakit dalam.',
      finalized_at: '2026-08-02T08:00:00.000Z'
    },
    doctorProfile: {
      professional_name: 'dr. Siti',
      registration_number: 'SIP-123'
    },
    signatureBuffer: signaturePng()
  };
}

test('age uses completed birthdays', () => {
  assert.equal(calculateAge('1990-08-03', '2026-08-02T08:00:00.000Z'), '35 tahun');
  assert.equal(calculateAge('1990-08-02', '2026-08-02T08:00:00.000Z'), '36 tahun');
});

test('referral letter is a non-empty PDF with stable hash', async () => {
  const result = await generateReferralLetter(validData());
  assert.equal(result.buffer.subarray(0, 4).toString(), '%PDF');
  assert.ok(result.buffer.length > 10_000);
  assert.match(result.sha256, /^[0-9a-f]{64}$/);
});

test('referral letter accepts a JPEG signature', async () => {
  const data = validData();
  data.signatureBuffer = signatureJpeg();

  const result = await generateReferralLetter(data);

  assert.equal(result.buffer.subarray(0, 4).toString(), '%PDF');
  assert.equal(pdfPageCount(result.buffer), 1);
});

test('long referral content remains on one A4 page', async () => {
  const data = validData();
  data.reviewCycle.clinical_notes = (
    'Evaluasi klinis lanjutan diperlukan untuk memastikan kondisi pasien, '
    + 'menilai hasil pemeriksaan penunjang, dan menetapkan rekomendasi kerja. '
  ).repeat(4);
  data.doctorProfile.professional_name = (
    'dr. Nama Dokter Perusahaan Dengan Gelar Spesialis Penyakit Dalam'
  );
  data.doctorProfile.registration_number = 'SIP-KALTIM-2026-000000000000001';

  assert.ok(data.reviewCycle.clinical_notes.length >= 500);
  assert.ok(data.doctorProfile.professional_name.length >= 60);
  assert.ok(data.doctorProfile.registration_number.length >= 30);

  const result = await generateReferralLetter(data);

  assert.equal(result.buffer.subarray(0, 4).toString(), '%PDF');
  assert.equal(pdfPageCount(result.buffer), 1);
});

test('terminal medical result cannot generate referral letter', () => {
  assert.throws(() => generateReferralLetter(validData('Fit')), /hanya dibuat/);
});

test('referral object key is deterministic per review cycle', () => {
  const hash = 'a'.repeat(64);
  assert.equal(
    referralObjectKey(validData().reviewCycle, hash),
    'referral-letters/MCU-001/11111111-1111-4111-8111-111111111111-aaaaaaaaaaaaaaaa.pdf'
  );
});
