/**
 * Error Handler Utility for MCU Management Application
 * Centralized error handling with proper logging and user feedback
 */

import { logger } from './logger.js';
import { MESSAGES } from '../config/constants.js';

/**
 * Custom Error Classes
 */

export class AppError extends Error {
    constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.timestamp = new Date().toISOString();
    }
}

export class ValidationError extends AppError {
    constructor(message) {
        super(message, 'VALIDATION_ERROR', 400);
        this.name = 'ValidationError';
    }
}

export class NotFoundError extends AppError {
    constructor(message) {
        super(message, 'NOT_FOUND', 404);
        this.name = 'NotFoundError';
    }
}

export class DatabaseError extends AppError {
    constructor(message) {
        super(message, 'DATABASE_ERROR', 500);
        this.name = 'DatabaseError';
    }
}

export class NetworkError extends AppError {
    constructor(message) {
        super(message, 'NETWORK_ERROR', 503);
        this.name = 'NetworkError';
    }
}

export class AuthenticationError extends AppError {
    constructor(message) {
        super(message, 'AUTH_ERROR', 401);
        this.name = 'AuthenticationError';
    }
}

/**
 * Error handler utility object
 */
export const errorHandler = {
    /**
     * Handle validation errors
     */
    handleValidationError: (errors, context = '') => {
        logger.warn(`Validation error${context ? ` in ${context}` : ''}:`, errors);
        throw new ValidationError(
            Array.isArray(errors) ? errors[0] : errors
        );
    },

    /**
     * Handle database errors
     */
    handleDatabaseError: (error, operation = '', context = '') => {
        logger.error(`Database error during ${operation}${context ? ` in ${context}` : ''}:`, error);

        if (error.message?.includes('UNIQUE')) {
            throw new DatabaseError('Data sudah ada. Silakan gunakan data yang berbeda.');
        } else if (error.message?.includes('CHECK')) {
            throw new DatabaseError('Data tidak sesuai dengan constraint database.');
        } else if (error.message?.includes('FOREIGN KEY')) {
            throw new DatabaseError('Data terkait tidak ditemukan.');
        }

        throw new DatabaseError(
            error.message || `Gagal melakukan operasi ${operation}`
        );
    },

    /**
     * Handle network errors
     */
    handleNetworkError: (error, context = '') => {
        logger.error(`Network error${context ? ` in ${context}` : ''}:`, error);

        if (error.message?.includes('timeout')) {
            throw new NetworkError('Koneksi timeout. Periksa koneksi internet Anda.');
        } else if (error.message?.includes('Failed to fetch')) {
            throw new NetworkError('Gagal menghubungi server. Periksa koneksi internet.');
        }

        throw new NetworkError(error.message || MESSAGES.ERROR.NETWORK_ERROR);
    },

    /**
     * Handle authentication errors
     */
    handleAuthError: (error, context = '') => {
        logger.error(`Authentication error${context ? ` in ${context}` : ''}:`, error);
        throw new AuthenticationError('Sesi Anda telah berakhir. Silakan login kembali.');
    },

    /**
     * Safe try-catch wrapper
     */
    tryCatch: async (asyncFn, context = '', fallback = null) => {
        try {
            return await asyncFn();
        } catch (error) {
            errorHandler.logError(error, context);

            if (fallback !== null) {
                logger.info(`Using fallback for ${context}`);
                return fallback;
            }

            throw error;
        }
    },

    /**
     * Log error with full context
     */
    logError: (error, context = '') => {
        const errorInfo = {
            message: error?.message || 'Unknown error',
            code: error?.code || 'UNKNOWN',
            statusCode: error?.statusCode || 500,
            context,
            timestamp: new Date().toISOString(),
            stack: error?.stack
        };

        logger.error(`Error${context ? ` in ${context}` : ''}:`, error);

        // In production, could send to error tracking service
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
            // Example: Sentry.captureException(error);
        }

        return errorInfo;
    },

    /**
     * Get user-friendly error message
     */
    getErrorMessage: (error) => {
        if (error instanceof ValidationError) {
            return error.message;
        } else if (error instanceof NotFoundError) {
            return 'Data tidak ditemukan';
        } else if (error instanceof DatabaseError) {
            return error.message;
        } else if (error instanceof NetworkError) {
            return error.message;
        } else if (error instanceof AuthenticationError) {
            return error.message;
        } else if (error?.message) {
            return error.message;
        }

        return 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.';
    },

    /**
     * Check if error is retryable
     */
    isRetryable: (error) => {
        return error instanceof NetworkError ||
               error?.statusCode === 503 ||
               error?.statusCode === 408 ||
               error?.message?.includes('timeout');
    },

    /**
     * Retry operation with exponential backoff
     */
    retryWithBackoff: async (asyncFn, maxRetries = 3, initialDelay = 1000) => {
        let lastError;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await asyncFn();
            } catch (error) {
                lastError = error;

                // Check if error is retryable
                if (!errorHandler.isRetryable(error)) {
                    throw error;
                }

                // Calculate delay with exponential backoff
                if (attempt < maxRetries - 1) {
                    const delay = initialDelay * Math.pow(2, attempt);
                    logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }
};

/**
 * Global error handler for uncaught errors
 */
if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
        logger.error('Uncaught error:', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
        logger.error('Unhandled promise rejection:', event.reason);
    });
}

export default errorHandler;
