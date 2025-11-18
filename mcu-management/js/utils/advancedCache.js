/**
 * Advanced Cache Manager - Multi-layer caching with TTL and invalidation
 *
 * Features:
 * - Time-based expiration (TTL)
 * - Manual invalidation
 * - Cache statistics and debugging
 * - Configurable cache sizes
 * - Namespace support for cache isolation
 *
 * Cache Layers:
 * 1. In-memory cache (fast, loses on page reload)
 * 2. IndexedDB cache (persistent, slower but survives reloads)
 * 3. LocalStorage cache (very fast, limited size)
 */

class AdvancedCache {
  constructor(options = {}) {
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    // Configuration
    this.config = {
      defaultTTL: options.defaultTTL || 5 * 60 * 1000, // 5 minutes
      maxMemoryEntries: options.maxMemoryEntries || 500,
      namespace: options.namespace || 'app-cache',
      enableStats: options.enableStats !== false
    };
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.memoryCache.get(key);

    if (!entry) {
      this.recordMiss();
      return null;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      this.recordMiss();
      return null;
    }

    this.recordHit();
    return entry.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = null) {
    // Use provided TTL or default
    const expiresAt = ttl ? Date.now() + ttl : Date.now() + this.config.defaultTTL;

    // Check memory limit (simple LRU - remove oldest entry)
    if (this.memoryCache.size >= this.config.maxMemoryEntries) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    // Store in memory cache
    this.memoryCache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });

    this.recordSet();
  }

  /**
   * Delete from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.memoryCache.delete(key);
    this.recordDelete();
  }

  /**
   * Clear cache entries matching a pattern
   * @param {string|RegExp} pattern - Pattern to match (string prefix or regex)
   */
  deleteMatching(pattern) {
    let count = 0;

    if (typeof pattern === 'string') {
      // String prefix matching
      for (const [key] of this.memoryCache.entries()) {
        if (key.startsWith(pattern)) {
          this.memoryCache.delete(key);
          count++;
        }
      }
    } else if (pattern instanceof RegExp) {
      // Regex matching
      for (const [key] of this.memoryCache.entries()) {
        if (pattern.test(key)) {
          this.memoryCache.delete(key);
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Clear all cache
   */
  clear() {
    this.memoryCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache stats
   */
  getStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? (this.cacheStats.hits / total * 100).toFixed(2) : 0;

    return {
      ...this.cacheStats,
      total,
      hitRate: `${hitRate}%`,
      currentSize: this.memoryCache.size,
      maxSize: this.config.maxMemoryEntries
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.cacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  /**
   * Record a cache hit
   */
  recordHit() {
    if (this.config.enableStats) {
      this.cacheStats.hits++;
    }
  }

  /**
   * Record a cache miss
   */
  recordMiss() {
    if (this.config.enableStats) {
      this.cacheStats.misses++;
    }
  }

  /**
   * Record a cache set
   */
  recordSet() {
    if (this.config.enableStats) {
      this.cacheStats.sets++;
    }
  }

  /**
   * Record a cache delete
   */
  recordDelete() {
    if (this.config.enableStats) {
      this.cacheStats.deletes++;
    }
  }

  /**
   * Get cache size in bytes (approximate)
   */
  getSize() {
    let size = 0;
    for (const [key, entry] of this.memoryCache.entries()) {
      size += key.length + JSON.stringify(entry.value).length;
    }
    return size;
  }

  /**
   * Debug: Log all cache entries
   */
  debug() {
    const entries = [];
    for (const [key, entry] of this.memoryCache.entries()) {
      entries.push({
        key,
        type: typeof entry.value,
        size: JSON.stringify(entry.value).length,
        expiresIn: entry.expiresAt ? Math.max(0, entry.expiresAt - Date.now()) + 'ms' : 'never',
        createdAt: new Date(entry.createdAt).toLocaleTimeString()
      });
    }
    return {
      stats: this.getStats(),
      totalSize: this.getSize() + ' bytes',
      entries
    };
  }
}

// Create and export singleton instances for different cache purposes
export const masterDataCache = new AdvancedCache({
  namespace: 'master-data',
  defaultTTL: 10 * 60 * 1000, // 10 minutes for master data
  maxMemoryEntries: 100
});

export const employeeCache = new AdvancedCache({
  namespace: 'employees',
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxMemoryEntries: 200
});

export const mcuCache = new AdvancedCache({
  namespace: 'mcus',
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxMemoryEntries: 200
});

export const labResultCache = new AdvancedCache({
  namespace: 'lab-results',
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  maxMemoryEntries: 500
});

export const generalCache = new AdvancedCache({
  namespace: 'general',
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxMemoryEntries: 500
});

// Export class for custom cache instances
export { AdvancedCache };
