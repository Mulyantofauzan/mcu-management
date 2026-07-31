/**
 * Sidebar Manager
 * Keeps sidebar navigation consistent across all application pages.
 */

function initializeSidebar() {
  normalizeSidebar();
  setActiveLink();
  setupSubmenu();
  setupMobileMenu();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSidebar);
} else {
  initializeSidebar();
}

function normalizeSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebar.setAttribute('aria-label', 'Navigasi utama');

  const layout = sidebar.firstElementChild;
  if (layout) {
    const brand = layout.firstElementChild;
    const nav = layout.querySelector('nav');
    const user = layout.lastElementChild;

    brand?.classList.add('sidebar-brand');
    nav?.classList.add('sidebar-nav');
    user?.classList.add('sidebar-user');
  }

  const reportPages = [
    'assessment-rahma',
    'analysis',
    'report-period',
    'employee-health-history'
  ];
  let reportSubmenu = sidebar.querySelector('#laporan-submenu');

  // Build the canonical report group when an older page still has flat links.
  if (!reportSubmenu) {
    const reportLinks = reportPages
      .map(page => sidebar.querySelector(`.sidebar-link[data-page="${page}"]`))
      .filter(Boolean);

    if (reportLinks.length === reportPages.length) {
      const group = document.createElement('li');
      group.innerHTML = `
        <button type="button" data-toggle-submenu="laporan-submenu" class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition text-left">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <span>Laporan</span>
          <svg data-submenu-arrow class="w-4 h-4 ml-auto transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </button>
        <ul id="laporan-submenu" class="hidden pl-8 space-y-1 mt-1"></ul>
      `;

      const expiryItem = sidebar
        .querySelector('.sidebar-link[data-page="mcu-expiry-management"]')
        ?.closest('li');
      const firstReportItem = reportLinks[0].closest('li');

      if (expiryItem) {
        expiryItem.after(group);
      } else {
        firstReportItem.before(group);
      }

      reportSubmenu = group.querySelector('#laporan-submenu');
      reportLinks.forEach(link => {
        link.querySelector('svg')?.remove();
        reportSubmenu.appendChild(link.closest('li'));
      });
    }
  }

  // Keep only submenu copies when old pages contain duplicate report links.
  if (reportSubmenu) {
    const submenuPages = new Set(
      Array.from(reportSubmenu.querySelectorAll('.sidebar-link[data-page]'))
        .map(link => link.dataset.page)
    );

    sidebar.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
      if (submenuPages.has(link.dataset.page) && !reportSubmenu.contains(link)) {
        link.closest('li')?.remove();
      }
    });
  }

  sidebar.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.remove('text-primary-600', 'border-b-2', 'border-primary-600');
  });

  const logoutButton = sidebar.querySelector('button[onclick*="handleLogout"]');
  if (logoutButton) {
    logoutButton.type = 'button';
    logoutButton.classList.add('sidebar-logout');
    logoutButton.setAttribute('aria-label', 'Keluar dari aplikasi');
    logoutButton.setAttribute('title', 'Keluar');
  }
}

function setActiveLink() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const filename = window.location.pathname.split('/').pop() || 'index.html';
  const currentPage = filename === 'index.html'
    ? 'dashboard'
    : filename.replace(/\.html$/, '');

  sidebar.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
    const isActive = link.dataset.page === currentPage;
    link.classList.toggle('active', isActive);

    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function setupSubmenu() {
  const submenuToggles = document.querySelectorAll('[data-toggle-submenu]');

  submenuToggles.forEach(toggle => {
    if (toggle.dataset.sidebarReady === 'true') return;
    toggle.dataset.sidebarReady = 'true';
    toggle.classList.add('sidebar-submenu-toggle');

    const submenuId = toggle.getAttribute('data-toggle-submenu');
    const submenu = document.getElementById(submenuId);
    const arrow = toggle.querySelector('[data-submenu-arrow]');
    if (!submenu) return;

    submenu.classList.add('sidebar-submenu');
    toggle.setAttribute('aria-controls', submenuId);

    const setExpanded = expanded => {
      submenu.classList.toggle('hidden', !expanded);
      toggle.setAttribute('aria-expanded', String(expanded));
      arrow?.classList.toggle('rotate-180', expanded);
    };

    const activeLink = submenu.querySelector('.sidebar-link.active');
    toggle.classList.toggle('is-active', Boolean(activeLink));
    setExpanded(Boolean(activeLink));

    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
    });
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
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
    </svg>
  `;

  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');

  const setOpen = open => {
    sidebar.classList.toggle('sidebar-open', open);
    backdrop.classList.toggle('is-visible', open);
    document.body.classList.toggle('sidebar-mobile-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Tutup menu navigasi' : 'Buka menu navigasi');
  };

  toggle.addEventListener('click', () => {
    setOpen(!sidebar.classList.contains('sidebar-open'));
  });
  backdrop.addEventListener('click', () => setOpen(false));
  sidebar.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setOpen(false));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) setOpen(false);
  });

  document.body.append(backdrop, toggle);
}
