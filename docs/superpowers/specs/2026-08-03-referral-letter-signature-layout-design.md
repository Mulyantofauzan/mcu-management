# Referral Letter Signature Layout Design

**Date:** 2026-08-03
**Status:** Approved
**Project:** MADIS MCU Management System

## 1. Summary

The doctor signature in newly generated referral letters will remain in the right-hand approval block, but it will be larger, centered more accurately, and spaced consistently from the doctor name. The change follows visual option B approved by the user.

Existing referral-letter PDFs are immutable and will not be regenerated. Upload, private storage, authorization, and document-download behavior remain unchanged.

## 2. Goals

1. Make the signature clearly visible in printed and on-screen A4 referral letters.
2. Preserve the existing formal right-aligned signature convention.
3. Keep the referral letter on one A4 page for the explicit long-content test case defined below.
4. Prevent overlap between the signature, doctor identity, registration number, and return-referral section.
5. Limit the change to the PDF layout and its focused tests.

## 3. Non-Goals

- Redesigning the clinic header or other referral-letter content.
- Changing doctor signature upload, validation, storage, or access control.
- Cropping or permanently modifying the uploaded signature file.
- Regenerating historical referral letters.
- Changing the workflow state machine or WhatsApp sharing behavior.

## 4. Approved Layout

The signature block retains its existing horizontal area at `x = 340` with a width of `205` PDF points.

The approved geometry is:

- Date and `Dokter Pemeriksa` label: unchanged, centered within the 205-point block.
- Signature bounding box: `x = 375`, `y = signatureTop + 27`, `135 x 64` points.
- Image scaling: preserve aspect ratio and center both horizontally and vertically inside the bounding box.
- Doctor name: centered and underlined at `y = signatureTop + 95`.
- Registration number: centered immediately below the doctor name when present.
- Reserved block height: through `signatureTop + 128` before the return-referral section begins.

Compared with the current `105 x 52` box, the height increases by 23%. Centering the wider box on the approval column also corrects the current slight rightward offset.

## 5. Data Flow and Compatibility

`generateReferralLetter()` continues to receive the same `signatureBuffer` and doctor profile. PDFKit decodes the PNG or JPEG and applies the approved fit bounds at generation time. No database, API, storage key, or frontend contract changes are required.

Only referral letters generated after deployment use the new geometry. Stored PDFs retain the signature and layout captured when they were created.

## 6. Error Handling

Existing behavior remains authoritative:

- A missing signature rejects document generation with the existing workflow document error.
- An unreadable image rejects generation with `Format gambar tanda tangan tidak dapat dibaca.`
- Layout changes must not hide or replace these errors.
- No fallback unsigned letter may be produced.

## 7. Testing and Verification

Automated coverage will verify:

1. A transparent PNG signature produces a valid non-empty PDF.
2. A JPEG signature produces a valid non-empty PDF.
3. A test case with at least 500 characters of clinical notes, a 60-character doctor name, and a 30-character registration number still produces a valid one-page A4 PDF.
4. Existing rejection for terminal medical results remains unchanged.
5. The complete workflow test suite and production build pass.

Visual QA will render the generated PDF to an image and confirm:

- The signature is centered in the right-hand block and visibly larger than before.
- The signature does not overlap the date, label, doctor name, or registration number.
- The return-referral heading and warning box remain visible on the same page for the explicit long-content test case.
- No uploaded signature is stretched or distorted.

## 8. Rollout

The change will be committed and pushed to `main` after tests and visual QA pass. Vercel will deploy it through the existing production pipeline. Post-deployment QA will generate one new follow-up referral letter; no production employee or MCU record will be deleted or migrated.
