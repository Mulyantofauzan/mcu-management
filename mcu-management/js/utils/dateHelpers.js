/**
 * Date Helper Utilities
 */

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Format date to DD/MM/YYYY
 */
export function formatDateDisplay(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${day}/${month}/${year}`;
}

/**
 * Format datetime to ISO string
 */
export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate, referenceDate = new Date()) {
  if (!birthDate) return 0;

  const birth = new Date(birthDate);
  const reference = new Date(referenceDate);

  if (isNaN(birth.getTime()) || isNaN(reference.getTime())) return 0;

  let age = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Get current timestamp
 */
export function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Parse date string to Date object
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Check if date is within range
 */
export function isDateInRange(date, startDate, endDate) {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(d.getTime())) return false;

  return d >= start && d <= end;
}

/**
 * Get date range for current month
 */
export function getCurrentMonthRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: formatDate(firstDay),
    endDate: formatDate(lastDay)
  };
}

/**
 * Get date range for last N days
 */
export function getLastNDaysRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  return {
    startDate: formatDate(start),
    endDate: formatDate(end)
  };
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date) {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 7) {
    return formatDateDisplay(d);
  } else if (diffDay > 0) {
    return `${diffDay} hari yang lalu`;
  } else if (diffHour > 0) {
    return `${diffHour} jam yang lalu`;
  } else if (diffMin > 0) {
    return `${diffMin} menit yang lalu`;
  } else {
    return 'Baru saja';
  }
}
