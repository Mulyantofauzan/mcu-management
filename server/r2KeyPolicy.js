/** Object keys the server is willing to sign or delete: only the managed MCU namespace. */

const ID_SEGMENT = /^[A-Za-z0-9._-]{1,128}$/;
const FILE_SEGMENT = /^[^/\\\u0000-\u001f]{1,255}$/;

function isManagedFileKey(key) {
  if (typeof key !== 'string') return false;
  const parts = key.split('/');
  if (parts.length !== 4 || parts[0] !== 'mcu_files') return false;
  const [, employeeId, mcuId, fileName] = parts;
  if ([employeeId, mcuId, fileName].some(part => part === '.' || part === '..')) return false;
  return ID_SEGMENT.test(employeeId) && ID_SEGMENT.test(mcuId) && FILE_SEGMENT.test(fileName);
}

module.exports = { isManagedFileKey };
