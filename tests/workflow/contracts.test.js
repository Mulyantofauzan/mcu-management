const test = require('node:test');
const assert = require('node:assert/strict');

const constants = require('../../server/workflow/constants');
const {
  WorkflowError,
  getErrorDefinition,
  normalizeWorkflowError
} = require('../../server/workflow/errors');

test('workflow constants keep independent status dimensions', () => {
  assert.deepEqual(constants.EMPLOYEE_TYPES, ['Karyawan PST', 'Vendor']);
  assert.deepEqual(constants.JOINING_STATUSES, ['candidate', 'joined', 'not_joined']);
  assert.equal(constants.EMPLOYEE_TYPES.includes('joined'), false);
  assert.equal(constants.JOINING_STATUSES.includes('Vendor'), false);
  assert.equal(Object.hasOwn(constants, 'EMPLOYMENT_STATUSES'), false);
});

test('medical result groups cover every result exactly once', () => {
  const grouped = [
    ...constants.TERMINAL_MEDICAL_RESULTS,
    ...constants.LOOPING_MEDICAL_RESULTS
  ];

  assert.deepEqual(new Set(grouped), new Set(constants.MEDICAL_RESULTS));
  assert.equal(grouped.length, constants.MEDICAL_RESULTS.length);
});

test('canonical values and claim duration are immutable', () => {
  assert.equal(constants.CLAIM_DURATION_MINUTES, 30);
  assert.throws(() => constants.ROLES.push('Superadmin'), TypeError);
  assert.throws(() => constants.SHARE_STATUSES.push('sent'), TypeError);
});

test('database markers map to stable workflow errors', () => {
  const error = normalizeWorkflowError({ message: 'WF_LOCKED: lease still active' });

  assert.equal(error.code, constants.WORKFLOW_ERROR_CODES.LOCKED);
  assert.equal(error.status, 423);
  assert.equal(error.message, 'MCU sedang direview dokter lain.');
});

test('authorization and immutable markers never become generic errors', () => {
  const inactive = normalizeWorkflowError({ message: 'WF_USER_INACTIVE' });
  const forbidden = normalizeWorkflowError({ message: 'WF_IMMUTABLE_RECORD' });

  assert.equal(inactive.code, constants.WORKFLOW_ERROR_CODES.USER_INACTIVE);
  assert.equal(inactive.status, 401);
  assert.equal(forbidden.code, constants.WORKFLOW_ERROR_CODES.FORBIDDEN);
  assert.equal(forbidden.status, 403);
});

test('unknown errors do not expose raw database messages', () => {
  const error = normalizeWorkflowError(new Error('password=secret SQL failed'));

  assert.equal(error.code, constants.WORKFLOW_ERROR_CODES.INTERNAL_ERROR);
  assert.equal(error.status, 500);
  assert.equal(error.message, 'Terjadi kesalahan server.');
  assert.equal(error.message.includes('secret'), false);
});

test('workflow errors preserve safe details and custom message', () => {
  const error = new WorkflowError(constants.WORKFLOW_ERROR_CODES.VALIDATION_FAILED, {
    message: 'Tanggal MCU wajib diisi.',
    details: { field: 'mcuDate' }
  });

  assert.equal(error.status, 422);
  assert.deepEqual(error.details, { field: 'mcuDate' });
  assert.equal(getErrorDefinition(error.code).status, 422);
});
