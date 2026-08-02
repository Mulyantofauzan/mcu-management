# Referral Letter Signature Layout Implementation Plan

**Design:** `docs/superpowers/specs/2026-08-03-referral-letter-signature-layout-design.md`

## Task 1: Update the PDF signature block

**File:** `server/workflow/referralLetterService.js`

1. Keep the existing date and label column unchanged.
2. Change the signature image bounds to `x = 375`, `y = signatureTop + 27`, and `fit = [135, 64]`.
3. Move the doctor name to `signatureTop + 95`.
4. Reserve through `signatureTop + 128` before drawing the return-referral section.
5. Render clinical notes at 8 points with no extra line gap so long medical notes remain complete and readable.
6. Tighten only the existing minimum row advance and return-referral section gaps enough to keep the explicit long-content case on one page.

## Task 2: Extend focused PDF tests

**File:** `tests/workflow/referral-letter.test.js`

1. Keep the existing transparent PNG generation test.
2. Add a small JPEG fixture and verify PDF generation accepts it.
3. Add an explicit long-content case: at least 500 clinical-note characters, a 60-character doctor name, and a 30-character registration number.
4. Verify the long-content result is a valid one-page PDF.

## Task 3: Verify visually and globally

1. Generate a sample PDF using the real local signature without committing that signature.
2. Render the PDF to PNG and inspect spacing, centering, overlap, distortion, and page count.
3. Run `npm run test:workflow`.
4. Run `npm test`.
5. Run `npm run build`.
6. Review the final diff, commit only intended files, and push `main`.
