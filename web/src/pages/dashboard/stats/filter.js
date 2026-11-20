/* Penyaringan model {employee, mcu} untuk Dashboard. */
export const resultOf = mcu => mcu?.finalResult || mcu?.initialResult || '';

export function isDateInRange(date, start, end) {
  if (!date) return false;
  const day = String(date).slice(0, 10);
  if (start && day < start) return false;
  if (end && day > end) return false;
  return true;
}

export function filterModels(models, filters = {}) {
  return models.filter(({ employee, mcu }) => {
    if (!employee || !employee.isActive || employee.deletedAt) return false;
    if (!isDateInRange(mcu?.mcuDate, filters.from, filters.to)) return false;
    if (filters.employeeType && employee.employeeType !== filters.employeeType) return false;
    if (filters.department && employee.department !== filters.department) return false;
    if (filters.mcuStatus && resultOf(mcu) !== filters.mcuStatus) return false;
    return true;
  });
}

export function activeEmployeeCount(models) {
  return models.filter(({ employee }) => employee && !employee.deletedAt && employee.isActive).length;
}

export function isFollowUp(mcu) {
  return resultOf(mcu) === 'Follow-Up' && mcu.finalResult !== 'Fit';
}

/* Aturan daftar Perlu Follow-Up (mcuService.getFollowUpList): hasil awal Follow-Up dan belum selesai. */
export function needsFollowUp(mcu) {
  if (mcu?.initialResult !== 'Follow-Up') return false;
  return !mcu.finalResult || mcu.finalResult === 'Follow-Up';
}
