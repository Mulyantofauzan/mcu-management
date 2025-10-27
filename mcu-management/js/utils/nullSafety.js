/**
 * Null Safety Utilities for MCU Management Application
 * Provides safe access to deeply nested object properties
 */

/**
 * Safe property accessor using optional chaining-like behavior
 * @param {Object} obj - Object to access
 * @param {string} path - Path to property (e.g., 'user.profile.name')
 * @param {any} defaultValue - Default value if path doesn't exist
 * @returns {any} - Property value or default
 */
export function safeGet(obj, path, defaultValue = null) {
    if (!obj || !path) return defaultValue;

    try {
        const value = path.split('.').reduce((current, prop) => {
            if (current && typeof current === 'object' && prop in current) {
                return current[prop];
            }
            return undefined;
        }, obj);

        return value !== undefined ? value : defaultValue;
    } catch (error) {
        return defaultValue;
    }
}

/**
 * Safely set a deeply nested property
 * @param {Object} obj - Object to modify
 * @param {string} path - Path to property (e.g., 'user.profile.name')
 * @param {any} value - Value to set
 * @returns {Object} - Modified object
 */
export function safeSet(obj, path, value) {
    if (!obj || !path) return obj;

    try {
        const keys = path.split('.');
        const lastKey = keys.pop();

        const target = keys.reduce((current, prop) => {
            if (!(prop in current) || typeof current[prop] !== 'object') {
                current[prop] = {};
            }
            return current[prop];
        }, obj);

        target[lastKey] = value;
        return obj;
    } catch (error) {
        return obj;
    }
}

/**
 * Check if value is null, undefined, or empty string
 * @param {any} value - Value to check
 * @returns {boolean} - True if value is empty
 */
export function isEmpty(value) {
    return value === null || value === undefined || value === '';
}

/**
 * Check if value is not null, undefined, or empty string
 * @param {any} value - Value to check
 * @returns {boolean} - True if value is not empty
 */
export function isNotEmpty(value) {
    return !isEmpty(value);
}

/**
 * Check if value is a valid number
 * @param {any} value - Value to check
 * @returns {boolean} - True if value is valid number
 */
export function isValidNumber(value) {
    return value !== null && value !== undefined && !isNaN(value) && isFinite(value);
}

/**
 * Check if value is a valid date
 * @param {any} value - Value to check
 * @returns {boolean} - True if value is valid date
 */
export function isValidDate(value) {
    return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Safely execute function with null check
 * @param {Function} fn - Function to execute
 * @param {any} defaultReturn - Value to return if function fails
 * @returns {any} - Function result or default
 */
export function safeExecute(fn, defaultReturn = null) {
    try {
        if (typeof fn === 'function') {
            return fn();
        }
        return defaultReturn;
    } catch (error) {
        return defaultReturn;
    }
}

/**
 * Safely access array element
 * @param {Array} arr - Array to access
 * @param {number} index - Index to access
 * @param {any} defaultValue - Default value if index doesn't exist
 * @returns {any} - Array element or default
 */
export function safeArray(arr, index, defaultValue = null) {
    if (!Array.isArray(arr)) return defaultValue;
    return index >= 0 && index < arr.length ? arr[index] : defaultValue;
}

/**
 * Safely find element in array
 * @param {Array} arr - Array to search
 * @param {Function} predicate - Test function
 * @param {any} defaultValue - Default value if not found
 * @returns {any} - Found element or default
 */
export function safeFindInArray(arr, predicate, defaultValue = null) {
    if (!Array.isArray(arr)) return defaultValue;

    try {
        const found = arr.find(predicate);
        return found !== undefined ? found : defaultValue;
    } catch (error) {
        return defaultValue;
    }
}

/**
 * Safely map over array
 * @param {Array} arr - Array to map
 * @param {Function} fn - Map function
 * @returns {Array} - Mapped array or empty array
 */
export function safeMap(arr, fn) {
    if (!Array.isArray(arr)) return [];

    try {
        return arr.map(fn);
    } catch (error) {
        return [];
    }
}

/**
 * Safely filter array
 * @param {Array} arr - Array to filter
 * @param {Function} predicate - Filter function
 * @returns {Array} - Filtered array or empty array
 */
export function safeFilter(arr, predicate) {
    if (!Array.isArray(arr)) return [];

    try {
        return arr.filter(predicate);
    } catch (error) {
        return [];
    }
}

/**
 * Coalesce multiple values, return first non-empty
 * @param {...any} values - Values to check
 * @returns {any} - First non-empty value or null
 */
export function coalesce(...values) {
    for (const value of values) {
        if (isNotEmpty(value)) {
            return value;
        }
    }
    return null;
}

/**
 * Safely parse JSON
 * @param {string} jsonString - JSON string to parse
 * @param {any} defaultValue - Default if parse fails
 * @returns {any} - Parsed object or default
 */
export function safeJsonParse(jsonString, defaultValue = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        return defaultValue;
    }
}

/**
 * Safely stringify object to JSON
 * @param {any} obj - Object to stringify
 * @param {string} defaultValue - Default if stringify fails
 * @returns {string} - JSON string or default
 */
export function safeJsonStringify(obj, defaultValue = '{}') {
    try {
        return JSON.stringify(obj);
    } catch (error) {
        return defaultValue;
    }
}

export default {
    safeGet,
    safeSet,
    isEmpty,
    isNotEmpty,
    isValidNumber,
    isValidDate,
    safeExecute,
    safeArray,
    safeFindInArray,
    safeMap,
    safeFilter,
    coalesce,
    safeJsonParse,
    safeJsonStringify
};
