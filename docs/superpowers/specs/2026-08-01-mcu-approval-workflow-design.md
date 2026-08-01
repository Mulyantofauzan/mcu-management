# MCU Approval Workflow Design

**Date:** 2026-08-01
**Status:** Approved
**Project:** MADIS MCU Management System

## 1. Summary

MADIS will add a doctor-led approval workflow for every new MCU record. Medical approval and employment joining decisions remain separate:

- Petugas records examination, laboratory, and follow-up evidence.
- Dokter reviews data, rejects incorrect submissions, or approves a medical result.
- Administrator decides whether a first-time candidate joins after the medical workflow reaches a terminal result.
- Only eligible employees and reviewed MCU records enter organizational analytics.

The workflow preserves all existing data, supports repeated follow-up cycles, provides immutable audit history, and prepares a semi-automatic WhatsApp share for the internal HR and SHE group.

## 2. Goals

1. Prevent unreviewed MCU data from entering analytics.
2. Separate clinical decisions from employment decisions.
3. Preserve every review, correction, follow-up, and status transition.
4. Prevent two doctors from approving the same review concurrently.
5. Keep the existing dashboard and historical data stable during rollout.
6. Provide clear recovery when network, document generation, or WhatsApp sharing fails.
7. Keep the Vercel deployment within the Hobby plan Serverless Function limit.

## 3. Scope

Included:

- Dokter role and restricted clinical navigation.
- Doctor review queue and 30-minute claim.
- Reject, correction, resubmit, and approve flows.
- Repeated `Follow-Up` and `Temporary Unfit` cycles.
- Doctor profile with private signature image.
- Reuse of the existing referral-letter template.
- Administrator joining-decision queue.
- Semi-automatic WhatsApp Web sharing.
- Configurable MCU freshness threshold, default 18 months.
- Workflow-specific error UI, audit, migration, QA, and staged rollout.

Excluded:

- Automatic posting to a normal WhatsApp group.
- WhatsApp Business Platform integration.
- Employee-facing notifications.
- Email or SMS notifications.
- A generic configurable workflow engine.
- Bulk import, advanced search, medical reference ranges, and other later roadmap items.

## 4. Roles

MADIS will have three canonical role values:

- `Admin`, displayed as **Administrator**.
- `Petugas`.
- `Dokter`.

There is no separate `Superadmin` role.

### Administrator

- Retains existing administrative access.
- Manages users, roles, settings, master data, and reports.
- Decides `joined` or `not_joined` for candidates.
- May release an abandoned doctor claim in an emergency.
- May proceed with a joining decision when WhatsApp sharing is not confirmed, but must provide an override reason.
- Cannot create or alter a medical result. Administrative authority does not grant clinical authority.

### Petugas

- Creates MCU records and enters examination/laboratory data.
- Does not select the medical result.
- Corrects submissions rejected by a doctor.
- Records follow-up notes, results, and supporting files.
- Cannot approve medical results or decide employment status.

### Dokter

- Sees all pending doctor reviews; no permanent doctor assignment exists.
- Claims one review for 30 minutes.
- Views examination and laboratory data as read-only.
- Sets medical result and clinical notes.
- Rejects incorrect or incomplete data with a mandatory reason.
- Reviews each follow-up cycle.
- Manages only their profile and private signature.
- Cannot manage employees, users, master data, organizational reports, or employment status.

## 5. Independent Status Dimensions

The implementation must not combine these concepts into one status field.

### Workflow status

- `draft`
- `pending_review`
- `in_review`
- `correction_required`
- `followup_required`
- `completed`
- `approved_legacy`

### Medical result

Terminal results:

- `Fit`
- `Fit With Note`
- `Unfit`

Results requiring another review cycle:

- `Follow-Up`
- `Temporary Unfit`

### Joining status

- `candidate`
- `joined`
- `not_joined`

This status is stored as `joining_status` in the database and exposed as `joiningStatus` in frontend models.

The existing `employee_type`/`employmentStatus` field remains the employee type (`Karyawan PST` or `Vendor`). The existing `is_active`/`activeStatus` field remains the operational `Active/Inactive` status. Both remain separate from joining status and MCU freshness.

Allowed joining-status transitions:

- `candidate -> joined`.
- `candidate -> not_joined`, with a mandatory reason.
- `not_joined -> candidate` only as an Administrator correction with a mandatory reason; a new decision is then required.
- `joined -> not_joined` is forbidden. Later employment changes use the existing `Active/Inactive` status instead.

