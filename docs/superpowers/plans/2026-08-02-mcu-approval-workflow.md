# MCU Approval Workflow Implementation Plan

**Date:** 2026-08-02
**Design:** `docs/superpowers/specs/2026-08-01-mcu-approval-workflow-design.md`
**Status:** Ready for implementation after plan approval

## 1. Objective

Implement the approved MCU workflow without changing legacy production totals during migration:

- Petugas records raw MCU data and follow-up evidence.
- Dokter owns medical decisions through a claim-based review queue.
- Administrator owns candidate joining decisions and expiry configuration.
- Analytics uses only eligible employees and reviewed MCU data.
- Every transition is atomic, versioned, idempotent, and auditable.
- Deployment stays below the Vercel Hobby limit by adding only `api/workflow/index.js`.

## 2. Non-Negotiable Guards

1. Keep these three concepts separate:
   - `employee_type` / `employmentStatus`: `Karyawan PST` or `Vendor`.
   - `is_active` / `activeStatus`: operational Active or Inactive.
   - `joining_status` / `joiningStatus`: `candidate`, `joined`, or `not_joined`.
2. Never overwrite or delete a finalized clinical review cycle.
3. Never trust frontend role state for workflow mutations. Re-read `users.active` and `users.role` in every workflow API request.
4. Never expose permanent URLs for doctor signatures or referral letters.
5. Never mark a normal WhatsApp share as delivered. Store only `confirmed_by_user`.
6. Keep feature flag off until migration, API, RLS, browser QA, and KPI reconciliation pass.
7. Do not alter or remove legacy columns in this release. Existing `initial_result`, `final_result`, and `status` remain compatibility projections updated only by server workflow code after activation.
8. Do not add another Vercel function. Current count is 10; workflow raises it to 11 of 12.

## 3. Target Architecture

### Database owns truth

PostgreSQL owns state transitions, row locking, version checks, idempotency, immutable events, and analytics eligibility. Server code calls narrowly scoped RPC functions; it does not emulate a transaction with several Supabase requests.

### One server entry point

`api/workflow/index.js` authenticates, reloads the active user, validates the action, invokes the matching service/RPC, and maps failures into a stable API envelope:

```json
{
  "success": false,
  "code": "WORKFLOW_LOCKED",
  "message": "MCU sedang direview dokter lain.",
  "requestId": "...",
  "details": {}
}
```

### Small frontend modules

New workflow behavior lives in focused services/pages. Existing large files receive only integration changes. The shared sidebar manager renders one role-aware navigation definition for every page.

### Feature-flag compatibility

While workflow is disabled, newly created data follows legacy behavior and receives `approved_legacy` / `joined`. When enabled, new records receive `draft` / `candidate`. A database trigger reads the protected setting so a partial deployment cannot accidentally queue legacy records.

## 4. Delivery Sequence

### Task 1: Add Workflow Contracts and Test Harness

**Files**

- Create `server/workflow/constants.js`.
- Create `server/workflow/errors.js`.
- Create `tests/workflow/contracts.test.js`.
- Modify `package.json`.

**Work**

1. Define frozen canonical values for roles, workflow states, medical results, joining states, share states, claim duration, and stable error codes.
2. Add helpers that validate values and translate database error markers to HTTP status/code without exposing raw SQL messages.
3. Add root scripts:
   - `test`: `node --test`.
   - `test:workflow`: `node --test tests/workflow/*.test.js`.
4. Test every allowed value, rejected value, HTTP mapping, and the `employmentStatus` versus `joiningStatus` naming guard.

**Verify**

```bash
npm run test:workflow
node --check server/workflow/constants.js
node --check server/workflow/errors.js
```

**Commit:** `test: define workflow contracts`

### Task 2: Add Additive Schema and Legacy Backfill

**Files**

- Create `migrations/20260802_01_mcu_workflow_schema.sql`.
- Create `migrations/20260802_02_mcu_workflow_backfill.sql`.
- Update `mcu-management/supabase-schema.sql` only after migration SQL passes on staging.

**Work**

