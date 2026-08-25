# Passive MCU File Upload Design

Date: 2026-08-25
Status: Approved

## Goal

Make MCU document upload predictable by treating each selected file as an opaque attachment. The application must not parse, render, inspect, rewrite, or compress file contents in the browser.

## Accepted Files

- Accept non-empty filenames ending in `.pdf`, `.png`, `.jpg`, or `.jpeg`, case-insensitively.
- PDF files must be smaller than 10 MB.
- PNG, JPG, and JPEG files may be at most 3 MB.
- Queue and upload the original `File` unchanged.
- Do not use MIME values to reject an otherwise allowed filename because browser and scanner MIME reporting is inconsistent.
- The server continues to enforce the allowed extension and size boundaries without inspecting document contents.

## Upload Flow

1. The user selects or drops one file.
2. The widget validates only filename, non-zero size, and size limit.
3. The original file is placed in temporary memory and shown as ready.
4. When the MCU form is saved, the original file is uploaded through the existing authenticated R2 route.
5. Temporary file state is cleared only after upload and MCU persistence succeed. A failed save or upload keeps the file available for retry.

The PDF compression service, PDF worker, PDF.js parsing, header inspection, page analysis, result validation, and related PDF-processing messages are removed from the active upload path.

## Form Submission Reliability

Both Add MCU entry points must collect values from the submitted form instead of unrestricted global DOM lookups. A shared guarded reader will identify a missing control before upload begins and present a user-facing SweetAlert instead of exposing `Cannot read properties of null`.

Missing controls must never be converted silently to empty medical data. The pending file remains queued, and the user can reopen or reload the form and retry.

## Cache Consistency

Bump the application and service-worker cache version with the release so old HTML cannot continue using incompatible JavaScript after deployment.

## Data Impact

No database migration, backfill, stored-file modification, or MCU record transformation is required. Existing documents and MCU records remain unchanged.

## Verification

1. Verify PDF, PNG, JPG, and JPEG files within their limits are queued without content reads.
2. Verify unsupported extensions, empty files, PDF files at or above 10 MB, and images above 3 MB are rejected with clear UI messages.
3. Verify both Add MCU forms use the guarded form reader and never expose a raw `null.value` error.
4. Verify a failed form submission retains the queued file.
5. Run the complete automated test suite and production build before release.

## Non-Goals

- PDF compression, structural validation, preview, page counting, text extraction, or corruption detection.
- Image compression or image-content validation.
- Changing MCU fields, workflow rules, storage schema, or database schema.
- Refactoring all MCU forms into a new component framework.
