const test = require('node:test');
const assert = require('node:assert/strict');
const {
  WorkflowService,
  normalizePagination
} = require('../../server/workflow/workflowService');

function queryFixture(resultsByTable) {
  const calls = [];
  const queues = Object.fromEntries(
    Object.entries(resultsByTable).map(([table, results]) => [table, [...results]])
  );
  const supabase = {
    from(table) {
      const result = queues[table]?.shift();
      if (!result) throw new Error(`Unexpected query for ${table}`);
      const query = {};
      ['select', 'is', 'eq', 'in', 'order', 'limit', 'range'].forEach(method => {
        query[method] = (...args) => {
          calls.push({ table, method, args });
          return query;
        };
      });
      query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
      return query;
    }
  };
  return { supabase, calls };
}

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

test('joining pagination normalizes invalid values and caps page size', () => {
  assert.deepEqual(normalizePagination({ page: '3', pageSize: '10' }), {
    page: 3,
    pageSize: 10,
    from: 20,
    to: 29
  });
  assert.deepEqual(normalizePagination({ page: 0, pageSize: 500 }), {
    page: 1,
    pageSize: 50,
    from: 0,
    to: 49
  });
});

test('Administrator badge counts only candidates ready for a joining decision', async () => {
  const { supabase, calls } = queryFixture({
    app_settings: [{
      data: [{ setting_key: 'mcu_approval_workflow_enabled', setting_value: true }],
      error: null
    }],
    mcus: [
      { data: [], error: null },
      { data: null, count: 2, error: null }
    ],
    employees: [{ data: null, count: 3, error: null }]
  });
  const service = new WorkflowService(supabase);

  const result = await service.getBootstrap({ role: 'Admin' });

  assert.equal(result.counts.joining, 3);
  assert.equal(result.counts.followup, 2);
  assert.ok(calls.some(call => call.table === 'employees'
    && call.method === 'select'
    && call.args[0].includes('mcus!inner')));
  assert.ok(calls.some(call => call.table === 'employees'
    && call.method === 'eq'
    && call.args[0] === 'mcus.workflow_status'
    && call.args[1] === 'completed'));
  assert.ok(calls.some(call => call.table === 'employees'
    && call.method === 'in'
    && call.args[0] === 'mcus.current_medical_result'));
});

test('Petugas queue includes actionable legacy follow-up and enriches employees', async () => {
  const current = {
    mcu_id: 'MCU-NEW',
    employee_id: 'EMP-1',
    workflow_status: 'followup_required',
    updated_at: '2026-09-01T00:00:00Z'
  };
  const legacy = {
    mcu_id: 'MCU-OLD',
    employee_id: 'EMP-2',
    workflow_status: 'approved_legacy',
    current_medical_result: 'Temporary Unfit',
    updated_at: '2026-09-02T00:00:00Z'
  };
  const { supabase, calls } = queryFixture({
    mcus: [
      { data: [current], error: null },
      { data: [legacy], error: null }
    ],
    employees: [{
      data: [
        { employee_id: 'EMP-1', name: 'Baru' },
        { employee_id: 'EMP-2', name: 'Legacy' }
      ],
      error: null
    }]
  });
  const service = new WorkflowService(supabase);

  const result = await service.getPetugasQueue();

  assert.deepEqual(result.map(row => row.mcu_id), ['MCU-NEW', 'MCU-OLD']);
  assert.equal(result[1].employee.name, 'Legacy');
  assert.ok(calls.some(call => call.table === 'mcus'
    && call.method === 'eq'
    && call.args[0] === 'workflow_status'
    && call.args[1] === 'approved_legacy'));
  assert.ok(calls.some(call => call.table === 'mcus'
    && call.method === 'in'
    && call.args[0] === 'current_medical_result'));
});

test('review history enriches names without per-row employee queries', async () => {
  const { supabase, calls } = queryFixture({
    mcu_review_cycles: [{
      data: [
        { id: 'CYCLE-1', mcu_id: 'MCU-1', decision: 'approved' },
        { id: 'CYCLE-2', mcu_id: 'MCU-2', decision: 'approved' }
      ],
      error: null
    }],
    mcus: [{
      data: [
        { mcu_id: 'MCU-1', employee_id: 'EMP-1' },
        { mcu_id: 'MCU-2', employee_id: 'EMP-2' }
      ],
      error: null
    }],
    employees: [{
      data: [
        { employee_id: 'EMP-1', name: 'Satu' },
        { employee_id: 'EMP-2', name: 'Dua' }
      ],
      error: null
    }]
  });
  const service = new WorkflowService(supabase);

  const result = await service.getReviewHistory();

  assert.equal(result[0].employee.name, 'Satu');
  assert.equal(result[1].employee_id, 'EMP-2');
  assert.equal(calls.filter(call => call.table === 'employees' && call.method === 'select').length, 1);
});

test('waiting pagination counts only candidates with terminal MCU records', async () => {
  const mcu = {
    mcu_id: 'MCU-2',
    employee_id: 'EMP-2',
    workflow_status: 'completed',
    current_medical_result: 'Fit'
  };
  const { supabase, calls } = queryFixture({
    employees: [{
      data: [{ employee_id: 'EMP-2', joining_status: 'candidate', mcus: [mcu] }],
      count: 12,
      error: null
    }]
  });
  const service = new WorkflowService(supabase);

  const result = await service.getJoiningQueue(false, { page: 2, pageSize: 10 });

  assert.equal(result.page, 2);
  assert.equal(result.total, 12);
  assert.equal(result.totalPages, 2);
  assert.equal(result.items[0].mcu, mcu);
  assert.ok(calls.some(call => call.method === 'select' && call.args[0].includes('mcus!inner')));
  assert.ok(calls.some(call => call.method === 'range' && call.args[0] === 10 && call.args[1] === 19));
  assert.ok(calls.some(call => call.method === 'limit'
    && call.args[0] === 1
    && call.args[1]?.referencedTable === 'mcus'));
});

test('joining history uses stable server range and returns page metadata', async () => {
  const { supabase, calls } = queryFixture({
    employees: [{
      data: [{ employee_id: 'EMP-11', joining_status: 'joined' }],
      count: 11,
      error: null
    }],
    mcus: [{ data: [{ mcu_id: 'MCU-11', employee_id: 'EMP-11' }], error: null }]
  });
  const service = new WorkflowService(supabase);

  const result = await service.getJoiningQueue(true, { page: 3, pageSize: 5 });

  assert.deepEqual(
    { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages },
    { page: 3, pageSize: 5, total: 11, totalPages: 3 }
  );
  assert.equal(result.items[0].mcu.mcu_id, 'MCU-11');
  assert.ok(calls.some(call => call.table === 'employees'
    && call.method === 'range'
    && call.args[0] === 10
    && call.args[1] === 14));
  assert.ok(calls.some(call => call.table === 'employees'
    && call.method === 'order'
    && call.args[0] === 'joining_decided_at'));
});
