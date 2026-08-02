const test = require('node:test');
const assert = require('node:assert/strict');
const { WorkflowService } = require('../../server/workflow/workflowService');

test('terminal doctor approval never starts referral generation', async () => {
  const calls = [];
  const service = new WorkflowService({
    rpc: async (name, args) => {
      calls.push([name, args]);
      return {
        data: { reviewCycleId: 'cycle-1', workflowVersion: 2, medicalResult: 'Fit' },
        error: null
      };
    }
  });
  service.prepareReferralDocument = async () => {
    throw new Error('must not run');
  };

  const result = await service.applyDoctorDecision({
    mcuId: 'MCU-1',
    expectedVersion: 1,
    decision: 'approved',
    medicalResult: 'Fit',
    clinicalNotes: 'Fit bekerja.',
    idempotencyKey: 'idem-1'
  }, { userId: 'USR-1' }, 'REQ-1');

  assert.equal(result.workflowVersion, 2);
  assert.equal(calls.length, 1);
});

test('looping approval returns committed result even when referral fails', async () => {
  const service = new WorkflowService({
    rpc: async () => ({
      data: { reviewCycleId: 'cycle-1', workflowVersion: 2, medicalResult: 'Follow-Up' },
      error: null
    })
  });
  service.prepareReferralDocument = async () => ({
    status: 'failed',
    code: 'WORKFLOW_DOCUMENT_FAILED',
    message: 'Approval berhasil, tetapi dokumen gagal dibuat.'
  });

  const result = await service.applyDoctorDecision({
    mcuId: 'MCU-1',
    expectedVersion: 1,
    decision: 'approved',
    medicalResult: 'Follow-Up',
    clinicalNotes: 'Perlu pemeriksaan lanjutan.',
    idempotencyKey: 'idem-2'
  }, { userId: 'USR-1' }, 'REQ-2');

  assert.equal(result.reviewCycleId, 'cycle-1');
  assert.equal(result.workflowVersion, 2);
  assert.equal(result.document.status, 'failed');
});

test('signature confirmation verifies private object before database mutation', async () => {
  const calls = [];
  const storage = {
    confirmSignatureUpload: async input => calls.push(['head', input])
  };
  const service = new WorkflowService({
    rpc: async (name, args) => {
      calls.push([name, args]);
      return { data: { signatureVersion: 2 }, error: null };
    }
  }, { storage });

  const result = await service.confirmSignatureUpload({
    objectKey: 'doctor-signatures/USR-1/file.png',
    expectedVersion: 1,
    idempotencyKey: 'idem-3'
  }, { userId: 'USR-1' }, 'REQ-3');

  assert.equal(result.signatureVersion, 2);
  assert.equal(calls[0][0], 'head');
  assert.equal(calls[1][0], 'workflow_confirm_doctor_signature');
});
