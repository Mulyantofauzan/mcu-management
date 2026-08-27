const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { randomUUID } = require('crypto');
const {
  saveFileMetadata,
  generatePublicUrl,
  employeeExists,
  findFileMetadata,
  deleteFileMetadata
} = require('./r2StorageService');

const PDF_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
const IMAGE_UPLOAD_LIMIT_BYTES = 3 * 1024 * 1024;
const UPLOAD_URL_EXPIRY_SECONDS = 5 * 60;
const FILE_RULES = Object.freeze({
  pdf: Object.freeze({ contentType: 'application/pdf', maxBytes: PDF_UPLOAD_LIMIT_BYTES, inclusive: false, type: 'pdf' }),
  png: Object.freeze({ contentType: 'image/png', maxBytes: IMAGE_UPLOAD_LIMIT_BYTES, inclusive: true, type: 'image' }),
  jpg: Object.freeze({ contentType: 'image/jpeg', maxBytes: IMAGE_UPLOAD_LIMIT_BYTES, inclusive: true, type: 'image' }),
  jpeg: Object.freeze({ contentType: 'image/jpeg', maxBytes: IMAGE_UPLOAD_LIMIT_BYTES, inclusive: true, type: 'image' })
});

class R2DirectUploadError extends Error {
  constructor(code, message, status = 400, cause = null) {
    super(message);
    this.name = 'R2DirectUploadError';
    this.code = code;
    this.status = status;
    this.cause = cause;
  }
}

function getConfig(env = process.env) {
  const config = {
    endpoint: env.CLOUDFLARE_R2_ENDPOINT,
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    bucket: env.CLOUDFLARE_R2_BUCKET_NAME
  };
  const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) {
    throw new R2DirectUploadError(
      'R2_CONFIG_MISSING',
      'Penyimpanan MCU belum dikonfigurasi lengkap.',
      500
    );
  }
  return config;
}

function createClient(config) {
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
}

function assertSafeSegment(value, field) {
  const normalized = String(value || '').normalize('NFKC').trim();
  if (!/^[a-zA-Z0-9._-]{1,128}$/.test(normalized)) {
    throw new R2DirectUploadError(
      'UPLOAD_VALIDATION_FAILED',
      `${field} tidak valid.`,
      400
    );
  }
  return normalized;
}

function normalizeUploadFileName(value) {
  const normalized = String(value || '')
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 180);
  const extension = normalized.toLowerCase().split('.').pop();
  const rule = FILE_RULES[extension];
  if (!normalized || !rule) {
    throw new R2DirectUploadError(
      'UPLOAD_TYPE_INVALID',
      'Format file tidak didukung. Gunakan PDF, PNG, JPG, atau JPEG.',
      400
    );
  }
  return { fileName: normalized, extension, ...rule };
}

function assertFileMetadata(file, contentLength, storedContentType = null) {
  const normalizedLength = Number(contentLength);
  if (storedContentType && String(storedContentType).toLowerCase() !== file.contentType) {
    throw new R2DirectUploadError(
      'UPLOAD_VALIDATION_FAILED',
      'Tipe file tersimpan tidak sesuai.',
      400
    );
  }
  const tooLarge = file.inclusive
    ? normalizedLength > file.maxBytes
    : normalizedLength >= file.maxBytes;
  if (!Number.isInteger(normalizedLength) || normalizedLength <= 0 || tooLarge) {
    throw new R2DirectUploadError(
      'UPLOAD_SIZE_INVALID',
      file.extension === 'pdf'
        ? 'Ukuran PDF harus kurang dari 10 MB.'
        : 'Ukuran PNG/JPG/JPEG maksimal 3 MB.',
      400
    );
  }
  return { contentType: file.contentType, contentLength: normalizedLength };
}

function assertPendingKey(objectKey, userId) {
  const expectedPrefix = `pending/mcu-uploads/${userId}/`;
  const valid = typeof objectKey === 'string'
    && objectKey.startsWith(expectedPrefix)
    && objectKey.length <= 500
    && !objectKey.includes('..')
    && !objectKey.includes('\\')
    && /^[a-zA-Z0-9/_\-.]+$/.test(objectKey);
  if (!valid) {
    throw new R2DirectUploadError('UPLOAD_FORBIDDEN', 'Upload tidak diizinkan.', 403);
  }
  return objectKey;
}

function encodeCopySource(bucket, objectKey) {
  return encodeURIComponent(`${bucket}/${objectKey}`).replace(/%2F/g, '/');
}

class R2DirectUploadService {
  constructor(options = {}) {
    this.config = options.config || getConfig(options.env);
    this.client = options.client || createClient(this.config);
    this.signUrl = options.signUrl || getSignedUrl;
    this.uuid = options.uuid || randomUUID;
    this.saveMetadata = options.saveMetadata || saveFileMetadata;
    this.publicUrl = options.publicUrl || generatePublicUrl;
    this.employeeExists = options.employeeExists || employeeExists;
    this.findMetadata = options.findMetadata || findFileMetadata;
    this.deleteMetadata = options.deleteMetadata || deleteFileMetadata;
  }

