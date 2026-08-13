# MCU PDF Auto-Compression Implementation Plan

**Design:** `docs/superpowers/specs/2026-08-09-mcu-pdf-auto-compression-design.md`

## Task 1: Add local PDF processing dependencies

**Files:**
- `mcu-management/package.json`
- `mcu-management/package-lock.json`
- `mcu-management/assets/vendor/pdfjs/*`
- `mcu-management/assets/vendor/pdf-lib/*`

1. Add pinned `pdfjs-dist` and `pdf-lib` dependencies.
2. Vendor only the browser runtime, worker, required support assets, and licenses under the existing local vendor tree.
3. Keep all production imports same-origin; do not add a CDN or runtime package fetch.
4. Confirm the normal static build copies every required asset.

## Task 2: Implement and test page-at-a-time compression

**Files:**
- `mcu-management/js/services/pdfCompressionPolicy.mjs`
- `mcu-management/js/services/pdfCompressionService.js`
- `mcu-management/js/workers/pdfCompressionWorker.mjs`
- `tests/storage/pdf-compression-policy.test.js`

1. Define the approved 3 MB, 5 MB, and 25 MB thresholds and the three compression profiles in one testable policy module.
2. Validate PDF headers and detect unsupported, corrupt, encrypted, and oversized inputs with stable error codes.
3. Analyze PDF.js operator lists to distinguish dominant scan images from meaningful PDF text.
4. Assemble adaptive output with copied text pages and page-sized JPEG scan pages.
5. Run tight adaptive and full-raster passes from the original bytes only when required.
6. Process one page at a time in a module worker, release page/canvas resources promptly, and report phase/page progress.
7. Reparse output and enforce page-count, orientation, renderability, and hard 5 MB invariants.
8. Add focused policy and classifier tests with synthetic values; do not commit medical files.

## Task 3: Add authenticated direct-to-R2 PDF upload

**Files:**
- `server/r2DirectUploadService.js`
- `server/r2StorageService.js`
- `api/compress-upload/index.js`
- `tests/storage/r2-direct-upload.test.js`
- `tests/storage/compress-upload-api.test.js`

1. Reuse the existing R2 client configuration and signed-download storage bucket.
2. Add prepare and confirm operations to the existing upload endpoint without adding a Vercel function.
3. Generate five-minute presigned PUT URLs for server-owned pending keys and a declared PDF size no greater than 5 MB.
4. Bind pending objects to the authenticated user, employee, and MCU through R2 metadata.
5. On confirmation, validate key ownership, HEAD metadata, size, MIME type, and the `%PDF-` header through a ranged read.
6. Copy a verified pending object to a randomized final key, insert the existing `mcufiles` metadata, then delete the pending object.
7. Delete final and pending objects if metadata insertion fails.
8. Retain the current multipart JPG/PNG path and its 3 MB limit.
9. Test authorization, path safety, boundaries, expiry, cleanup, and response compatibility using mocked storage clients.

## Task 4: Integrate compression progress and upload retry

**Files:**
- `mcu-management/js/components/fileUploadWidget.js`
- `mcu-management/js/services/tempFileStorage.js`
- `mcu-management/js/services/supabaseStorageService.js`
- `mcu-management/js/pages/tambah-karyawan.js`
- `mcu-management/js/pages/kelola-karyawan.js`
- `mcu-management/js/pages/follow-up.js`

1. Compress PDFs during file preparation and keep only the prepared result in temporary storage.
2. Show deterministic analysis, page, fallback, and completion progress in the upload widget.
3. Present dedicated Indonesian SweetAlert errors and safe retry actions.
4. Track an active preparation promise per MCU so Save waits instead of omitting a file or starting a duplicate job.
5. Upload prepared PDFs with presign, byte-progress PUT, and confirm calls; retry transport failures without recompression.
6. Preserve the current image upload behavior and the existing batch-upload result contract.
7. Update file-type acceptance and helper text to state PDF 25 MB input/5 MB stored and JPG/PNG 3 MB.

## Task 5: Update static delivery and security configuration

**Files:**
- `mcu-management/sw.js`
- `vercel.json`
- `docs/runbooks/MCU-PDF-AUTO-COMPRESSION.md`

1. Revalidate module and worker assets through the service worker and increment the cache version.
2. Permit only the required R2 S3 upload origin in `connect-src`; keep `worker-src 'self'`.
3. Document exact R2 CORS and one-day pending-prefix lifecycle configuration.
4. Verify that no PDF bytes, signed URLs, JWTs, or medical content are logged.

## Task 6: Verify locally and in production

1. Run focused storage/compression tests, the full Node test suite, and the production build.
2. Serve the production build locally and test small, text, scan, mixed, encrypted, corrupt, and boundary PDFs in Chrome and Safari.
3. Benchmark the supplied 5.7 MB/24-page MCU PDF locally without committing or externally uploading it.
4. Render source and output pages for visual comparison at 100% and 200%.
5. Configure and verify production R2 CORS and pending-object lifecycle before enabling direct upload.
6. Commit and push only intended files to `main`, verify the Vercel deployment, and run a synthetic production smoke test.
