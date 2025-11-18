/**
 * Cache Manager
 * In-memory caching layer for frequently accessed master data
 * Reduces redundant database queries
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time-to-live for each cache entry (5 minutes default)
    this.DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if expired/not found
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    // Check if cache expired
    const expireTime = this.ttl.get(key);
    if (expireTime && Date.now() > expireTime) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time-to-live in milliseconds (optional, defaults to 5 min)
   */
  set(key, value, ttl = this.DEFAULT_TTL) {
    this.cache.set(key, value);
    if (ttl > 0) {
      this.ttl.set(key, Date.now() + ttl);
    }
  }

  /**
   * Clear specific cache entry
   * @param {string} key - Cache key to clear
   */
  clear(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  /**
   * Clear all cache (useful after data mutations)
   */
  clearAll() {
    this.cache.clear();
    this.ttl.clear();
  }

  /**
   * Get cache hit rate (for debugging)
   * @returns {Object} - Cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

/**
 * Cache decorator for async functions
 * @param {Function} fn - Async function to wrap
 * @param {string} cacheKey - Cache key prefix
 * @param {number} ttl - Time-to-live in milliseconds
 * @returns {Function} - Wrapped function with caching
 */
export function withCache(fn, cacheKey, ttl = 5 * 60 * 1000) {
  return async function(...args) {
    // Create unique key from function name and arguments
    const key = `${cacheKey}:${JSON.stringify(args)}`;

    // Check cache first
    const cached = cacheManager.get(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - execute function
    const result = await fn(...args);

    // Store in cache
    cacheManager.set(key, result, ttl);
    return result;
  };
}
