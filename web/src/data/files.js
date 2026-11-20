/* Unggah dokumen MCU ke R2 lewat /api/mcu-file-upload: prepare -> PUT ke URL bertanda tangan -> confirm. */
import { getAccessToken } from '../lib/session.js';

const authHeaders = (extra = {}) => {
  const token = getAccessToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
};

async function postAction(payload, fetcher = globalThis.fetch) {
  const response = await fetcher('/api/mcu-file-upload', { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(payload) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    const error = new Error(result.error || `Upload API gagal (HTTP ${response.status}).`);
    error.code = result.code || (response.status === 401 ? 'UPLOAD_UNAUTHORIZED' : 'UPLOAD_API_FAILED');
    throw error;
  }
  return result;
}

function putToSignedUrl(file, upload, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', upload.uploadUrl);
    Object.entries(upload.requiredHeaders || {}).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    xhr.upload?.addEventListener('progress', event => event.lengthComputable && onProgress?.(event.loaded, event.total));
    const fail = (message, code, status) => { const error = new Error(message); error.code = code; error.status = status; reject(error); };
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      const expired = /ExpiredRequest|request has expired/i.test(xhr.responseText || '');
      fail(`Upload ke R2 gagal (HTTP ${xhr.status}).`, expired ? 'UPLOAD_URL_EXPIRED' : [401, 403].includes(xhr.status) ? 'UPLOAD_URL_REJECTED' : 'UPLOAD_R2_FAILED', xhr.status);
    });
    xhr.addEventListener('error', () => fail('Koneksi terputus saat mengunggah file.', 'UPLOAD_NETWORK_ERROR'));
    xhr.addEventListener('abort', () => fail('Upload file dibatalkan.', 'UPLOAD_CANCELLED'));
    xhr.send(file);
  });
}

/* Dependensi bisa diganti saat diuji. */
export function createUploader({ post = postAction, put = putToSignedUrl } = {}) {
  async function uploadOne(file, context, onProgress) {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const prepared = await post({ action: 'prepare-file-upload', employeeId: context.employeeId, mcuId: context.mcuId, fileName: file.name, contentLength: file.size });
      try {
        await put(file, prepared.upload, onProgress);
        const confirmed = await post({ action: 'confirm-file-upload', objectKey: prepared.upload.objectKey, fileName: file.name });
        return { success: true, fileId: confirmed.file.id, fileName: confirmed.file.name, size: confirmed.file.size };
      } catch (error) {
        lastError = error;
        if (!['UPLOAD_NETWORK_ERROR', 'UPLOAD_URL_EXPIRED'].includes(error.code) || attempt === 1) throw error;
      }
    }
    throw lastError;
  }

  async function rollback(results, context) {
    const uploaded = results.filter(result => result?.success && result.fileId);
    const errors = [];
    for (const result of uploaded) {
      try { await post({ action: 'rollback-file-upload', employeeId: context.employeeId, mcuId: context.mcuId, fileId: result.fileId }); }
      catch (error) { errors.push(error); }
    }
    return { success: errors.length === 0, deletedCount: uploaded.length - errors.length, error: errors[0]?.message };
  }

  /* Semua atau tidak sama sekali: bila satu gagal, yang sudah naik dibatalkan. */
  async function uploadAll(files, context, onProgress) {
    const results = [];
    for (let index = 0; index < files.length; index += 1) {
      try {
        results.push(await uploadOne(files[index], context, (loaded, total) => onProgress?.({ index, count: files.length, percent: Math.round((loaded / total) * 100) })));
        onProgress?.({ index, count: files.length, percent: 100 });
      } catch (error) {
        results.push({ success: false, fileIndex: index, fileName: files[index].name, error: error.message, code: error.code || 'UPLOAD_API_FAILED' });
        const cleaned = await rollback(results, context);
        const message = cleaned.success ? error.message : `${error.message} Pembersihan file juga gagal.`;
        return { success: false, error: message, code: cleaned.success ? error.code : 'UPLOAD_ROLLBACK_FAILED', results };
      }
    }
    return { success: true, results };
  }
  return { uploadOne, uploadAll, rollback };
}

const uploader = createUploader();
export const uploadAll = uploader.uploadAll;
export const rollbackUploads = uploader.rollback;

export async function deleteFile(fileId) {
  const response = await fetch(`/api/delete-file?fileId=${encodeURIComponent(fileId)}`, { method: 'DELETE', headers: authHeaders({ 'Content-Type': 'application/json' }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) throw new Error(result.error || `Hapus file gagal (HTTP ${response.status}).`);
  return true;
}
