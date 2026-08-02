# QA MCU Approval Workflow 1.1.0

## Automated Gates

Run from repository root:

```bash
npm run test:workflow
npm run build
find api -type f -name '*.js' | wc -l
```

Expected: all tests pass, build succeeds, and function count is `10`.

Run `migrations/20260802_08_mcu_workflow_verification.sql` after migrations 01-07. Any `VERIFY_*` error blocks activation.

## Browser Matrix

Test Chrome and Safari at desktop width, then Chrome mobile emulation at 390 x 844.

1. Login as Administrator, Petugas, and Dokter.
2. Confirm each role sees one consistent sidebar on every page.
3. Confirm direct URL access to a forbidden workflow page shows dedicated access-error UI.
4. Reload normally without hard refresh; departments, sidebar counts, and code version must update.
5. Confirm no CSP, uncaught JavaScript, mixed-content, or failed local-vendor requests in Console.

## Workflow Scenarios

1. Petugas creates a first MCU. No medical-result field is available. Status becomes `pending_review`.
2. Two Dokter sessions claim the same MCU. Only one succeeds; the other becomes read-only.
3. Dokter rejects with a reason. Petugas sees the correction card, edits raw data only, and resubmits.
4. Dokter approves Fit. WhatsApp summary contains approved result/notes only. Candidate enters joining queue.
5. Administrator confirms share, then records joined/not joined. `not_joined` requires a reason.
6. Dokter approves Follow-Up. Approval remains committed if PDF generation fails; document retry adds no review cycle.
7. Petugas submits follow-up evidence. No final-result control exists. Next doctor review is created.
8. Repeat Follow-Up or Temporary Unfit twice, then finish with a terminal result. All cycles remain visible.
9. Replace a joined employee's MCU. Pending/rejected replacement must not displace prior reviewed MCU.
10. Correct `not_joined -> candidate` with a reason. Verify `joined -> not_joined` is rejected.

## Analytics and Expiry

1. Before feature activation, capture dashboard KPI/status/department baselines and compare them after deployment with flag off.
2. After activation, candidate, not joined, inactive, unreviewed, and expired rows must be excluded from organizational analytics.
3. A date exactly at the calendar-month cutoff remains eligible; one day older is expired.
4. Preview an expiry change. Preview counts must equal counts after apply.
5. Searching or viewing inactive/expired data must perform no employee or MCU update.
6. A fresh approved MCU restores eligibility without mutating operational `is_active`.

## Private Data

1. Signature upload accepts PNG/JPEG up to 2 MB only.
2. Signature and referral objects fail without signed URLs and expire after their configured lifetime.
3. API/log output contains no JWT, medical payload, signature bytes, private object key, or signed URL.
4. Normal WhatsApp UI says `Dikonfirmasi pengguna`, never `Terkirim`.
