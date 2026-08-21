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
  generatePublicUrl
} = require('./r2StorageService');

const PDF_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
const UPLOAD_URL_EXPIRY_SECONDS = 5 * 60;
const PDF_CONTENT_TYPE = 'application/pdf';

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
  const normalized = String(value || '');
  if (!/^[a-zA-Z0-9._-]{1,128}$/.test(normalized)) {
    throw new R2DirectUploadError(
      'UPLOAD_VALIDATION_FAILED',
      `${field} tidak valid.`,
      400
    );
  }
  return normalized;
}

function normalizePdfFileName(value) {
  const normalized = String(value || '')
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 180);
  if (!normalized || !normalized.toLowerCase().endsWith('.pdf')) {
    throw new R2DirectUploadError(
      'UPLOAD_VALIDATION_FAILED',
      'Nama file PDF tidak valid.',
      400
    );
  }
  return normalized;
}

function assertPdfMetadata(contentType, contentLength) {
  const normalizedType = String(contentType || '').toLowerCase();
  const normalizedLength = Number(contentLength);
  if (normalizedType !== PDF_CONTENT_TYPE) {
    throw new R2DirectUploadError(
      'UPLOAD_VALIDATION_FAILED',
      'Tipe file harus application/pdf.',
      400
    );
  }
  if (!Number.isInteger(normalizedLength)
    || normalizedLength <= 0
    || normalizedLength >= PDF_UPLOAD_LIMIT_BYTES) {
    throw new R2DirectUploadError(
      'UPLOAD_SIZE_INVALID',
      'Ukuran PDF harus kurang dari 10 MB.',
      400
    );
  }
  return { contentType: normalizedType, contentLength: normalizedLength };
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
  }

  async preparePdfUpload({ userId, employeeId, mcuId, fileName, contentType, contentLength }) {
    const owner = assertSafeSegment(userId, 'User');
    const employee = assertSafeSegment(employeeId, 'Employee ID');
    const mcu = assertSafeSegment(mcuId, 'MCU ID');
    const safeFileName = normalizePdfFileName(fileName);
    const metadata = assertPdfMetadata(contentType, contentLength);
    const objectKey = `pending/mcu-uploads/${owner}/${this.uuid()}.pdf`;

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey,
      ContentType: metadata.contentType,
      ContentLength: metadata.contentLength,
      Metadata: {
        owner,
        employeeid: employee,
        mcuid: mcu,
        purpose: 'mcu-pdf-upload'
      }
    });
    const uploadUrl = await this.signUrl(this.client, command, {
      expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
      signableHeaders: new Set(['content-type'])
    });

    return {
      objectKey,
      uploadUrl,
      fileName: safeFileName,
      expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
      requiredHeaders: { 'Content-Type': PDF_CONTENT_TYPE }
    };
  }

  async confirmPdfUpload({ userId, objectKey, fileName }) {
    const owner = assertSafeSegment(userId, 'User');
    const pendingKey = assertPendingKey(objectKey, owner);
    const safeFileName = normalizePdfFileName(fileName);
    let finalKey = null;

    try {
      const head = await this.client.send(new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: pendingKey
      }));
      const metadata = assertPdfMetadata(head.ContentType, Number(head.ContentLength));
      const employeeId = assertSafeSegment(head.Metadata?.employeeid, 'Employee ID');
      const mcuId = assertSafeSegment(head.Metadata?.mcuid, 'MCU ID');
      if (head.Metadata?.owner !== owner || head.Metadata?.purpose !== 'mcu-pdf-upload') {
        throw new R2DirectUploadError('UPLOAD_FORBIDDEN', 'Pemilik upload tidak sesuai.', 403);
      }

      finalKey = `mcu_files/${employeeId}/${mcuId}/${this.uuid()}.pdf`;
      await this.client.send(new CopyObjectCommand({
        Bucket: this.config.bucket,
        Key: finalKey,
        CopySource: encodeCopySource(this.config.bucket, pendingKey),
        ContentType: PDF_CONTENT_TYPE,
        MetadataDirective: 'REPLACE',
        Metadata: {
          owner,
          employeeid: employeeId,
          mcuid: mcuId,
          purpose: 'mcu-pdf'
        }
      }));

      const publicUrl = this.publicUrl(finalKey);
      const saved = await this.saveMetadata(
        safeFileName,
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
          name: safeFileName,
          size: metadata.contentLength,
          type: 'pdf'
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
        'Upload PDF gagal diverifikasi.',
        500,
        error
      );
    }
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
  UPLOAD_URL_EXPIRY_SECONDS,
  assertPdfMetadata,
  assertPendingKey,
  normalizePdfFileName
};