1. Extend the `users.role` constraint to `Admin`, `Petugas`, and `Dokter` without renaming existing Admin rows.
2. Add `employees.joining_status`, `joining_decided_by`, `joining_decided_at`, and `joining_decision_reason`.
3. Add MCU projection fields from the design, including `activated_at` as the timestamp used to select the current reviewed MCU.
4. Create:
   - `doctor_profiles`.
   - `employee_joining_status_events`.
   - `mcu_review_cycles`.
   - `mcu_workflow_events`.
   - `app_settings`.
5. Add checks, foreign keys, unique cycle constraints, partial idempotency indexes, queue indexes, and current-MCU indexes.
6. Seed protected settings:
   - `mcu_approval_workflow_enabled = false`.
   - `mcu_expiry_months = 18`.
7. Backfill every existing employee as `joined`, preserving `employee_type` and `is_active` exactly.
8. Backfill every existing MCU as `approved_legacy`, derive `current_medical_result`, and assign a deterministic legacy `activated_at`.
9. Make backfill rerunnable with predicates; never duplicate events or change already migrated rows.
10. Add a compatibility trigger so records created before activation remain legacy and records created after activation default to candidate/draft.

**Verify on production-shaped staging copy**

- Employee and MCU row counts unchanged.
- `employee_type` distribution unchanged.
- Active/Inactive distribution unchanged.
- Existing dashboard status distribution unchanged.
- No legacy MCU appears in a doctor or joining queue.
- Running both migration files twice produces no new changes or errors.

**Commit:** `feat: add workflow schema and backfill`

### Task 3: Implement Transactional State Machine

**Files**

- Create `migrations/20260802_03_mcu_workflow_functions.sql`.
- Create `tests/workflow/state-machine.sql`.

**Work**

1. Add private SQL helpers for active-role lookup, idempotency lookup, version assertion, safe event append, and workflow-enabled assertion.
2. Every mutating function must be `SECURITY DEFINER`, set `search_path = public`, lock the MCU row with `FOR UPDATE`, and re-check state inside the same transaction.
3. Implement RPC functions for:
   - Save draft raw MCU/lab/history data.
   - Submit and resubmit review.
   - Claim, release, expire, and Administrator-release claim.
   - Doctor reject or approve.
   - Submit follow-up evidence.
   - Apply or correct joining decision.
   - Prepare, fail, and confirm WhatsApp share state.
   - Preview and update expiry months.
   - Enable/disable workflow with an audit event.
4. Store one finalized review-cycle row for every reject or approval decision.
5. On an approved cycle:
   - Update `current_medical_result` and compatibility result columns.
   - Set `activated_at` only on the first approved cycle for that MCU.
   - Set `completed` for terminal results or `followup_required` for looping results.
   - Clear claim fields.
   - Increment `workflow_version` once.
6. On reject, require reason, append an immutable cycle/event, move to `correction_required`, clear claim, and do not prepare WhatsApp.
7. Use a unique idempotency key per actor/action. A repeated successful request returns the existing result rather than inserting another cycle/event.
8. Return stable database markers for stale version, invalid transition, missing fields, and active foreign claims so the API can map `409`, `422`, and `423` reliably.

**SQL test cases**

- Full valid transition matrix and every invalid edge.
- Two claim attempts against one MCU; exactly one owner.
- Claim takeover only after the 30-minute lease expires.
- Duplicate approval, rejection, follow-up, and joining requests create one event/cycle.
- Stale `expected_version` leaves all rows unchanged.
- Follow-Up and Temporary Unfit can repeat, then terminate.
- Unfit does not mutate `joining_status`.
- Candidate does not enter joining queue before a terminal result.
- Joined periodic MCU becomes current on first approval, including Follow-Up.
- Prior approved MCU remains current while replacement is draft/pending/rejected.

**Verify**

Run the SQL suite inside a transaction against a staging copy and roll it back after assertions. Any failed assertion stops execution.

**Commit:** `feat: add transactional MCU workflow`

### Task 4: Lock Down Workflow Data with RLS and Triggers

**Files**

- Create `migrations/20260802_04_mcu_workflow_security.sql`.
- Create `tests/workflow/security.sql`.
- Update `migrations/secure-rls-authenticated.sql` so future setup does not recreate permissive policies for protected workflow objects.

