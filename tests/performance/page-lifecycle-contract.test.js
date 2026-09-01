const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const productionPages = [
  'mcu-management/index.html',
  ...fs.readdirSync(path.join(root, 'mcu-management/pages'))
    .filter(file => file.endsWith('.html') && !file.startsWith('test-'))
    .map(file => `mcu-management/pages/${file}`)
];

test('every production page exposes an immediate lifecycle shell', () => {
  productionPages.forEach(file => {
    const html = read(file);
    assert.match(html, /<body[^>]*data-page-id="[^"]+"/, `${file}: page id`);
    assert.match(html, /data-lifecycle-region="main"/, `${file}: main region`);
    assert.doesNotMatch(html, /body\s*{[^}]*opacity:\s*0/s, `${file}: hidden body`);
  });
});

test('shared lifecycle supports explicit region states and retry', async () => {
  const source = read('mcu-management/js/utils/pageLifecycleManager.js');
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  const { createPageLifecycle } = await import(moduleUrl);
  const attributes = new Map();
  const element = {
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); },
    querySelector() { return null; }
  };
  const lifecycle = createPageLifecycle('test-page', {
    dispatch() {},
    setTimer: () => 1,
    clearTimer() {}
  });

  lifecycle.registerRegion('main', element);
  lifecycle.setLoading('main');
  assert.equal(attributes.get('data-lifecycle-state'), 'loading');
  lifecycle.setEmpty('main');
  assert.equal(attributes.get('data-lifecycle-state'), 'empty');
  lifecycle.setError('main', new Error('boom'), () => {});
  assert.equal(attributes.get('data-lifecycle-state'), 'error');
  lifecycle.setReady('main');
  assert.equal(attributes.get('data-lifecycle-state'), 'ready');
  lifecycle.destroy();
});

