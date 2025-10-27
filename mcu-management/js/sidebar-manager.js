/**
 * Sidebar Manager
 * Handles sidebar consistency across all pages
 * - Auto-highlights current page link
 * - Handles mobile sidebar toggle
 * - Manages permission-based menu visibility
 */

export function initializeSidebar() {
    // Auto-set active link based on current page
    setActiveSidebarLink();

    // Add mobile toggle handler
    setupMobileSidebarToggle();
}

/**
 * Set the active sidebar link based on current page URL
 */
function setActiveSidebarLink() {
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll('.sidebar-link');

    links.forEach(link => {
        const href = link.getAttribute('href');

        // Normalize paths for comparison
        const linkPath = href.replace('.html', '').toLowerCase();
        const currentPagePath = currentPath.replace('.html', '').toLowerCase();

        // Match if current path ends with link path
        if (currentPagePath.endsWith(linkPath) ||
            currentPagePath.includes(linkPath.split('/').pop())) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * Setup mobile sidebar toggle
 */
function setupMobileSidebarToggle() {
    window.toggleMobileSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('hidden-mobile');
        }
    };

    // Close sidebar when clicking on a link (mobile)
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(link => {
        link.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar && window.innerWidth < 768) {
                sidebar.classList.add('hidden-mobile');
            }
        });
    });
}

/**
 * Hide admin-only menu items for non-admin users
 * (This is also in uiHelpers.js, but kept here for sidebar-specific logic)
 */
export function hideAdminMenus(user) {
    if (!user || user.role === 'Admin') return;

    const adminMenus = [
        'menu-kelola-user',
        'menu-activity-log',
        'menu-audit-compliance'
    ];

    adminMenus.forEach(menuId => {
        const element = document.getElementById(menuId);
        if (element) {
            element.style.display = 'none';
        }
    });
}

/**
 * Update user info in sidebar
 */
export function updateUserInfo(user) {
    if (!user) return;

    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');
    const userInitialEl = document.getElementById('user-initial');

    if (userNameEl) {
        userNameEl.textContent = user.displayName || user.username || 'User';
    }
    if (userRoleEl) {
        userRoleEl.textContent = user.role || 'User';
    }
    if (userInitialEl) {
        userInitialEl.textContent = (user.displayName || user.username || 'U').charAt(0).toUpperCase();
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeSidebar);
