const { WORKFLOW_ERROR_CODES } = require('./constants');

const ERROR_DEFINITIONS = Object.freeze({
  [WORKFLOW_ERROR_CODES.UNAUTHORIZED]: Object.freeze({
    status: 401,
    message: 'Sesi tidak valid atau sudah berakhir.'
  }),
  [WORKFLOW_ERROR_CODES.USER_INACTIVE]: Object.freeze({
    status: 401,
    message: 'Akun tidak aktif. Silakan hubungi Administrator.'
  }),
  [WORKFLOW_ERROR_CODES.FORBIDDEN]: Object.freeze({
    status: 403,
    message: 'Role Anda tidak memiliki akses untuk tindakan ini.'
  }),
  [WORKFLOW_ERROR_CODES.NOT_FOUND]: Object.freeze({
    status: 404,
    message: 'Data workflow tidak ditemukan.'
  }),
  [WORKFLOW_ERROR_CODES.ACTION_NOT_FOUND]: Object.freeze({
    status: 404,
    message: 'Tindakan workflow tidak tersedia.'
  }),
  [WORKFLOW_ERROR_CODES.VERSION_CONFLICT]: Object.freeze({
    status: 409,
    message: 'Data telah berubah. Muat versi terbaru sebelum melanjutkan.'
  }),
  [WORKFLOW_ERROR_CODES.INVALID_TRANSITION]: Object.freeze({
    status: 409,
    message: 'Perubahan status tidak sesuai alur workflow.'
  }),
  [WORKFLOW_ERROR_CODES.VALIDATION_FAILED]: Object.freeze({
    status: 422,
    message: 'Data belum lengkap atau tidak valid.'
  }),
  [WORKFLOW_ERROR_CODES.LOCKED]: Object.freeze({
    status: 423,
    message: 'MCU sedang direview dokter lain.'
  }),
  [WORKFLOW_ERROR_CODES.FEATURE_DISABLED]: Object.freeze({
    status: 503,
    message: 'Workflow approval belum diaktifkan.'
  }),
  [WORKFLOW_ERROR_CODES.DOCUMENT_FAILED]: Object.freeze({
    status: 500,
    message: 'Approval berhasil, tetapi dokumen gagal dibuat.'
  }),
  [WORKFLOW_ERROR_CODES.INTERNAL_ERROR]: Object.freeze({
    status: 500,
    message: 'Terjadi kesalahan server.'
  })
});

const DATABASE_MARKERS = Object.freeze({
  WF_NOT_FOUND: WORKFLOW_ERROR_CODES.NOT_FOUND,
  WF_VERSION_CONFLICT: WORKFLOW_ERROR_CODES.VERSION_CONFLICT,
  WF_INVALID_TRANSITION: WORKFLOW_ERROR_CODES.INVALID_TRANSITION,
  WF_VALIDATION_FAILED: WORKFLOW_ERROR_CODES.VALIDATION_FAILED,
  WF_LOCKED: WORKFLOW_ERROR_CODES.LOCKED,
  WF_FEATURE_DISABLED: WORKFLOW_ERROR_CODES.FEATURE_DISABLED
});

class WorkflowError extends Error {
  constructor(code, options = {}) {
    const definition = ERROR_DEFINITIONS[code] || ERROR_DEFINITIONS[WORKFLOW_ERROR_CODES.INTERNAL_ERROR];
    super(options.message || definition.message);
    this.name = 'WorkflowError';
    this.code = ERROR_DEFINITIONS[code] ? code : WORKFLOW_ERROR_CODES.INTERNAL_ERROR;
    this.status = options.status || definition.status;
    this.details = options.details || null;
    this.cause = options.cause;
  }
}

function findDatabaseMarker(error) {
  const text = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ');

  return Object.keys(DATABASE_MARKERS).find(marker => text.includes(marker)) || null;
}

function normalizeWorkflowError(error) {
  if (error instanceof WorkflowError) return error;

  const marker = findDatabaseMarker(error);
  if (marker) {
    return new WorkflowError(DATABASE_MARKERS[marker], { cause: error });
  }

  return new WorkflowError(WORKFLOW_ERROR_CODES.INTERNAL_ERROR, { cause: error });
}

function getErrorDefinition(code) {
  return ERROR_DEFINITIONS[code] || ERROR_DEFINITIONS[WORKFLOW_ERROR_CODES.INTERNAL_ERROR];
}

module.exports = {
  ERROR_DEFINITIONS,
  WorkflowError,
  getErrorDefinition,
  normalizeWorkflowError
};