**Work**

1. Revoke direct `INSERT`, `UPDATE`, and `DELETE` on review cycles, workflow events, joining events, doctor profiles, and protected settings from `anon` and `authenticated`.
2. Revoke workflow RPC execution from `PUBLIC`, `anon`, and `authenticated`; grant only the server role used by `SUPABASE_SERVICE_ROLE_KEY`.
3. Add immutable triggers that reject update/delete on finalized review cycles and all workflow/joining event rows.
4. Add a guard trigger on `mcus` and `employees`:
   - When feature flag is off, preserve legacy compatibility.
   - When on, browser writes cannot alter workflow, medical decision, joining decision, claim, activation, share projection, or workflow-owned raw MCU/lab/history rows.
   - Petugas raw-data mutations use the server RPC path, which reloads the active database role before writing.
5. Keep SELECT policies compatible with current pages while restricting private signature/document metadata to server access.
6. Sanitize event metadata and cap reason/note lengths at the database boundary.

**Verify**

- Browser-authenticated SQL attempts cannot set a medical result or joining decision.
- Dokter token cannot alter raw exam/lab fields directly.
- Petugas token cannot update finalized cycle/event rows.
- Service RPC succeeds for valid actions.
- Legacy CRUD still works while feature flag is off.

**Commit:** `security: protect MCU workflow data`

### Task 5: Build Server Authorization and Workflow Service

**Files**

- Modify `server/auth-utils.js`.
- Create `server/workflow/authorization.js`.
- Create `server/workflow/workflowService.js`.
- Create `tests/workflow/authorization.test.js`.
- Create `tests/workflow/workflow-service.test.js`.

**Work**

1. Keep JWT verification in `requireAuth`, then add a helper that reloads `user_id`, `role`, and `active` from Supabase.
2. Reject missing/inactive users even when the JWT has not expired.
3. Define an explicit action-to-role map. Administrator must not receive doctor permissions.
4. Generate a request ID for every request and include it in response/error logging.
5. Keep logs free of JWTs, medical payloads, signatures, and signed URLs.
6. Implement one service method per API action. Mutations delegate to RPC; reads use server-side queries with selected columns only.
7. Normalize PostgREST/database errors through `errors.js`.

**Verify**

- Stale JWT role cannot authorize an action after the database role changes.
- Inactive user receives `401`.
- Wrong active role receives `403`.
- Every failure contains stable `code`, Indonesian `message`, and `requestId`.

**Commit:** `feat: authorize workflow operations`

### Task 6: Add the Single Workflow API Router

**Files**

- Create `api/workflow/index.js`.
- Modify `vercel.json` only to configure this function's duration if required; do not add `memory` entries ignored by Active CPU billing.
- Create `tests/workflow/api-router.test.js`.

**Work**

1. Support `OPTIONS`, `GET`, and `POST` with existing CORS helpers.
2. Route only whitelisted actions. Unknown actions return `404 WORKFLOW_ACTION_NOT_FOUND`.
3. Enforce JSON body size and validate method/action combinations.
4. Required reads:
   - Bootstrap/feature state and pending counts.
   - Doctor queue, review detail, and review history.
   - Petugas correction/follow-up queues.
   - Joining queue/history.
   - Doctor profile.
   - Expiry setting and preview.
5. Required mutations:
   - Save/submit/resubmit MCU data.
   - Claim/release/review.
   - Submit follow-up evidence.
   - Joining decision/correction.
   - Share prepare/fail/confirm.
   - Signature upload lifecycle.
   - Referral regeneration/download authorization.
   - Expiry update and feature activation.
6. Require `expectedVersion` and `idempotencyKey` on state-changing requests.
7. Set `Cache-Control: no-store` on all workflow responses.

**Verify**

```bash
node --check api/workflow/index.js
npm run test:workflow
find api -type f -name '*.js' | wc -l
```

Expected function count: `11`.

**Commit:** `feat: add consolidated workflow API`

### Task 7: Add Private Signature and Referral-Letter Pipeline

**Files**

