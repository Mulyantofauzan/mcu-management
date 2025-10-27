/**
 * Validation Utilities for MCU Management Application
 * Provides client-side form validation with user-friendly error messages
 */

/**
 * Validate employee form data
 * @param {Object} data - Employee data to validate
 * @returns {Object} - { isValid: boolean, errors: Array<string> }
 */
export function validateEmployeeForm(data) {
    const errors = [];

    // Validate name
    if (!data.name || data.name.trim().length === 0) {
        errors.push('Nama lengkap harus diisi');
    } else if (data.name.trim().length < 3) {
        errors.push('Nama lengkap minimal 3 karakter');
    } else if (data.name.length > 200) {
        errors.push('Nama lengkap maksimal 200 karakter');
    }

    // Validate job title
    if (!data.jobTitleId) {
        errors.push('Jabatan harus dipilih');
    }

    // Validate department
    if (!data.departmentId) {
        errors.push('Departemen harus dipilih');
    }

    // Validate birthdate
    if (!data.birthDate) {
        errors.push('Tanggal lahir harus diisi');
    } else {
        const birthDate = new Date(data.birthDate);
        const today = new Date();

        // Check if birthdate is in the future
        if (birthDate > today) {
            errors.push('Tanggal lahir tidak boleh di masa depan');
        }

        // Check if age is reasonable (minimum 18, maximum 150)
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 16) {
            errors.push('Karyawan minimal berusia 16 tahun');
        } else if (age > 150) {
            errors.push('Tanggal lahir tidak valid');
        }
    }

    // Validate blood type
    if (!data.bloodType) {
        errors.push('Golongan darah harus dipilih');
    }

    // Validate gender
    if (!data.jenisKelamin) {
        errors.push('Jenis kelamin harus dipilih');
    }

    // Validate employment status
    if (!data.employmentStatus) {
        errors.push('Status karyawan harus dipilih');
    }

    // Validate vendor name if vendor selected
    if (data.employmentStatus === 'Vendor' && (!data.vendorName || data.vendorName.trim().length === 0)) {
        errors.push('Nama vendor harus diisi untuk status Vendor');
    }

    // Validate active status
    if (!data.activeStatus) {
        errors.push('Status aktif harus dipilih');
    }

    // Validate inactive reason if inactive
    if (data.activeStatus === 'Inactive' && (!data.inactiveReason || data.inactiveReason.trim().length === 0)) {
        errors.push('Alasan tidak aktif harus diisi untuk status Inactive');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate MCU form data
 * @param {Object} data - MCU data to validate
 * @returns {Object} - { isValid: boolean, errors: Array<string> }
 */
export function validateMCUForm(data) {
    const errors = [];

    // Validate MCU type
    if (!data.mcuType) {
        errors.push('Jenis MCU harus dipilih');
    }

    // Validate MCU date
    if (!data.mcuDate) {
        errors.push('Tanggal MCU harus diisi');
    } else {
        const mcuDate = new Date(data.mcuDate);
        const today = new Date();

        if (mcuDate > today) {
            errors.push('Tanggal MCU tidak boleh di masa depan');
        }
    }

    // Validate blood pressure format if provided
    if (data.bloodPressure) {
        const bpRegex = /^\d{2,3}\/\d{2,3}$/;
        if (!bpRegex.test(data.bloodPressure)) {
            errors.push('Format tekanan darah harus XXX/YY (contoh: 170/80)');
        }

        // Validate BP ranges
        const [systolic, diastolic] = data.bloodPressure.split('/').map(Number);
        if (systolic < 50 || systolic > 300) {
            errors.push('Tekanan darah sistolik tidak valid (harus 50-300)');
        }
        if (diastolic < 30 || diastolic > 180) {
            errors.push('Tekanan darah diastolik tidak valid (harus 30-180)');
        }
    }

    // Validate RR (Respiratory Rate) if provided
    if (data.respiratoryRate) {
        const rr = parseInt(data.respiratoryRate);
        if (rr < 8 || rr > 60) {
            errors.push('RR (Pernapasan) tidak valid (harus 8-60 /menit)');
        }
    }

    // Validate Pulse if provided
    if (data.pulse) {
        const pulse = parseInt(data.pulse);
        if (pulse < 30 || pulse > 200) {
            errors.push('Nadi tidak valid (harus 30-200 bpm)');
        }
    }

    // Validate temperature if provided
    if (data.temperature) {
        const temp = parseFloat(data.temperature);
        if (temp < 35 || temp > 42) {
            errors.push('Suhu tidak valid (harus 35-42 °C)');
        }
    }

    // Validate BMI if provided
    if (data.bmi) {
        const bmi = parseFloat(data.bmi);
        if (bmi < 10 || bmi > 100) {
            errors.push('BMI tidak valid (harus 10-100)');
        }
    }

    // Validate initial result
    if (!data.initialResult) {
        errors.push('Hasil MCU harus dipilih');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate master data (job title, department)
 * @param {string} name - Name of the master data
 * @param {string} type - Type ('jobTitle' or 'department')
 * @returns {Object} - { isValid: boolean, errors: Array<string> }
 */
export function validateMasterData(name, type) {
    const errors = [];

    if (!name || name.trim().length === 0) {
        errors.push(`Nama ${type === 'jobTitle' ? 'Jabatan' : 'Departemen'} harus diisi`);
    } else if (name.trim().length < 2) {
        errors.push(`Nama minimal 2 karakter`);
    } else if (name.length > 200) {
        errors.push(`Nama maksimal 200 karakter`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Display validation errors to user
 * @param {Array<string>} errors - Array of error messages
 * @param {Function} showToastFn - Function to show toast notifications
 */
export function displayValidationErrors(errors, showToastFn) {
    if (!errors || errors.length === 0) return;

    // Show first error as toast
    if (showToastFn && typeof showToastFn === 'function') {
        showToastFn(errors[0], 'error');
    }

    // Log all errors to console for debugging
    console.warn('Validation errors:', errors);
}

/**
 * Check if value is valid email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Check if value is valid phone number format
 * @param {string} phone - Phone to validate
 * @returns {boolean}
 */
export function isValidPhone(phone) {
    const phoneRegex = /^\+?[\d\s\-()]{7,}$/;
    return phoneRegex.test(phone);
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}
