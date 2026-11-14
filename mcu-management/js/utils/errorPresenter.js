import { ensureAppAlerts } from './uiHelpers.js';

const ERROR_PRESENTATIONS = Object.freeze({
  UNAUTHORIZED: { icon: 'warning', title: 'Sesi Berakhir', action: 'Masuk Kembali' },
  FORBIDDEN: { icon: 'error', title: 'Akses Ditolak', action: 'Tutup' },
  VALIDATION_FAILED: { icon: 'warning', title: 'Data Belum Lengkap', action: 'Periksa Form' },
  NETWORK_ERROR: { icon: 'error', title: 'Koneksi Terputus', action: 'Coba Lagi' },
  NOT_FOUND: { icon: 'error', title: 'Data Tidak Ditemukan', action: 'Tutup' },
  INTERNAL_ERROR: { icon: 'error', title: 'Kesalahan Server', action: 'Tutup' }
});

const UPLOAD_ERROR_PRESENTATIONS = Object.freeze({
  UPLOAD_UNAUTHORIZED: { icon: 'warning', title: 'Sesi Berakhir' },
  UPLOAD_CLIENT_STALE: { icon: 'warning', title: 'Halaman Perlu Dimuat Ulang' },
  UPLOAD_CONTEXT_INVALID: { icon: 'warning', title: 'Data Karyawan Tidak Valid' },
  UPLOAD_TYPE_INVALID: { icon: 'warning', title: 'File Tidak Didukung' },
  UPLOAD_EMPLOYEE_NOT_FOUND: { icon: 'error', title: 'Karyawan Tidak Ditemukan' },
  UPLOAD_EMPLOYEE_LOOKUP_FAILED: { icon: 'error', title: 'Data Karyawan Gagal Diverifikasi' },
  UPLOAD_URL_EXPIRED: { icon: 'warning', title: 'Waktu Upload Habis' },
  UPLOAD_URL_REJECTED: { icon: 'error', title: 'Izin Upload Ditolak' },
  UPLOAD_NETWORK_ERROR: { icon: 'error', title: 'Koneksi Terputus' },
  UPLOAD_CANCELLED: { icon: 'info', title: 'Upload Dibatalkan' },
  UPLOAD_SIZE_INVALID: { icon: 'warning', title: 'Ukuran File Tidak Sesuai' },
  UPLOAD_PDF_INVALID: { icon: 'error', title: 'PDF Tidak Valid' },
  UPLOAD_KEY_INVALID: { icon: 'warning', title: 'Sesi Upload Kedaluwarsa' },
  UPLOAD_FORBIDDEN: { icon: 'error', title: 'Upload Ditolak' },
  UPLOAD_METADATA_FAILED: { icon: 'error', title: 'Data File Belum Tersimpan' },
  UPLOAD_VERIFICATION_FAILED: { icon: 'error', title: 'Verifikasi Upload Gagal' },
  UPLOAD_R2_FAILED: { icon: 'error', title: 'Penyimpanan Tidak Merespons' },
  UPLOAD_API_FAILED: { icon: 'error', title: 'Layanan Upload Gagal' },
  UPLOAD_ROLLBACK_FAILED: { icon: 'error', title: 'Penyimpanan MCU Gagal' },
  UPLOAD_SERVER_ERROR: { icon: 'error', title: 'Kesalahan Server' }
});

export const ensureAlerts = ensureAppAlerts;

/** Show a recoverable error dialog. `handlers.retry` runs after a network error. */
export async function presentError(error, handlers = {}) {
  const Swal = await ensureAlerts();
  const presentation = {
    ...(ERROR_PRESENTATIONS[error?.code] || ERROR_PRESENTATIONS.INTERNAL_ERROR),
    ...(handlers.presentation || {})
  };
  const requestText = error?.requestId ? `\n\nID: ${error.requestId}` : '';

  const result = await Swal.fire({
    icon: presentation.icon,
    title: presentation.title,
    text: `${error?.message || 'Terjadi kesalahan.'}${requestText}`,
    confirmButtonText: presentation.action,
    showCancelButton: Boolean(handlers.cancelText),
    cancelButtonText: handlers.cancelText || 'Batal',
    allowOutsideClick: false,
    focusConfirm: true
  });

  if (!result.isConfirmed) return result;
  if (error?.code === 'UNAUTHORIZED') {
    window.location.href = window.location.pathname.includes('/pages/')
      ? 'login.html'
      : 'pages/login.html';
  } else if (error?.code === 'NETWORK_ERROR') {
    await handlers.retry?.();
  }
  return result;
}

export async function presentUploadError(error) {
  const Swal = await ensureAlerts();
  const presentation = UPLOAD_ERROR_PRESENTATIONS[error?.code]
    || { icon: 'error', title: 'Upload Gagal' };
  return Swal.fire({
    icon: presentation.icon,
    title: presentation.title,
    text: `${error?.message || 'File belum berhasil diunggah. Silakan coba lagi.'}${error?.requestId ? `\n\nID: ${error.requestId}` : ''}`,
    confirmButtonText: 'Tutup',
    allowOutsideClick: false
  });
}


export { ERROR_PRESENTATIONS, UPLOAD_ERROR_PRESENTATIONS };
