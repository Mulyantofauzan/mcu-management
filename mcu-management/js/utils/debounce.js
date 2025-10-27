/**
 * Debounce Utility for MCU Management Application
 * Prevents excessive function calls (e.g., search, API calls)
 */

/**
 * Debounce a function to delay execution until after specified time
 * Useful for search inputs, resize handlers, etc.
 *
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {Function} - Debounced function
 */
export function debounce(func, delay = 300) {
    let timeoutId;

    return function (...args) {
        // Clear previous timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        // Set new timeout
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/**
 * Throttle a function to ensure it's called at most once every specified time
 * Useful for scroll events, window resize, etc.
 *
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds (default: 300)
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit = 300) {
    let inThrottle;

    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;

            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * Create a debounced function with cancel capability
 *
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Object} - { debounced: Function, cancel: Function }
 */
export function createDebouncedFunction(func, delay = 300) {
    let timeoutId;

    const debounced = function (...args) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };

    return {
        debounced,
        cancel: () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    };
}

export default debounce;
