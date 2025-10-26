/**
 * Surat Rujukan PDF Generator
 * Generates referral letter PDF based on MCU data
 */

/**
 * Load jsPDF library dynamically if not already loaded
 */
async function loadjsPDFLibrary() {
  return new Promise((resolve, reject) => {
    // Check if jsPDF is already loaded
    if (window.jsPDF) {
      resolve(window.jsPDF);
      return;
    }

    // If not, load it dynamically from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    script.onload = () => {
      if (window.jsPDF) {
        resolve(window.jsPDF);
      } else {
        reject(new Error('jsPDF library failed to initialize'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load jsPDF library from CDN'));
    };
    document.head.appendChild(script);
  });
}

export async function generateRujukanPDF(employee, mcu) {
  let jsPDFLib;

  try {
    jsPDFLib = await loadjsPDFLibrary();
  } catch (error) {
    console.error('jsPDF library loading failed:', error);
    throw new Error('Gagal memuat PDF library: ' + error.message);
  }

  const { jsPDF } = jsPDFLib;
  const doc = new jsPDF();

  // Set font
  doc.setFont('Courier', 'normal');

  // Header
  doc.setFontSize(16);
  doc.text('SEKATA', 20, 20);
  doc.setFontSize(10);
  doc.text('MEDICAL CENTER', 20, 26);

  // Address on right
  doc.setFontSize(9);
  const addressLines = [
    'Jl. Pangeran Suryanata No.27 RT.15, Kelurahan Air Putih',
    'Kecamatan Samarinda Ulu, Kota Samarinda Kalimantan Timur',
    'Telp: 0541 2921958',
    'Email: sekatamedicalcenter@gmail.com'
  ];
  addressLines.forEach((line, i) => {
    doc.text(line, 120, 15 + i * 5, { align: 'right' });
  });

  // Horizontal line
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);

  // Title
  doc.setFontSize(12);
  doc.setFont('Courier', 'bold');
  doc.text('SURAT RUJUKAN', 105, 45, { align: 'center' });

  // Content
  doc.setFont('Courier', 'normal');
  doc.setFontSize(10);
  let yPosition = 60;

  doc.text('Kepada Yth.', 20, yPosition);
  yPosition += 6;
  doc.text('Ts. Dokter Spesialis Penyakit Dalam', 20, yPosition);
  yPosition += 6;
  doc.text('Di Tempat', 20, yPosition);
  yPosition += 10;

  doc.text('Dengan Hormat,', 20, yPosition);
  yPosition += 8;
  doc.text('Mohon perawatan lebih lanjut pasien tersebut di bawah ini :', 20, yPosition);
  yPosition += 10;

  // Patient data
  const data = [
    ['Nama', ':', employee?.name || '___________________________'],
    ['Umur', ':', employee?.age || '_____ tahun'],
    ['Jenis Kelamin', ':', employee?.jenisKelamin || '_______________'],
    ['Perusahaan/Jabatan', ':', employee?.department && employee?.jobTitle ?
        `${employee.department} / ${employee.jobTitle}` : '___________________________'],
  ];

  data.forEach(row => {
    doc.text(row[0], 20, yPosition);
    doc.text(row[1], 45, yPosition);
    doc.text(row[2], 55, yPosition);
    yPosition += 6;
  });

  yPosition += 2;

  // Physical examination
  doc.setFont('Courier', 'bold');
  doc.text('Pemeriksaan Fisik', 20, yPosition);
  yPosition += 6;
  doc.setFont('Courier', 'normal');

  const examData = [
    ['Tekanan Darah', ': ' + (mcu?.bloodPressure || '____') + ' mmHg', 'RR', ': ' + (mcu?.respiratoryRate || '____') + ' /m'],
    ['Nadi', ': ' + (mcu?.pulse || '____') + ' /m', 'Suhu', ': ' + (mcu?.temperature || '____') + ' °C'],
  ];

  examData.forEach(row => {
    doc.text(row[0], 20, yPosition);
    doc.text(row[1], 40, yPosition);
    doc.text(row[2], 110, yPosition);
    doc.text(row[3], 130, yPosition);
    yPosition += 6;
  });

  yPosition += 4;

  // Chief complaint
  doc.setFont('Courier', 'bold');
  doc.text('Keluhan Utama', 20, yPosition);
  yPosition += 6;
  doc.setFont('Courier', 'normal');
  const keluhanText = mcu?.keluhanUtama || '_________________________________________________';
  const keluhanLines = doc.splitTextToSize(keluhanText, 170);
  doc.text(keluhanLines, 20, yPosition);
  yPosition += keluhanLines.length * 5 + 4;

  // Working diagnosis
  doc.setFont('Courier', 'bold');
  doc.text('Diagnosis Kerja', 20, yPosition);
  yPosition += 6;
  doc.setFont('Courier', 'normal');
  const diagnosisText = mcu?.diagnosisKerja || '_________________________________________________';
  const diagnosisLines = doc.splitTextToSize(diagnosisText, 170);
  doc.text(diagnosisLines, 20, yPosition);
  yPosition += diagnosisLines.length * 5 + 4;

  // Referral reason
  doc.setFont('Courier', 'bold');
  doc.text('Alasan Dirujuk', 20, yPosition);
  yPosition += 6;
  doc.setFont('Courier', 'normal');
  const alasanText = mcu?.alasanRujuk || '_________________________________________________';
  const alasanLines = doc.splitTextToSize(alasanText, 170);
  doc.text(alasanLines, 20, yPosition);
  yPosition += alasanLines.length * 5 + 8;

  // Signature section
  doc.text('Samarinda, ..................... 20...', 105, yPosition, { align: 'center' });
  yPosition += 8;
  doc.text('Dokter FAR PT.PST', 105, yPosition, { align: 'center' });
  yPosition += 12;
  doc.text('dr. Pahroni', 105, yPosition, { align: 'center' });

  // Footer note
  doc.setFontSize(8);
  yPosition = 280;
  const footerText = 'Surat rujukan harus disertai dengan RL, Ringkasan hasil tes lab dan atau pemeriksaan lain yang relevan dengan urutan masalah';
  const footerLines = doc.splitTextToSize(footerText, 170);
  doc.text(footerLines, 20, yPosition);

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const filename = `Surat_Rujukan_${employee?.name || 'Patient'}_${date}.pdf`;

  // Download
  doc.save(filename);
}

/**
 * Helper: Calculate age from birth date
 */
export function calculateAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
