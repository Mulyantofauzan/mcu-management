# MCU Workflow Rollout 1.1.0

## Preconditions

- Database backup and production-shaped staging copy exist.
- Vercel has `SUPABASE_SERVICE_ROLE_KEY`, JWT variables, and existing public R2 variables.
- Private R2 bucket exists and these variables are set: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PRIVATE_BUCKET_NAME`.
- At least one active Dokter user has completed professional profile and signature.
- Feature flag remains `false`.

## Deploy Order

1. Record baseline employee/MCU row counts, employee type, Active/Inactive, dashboard KPI, department, and medical-result distributions.
2. Apply migrations `20260802_01` through `20260802_07` in filename order. Stop on first error.
3. Run `20260802_08_mcu_workflow_verification.sql`.
4. Re-run migrations 01-07 on staging to prove rerun safety. Run verification again.
5. Deploy application version 1.1.0 with feature flag still off.
6. Run automated and browser QA from `docs/qa/QA-MCU-APPROVAL-WORKFLOW.md`.
7. Reconcile flag-off KPI values against baseline. Any unexplained difference blocks activation.
8. Confirm Doctor, Petugas, and Administrator role access plus private PDF/signature storage.
9. Enable workflow through the audited Administrator action and provide a release reason.
10. Monitor API `requestId` errors, queue counts, document failures, and user reports for one operational cycle.

## Rollback

1. Disable workflow through the audited Administrator action.
2. Do not drop new columns, views, review cycles, events, or private documents.
3. Existing finalized review and joining history remains authoritative and immutable.
4. Investigate using API `requestId`; never repair workflow status by direct browser/database edits.
5. Redeploy the prior frontend only after confirming it remains compatible with additive schema.

## Activation Blockers

- Any failed contract/build/verification test.
- Vercel function count above 12.
- Missing private R2 variable or publicly readable private object.
- KPI mismatch while flag is off.
- Missing Dokter signature.
- Direct authenticated writes can change workflow, medical result, claim, share, or joining fields.
- Chrome/Safari normal reload requires hard refresh to load correct data/code.