- Modify `package.json` and `package-lock.json` to add `pdfkit` as the single server PDF dependency.
- Create `server/workflow/privateStorageService.js`.
- Create `server/workflow/referralLetterService.js`.
- Add the approved clinic logo, Noto Sans regular/bold fonts, and font license under `server/workflow/assets/`.
- Create `tests/workflow/referral-letter.test.js`.
- Modify `mcu-management/js/utils/rujukanConfig.js` only if field labels need a shared canonical mapping.
- Modify `mcu-management/js/utils/rujukanPDFGenerator.js` only to keep legacy output aligned with the approved server layout.

**Work**

1. Use a dedicated private R2 bucket configured by `R2_PRIVATE_BUCKET_NAME`; do not use `R2_PUBLIC_URL`.
2. Signature upload flow:
   - API validates Dokter role and image metadata.
   - Return a short-lived presigned PUT URL for PNG/JPEG only, maximum 2 MB.
   - Store a versioned object key under the doctor user ID.
   - Confirm upload with an R2 HEAD check before updating `doctor_profiles`.
3. Generate referral PDF only after a committed Follow-Up or Temporary Unfit approval.
4. Reproduce the existing letter's approved fields/layout server-side, use bundled logo and Unicode fonts, embed the approving doctor's current signature bytes, and persist the PDF privately. PDF generation must not fetch external assets at runtime.
5. Store object key and signature version on the review cycle through a dedicated server-only RPC/event.
6. A PDF failure records `DOCUMENT_FAILED` but never rolls back the medical approval. Retry uses the same cycle and does not add a new clinical decision.
7. Download action returns a short-lived signed GET URL only to an authorized active user.

**Verify**

- Generated PDF starts with `%PDF`, contains required text, and has non-zero size.
- Terminal Fit/Fit With Note/Unfit creates no PDF.
- Updating doctor signature does not change an existing letter object.
- Private objects are inaccessible without a signed URL.
- Signed URL expires.

**Environment release gate**

- `R2_ACCOUNT_ID`.
- `R2_ACCESS_KEY_ID`.
- `R2_SECRET_ACCESS_KEY`.
- `R2_PRIVATE_BUCKET_NAME`.

**Commit:** `feat: secure referral documents`

### Task 8: Add Frontend API Client and Error UI

**Files**

- Create `mcu-management/js/services/workflowService.js`.
- Create `mcu-management/js/utils/workflowErrorPresenter.js`.
- Create `mcu-management/js/utils/workflowIdempotency.js`.
- Add pinned local SweetAlert2 assets and license under `mcu-management/assets/vendor/sweetalert2/`.
- Create `tests/workflow/frontend-contract.test.js`.

**Work**

1. Add one fetch wrapper that attaches bearer token, parses the stable envelope, and never retries a mutation with a new idempotency key.
2. Keep an idempotency key in memory/form state until success or explicit cancellation. Do not store medical drafts in `localStorage`.
3. Add one SweetAlert2 presenter for `401`, `403`, `409`, `422`, `423`, network, document, WhatsApp, and unexpected server failures.
4. Preserve visible form state on session/network errors.
5. For `409`, reload latest version only after user confirmation.
6. For `423`, show owner and remaining lease, then switch to read-only mode.
7. Remove raw `alert()` only from new/modified workflow paths; unrelated legacy alerts remain outside this release.
8. Reuse the existing `cp -r assets dist/` build step; no new frontend bundler or vendor-copy script is needed.

**Verify**

- No workflow module references a CDN SweetAlert URL.
- Every stable API code has an Indonesian title, message, and recovery action.
- Duplicate click is disabled while request is pending.

**Commit:** `feat: add workflow client error UI`

### Task 9: Add Role-Aware Canonical Navigation

**Files**

- Modify `mcu-management/js/sidebar-manager.js`.
- Modify `mcu-management/js/utils/sidebarInit.js` to delegate role/menu behavior to the manager.
- Modify `mcu-management/js/router/spaRouter.js` for new routes if SPA navigation remains enabled.
- Modify `mcu-management/pages/kelola-user.html`.
- Modify `mcu-management/js/pages/kelola-user.js`.
- Modify `mcu-management/js/services/authService.js`.

