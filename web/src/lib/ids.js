/* ID karyawan dan MCU. Format sama dengan idGenerator.js lama: PREFIX-YYYYMMDD-waktu(base36)-ACAK5. */
const dateStamp = (now = new Date()) =>
  `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
const random5 = () => Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, '0');

const make = (prefix, now = new Date()) => `${prefix}-${dateStamp(now)}-${now.getTime().toString(36)}-${random5()}`;

export const generateEmployeeId = now => make('EMP', now);
export const generateMcuId = now => make('MCU', now);
