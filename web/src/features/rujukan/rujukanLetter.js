/* Surat Rujukan dan Rujukan Balik (dipindahkan dari rujukanPDFGenerator.js dan rujukanConfig.js lama).
   Semua isian di-escape: surat ditulis ke jendela cetak, jadi nama berisi HTML tidak boleh dieksekusi. */
export const CLINIC = {
  logo: 'https://s3.nevaobjects.id/saffix-storige/saffmedic-sekata/company/klinik_sekata_medical_center-1-09052025084603.png',
  address: ['Jl. Pangeran Suryanata No.27 RT.15, Kel. Air Putih', 'Kec. Samarinda Ulu, Kota Samarinda', 'Kalimantan Timur', 'Telp: 0541 2921958', 'Email: sekatamedicalcenter@gmail.com'],
  city: 'Samarinda',
  doctorName: 'dr. Pahroni'
};
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const WARNING = 'Surat rujukan harus sesuai dengan asli. Dilarang memalsukan data atau berkas hasil rujukan/MCU. Pelanggaran akan dikenai sanksi hukum dan sanksi perusahaan.';

export const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function companyName(employee) {
  if (employee.employeeType === 'Karyawan PST') return 'PT. Putra Sarana Transborneo';
  if (employee.employeeType === 'Vendor' && employee.vendorName) return employee.vendorName;
  return '';
}

export const doctorNameOf = (doctorId, doctors) => doctors.find(doctor => String(doctor.id) === String(doctorId))?.name || 'Dr. -';

const line = (width, content = '') => `<span style="border-bottom:1px dotted #666;display:inline-block;width:${width}px;">${esc(content)}</span>`;

const STYLE = `body{background:white!important;font-family:Arial,sans-serif;font-size:12px;line-height:1.4;padding:10px}
.page{max-width:820px;margin:0 auto;padding:15px 25px}.icon-column{background-color:rgb(30,58,138);color:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}
hr{border:none;border-top:1px solid #999;margin:10px 0}h2{text-align:center;font-weight:600;text-decoration:underline;font-size:13px;margin:10px 0 8px}p{margin:4px 0}
@media print{@page{size:A4;margin:10mm}body{padding:0}.page{box-shadow:none;padding:0}}`;

function header() {
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div><img src="${esc(CLINIC.logo)}" alt="Klinik" style="width:150px;object-fit:contain;"></div>
    <div style="display:flex;"><div style="text-align:right;font-size:12px;line-height:1.3;">${CLINIC.address.map(text => `<p>${esc(text)}</p>`).join('')}</div>
    <div class="icon-column" style="display:flex;flex-direction:column;align-items:center;justify-content:space-around;width:36px;border-radius:0 6px 6px 0;padding:8px 0;margin-left:5px;"><div>📍</div><div>☎️</div><div>✉️</div></div></div></div><hr>`;
}

export function buildRujukanHtml(employee, mcu, doctorName, now = new Date()) {
  const day = String(now.getDate()).padStart(2, '0');
  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Surat Rujukan - ${esc(employee.name)}</title><style>${STYLE}</style></head><body><div class="page">
${header()}
<h2>SURAT RUJUKAN</h2><div>
<p>Kepada Yth.</p><p>${esc(mcu.recipient)}</p><p>Di Tempat</p>
<p style="margin-top:8px;"><strong>Dengan Hormat,</strong></p><p>Mohon perawatan lebih lanjut pasien tersebut di bawah ini:</p>
<div style="margin-top:6px;"><p>Nama: ${line(400, employee.name)}</p><p>Umur: ${line(400, employee.age || '')}</p><p>Jenis Kelamin: ${line(360, employee.gender || '')}</p>
<p>Perusahaan/Jabatan: ${line(330, `${companyName(employee)} / ${employee.jobTitle || ''}`)}</p></div>
<div style="margin-top:8px;"><p><strong>Pemeriksaan Fisik:</strong></p>
<p style="margin-left:20px;">Tekanan Darah: ${line(70, mcu.bloodPressure || '')} mmHg &nbsp; RR: ${line(40, mcu.respiratoryRate || '')} /m</p>
<p style="margin-left:20px;">Nadi: ${line(60, mcu.pulse || '')} /m &nbsp; Suhu: ${line(60, mcu.temperature || '')} °C</p></div>
<div style="margin-top:8px;"><p>Keluhan Utama: ${line(350, mcu.keluhanUtama || '')}</p><p>Diagnosis Kerja: ${line(350, mcu.diagnosisKerja || '')}</p><p>Alasan dirujuk: ${line(350, mcu.alasanRujuk || '')}</p></div>
<div style="text-align:right;margin-top:12px;"><p>${esc(CLINIC.city)}, ${line(120, `${day} ${MONTHS[now.getMonth()]}`)} ${now.getFullYear()}</p><p>Dokter FAR PT. PST</p><div style="height:24px;"></div><p><strong>${esc(doctorName || CLINIC.doctorName)}</strong></p></div></div>
<hr style="margin:12px 0;">
<h2>SURAT RUJUKAN BALIK</h2><div><p>Yth. Rekan Sejawat,</p><p>Bersama ini kami kirim kembali pasien berikut:</p>
<div style="margin-top:6px;">${[['Nama', 400], ['Usia', 400], ['Diagnosa', 370], ['Terapi', 390], ['Saran', 390], ['Keterangan', 350], ['Kesimpulan', 350]].map(([label, width]) => `<p>${label}: ${line(width)}</p>`).join('')}</div>
<div style="text-align:right;margin-top:10px;"><p>${esc(CLINIC.city)}, ${line(100)} 20${line(25)}</p><div style="height:24px;"></div><p>(...........................................)</p></div></div>
<div style="border:1px solid #ccc;background-color:#fffacd;padding:8px;font-size:11px;margin-top:10px;line-height:1.3;"><strong>Perhatian:</strong> ${esc(WARNING)}</div>
</div></body></html>`;
}

export function openPrintWindow(html, win = globalThis.window) {
  const printWindow = win.open('', '_blank');
  if (!printWindow) throw new Error('Tidak dapat membuka jendela print. Pastikan pop-up tidak diblokir browser.');
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => { try { printWindow.focus(); printWindow.print(); } catch { /* jendela sudah ditutup */ } }, 300);
  setTimeout(() => { try { printWindow.close(); } catch { /* sudah ditutup */ } }, 2000);
}
