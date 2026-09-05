const test = require('node:test');
const assert = require('node:assert/strict');
const { createDeleteFileHandler } = require('../../api/delete-file');

function responseFixture() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; }
  };
}

function queryResult(result) {
  const query = {};
  ['select', 'eq', 'is', 'delete'].forEach(method => {
    query[method] = () => query;
  });
  query.maybeSingle = async () => result;
  query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return query;
}

function handlerFixture({ role = 'Petugas', status = 'pending_review', r2Fails = false } = {}) {
  const calls = [];
  let fileCalls = 0;
  const supabase = {
    from(table) {
      calls.push(table);
      if (table === 'mcufiles') {
        fileCalls += 1;
        if (fileCalls === 1) return queryResult({
          data: { fileid: 'FILE-1', mcuid: 'MCU-1', supabase_storage_path: 'mcu_files/EMP-1/MCU-1/file.pdf' },
          error: null
        });
        return queryResult({ data: null, error: null });
      }
      return queryResult({ data: { mcu_id: 'MCU-1', workflow_status: status }, error: null });
    }
  };
  const handler = createDeleteFileHandler({
    requireAuth: () => ({ app_user_id: 'USR-1' }),
    getSupabaseAdmin: () => supabase,
    loadActiveUser: async () => ({ userId: 'USR-1', role }),
    createStorage: () => ({
      async deleteObject(key) {
        calls.push(`r2:${key}`);
        if (r2Fails) throw new Error('R2 unavailable');
      }
    })
  });
  return { handler, calls };
}

test('Petugas deletes R2 object before MCU file metadata', async () => {
  const { handler, calls } = handlerFixture();
  const res = responseFixture();
  await handler({ method: 'DELETE', headers: {}, query: { fileId: 'FILE-1' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls, [
    'mcufiles',
    'mcus',
    'r2:mcu_files/EMP-1/MCU-1/file.pdf',
    'mcufiles'
  ]);
});

test('final MCU attachment cannot be deleted', async () => {
  const { handler, calls } = handlerFixture({ status: 'completed' });
  const res = responseFixture();
  await handler({ method: 'DELETE', headers: {}, query: { fileId: 'FILE-1' } }, res);

  assert.equal(res.statusCode, 409);
  assert.equal(calls.some(call => String(call).startsWith('r2:')), false);
});

test('metadata remains when R2 deletion fails', async () => {
  const { handler, calls } = handlerFixture({ r2Fails: true });
  const res = responseFixture();
  await handler({ method: 'DELETE', headers: {}, query: { fileId: 'FILE-1' } }, res);

  assert.equal(res.statusCode, 500);
  assert.equal(calls.filter(call => call === 'mcufiles').length, 1);
});
