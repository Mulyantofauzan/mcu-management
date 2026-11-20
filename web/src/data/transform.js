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
    respiratoryRate: row.respiratory_rate,
    pulse: row.pulse,
    temperature: row.temperature,
    chestCircumference: row.chest_circumference,
    visionDistantUnaidedLeft: row.vision_distant_unaided_left,
    visionDistantUnaidedRight: row.vision_distant_unaided_right,
    visionDistantSpectaclesLeft: row.vision_distant_spectacles_left,
    visionDistantSpectaclesRight: row.vision_distant_spectacles_right,
    visionNearUnaidedLeft: row.vision_near_unaided_left,
    visionNearUnaidedRight: row.vision_near_unaided_right,
    visionNearSpectaclesLeft: row.vision_near_spectacles_left,
    visionNearSpectaclesRight: row.vision_near_spectacles_right,
    audiometry: row.audiometry,
    spirometry: row.spirometry,
    hbsag: row.hbsag,
    napza: row.napza,
    colorblind: row.colorblind,
    xray: row.xray,
    ekg: row.ekg,
    treadmill: row.treadmill,
    smokingStatus: row.smoking_status,
    exerciseFrequency: row.exercise_frequency,
    doctor: row.doctor,
    recipient: row.recipient,
    keluhanUtama: row.keluhan_utama,
    diagnosisKerja: row.diagnosis_kerja,
    alasanRujuk: row.alasan_rujuk,
    initialResult: row.initial_result,
    initialNotes: row.initial_notes,
    finalResult: row.final_result,
    finalNotes: row.final_notes,
    status: row.status,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
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
  return { id: row.id, mcuId: row.mcu_id, diseaseName: row.disease_name, yearDiagnosed: row.year_diagnosed };
}

export function transformFamilyHistory(row) {
  if (!row) return row;
  return { id: row.id, mcuId: row.mcu_id, diseaseName: row.disease_name, familyMember: row.family_member };
}

export function transformChange(row) {
  if (!row) return row;
  return { id: row.id, mcuId: row.mcu_id, fieldName: row.field_name, oldValue: row.old_value, newValue: row.new_value, changedAt: row.changed_at };
}
