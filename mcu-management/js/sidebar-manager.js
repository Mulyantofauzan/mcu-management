/** Canonical role-aware sidebar for every authenticated MADIS page. */
(function() {
  const icons = Object.freeze({
    home: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10',
    add: 'M15 19a6 6 0 00-12 0m6-8a4 4 0 100-8 4 4 0 000 8zm9-3v6m3-3h-6',
    users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8zm8-1a4 4 0 010 7.75',
    clipboard: 'M9 5h6m-7 0a2 2 0 012-2h4a2 2 0 012 2m-7 0H5v16h14V5h-2m-8 9l2 2 4-4',
    database: 'M4 6c0 2 3.58 3 8 3s8-1 8-3-3.58-3-8-3-8 1-8 3zm0 0v6c0 2 3.58 3 8 3s8-1 8-3V6m-16 6v6c0 2 3.58 3 8 3s8-1 8-3v-6',
    chart: 'M4 19V9m6 10V5m6 14v-7m4 7H2',
    file: 'M7 3h7l5 5v13H7V3zm7 0v5h5M10 13h6m-6 4h6',
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    trash: 'M4 7h16m-10 4v6m4-6v6M9 7l1-3h4l1 3m-9 0 1 14h10l1-14',
    doctor: 'M9 4h6v5a3 3 0 01-6 0V4zm3 8v3a5 5 0 005 5h1m0-3v6m-3-3h6',
    signature: 'M3 17c4-7 6-10 8-10 2 0 0 7 2 7 1 0 3-3 4-3 2 0-1 6 3 6h1',
    decision: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
    settings: 'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm0-12v2m0 13v2m8.5-8.5h-2m-13 0h-2m14.5-6.5-1.5 1.5m-9 9-1.5 1.5m12 0-1.5-1.5m-9-9L6 5.5',
    menu: 'M4 6h16M4 12h16M4 18h16',
    logout: 'M17 16l4-4-4-4m4 4H9m4 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
  });

  const reports = Object.freeze([
    { page: 'assessment-rahma', file: 'assessment-rahma.html', label: 'Jakarta Cardiovascular' },
    { page: 'analysis', file: 'analysis.html', label: 'Analysis' },
    { page: 'report-period', file: 'report-period.html', label: 'Laporan Periode' },
    { page: 'employee-health-history', file: 'employee-health-history.html', label: 'Riwayat Kesehatan' }
  ]);

  const menus = Object.freeze({
    Admin: [
      { page: 'dashboard', file: 'index.html', label: 'Dashboard', icon: 'home' },
      { page: 'tambah-karyawan', file: 'tambah-karyawan.html', label: 'Tambah Karyawan', icon: 'add' },
      { page: 'kelola-karyawan', file: 'kelola-karyawan.html', label: 'Kelola Karyawan', icon: 'users' },
      { page: 'follow-up', file: 'follow-up.html', label: 'Follow-Up', icon: 'clipboard', badge: 'followup' },
      { page: 'data-master', file: 'data-master.html', label: 'Data Master', icon: 'database' },
      { page: 'keputusan-bergabung', file: 'keputusan-bergabung.html', label: 'Keputusan Bergabung', icon: 'decision', badge: 'joining' },
      { page: 'kelola-user', file: 'kelola-user.html', label: 'Kelola User', icon: 'users' },
      { page: 'activity-log', file: 'activity-log.html', label: 'Activity Log', icon: 'file' },
      { page: 'mcu-expiry-management', file: 'mcu-expiry-management.html', label: 'MCU Expired', icon: 'clock', legacyBadge: 'badge-mcu-expiry' },
      { group: 'reports', label: 'Laporan', icon: 'file', children: reports },
      { page: 'data-terhapus', file: 'data-terhapus.html', label: 'Data Terhapus', icon: 'trash' }
    ],
    Petugas: [
      { page: 'dashboard', file: 'index.html', label: 'Dashboard', icon: 'home' },
      { page: 'tambah-karyawan', file: 'tambah-karyawan.html', label: 'Tambah Karyawan', icon: 'add' },
      { page: 'kelola-karyawan', file: 'kelola-karyawan.html', label: 'Kelola Karyawan', icon: 'users', badge: 'correction' },
      { page: 'follow-up', file: 'follow-up.html', label: 'Bukti Follow-Up', icon: 'clipboard', badge: 'followup' },
      { page: 'data-master', file: 'data-master.html', label: 'Data Master', icon: 'database' },
      { page: 'mcu-expiry-management', file: 'mcu-expiry-management.html', label: 'MCU Expired', icon: 'clock', legacyBadge: 'badge-mcu-expiry' },
      { group: 'reports', label: 'Laporan', icon: 'file', children: reports }
    ],
    Dokter: [
      { page: 'validasi-mcu', file: 'validasi-mcu.html', label: 'Validasi MCU', icon: 'doctor', badge: 'review' },
      { page: 'validasi-mcu', file: 'validasi-mcu.html?tab=followup', label: 'Review Follow-Up', icon: 'clipboard' },
      { page: 'validasi-mcu', file: 'validasi-mcu.html?tab=history', label: 'Riwayat Review', icon: 'clock' },
      { page: 'profil-dokter', file: 'profil-dokter.html', label: 'Profil & Tanda Tangan', icon: 'signature' }
    ]
  });

  let currentRole = 'Petugas';
  let counts = {};
  const prefetchedPages = new Set();

  function currentUser() {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch (error) {
      return null;
    }
  }

  function pageHref(file) {
    const inPages = window.location.pathname.includes('/pages/');
    if (file.startsWith('index.html')) return inPages ? `../${file}` : `./${file}`;
    return inPages ? `../pages/${file}` : `./pages/${file}`;
  }

  function uiHelpersHref() {
    return window.location.pathname.includes('/pages/')
      ? '../js/utils/uiHelpers.js'
      : './js/utils/uiHelpers.js';
  }

  function icon(name) {
    return `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${icons[name] || icons.file}"></path></svg>`;
  }

  function badge(name) {
    if (!name) return '';
    const value = Number(counts[name] || 0);
    return `<span class="sidebar-badge${value ? '' : ' hidden'}" data-workflow-badge="${name}">${value}</span>`;
  }

  function menuLink(item, child = false) {
    const oldBadge = item.legacyBadge
      ? `<span class="sidebar-badge" id="${item.legacyBadge}">0</span>`
      : '';
    return `<li><a href="${pageHref(item.file)}" class="sidebar-link flex items-center gap-3 text-gray-700" data-page="${item.page}">${child ? '' : icon(item.icon)}<span>${item.label}</span>${badge(item.badge)}${oldBadge}</a></li>`;
  }

  function menuItem(item) {
    if (!item.group) return menuLink(item);
    const id = `sidebar-${item.group}-submenu`;
    return `<li><button type="button" data-toggle-submenu="${id}" class="sidebar-submenu-toggle"><span class="flex items-center gap-3 flex-1">${icon(item.icon)}<span>${item.label}</span></span><svg data-submenu-arrow class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button><ul id="${id}" class="sidebar-submenu hidden">${item.children.map(child => menuLink(child, true)).join('')}</ul></li>`;
  }

  function renderNavigation() {
    const sidebar = document.getElementById('sidebar');
    const nav = sidebar?.querySelector('nav');
    if (!sidebar || !nav) return;
    const roleMenus = menus[currentRole] || menus.Petugas;
    nav.innerHTML = `<ul class="space-y-1">${roleMenus.map(menuItem).join('')}</ul>`;
    nav.classList.add('sidebar-nav');
    sidebar.setAttribute('aria-label', 'Navigasi utama');
    setActiveLink();
    setupSubmenu();
  }

  function renderUser(user = currentUser()) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const footer = sidebar.firstElementChild?.lastElementChild;
    if (!footer) return;
    const displayName = user?.displayName || user?.username || 'User';
    footer.classList.add('sidebar-user');
    footer.innerHTML = `<div class="flex items-center gap-3"><div class="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center"><span class="text-primary-600 font-semibold" id="user-initial"></span></div><div class="flex-1 min-w-0"><p class="text-sm font-medium text-gray-900" id="user-name"></p><p class="text-xs text-gray-500" id="user-role"></p></div><button type="button" class="sidebar-logout text-gray-400" aria-label="Keluar dari aplikasi" title="Keluar">${icon('logout')}</button></div>`;
    footer.querySelector('#user-initial').textContent = displayName.charAt(0).toUpperCase();
    footer.querySelector('#user-name').textContent = displayName;
    footer.querySelector('#user-role').textContent = currentRole === 'Admin' ? 'Administrator' : currentRole;
    footer.querySelector('.sidebar-logout').addEventListener('click', handleLogout);
  }

  function setActiveLink() {
    const filename = window.location.pathname.split('/').pop() || 'index.html';
    const page = filename === 'index.html' ? 'dashboard' : filename.replace(/\.html$/, '');
    const currentTab = new URLSearchParams(window.location.search).get('tab');
    document.querySelectorAll('#sidebar .sidebar-link').forEach(link => {
      const linkTab = new URL(link.href).searchParams.get('tab');
      const active = link.dataset.page === page && linkTab === currentTab;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function setupSubmenu() {
    document.querySelectorAll('#sidebar [data-toggle-submenu]').forEach(toggle => {
      const submenu = document.getElementById(toggle.dataset.toggleSubmenu);
      const arrow = toggle.querySelector('[data-submenu-arrow]');
      if (!submenu) return;
      const setExpanded = expanded => {
        submenu.classList.toggle('hidden', !expanded);
        toggle.setAttribute('aria-expanded', String(expanded));
        arrow?.classList.toggle('rotate-180', expanded);
      };
      const active = Boolean(submenu.querySelector('.sidebar-link.active'));
      toggle.classList.toggle('is-active', active);
      setExpanded(active);
      toggle.addEventListener('click', () => setExpanded(toggle.getAttribute('aria-expanded') !== 'true'));
    });
  }

  function setupMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || document.querySelector('.sidebar-mobile-toggle')) return;
    sidebar.classList.remove('hidden', 'hidden-mobile');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'sidebar-mobile-toggle';
    toggle.setAttribute('aria-label', 'Buka menu navigasi');
    toggle.setAttribute('aria-controls', 'sidebar');
    toggle.innerHTML = icon('menu');
    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    const setOpen = open => {
      sidebar.classList.toggle('sidebar-open', open);
      backdrop.classList.toggle('is-visible', open);
      document.body.classList.toggle('sidebar-mobile-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('sidebar-open')));
    backdrop.addEventListener('click', () => setOpen(false));
    sidebar.addEventListener('click', event => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') setOpen(false);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768) setOpen(false);
    });
    document.body.append(backdrop, toggle);
  }

  function internalNavigationTarget(event) {
    const link = event.target.closest('#sidebar a.sidebar-link[href]');
    if (!link || link.hasAttribute('download')) return null;
    if (link.target && link.target !== '_self') return null;

    try {
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return null;
      return { link, url };
    } catch (error) {
      return null;
    }
  }

  function prefetchPage(event) {
    const target = internalNavigationTarget(event);
    if (!target || target.url.href === window.location.href) return;
    if (prefetchedPages.has(target.url.href)) return;

    prefetchedPages.add(target.url.href);
    const hint = document.createElement('link');
    hint.rel = 'prefetch';
    hint.href = target.url.href;
    document.head.appendChild(hint);
  }

  function setupNavigationEnhancement() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || sidebar.dataset.navigationReady === 'true') return;
    sidebar.dataset.navigationReady = 'true';

    const progress = document.createElement('div');
    progress.id = 'madis-navigation-progress';
    progress.setAttribute('aria-hidden', 'true');
    progress.innerHTML = '<span></span>';
    document.body.appendChild(progress);

    const clearPending = () => {
      document.body.classList.remove('madis-navigating');
      document.body.removeAttribute('aria-busy');
      progress.setAttribute('aria-hidden', 'true');
    };

    sidebar.addEventListener('pointerover', prefetchPage, { passive: true });
    sidebar.addEventListener('focusin', prefetchPage);
    sidebar.addEventListener('touchstart', prefetchPage, { passive: true });
    sidebar.addEventListener('click', event => {
      const target = internalNavigationTarget(event);
      if (!target || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      document.body.classList.add('madis-navigating');
      document.body.setAttribute('aria-busy', 'true');
      progress.setAttribute('aria-hidden', 'false');
      window.setTimeout(clearPending, 8000);
    });
    window.addEventListener('pageshow', clearPending);
  }

  async function fetchBootstrap() {
    const token = localStorage.getItem('madisAccessToken');
    if (!token) return;
    try {
      const response = await fetch('/api/workflow?action=bootstrap', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      const result = await response.json();
      if (!response.ok || !result?.success) return;
      const serverRole = result.data.role;
      counts = result.data.counts || {};
      if (menus[serverRole]) currentRole = serverRole;
      renderNavigation();
      renderUser();
    } catch (error) {
      // Navigation remains usable from authenticated local session while offline.
    }
  }

  function clearSessionAndRedirect() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('madisAccessToken');
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
    window.location.href = window.location.pathname.includes('/pages/')
      ? 'login.html'
      : 'pages/login.html';
  }

  async function handleLogout() {
    let accepted = false;
    try {
      const { showConfirm } = await import(uiHelpersHref());
      accepted = await showConfirm({
        title: 'Keluar dari MADIS?',
        text: 'Sesi Anda akan diakhiri.',
        confirmButtonText: 'Ya, Keluar',
        destructive: false
      });
    } catch (error) {
      accepted = true;
    }
    if (!accepted) return;
    clearSessionAndRedirect();
  }

  async function initialize() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const layout = sidebar.firstElementChild;
    layout?.firstElementChild?.classList.add('sidebar-brand');
    currentRole = menus[currentUser()?.role] ? currentUser().role : 'Petugas';
    renderNavigation();
    renderUser();
    setupMobileMenu();
    setupNavigationEnhancement();
    document.dispatchEvent(new CustomEvent('madis:sidebar-ready', {
      detail: { role: currentRole }
    }));
    await fetchBootstrap();
  }

  window.MADIS_SIDEBAR = { initialize, renderNavigation };
  window.handleLogout = handleLogout;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