**Work**

1. Make `sidebar-manager.js` the only navigation definition and render it by role after auth state is available.
2. Administrator menu includes existing administration/reporting pages plus **Keputusan Bergabung** and expiry settings.
3. Petugas menu includes data entry, correction, follow-up evidence, and permitted existing pages.
4. Dokter menu includes Validasi MCU, Review Follow-Up, Riwayat Review, and Profil/Tanda Tangan only.
5. Add pending badges from workflow bootstrap response without blocking initial navigation render.
6. Display canonical `Admin` as **Administrator** but store `Admin` in the database/JWT.
7. Add `Dokter` to create/edit user forms and role badges.
8. Keep mobile open/close, focus, active-link, and report submenu behavior consistent.

**Verify**

- Same role sees identical sidebar on every page.
- Direct navigation to a hidden page still performs page-level authorization.
- Desktop and mobile sidebars show no duplicate links.

**Commit:** `feat: add doctor role navigation`

### Task 10: Convert New MCU Entry and Correction Flow

**Files**

- Modify `mcu-management/pages/tambah-karyawan.html`.
- Modify `mcu-management/js/pages/tambah-karyawan.js`.
- Modify `mcu-management/js/services/mcuBatchService.js`.
- Modify `mcu-management/js/services/mcuService.js`.
- Modify `mcu-management/js/services/databaseAdapter.js`.
- Modify `mcu-management/js/services/databaseAdapter-transforms.js`.
- Modify `mcu-management/pages/kelola-karyawan.html`.
- Modify `mcu-management/js/pages/kelola-karyawan.js`.

**Work**

1. Add `joiningStatus` mappings without changing existing `employmentStatus` mappings.
2. When workflow is enabled:
   - Petugas cannot enter `initialResult`, `finalResult`, or medical decision notes.
   - Existing `doctor` field is clearly labeled as source/examiner metadata and never treated as reviewer assignment.
   - Save/submit uses workflow API and server transaction instead of direct workflow-field writes.
3. Keep legacy form behavior only while the feature flag is off.
4. After successful submit, show MCU ID and `Menunggu review dokter`; do not show a medical result.
5. Add correction badge/detail. Open the existing MCU editor in correction mode, permit only raw fields, show doctor's reason, and resubmit through API.
6. Keep uploaded files attached to the draft if submit fails; offer retry with the same idempotency key.
7. Block editing when workflow status no longer belongs to Petugas.

**Verify**

- New employee under enabled workflow is `candidate`; existing joined employee remains `joined`.
- Petugas cannot produce a medical result through UI or direct request.
- Rejected submission returns to queue after correction.
- `employmentStatus` still displays Karyawan PST/Vendor.

**Commit:** `feat: submit MCU for doctor review`

### Task 11: Build Doctor Queue, Review, History, and Profile

**Files**

- Create `mcu-management/pages/validasi-mcu.html`.
- Create `mcu-management/js/pages/validasi-mcu.js`.
- Create `mcu-management/pages/profil-dokter.html`.
- Create `mcu-management/js/pages/profil-dokter.js`.
- Create `mcu-management/css/workflow.css`.

**Work**

1. Queue page has Pending, Follow-Up, and History tabs so review behavior remains in one bounded module.
2. Queue shows claim state, waiting duration, cycle, employee, MCU type/date, and current workflow status.
3. Detail page renders employee, exam, lab, files, prior reviewed MCU, and earlier cycles as read-only.
4. Claim before enabling decision controls. Refresh lease countdown from server timestamps.
5. Review form supports:
   - Reject with mandatory reason.
   - Fit, Fit With Note, Unfit, Follow-Up, or Temporary Unfit with clinical notes.
6. On `409` or `423`, prevent stale submission and keep entered clinical notes visible until the doctor chooses reload/leave.
7. Profile page uploads/replaces private signature and shows only version/update metadata, never a permanent URL.
8. Use responsive tables/cards and keyboard-accessible controls.

**Verify**

- Two browser sessions cannot both own one claim.
- Administrator/Petugas direct page access is denied.
- Doctor cannot edit raw data through the DOM or API.
- History shows immutable cycles in order.

