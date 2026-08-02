const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { randomUUID } = require('crypto');
const { WORKFLOW_ERROR_CODES } = require('./constants');
const { WorkflowError } = require('./errors');

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;
const UPLOAD_URL_EXPIRY_SECONDS = 5 * 60;
const DOWNLOAD_URL_EXPIRY_SECONDS = 5 * 60;
const SIGNATURE_TYPES = Object.freeze({
  'image/png': 'png',
  'image/jpeg': 'jpg'
});

function getPrivateStorageConfig(env = process.env) {
  const accountId = env.R2_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID;
  const endpoint = env.R2_ENDPOINT
    || env.CLOUDFLARE_R2_ENDPOINT
    || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);
  const config = {
    endpoint,
    accessKeyId: env.R2_ACCESS_KEY_ID || env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY || env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    bucket: env.R2_PRIVATE_BUCKET_NAME
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.DOCUMENT_FAILED, {
      message: 'Penyimpanan dokumen privat belum siap. Hubungi Administrator.'
    });
  }
  return config;
}

function assertObjectKey(objectKey, prefix) {
  const valid = typeof objectKey === 'string'
    && objectKey.length <= 500
    && !objectKey.startsWith('/')
    && !objectKey.includes('..')
    && !objectKey.includes('\\')
    && /^[a-zA-Z0-9/_\-.]+$/.test(objectKey)
    && (!prefix || objectKey.startsWith(prefix));

  if (!valid) {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.VALIDATION_FAILED, {
      details: { field: 'objectKey' }
    });
  }
  return objectKey;
}

function assertSignatureMetadata(contentType, contentLength) {
  const normalizedType = String(contentType || '').toLowerCase();
  const normalizedLength = Number(contentLength);
  if (!SIGNATURE_TYPES[normalizedType]) {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.VALIDATION_FAILED, {
      message: 'Tanda tangan harus berupa PNG atau JPEG.',
      details: { field: 'contentType' }
    });
  }
  if (!Number.isInteger(normalizedLength) || normalizedLength < 1 || normalizedLength > MAX_SIGNATURE_BYTES) {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.VALIDATION_FAILED, {
      message: 'Ukuran tanda tangan maksimal 2 MB.',
      details: { field: 'contentLength' }
    });
  }
  return { contentType: normalizedType, contentLength: normalizedLength };
}

function createClient(config) {
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
}

class PrivateStorageService {
  constructor(options = {}) {
    this.config = options.config || getPrivateStorageConfig(options.env);
    this.client = options.client || createClient(this.config);
    this.signUrl = options.signUrl || getSignedUrl;
    this.uuid = options.uuid || randomUUID;
  }

  async createSignatureUpload({ userId, contentType, contentLength }) {
    const metadata = assertSignatureMetadata(contentType, contentLength);
    const safeUserId = String(userId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeUserId || safeUserId !== String(userId)) {
      throw new WorkflowError(WORKFLOW_ERROR_CODES.VALIDATION_FAILED, {
        details: { field: 'userId' }
      });
    }

    const objectKey = `doctor-signatures/${safeUserId}/${this.uuid()}.${SIGNATURE_TYPES[metadata.contentType]}`;
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey,
      ContentType: metadata.contentType,
      ContentLength: metadata.contentLength,
      Metadata: { owner: safeUserId, purpose: 'doctor-signature' }
    });
    const uploadUrl = await this.signUrl(this.client, command, {
      expiresIn: UPLOAD_URL_EXPIRY_SECONDS
    });

    return {
      objectKey,
      uploadUrl,
      expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
      requiredHeaders: { 'Content-Type': metadata.contentType }
    };
  }

  async confirmSignatureUpload({ userId, objectKey }) {
    const prefix = `doctor-signatures/${userId}/`;
    assertObjectKey(objectKey, prefix);

    let result;
    try {
      result = await this.client.send(new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey
      }));
      assertSignatureMetadata(result.ContentType, Number(result.ContentLength));
    } catch (error) {
      if (error instanceof WorkflowError) {
        await this.deleteObject(objectKey).catch(() => {});
        throw error;
      }
      throw new WorkflowError(WORKFLOW_ERROR_CODES.DOCUMENT_FAILED, {
        message: 'Upload tanda tangan belum ditemukan atau gagal diverifikasi.',
        cause: error
      });
    }

    if (result.Metadata?.owner && result.Metadata.owner !== String(userId)) {
      await this.deleteObject(objectKey).catch(() => {});
      throw new WorkflowError(WORKFLOW_ERROR_CODES.FORBIDDEN);
    }

    return {
      objectKey,
      contentType: result.ContentType,
      contentLength: Number(result.ContentLength),
      etag: result.ETag || null
    };
  }

  async putBuffer(objectKey, buffer, contentType, metadata = {}) {
    assertObjectKey(objectKey);
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new WorkflowError(WORKFLOW_ERROR_CODES.DOCUMENT_FAILED, {
        message: 'Dokumen kosong tidak dapat disimpan.'
      });
    }

    await this.client.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey,
      Body: buffer,
      ContentLength: buffer.length,
      ContentType: contentType,
      Metadata: Object.fromEntries(
        Object.entries(metadata).map(([key, value]) => [key, String(value)])
      )
    }));
    return { objectKey, contentLength: buffer.length, contentType };
  }

  async getBuffer(objectKey) {
    assertObjectKey(objectKey);
    const result = await this.client.send(new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey
    }));
    if (!result.Body) {
      throw new WorkflowError(WORKFLOW_ERROR_CODES.DOCUMENT_FAILED, {
        message: 'Objek privat tidak ditemukan.'
      });
    }
    if (typeof result.Body.transformToByteArray === 'function') {
      return Buffer.from(await result.Body.transformToByteArray());
    }
    const chunks = [];
    for await (const chunk of result.Body) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  async createDownloadUrl(objectKey, fileName) {
    assertObjectKey(objectKey);
    const safeName = String(fileName || 'dokumen.pdf').replace(/[\r\n"\\]/g, '_');
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey,
      ResponseContentDisposition: `attachment; filename="${safeName}"`
    });
    const downloadUrl = await this.signUrl(this.client, command, {
      expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS
    });
    return { downloadUrl, expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS, fileName: safeName };
  }

  async deleteObject(objectKey) {
    assertObjectKey(objectKey);
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey
    }));
  }
}

module.exports = {
  PrivateStorageService,
  getPrivateStorageConfig,
  assertObjectKey,
  assertSignatureMetadata,
  MAX_SIGNATURE_BYTES,
  UPLOAD_URL_EXPIRY_SECONDS,
  DOWNLOAD_URL_EXPIRY_SECONDS
};
