const MAX_ATTEMPTS = 2;
const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 1_000;

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function buildConfiguration(env) {
  const serviceRoleKey = String(env?.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!serviceRoleKey) throw new Error('KEEPALIVE_CONFIG_INVALID');

  let endpoint;
  try {
    endpoint = new URL('/rest/v1/app_settings', env?.SUPABASE_URL);
  } catch {
    throw new Error('KEEPALIVE_CONFIG_INVALID');
  }

  if (endpoint.protocol !== 'https:') throw new Error('KEEPALIVE_CONFIG_INVALID');
  endpoint.searchParams.set('select', 'setting_key');
  endpoint.searchParams.set('limit', '1');

  return { endpoint: endpoint.toString(), serviceRoleKey };
}

function writeLog(logger, level, payload) {
  logger[level](JSON.stringify(payload));
}

export async function runKeepAlive(env, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const sleepImpl = options.sleepImpl || delay;
  const logger = options.logger || console;
  const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs || RETRY_DELAY_MS;
  const scheduledTime = options.scheduledTime || Date.now();

  let configuration;
  try {
    configuration = buildConfiguration(env);
  } catch {
    writeLog(logger, 'error', {
      event: 'supabase_keepalive_failed',
      reason: 'configuration',
      attempts: 0,
      scheduledTime
    });
    throw new Error('Supabase keep-alive configuration is invalid');
  }

  let lastReason = 'network';
  let lastStatus = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await fetchImpl(configuration.endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          apikey: configuration.serviceRoleKey,
          Authorization: `Bearer ${configuration.serviceRoleKey}`
        },
        signal: controller.signal
      });

      if (!response.ok) {
        lastReason = 'http';
        lastStatus = response.status;
        throw new Error('KEEPALIVE_HTTP_ERROR');
      }

      writeLog(logger, 'log', {
        event: 'supabase_keepalive_success',
        attempt,
        status: response.status,
        durationMs: Date.now() - startedAt,
        scheduledTime
      });
      return { attempt, status: response.status };
    } catch (error) {
      if (error?.name === 'AbortError') {
        lastReason = 'timeout';
        lastStatus = null;
      } else if (error?.message !== 'KEEPALIVE_HTTP_ERROR') {
        lastReason = 'network';
        lastStatus = null;
      }

      if (attempt < MAX_ATTEMPTS) await sleepImpl(retryDelayMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  writeLog(logger, 'error', {
    event: 'supabase_keepalive_failed',
    reason: lastReason,
    status: lastStatus,
    attempts: MAX_ATTEMPTS,
    scheduledTime
  });
  throw new Error('Supabase keep-alive failed after two attempts');
}

export default {
  async scheduled(controller, env) {
    controller.noRetry();
    await runKeepAlive(env, { scheduledTime: controller.scheduledTime });
  }
};
