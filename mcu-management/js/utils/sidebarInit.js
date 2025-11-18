/**
 * Sidebar Initialization - Lightweight initialization only
 * Sidebar HTML is INLINED in each page (no dynamic loading = no blinking)
 * This file only initializes sidebar functionality
 */

/**
 * Initialize sidebar when page loads
 * Call this function from each page's init() function
 */
export async function initSidebar() {
    try {

        // Set active link based on current page
        setActiveSidebarLink();

        // Update user info if available
        updateUserInfoDisplay();

        // Update admin menu visibility
        updateAdminMenuVisibility();

    } catch (error) {
    }
}

/**
 * Set active sidebar link based on current page
 */
function setActiveSidebarLink() {
    const currentPageName = getCurrentPageName();
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    sidebarLinks.forEach(link => {
        const dataPage = link.getAttribute('data-page');
        if (dataPage === currentPageName) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

}

/**
 * Get current page name from URL
 */
function getCurrentPageName() {
    const path = window.location.pathname;
    const filename = path.split('/').pop().replace('.html', '');

    const pageMap = {
        '': 'dashboard',
        'index': 'dashboard',
        'tambah-karyawan': 'tambah-karyawan',
        'kelola-karyawan': 'kelola-karyawan',
        'follow-up': 'follow-up',
        'data-master': 'data-master',
        'kelola-user': 'kelola-user',
        'activity-log': 'activity-log',
        'analysis': 'analysis',
        'report-period': 'report-period',
        'employee-health-history': 'employee-health-history',
        'data-terhapus': 'data-terhapus'
    };

    return pageMap[filename] || filename;
}

/**
 * Update sidebar user info display
 */
function updateUserInfoDisplay() {
    // Get user from multiple sources
    let user = window.currentUser;

    if (!user && window.authService) {
        try {
            user = window.authService.getCurrentUser();
        } catch (e) {
        }
    }

    if (!user) {
        return;
    }

    // Store globally
    window.currentUser = user;

    // Get display name with fallbacks
    const displayName = user.displayName || user.name || user.username || 'User';
    const role = user.role || 'Petugas';

    // Update user info elements safely
    const userInitialEl = document.getElementById('user-initial');
    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');

    if (userInitialEl && displayName) {
        userInitialEl.textContent = displayName.charAt(0).toUpperCase();
    }
    if (userNameEl) {
        userNameEl.textContent = displayName;
    }
    if (userRoleEl) {
        userRoleEl.textContent = role;
    }

}

/**
 * Update admin-only menu visibility
 */
function updateAdminMenuVisibility() {
    const user = window.currentUser;
    if (!user) {
        return;
    }

    const isAdmin = user.role === 'Admin' || user.role === 'Administrator';

    const kelolaUserMenu = document.getElementById('menu-kelola-user');
    const activityLogMenu = document.getElementById('menu-activity-log');

    if (kelolaUserMenu) {
        kelolaUserMenu.style.display = isAdmin ? 'block' : 'none';
    }
    if (activityLogMenu) {
        activityLogMenu.style.display = isAdmin ? 'block' : 'none';
    }

    if (isAdmin) {
    }
}

/**
 * Handle logout button click
 */
window.handleLogout = async function() {
    try {
        if (confirm('Apa kamu yakin ingin logout?')) {
            if (window.authService && typeof window.authService.logout === 'function') {
                await window.authService.logout();
            } else {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('currentUser');
                sessionStorage.clear();
            }

            // Redirect to login
            const loginPath = window.location.pathname.includes('/pages/')
                ? '../pages/login.html'
                : './pages/login.html';
            window.location.href = loginPath;
        }
    } catch (error) {
        window.location.href = '../pages/login.html';
    }
};

// Auto-run on page load
window.addEventListener('DOMContentLoaded', initSidebar);
