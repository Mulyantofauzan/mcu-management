import {
  PDF_ERROR_CODES,
  PDF_SOURCE_MAX_BYTES,
  getPdfSizePolicy,
  hasPdfHeader
} from './pdfCompressionPolicy.mjs';

const PHASE_RANGES = Object.freeze({
  analyzing: [2, 5],
  adaptive: [5, 35],
  'tight-adaptive': [35, 60],
  'full-raster': [60, 90],
  validating: [90, 98]
});

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
  const mimeType = String(file?.type || '').toLowerCase();
  if (!(file instanceof File)
    || !fileName.toLowerCase().endsWith('.pdf')
    || (mimeType && mimeType !== 'application/pdf')) {
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
}

export async function preparePdfForUpload(file, { onProgress, signal } = {}) {
  assertPdfFile(file);
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (!hasPdfHeader(header)) {
    throw new PdfCompressionError(
      PDF_ERROR_CODES.CORRUPT,
      'File tidak memiliki struktur PDF yang valid.'
    );
  }
  if (typeof Worker === 'undefined') {
    throw new PdfCompressionError(
      PDF_ERROR_CODES.WORKER_UNAVAILABLE,
      'Browser tidak mendukung pemrosesan PDF aman.'
    );
  }

  onProgress?.({ percent: 1, message: 'Menyiapkan pemrosesan PDF...', phase: 'starting' });
  const sourceBuffer = await file.arrayBuffer();
  const worker = new Worker(
    new URL('../workers/pdfCompressionWorker.mjs', import.meta.url),
    { type: 'module', name: 'madis-pdf-compression' }
  );

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', cancel);
      worker.terminate();
      callback();
    };
    const cancel = () => finish(() => reject(new PdfCompressionError(
      PDF_ERROR_CODES.CANCELLED,
      'Pemrosesan PDF dibatalkan.'
    )));

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
        finish(() => reject(new PdfCompressionError(
          message.code || PDF_ERROR_CODES.PROCESSING_FAILED,
          message.message || 'PDF gagal diproses.'
        )));
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

    worker.addEventListener('error', () => finish(() => reject(new PdfCompressionError(
      PDF_ERROR_CODES.PROCESSING_FAILED,
      'Worker pemrosesan PDF gagal dimuat.'
    ))));

    worker.postMessage({
      action: 'prepare',
      fileName: file.name,
      buffer: sourceBuffer
    }, [sourceBuffer]);
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
    [PDF_ERROR_CODES.RESULT_TOO_LARGE]: ['Hasil Masih Terlalu Besar', 'PDF tetap melebihi 5 MB pada batas kualitas yang aman.'],
    [PDF_ERROR_CODES.WORKER_UNAVAILABLE]: ['Browser Tidak Mendukung', 'Perbarui browser sebelum memproses PDF ini.'],
    [PDF_ERROR_CODES.PROCESSING_FAILED]: ['Kompresi Gagal', 'PDF tidak berubah dan tidak diunggah. Silakan coba lagi.']
  };
  const [title, fallback] = presentations[error?.code]
    || presentations[PDF_ERROR_CODES.PROCESSING_FAILED];
  return { title, message: error?.message || fallback };
}
