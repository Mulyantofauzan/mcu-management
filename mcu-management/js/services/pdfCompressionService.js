import {
  PDF_ERROR_CODES,
  PDF_SOURCE_MAX_BYTES,
  PDF_UPLOAD_LIMIT_BYTES,
  getPdfSizePolicy
} from './pdfCompressionPolicy.mjs';

const PHASE_RANGES = Object.freeze({
  analyzing: [2, 5],
  adaptive: [5, 35],
  'tight-adaptive': [35, 60],
  'full-raster': [60, 90],
  validating: [90, 98]
});
const PDF_PROCESSING_TIMEOUT_MS = 2 * 60 * 1000;

export class PdfCompressionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PdfCompressionError';
    this.code = code;
  }
}

function progressFor(message) {
  const [start, end] = PHASE_RANGES[message.phase] || [0, 1];
  if (!message.totalPages) return start;
  const fraction = Math.min(1, Math.max(0, message.page / message.totalPages));
  return Math.round(start + (end - start) * fraction);
}

function phaseMessage(message) {
  if (message.phase === 'analyzing') return 'Menganalisis PDF...';
  if (message.phase === 'tight-adaptive') {
    return `Mengoptimalkan ulang halaman ${message.page} dari ${message.totalPages}...`;
  }
  if (message.phase === 'full-raster') {
    return `Menjalankan kompresi lanjutan halaman ${message.page} dari ${message.totalPages}...`;
  }
  if (message.phase === 'validating') return 'Memvalidasi hasil PDF...';
  return `Mengoptimalkan halaman ${message.page} dari ${message.totalPages}...`;
}

function assertPdfFile(file) {
  const fileName = String(file?.name || '');
  if (!(file instanceof File)
    || !fileName.toLowerCase().endsWith('.pdf')) {
    throw new PdfCompressionError(
      PDF_ERROR_CODES.INVALID_TYPE,
      'File harus berupa PDF.'
    );
  }
  const policy = getPdfSizePolicy(file.size);
  if (policy === 'reject') {
    throw new PdfCompressionError(
      PDF_ERROR_CODES.SOURCE_TOO_LARGE,
      `Ukuran PDF maksimal ${PDF_SOURCE_MAX_BYTES / 1024 / 1024} MB.`
    );
  }
  if (policy === 'invalid') {
    throw new PdfCompressionError(PDF_ERROR_CODES.CORRUPT, 'PDF kosong atau tidak valid.');
  }
  return policy;
}

function originalUploadResult(file, onProgress, method = 'passthrough') {
  onProgress?.({
    percent: 100,
    message: method === 'compression-fallback'
      ? `Kompresi tidak berhasil; file asli ${formatBytes(file.size)} siap diunggah.`
      : `PDF siap diunggah: ${formatBytes(file.size)}.`,
    phase: 'complete'
  });
  return {
    file,
    originalSize: file.size,
    finalSize: file.size,
    compressed: false,
    method,
    pageCount: null
  };
}

