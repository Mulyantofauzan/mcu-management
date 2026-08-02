const test = require('node:test');
const assert = require('node:assert/strict');

const { createWorkflowHandler } = require('../../api/workflow');

function createResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    }
  };
}

function createHandler(options = {}) {
  const calls = [];
  const handler = createWorkflowHandler({
    authenticate: () => ({ app_user_id: 'USR-1' }),
    getSupabaseAdmin: () => ({}),
    loadActiveUser: async () => ({
      userId: 'USR-1',
      role: options.role || 'Admin',
      active: true
    }),
    createService: () => ({
      execute: async (...args) => {
        calls.push(args);
        return { ok: true };
      }
    }),
    createRequestId: () => 'REQ-TEST'
  });
  return { handler, calls };
}

test('GET bootstrap returns stable no-store envelope', async () => {
  const { handler, calls } = createHandler();
  const req = {
    method: 'GET',
    headers: {},
    query: { action: 'bootstrap' }
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(res.headers['X-Request-ID'], 'REQ-TEST');
  assert.deepEqual(res.body, {
    success: true,
    data: { ok: true },
    requestId: 'REQ-TEST'
  });
  assert.equal(calls.length, 1);
});

test('wrong active role receives 403 and service is not called', async () => {
  const { handler, calls } = createHandler({ role: 'Petugas' });
  const req = {
    method: 'POST',
    headers: {},
    query: {},
    body: { action: 'doctor-decision' }
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'WORKFLOW_FORBIDDEN');
  assert.equal(res.body.requestId, 'REQ-TEST');
  assert.equal(calls.length, 0);
});

test('unknown action returns 404 without service execution', async () => {
  const { handler, calls } = createHandler();
  const req = {
    method: 'GET',
    headers: {},
    query: { action: 'unknown' }
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.code, 'WORKFLOW_ACTION_NOT_FOUND');
  assert.equal(calls.length, 0);
});

test('unsupported method returns 405 stable response', async () => {
  const { handler } = createHandler();
  const req = { method: 'DELETE', headers: {}, query: {} };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.body.code, 'METHOD_NOT_ALLOWED');
});
