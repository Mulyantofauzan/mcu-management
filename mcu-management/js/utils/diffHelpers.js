/**
 * Diff Helper Utilities
 * For tracking changes between object versions
 */

import { generateChangeId } from './idGenerator.js';
import { getCurrentTimestamp } from './dateHelpers.js';

/**
 * Compare two values and return if they're different
 */
function isDifferent(oldVal, newVal) {
  // Handle null/undefined
  if (oldVal === null || oldVal === undefined) {
    return newVal !== null && newVal !== undefined;
  }
  if (newVal === null || newVal === undefined) {
    return oldVal !== null && oldVal !== undefined;
  }

  // Handle objects and arrays
  if (typeof oldVal === 'object' && typeof newVal === 'object') {
    return JSON.stringify(oldVal) !== JSON.stringify(newVal);
  }

  // Handle primitive values
  return oldVal !== newVal;
}

/**
 * Get human-readable field names
 */
const fieldLabels = {
  // Employee fields
  name: 'Nama',
  jobTitleId: 'Jabatan',
  departmentId: 'Departemen',
  birthDate: 'Tanggal Lahir',
  employmentStatus: 'Status Karyawan',
  vendorName: 'Nama Vendor',
  activeStatus: 'Status Aktif',
  inactiveReason: 'Alasan Tidak Aktif',
  bloodType: 'Golongan Darah',

  // MCU fields
  mcuType: 'Jenis MCU',
  mcuDate: 'Tanggal MCU',
  bmi: 'BMI',
  bloodPressure: 'Tekanan Darah',
  vision: 'Penglihatan',
  audiometry: 'Audiometri',
  spirometry: 'Spirometri',
  xray: 'X-Ray',
  ekg: 'EKG',
  treadmill: 'Treadmill',
  kidneyLiverFunction: 'Fungsi Ginjal & Hati',
  hbsag: 'HBsAg',
  sgot: 'SGOT',
  sgpt: 'SGPT',
  cbc: 'CBC',
  napza: 'NAPZA',
  initialResult: 'Hasil Awal',
  initialNotes: 'Catatan Awal',
  finalResult: 'Hasil Akhir',
  finalNotes: 'Catatan Akhir',
  status: 'Status'
};

/**
 * Get human-readable field label
 */
export function getFieldLabel(fieldName) {
  return fieldLabels[fieldName] || fieldName;
}

/**
 * Fields to track for MCU changes
 */
const mcuTrackableFields = [
  'mcuType', 'mcuDate', 'bmi', 'bloodPressure', 'vision', 'audiometry',
  'spirometry', 'xray', 'ekg', 'treadmill', 'kidneyLiverFunction',
  'hbsag', 'sgot', 'sgpt', 'cbc', 'napza',
  'initialResult', 'initialNotes', 'finalResult', 'finalNotes', 'status'
];

/**
 * Fields to track for Employee changes
 */
const employeeTrackableFields = [
  'name', 'jobTitleId', 'departmentId', 'birthDate', 'employmentStatus',
  'vendorName', 'activeStatus', 'inactiveReason', 'bloodType'
];

/**
 * Create change entries for differences between old and new MCU
 * Returns array of MCUChange objects
 */
export function diffAndSaveHistory(oldMCU, newMCU, user, mcuId) {
  const changes = [];

  if (!oldMCU || !newMCU) return changes;

  // Check each trackable field
  for (const field of mcuTrackableFields) {
    if (isDifferent(oldMCU[field], newMCU[field])) {
      changes.push({
        changeId: generateChangeId(),
        mcuId: mcuId || newMCU.mcuId,
        changedAt: getCurrentTimestamp(),
        changedBy: user?.userId || user?.username || 'system',
        fieldChanged: field,
        fieldName: field, // Required by Supabase schema
        fieldLabel: getFieldLabel(field),
        oldValue: oldMCU[field],
        newValue: newMCU[field],
        note: null
      });
    }
  }

  return changes;
}

/**
 * Create change entries for employee
 */
export function diffEmployeeChanges(oldEmployee, newEmployee, user, employeeId) {
  const changes = [];

  if (!oldEmployee || !newEmployee) return changes;

  for (const field of employeeTrackableFields) {
    if (isDifferent(oldEmployee[field], newEmployee[field])) {
      changes.push({
        changeId: generateChangeId(),
        employeeId: employeeId || newEmployee.employeeId,
        changedAt: getCurrentTimestamp(),
        changedBy: user?.userId || user?.username || 'system',
        fieldChanged: field,
        fieldLabel: getFieldLabel(field),
        oldValue: oldEmployee[field],
        newValue: newEmployee[field],
        note: null
      });
    }
  }

  return changes;
}

/**
 * Create initial creation change entry
 */
export function createInitialChangeEntry(entityType, entityId, user) {
  return {
    changeId: generateChangeId(),
    [`${entityType}Id`]: entityId,
    changedAt: getCurrentTimestamp(),
    changedBy: user?.userId || user?.username || 'system',
    fieldChanged: 'created',
    fieldName: 'created', // Required by Supabase schema
    fieldLabel: 'Dibuat',
    oldValue: null,
    newValue: 'Record created',
    note: 'Initial creation'
  };
}

/**
 * Format change for display
 */
export function formatChangeForDisplay(change) {
  let oldValueDisplay = change.oldValue;
  let newValueDisplay = change.newValue;

  // Handle null/undefined
  if (oldValueDisplay === null || oldValueDisplay === undefined) {
    oldValueDisplay = '-';
  }
  if (newValueDisplay === null || newValueDisplay === undefined) {
    newValueDisplay = '-';
  }

  // Convert objects to strings
  if (typeof oldValueDisplay === 'object') {
    oldValueDisplay = JSON.stringify(oldValueDisplay);
  }
  if (typeof newValueDisplay === 'object') {
    newValueDisplay = JSON.stringify(newValueDisplay);
  }

  return {
    ...change,
    oldValueDisplay,
    newValueDisplay,
    status: change.oldValue === null ? 'Ditambahkan' : 'Diubah'
  };
}
