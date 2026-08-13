const ERROR_PRESENTATIONS = Object.freeze({
  WORKFLOW_UNAUTHORIZED: {
    icon: 'warning', title: 'Sesi Berakhir', action: 'Masuk Kembali'
  },
  WORKFLOW_USER_INACTIVE: {
    icon: 'error', title: 'Akun Tidak Aktif', action: 'Tutup'
  },
  WORKFLOW_FORBIDDEN: {
    icon: 'error', title: 'Akses Ditolak', action: 'Tutup'
  },
  WORKFLOW_VERSION_CONFLICT: {
    icon: 'warning', title: 'Data Sudah Berubah', action: 'Muat Data Terbaru'
  },
  WORKFLOW_INVALID_TRANSITION: {
    icon: 'warning', title: 'Status Tidak Sesuai', action: 'Muat Data Terbaru'
  },
  WORKFLOW_VALIDATION_FAILED: {
    icon: 'warning', title: 'Data Belum Lengkap', action: 'Periksa Form'
  },
  WORKFLOW_LOCKED: {
    icon: 'info', title: 'Sedang Direview', action: 'Lihat Saja'
  },
  WORKFLOW_NETWORK_ERROR: {
    icon: 'error', title: 'Koneksi Terputus', action: 'Coba Lagi'
  },
  WORKFLOW_DOCUMENT_FAILED: {
    icon: 'warning', title: 'Surat Belum Dibuat', action: 'Coba Lagi'
  },
  WORKFLOW_WHATSAPP_FAILED: {
    icon: 'warning', title: 'WhatsApp Tidak Terbuka', action: 'Coba Lagi'
  },
  WORKFLOW_FEATURE_DISABLED: {
    icon: 'info', title: 'Fitur Belum Aktif', action: 'Tutup'
  },
  WORKFLOW_NOT_FOUND: {
    icon: 'error', title: 'Data Tidak Ditemukan', action: 'Tutup'
  },
  WORKFLOW_INTERNAL_ERROR: {
    icon: 'error', title: 'Kesalahan Server', action: 'Tutup'
  }
});

const UPLOAD_ERROR_PRESENTATIONS = Object.freeze({
  UPLOAD_UNAUTHORIZED: { icon: 'warning', title: 'Sesi Berakhir' },
  UPLOAD_URL_EXPIRED: { icon: 'warning', title: 'Waktu Upload Habis' },
  UPLOAD_URL_REJECTED: { icon: 'error', title: 'Izin Upload Ditolak' },
  UPLOAD_NETWORK_ERROR: { icon: 'error', title: 'Koneksi Terputus' },
  UPLOAD_CANCELLED: { icon: 'info', title: 'Upload Dibatalkan' },
  UPLOAD_SIZE_INVALID: { icon: 'warning', title: 'Ukuran File Tidak Sesuai' },
  UPLOAD_PDF_INVALID: { icon: 'error', title: 'PDF Tidak Valid' },
  UPLOAD_FORBIDDEN: { icon: 'error', title: 'Upload Ditolak' },
  UPLOAD_METADATA_FAILED: { icon: 'error', title: 'Data File Belum Tersimpan' },
  UPLOAD_VERIFICATION_FAILED: { icon: 'error', title: 'Verifikasi Upload Gagal' },
  UPLOAD_R2_FAILED: { icon: 'error', title: 'Penyimpanan Tidak Merespons' },
  UPLOAD_API_FAILED: { icon: 'error', title: 'Layanan Upload Gagal' },
  UPLOAD_SERVER_ERROR: { icon: 'error', title: 'Kesalahan Server' }
});

let assetPromise;

function assetPath(file) {
  const prefix = window.location.pathname.includes('/pages/') ? '../' : './';
  return `${prefix}assets/vendor/sweetalert2/${file}`;
}

export function ensureWorkflowAlerts() {
  if (window.Swal) return Promise.resolve(window.Swal);
  if (assetPromise) return assetPromise;

  assetPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-workflow-alerts]')) {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = assetPath('sweetalert2.min.css');
      style.dataset.workflowAlerts = 'true';
      document.head.appendChild(style);
    }
    const script = document.createElement('script');
    script.src = assetPath('sweetalert2.all.min.js');
    script.dataset.workflowAlerts = 'true';
    script.onload = () => resolve(window.Swal);
    script.onerror = () => reject(new Error('UI peringatan gagal dimuat.'));
    document.head.appendChild(script);
  });
  return assetPromise;
}

export async function presentWorkflowError(error, handlers = {}) {
  const Swal = await ensureWorkflowAlerts();
  const presentation = {
    ...(ERROR_PRESENTATIONS[error?.code] || ERROR_PRESENTATIONS.WORKFLOW_INTERNAL_ERROR),
    ...(handlers.presentation || {})
  };
  const requestText = error?.requestId ? `\n\nID: ${error.requestId}` : '';
  const detail = error?.code === 'WORKFLOW_LOCKED' && error?.details?.claimExpiresAt
    ? `\nKunci berakhir: ${new Date(error.details.claimExpiresAt).toLocaleString('id-ID')}`
    : '';

  const result = await Swal.fire({
    icon: presentation.icon,
    title: presentation.title,
    text: `${error?.message || 'Terjadi kesalahan.'}${detail}${requestText}`,
    confirmButtonText: presentation.action,
    showCancelButton: Boolean(handlers.cancelText),
    cancelButtonText: handlers.cancelText || 'Batal',
    allowOutsideClick: false,
    focusConfirm: true
  });

  if (!result.isConfirmed) return result;
  if (error?.code === 'WORKFLOW_UNAUTHORIZED') {
    window.location.href = window.location.pathname.includes('/pages/')
      ? 'login.html'
      : 'pages/login.html';
    return result;
  }
  if (['WORKFLOW_VERSION_CONFLICT', 'WORKFLOW_INVALID_TRANSITION'].includes(error?.code)) {
    await handlers.reload?.();
  } else if (['WORKFLOW_NETWORK_ERROR', 'WORKFLOW_DOCUMENT_FAILED', 'WORKFLOW_WHATSAPP_FAILED'].includes(error?.code)) {
    await handlers.retry?.();
  } else if (error?.code === 'WORKFLOW_LOCKED') {
    await handlers.readOnly?.(error.details || {});
  }
  return result;
}

export async function presentUploadError(error) {
  const Swal = await ensureWorkflowAlerts();
  const presentation = UPLOAD_ERROR_PRESENTATIONS[error?.code]
    || { icon: 'error', title: 'Upload Gagal' };
  return Swal.fire({
    icon: presentation.icon,
    title: presentation.title,
    text: error?.message || 'File belum berhasil diunggah. Silakan coba lagi.',
    confirmButtonText: 'Tutup',
    allowOutsideClick: false
  });
}

export { ERROR_PRESENTATIONS, UPLOAD_ERROR_PRESENTATIONS };
