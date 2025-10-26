/**
 * Transform Functions - Convert between Supabase (snake_case) and App (camelCase)
 * This file contains all transformation logic for database entities
 */

// Transform User: Supabase → App format
export function transformUser(user) {
    if (!user) return user;
    return {
        id: user.id,
        userId: user.user_id,
        username: user.username,
        passwordHash: user.password_hash,
        displayName: user.display_name,
        role: user.role,
        active: user.active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login
    };
}

// Transform Employee: Supabase → App format
export function transformEmployee(emp) {
    if (!emp) return emp;
    return {
        id: emp.id,
        employeeId: emp.employee_id,
        name: emp.name,
        jenisKelamin: emp.jenis_kelamin || 'Laki-laki',
        jobTitle: emp.job_title,
        department: emp.department,
        dateOfBirth: emp.date_of_birth,
        birthDate: emp.date_of_birth, // alias
        bloodType: emp.blood_type,
        employeeType: emp.employee_type,
        employmentStatus: emp.employee_type, // alias
        vendorName: emp.vendor_name,
        isActive: emp.is_active,
        activeStatus: emp.is_active ? 'Active' : 'Inactive', // alias
        inactiveReason: emp.inactive_reason,
        deletedAt: emp.deleted_at,
        createdAt: emp.created_at,
        updatedAt: emp.updated_at
    };
}

// Transform MCU: Supabase → App format
export function transformMCU(mcu) {
    if (!mcu) return mcu;
    return {
        id: mcu.id,
        mcuId: mcu.mcu_id,
        employeeId: mcu.employee_id,
        mcuType: mcu.mcu_type,
        mcuDate: mcu.mcu_date,
        bmi: mcu.bmi,
        bloodPressure: mcu.blood_pressure,
        respiratoryRate: mcu.respiratory_rate,
        pulse: mcu.pulse,
        temperature: mcu.temperature,
        vision: mcu.vision,
        audiometry: mcu.audiometry,
        spirometry: mcu.spirometry,
        hbsag: mcu.hbsag,
        sgot: mcu.sgot,
        sgpt: mcu.sgpt,
        cbc: mcu.cbc,
        xray: mcu.xray,
        ekg: mcu.ekg,
        treadmill: mcu.treadmill,
        kidneyLiverFunction: mcu.kidney_liver_function,
        napza: mcu.napza,
        recipient: mcu.recipient,
        keluhanUtama: mcu.keluhan_utama,
        diagnosisKerja: mcu.diagnosis_kerja,
        alasanRujuk: mcu.alasan_rujuk,
        initialResult: mcu.initial_result,
        initialNotes: mcu.initial_notes,
        finalResult: mcu.final_result,
        finalNotes: mcu.final_notes,
        status: mcu.status,
        deletedAt: mcu.deleted_at,
        createdAt: mcu.created_at,
        updatedAt: mcu.updated_at,
        createdBy: mcu.created_by,
        updatedBy: mcu.updated_by
    };
}

// Transform MCUChange: Supabase → App format
export function transformMCUChange(change) {
    if (!change) return change;
    return {
        id: change.id,
        mcuId: change.mcu_id,
        fieldName: change.field_name,
        oldValue: change.old_value,
        newValue: change.new_value,
        changedAt: change.changed_at,
        changedBy: change.changed_by
    };
}

// Transform MasterData item: Supabase → App format
// Note: The specific ID field (jobTitleId, departmentId, vendorId) is added by the adapter
export function transformMasterDataItem(item, type) {
    if (!item) return item;
    const transformed = {
        id: item.id,
        name: item.name,
        createdAt: item.created_at
    };

    // Add type-specific ID field for backward compatibility with IndexedDB format
    if (type === 'jobTitle') transformed.jobTitleId = item.id;
    if (type === 'department') transformed.departmentId = item.id;
    if (type === 'vendor') transformed.vendorId = item.id;

    return transformed;
}

// Transform ActivityLog: Supabase → App format
export function transformActivityLog(log) {
    if (!log) return log;
    return {
        id: log.id,
        userId: log.user_id,
        userName: log.user_name,
        action: log.action,
        entityType: log.target, // Map target to entityType (for dashboard backward compat)
        entityId: log.details, // Map details to entityId (for dashboard backward compat)
        target: log.target,
        details: log.details,
        timestamp: log.timestamp
    };
}