  async prepareFileUpload({ userId, employeeId, mcuId, fileName, contentLength }) {
    const owner = assertSafeSegment(userId, 'User');
    const employee = assertSafeSegment(employeeId, 'Employee ID');
    const mcu = assertSafeSegment(mcuId, 'MCU ID');
    const file = normalizeUploadFileName(fileName);
    const metadata = assertFileMetadata(file, contentLength);
    let exists;
    try {
      exists = await this.employeeExists(employee);
    } catch (error) {
      throw new R2DirectUploadError(
        'UPLOAD_EMPLOYEE_LOOKUP_FAILED',
        'Data karyawan gagal diverifikasi.',
        500,
        error
      );
    }
    if (!exists) {
      throw new R2DirectUploadError(
        'UPLOAD_EMPLOYEE_NOT_FOUND',
        'Employee ID tidak ditemukan.',
        404
      );
    }
    const objectKey = `pending/mcu-uploads/${owner}/${this.uuid()}.${file.extension}`;

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey,
      ContentType: metadata.contentType,
      ContentLength: metadata.contentLength,
      Metadata: {
        owner,
        employeeid: employee,
        mcuid: mcu,
        purpose: 'mcu-file-upload'
      }
    });
    const uploadUrl = await this.signUrl(this.client, command, {
      expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
      signableHeaders: new Set(['content-type'])
    });

    return {
      objectKey,
      uploadUrl,
      fileName: file.fileName,
      expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
      requiredHeaders: { 'Content-Type': file.contentType }
    };
  }

  async preparePdfUpload(payload) {
    return this.prepareFileUpload(payload);
  }

  async confirmFileUpload({ userId, objectKey, fileName }) {
    const owner = assertSafeSegment(userId, 'User');
    const pendingKey = assertPendingKey(objectKey, owner);
    const file = normalizeUploadFileName(fileName);
    let finalKey = null;

    try {
      const head = await this.client.send(new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: pendingKey
      }));
      const metadata = assertFileMetadata(file, Number(head.ContentLength), head.ContentType);
      const employeeId = assertSafeSegment(head.Metadata?.employeeid, 'Employee ID');
      const mcuId = assertSafeSegment(head.Metadata?.mcuid, 'MCU ID');
      if (head.Metadata?.owner !== owner
        || !['mcu-file-upload', 'mcu-pdf-upload'].includes(head.Metadata?.purpose)) {
        throw new R2DirectUploadError('UPLOAD_FORBIDDEN', 'Pemilik upload tidak sesuai.', 403);
      }

      finalKey = `mcu_files/${employeeId}/${mcuId}/${this.uuid()}.${file.extension}`;
      await this.client.send(new CopyObjectCommand({
        Bucket: this.config.bucket,
        Key: finalKey,
        CopySource: encodeCopySource(this.config.bucket, pendingKey),
        ContentType: file.contentType,
        MetadataDirective: 'REPLACE',
        Metadata: {
          owner,
          employeeid: employeeId,
          mcuid: mcuId,
          purpose: 'mcu-file'
        }
      }));

      const publicUrl = this.publicUrl(finalKey);
      const saved = await this.saveMetadata(
        file.fileName,
        employeeId,
        mcuId,
        metadata.contentLength,
        metadata.contentType,
        finalKey,
        publicUrl,
        owner
      );
      if (!saved) {
        throw new R2DirectUploadError(
          'UPLOAD_METADATA_FAILED',
          'Metadata file gagal disimpan.',
          500
        );
      }

      await this.deleteObject(pendingKey).catch(() => {});
      return {
        file: {
          id: saved.fileid,
          name: file.fileName,
          size: metadata.contentLength,
          type: file.type
        },
        storage: {
          bucket: this.config.bucket,
          path: finalKey,
          publicUrl
        }
      };
    } catch (error) {
      if (finalKey) await this.deleteObject(finalKey).catch(() => {});
      await this.deleteObject(pendingKey).catch(() => {});
      if (error instanceof R2DirectUploadError) throw error;
      throw new R2DirectUploadError(
        'UPLOAD_VERIFICATION_FAILED',
        'Upload file gagal diverifikasi.',
        500,
        error
      );
    }
  }

  async confirmPdfUpload(payload) {
    return this.confirmFileUpload(payload);
  }

  async rollbackFileUpload({ userId, employeeId, mcuId, fileId }) {
    const owner = assertSafeSegment(userId, 'User');
    const employee = assertSafeSegment(employeeId, 'Employee ID');
    const mcu = assertSafeSegment(mcuId, 'MCU ID');
    const id = assertSafeSegment(fileId, 'File ID');
    const metadata = await this.findMetadata(id);
    if (!metadata) return { deleted: false };

    const expectedPrefix = `mcu_files/${employee}/${mcu}/`;
    if (String(metadata.uploadedby) !== owner
      || metadata.employeeid !== employee
      || metadata.mcuid !== mcu
      || typeof metadata.supabase_storage_path !== 'string'
      || !metadata.supabase_storage_path.startsWith(expectedPrefix)) {
      throw new R2DirectUploadError('UPLOAD_FORBIDDEN', 'Rollback upload tidak diizinkan.', 403);
    }

    await this.deleteObject(metadata.supabase_storage_path);
    await this.deleteMetadata(id);
    return { deleted: true };
  }

  async deleteObject(objectKey) {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey
    }));
  }
}

module.exports = {
  R2DirectUploadService,
  R2DirectUploadError,
  PDF_UPLOAD_LIMIT_BYTES,
  IMAGE_UPLOAD_LIMIT_BYTES,
  UPLOAD_URL_EXPIRY_SECONDS,
  FILE_RULES,
  assertFileMetadata,
  assertPendingKey,
  normalizeUploadFileName
};
