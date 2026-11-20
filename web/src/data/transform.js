/* Baris database (snake_case) -> objek aplikasi (camelCase). Hanya kolom yang dipakai UI baru. */
export function transformEmployee(row) {
  if (!row) return row;
  return {
    id: row.id,
    employeeId: row.employee_id,
    name: row.name,
    gender: row.jenis_kelamin || 'Laki-laki',
    jobTitleId: row.job_title_id,
    jobTitle: row.job_title,
    departmentId: row.department_id,
    department: row.department,
    birthDate: row.date_of_birth,
    bloodType: row.blood_type,
    employeeType: row.employee_type,
    vendorName: row.vendor_name,
    isActive: row.is_active,
    inactiveReason: row.inactive_reason,
    deletedAt: row.deleted_at,
    createdAt: row.created_at
  };
}

export function transformMcu(row) {
  if (!row) return row;
  return {
    id: row.id,
    mcuId: row.mcu_id,
    employeeId: row.employee_id,
    mcuType: row.mcu_type,
    mcuDate: row.mcu_date,
    bmi: row.bmi,
    bloodPressure: row.blood_pressure,
    smokingStatus: row.smoking_status,
    exerciseFrequency: row.exercise_frequency,
    initialResult: row.initial_result,
    finalResult: row.final_result,
    status: row.status,
    deletedAt: row.deleted_at,
    createdAt: row.created_at
  };
}

export function transformActivity(row) {
  if (!row) return row;
  return {
    id: row.id,
    userName: row.user_name,
    action: row.action,
    target: row.target,
    targetId: row.target_id,
    details: row.details,
    timestamp: row.timestamp
  };
}

export function transformMedicalHistory(row) {
  if (!row) return row;
  return { id: row.id, mcuId: row.mcu_id, diseaseName: row.disease_name };
}
