/**
 * In-memory login attempt limiter.
 * State lives in one serverless instance, so it slows down guessing but does
 * not replace a shared store. Good enough as the first line of defence.
 */

function createLoginRateLimiter({ maxFailures = 5, windowMs = 15 * 60 * 1000, now = Date.now } = {}) {
  const entries = new Map();

  function prune(current) {
    if (entries.size < 1000) return;
    for (const [key, entry] of entries) {
      if (entry.resetAt <= current) entries.delete(key);
    }
  }

  function live(key) {
    const current = now();
    const entry = entries.get(key);
    if (entry && entry.resetAt <= current) {
      entries.delete(key);
      return null;
    }
    return entry || null;
  }

  return {
    check(key) {
      const entry = live(key);
      if (!entry || entry.failures < maxFailures) return { blocked: false, retryAfterSeconds: 0 };
      return { blocked: true, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now()) / 1000)) };
    },
    fail(key) {
      const current = now();
      prune(current);
      const entry = live(key) || { failures: 0, resetAt: current + windowMs };
      entry.failures += 1;
      entries.set(key, entry);
    },
    success(key) {
      entries.delete(key);
    }
  };
}

module.exports = { createLoginRateLimiter };