### WhatsApp share status

- `not_started`
- `prepared`
- `confirmed_by_user`
- `failed`

The UI must say **Dikonfirmasi pengguna**, not **Terkirim**, because a normal WhatsApp group provides no delivery receipt to MADIS.

## 6. Workflow State Machine

### Initial submission

1. Petugas creates an MCU in `draft`.
2. Petugas submits it for review.
3. Server validates required examination data and moves it to `pending_review`.
4. Any Dokter may claim it.
5. A successful claim moves it to `in_review` and sets a 30-minute lease.

### Doctor rejection

1. Dokter supplies a mandatory rejection reason.
2. Server moves the MCU to `correction_required`.
3. No WhatsApp message is prepared.
4. Petugas corrects allowed raw data and resubmits.
5. Server moves it back to `pending_review`.

### Terminal doctor result

1. Dokter selects `Fit`, `Fit With Note`, or `Unfit` and supplies clinical notes.
2. Server finalizes the review cycle and moves the MCU to `completed`.
3. The finalized review cycle becomes immutable.
4. A WhatsApp summary is prepared without an attachment.
5. A first-time candidate enters the joining-decision queue.
6. A joined employee needs no new joining decision.

`Unfit` never automatically changes employment status to `not_joined`. Administrator retains the employment decision and its audit responsibility.

### Follow-up doctor result

1. Dokter selects `Follow-Up` or `Temporary Unfit` and supplies clinical notes.
2. Server finalizes the current review cycle and moves the MCU to `followup_required`.
3. Server generates a signed referral letter from the existing template.
4. A WhatsApp summary and referral-letter download are prepared.
5. Petugas records follow-up evidence and submits it.
6. Server creates the next review cycle and moves the MCU to `pending_review`.
7. A doctor reviews again.
8. The loop repeats while the result remains `Follow-Up` or `Temporary Unfit`.
9. The workflow ends only with `Fit`, `Fit With Note`, or `Unfit`.

Each loop has its own cycle number, review, doctor, timestamps, result, notes, referral letter, and audit events.

## 7. First MCU Versus Periodic MCU

### First MCU for a candidate

- Candidate remains excluded from organizational analytics during review and follow-up.
- Candidate enters **Keputusan Bergabung** only after a terminal medical result.
- Administrator selects `joined` or `not_joined`.
- `not_joined` requires a reason.
- A `not_joined` record remains archived and searchable but never enters organizational analytics.
- There is no automatic permanent deletion. Retention and deletion rules require a separate approved company policy.

### Periodic MCU for an existing joined employee

- Every new MCU still requires doctor review.
- While the new MCU is `draft`, `pending_review`, `in_review`, or `correction_required`, the prior reviewed MCU remains current.
- After the first doctor-approved result, the new MCU becomes current immediately.
- This activation includes `Follow-Up` and `Temporary Unfit`, because the newest known risk must not be hidden by an older result.
- Later approved follow-up cycles update the current medical result on the same MCU.
- Older MCU records remain immutable history; they are not overwritten or deleted.

## 8. Analytics Eligibility and MCU Freshness

Analytics eligibility is derived, not changed by a search or page view.

An employee enters organizational analytics only when all conditions are true:

1. `joining_status = joined`.
2. Existing employee status is `Active`.
3. A reviewed MCU is eligible as the latest current MCU.
4. The MCU examination date is within the configured freshness threshold.

Default freshness threshold: 18 months.

Rules:

- An MCU older than the threshold is shown as expired and excluded from analytics.
- Expired employees and MCU history remain searchable.
- Searching or viewing data never reactivates it.
- Reactivation requires a newly reviewed MCU whose examination date is within the threshold.
- Expiration date is `mcu_date + configured calendar months`; comparison uses the application timezone `Asia/Makassar`.
- Administrator may change the threshold in System Settings.
- Before saving a threshold change, UI must preview the number of employees entering and leaving analytics.
- After confirmation, all derived eligibility is recalculated immediately.
- The setting change and impact summary are audited.

## 9. Data Model

### Existing `users`

- Continue using `role` with canonical values `Admin`, `Petugas`, and `Dokter`.
- Existing `Admin` accounts remain valid and display as Administrator.

### New `doctor_profiles`

Minimum data:

