/**
 * MCU file upload endpoint.
 *
 * JSON requests prepare, confirm, and roll back direct MCU uploads to R2.
 * Multipart remains available only for cached clients from older releases.
 */

const busboy = require('busboy');
const { randomUUID } = require('crypto');
const { uploadFileToStorage, MAX_FILE_SIZE } = require('../../server/r2StorageService');
const { R2DirectUploadService, R2DirectUploadError } = require('../../server/r2DirectUploadService');
const { setCorsHeaders, requireAuth } = require('../../server/auth-utils');

function authenticatedUserId(auth) {
  return auth?.app_user_id || auth?.sub || auth?.userId || null;
}

const CONTENT_TYPE_BY_EXTENSION = Object.freeze({
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg'
});

function normalizeMultipartFile(fileName) {
  const normalized = String(fileName || '')
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 180);
  const extension = normalized.toLowerCase().split('.').pop();
  const contentType = CONTENT_TYPE_BY_EXTENSION[extension];
  if (!normalized || !contentType) return null;
  return { fileName: normalized, contentType };
}

function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8'));
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);
  return {};
}

function normalizePrepareContext(body) {
  const staleContext = body.employeeId
    && typeof body.employeeId === 'object'
    && !Array.isArray(body.employeeId)
    ? body.employeeId
    : null;
  return {
    employeeId: staleContext?.employeeId ?? body.employeeId,
    mcuId: staleContext?.mcuId ?? body.mcuId
  };
}

function hasStaleMultipartContext(fields) {
  return fields?.employeeId === '[object Object]';
}

async function handleDirectUpload(req, res, auth, directUploads) {
  const requestId = req.headers?.['x-request-id'] || randomUUID();
  let body;
  try {
    body = parseJsonBody(req);
  } catch {
    return res.status(400).json({
      success: false,
      code: 'UPLOAD_VALIDATION_FAILED',
      error: 'Payload JSON tidak valid.',
      requestId
    });
  }

  const userId = authenticatedUserId(auth);
  if (!userId) {
    return res.status(401).json({ success: false, code: 'UNAUTHORIZED', error: 'Unauthorized', requestId });
  }

  try {
    if (['prepare-file-upload', 'prepare-pdf-upload'].includes(body.action)) {
      const context = normalizePrepareContext(body);
      const prepare = body.action === 'prepare-file-upload'
        ? directUploads.prepareFileUpload?.bind(directUploads)
        : (directUploads.prepareFileUpload || directUploads.preparePdfUpload)?.bind(directUploads);
      if (!prepare) throw new Error('Direct upload preparation is unavailable.');
      const prepared = await prepare({
        userId,
        employeeId: context.employeeId,
        mcuId: context.mcuId,
        fileName: body.fileName,
        contentType: body.contentType,
        contentLength: body.contentLength
      });
      return res.status(200).json({ success: true, upload: prepared });
    }

    if (['confirm-file-upload', 'confirm-pdf-upload'].includes(body.action)) {
      const confirm = body.action === 'confirm-file-upload'
        ? directUploads.confirmFileUpload?.bind(directUploads)
        : (directUploads.confirmFileUpload || directUploads.confirmPdfUpload)?.bind(directUploads);
      if (!confirm) throw new Error('Direct upload confirmation is unavailable.');
      const confirmed = await confirm({
        userId,
        objectKey: body.objectKey,
        fileName: body.fileName
      });
      return res.status(200).json({
        success: true,
        ...confirmed,
        message: 'File uploaded successfully to Cloudflare R2'
      });
    }

    if (body.action === 'rollback-file-upload') {
      const rolledBack = await directUploads.rollbackFileUpload({
        userId,
        employeeId: body.employeeId,
        mcuId: body.mcuId,
        fileId: body.fileId
      });
      return res.status(200).json({ success: true, ...rolledBack });
    }

    return res.status(400).json({
      success: false,
      code: 'UPLOAD_ACTION_INVALID',
      error: 'Aksi upload tidak valid.',
      requestId
    });
  } catch (error) {
    const known = error instanceof R2DirectUploadError;
    console.error('MCU upload request failed', {
      requestId,
      action: body.action,
      code: known ? error.code : 'UPLOAD_SERVER_ERROR'
    });
    return res.status(known ? error.status : 500).json({
      success: false,
      code: known ? error.code : 'UPLOAD_SERVER_ERROR',
      error: known ? error.message : 'Kesalahan server saat memproses upload.',
      requestId
    });
  }
}

