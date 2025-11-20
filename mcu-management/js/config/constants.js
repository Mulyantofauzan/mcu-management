/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers
 */

// ============================================
// UI Constants
// ============================================

export const UI = {
    // Pagination
    ITEMS_PER_PAGE: 10,
    MAX_PAGINATION_PAGES: 5,

    // Debounce delays (ms)
    SEARCH_DEBOUNCE_DELAY: 300,
    RESIZE_THROTTLE_DELAY: 250,

    // Animation durations (ms)
    MODAL_ANIMATION_DURATION: 300,
    TOAST_DURATION: 3000,
    TRANSITION_DURATION: 200,

    // Form validation
    MIN_NAME_LENGTH: 3,
    MAX_NAME_LENGTH: 200,
    MIN_TEXT_LENGTH: 2,
    MAX_TEXT_LENGTH: 500,

    // Dropdown select default
    SELECT_DEFAULT_VALUE: '',
    SELECT_DEFAULT_LABEL: 'Pilih...'
};

// ============================================
// Medical Constants
// ============================================

export const MEDICAL = {
    // Age ranges
    MIN_EMPLOYEE_AGE: 16,
    MAX_EMPLOYEE_AGE: 150,

    // Blood pressure ranges (mmHg)
    BP_SYSTOLIC_MIN: 50,
    BP_SYSTOLIC_MAX: 300,
    BP_DIASTOLIC_MIN: 30,
    BP_DIASTOLIC_MAX: 180,

    // Respiratory rate ranges (/min)
    RR_MIN: 8,
    RR_MAX: 60,

    // Pulse/Heart rate ranges (bpm)
    PULSE_MIN: 30,
    PULSE_MAX: 200,

    // Temperature ranges (°C)
    TEMP_MIN: 35,
    TEMP_MAX: 42,

    // BMI ranges
    BMI_MIN: 10,
    BMI_MAX: 100,

    // Blood types
    BLOOD_TYPES: ['A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],

    // Gender options
    GENDERS: ['Laki-laki', 'Perempuan'],

    // Employment status options
    EMPLOYMENT_STATUS: ['Karyawan PST', 'Vendor'],

    // Active status options
    ACTIVE_STATUS: ['Active', 'Inactive']
};

// ============================================
// Company Constants
// ============================================

export const COMPANY = {
    // Company name for Karyawan PST
    PST_COMPANY_NAME: 'PT. Putra Sarana Transborneo',

    // Default doctor name
    DOCTOR_NAME: 'Dokter FAR PT. PST',

    // Default recipient if not specified
    DEFAULT_RECIPIENT: 'Ts. Dokter Spesialis Penyakit Dalam'
};

// ============================================
// Database Constants
// ============================================

export const DATABASE = {
    // Data batch size for queries
    BATCH_SIZE: 50,

    // Cache duration (ms)
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

    // Request timeout (ms)
    // ✅ CRITICAL: Increased from 30s to 60s to accommodate lab-heavy queries with 700+ results
    REQUEST_TIMEOUT: 60000, // 60 seconds

    // Retry attempts
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000 // 1 second
};

// ============================================
// Date Constants
// ============================================

export const DATE = {
    // Date formats
    FORMAT_DISPLAY: 'DD/MM/YYYY',
    FORMAT_ISO: 'YYYY-MM-DD',
    FORMAT_STORAGE: 'YYYY-MM-DD',

    // Time formats
    FORMAT_TIME: 'HH:mm:ss',
    FORMAT_DATETIME: 'DD/MM/YYYY HH:mm:ss'
};

// ============================================
// Status Constants
// ============================================

export const STATUS = {
    // MCU Result status
    RESULTS: {
        FIT: 'Fit',
        FOLLOW_UP: 'Follow-Up',
        UNFIT: 'Unfit'
    },

    // MCU Status
    MCU_STATUS: {
        INITIAL: 'Initial',
        FOLLOW_UP: 'Follow-Up',
        COMPLETED: 'Completed'
    },

    // Employee active status
    EMPLOYEE_STATUS: {
        ACTIVE: 'Active',
        INACTIVE: 'Inactive'
    }
};

// ============================================
// API/Route Constants
// ============================================

export const ROUTES = {
    DASHBOARD: '/mcu-management/pages/dashboard.html',
    KELOLA_KARYAWAN: '/mcu-management/pages/kelola-karyawan.html',
    TAMBAH_KARYAWAN: '/mcu-management/pages/tambah-karyawan.html',
    FOLLOW_UP: '/mcu-management/pages/follow-up.html'
};

// ============================================
// Feature Flags
// ============================================

export const FEATURES = {
    // Enable/disable features
    ENABLE_PDF_EXPORT: true,
    ENABLE_EXCEL_EXPORT: true,
    ENABLE_ACTIVITY_LOG: true,
    ENABLE_OFFLINE_MODE: true,
    ENABLE_MASTER_DATA_MANAGEMENT: true,

    // Debug features
    ENABLE_DEBUG_MODE: !window.location.hostname.includes('localhost') === false,
    SHOW_PERFORMANCE_METRICS: !window.location.hostname.includes('localhost') === false
};

// ============================================
// Message Constants
// ============================================

export const MESSAGES = {
    // Success messages
    SUCCESS: {
        EMPLOYEE_ADDED: 'Karyawan berhasil ditambahkan',
        EMPLOYEE_UPDATED: 'Data karyawan berhasil diupdate',
        EMPLOYEE_DELETED: 'Karyawan berhasil dihapus',
        MCU_ADDED: 'MCU berhasil ditambahkan',
        MCU_UPDATED: 'Data MCU berhasil diupdate',
        DATA_SAVED: 'Data berhasil disimpan',
        PDF_GENERATED: 'Surat Rujukan siap dicetak. Gunakan Ctrl+S atau Simpan PDF di print dialog.'
    },

    // Error messages
    ERROR: {
        EMPLOYEE_NOT_FOUND: 'Karyawan tidak ditemukan',
        MCU_NOT_FOUND: 'Data MCU tidak ditemukan',
        INVALID_DATA: 'Data tidak valid',
        SAVE_FAILED: 'Gagal menyimpan data',
        LOAD_FAILED: 'Gagal memuat data',
        NETWORK_ERROR: 'Terjadi kesalahan jaringan',
        PERMISSION_DENIED: 'Anda tidak memiliki izin untuk aksi ini'
    },

    // Confirmation messages
    CONFIRM: {
        DELETE_EMPLOYEE: 'Apakah Anda yakin ingin menghapus karyawan ini? Data akan dipindahkan ke Data Terhapus.',
        DELETE_MCU: 'Apakah Anda yakin ingin menghapus MCU ini?',
        LEAVE_PAGE: 'Ada perubahan yang belum disimpan. Apakah Anda yakin ingin meninggalkan halaman ini?'
    }
};

export default {
    UI,
    MEDICAL,
    COMPANY,
    DATABASE,
    DATE,
    STATUS,
    ROUTES,
    FEATURES,
    MESSAGES
};