**Commit:** `feat: add doctor review workspace`

### Task 12: Convert Follow-Up into Evidence and Re-Review

**Files**

- Modify `mcu-management/pages/follow-up.html`.
- Modify `mcu-management/js/pages/follow-up.js`.
- Modify `mcu-management/js/services/mcuBatchService.js` only where shared raw-data save behavior requires it.

**Work**

1. Queue derives from `followup_required`, not legacy `initialResult === 'Follow-Up'`.
2. Petugas enters evidence, notes, raw examination/lab updates, and attachments; remove final medical result selection.
3. Submission creates the next review stage through API and moves the MCU to `pending_review`.
4. Preserve every prior cycle and letter link as read-only history.
5. Treat Temporary Unfit exactly like Follow-Up for repeated cycles.
6. Keep legacy follow-up behavior behind the disabled feature flag until activation.

**Verify**

- Follow-Up -> evidence -> review -> Follow-Up can repeat twice without overwriting history.
- Temporary Unfit follows the same loop.
- Final terminal doctor result removes the MCU from Petugas follow-up queue.

**Commit:** `feat: add repeatable follow-up reviews`

### Task 13: Build WhatsApp Share and Joining Decision UI

**Files**

- Create `mcu-management/js/utils/whatsappShare.js`.
- Create `mcu-management/pages/keputusan-bergabung.html`.
- Create `mcu-management/js/pages/keputusan-bergabung.js`.

**Work**

1. Build summary only from server-approved review data; never accept clinical text assembled from editable DOM fields.
2. Share action copies summary, downloads referral PDF only for Follow-Up/Temporary Unfit, and opens WhatsApp Web.
3. User manually chooses the existing HR/SHE group, pastes/attaches, sends, then confirms in MADIS.
4. Store `confirmed_by_user`; UI must not say `Terkirim`.
5. Share/open/download failures do not alter doctor approval. Retry uses the same review cycle.
6. Joining page is Administrator-only with Waiting and History tabs plus approved filters.
7. Require reason for `not_joined` and for proceeding before share confirmation.
8. Allow `not_joined -> candidate` only as an audited correction with reason. Forbid `joined -> not_joined`.

**Verify**

- Terminal result creates text-only share.
- Follow-Up/Temporary Unfit includes one immutable letter download.
- Candidate enters joining queue only after terminal result.
- Unfit remains a manual Administrator joining decision.
- `not_joined` remains searchable and excluded from analytics.

**Commit:** `feat: add sharing and joining decisions`

### Task 14: Centralize Analytics Eligibility and Expiry

**Files**

- Create `migrations/20260802_05_mcu_analytics_views.sql`.
- Create `mcu-management/js/services/analyticsEligibilityService.js`.
- Modify `mcu-management/js/services/mcuService.js`.
- Modify `mcu-management/js/services/mcuExpiryService.js`.
- Modify `mcu-management/js/services/analysisDashboardService.js`.
- Modify `mcu-management/js/pages/dashboard.js`.
- Modify `mcu-management/js/pages/assessment-rahma.js`.
- Modify `mcu-management/js/pages/assessment-rahma-dashboard.js`.
- Modify `mcu-management/pages/mcu-expiry-management.html`.
- Modify `mcu-management/js/pages/mcu-expiry-management.js`.

**Work**

1. Add database views:
   - Current reviewed MCU per employee, selected by `activated_at`.
   - Analytics-eligible employees: joined, operationally active, non-deleted, reviewed current MCU, and current MCU date within configured calendar months.
   - Reviewed MCU history for currently eligible employees where historical charts need all years.
   - Expiry overview including expired/no-MCU employees without mutating `is_active`.
2. Calculate cutoff using calendar months and `Asia/Makassar`; remove hardcoded 365-day logic.
3. Replace independent frontend "latest MCU" reducers in dashboard, Analysis, Jakarta Cardiovascular, and expiry pages with the central service/view.
4. Keep employee search/history on raw searchable data. Viewing/searching must not update eligibility.
5. Add Administrator expiry setting UI with numeric bounds, impact preview, confirmation, audited update, and immediate refresh.
6. Keep existing KPI values unchanged while feature flag is off by returning legacy-compatible view results.

