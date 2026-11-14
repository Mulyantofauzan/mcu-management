const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '../..');
const load = relative => import(pathToFileURL(path.join(root, relative)).href);
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('Dokter role is gone: no page opens and there is no home page', async () => {
  const { resolveAccess, PAGE_ROLES } = await load('mcu-management/js/utils/roleAccess.mjs');
  for (const page of Object.keys(PAGE_ROLES)) {
    const result = resolveAccess({ role: 'Dokter', page });
    assert.equal(result.allowed, false, page);
    assert.equal(result.redirectPage, null, page);
  }
});

test('workflow pages are no longer routable', async () => {
  const { PAGE_ROLES } = await load('mcu-management/js/utils/roleAccess.mjs');
  for (const page of ['validasi-mcu', 'profil-dokter', 'keputusan-bergabung']) {
    assert.equal(page in PAGE_ROLES, false, page);
  }
  for (const roles of Object.values(PAGE_ROLES)) {
    for (const role of roles) assert.ok(['Admin', 'Petugas'].includes(role));
  }
});

test('sidebar offers no doctor or workflow menus and no workflow API call', () => {
  const sidebar = read('mcu-management/js/sidebar-manager.js');
  assert.doesNotMatch(sidebar, /Dokter|validasi-mcu|profil-dokter|keputusan-bergabung|api\/workflow/);
});

test('user management and login no longer know the Dokter role', () => {
  assert.doesNotMatch(read('mcu-management/pages/kelola-user.html'), /value="Dokter"/);
  assert.doesNotMatch(read('mcu-management/pages/login.html'), /validasi-mcu/);
  assert.doesNotMatch(read('mcu-management/js/services/authService.js'), /isDoctor/);
  assert.doesNotMatch(read('mcu-management/js/pages/dashboard.js'), /isDoctor/);
});

test('Petugas is kept out of admin-only pages', async () => {
  const { resolveAccess } = await load('mcu-management/js/utils/roleAccess.mjs');
  for (const page of ['kelola-user', 'activity-log', 'data-terhapus']) {
    assert.equal(resolveAccess({ role: 'Petugas', page }).allowed, false, page);
    assert.equal(resolveAccess({ role: 'Admin', page }).allowed, true, page);
  }
  assert.equal(resolveAccess({ role: 'Petugas', page: 'kelola-karyawan' }).allowed, true);
});

test('unknown role or page is denied', async () => {
  const { resolveAccess } = await load('mcu-management/js/utils/roleAccess.mjs');
  assert.equal(resolveAccess({ role: 'Tamu', page: 'dashboard' }).allowed, false);
  assert.equal(resolveAccess({ role: 'Admin', page: 'tidak-ada' }).allowed, false);
});

test('page name is derived from the URL path', async () => {
  const { pageFromPath } = await load('mcu-management/js/utils/roleAccess.mjs');
  assert.equal(pageFromPath('/pages/kelola-karyawan.html'), 'kelola-karyawan');
  assert.equal(pageFromPath('/'), 'dashboard');
  assert.equal(pageFromPath('/index.html'), 'dashboard');
  assert.equal(pageFromPath('/mcu-management/index.html'), 'dashboard');
});

test('every protected page calls guardPage in its own code', async () => {
  const { PAGE_ROLES } = await load('mcu-management/js/utils/roleAccess.mjs');
  const sources = {
    dashboard: ['mcu-management/js/pages/dashboard.js'],
    'kelola-karyawan': ['mcu-management/js/pages/kelola-karyawan.js'],
    'tambah-karyawan': ['mcu-management/js/pages/tambah-karyawan.js'],
    'follow-up': ['mcu-management/js/pages/follow-up.js'],
    'data-master': ['mcu-management/js/pages/data-master.js'],
    'mcu-expiry-management': ['mcu-management/js/pages/mcu-expiry-management.js'],
    'assessment-rahma': ['mcu-management/js/pages/assessment-rahma.js', 'mcu-management/js/pages/assessment-rahma-dashboard.js'],
    analysis: ['mcu-management/pages/analysis.html'],
    'report-period': ['mcu-management/pages/report-period.html'],
    'employee-health-history': ['mcu-management/pages/employee-health-history.html'],
    'kelola-user': ['mcu-management/js/pages/kelola-user.js'],
    'activity-log': ['mcu-management/pages/activity-log.html'],
    'data-terhapus': ['mcu-management/js/pages/data-terhapus.js']
  };
  assert.deepEqual(Object.keys(sources).sort(), Object.keys(PAGE_ROLES).sort());
  for (const [page, files] of Object.entries(sources)) {
    assert.ok(files.some(file => /guardPage\(/.test(read(file))), `${page} must call authService.guardPage()`);
  }
});

test('database policies stop granting Dokter direct data access', () => {
  const sql = read('migrations/20261110_01_restrict_data_access_by_role.sql');
  assert.match(sql, /app_role/);
  assert.match(sql, /'Admin', 'Petugas'/);
  assert.doesNotMatch(sql, /USING \(true\)|WITH CHECK \(true\)/);
});
