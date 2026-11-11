/**
 * Decides where data is stored.
 * Browser-only storage (IndexedDB) is a development convenience. In production
 * it would silently keep data on one device, so we refuse instead.
 */

export class StorageUnavailableError extends Error {
  constructor(message = 'Koneksi ke database server tidak tersedia. Muat ulang halaman atau hubungi admin. Data tidak disimpan.') {
    super(message);
    this.name = 'StorageUnavailableError';
    this.code = 'SUPABASE_UNAVAILABLE';
  }
}

export function isLocalEnvironment({ hostname = '', protocol = '' } = {}) {
  return protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1';
}

export function resolveStorageMode({ supabaseEnabled, hostname, protocol }) {
  if (supabaseEnabled) return 'supabase';
  if (isLocalEnvironment({ hostname, protocol })) return 'local';
  throw new StorageUnavailableError();
}
