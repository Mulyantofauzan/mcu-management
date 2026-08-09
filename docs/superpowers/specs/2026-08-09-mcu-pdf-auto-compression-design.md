# MCU PDF Auto-Compression Design

**Date:** 2026-08-09
**Status:** Approved
**Project:** MADIS MCU Management System

## 1. Summary

MADIS will compress oversized MCU PDF files in the user's browser before uploading them directly to private Cloudflare R2 storage. The workflow removes manual compression work, avoids Vercel's request-body limit, and enforces a hard maximum stored-file size of 5 MB.

PDFs up to 3 MB pass through unchanged. PDFs over 3 MB and up to 25 MB use adaptive page-by-page compression. Text-oriented pages remain as PDF pages where possible, while scan-oriented pages are recompressed as images. If the adaptive result is still over 5 MB, a full-document raster fallback progressively reduces the file until it reaches the storage limit or the readability floor.

Compression runs locally. MCU documents are not sent to a third-party compression service, and the original file is never stored when a valid compressed result is available.

## 2. Goals

1. Let staff select common MCU PDFs without manually compressing them first.
2. Store no newly uploaded MCU PDF larger than 5 MB.
3. Preserve medical-document readability ahead of reaching the preferred 3 MB target.
4. Prevent browser crashes by processing pages sequentially outside the main UI thread.
5. Bypass the Vercel Functions 4.5 MB request-body limit through direct browser-to-R2 upload.
6. Provide accurate progress and a specific user-facing error for every failure category.
7. Preserve the existing MCU save workflow, authorization rules, and `mcufiles` metadata contract.

## 3. Non-Goals

- OCR or creation of a new searchable text layer.
- Recompressing or migrating historical MCU files.
- Supporting source files larger than 25 MB in this release.
- Compressing JPG or PNG uploads; their current behavior remains unchanged.
- Sending medical documents to an external PDF compression API.
- Adding compression analytics, database columns, or background-processing infrastructure.
- Redesigning unrelated upload widgets or MCU screens.

## 4. Approved User Flow

1. Staff select an MCU PDF in the existing upload widget.
2. The browser validates the extension, MIME type, PDF signature, and source size.
3. A file up to 3 MB is marked ready without compression.
4. A file over 3 MB and up to 25 MB is analyzed and compressed locally.
5. The UI reports the current phase and page progress.
6. Only a valid result up to 5 MB may proceed to upload.
7. The browser requests a short-lived, authenticated upload URL and sends the prepared PDF directly to R2.
8. The API verifies the stored object before recording the existing MCU file metadata.
9. The MCU save action completes only after compression, upload, and verification succeed.

The save button must not start a duplicate job. If compression is still running, the save action waits for that job and keeps the user informed.

## 5. Client Architecture

### 5.1 Compression Orchestrator

A focused PDF compression service owns input validation, compression policy, worker communication, cancellation, result validation, and retry state. Existing MCU pages call this service through the storage upload abstraction rather than implementing page processing themselves.

The service returns a prepared upload object containing:

- the final PDF `File` or `Blob`;
- original and final byte sizes;
- whether compression or full-raster fallback was used;
- page count; and
- a stable local job identifier.

Only the prepared result is retained in temporary upload state after processing succeeds. References to source buffers, canvases, object URLs, and decoded pages are released promptly.

### 5.2 Worker

PDF parsing, rendering, and assembly run in a dedicated Web Worker using locally vendored browser-compatible PDF libraries. Production pages must not depend on a CDN.

The worker processes one page at a time and reports deterministic progress. After each page it releases rendering resources before continuing. The main thread remains responsible only for UI state, cancellation, and upload.

If the browser cannot start the worker, MADIS shows a specific unsupported-processing error instead of attempting the same memory-heavy work on the main thread.

### 5.3 Page Classification

The adaptive pass classifies each page from its text content and rendered-image coverage:

- A page with meaningful PDF text and no dominant full-page image is copied without rasterization.
- A page dominated by a scan image and containing little meaningful PDF text is rendered and recompressed.
- An ambiguous page is preserved in the adaptive pass to avoid unnecessary quality or searchability loss.

The classifier must be isolated and covered by focused tests. Classification is an optimization, not a trust boundary; the final file still undergoes complete validation.

## 6. Compression Policy

### 6.1 Size Rules

- Source size `<= 3 MB`: no compression.
- Source size `> 3 MB` and `<= 25 MB`: compression required.
- Source size `> 25 MB`: rejected with a specific size-limit message.
- Stored result `<= 5 MB`: accepted.
- Stored result `> 5 MB`: never uploaded or recorded.

The preferred outcome is at most 3 MB. The 5 MB threshold is a hard storage limit, not a warning threshold.

### 6.2 Processing Passes

Each pass starts from the original PDF; the system never recompresses a previous lossy output.

1. **Adaptive pass:** preserve text-oriented pages and rasterize scan-oriented pages at 160 DPI and JPEG quality 0.78.
2. **Tight adaptive pass:** repeat from the original at 135 DPI and JPEG quality 0.68 if the first result remains over 5 MB.
3. **Full-raster fallback:** rasterize all pages sequentially at 120 DPI and JPEG quality 0.60 when adaptive compression cannot meet the limit.

The first valid result at or below 5 MB is accepted. When multiple completed candidates qualify, the system chooses the highest-quality candidate, not automatically the smallest one. If a generated candidate is larger than the original and the original itself is at most 5 MB, the original is retained.

If the full-raster fallback remains over 5 MB, processing stops. The system must not silently lower quality beyond the approved readability floor.

### 6.3 Output Invariants

