import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { runKeepAlive } from '../src/index.js';

const SECRET = 'service-role-secret-for-tests';
const ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: SECRET
};

function createLogger() {
  const entries = [];
  return {
    entries,
    log(message) { entries.push({ level: 'log', message }); },
    error(message) { entries.push({ level: 'error', message }); }
  };
}

test('performs one minimal read and logs a sanitized success', async () => {
  const requests = [];
  const logger = createLogger();

  const result = await runKeepAlive(ENV, {
    fetchImpl: async (url, init) => {
      requests.push({ url, init });
      return new Response('[]', { status: 200 });
    },
    sleepImpl: async () => assert.fail('success must not sleep'),
    logger,
    scheduledTime: 1234
  });

  assert.deepEqual(result, { attempt: 1, status: 200 });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://example.supabase.co/rest/v1/app_settings?select=setting_key&limit=1');
  assert.equal(requests[0].init.method, 'GET');
  assert.equal(requests[0].init.headers.apikey, SECRET);
  assert.equal(requests[0].init.headers.Authorization, `Bearer ${SECRET}`);
  assert.equal(logger.entries.length, 1);
  assert.equal(JSON.parse(logger.entries[0].message).event, 'supabase_keepalive_success');
  assert.equal(logger.entries[0].message.includes(SECRET), false);
});

test('retries once after a non-success response', async () => {
  let calls = 0;
  const sleeps = [];
  const logger = createLogger();

  const result = await runKeepAlive(ENV, {
    fetchImpl: async () => {
      calls += 1;
      return new Response(null, { status: calls === 1 ? 503 : 204 });
    },
    sleepImpl: async milliseconds => sleeps.push(milliseconds),
    logger
  });

  assert.deepEqual(result, { attempt: 2, status: 204 });
  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [1000]);
  assert.equal(logger.entries.length, 1);
});

test('fails after two network errors without leaking the secret', async () => {
  let calls = 0;
  const logger = createLogger();

  await assert.rejects(
    runKeepAlive(ENV, {
      fetchImpl: async () => {
        calls += 1;
        throw new Error(`network failure ${SECRET}`);
      },
      sleepImpl: async () => {},
      logger
    }),
    /failed after two attempts/
  );

  assert.equal(calls, 2);
  assert.equal(logger.entries.length, 1);
  assert.equal(JSON.parse(logger.entries[0].message).reason, 'network');
  assert.equal(logger.entries[0].message.includes(SECRET), false);
});

test('classifies request timeouts without exposing request details', async () => {
  const logger = createLogger();

  await assert.rejects(
    runKeepAlive(ENV, {
      fetchImpl: async (_url, { signal }) => new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Request aborted', 'AbortError'));
        }, { once: true });
      }),
      sleepImpl: async () => {},
      timeoutMs: 1,
      logger
    }),
    /failed after two attempts/
  );

  assert.equal(JSON.parse(logger.entries[0].message).reason, 'timeout');
  assert.equal(logger.entries[0].message.includes(ENV.SUPABASE_URL), false);
  assert.equal(logger.entries[0].message.includes(SECRET), false);
});

test('rejects missing configuration before making a request', async () => {
  let calls = 0;
  const logger = createLogger();

  await assert.rejects(
    runKeepAlive({ SUPABASE_URL: ENV.SUPABASE_URL }, {
      fetchImpl: async () => { calls += 1; },
      logger
    }),
    /configuration is invalid/
  );

  assert.equal(calls, 0);
  assert.equal(JSON.parse(logger.entries[0].message).reason, 'configuration');
});

test('scheduled handler disables platform retries', async () => {
  let noRetryCalls = 0;
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  globalThis.fetch = async () => new Response(null, { status: 204 });
  console.log = () => {};

  try {
    await worker.scheduled({
      scheduledTime: 1234,
      noRetry() { noRetryCalls += 1; }
    }, ENV, {});
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
  }

  assert.equal(noRetryCalls, 1);
});
