/**
 * Sidebar Loader - Dynamically loads sidebar from template
 * Usage: Include this script in your page, it will auto-load sidebar
 */

async function loadSidebar() {
    try {
        // Fetch sidebar template
        const response = await fetch('../templates/sidebar.html');
        if (!response.ok) {
            throw new Error(`Failed to load sidebar: ${response.statusText}`);
        }

        const sidebarHTML = await response.text();

        // Find or create sidebar container
        let sidebarContainer = document.getElementById('sidebar');
        if (!sidebarContainer) {
            // Create container if doesn't exist
            sidebarContainer = document.createElement('div');
            sidebarContainer.id = 'sidebar';
            document.body.insertBefore(sidebarContainer, document.body.firstChild);
        }

        // Set sidebar content
        sidebarContainer.innerHTML = sidebarHTML;

        // Initialize sidebar functionality
        initializeSidebar();
    } catch (error) {
        console.error('Error loading sidebar:', error);
    }
}

/**
 * Initialize sidebar functionality
 */
function initializeSidebar() {
    // Set active link based on current page
    const currentPage = getCurrentPageName();
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    sidebarLinks.forEach(link => {
        const page = link.getAttribute('data-page');
        if (page === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Set user info (if available)
    if (window.currentUser) {
        setUserInfo();
    }

    // Set admin-only menus visibility
    if (window.currentUser) {
        updateAdminMenuVisibility();
    }
}

/**
 * Get current page name from URL
 */
function getCurrentPageName() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    const pageName = filename.replace('.html', '');

    // Map filenames to page names
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

    return pageMap[pageName] || pageName;
}

/**
 * Set user info in sidebar
 */
function setUserInfo() {
    const userInitialEl = document.getElementById('user-initial');
    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');

    if (userInitialEl && window.currentUser.name) {
        userInitialEl.textContent = window.currentUser.name.charAt(0).toUpperCase();
    }
    if (userNameEl) {
        userNameEl.textContent = window.currentUser.name || 'User';
    }
    if (userRoleEl) {
        userRoleEl.textContent = window.currentUser.role || 'User';
    }
}

/**
 * Update admin-only menu visibility
 */
function updateAdminMenuVisibility() {
    const kelolaUserMenu = document.getElementById('menu-kelola-user');
    const activityLogMenu = document.getElementById('menu-activity-log');

    const isAdmin = window.currentUser && window.currentUser.role === 'Administrator';

    if (kelolaUserMenu) {
        kelolaUserMenu.style.display = isAdmin ? 'block' : 'none';
    }
    if (activityLogMenu) {
        activityLogMenu.style.display = isAdmin ? 'block' : 'none';
    }
}

/**
 * Handle logout - called from sidebar button
 */
window.handleLogout = async function() {
    try {
        if (confirm('Apa kamu yakin ingin logout?')) {
            // Clear user session
            if (window.authService) {
                await window.authService.logout();
            } else {
                // Fallback if authService not available
                localStorage.removeItem('auth_token');
                sessionStorage.clear();
            }

            // Redirect to login
            window.location.href = '../pages/login.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error: ' + error.message);
    }
};

// Auto-load sidebar when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSidebar);
} else {
    loadSidebar();
}