**Verify**

- Date exactly at cutoff is handled consistently.
- 18 calendar months works across month-end and leap-year dates.
- Changing threshold preview equals applied impact.
- Search/view performs no employee/MCU update.
- A fresh reviewed MCU makes a joined Active employee eligible again.
- Legacy baseline KPIs remain identical before activation.

**Commit:** `feat: enforce reviewed analytics data`

### Task 15: Release Assets, Cache Version, and QA Runbook

**Files**

- Modify `mcu-management/sw.js`.
- Modify `mcu-management/version.json`.
- Modify `mcu-management/package.json` version.
- Modify `vercel.json` only if CSP needs local asset declarations or workflow function duration.
- Create `docs/qa/QA-MCU-APPROVAL-WORKFLOW.md`.
- Create `docs/runbooks/MCU-WORKFLOW-ROLLOUT.md`.
- Create `migrations/20260802_06_mcu_workflow_verification.sql`.

**Work**

1. Bump one release version consistently in package, version manifest, and service-worker cache.
2. Add new local workflow CSS/vendor assets/pages to build and required cache list without caching API/private responses.
3. Verify CSP does not require a new external origin for SweetAlert, signatures, or PDFs.
4. Add preflight SQL for row counts, role counts, workflow-state counts, duplicate cycles, orphan events, invalid claims, and legacy queue leakage.
5. Write exact staging and production sequence:
   - Backup.
   - Capture KPI/count baseline.
   - Apply schema/backfill/functions/security with flag off.
   - Deploy API/UI.
   - Run three-role QA.
   - Reconcile KPIs.
   - Enable controlled pilot.
   - Monitor one operational cycle.
   - Enable expiry changes last.
6. Rollback only disables the feature and navigation. Never remove additive tables/events or delete clinical data.

**Automated verification**

```bash
npm test
npm run build
git diff --check
find api -type f -name '*.js' | wc -l
```

Expected function count: `11`.

**Manual/browser matrix**

- Chrome, Safari, Edge desktop.
- Chrome/Safari mobile widths: 360, 390, and 430 px.
- Admin, Petugas, Dokter roles.
- Normal, slow network, offline during mutation response, expired session, stale version, and locked review.
- Refresh and normal reload after deployment; no hard refresh required.
- No console errors, CSP violations, uncaught promise rejections, or private URL leakage.

**Commit:** `test: document workflow release gates`

## 5. Production Activation Gate

Do not enable `mcu_approval_workflow_enabled` until all are true:

- Verified production backup exists.
- Migration and SQL assertions passed on production-shaped staging.
- Legacy employee/MCU counts and dashboard KPI snapshot match baseline.
- Vercel build succeeds with exactly 11 functions.
- Private R2 bucket and signed URL checks pass.
- Three role accounts pass end-to-end workflow.
- Concurrent claim and duplicate-request tests pass.
- Chrome, Safari, Edge, and mobile QA pass.
- Workflow errors show Indonesian recovery UI and request ID.
- Administrator explicitly confirms pilot activation.

## 6. First Pilot Scenario

Use one synthetic candidate and one synthetic joined employee:

1. Candidate: submit -> reject -> correct -> approve Follow-Up -> share -> evidence -> approve Fit -> share -> Administrator joins.
2. Joined employee: submit periodic MCU -> old MCU remains current -> doctor approves Temporary Unfit -> new MCU becomes current -> evidence -> doctor approves Fit With Note.
3. Reconcile queue, events, cycles, analytics, expiry, documents, and share projections after each step.

Delete no pilot audit/history rows. Mark synthetic employees clearly and exclude them from production reporting through an approved test-data convention or run the pilot in staging.

## 7. Deliberately Deferred

- WhatsApp Business API automation.
- Employee notifications.
- Generic workflow designer.
- Bulk import and advanced search.
- Destructive cleanup of legacy result columns.
- Automatic deletion of `not_joined` candidates.

These remain outside this implementation. Add only after the approval workflow completes one monitored operational cycle.
