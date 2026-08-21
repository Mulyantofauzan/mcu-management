# General PDF Upload Fallback Design

## Goal

Accept MCU documents based on a `.pdf` filename without rejecting scanner exports because of MIME or header differences.

## Approved Behavior

- A non-empty file ending in `.pdf` is accepted regardless of browser MIME or internal header placement.
- Files up to 5 MB skip compression and are queued unchanged.
- Files over 5 MB are compressed toward the existing 5 MB quality target.
- If compression fails and the original is smaller than 10 MB, the original file is queued instead.
- A file of 10 MB or larger must compress successfully; otherwise it is rejected with a specific error.
- Explicit user cancellation never falls back to an upload.
- The server enforces the `.pdf` filename, `application/pdf` upload contract, and the exclusive 10 MB stored-size limit. It does not inspect PDF bytes.

## Scope

No database migration or existing-file modification is required. JPG and PNG behavior remains unchanged.

## Verification

Automated tests cover MIME-independent passthrough, compression failure fallback below 10 MB, rejection at 10 MB, and server size boundaries. The full test suite and production build must pass before push.
