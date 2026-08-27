# Unified MCU Direct Upload Design

Date: 2026-08-27
Status: Approved design, pending written-spec review

## Context

MCU attachments currently use two upload paths: PDF uses a direct signed R2
upload, while PNG and JPEG use a legacy multipart request through Vercel. Add,
edit, and follow-up forms also obtain the employee ID from different mutable DOM
fields or page state. An ID can therefore look correct in the modal while a
different, empty, stale, or unnormalized value reaches upload preparation.

The reported employee ID `EMP-20251128-miix34l2-JE5CH` satisfies the current
storage-safe character rule. Production data does not require an ID rewrite.
The displayed database ID is therefore not invalid. The current upload-context
contract still permits a different value to reach the server, which is the
root-cause class this design removes.

This design supersedes the active-flow portions of the 2026-08-21 PDF fallback
design. It preserves and completes the passive-file policy approved on
2026-08-25: attachments are opaque files and their contents are never parsed or
compressed.

## Goals

- Close the recurring `Employee ID tidak valid` upload failure at its shared
  source.
- Use one authenticated direct-to-R2 flow for every supported attachment type.
- Make all Add MCU, Edit MCU, and Follow-Up entry points use the same immutable
  upload identity.
- Preserve selected files after recoverable errors and prevent orphaned uploads
  when MCU persistence fails.
- Produce specific user-facing errors and enough server context to distinguish
  invalid input, missing data, storage failure, and network failure.

## Accepted Files

- Accept a non-empty filename ending in `.pdf`, `.png`, `.jpg`, or `.jpeg`,
  case-insensitively.
- PDF files must be smaller than `10 * 1024 * 1024` bytes; the boundary itself
  is rejected.
- PNG, JPG, and JPEG files may be at most `3 * 1024 * 1024` bytes; the boundary
  itself is accepted.
- Upload the original `File` unchanged.
- Determine the upload content type from the accepted extension. Browser MIME
  values do not decide acceptance.
- Do not inspect headers, parse pages, render previews, validate internal file
  structure, or compress content.

## Architecture

### Immutable upload context

Opening an MCU or follow-up form creates one immutable context containing the
canonical `employeeId`, `mcuId`, and authenticated `userId`. The file widget and
submit handler receive that same context. Upload must not reconstruct identity
from a hidden input, visible text, filename, or unrestricted global DOM lookup.

The hidden employee-ID field may remain for form compatibility, but it is not an
upload authority. The canonical context supplies both the MCU payload's
`employeeId` and every attachment request. Closing and reopening a modal creates
a new context; changing unrelated controls does not mutate it.

### One direct R2 transport

PDF, PNG, JPG, and JPEG use the same three-step transport:

1. The authenticated client requests upload preparation with the immutable
   context, filename, and size.
2. The server returns a short-lived signed PUT URL for a server-generated
   pending R2 key. The browser uploads the original file directly to R2.
3. The client confirms the pending object. The server verifies its stored size
   and metadata, moves it to the final MCU key, and writes file metadata.

The legacy multipart endpoint remains temporarily compatible with already
cached clients, but newly deployed frontend code never selects it. Existing PDF
action names may remain as aliases during one cache transition; the canonical
actions support every accepted extension.

### Server validation

The server normalizes identity strings with Unicode normalization and `trim()`
before validation. It then:

- requires non-empty authenticated user, employee, and MCU identifiers;
- rejects path separators, control characters, traversal segments, and values
  outside the existing safe length;
- verifies that the normalized employee ID exists in `employees` before issuing
  a signed URL;
- applies the extension and size rules above;
- generates the object key and content type server-side; and
- rechecks stored object size and signed metadata during confirmation.

Validation failures distinguish `Employee ID tidak valid` from `Employee ID
tidak ditemukan`. Logs include the failed stage and a request correlation ID,
but never attachment contents or medical form values.

## Save And Rollback Flow

1. Validate all required MCU fields and immutable context before network work.
2. Upload and confirm all newly selected attachments.
3. Persist the MCU or follow-up record.
4. Clear temporary files only after both attachment and record persistence
   succeed.

If preparation, PUT, or confirmation fails, the record is not saved and the
selected file remains queued for retry. If record persistence fails after an
attachment was confirmed, the client sends the exact newly created file IDs to
an authenticated rollback endpoint. The server deletes only those new metadata
rows and R2 objects after confirming they belong to the same upload context and
authenticated user. Existing attachments are never included in this rollback.

Rollback failure is logged for operational cleanup and shown as a save failure;
it must not silently report success. This replaces the current no-op orphan
cleanup helper.

## User-Facing Errors

SweetAlert remains the common UI. Messages use stable categories:

- `Data Karyawan Tidak Valid`: missing or malformed context before upload.
- `Karyawan Tidak Ditemukan`: normalized ID does not exist in the database.
- `File Tidak Didukung`: extension is outside PDF, PNG, JPG, and JPEG.
- `Ukuran File Terlalu Besar`: states the applicable 10 MB or 3 MB limit.
- `Koneksi Terputus`: network or signed-URL timeout; the file stays queued.
- `Upload Gagal`: R2 preparation, PUT, or confirmation failed.
- `Penyimpanan MCU Gagal`: record persistence failed and rollback was attempted.

Raw exceptions are logged but are not presented as the primary user message.
The save button cannot start a second concurrent submission.

## Entry Points In Scope

- Tambah Karyawan followed by its Add MCU modal.
- Quick Add MCU and canonical Add MCU on Tambah Karyawan.
- Add MCU on Kelola Karyawan.
- Edit MCU attachment upload on Kelola Karyawan.
- Follow-Up attachment upload.

All entry points call the same file policy, direct-upload service, and immutable
context contract. No entry point may add a private fallback or weaker limit.

## Data And Deployment Impact

- No database migration, employee-ID rewrite, MCU backfill, or modification of
  existing R2 objects is required.
- Existing file metadata and download behavior remain compatible.
- The application and service-worker cache versions are bumped together so
  production cannot combine old HTML with the new upload client.
- Deployment remains through the existing GitHub-to-Vercel production flow.

## Verification

### Automated tests

- Pass the reported ID `EMP-20251128-miix34l2-JE5CH` from modal context through
  preparation without reading a hidden field.
- Cover all entry points and prove they use the immutable context.
- Cover normalization, empty IDs, invalid characters, context mismatch, and a
  well-formed but nonexistent employee.
- Accept non-empty PDF files below 10 MB and reject exactly 10 MB or larger.
- Accept PNG, JPG, and JPEG files at 3 MB and reject larger images.
- Verify case-insensitive extensions and server-controlled content types.
- Verify no content read, PDF parsing, compression, or legacy multipart call is
  present in the active client flow.
- Verify retry retains the selected file after preparation, PUT, confirmation,
  network, and record-save failures.
- Verify rollback deletes only files created by the failed submission.
- Run the complete test suite and production build.

### Production QA

After deployment, use synthetic nonmedical files to test PDF and image upload
through Superadmin and another permitted role. Verify successful MCU persistence,
download access, retry behavior, and cache refresh behavior. Do not use real
medical documents for QA.

The issue is closed only when an end-to-end production upload and MCU save
succeed and the resulting attachment can be opened.

## Non-Goals

- Content validation, malware scanning, OCR, PDF repair, compression, preview,
  page counting, or medical-data extraction.
- Changing MCU fields, approval workflow rules, employee IDs, database schema,
  or existing documents.
- Replacing the current UI framework or redesigning the upload widget.