function handleMultipart(req, res, auth) {
  try {
    const bb = busboy({ headers: req.headers });
    let file = null;
    const fields = {};
    let completed = false;
    let errorOccurred = false;

    return new Promise((resolve) => {
      const respond = (status, payload) => {
        if (completed) return resolve();
        completed = true;
        res.status(status).json(payload);
        return resolve();
      };

      bb.on('file', (fieldName, fileStream, info) => {
        if (errorOccurred) {
          fileStream.resume();
          return;
        }

        const normalizedFile = normalizeMultipartFile(info.filename);
        if (!normalizedFile) {
          errorOccurred = true;
          fileStream.resume();
          respond(400, { error: 'Format file tidak didukung. Gunakan PDF, PNG, JPG, atau JPEG.' });
          return;
        }

        let size = 0;
        const chunks = [];
        fileStream.on('data', (data) => {
          size += data.length;
          if (size > MAX_FILE_SIZE) {
            errorOccurred = true;
            fileStream.resume();
            respond(413, { error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` });
            return;
          }
          chunks.push(data);
        });
        fileStream.on('end', () => {
          if (!errorOccurred) {
            file = {
              filename: normalizedFile.fileName,
              mimeType: normalizedFile.contentType,
              buffer: Buffer.concat(chunks),
              size
            };
          }
        });
        fileStream.on('error', () => {
          errorOccurred = true;
          respond(400, { error: 'File stream error.' });
        });
      });

      bb.on('field', (fieldName, value) => {
        fields[fieldName] = value;
      });

      bb.on('close', async () => {
        if (completed || errorOccurred) return;
        const { employeeId, mcuId } = fields;
        if (!employeeId || !mcuId) {
          respond(400, { error: 'Missing required fields: employeeId, mcuId' });
          return;
        }
        if (hasStaleMultipartContext(fields)) {
          respond(409, {
            success: false,
            code: 'UPLOAD_CLIENT_STALE',
            error: 'Halaman upload masih memakai modul lama. Muat ulang halaman sekali, lalu coba kembali.'
          });
          return;
        }
        if (!file) {
          respond(400, { error: 'No file provided' });
          return;
        }

        try {
          const uploadResult = await uploadFileToStorage(
            file.buffer,
            file.filename,
            employeeId,
            mcuId,
            file.mimeType,
            authenticatedUserId(auth) || 'system'
          );
          respond(200, {
            success: true,
            file: {
              name: uploadResult.fileName,
              size: uploadResult.fileSize,
              type: uploadResult.fileType
            },
            storage: {
              bucket: 'mcu-files',
              path: uploadResult.storagePath,
              publicUrl: uploadResult.publicUrl
            },
            message: 'File uploaded successfully to Cloudflare R2'
          });
        } catch (error) {
          respond(500, { error: error.message || 'Internal server error' });
        }
      });

      bb.on('error', () => {
        errorOccurred = true;
        respond(400, { error: 'Form parsing error.' });
      });

      req.pipe(bb);
    });
  } catch {
    return res.status(400).json({ error: 'Form parsing error.' });
  }
}

function createHandler(options = {}) {
  const authenticate = options.requireAuth || requireAuth;
  const cors = options.setCorsHeaders || setCorsHeaders;
  let directUploads = options.directUploads || null;

  return async (req, res) => {
    cors(req, res, 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const auth = authenticate(req, res);
    if (!auth) return;

    const contentType = String(req.headers?.['content-type'] || '').toLowerCase();
    if (contentType.includes('application/json')) {
      directUploads ||= new R2DirectUploadService();
      return handleDirectUpload(req, res, auth, directUploads);
    }
    return handleMultipart(req, res, auth);
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.parseJsonBody = parseJsonBody;
module.exports.normalizeMultipartFile = normalizeMultipartFile;
module.exports.hasStaleMultipartContext = hasStaleMultipartContext;
