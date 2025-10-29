/**
 * Sidebar Loader - Dynamically loads sidebar from template
 * Usage: Include this script in your page, it will auto-load sidebar
 * Pages can listen for 'sidebarLoaded' event to know when sidebar is ready
 */

async function loadSidebar() {
    try {
        // Determine sidebar template path based on current location
        let sidebarPath = '../templates/sidebar.html';

        // Check if we're in root directory (index.html)
        if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
            sidebarPath = 'templates/sidebar.html';
        }

        // Fetch sidebar template
        const response = await fetch(sidebarPath);
        if (!response.ok) {
            throw new Error(`Failed to load sidebar: ${response.statusText}`);
        }

        const sidebarHTML = await response.text();

        // Find or create sidebar container
        let sidebarContainer = document.getElementById('sidebar');
        if (!sidebarContainer) {
            // Create container if doesn't exist
            sidebarContainer = document.createElement('aside');
            sidebarContainer.id = 'sidebar';
            // Keep sidebar hidden until content is loaded
            sidebarContainer.style.visibility = 'hidden';
            document.body.insertBefore(sidebarContainer, document.body.firstChild);
        }

        // Set sidebar content
        sidebarContainer.innerHTML = sidebarHTML;

        // Initialize sidebar functionality
        initializeSidebar();

        // Show sidebar now that content is loaded
        sidebarContainer.style.visibility = 'visible';

        // Dispatch event to notify pages that sidebar is loaded
        document.dispatchEvent(new CustomEvent('sidebarLoaded', {
            detail: { sidebar: sidebarContainer }
        }));
    } catch (error) {
        console.error('Error loading sidebar:', error);
        // Still show sidebar even on error
        const sidebarContainer = document.getElementById('sidebar');
        if (sidebarContainer) {
            sidebarContainer.style.visibility = 'visible';
        }
        // Still dispatch event even on error so page doesn't hang
        document.dispatchEvent(new CustomEvent('sidebarLoaded', {
            detail: { error: error.message }
        }));
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

    // Try to get user info and set sidebar
    // First check if window.currentUser is available
    let currentUser = window.currentUser;

    // If not available, try to get from auth service (dynamic import)
    if (!currentUser && window.authService) {
        currentUser = window.authService.getCurrentUser();
    }

    // Set user info if available
    if (currentUser) {
        window.currentUser = currentUser; // Store for updateAdminMenuVisibility
        setUserInfo();
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

    const isAdmin = window.currentUser && window.currentUser.role === 'Admin';

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

/**
 * Helper function for pages to wait until sidebar is loaded
 * Usage: await waitForSidebar();
 */
window.waitForSidebar = function() {
    return new Promise((resolve) => {
        // Check if sidebar already loaded
        if (document.getElementById('sidebar') && document.querySelector('.sidebar-link')) {
            resolve();
            return;
        }

        // Wait for sidebarLoaded event
        document.addEventListener('sidebarLoaded', () => {
            resolve();
        }, { once: true });

        // Timeout after 3 seconds just in case (increased to avoid false warnings on slow networks)
        setTimeout(() => {
            console.debug('Sidebar load completed or timeout reached');
            resolve();
        }, 3000);
    });
};

// Auto-load sidebar when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSidebar);
} else {
    loadSidebar();
}
