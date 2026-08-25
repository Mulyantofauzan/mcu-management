const MB = 1024 * 1024;

export const PDF_MAX_BYTES = 10 * MB;
export const IMAGE_MAX_BYTES = 3 * MB;

const PDF_EXTENSIONS = new Set(['pdf']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg']);

export class McuFileValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'McuFileValidationError';
    this.code = code;
  }
}

function extensionOf(fileName) {
  const normalized = String(fileName || '').trim().toLowerCase();
  const dot = normalized.lastIndexOf('.');
  return dot > -1 ? normalized.slice(dot + 1) : '';
}

export function validateMcuFile(file) {
  const extension = extensionOf(file?.name);
  const size = Number(file?.size);

  if (!PDF_EXTENSIONS.has(extension) && !IMAGE_EXTENSIONS.has(extension)) {
    throw new McuFileValidationError(
      'FILE_TYPE_INVALID',
      'File harus berupa PDF, PNG, JPG, atau JPEG.'
    );
  }
  if (!Number.isFinite(size) || size <= 0) {
    throw new McuFileValidationError('FILE_EMPTY', 'File kosong tidak dapat diunggah.');
  }
  if (PDF_EXTENSIONS.has(extension) && size >= PDF_MAX_BYTES) {
    throw new McuFileValidationError('PDF_TOO_LARGE', 'Ukuran PDF harus kurang dari 10 MB.');
  }
  if (IMAGE_EXTENSIONS.has(extension) && size > IMAGE_MAX_BYTES) {
    throw new McuFileValidationError('IMAGE_TOO_LARGE', 'Ukuran PNG/JPG maksimal 3 MB.');
  }

  return {
    file,
    kind: PDF_EXTENSIONS.has(extension) ? 'pdf' : 'image'
  };
}
