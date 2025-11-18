/**
 * Logging Utility for MCU Management Application
 * Provides centralized logging with environment-aware output
 * Prevents console spam in production while maintaining debug info in development
 */

// Determine if running in production
const IS_PRODUCTION = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');
const LOG_LEVEL = IS_PRODUCTION ? 'warn' : 'debug';

const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

// Map log level names to priorities
const levelMap = {
    'debug': LogLevel.DEBUG,
    'info': LogLevel.INFO,
    'warn': LogLevel.WARN,
    'error': LogLevel.ERROR
};

// Current log level based on environment
let currentLogLevel = levelMap[LOG_LEVEL] || LogLevel.WARN;

/**
 * Logger object with methods for different log levels
 */
export const logger = {
    /**
     * Log debug message (development only)
     */
    debug: (message, data = null) => {
        if (currentLogLevel <= LogLevel.DEBUG) {
        }
    },

    /**
     * Log info message
     */
    info: (message, data = null) => {
        if (currentLogLevel <= LogLevel.INFO) {
            console.info(`[INFO] ${message}`, data || '');
        }
    },

    /**
     * Log warning message
     */
    warn: (message, data = null) => {
        if (currentLogLevel <= LogLevel.WARN) {
        }
    },

    /**
     * Log error message with stack trace
     */
    error: (message, error = null) => {
        if (currentLogLevel <= LogLevel.ERROR) {
            if (error instanceof Error) {
            } else {
            }
        }
    },

    /**
     * Log API call details
     */
    api: (method, url, status = null, duration = null) => {
        if (currentLogLevel <= LogLevel.DEBUG) {
            const statusColor = status >= 400 ? '❌' : '✅';
            const timing = duration ? ` (${duration}ms)` : '';
        }
    },

    /**
     * Log database operation
     */
    database: (operation, table, count = null) => {
        if (currentLogLevel <= LogLevel.DEBUG) {
            const countInfo = count !== null ? ` - ${count} row(s)` : '';
        }
    },

    /**
     * Log user action
     */
    action: (action, details = null) => {
        if (currentLogLevel <= LogLevel.INFO) {
        }
    },

    /**
     * Log performance metric
     */
    performance: (metric, duration) => {
        if (currentLogLevel <= LogLevel.DEBUG) {
        }
    },

    /**
     * Set log level dynamically
     */
    setLevel: (level) => {
        if (levelMap[level] !== undefined) {
            currentLogLevel = levelMap[level];
            logger.info(`Log level changed to: ${level}`);
        }
    },

    /**
     * Get current log level
     */
    getLevel: () => {
        return Object.keys(levelMap).find(key => levelMap[key] === currentLogLevel);
    },

    /**
     * Enable all logging
     */
    enableAll: () => {
        currentLogLevel = LogLevel.DEBUG;
    },

    /**
     * Disable all logging
     */
    disableAll: () => {
        currentLogLevel = LogLevel.NONE;
    }
};

/**
 * Safe error handler for catching and logging unexpected errors
 */
export function handleError(error, context = '') {
    logger.error(`Unexpected error${context ? ` in ${context}` : ''}:`, error);

    // In production, could send to error tracking service (Sentry, etc)
    if (IS_PRODUCTION && error instanceof Error) {
        // Example: Sentry.captureException(error);
    }
}

export default logger;
