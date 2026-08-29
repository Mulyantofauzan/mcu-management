const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const authenticatedPages = [
  'mcu-management/index.html',
  ...fs.readdirSync(path.join(root, 'mcu-management/pages'))
    .filter(file => file.endsWith('.html') && file !== 'login.html')
    .map(file => `mcu-management/pages/${file}`)
];

test('workflow client uses bearer API and deduplicates mutations', () => {
  const source = read('mcu-management/js/services/workflowService.js');
  assert.match(source, /\/api\/workflow/);
  assert.match(source, /Authorization: `Bearer \$\{token\}`/);
  assert.match(source, /pendingMutations/);
  assert.doesNotMatch(source, /setTimeout\([^)]*request/);
});

test('idempotency keys stay in memory', () => {
  const source = read('mcu-management/js/utils/workflowIdempotency.js');
  assert.match(source, /crypto\.randomUUID\(\)/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
});

test('workflow errors have local SweetAlert recovery UI', () => {
  const source = read('mcu-management/js/utils/workflowErrorPresenter.js');
  const helpers = read('mcu-management/js/utils/uiHelpers.js');
  [
    'WORKFLOW_UNAUTHORIZED',
    'WORKFLOW_FORBIDDEN',
    'WORKFLOW_VERSION_CONFLICT',
    'WORKFLOW_VALIDATION_FAILED',
    'WORKFLOW_LOCKED',
    'WORKFLOW_NETWORK_ERROR',
    'WORKFLOW_DOCUMENT_FAILED'
  ].forEach(code => assert.match(source, new RegExp(code)));
  assert.match(helpers, /assets\/vendor\/sweetalert2/);
  assert.doesNotMatch(`${source}\n${helpers}`, /https?:\/\//);
});

test('shared UI helpers own the proportional SweetAlert presentation', () => {
  const helpers = read('mcu-management/js/utils/uiHelpers.js');
  const workflow = read('mcu-management/js/utils/workflowErrorPresenter.js');
  const styles = read('mcu-management/css/alerts.css');

  assert.equal(fs.existsSync(path.join(root, 'mcu-management/assets/vendor/sweetalert2/sweetalert2.all.min.js')), true);
  assert.equal(fs.existsSync(path.join(root, 'mcu-management/assets/vendor/sweetalert2/sweetalert2.min.css')), true);
  assert.match(helpers, /export function ensureAppAlerts/);
  assert.match(helpers, /sweetalert2\.all\.min\.js/);
  assert.match(helpers, /sweetalert2\.min\.css/);
  assert.match(helpers, /alerts\.css/);
  assert.match(helpers, /position:\s*'top-end'/);
  assert.match(helpers, /success:\s*2500/);
  assert.match(helpers, /warning:\s*4500/);
  assert.match(helpers, /export async function showConfirm/);
  assert.match(helpers, /export function confirmDialog/);
  assert.match(workflow, /ensureAppAlerts/);
  assert.match(workflow, /ensureWorkflowAlerts/);
  assert.match(styles, /max-width:\s*440px/);
  assert.match(styles, /max-width:\s*360px/);
  assert.match(styles, /body\.swal2-toast-shown[\s\S]*width:\s*100%/);
  assert.match(styles, /justify-self:\s*center/);
  assert.match(styles, /font-size:\s*10\.4px/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(`${helpers}\n${workflow}`, /https?:\/\//);
});

test('active production paths do not use native browser dialogs', () => {
  const activeFiles = [
    'mcu-management/js/sidebar-manager.js',
    'mcu-management/pages/assessment-rahma.html',
    'mcu-management/js/pages/dashboard.js',
    'mcu-management/js/pages/kelola-user.js',
    'mcu-management/js/components/fileUploadWidget.js',
    'mcu-management/js/services/analysisDashboardService.js'
  ];

  activeFiles.forEach(file => {
    assert.doesNotMatch(read(file), /\b(?:window\.)?(?:alert|confirm)\s*\(/, file);
  });
});

test('MCU upload treats supported files as opaque attachments', () => {
  const widget = read('mcu-management/js/components/fileUploadWidget.js');
  const service = read('mcu-management/js/services/supabaseStorageService.js');
  const serviceWorker = read('mcu-management/sw.js');

  assert.match(widget, /mcuFilePolicy\.mjs/);
  assert.doesNotMatch(widget, /pdfCompression|pdfjs|arrayBuffer\s*\(/i);
  assert.match(service, /\.pdf|\.png|\.jpe?g/i);
  assert.doesNotMatch(serviceWorker, /pdfCompression|pdfjs|pdf-lib/i);
  [
    'mcu-management/js/services/pdfCompressionPolicy.mjs',
    'mcu-management/js/services/pdfCompressionService.js',
    'mcu-management/js/workers/pdfCompressionWorker.mjs'
  ].forEach(file => assert.equal(fs.existsSync(path.join(root, file)), false, file));
});

test('every MCU attachment uses direct upload with immutable modal context', () => {
  const widget = read('mcu-management/js/components/fileUploadWidget.js');
  const service = read('mcu-management/js/services/supabaseStorageService.js');
  const entryPoints = [
    read('mcu-management/js/pages/tambah-karyawan.js'),
    read('mcu-management/js/pages/kelola-karyawan.js'),
    read('mcu-management/js/pages/follow-up.js')
  ];

  assert.match(widget, /Object\.freeze\(\{[\s\S]*employeeId:[\s\S]*mcuId:[\s\S]*userId:/);
  assert.match(widget, /getUploadContext\(\)/);
  assert.match(service, /prepare-file-upload/);
  assert.match(service, /confirm-file-upload/);
  assert.match(service, /rollback-file-upload/);
  assert.doesNotMatch(service, /uploadMultipartFile|new FormData\(/);
  entryPoints.forEach(source => {
    assert.match(source, /getUploadContext\(\)/);
    const calls = [...source.matchAll(/uploadBatchFiles\(([\s\S]*?)\n\s*\);/g)];
    assert.ok(calls.length > 0);
    calls.forEach(([, args]) => {
      assert.match(
        args,
        /^\s*(?:tempFiles|pendingFiles),\s*uploadContext\.employeeId,\s*uploadContext\.mcuId,\s*uploadContext\.userId,/
      );
    });
  });
});

test('Add MCU binds the existing employee ID separately from the generated MCU ID', () => {
  const entryPoints = [
    read('mcu-management/js/pages/tambah-karyawan.js'),
    read('mcu-management/js/pages/kelola-karyawan.js')
  ];

  entryPoints.forEach(source => {
    assert.match(source, /const canonicalEmployeeId = String\([^;]*employeeId/);
    assert.match(source, /addMcuForm\.dataset\.employeeId = canonicalEmployeeId/);
    assert.match(source, /addMcuForm\.dataset\.mcuId = generatedMCUIdForAdd/);
    assert.match(source, /employeeId: canonicalEmployeeId/);
    assert.doesNotMatch(source, /employeeId:\s*generateEmployeeId\(/);
  });
});

test('cancelling follow-up after upload rolls back new attachments', () => {
  const source = read('mcu-management/js/pages/follow-up.js');

  assert.match(source, /closeMCUUpdateModal = async function\(preserveUploads = false\)/);
  assert.match(source, /deleteOrphanedFiles\(\s*pendingChanges\.uploadResults,\s*pendingChanges\.uploadContext/);
  assert.match(source, /closeMCUUpdateModal\(true\)/);
});

test('both Add MCU handlers use guarded form-scoped field reads', () => {
  const reader = read('mcu-management/js/utils/mcuFormReader.js');
  const addEmployee = read('mcu-management/js/pages/tambah-karyawan.js');
  const manageEmployee = read('mcu-management/js/pages/kelola-karyawan.js');

  assert.match(reader, /form\.querySelector/);
  assert.match(reader, /MCU_FORM_FIELD_MISSING/);
  [addEmployee, manageEmployee].forEach(source => {
    assert.match(source, /createMcuFormReader\(submitForm\)/);
    assert.doesNotMatch(source, /document\.getElementById\('mcu-doctor'\)\.value/);
  });
});

test('every guarded Add MCU field exists inside its submitted form', () => {
  [
    ['mcu-management/js/pages/tambah-karyawan.js', 'mcu-management/pages/tambah-karyawan.html'],
    ['mcu-management/js/pages/kelola-karyawan.js', 'mcu-management/pages/kelola-karyawan.html']
  ].forEach(([sourceFile, pageFile]) => {
    const source = read(sourceFile);
    const page = read(pageFile);
    const form = page.match(/<form id="mcu-form"[\s\S]*?<\/form>/)?.[0] || '';
    const fieldIds = new Set(
      [...source.matchAll(/readField\('([^']+)'\)/g)].map(match => match[1])
    );

    assert.ok(fieldIds.size > 0, `${sourceFile} must read MCU fields`);
    fieldIds.forEach(fieldId => {
      assert.match(form, new RegExp(`id=["']${fieldId}["']`), `${pageFile}: ${fieldId}`);
    });
  });
});

test('canonical MCU ordering keeps persistent fields outside dynamic lab containers', () => {
  const order = read('mcu-management/js/utils/mcuFormOrder.js');
  const pages = [
    'mcu-management/pages/tambah-karyawan.html',
    'mcu-management/pages/kelola-karyawan.html',
    'mcu-management/pages/follow-up.html'
  ];

  assert.match(order, /data-mcu-target="laboratory-static"/);
  assert.match(order, /appendField\(form, '-hbsag', labStatic\)/);
  assert.match(order, /appendField\(form, '-napza', labStatic\)/);
  assert.doesNotMatch(order, /appendField\(form, '-(?:hbsag|napza)', lab\)/);

  pages.forEach(pageFile => {
    const page = read(pageFile);
    const forms = [...page.matchAll(/<form[^>]*data-mcu-canonical-order[\s\S]*?<\/form>/g)];
    assert.ok(forms.length > 0, `${pageFile} must have a canonical MCU form`);
    forms.forEach(({ 0: form }) => {
      assert.match(form, /data-mcu-target="laboratory"/);
      assert.match(form, /data-mcu-target="laboratory-static"/);
    });
  });
});

test('doctor signature upload uses a contextual storage error title', () => {
  const presenter = read('mcu-management/js/utils/workflowErrorPresenter.js');
  const profile = read('mcu-management/js/pages/profil-dokter.js');
  assert.match(presenter, /handlers\.presentation/);
  assert.match(profile, /error\?\.code === 'WORKFLOW_DOCUMENT_FAILED'[\s\S]*Penyimpanan TTD Belum Siap/);
});

test('sidebar has one canonical role-aware menu definition', () => {
  const source = read('mcu-management/js/sidebar-manager.js');
  const styles = read('mcu-management/css/sidebar.css');
  assert.match(source, /Admin:/);
  assert.match(source, /Petugas:/);
  assert.match(source, /Dokter:/);
  assert.match(source, /keputusan-bergabung\.html/);
  assert.match(source, /validasi-mcu\.html/);
  assert.match(source, /\/api\/workflow\?action=bootstrap/);
  assert.match(source, /class="sidebar-logout/);
  assert.match(source, /aria-label="Keluar dari aplikasi"/);
  assert.match(styles, /\.sidebar \.sidebar-logout svg\s*{[\s\S]*width:\s*1\.125rem;[\s\S]*height:\s*1\.125rem;/);
  assert.doesNotMatch(read('mcu-management/js/utils/sidebarInit.js'), /pageMap|menu-kelola-user/);
});

test('sidebar owns the only active logout handler', () => {
  const sidebar = read('mcu-management/js/sidebar-manager.js');
  const styles = read('mcu-management/css/sidebar.css');
  const pageSources = [
    ...fs.readdirSync(path.join(root, 'mcu-management/js/pages'))
      .filter(file => file.endsWith('.js'))
      .map(file => read(`mcu-management/js/pages/${file}`)),
    ...authenticatedPages.map(read)
  ].join('\n');

  assert.match(sidebar, /addEventListener\('click', handleLogout\)/);
  assert.match(sidebar, /clearSessionAndRedirect/);
  assert.match(styles, /\.sidebar \.sidebar-logout\s*{[\s\S]*cursor:\s*pointer;/);
  assert.doesNotMatch(pageSources, /window\.handleLogout\s*=/);
});

test('Administrator can use Petugas MCU entry and follow-up forms', () => {
  const addEmployee = read('mcu-management/js/pages/tambah-karyawan.js');
  const manageEmployee = read('mcu-management/js/pages/kelola-karyawan.js');
  const followUp = read('mcu-management/js/pages/follow-up.js');

  assert.match(addEmployee, /\['Admin', 'Petugas'\]\.includes\(bootstrap\.role\)/);
  assert.match(manageEmployee, /authService\.hasRole\('Admin', 'Petugas'\)/);
  assert.match(followUp, /\['Admin', 'Petugas'\]\.includes\(bootstrap\.role\)/);
  [addEmployee, manageEmployee, followUp].forEach(source => {
    assert.doesNotMatch(source, /role !== 'Petugas'/);
  });
});

test('menu navigation progressively enhances native links', () => {
  const source = read('mcu-management/js/sidebar-manager.js');
  const styles = read('mcu-management/css/sidebar.css');
  assert.match(source, /rel = 'prefetch'/);
  assert.match(source, /classList\.add\('madis-navigating'\)/);
  assert.match(source, /event\.(metaKey|ctrlKey)/);
  assert.doesNotMatch(source, /preventDefault\(\)|spaRouter/);
  assert.match(styles, /@view-transition\s*{\s*navigation:\s*auto/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});

test('authenticated pages never hide the whole document during startup', () => {
  authenticatedPages.forEach(file => {
    const html = read(file);
    assert.doesNotMatch(html, /body\s*{[^}]*opacity:\s*0/s, file);
    assert.doesNotMatch(html, /body:not\(\.initialized\)\s*>\s*\*/s, file);
    assert.doesNotMatch(html, /@keyframes\s+safariShow/, file);
  });
});

test('user management exposes canonical doctor role', () => {
  const html = read('mcu-management/pages/kelola-user.html');
  const auth = read('mcu-management/js/services/authService.js');
  assert.match(html, /value="Dokter"/);
  assert.match(html, /value="Admin">Administrator/);
  assert.match(auth, /isDoctor\(\)/);
});

test('doctor login lands in the restricted clinical workspace', () => {
  const login = read('mcu-management/pages/login.html');
  const dashboard = read('mcu-management/js/pages/dashboard.js');
  assert.match(login, /user\?\.role === 'Dokter' \? 'validasi-mcu\.html'/);
  assert.match(dashboard, /authService\.isDoctor\(\)/);
  assert.match(dashboard, /location\.replace\('pages\/validasi-mcu\.html'\)/);
});

test('workflow auth does not eagerly load database CDN', () => {
  const auth = read('mcu-management/js/services/authService.js');
  assert.doesNotMatch(auth, /^import \{ database \}/m);
  assert.match(auth, /import\('\.\/database\.js'\)/);
});

test('WhatsApp summary uses approved review and excludes raw labs', () => {
  const source = read('mcu-management/js/utils/whatsappShare.js');
  assert.match(source, /approvedCycle/);
  assert.match(source, /Hasil:/);
  assert.match(source, /Catatan:/);
  assert.match(source, /Dokter:/);
  assert.doesNotMatch(source, /labs|pemeriksaan_lab|SGOT|SGPT/);
  assert.match(source, /web\.whatsapp\.com/);
});

test('MCU entry separates examiner metadata from doctor decision', () => {
  const page = read('mcu-management/pages/tambah-karyawan.html');
  const source = read('mcu-management/js/pages/tambah-karyawan.js');
  assert.match(page, /Dokter Pemeriksa \/ Sumber Data/);
  assert.match(page, /workflow-review-notice/);
  assert.match(source, /initialResult: workflowEnabled \? null/);
  assert.match(source, /submit-review/);
  assert.match(source, /Menunggu review dokter/);
  assert.match(source, /const savedDraft = workflowEnabled/);
  assert.match(source, /workflowStatus !== 'draft'/);
});

test('correction and periodic MCU paths submit raw data for doctor review', () => {
  const source = read('mcu-management/js/pages/kelola-karyawan.js');
  const page = read('mcu-management/pages/kelola-karyawan.html');
  assert.match(source, /\['draft', 'correction_required'\]\.includes\(item\.workflow_status\)/);
  assert.match(source, /delete updateData\.initialResult/);
  assert.match(source, /submitMCUForReview/);
  assert.match(source, /resumeDraftReview/);
  assert.match(source, /Menunggu review dokter/);
  assert.match(page, /workflow-correction-section/);
  assert.match(page, /edit-medical-result-section/);
});

test('inactive employee toggle anchors to the filter card', () => {
  const source = read('mcu-management/js/pages/kelola-karyawan.js');
  assert.match(source, /getElementById\('filter-department'\)\?\.closest\('\.card'\)/);
  assert.match(source, /filterCard\.insertAdjacentElement\('afterend', toggleBtn\)/);
  assert.doesNotMatch(source, /querySelectorAll\('\.card'\)/);
  assert.doesNotMatch(source, /insertBefore\(toggleBtn, tableCard\)/);
});

test('follow-up path submits evidence without a petugas medical result', () => {
  const source = read('mcu-management/js/pages/follow-up.js');
  assert.match(source, /evidenceNotes: followUpData\.evidenceNotes/);
  assert.match(source, /attachmentFileIds:[\s\S]{0,180}result\.fileId/);
  assert.doesNotMatch(source, /attachmentFileIds: \[\]/);
  assert.match(source, /if \(!workflowEnabled\)[\s\S]{0,500}mergedUpdateData\.finalResult/);
  assert.match(source, /Bukti follow-up dikirim untuk review dokter/);
});

test('analytics pages use the centralized eligibility service', () => {
  const service = read('mcu-management/js/services/analyticsEligibilityService.js');
  assert.match(service, /v_analytics_eligible_current/);
  assert.match(service, /v_reviewed_mcu_history/);
  assert.match(service, /v_mcu_expiry_overview/);
  assert.match(read('mcu-management/js/pages/dashboard.js'), /analyticsEligibilityService\.getCurrentModels/);
  assert.match(read('mcu-management/js/services/analysisDashboardService.js'), /analyticsEligibilityService\.getCurrentData/);
  assert.match(read('mcu-management/js/pages/assessment-rahma-dashboard.js'), /analyticsEligibilityService\.getCurrentModels/);
  assert.doesNotMatch(read('mcu-management/js/services/mcuExpiryService.js'), /expiryPeriodDays|setDate\(/);
});

test('expiry impact is recomputed by server before update', () => {
  const service = read('server/workflow/workflowService.js');
  assert.match(service, /const impact = await this\.getExpiryPreview\(payload, user\)/);
  assert.match(service, /p_impact: impact/);
  assert.doesNotMatch(service, /p_impact: payload\.impact/);
});

test('doctor review exposes clinical evidence and post-approval sharing', () => {
  const source = read('mcu-management/js/pages/validasi-mcu.js');
  assert.match(source, /labReference/);
  assert.match(source, /medicalHistories/);
  assert.match(source, /priorMcus/);
  assert.match(source, /downloadFile/);
  assert.match(source, /shareApprovedReview/);
  assert.match(source, /Bagikan ke WhatsApp/);
});

test('new workflow pages do not use raw browser alerts', () => {
  [
    'mcu-management/js/pages/validasi-mcu.js',
    'mcu-management/js/pages/keputusan-bergabung.js',
    'mcu-management/js/pages/profil-dokter.js',
    'mcu-management/js/pages/mcu-expiry-management.js'
  ].forEach(file => assert.doesNotMatch(read(file), /\balert\s*\(/, `${file} must use workflow error UI`));
});

test('joining decisions use server pagination for both tabs', () => {
  const page = read('mcu-management/pages/keputusan-bergabung.html');
  const source = read('mcu-management/js/pages/keputusan-bergabung.js');
  const service = read('mcu-management/js/services/workflowService.js');

  assert.match(page, /id="joining-pagination"/);
  assert.match(source, /const PAGE_SIZE = 10/);
  assert.match(source, /workflowService\.joiningQueue\(tab === 'history', \{ page, pageSize: PAGE_SIZE \}\)/);
  assert.match(source, /loadData\(tab, 1\)/);
  assert.match(source, /workflow-pagination-info/);
  assert.doesNotMatch(source, /Promise\.all\(\[\s*workflowService\.joiningQueue/);
  assert.match(service, /joiningQueue\(history = false, pagination = \{\}\)/);
});

test('quick Add MCU delegates to canonical form initialization', () => {
  const source = read('mcu-management/js/pages/tambah-karyawan.js');
  const quickAdd = source.match(/async function handleQuickMCUAdd[\s\S]*?\n}\n\nwindow\.handleSearch/)?.[0] || '';

  assert.match(quickAdd, /await window\.openAddMCUForEmployee\(employeeId\)/);
  assert.doesNotMatch(quickAdd, /\.reset\(|\.from\('employees'\)/);
  assert.match(source, /addMcuForm\.reset\(\);[\s\S]*addMcuForm\.dataset\.employeeId = canonicalEmployeeId/);
});

test('production pages do not depend on third-party CDN assets', () => {
  const productionFiles = [
    'mcu-management/index.html',
    'mcu-management/css/input.css',
    'mcu-management/css/output.css',
    ...fs.readdirSync(path.join(root, 'mcu-management/pages'))
      .filter(name => name.endsWith('.html') && !name.startsWith('test-'))
      .map(name => `mcu-management/pages/${name}`)
  ];

  const externalAssetHosts = /cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/;
  productionFiles.forEach(file => {
    assert.doesNotMatch(read(file), externalAssetHosts, `${file} must use local assets`);
  });

  const csp = read('vercel.json');
  assert.doesNotMatch(csp, /cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(csp, /connect-src[^;]*https:\/\/madis-private-documents\.[a-f0-9]{32}\.r2\.cloudflarestorage\.com/);
});

test('production HTML and service-worker asset references exist locally', () => {
  const appRoot = path.join(root, 'mcu-management');
  const htmlFiles = [
    'mcu-management/index.html',
    ...fs.readdirSync(path.join(appRoot, 'pages'))
      .filter(name => name.endsWith('.html') && !name.startsWith('test-'))
      .map(name => `mcu-management/pages/${name}`)
  ];

  for (const file of htmlFiles) {
    const fullPath = path.join(root, file);
    for (const match of read(file).matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      const reference = match[1].split(/[?#]/)[0];
      if (!reference || /^(?:https?:|data:|mailto:|tel:|javascript:)/.test(reference)) continue;
      const target = reference.startsWith('/')
        ? path.join(appRoot, reference)
        : path.resolve(path.dirname(fullPath), reference);
      assert.equal(fs.existsSync(target), true, `${file} references missing ${reference}`);
    }
  }

  const serviceWorker = read('mcu-management/sw.js');
  const staticBlock = serviceWorker.match(/const STATIC_ASSETS = \[([\s\S]*?)\];/)?.[1] || '';
  for (const match of staticBlock.matchAll(/'([^']+)'/g)) {
    const reference = match[1];
    const target = reference === '/' ? path.join(appRoot, 'index.html') : path.join(appRoot, reference);
    assert.equal(fs.existsSync(target), true, `sw.js references missing ${reference}`);
  }
});
