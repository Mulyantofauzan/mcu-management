/**
 * Cache Manager - Simple in-memory caching for frequently accessed data
 *
 * Purpose:
 * - Reduce redundant database queries
 * - Speed up page transitions and filters
 * - Automatically expire old caches
 *
 * Strategy:
 * - Master data (departments, doctors, job titles) - cache 1 hour
 * - Employee list - cache 30 minutes
 * - MCU data - cache 10 minutes (more volatile)
 * - Invalidate on mutations
 */

class CacheManager {
  constructor() {
    this.caches = new Map();
    this.timers = new Map();
  }

  /**
   * Get cached data or fetch from source
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to fetch data if not cached
   * @param {number} ttl - Time to live in milliseconds (default: 30 min)
   */
  async get(key, fetchFn, ttl = 30 * 60 * 1000) {
    // Return from cache if exists
    if (this.caches.has(key)) {
      return this.caches.get(key);
    }

    // Fetch from source
    try {
      const data = await fetchFn();

      // Store in cache
      this.set(key, data, ttl);

      return data;
    } catch (error) {
      console.error(`Cache fetch error for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set cache value with TTL
   */
  set(key, data, ttl = 30 * 60 * 1000) {
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Store data
    this.caches.set(key, data);

    // Set auto-expire timer
    const timer = setTimeout(() => {
      this.invalidate(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  /**
   * Invalidate cache
   */
  invalidate(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.caches.delete(key);
  }

  /**
   * Invalidate all caches (on logout or major changes)
   */
  invalidateAll() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.caches.clear();
  }

  /**
   * Get cache size stats
   */
  getStats() {
    return {
      entries: this.caches.size,
      keys: Array.from(this.caches.keys())
    };
  }
}

export const cacheManager = new CacheManager();