export async function preparePdfForUpload(file, { onProgress, signal } = {}) {
  const policy = assertPdfFile(file);
  if (policy === 'passthrough') {
    return originalUploadResult(file, onProgress);
  }
  if (typeof Worker === 'undefined') {
    if (file.size < PDF_UPLOAD_LIMIT_BYTES) {
      return originalUploadResult(file, onProgress, 'compression-fallback');
    }
    throw new PdfCompressionError(
      PDF_ERROR_CODES.WORKER_UNAVAILABLE,
      'Browser tidak mendukung pemrosesan PDF aman.'
    );
  }

  onProgress?.({ percent: 1, message: 'Menyiapkan pemrosesan PDF...', phase: 'starting' });
  const sourceBuffer = await file.arrayBuffer();
  let worker;
  try {
    worker = new Worker(
      new URL('../workers/pdfCompressionWorker.mjs', import.meta.url),
      { type: 'module', name: 'madis-pdf-compression' }
    );
  } catch {
    if (file.size < PDF_UPLOAD_LIMIT_BYTES) {
      return originalUploadResult(file, onProgress, 'compression-fallback');
    }
    throw new PdfCompressionError(
      PDF_ERROR_CODES.WORKER_UNAVAILABLE,
      'Browser tidak dapat menjalankan pemrosesan PDF.'
    );
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', cancel);
      worker.terminate();
      callback();
    };
    const cancel = () => finish(() => reject(new PdfCompressionError(
      PDF_ERROR_CODES.CANCELLED,
      'Pemrosesan PDF dibatalkan.'
    )));
    const settleCompressionError = (error) => {
      if (file.size < PDF_UPLOAD_LIMIT_BYTES && error?.code !== PDF_ERROR_CODES.CANCELLED) {
        finish(() => resolve(originalUploadResult(file, onProgress, 'compression-fallback')));
        return;
      }
      finish(() => reject(error));
    };
    const timeoutId = setTimeout(() => settleCompressionError(new PdfCompressionError(
      PDF_ERROR_CODES.PROCESSING_TIMEOUT,
      'Pemrosesan PDF melebihi 2 menit.'
    )), PDF_PROCESSING_TIMEOUT_MS);

    if (signal?.aborted) {
      cancel();
      return;
    }
    signal?.addEventListener('abort', cancel, { once: true });

    worker.addEventListener('message', (event) => {
      const message = event.data || {};
      if (message.type === 'progress') {
        onProgress?.({
          percent: progressFor(message),
          message: phaseMessage(message),
          phase: message.phase,
          page: message.page,
          totalPages: message.totalPages
        });
        return;
      }
      if (message.type === 'error') {
        settleCompressionError(new PdfCompressionError(
          message.code || PDF_ERROR_CODES.PROCESSING_FAILED,
          message.message || 'PDF gagal diproses.'
        ));
        return;
      }
      if (message.type === 'complete') {
        const prepared = new File([message.buffer], file.name, {
          type: 'application/pdf',
          lastModified: file.lastModified
        });
        onProgress?.({
          percent: 100,
          message: message.compressed
            ? `Selesai: ${formatBytes(file.size)} menjadi ${formatBytes(prepared.size)}.`
            : `PDF siap diunggah: ${formatBytes(prepared.size)}.`,
          phase: 'complete'
        });
        finish(() => resolve({
          file: prepared,
          originalSize: file.size,
          finalSize: prepared.size,
          compressed: Boolean(message.compressed),
          method: message.method,
          pageCount: message.pageCount
        }));
      }
    });

    worker.addEventListener('error', () => settleCompressionError(new PdfCompressionError(
      PDF_ERROR_CODES.PROCESSING_FAILED,
      'Worker pemrosesan PDF gagal dimuat.'
    )));

    try {
      worker.postMessage({
        action: 'prepare',
        fileName: file.name,
        buffer: sourceBuffer
      });
    } catch {
      settleCompressionError(new PdfCompressionError(
        PDF_ERROR_CODES.PROCESSING_FAILED,
        'PDF gagal dikirim ke proses kompresi.'
      ));
    }
  });
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function getPdfErrorPresentation(error) {
  const presentations = {
    [PDF_ERROR_CODES.CANCELLED]: ['Proses Dibatalkan', 'PDF tidak ditambahkan ke antrian.'],
    [PDF_ERROR_CODES.CORRUPT]: ['PDF Tidak Dapat Dibaca', 'Pilih PDF lain yang tidak rusak.'],
    [PDF_ERROR_CODES.ENCRYPTED]: ['PDF Terkunci', 'Hapus kata sandi PDF sebelum mengunggahnya.'],
    [PDF_ERROR_CODES.INVALID_TYPE]: ['Format Tidak Sesuai', 'File harus berupa PDF.'],
    [PDF_ERROR_CODES.SOURCE_TOO_LARGE]: ['PDF Terlalu Besar', 'Ukuran awal PDF maksimal 25 MB.'],
    [PDF_ERROR_CODES.RESULT_TOO_LARGE]: ['Hasil Masih Terlalu Besar', 'PDF berukuran 10 MB atau lebih dan tidak dapat diperkecil.'],
    [PDF_ERROR_CODES.WORKER_UNAVAILABLE]: ['Browser Tidak Mendukung', 'Perbarui browser sebelum memproses PDF ini.'],
    [PDF_ERROR_CODES.PROCESSING_TIMEOUT]: ['Pemrosesan Terlalu Lama', 'Coba lagi atau pilih PDF lain.'],
    [PDF_ERROR_CODES.PROCESSING_FAILED]: ['Kompresi Gagal', 'PDF berukuran 10 MB atau lebih dan tidak dapat diproses.']
  };
  const [title, fallback] = presentations[error?.code]
    || presentations[PDF_ERROR_CODES.PROCESSING_FAILED];
  return { title, message: error?.message || fallback };
}
