/* Tabel rute. Halaman dimuat malas supaya bundel awal kecil. `key` memetakan ke izin peran di roleAccess. */
export const ROUTES = [
  { path: '/', key: 'dashboard', load: () => import('./pages/dashboard/DashboardPage.svelte') },
  { path: '/kelola-karyawan', key: 'kelola-karyawan', load: () => import('./pages/kelola-karyawan/KelolaKaryawanPage.svelte') },
  { path: '/login', key: 'login', public: true, load: () => import('./pages/login/LoginPage.svelte') },
  { path: '*', key: 'not-found', load: () => import('./pages/not-found/NotFoundPage.svelte') }
];
