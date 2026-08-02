const freezeList = values => Object.freeze([...values]);

const ROLES = freezeList(['Admin', 'Petugas', 'Dokter']);
const EMPLOYEE_TYPES = freezeList(['Karyawan PST', 'Vendor']);
const WORKFLOW_STATUSES = freezeList([
  'draft',
  'pending_review',
  'in_review',
  'correction_required',
  'followup_required',
  'completed',
  'approved_legacy'
]);
const MEDICAL_RESULTS = freezeList([
  'Fit',
  'Fit With Note',
  'Unfit',
  'Follow-Up',
  'Temporary Unfit'
]);
const TERMINAL_MEDICAL_RESULTS = freezeList(['Fit', 'Fit With Note', 'Unfit']);
const LOOPING_MEDICAL_RESULTS = freezeList(['Follow-Up', 'Temporary Unfit']);
const JOINING_STATUSES = freezeList(['candidate', 'joined', 'not_joined']);
const SHARE_STATUSES = freezeList([
  'not_started',
  'prepared',
  'confirmed_by_user',
  'failed'
]);

const CLAIM_DURATION_MINUTES = 30;

const WORKFLOW_ERROR_CODES = Object.freeze({
  UNAUTHORIZED: 'WORKFLOW_UNAUTHORIZED',
  USER_INACTIVE: 'WORKFLOW_USER_INACTIVE',
  FORBIDDEN: 'WORKFLOW_FORBIDDEN',
  NOT_FOUND: 'WORKFLOW_NOT_FOUND',
  ACTION_NOT_FOUND: 'WORKFLOW_ACTION_NOT_FOUND',
  VERSION_CONFLICT: 'WORKFLOW_VERSION_CONFLICT',
  INVALID_TRANSITION: 'WORKFLOW_INVALID_TRANSITION',
  VALIDATION_FAILED: 'WORKFLOW_VALIDATION_FAILED',
  LOCKED: 'WORKFLOW_LOCKED',
  FEATURE_DISABLED: 'WORKFLOW_FEATURE_DISABLED',
  DOCUMENT_FAILED: 'WORKFLOW_DOCUMENT_FAILED',
  INTERNAL_ERROR: 'WORKFLOW_INTERNAL_ERROR'
});

function isAllowed(value, allowedValues) {
  return allowedValues.includes(value);
}

module.exports = {
  ROLES,
  EMPLOYEE_TYPES,
  WORKFLOW_STATUSES,
  MEDICAL_RESULTS,
  TERMINAL_MEDICAL_RESULTS,
  LOOPING_MEDICAL_RESULTS,
  JOINING_STATUSES,
  SHARE_STATUSES,
  CLAIM_DURATION_MINUTES,
  WORKFLOW_ERROR_CODES,
  isAllowed
};
