/* Aturan berkas MCU (dipindahkan dari mcuFilePolicy.mjs): PDF di bawah 10 MB, PNG/JPG maksimal 3 MB. */
const MB = 1024 * 1024;
export const PDF_MAX_BYTES = 10 * MB;
export const IMAGE_MAX_BYTES = 3 * MB;
const PDF = new Set(['pdf']);
const IMAGE = new Set(['png', 'jpg', 'jpeg']);

export const extensionOf = name => {
  const normalized = String(name || '').trim().toLowerCase();
  const dot = normalized.lastIndexOf('.');
  return dot > -1 ? normalized.slice(dot + 1) : '';
};

/* Mengembalikan { ok, kind } atau { ok:false, code, message }. */
export function checkMcuFile(file) {
  const extension = extensionOf(file?.name);
  const size = Number(file?.size);
  if (!PDF.has(extension) && !IMAGE.has(extension)) return { ok: false, code: 'FILE_TYPE_INVALID', message: 'File harus berupa PDF, PNG, JPG, atau JPEG.' };
  if (!Number.isFinite(size) || size <= 0) return { ok: false, code: 'FILE_EMPTY', message: 'File kosong tidak dapat diunggah.' };
  if (PDF.has(extension) && size >= PDF_MAX_BYTES) return { ok: false, code: 'PDF_TOO_LARGE', message: 'Ukuran PDF harus kurang dari 10 MB.' };
  if (IMAGE.has(extension) && size > IMAGE_MAX_BYTES) return { ok: false, code: 'IMAGE_TOO_LARGE', message: 'Ukuran PNG/JPG maksimal 3 MB.' };
  return { ok: true, kind: PDF.has(extension) ? 'pdf' : 'image' };
}