- `user_id`, unique foreign key to `users`.
- Professional display name and optional registration metadata already approved for display.
- Private `signature_object_key`.
- Signature version and update timestamps.

The signature object must be private. The browser must never receive a permanent public signature URL.

### Existing `employees`

Add current joining-decision fields:

- `joining_status`.
- `joining_decided_by`.
- `joining_decided_at`.
- `joining_decision_reason`.

The current value is a projection. Full history belongs in `employee_joining_status_events`.

### New `employee_joining_status_events`

Append-only history containing:

- Employee ID.
- Previous and next joining status.
- Actor ID and role.
- Mandatory reason for `not_joined`, corrections, and overrides.
- Timestamp and request ID.

### Existing `mcus`

Keep examination data and add workflow projection fields:

- `workflow_status`.
- `workflow_version`, incremented on every accepted transition.
- `current_medical_result`.
- `current_review_cycle`.
- `claimed_by`.
- `claimed_at`.
- `claim_expires_at`.
- First reviewed/activated timestamp.
- `current_share_cycle_id`.
- `current_share_status`.

These fields optimize existing pages. Authoritative clinical history remains in review cycles and workflow events.

### New `mcu_review_cycles`

One row per doctor review attempt that reaches a decision:

- MCU ID and cycle number.
- Review stage: initial or follow-up.
- Decision: approved or rejected.
- Medical result when approved.
- Clinical notes or rejection reason.
- Doctor user ID.
- Review timestamps.
- Referral-letter object key when applicable.
- Idempotency key.

A finalized review cycle cannot be updated or deleted.

### New `mcu_workflow_events`

Append-only event stream containing:

- MCU ID and optional review-cycle ID.
- Action.
- Previous and next workflow status.
- Actor ID and role.
- Request ID.
- Safe structured metadata.
- Timestamp.

Events include submit, claim, release, claim expiry/takeover, reject, resubmit, approve, follow-up submission, share preparation, user share confirmation, share failure, and administrative override.

Share events are authoritative history. `mcus.current_share_status` is only a current-cycle projection updated atomically with each share event. This keeps finalized review-cycle rows immutable.

### New `app_settings`

Store `mcu_expiry_months` with default value `18`, updater, timestamp, and version.

## 10. Transaction and Concurrency Model

Workflow transitions must be atomic PostgreSQL operations invoked from the server. Supabase JavaScript calls across several tables are not sufficient for multi-table atomicity.

Use narrowly scoped PostgreSQL RPC functions for:

- Claiming and releasing a review.
- Submitting or resubmitting for review.
- Applying a doctor decision.
- Submitting follow-up evidence.
- Applying an employment decision.
- Updating expiry settings with audited impact metadata.

Concurrency rules:

- Claim succeeds only when no unexpired claim exists.
- Every mutation includes `expected_version`.
- Version mismatch returns `409 Conflict`.
- Active claim owned by another doctor returns `423 Locked`.
- Claim lease is 30 minutes.
- The owner may release the claim.
- An expired claim may be taken by another doctor.
- Double-click and network retry reuse an idempotency key and return the original result instead of duplicating a cycle or event.

## 11. Server API Architecture

The repository currently has ten Vercel Serverless Functions and previously hit the Hobby plan function limit. Approval must add no more than one new function.

Use one consolidated router:

`api/workflow/index.js`

Read operations use `GET /api/workflow?action=<operation>`. Mutations use `POST /api/workflow` with an `action` field and action-specific payload.

Required operations:

- Doctor queue, review detail, review history, and joining queue reads.
- Submit for review.
- Claim and release claim.
- Doctor approve or reject.
- Submit correction and follow-up evidence.
- Apply joining decision.
- Prepare/retry share payload.
- Confirm user share.
- Read/update workflow settings.
- Save the private signature object key after using the existing secured upload pipeline.

API invariants:

- Verify JWT signature and expiry.
- Re-read active user and role from the database for every workflow request; do not trust browser state or stale `app_role` claims alone.
- Validate action permission server-side.
- Call transactional RPC functions for state changes.
- Return stable error codes and a request ID.
- Never return raw SQL, stack traces, service-role credentials, or permanent private-file URLs.

Workflow fields, review tables, employment decisions, and settings must reject direct browser writes through RLS. Only server-controlled operations may mutate them.

## 12. UI Structure

All pages must use the shared sidebar manager so role navigation remains consistent.

### Dokter navigation

