/* Tabel rute. Halaman dimuat malas supaya bundel awal kecil. `key` memetakan ke izin peran di roleAccess. */
export const ROUTES = [
  { path: '/', key: 'dashboard', load: () => import('./pages/dashboard/DashboardPage.svelte') },
  { path: '/kelola-karyawan', key: 'kelola-karyawan', load: () => import('./pages/kelola-karyawan/KelolaKaryawanPage.svelte') },
  { path: '/tambah-karyawan', key: 'tambah-karyawan', load: () => import('./pages/tambah-karyawan/TambahKaryawanPage.svelte') },
  { path: '/mcu-expiry-management', key: 'mcu-expiry-management', load: () => import('./pages/mcu-expiry/McuExpiryPage.svelte') },
  { path: '/activity-log', key: 'activity-log', load: () => import('./pages/activity-log/ActivityLogPage.svelte') },
  { path: '/follow-up', key: 'follow-up', load: () => import('./pages/follow-up/FollowUpPage.svelte') },
  { path: '/data-terhapus', key: 'data-terhapus', load: () => import('./pages/data-terhapus/DataTerhapusPage.svelte') },
  { path: '/kelola-user', key: 'kelola-user', load: () => import('./pages/kelola-user/KelolaUserPage.svelte') },
  { path: '/login', key: 'login', public: true, load: () => import('./pages/login/LoginPage.svelte') },
  { path: '*', key: 'not-found', load: () => import('./pages/not-found/NotFoundPage.svelte') }
];