test('shared styles render local lifecycle feedback without covering the page', () => {
  const styles = read('mcu-management/css/sidebar.css');
  assert.match(styles, /\[data-lifecycle-state="loading"\]/);
  assert.match(styles, /\.lifecycle-error/);
  assert.match(styles, /\.lifecycle-retry/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(styles, /\.navigation-startup-overlay[\s\S]{0,300}height:\s*100%/);
});

test('dashboard renders primary data before secondary widgets', () => {
  const source = read('mcu-management/js/pages/dashboard.js');
  const init = source.match(/async function init\(\)[\s\S]*?\n}\n\nfunction updateUserInfo/)?.[0] || '';

  assert.doesNotMatch(init, /unifiedLoading\.show/);
  assert.doesNotMatch(init, /setTimeout\([^)]*150/);
  assert.match(source, /Promise\.allSettled\(\[\s*masterDataService\.getAllDepartments\(\)/);
  assert.match(source, /loadSecondaryDashboard/);
  assert.match(source, /markInteractive\(\)/);
});

test('employee table does not wait for modal-only dependencies', () => {
  const source = read('mcu-management/js/pages/kelola-karyawan.js');
  const init = source.match(/async function init\(\)[\s\S]*?\n}\n\nasync function loadCorrectionQueue/)?.[0] || '';

  assert.doesNotMatch(source, /^import FileUploadWidget|^import \{ StaticLabForm \}/m);
  assert.doesNotMatch(init, /await initLabForms|await populateDiseaseDropdowns|await loadCorrectionQueue/);
  assert.match(source, /Promise\.allSettled\(\[\s*masterDataService\.getAllJobTitles\(\)/);
  assert.match(source, /loadSecondaryData/);
  assert.match(source, /markInteractive\(\)/);
});

test('employee input defers MCU-only support modules', () => {
  const source = read('mcu-management/js/pages/tambah-karyawan.js');

  assert.doesNotMatch(source, /^import FileUploadWidget|^import \{ createLabResultWidget \}/m);
  assert.match(source, /Promise\.allSettled\(\[\s*masterDataService\.getAllJobTitles\(\)/);
  assert.match(source, /loadMcuSupportModules/);
  assert.match(source, /markInteractive\(\)/);
});

test('follow-up list renders before modal support modules', () => {
  const source = read('mcu-management/js/pages/follow-up.js');
  const init = source.match(/async function init\(\)[\s\S]*?\n}\n\nasync function configureWorkflowMode/)?.[0] || '';

  assert.doesNotMatch(source, /^import FileUploadWidget|^import \{ StaticLabForm \}/m);
  assert.doesNotMatch(init, /await initLabForms/);
  assert.match(source, /Promise\.allSettled\(\[\s*employeeService\.getAll\(\)/);
  assert.match(source, /loadFollowUpSupportModules/);
  assert.match(source, /markInteractive\(\)/);
});

test('doctor review defers history until its tab is opened', () => {
  const source = read('mcu-management/js/pages/validasi-mcu.js');

  assert.doesNotMatch(source, /Promise\.all\(\[\s*workflowService\.doctorQueue\(\),\s*workflowService\.reviewHistory\(\)/);
  assert.match(source, /loadHistoryData/);
  assert.match(source, /markInteractive\(\)/);
});

test('workflow list pages expose local readiness', () => {
  const joining = read('mcu-management/js/pages/keputusan-bergabung.js');
  const profile = read('mcu-management/js/pages/profil-dokter.js');

  assert.match(joining, /setLoading\('joining-list'/);
  assert.match(joining, /markInteractive\(\)/);
  assert.match(profile, /setLoading\('doctor-profile'/);
  assert.match(profile, /markInteractive\(\)/);
});

test('administration tables expose local readiness', () => {
  const pages = [
    ['data-master', 'master-data-table'],
    ['kelola-user', 'user-table'],
    ['data-terhapus', 'deleted-data']
  ];

  pages.forEach(([page, region]) => {
    const html = read(`mcu-management/pages/${page}.html`);
    const source = read(`mcu-management/js/pages/${page}.js`);
    assert.match(html, new RegExp(`data-lifecycle-region="${region}"`), `${page}: region`);
    assert.match(source, new RegExp(`setLoading\\('${region}'`), `${page}: loading`);
    assert.match(source, /markInteractive\(\)/, `${page}: interactive`);
  });

  const activity = read('mcu-management/pages/activity-log.html');
  assert.match(activity, /data-lifecycle-region="activity-log"/);
  assert.match(activity, /setLoading\('activity-log'/);
  assert.match(activity, /markInteractive\(\)/);
});

test('independent administration reads start in parallel', () => {
  const deleted = read('mcu-management/js/pages/data-terhapus.js');
  const expiry = read('mcu-management/js/pages/mcu-expiry-management.js');

  assert.match(deleted, /Promise\.all\(\[\s*employeeService\.getDeleted\(\),\s*mcuService\.getDeleted\(\),\s*masterDataService\.getAllJobTitles\(\),\s*masterDataService\.getAllDepartments\(\),\s*employeeService\.getAll\(\)/);
  assert.match(expiry, /const loadTasks = \[this\.loadExpiryData\(\)\]/);
  assert.match(expiry, /if \(this\.isAdmin\) \{[\s\S]*loadTasks\.push\(this\.loadExpirySetting\(\)\)/);
  assert.match(expiry, /await Promise\.all\(loadTasks\)/);
  assert.match(expiry, /setLoading\('expiry-data'/);
  assert.match(expiry, /setLoading\('expiry-setting'/);
});

test('all master data uses the shared five minute cache', () => {
  const cache = read('mcu-management/js/utils/cacheManager.js');
  const master = read('mcu-management/js/services/masterDataService.js');

  assert.match(cache, /DEFAULT_TTL\s*=\s*5 \* 60 \* 1000/);
  assert.match(master, /cacheManager\.get\('statusMCU:all'\)/);
  assert.match(master, /cacheManager\.clear\('statusMCU:all'\)/);
  assert.match(master, /cacheManager\.clear\(`statusMCU:\$\{id\}`\)/);
});

test('report pages expose local readiness while keeping filters visible', () => {
  const analysis = read('mcu-management/pages/analysis.html');
  const period = read('mcu-management/pages/report-period.html');
  const history = read('mcu-management/pages/employee-health-history.html');
  const assessment = read('mcu-management/js/pages/assessment-rahma-dashboard.js');

  assert.match(analysis, /data-lifecycle-region="analysis-data"/);
  assert.match(period, /data-lifecycle-region="report-results"/);
  assert.match(history, /data-lifecycle-region="health-results"/);
  assert.match(assessment, /setLoading\('main'/);
  assert.match(assessment, /markInteractive\(\)/);
});

test('report laboratory reads use the shared bounded batch service', () => {
  const analysis = read('mcu-management/js/services/analysisDashboardService.js');
  const assessment = read('mcu-management/js/pages/assessment-rahma-dashboard.js');
  const exporter = read('mcu-management/js/services/reportExportService.js');

  [analysis, assessment, exporter].forEach(source => {
    assert.match(source, /getPemeriksaanLabByMcuIds\(/);
  });
  assert.doesNotMatch(analysis, /from\('pemeriksaan_lab'\)/);
  assert.doesNotMatch(assessment, /mcuIds\.map\(mcuId\s*=>\s*labService\.getPemeriksaanLabByMcuId/);
  assert.doesNotMatch(exporter, /for \(const mcu of filteredMCUs\)[\s\S]*?await labService\.getPemeriksaanLabByMcuId/);
});

test('report-only assets and data are loaded on demand', () => {
  const history = read('mcu-management/pages/employee-health-history.html');
  const assessment = read('mcu-management/pages/assessment-rahma.html');
  const period = read('mcu-management/pages/report-period.html');

  assert.doesNotMatch(history, /<script[^>]+chart\.umd\.min\.js/);
  assert.match(history, /ensureHealthChart/);
  assert.doesNotMatch(assessment, /<script[^>]+exceljs\.min\.js/);
  assert.match(period, /reportContext/);
  assert.match(period, /Promise\.all\(\[\s*masterDataService\.getAllDepartments\(\),\s*masterDataService\.getAllJobTitles\(\),\s*mcuService\.getAll\(\),\s*employeeService\.getAll\(\)/);
});
