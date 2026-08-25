# Passive MCU File Upload Implementation Plan

**Design:** `docs/superpowers/specs/2026-08-25-passive-mcu-file-upload-design.md`

## Task 1: Lock the passive attachment contract

**Files:**
- `tests/storage/mcu-file-policy.test.js`
- `tests/workflow/frontend-contract.test.js`

1. Cover case-insensitive PDF, PNG, JPG, and JPEG filenames.
2. Cover empty files and the exclusive PDF/inclusive image size boundaries.
3. Assert the active widget does not import PDF parsing or compression code.
4. Assert both Add MCU handlers collect fields through a guarded form reader.

## Task 2: Replace PDF preparation with attachment validation

**Files:**
- `mcu-management/js/services/mcuFilePolicy.mjs`
- `mcu-management/js/components/fileUploadWidget.js`

1. Validate only filename extension, non-zero size, and per-format size.
2. Queue the original `File` unchanged.
3. Keep existing temporary-file retention and upload progress behavior.
4. Present contextual errors for unsupported, empty, or oversized files.

## Task 3: Guard Add MCU form collection

**Files:**
- `mcu-management/js/utils/mcuFormReader.js`
- `mcu-management/js/pages/tambah-karyawan.js`
- `mcu-management/js/pages/kelola-karyawan.js`

1. Read fields from the submitted form and fail with the missing field ID.
2. Reuse the reader in both Add MCU handlers.
3. Present a dedicated SweetAlert and retain queued files when form controls are incomplete.

## Task 4: Publish a clean cache version

**Files:**
- `mcu-management/sw.js`
- `mcu-management/version.json`

1. Remove PDF parser/compressor assets from the active cache list.
2. Increment the application and service-worker cache version together.
3. Describe passive PDF/PNG/JPG upload in release features.

## Task 5: Verify and release

1. Run focused storage and frontend contract tests.
2. Run the complete automated test suite.
3. Run the production build and `git diff --check`.
4. Inspect the final diff, commit only intended files, and push `main`.
