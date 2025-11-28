/**
 * Theme Manager - Handles dark mode / light mode switching
 *
 * Features:
 * - Auto-detect system preference (prefers-color-scheme)
 * - Toggle between light and dark mode
 * - Persist user preference in localStorage
 * - Apply theme to entire application
 * - Smooth transitions between themes
 * - Works with Tailwind CSS dark mode
 */

const THEME_STORAGE_KEY = 'madis_theme_preference';

// Theme preferences
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

/**
 * Get current system theme preference
 */
function getSystemTheme() {
  if (typeof window === 'undefined') return THEMES.LIGHT;

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? THEMES.DARK
    : THEMES.LIGHT;
}

/**
 * Get stored theme preference from localStorage
 */
function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || THEMES.SYSTEM;
  } catch (error) {
    console.warn('[themeManager] Error reading stored theme:', error.message);
    return THEMES.SYSTEM;
  }
}

/**
 * Save theme preference to localStorage
 */
function saveThemePreference(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('[themeManager] Error saving theme preference:', error.message);
  }
}

/**
 * Get actual theme to apply (resolves SYSTEM to LIGHT or DARK)
 */
function getActiveTheme() {
  const stored = getStoredTheme();

  if (stored === THEMES.SYSTEM) {
    return getSystemTheme();
  }

  return stored;
}

/**
 * Apply theme to document
 * Tailwind CSS dark mode works by adding 'dark' class to html element
 */
function applyTheme(theme) {
  const html = document.documentElement;
  const activeTheme = theme === THEMES.SYSTEM ? getSystemTheme() : theme;

  if (activeTheme === THEMES.DARK) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }

  // Update meta theme-color for browser UI (mobile)
  updateThemeColor(activeTheme);

  console.log(`[themeManager] Applied theme: ${activeTheme}`);
}

/**
 * Update meta theme-color tag for browser UI
 */
function updateThemeColor(theme) {
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');

  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.name = 'theme-color';
    document.head.appendChild(metaThemeColor);
  }

  // Colors should match your app's color scheme
  if (theme === THEMES.DARK) {
    metaThemeColor.content = '#1f2937'; // Dark gray (Tailwind gray-800)
  } else {
    metaThemeColor.content = '#ffffff'; // White
  }
}

/**
 * Toggle between light and dark mode
 */
function toggleTheme() {
  const current = getStoredTheme();
  let next;

  // Cycle through: light -> dark -> system -> light
  if (current === THEMES.LIGHT) {
    next = THEMES.DARK;
  } else if (current === THEMES.DARK) {
    next = THEMES.SYSTEM;
  } else {
    next = THEMES.LIGHT;
  }

  setTheme(next);
  return next;
}

/**
 * Set theme explicitly
 */
function setTheme(theme) {
  if (!Object.values(THEMES).includes(theme)) {
    console.warn(`[themeManager] Invalid theme: ${theme}`);
    return;
  }

  saveThemePreference(theme);
  applyTheme(theme);

  // Dispatch custom event for other parts of app to listen to
  window.dispatchEvent(new CustomEvent('themechange', {
    detail: { theme, activeTheme: getActiveTheme() }
  }));
}

/**
 * Get current theme status (for UI display)
 */
function getThemeStatus() {
  const stored = getStoredTheme();
  const active = getActiveTheme();

  return {
    preference: stored,
    activeTheme: active,
    isDark: active === THEMES.DARK,
    isLight: active === THEMES.LIGHT,
    isSystem: stored === THEMES.SYSTEM,
    systemTheme: getSystemTheme()
  };
}

/**
 * Initialize theme manager
 * Called on app startup
 */
export function initThemeManager() {
  // Apply stored theme or system preference
  const theme = getStoredTheme();
  applyTheme(theme);

  // Listen for system theme changes
  if (typeof window !== 'undefined' && window.matchMedia) {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Modern browsers
    if (darkModeQuery.addEventListener) {
      darkModeQuery.addEventListener('change', (e) => {
        // Only apply if user has system preference set
        if (getStoredTheme() === THEMES.SYSTEM) {
          applyTheme(THEMES.SYSTEM);
          window.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme: THEMES.SYSTEM, activeTheme: getActiveTheme() }
          }));
        }
      });
    }
  }

  console.log('[themeManager] Initialized with theme:', getThemeStatus());
}

/**
 * Get theme icon/label for UI display
 */
function getThemeLabel() {
  const status = getThemeStatus();

  if (status.preference === THEMES.SYSTEM) {
    return `🖥️ System (${status.isDark ? '🌙' : '☀️'})`;
  } else if (status.isDark) {
    return '🌙 Dark';
  } else {
    return '☀️ Light';
  }
}

/**
 * Get theme toggle button HTML
 */
function getThemeToggleHTML() {
  const status = getThemeStatus();
  const label = getThemeLabel();

  return `
    <button
      id="theme-toggle-btn"
      class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title="Toggle theme (Light / Dark / System)"
      onclick="window.themeManager.toggleTheme()"
    >
      <span class="text-lg">${status.isDark ? '🌙' : '☀️'}</span>
      <span class="hidden md:inline text-sm font-medium">${status.preference === THEMES.SYSTEM ? 'Auto' : (status.isDark ? 'Dark' : 'Light')}</span>
    </button>
  `;
}

/**
 * Export functions to window for global access
 */
export const themeManager = {
  THEMES,
  initThemeManager,
  toggleTheme,
  setTheme,
  getThemeStatus,
  getActiveTheme,
  getStoredTheme,
  getSystemTheme,
  getThemeLabel,
  getThemeToggleHTML
};

// Export to window for global access
if (typeof window !== 'undefined') {
  window.themeManager = themeManager;
}
