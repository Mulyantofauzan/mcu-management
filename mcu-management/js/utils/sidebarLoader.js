/**
 * Sidebar Loader - Dynamically loads sidebar from template
 * This script handles all sidebar loading and coordination with module pages
 */

// Global state tracking
let sidebarLoadingPromise = null;
let sidebarLoaded = false;

/**
 * Main sidebar loading function
 */
async function loadSidebar() {
    // If already loading or loaded, return the promise
    if (sidebarLoadingPromise) {
        return sidebarLoadingPromise;
    }

    if (sidebarLoaded) {
        return Promise.resolve();
    }

    // Create the loading promise
    sidebarLoadingPromise = (async () => {
        try {
            console.debug('[Sidebar] Starting sidebar load...');

            // Determine sidebar template path
            let sidebarPath = await findSidebarPath();
            if (!sidebarPath) {
                throw new Error('Could not locate sidebar template');
            }

            console.debug(`[Sidebar] Loading from: ${sidebarPath}`);

            // Fetch sidebar HTML
            const response = await fetch(sidebarPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch sidebar: ${response.status} ${response.statusText}`);
            }

            const sidebarHTML = await response.text();
            if (!sidebarHTML || sidebarHTML.trim().length === 0) {
                throw new Error('Sidebar template is empty');
            }

            // Inject sidebar into DOM
            await injectSidebar(sidebarHTML);

            // Initialize sidebar functionality
            initializeSidebarFunctionality();

            // Mark as loaded
            sidebarLoaded = true;
            console.debug('[Sidebar] Sidebar loaded successfully');

            // Dispatch event for legacy code
            document.dispatchEvent(new CustomEvent('sidebarLoaded', {
                detail: { success: true }
            }));

            return true;
        } catch (error) {
            console.error('[Sidebar] Error loading sidebar:', error);
            console.error('[Sidebar] Current URL:', window.location.href);

            // Show sidebar anyway, dispatch error event
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.style.visibility = 'visible';
            }

            document.dispatchEvent(new CustomEvent('sidebarLoaded', {
                detail: { success: false, error: error.message }
            }));

            sidebarLoaded = true; // Mark as loaded even on error to prevent hanging
            return false;
        }
    })();

    return sidebarLoadingPromise;
}

/**
 * Find sidebar template path using multiple strategies
 */
async function findSidebarPath() {
    const currentPath = window.location.pathname;
    const isAtRoot = currentPath === '/' || currentPath.endsWith('index.html');
    const isInPages = currentPath.includes('/pages/');

    // Generate possible paths
    const possiblePaths = [];

    if (isAtRoot) {
        // From root: /index.html -> /templates/sidebar.html
        possiblePaths.push(window.location.origin + '/templates/sidebar.html');
        possiblePaths.push('/templates/sidebar.html');
    } else if (isInPages) {
        // From pages: /pages/kelola-karyawan.html -> /templates/sidebar.html
        possiblePaths.push(window.location.origin + '/templates/sidebar.html');
        possiblePaths.push('/templates/sidebar.html');
        possiblePaths.push(window.location.origin + '/pages/../templates/sidebar.html');
        possiblePaths.push('../templates/sidebar.html');
    }

    // Add mcu-management specific path for Cloudflare Pages
    possiblePaths.push('/mcu-management/templates/sidebar.html');

    // Try each path
    for (const path of possiblePaths) {
        try {
            const response = await fetch(path, { method: 'HEAD' });
            if (response.ok) {
                console.debug(`[Sidebar] Found sidebar at: ${path}`);
                return path;
            }
        } catch (e) {
            // Continue to next path
        }
    }

    // If HEAD doesn't work, try GET on each path
    for (const path of possiblePaths) {
        try {
            const response = await fetch(path);
            if (response.ok) {
                console.debug(`[Sidebar] Found sidebar at: ${path}`);
                return path;
            }
        } catch (e) {
            // Continue to next path
        }
    }

    console.error(`[Sidebar] Could not find sidebar at any of these paths:`, possiblePaths);
    return null;
}

/**
 * Inject sidebar into DOM
 */
async function injectSidebar(html) {
    // Find or create sidebar container
    let sidebarContainer = document.getElementById('sidebar');

    if (!sidebarContainer) {
        sidebarContainer = document.createElement('aside');
        sidebarContainer.id = 'sidebar';
        document.body.insertBefore(sidebarContainer, document.body.firstChild);
    }

    // Hide sidebar until ready
    sidebarContainer.style.visibility = 'hidden';

    // Inject HTML
    sidebarContainer.innerHTML = html;

    // Wait for next frame to ensure DOM is updated
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Show sidebar
    sidebarContainer.style.visibility = 'visible';
}

/**
 * Initialize sidebar functionality after HTML is injected
 */
function initializeSidebarFunctionality() {
    try {
        // Set active link
        setActiveSidebarLink();

        // Set user info if available
        updateSidebarUserInfo();

        // Update menu visibility
        updateAdminMenuVisibility();
    } catch (error) {
        console.error('[Sidebar] Error initializing sidebar functionality:', error);
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

    // Map filenames to page data attributes
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
 * Update sidebar with user info
 */
function updateSidebarUserInfo() {
    const userInitialEl = document.getElementById('user-initial');
    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');

    // Get user from window.currentUser or window.authService
    let user = window.currentUser;
    if (!user && window.authService && typeof window.authService.getCurrentUser === 'function') {
        try {
            user = window.authService.getCurrentUser();
        } catch (e) {
            console.debug('[Sidebar] Could not get user from authService:', e.message);
        }
    }

    if (!user) {
        console.debug('[Sidebar] No user data available yet');
        return;
    }

    // Store for later use
    window.currentUser = user;

    // Get display name with fallbacks
    const displayName = user.displayName || user.name || user.username || 'User';

    // Update sidebar elements
    if (userInitialEl && displayName) {
        userInitialEl.textContent = displayName.charAt(0).toUpperCase();
    }
    if (userNameEl && displayName) {
        userNameEl.textContent = displayName;
    }
    if (userRoleEl) {
        const role = user.role || 'Petugas';
        userRoleEl.textContent = role;
    }

    console.debug(`[Sidebar] Updated user info: ${displayName}`);
}

/**
 * Update admin-only menu visibility
 */
function updateAdminMenuVisibility() {
    const kelolaUserMenu = document.getElementById('menu-kelola-user');
    const activityLogMenu = document.getElementById('menu-activity-log');

    // Check if user is admin
    const user = window.currentUser;
    const isAdmin = user && (user.role === 'Admin' || user.role === 'Administrator');

    if (kelolaUserMenu) {
        kelolaUserMenu.style.display = isAdmin ? 'block' : 'none';
    }
    if (activityLogMenu) {
        activityLogMenu.style.display = isAdmin ? 'block' : 'none';
    }

    if (isAdmin) {
        console.debug('[Sidebar] Showing admin menus');
    }
}

/**
 * Handle logout button click
 */
window.handleLogout = async function() {
    try {
        if (confirm('Apa kamu yakin ingin logout?')) {
            // Try to call authService logout
            if (window.authService && typeof window.authService.logout === 'function') {
                await window.authService.logout();
            } else {
                // Fallback: clear local storage
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
        console.error('[Sidebar] Logout error:', error);
        // Still try to redirect
        window.location.href = '../pages/login.html';
    }
};

/**
 * Public API: Wait for sidebar to be fully loaded
 * Usage: await window.waitForSidebar();
 */
window.waitForSidebar = function() {
    return new Promise((resolve) => {
        // If sidebar already loaded, resolve immediately
        if (sidebarLoaded) {
            console.debug('[Sidebar] Sidebar already loaded, resolving immediately');
            resolve();
            return;
        }

        // Helper to check if sidebar DOM is fully ready
        function isSidebarReady() {
            const sidebar = document.getElementById('sidebar');
            if (!sidebar) return false;

            const userElements = {
                initial: document.getElementById('user-initial'),
                name: document.getElementById('user-name'),
                role: document.getElementById('user-role')
            };

            const hasUserElements = userElements.initial && userElements.name && userElements.role;
            const hasLinks = !!document.querySelector('.sidebar-link');

            return sidebar && hasUserElements && hasLinks;
        }

        // Check immediately
        if (isSidebarReady()) {
            console.debug('[Sidebar] Sidebar DOM ready on check');
            resolve();
            return;
        }

        // Listen for sidebarLoaded event
        let resolved = false;

        const eventHandler = () => {
            if (!resolved) {
                resolved = true;

                // Wait a tick for DOM to fully settle
                setTimeout(() => {
                    console.debug('[Sidebar] Sidebar event fired, DOM settled');
                    resolve();
                }, 0);
            }
        };

        document.addEventListener('sidebarLoaded', eventHandler, { once: true });

        // Timeout: resolve after 8 seconds (increased from 5s)
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                console.warn('[Sidebar] Timeout waiting for sidebar (8s), resolving anyway');
                resolve();
            }
        }, 8000);
    });
};

/**
 * Start loading sidebar immediately
 */
// Auto-load sidebar when this script is loaded
if (document.readyState === 'loading') {
    // DOM is still loading
    document.addEventListener('DOMContentLoaded', () => {
        console.debug('[Sidebar] DOMContentLoaded fired, loading sidebar...');
        loadSidebar();
    });
} else {
    // DOM is already loaded
    console.debug('[Sidebar] DOM already loaded, loading sidebar immediately...');
    loadSidebar();
}

// Also expose loading promise globally
window.sidebarLoadingPromise = () => sidebarLoadingPromise || loadSidebar();
