/**
 * Sidebar Loader - Dynamically loads sidebar from template
 * Usage: Include this script in your page, it will auto-load sidebar
 * Pages can listen for 'sidebarLoaded' event to know when sidebar is ready
 */

async function loadSidebar() {
    try {
        // Determine sidebar template path using different strategies
        let sidebarPath = null;
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*\.html$/, '').replace(/\/$/, '');

        // Try different possible paths
        const possiblePaths = [
            baseUrl + '/templates/sidebar.html',  // For root (index.html)
            baseUrl + '/../templates/sidebar.html', // For pages folder
            '/mcu-management/templates/sidebar.html' // Absolute path
        ];

        let response = null;
        let lastError = null;

        for (const path of possiblePaths) {
            try {
                response = await fetch(path);
                if (response.ok) {
                    sidebarPath = path;
                    break;
                }
            } catch (e) {
                lastError = e;
                // Try next path
                continue;
            }
        }

        if (!response || !response.ok) {
            throw lastError || new Error(`Failed to load sidebar from any path. Tried: ${possiblePaths.join(', ')}`);
        }

        console.debug(`Sidebar loaded from: ${sidebarPath}`);
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
        console.error('Current URL:', window.location.href);
        console.error('Pathname:', window.location.pathname);

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

    if (!window.currentUser) {
        return;
    }

    // Support both 'name' and 'displayName' fields
    const displayName = window.currentUser.displayName || window.currentUser.name || 'User';

    if (userInitialEl && displayName) {
        userInitialEl.textContent = displayName.charAt(0).toUpperCase();
    }
    if (userNameEl) {
        userNameEl.textContent = displayName;
    }
    if (userRoleEl) {
        userRoleEl.textContent = window.currentUser.role || 'Petugas';
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
        // Helper to check if sidebar is properly ready
        function checkSidebarReady() {
            const sidebar = document.getElementById('sidebar');
            const userElements = document.getElementById('user-name') &&
                                document.getElementById('user-role') &&
                                document.getElementById('user-initial');
            const sidebarLinks = document.querySelector('.sidebar-link');

            return sidebar && userElements && sidebarLinks;
        }

        // Check if sidebar already loaded
        if (checkSidebarReady()) {
            console.debug('Sidebar already loaded');
            resolve();
            return;
        }

        // Wait for sidebarLoaded event
        let eventHandler = () => {
            // Double-check sidebar is ready
            if (checkSidebarReady()) {
                console.debug('Sidebar loaded via event');
                resolve();
            } else {
                console.warn('Sidebar event fired but not fully ready, waiting...');
                // Retry after a short delay
                setTimeout(() => {
                    if (checkSidebarReady()) {
                        resolve();
                    } else {
                        // Try one more time after 500ms
                        setTimeout(resolve, 500);
                    }
                }, 100);
            }
        };

        document.addEventListener('sidebarLoaded', eventHandler, { once: true });

        // Timeout after 5 seconds with better error handling
        setTimeout(() => {
            if (checkSidebarReady()) {
                console.debug('Sidebar ready after timeout check');
                resolve();
            } else {
                console.warn('Sidebar timeout - elements may not be fully ready');
                // Still resolve to prevent hanging, but sidebar might be incomplete
                resolve();
            }
        }, 5000);
    });
};

// Auto-load sidebar when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSidebar);
} else {
    loadSidebar();
}
