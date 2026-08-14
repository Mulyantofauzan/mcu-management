# Instant Menu Navigation Implementation Plan

**Design:** `docs/superpowers/specs/2026-08-14-instant-menu-navigation-design.md`

## Task 1: Lock the no-blank navigation contract

**Files:**
- `tests/workflow/frontend-contract.test.js`

1. Enumerate every authenticated production HTML page.
2. Assert shared navigation uses native same-origin links, navigation intent, and
   low-priority document prefetching without importing the inactive SPA router.
3. Assert the shared stylesheet enables cross-document transitions and disables
   motion when requested.
4. Assert authenticated pages do not hide the entire body while data initializes.
5. Run the focused contract test and confirm the new checks fail before code changes.

## Task 2: Add progressive navigation enhancement

**Files:**
- `mcu-management/js/sidebar-manager.js`
- `mcu-management/css/sidebar.css`

1. Keep every sidebar `href` as the source of truth and do not prevent ordinary
   navigation.
2. Add one shared thin progress indicator and mark normal internal navigation as
   pending without clearing the current DOM.
3. Ignore external, download, target, and modifier-assisted links.
4. Prefetch only a same-origin HTML destination after pointer, keyboard, or touch
   intent; deduplicate hints and never prefetch API data.
5. Enable a short root cross-document transition with a stable application
   background and a reduced-motion fallback.

## Task 3: Remove whole-document startup hiding

**Files:**
- `mcu-management/index.html`
- `mcu-management/pages/activity-log.html`
- `mcu-management/pages/analysis.html`
- `mcu-management/pages/assessment-rahma.html`
- `mcu-management/pages/data-master.html`
- `mcu-management/pages/data-terhapus.html`
- `mcu-management/pages/employee-health-history.html`
- `mcu-management/pages/follow-up.html`
- `mcu-management/pages/kelola-karyawan.html`
- `mcu-management/pages/kelola-user.html`
- `mcu-management/pages/mcu-expiry-management.html`
- `mcu-management/pages/report-period.html`
- `mcu-management/pages/tambah-karyawan.html`

1. Delete legacy `body` opacity and five-second Safari fallback rules.
2. Delete rules that hide every body child before the `initialized` class exists.
3. Keep the dashboard and Jakarta Cardiovascular loading UI, but scope it to the
   content area so the sidebar and page shell remain visible.
4. Preserve page-specific loading calls, progress reporting, error handling, and
   operation overlays.

## Task 4: Publish a fresh static release

**Files:**
- `mcu-management/sw.js`
- `mcu-management/version.json`

1. Increment the application and service-worker cache version together.
2. Add the no-blank navigation behavior to the release feature list.
3. Retain network-first handling for unhashed HTML, CSS, and JavaScript.

## Task 5: Verify behavior and regressions

1. Run the focused frontend contract test.
2. Run the complete Node test suite and production build.
3. Serve the production build locally and inspect direct loading plus menu
   navigation at desktop and mobile widths.
4. Verify dashboard, report submenu, doctor menu, browser history, and login/logout
   links retain correct native behavior.
5. Run `git diff --check` and inspect that unrelated duplicate files remain outside
   the change.
