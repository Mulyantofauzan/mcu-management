/**
 * Sidebar Helper - Safe utilities for pages to interact with sidebar
 * This module provides safe wrappers around sidebar operations
 */

/**
 * Safely update sidebar user information
 * This should be called AFTER sidebar is loaded
 */
export function updateSidebarUserDisplay(user) {
    if (!user) {
        console.debug('[SidebarHelper] No user provided');
        return;
    }

    // Wait for sidebar DOM elements to exist
    const userInitialEl = document.getElementById('user-initial');
    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');

    if (!userInitialEl || !userNameEl || !userRoleEl) {
        console.debug('[SidebarHelper] Sidebar elements not found in DOM');
        return;
    }

    // Get display name with fallbacks
    const displayName = user.displayName || user.name || user.username || 'User';
    const role = user.role || 'Petugas';

    // Update sidebar elements
    if (displayName) {
        userInitialEl.textContent = displayName.charAt(0).toUpperCase();
        userNameEl.textContent = displayName;
    }
    userRoleEl.textContent = role;

    // Store user globally for later reference
    window.currentUser = user;

    console.debug(`[SidebarHelper] Updated sidebar user: ${displayName}`);
}

/**
 * Safely get current user
 */
export function getCurrentUserSafe() {
    // First check if already available
    if (window.currentUser) {
        return window.currentUser;
    }

    // Try to get from auth service
    if (window.authService && typeof window.authService.getCurrentUser === 'function') {
        try {
            return window.authService.getCurrentUser();
        } catch (e) {
            console.debug('[SidebarHelper] Error getting user from authService:', e.message);
        }
    }

    return null;
}

/**
 * Wait for sidebar AND ensure user info is available
 */
export async function waitForSidebarAndUser() {
    // Wait for sidebar to load
    if (window.waitForSidebar) {
        await window.waitForSidebar();
    }

    // Ensure user data is available
    let attempts = 0;
    while (!window.currentUser && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (!window.currentUser) {
    }
}

/**
 * Initialize page safely with sidebar and user
 * This is the recommended way to initialize pages
 */
export async function initializePageWithSidebar(initFunction) {
    try {
        // Wait for sidebar to be fully loaded
        await waitForSidebarAndUser();

        // Now call the page's init function
        if (typeof initFunction === 'function') {
            await initFunction();
        }
    } catch (error) {
        throw error;
    }
}