- Validasi MCU, with pending badge.
- Review Follow-Up, with pending badge.
- Riwayat Review.
- Profil dan Tanda Tangan.

Review detail is a full desktop page. Examination, laboratory, employee, and prior-MCU data are read-only. Only the medical result, clinical notes, and review action are editable.

### Petugas changes

- Returned/correction badge on relevant work queues.
- Correction form limited to raw data fields.
- Follow-up form for notes, examination results, and supporting files.
- Approval-history view remains read-only.

### Administrator changes

- New **Keputusan Bergabung** menu with pending badge.
- Tabs for waiting decisions and history.
- Filters by candidate, department, medical result, review date, and share status.
- `joined` and `not_joined` decision modal.
- Mandatory reason for `not_joined`.
- Warning and mandatory override reason when WhatsApp sharing is not confirmed.
- System Settings control for MCU expiry threshold with impact preview.

## 13. Referral Letter and Doctor Signature

- Reuse the existing referral-letter template and generator.
- Generate a referral letter only for `Follow-Up` and `Temporary Unfit`.
- Normal terminal results produce no attachment.
- Doctor uploads the signature once in their profile.
- Server embeds the signature only after that doctor approves the review cycle.
- Generated letter includes candidate/employee identity, review cycle, result, clinical notes, doctor identity, review timestamp, and signature.
- Generated PDF is stored privately and downloaded through a short-lived signed URL.
- A later signature-profile update must not modify an already generated letter.

## 14. WhatsApp Share

Recipients: an existing internal WhatsApp group containing HR and SHE administrators. Employees receive nothing from this workflow.

Automatic group posting is excluded because the organization uses a normal WhatsApp group, not an approved WhatsApp Business Platform group API.

Desktop flow:

1. User clicks **Bagikan ke WhatsApp**.
2. MADIS copies the approved summary to the clipboard.
3. For follow-up results, MADIS downloads the referral letter.
4. MADIS opens WhatsApp Web.
5. User selects the internal group.
6. User pastes the summary and attaches the downloaded letter when required.
7. User sends it.
8. User returns to MADIS and confirms **Sudah Dibagikan**.

Summary content:

- Name and employee/candidate ID.
- MCU type and examination date.
- Doctor-approved result.
- Short clinical note.
- Doctor name and review timestamp.

Raw laboratory detail is never written into the group message.

Share failure never rolls back a clinical approval. Retry reuses the same review cycle and document.

## 15. Error UX

Use SweetAlert2 bundled and served locally. Do not load it from a CDN. Existing non-blocking toasts may remain.

Create one workflow error presenter that maps stable API codes to Indonesian UI:

- `401`: session expired; preserve visible form state and offer login.
- `403`: access denied; explain required role and provide a safe return action.
- `409`: data changed; offer to load the latest version.
- `422`: incomplete/invalid data; highlight and focus the affected field.
- `423`: another doctor owns the claim; show doctor name and remaining lease time, then offer read-only view.
- Network failure: preserve form, keep the same idempotency key, and offer retry.
- Document failure: state that approval succeeded and offer document regeneration.
- WhatsApp-open failure: keep copied text/download available and offer retry.
- Unexpected server failure: show a request ID for support without exposing technical internals.

No new workflow code may call raw browser `alert()`.

## 16. Security and Privacy

- Enforce least privilege by role and action.
- Keep doctor signature, referral letters, and medical attachments private.
- Use short-lived signed file URLs.
- Block direct client mutation of protected workflow data through RLS.
- Sanitize structured metadata before writing audit events.
- Do not store medical drafts in `localStorage`.
- Do not include raw medical detail in WhatsApp summaries.
- Do not log JWTs, credentials, signature URLs, or raw clinical documents.
- Preserve immutable clinical and employment-decision history.
- A production RLS verification remains a release gate.

## 17. Legacy Migration

Migration must be additive and preserve current behavior.

Required sequence:

1. Back up production and record baseline counts/KPIs.
2. Add nullable columns and new tables without changing application behavior.
3. Backfill every existing employee as `joined` while preserving current `Active/Inactive` status.
4. Backfill every existing MCU as `approved_legacy`.
5. Populate `current_medical_result` from the existing final result when present, otherwise the initial/current status.
6. Create indexes and constraints after successful backfill validation.
7. Set defaults for newly created employees and MCU records only after backfill:
   - New employee: `candidate`.
   - New MCU: `draft`.
