# Unified MCU Direct Upload Implementation Plan

**Design:** `docs/superpowers/specs/2026-08-27-unified-mcu-direct-upload-design.md`

## Task 1: Lock the upload identity and file contract

**Files:**
- `tests/storage/mcu-file-policy.test.js`
- `tests/storage/r2-direct-upload.test.js`
- `tests/storage/compress-upload-api.test.js`
- `tests/workflow/frontend-contract.test.js`

1. Add the reported employee ID as a regression fixture.
2. Cover normalized, malformed, missing, and nonexistent employee IDs.
3. Cover PDF's exclusive 10 MiB and image's inclusive 3 MiB boundaries.
4. Assert PDF, PNG, JPG, and JPEG all use direct upload actions.
5. Assert each form sends its immutable upload context instead of a hidden
   employee-ID control.

## Task 2: Generalize the direct R2 service

**Files:**
- `server/r2DirectUploadService.js`
- `server/r2StorageService.js`

1. Replace PDF-only filename and metadata validation with one extension-driven
   attachment policy.
2. Normalize identifiers before safe-path validation and verify the employee
   exists through an injected Supabase lookup.
3. Generate pending and final keys with the accepted extension and assign the
   server-controlled content type.
4. Return the created metadata ID so a failed MCU save can identify only its
   newly uploaded files.
5. Add a guarded rollback operation that verifies owner, employee, MCU, and
   file ID before deleting the metadata row and R2 object.

## Task 3: Expose canonical upload and rollback actions

**Files:**
- `api/compress-upload/index.js`
- `tests/storage/compress-upload-api.test.js`

1. Add canonical `prepare-file-upload`, `confirm-file-upload`, and
   `rollback-file-upload` JSON actions.
2. Keep the existing PDF action names as one-release aliases for cached pages.
3. Map typed service errors to stable status codes and user-safe messages.
4. Retain the legacy multipart handler only for cached clients; active code
   must not call it.

## Task 4: Bind every form to immutable context

**Files:**
- `mcu-management/js/components/fileUploadWidget.js`
- `mcu-management/js/services/supabaseStorageService.js`
- `mcu-management/js/pages/tambah-karyawan.js`
- `mcu-management/js/pages/kelola-karyawan.js`
- `mcu-management/js/pages/follow-up.js`
- `tests/workflow/frontend-contract.test.js`

1. Freeze the widget's `employeeId`, `mcuId`, and `userId` context at modal
   initialization and expose it through one read-only accessor.
2. Make upload batches accept that context object and use the canonical direct
   actions for every supported extension.
3. Use the same context for the MCU payload instead of rereading a hidden ID.
4. Return uploaded file IDs and replace the orphan-cleanup stub with the
   authenticated rollback action.
5. Preserve queued files on failure, prevent duplicate submission, and map
   stable error codes to the approved SweetAlert categories.

## Task 5: Publish and close the production defect

**Files:**
- `mcu-management/sw.js`
- `mcu-management/version.json`

1. Increment the application and service-worker cache versions together.
2. Run focused storage and frontend contract tests.
3. Run the complete test suite, production build, and `git diff --check`.
4. Review and commit only intended files, then push `main`.
5. Wait for Vercel production deployment.
6. Perform end-to-end production QA using synthetic nonmedical PDF and image
   files with Superadmin and Petugas; verify save and download.
7. Close the issue only after the production checks pass.
