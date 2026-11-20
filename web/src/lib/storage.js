/* localStorage yang aman: peramban dapat memblokirnya (mode privat, kebijakan situs). */
export function readStored(key, storage = globalThis.localStorage) {
  try {
    return storage ? storage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function writeStored(key, value, storage = globalThis.localStorage) {
  try {
    if (storage) storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStored(key, storage = globalThis.localStorage) {
  try {
    if (storage) storage.removeItem(key);
  } catch {
    /* diabaikan: tidak ada yang perlu dihapus */
  }
}
