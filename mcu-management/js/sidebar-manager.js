/**
 * Sidebar Manager
 * Handles submenu functionality for sidebar navigation
 */

document.addEventListener('DOMContentLoaded', function() {
  setupSubmenu();
  setupMobileMenu();
});

function setupSubmenu() {
  // Add click handlers to submenu toggles
  const submenuToggles = document.querySelectorAll('[data-toggle-submenu]');

  submenuToggles.forEach(toggle => {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      const submenuId = this.getAttribute('data-toggle-submenu');
      const submenu = document.getElementById(submenuId);
      const arrow = this.querySelector('[data-submenu-arrow]');

      if (submenu) {
        submenu.classList.toggle('hidden');
        if (arrow) {
          arrow.classList.toggle('rotate-180');
        }
      }
    });

    // Expand submenu if current page is in this submenu
    const submenuId = toggle.getAttribute('data-toggle-submenu');
    const submenu = document.getElementById(submenuId);
    if (submenu) {
      const activeLink = submenu.querySelector('.sidebar-link.active');
      if (activeLink) {
        submenu.classList.remove('hidden');
        const arrow = toggle.querySelector('[data-submenu-arrow]');
        if (arrow) {
          arrow.classList.add('rotate-180');
        }
      }
    }
  });
}

function setupMobileMenu() {
  // Add mobile menu toggle if needed
  const sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth < 768) {
    sidebar.classList.add('hidden');
  }
}
