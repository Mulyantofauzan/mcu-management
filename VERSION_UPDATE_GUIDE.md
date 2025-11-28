# Version Update System Guide

## Overview
The MCU-APP now has an automatic version update notification system that ensures users always have the latest version of the application.

## How It Works

### For End Users

#### Automatic Notifications
- When a user opens the app, the system automatically checks if a new version is available
- If a new version is found, a blue notification banner appears at the top of the page
- The banner shows: "✨ Versi terbaru tersedia! (v1.0.4)"

#### Update Process
1. Click **"Update Sekarang"** button in the notification banner
2. The system will:
   - Unregister all service workers
   - Clear all browser caches (force removal of old cached code)
   - Update version info in localStorage
   - Reload the page with fresh code
3. Users will now have the latest version

#### Manual Checking
Users can check the current version at any time by opening browser console (F12) and running:
```javascript
window.versionManager.getVersionInfo()
```

This returns:
```javascript
{
  currentVersion: "1.0.4",           // Latest version in code
  currentCacheVersion: "madis-v4",   // Latest cache version
  storedVersion: "1.0.3",            // Version currently on user's computer
  storedCacheVersion: "madis-v3",    // Cache version on user's computer
  updateAvailable: true,             // Whether update should be applied
  versionHistory: [...],             // Past versions used
  lastVersionCheck: "2025-11-28T..."
}
```

### For Developers

#### Deploying a New Version

**Step 1: Update Version Number**
Edit `mcu-management/js/utils/versionManager.js` line 6:
```javascript
const CURRENT_VERSION = '1.0.5';  // Update this
```

**Step 2: Update Service Worker Cache (if needed)**
If there are significant changes, also update `mcu-management/sw.js` line 17:
```javascript
const CACHE_VERSION = 'madis-v5';  // Update this
```

**Step 3: Commit and Push**
```bash
git add mcu-management/js/utils/versionManager.js
git commit -m "chore: Bump version to 1.0.5"
git push
```

**Step 4: Deploy**
- Deploy to Vercel using: `vercel deploy --prod`
- Or let GitHub Actions handle automatic deployment

#### How Version Checking Works

1. **Version Storage in localStorage**
   - `madis_current_version`: Stores the version currently on user's browser
   - `madis_sw_cache_version`: Stores the service worker cache version
   - `madis_version_history`: Tracks past 10 versions used
   - `madis_last_version_check`: Timestamp of last version check

2. **Version Comparison Logic**
   - App checks: `CURRENT_VERSION` (in code) vs `getStoredVersion()` (in localStorage)
   - If different → Update notification shown
   - If user clicks "Update Now" → All caches cleared → Page reloaded

3. **Service Worker Cache Strategy**
   - Service worker cache versioned with `CACHE_VERSION` constant
   - Different cache version = new deployment detected
   - Users get notified even if they don't manually clear caches

#### Files Involved

- **versionManager.js**: Core version checking logic
  - Location: `mcu-management/js/utils/versionManager.js`
  - Main functions:
    - `initVersionManager()` - Called on app startup
    - `isUpdateAvailable()` - Checks if update needed
    - `applyUpdate()` - Handles cache clearing + reload
    - `getVersionInfo()` - For debugging/manual checking

- **dashboard.js**: Integration point
  - Location: `mcu-management/js/pages/dashboard.js`
  - Calls `initVersionManager()` right after auth check

- **sw.js**: Service worker with cache versioning
  - Location: `mcu-management/sw.js`
  - Cache version must match `CURRENT_CACHE_VERSION` in versionManager.js

## Version Numbering Scheme

Format: `MAJOR.MINOR.PATCH` (Semantic Versioning)

Examples:
- `1.0.0` - Initial release
- `1.0.1` - Bug fixes
- `1.1.0` - New features
- `2.0.0` - Breaking changes

## Troubleshooting

### User still sees old version after update?
1. Have them clear browser caches manually (Ctrl+Shift+Delete)
2. Close and reopen browser
3. Hard refresh (Ctrl+Shift+R)

### Version notification not showing?
1. Check: `window.versionManager.getVersionInfo()`
2. If `updateAvailable: false` - user already has latest version
3. Check localStorage values match current code version

### Users on old computer aren't getting update?
1. The notification will show on their next page load
2. Service worker cache version change forces update detection
3. No manual action required from end user - system is automatic

## Debugging Commands

Open browser console (F12) and run these:

```javascript
// Check current version status
window.versionManager.getVersionInfo()

// Check current app version in code
window.versionManager.getCurrentVersion()

// Get stored version from browser
window.versionManager.getStoredVersion()

// Check if update is available
window.versionManager.isUpdateAvailable()

// Manually trigger update (clears caches + reloads)
window.versionManager.applyUpdate()

// Dismiss notification banner
window.versionManager.dismissUpdate()
```

## Important Notes

⚠️ **Cache Clearing**
- Clearing caches will remove offline support temporarily
- Once service worker re-registers, offline support returns
- This is necessary to prevent outdated code from being served

⚠️ **LocalStorage Not Cleared**
- User preferences and data stored in localStorage are preserved
- Only browser/service worker caches are cleared

⚠️ **Multiple Tabs**
- Each tab checks version independently
- Update notification may appear in multiple tabs
- Each tab can update independently

## Future Enhancements

Possible improvements:
1. Server-based version checking (fetch from API instead of code)
2. Staged rollouts (release to percentage of users first)
3. Rollback capability (revert to previous version if issues found)
4. Automatic update (update without user clicking)
5. Version-specific changelog display

---

**Last Updated**: 2025-11-28
**Current Version**: 1.0.4
**Cache Version**: madis-v4
