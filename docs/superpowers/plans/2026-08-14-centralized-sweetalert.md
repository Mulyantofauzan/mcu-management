# Centralized SweetAlert Implementation Plan

**Design:** `docs/superpowers/specs/2026-08-14-centralized-sweetalert-design.md`

## Task 1: Lock the shared alert contract

**Files:**
- `tests/workflow/frontend-contract.test.js`

1. Assert the existing local SweetAlert2 JavaScript and CSS assets remain the
   only alert dependency.
2. Assert `uiHelpers.js` owns the shared loader, toast timing, top-right
   position, blocking alert, Promise confirmation, and callback compatibility.
3. Assert the workflow presenter delegates to the shared alert loader while
   retaining the compatibility export used by current workflow pages.
4. Assert active production paths no longer call native `alert()` or
   `confirm()`.
5. Run the focused test and confirm the new checks fail before implementation.

## Task 2: Centralize SweetAlert presentation

**Files:**
- `mcu-management/js/utils/uiHelpers.js`
- `mcu-management/js/utils/workflowErrorPresenter.js`
- `mcu-management/css/alerts.css`

1. Add one cached, lazy loader for the existing same-origin SweetAlert2 script,
   vendor stylesheet, and MADIS alert stylesheet.
2. Configure the common popup classes, safe text rendering, MADIS colors, and
   reduced-motion behavior.
3. Route `showToast()` through a compact top-right SweetAlert toast with the
   approved `2500ms` and `4500ms` durations.
4. Add a Promise-based shared alert and confirmation API.
5. Preserve `confirmDialog()` as a callback wrapper so existing feature code
   does not need to change.
6. Retain the current XSS-safe DOM presentation as the lazy-load fallback and
   make failed confirmation presentation default to cancellation.
7. Delegate workflow and upload error modals to the shared configuration while
   preserving their recovery handlers and `ensureWorkflowAlerts()` export.

## Task 3: Remove native dialogs from active paths

**Files:**
- `mcu-management/js/sidebar-manager.js`
- `mcu-management/pages/assessment-rahma.html`
- `mcu-management/js/pages/dashboard.js`
- `mcu-management/js/pages/kelola-user.js`
- `mcu-management/js/components/fileUploadWidget.js`
- `mcu-management/js/services/analysisDashboardService.js`

1. Use the shared Promise confirmation for logout and destructive actions.
2. Keep all existing action text and execute mutations only after explicit
   confirmation.
3. Replace the analysis loading alert with a blocking shared error dialog.
4. Do not modify inactive `spaRouter.js`, `sidebarLoader.js`, or
   `versionManager.js`; they remain outside production execution paths.

## Task 4: Publish a fresh static release

**Files:**
- `mcu-management/sw.js`
- `mcu-management/version.json`

1. Add the MADIS alert stylesheet and existing SweetAlert2 vendor assets to the
   service-worker static asset list when not already present.
2. Increment the application and cache version together.
3. Record the centralized notification presentation in the release features.

## Task 5: Verify behavior and regressions

1. Run the focused frontend contract test.
2. Run the complete Node test suite and production build.
3. Serve the production build locally and test success, warning, error, long
   text, destructive confirmation, cancellation, and logout.
4. Inspect desktop and mobile dimensions, rapid toasts, keyboard focus, and
   reduced-motion behavior.
5. Run `git diff --check`, review the final diff, and leave unrelated duplicate
   files outside the commit.
6. Commit and push to `main` only after all checks pass.
