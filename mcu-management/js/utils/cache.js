/**
 * Caching Utility for MCU Management Application
 * Provides in-memory caching with TTL (Time To Live) support
 */

import { logger } from './logger.js';

/**
 * Simple in-memory cache with TTL support
 */
class Cache {
    constructor() {
        this.cache = new Map();
        this.timers = new Map();
    }

    /**
     * Set value in cache with optional TTL
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in milliseconds (0 = no expiry)
     */
    set(key, value, ttl = 0) {
        // Clear existing timer if any
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }

        // Store value
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });

        // Set expiry timer if TTL specified
        if (ttl > 0) {
            const timer = setTimeout(() => {
                this.delete(key);
                logger.debug(`Cache expired for key: ${key}`);
            }, ttl);

            this.timers.set(key, timer);
            logger.debug(`Cached: ${key} (TTL: ${ttl}ms)`);
        } else {
            logger.debug(`Cached: ${key}`);
        }
    }

    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {any} - Cached value or null
     */
    get(key) {
        if (this.cache.has(key)) {
            const entry = this.cache.get(key);
            logger.debug(`Cache hit: ${key}`);
            return entry.value;
        }

        logger.debug(`Cache miss: ${key}`);
        return null;
    }

    /**
     * Check if key exists in cache
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        return this.cache.has(key);
    }

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }

        if (this.cache.has(key)) {
            this.cache.delete(key);
            logger.debug(`Cache cleared: ${key}`);
        }
    }

    /**
     * Clear all cache
     */
    clear() {
        // Clear all timers
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }

        this.timers.clear();
        this.cache.clear();
        logger.info('All cache cleared');
    }

    /**
     * Get cache size
     * @returns {number}
     */
    size() {
        return this.cache.size;
    }

    /**
     * Get all cache keys
     * @returns {Array<string>}
     */
    keys() {
        return Array.from(this.cache.keys());
    }

    /**
     * Get cache statistics
     * @returns {Object}
     */
    stats() {
        return {
            size: this.cache.size,
            keys: this.keys(),
            timers: this.timers.size
        };
    }
}

/**
 * Global cache instance
 */
export const cache = new Cache();

/**
 * Memoize function results with caching
 * @param {Function} fn - Function to memoize
 * @param {string} cacheKeyPrefix - Prefix for cache keys
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Function} - Memoized function
 */
export function memoize(fn, cacheKeyPrefix = 'memo', ttl = 5 * 60 * 1000) {
    return async function (...args) {
        // Create cache key from function name and arguments
        const cacheKey = `${cacheKeyPrefix}:${JSON.stringify(args)}`;

        // Check cache first
        const cached = cache.get(cacheKey);
        if (cached !== null) {
            logger.debug(`Using memoized result for ${cacheKeyPrefix}`);
            return cached;
        }

        // Execute function and cache result
        try {
            const result = await fn.apply(this, args);
            cache.set(cacheKey, result, ttl);
            return result;
        } catch (error) {
            logger.error(`Memoized function error: ${cacheKeyPrefix}`, error);
            throw error;
        }
    };
}

/**
 * Cache wrapper for fetch operations
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise<any>} - Cached or fetched data
 */
export async function cachedFetch(key, fetchFn, ttl = 5 * 60 * 1000) {
    // Check cache first
    const cached = cache.get(key);
    if (cached !== null) {
        return cached;
    }

    // Fetch and cache
    try {
        const data = await fetchFn();
        cache.set(key, data, ttl);
        return data;
    } catch (error) {
        logger.error(`Cached fetch error for ${key}:`, error);
        throw error;
    }
}

/**
 * Batch cache invalidation
 * @param {string} pattern - Pattern for cache keys to delete
 */
export function invalidatePattern(pattern) {
    const keys = cache.keys();
    let count = 0;

    for (const key of keys) {
        if (key.includes(pattern)) {
            cache.delete(key);
            count++;
        }
    }

    logger.info(`Invalidated ${count} cache entries matching pattern: ${pattern}`);
}

export default cache;