8. Keep the feature flag disabled until API and UI validation pass.

Existing data must not enter doctor queues or joining-decision queues. Existing dashboard totals and distributions must remain unchanged immediately after migration.

No destructive column or table removal is part of this release.

## 18. Testing

### State and permission tests

- Every valid and invalid transition.
- Petugas cannot set a medical result.
- Dokter cannot edit raw examination/lab data.
- Administrator cannot create or alter a medical result.
- Only Administrator can decide joining status and update expiry settings.
- Direct protected-table writes fail under browser credentials.

### Concurrency and idempotency tests

- Two doctors claim simultaneously; only one succeeds.
- Expired claim takeover.
- Stale `expected_version` returns `409`.
- Duplicate approve/reject/follow-up requests create one result.
- Retry after uncertain network response returns the original result.

### Workflow tests

- Rejection, correction, and resubmission.
- Direct terminal result.
- Repeated `Follow-Up` cycles.
- Repeated `Temporary Unfit` cycles.
- Follow-up eventually reaching each terminal result.
- Candidate excluded until `joined`.
- `Unfit` still requires an Administrator employment decision.
- Periodic pending MCU leaves prior MCU current.
- Reviewed follow-up result becomes the current MCU for a joined employee.

### Document and share tests

- Private signature upload and replacement.
- Signed referral-letter generation.
- Existing letter remains unchanged after signature replacement.
- Download URL expiry.
- Share preparation, confirmation, failure, and retry.
- Approval survives document/share failure.

### Expiry tests

- Default 18-month calculation uses MCU examination date.
- Boundary dates.
- Immediate recalculation after setting change.
- Impact preview matches applied result.
- Search/view never changes eligibility.
- New reviewed MCU reactivates eligibility.

### Browser and UI tests

- Chrome, Safari, and Edge desktop.
- SweetAlert mapping for `401`, `403`, `409`, `422`, `423`, network, and server failures.
- Keyboard focus and modal dismissal behavior.
- Sidebar/menu consistency across every new page.
- Mobile layout must remain usable even though desktop is the primary workflow device.

### Migration regression tests

- Employee count before and after migration.
- MCU count before and after migration.
- Dashboard KPIs and chart distributions before and after migration.
- Existing report output before and after migration.
- No legacy records in new work queues.

## 19. Rollout

1. Create and verify a production backup.
2. Capture production KPI and row-count baseline.
3. Rehearse migration against a production-shaped staging copy.
4. Deploy additive migration with workflow feature flag off.
5. Deploy consolidated API and UI with feature flag off.
6. QA with Petugas, Dokter, and Administrator test accounts.
7. Run security, concurrency, document, and browser tests.
8. Enable for a controlled pilot.
9. Reconcile dashboard and report totals.
10. Enable approval for all newly created MCU records.
11. Enable configurable expiry behavior last.
12. Monitor workflow errors, stale claims, share failures, and audit completeness for one full operational cycle.

Rollback disables the feature flag and returns new UI entry points to read-only/unavailable state. Additive schema and audit data remain; rollback must not delete clinical records or events.

## 20. Acceptance Criteria

The feature is ready only when:

1. Existing production KPIs remain unchanged after legacy migration.
2. Every new MCU requires a doctor decision before becoming current.
3. A first-time candidate cannot enter analytics before `joined`.
4. A periodic pending/rejected MCU cannot displace the prior reviewed MCU.
5. An approved `Follow-Up` or `Temporary Unfit` becomes current for an existing joined employee.
6. Repeated follow-up cycles retain complete immutable history.
7. Two doctors cannot approve the same cycle.
8. Medical decisions cannot be changed by Petugas or Administrator.
9. Employment decisions cannot be changed by Petugas or Dokter.
10. Document/share failure cannot roll back or duplicate approval.
11. Every workflow error has a clear Indonesian UI and recovery action.
12. Expired records leave analytics but remain searchable.
13. Searching never changes employee or MCU eligibility.
14. All sensitive actions produce an auditable event.
15. Production stays within the Vercel Hobby Serverless Function limit.

## 21. Follow-on Roadmap

After approval workflow reaches acceptance and completes one monitored operational cycle, development may continue in this order:

1. Employee bulk import.
2. Advanced search and saved filters.
3. Medical reference ranges and alerts.
4. Official notification integrations when the required business accounts exist.
5. Health trends, custom reports, and follow-up templates.