Before upload, the client reparses the final bytes and verifies:

- the output is a valid PDF;
- its size is at most 5 MB;
- page count matches the source;
- page order is unchanged;
- page dimensions and orientation are preserved within normal PDF rounding; and
- the output is non-empty and renderable.

Copied pages retain their existing searchable text. Pages rasterized by either compression path may no longer be searchable. No OCR is added.

## 7. Direct R2 Upload

The existing compression-upload API route will be reused so the Vercel Serverless Function count does not increase. New PDF uploads will no longer send the PDF body through this route. The route supports two authenticated PDF operations while retaining its existing size-limited JPG and PNG compatibility path:

1. **Prepare:** validate the requested final size and content type, generate a server-controlled pending object key, and return a short-lived presigned PUT URL.
2. **Confirm:** inspect the pending R2 object, enforce the 5 MB limit and PDF content type, range-read its header to verify the `%PDF-` signature, copy it to the final key, create the existing `mcufiles` record, and delete the pending object.

Presigned URLs expire after five minutes and authorize one key and one content type. The API generates object keys; client-provided paths are never trusted. The server validates authorization again during confirmation.

Browser upload uses an API that exposes transmitted-byte progress. A network retry reuses the prepared compressed blob and requests a fresh URL when necessary; it does not rerun compression.

The existing MCU bucket identified by `CLOUDFLARE_R2_BUCKET_NAME` remains authoritative and must have public access disabled; downloads continue through the existing authenticated signed-download API. R2 CORS will allow `https://madis.sabdamu.my.id` and explicitly configured local development origins for the required upload methods and headers. Pending keys use a dedicated prefix with a one-day expiration lifecycle rule. A failed confirmation attempts immediate deletion; the lifecycle rule guarantees eventual cleanup if that deletion fails. If final object creation succeeds but metadata insertion fails, the API deletes both the final and pending objects and reports verification failure.

## 8. UI States and Errors

The upload widget shows stage-based status instead of simulated percentage jumps:

- `Menganalisis PDF...`
- `Mengoptimalkan halaman 8 dari 24...`
- `Menjalankan kompresi lanjutan...`
- `Mengunggah 63%...`
- `Selesai: 5,7 MB menjadi 3,4 MB.`

Compression percentage is derived from completed pages and the active pass. Upload percentage is derived from transmitted bytes. The progress bar must never move backwards when a later compression pass begins; the label explains the phase change.

SweetAlert presents a dedicated Indonesian title and action for each category:

- source file over 25 MB;
- unsupported or invalid file type;
- corrupt or unreadable PDF;
- password-protected or encrypted PDF;
- browser worker unavailable;
- result still over 5 MB at the readability floor;
- compression cancelled;
- upload URL expired;
- connection failure; and
- server verification failure.

Errors must retain enough context for retry when retry is safe. Corrupt, encrypted, oversized-source, and readability-floor failures require choosing a different file. Network and expired-URL failures offer upload retry without recompression.

## 9. Data and Compatibility

No schema migration is required. The existing file metadata stores the final object size, name, type, storage key, and MCU association using the current contract. Original size and compression ratio are transient UI information only.

Existing files, downloads, MCU records, and historical metadata are not changed. JPG and PNG behavior remains on the current upload path. The implementation must preserve existing role authorization and JWT validation.

## 10. Testing and Verification

### 10.1 Automated Coverage

Focused tests will cover:

1. threshold behavior at 3 MB, 5 MB, and 25 MB;
2. page classification for text, scan, and ambiguous mixed pages;
3. pass selection and the hard 5 MB rejection rule;
4. candidate selection without recompressing a lossy result;
5. cancellation and duplicate-job prevention;
6. prepare and confirm authorization;
7. object-key validation, expiry, MIME validation, and server-side size enforcement;
8. failed-confirmation cleanup; and
9. unchanged JPG and PNG behavior.

Synthetic fixtures without personal or medical data will represent small text PDFs, image-only scans, mixed PDFs, encrypted PDFs, corrupt files, and boundary sizes.

### 10.2 Browser and Visual QA

QA will run in current Safari and Chrome desktop, plus a mobile viewport, and will verify:

- page count, order, dimensions, and orientation;
- readable rendering at 100% and 200%;
- searchable text remains on copied text pages;
- no main-thread freeze during page processing;
- smooth monotonic progress;
- successful retry after an interrupted upload;
- no duplicate upload when save is pressed repeatedly; and
- no stored object exceeds 5 MB.

The supplied 24-page mixed MCU sample will be used locally for visual and size QA. It must not be committed, copied into a test fixture, or uploaded to an external service.

## 11. Rollout and Recovery

1. Configure and verify R2 CORS and pending-object cleanup.
2. Deploy the reused API route with prepare and confirm operations.
3. Deploy the client compressor and direct-upload flow together.
4. Run production smoke tests with non-sensitive synthetic PDFs before testing an authorized MCU document.
5. Monitor failed confirmations and orphan cleanup during the first production use.

If the new flow must be rolled back, the client can return to the existing upload behavior for files within its former limit. Existing stored objects and MCU records remain valid because the database contract is unchanged.

## 12. Platform Constraints

- Vercel Functions have a 4.5 MB request and response payload limit, so PDF bodies must not pass through the function: <https://vercel.com/docs/functions/limitations>.
- Vercel recommends direct-to-storage uploads for larger files: <https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions>.
- Cloudflare R2 supports presigned browser PUT uploads and requires bucket CORS configuration: <https://developers.cloudflare.com/r2/api/s3/presigned-urls/> and <https://developers.cloudflare.com/r2/buckets/cors/>.
