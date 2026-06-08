# Bug Closure: Auth, RLS, and File API Exposure

Date: 2026-06-08
Production domain: https://madis.sabdamu.my.id/

## Summary

This bug covered unauthenticated access risks in the MADIS/MCU web app:

- Supabase anon key could read/count production tables because RLS policies were permissive.
- File-related serverless APIs could be called without an app login.
- Production security headers were incomplete on Vercel.
- User management still created some passwords with legacy Base64 encoding.
- Local/static login flow could crash when `import.meta.env` was unavailable.

## Root Cause

The app had its own local/session authentication, but Supabase and several serverless APIs did not receive a server-verifiable app session token. Because existing RLS policies allowed broad `anon` access, the browser anon key effectively had direct database visibility. File APIs used service-role credentials server-side without requiring a bearer token first.

## Fix Implemented

- Added server-side login endpoint that verifies existing app users and mints a Supabase-compatible JWT.
- Added shared API auth/CORS utilities.
- Required bearer-token auth for file upload, file listing, signed download, soft delete, hard delete, permanent MCU delete, and R2 diagnostics.
- Updated frontend auth to store `madisAccessToken` and send it to Supabase/API calls.
- Updated Supabase client initialization to use the app JWT as the Authorization bearer.
- Cleaned logout paths so `currentUser`, legacy `auth_token`, and `madisAccessToken` are cleared.
- Updated Kelola User create/update password flow to use salted hashing from `authService`.
- Added Vercel security headers.
- Changed build script to remove stale `dist` before copying new files.
- Added production RLS migration that removes permissive policies and allows only `authenticated` JWT role access.

## Files Changed

- `api/auth-utils.js`
- `api/login/index.js`
- `api/compress-upload/index.js`
- `api/config.js`
- `api/delete-file/index.js`
- `api/delete-mcu-files/index.js`
- `api/download-file/index.js`
- `api/get-mcu-files/index.js`
- `api/hard-delete-file/index.js`
- `api/permanently-delete-mcu/index.js`
- `api/r2SignedUrlService.js`
- `api/test-r2-config/index.js`
- `mcu-management/js/config/envConfig.js`
- `mcu-management/js/config/supabase.js`
- `mcu-management/js/pages/kelola-user.js`
- `mcu-management/js/services/authService.js`
- `mcu-management/js/services/supabaseStorageService.js`
- `mcu-management/js/utils/sessionManager.js`
- `mcu-management/js/utils/sidebarInit.js`
- `mcu-management/js/utils/sidebarLoader.js`
- `mcu-management/package.json`
- `vercel.json`
- `migrations/secure-rls-authenticated.sql`

## Verification Completed Locally

- API syntax check passed:
  `node --check api/*.js api/*/index.js api/r2*.js`
- Production build passed:
  `cd mcu-management && npm run build`
- Static build smoke test passed:
  - `/pages/login.html` returned `200 text/html`
  - `/js/config/envConfig.js` returned `200 text/javascript`
  - `/js/services/authService.js` returned `200 text/javascript`
- No wildcard `Access-Control-Allow-Origin: *` remained in `api/`.
- No stale/debug/change-history files were found under `mcu-management/dist`.

Note: `git diff --check` was attempted twice but hung without output, so it was stopped manually.

## Required Deployment Order

1. Set Vercel environment variable:
   - `SUPABASE_JWT_SECRET`: Supabase project JWT secret.
   - Optional: `APP_ORIGIN=https://madis.sabdamu.my.id`

2. Deploy the code to Vercel.

3. Smoke test login before changing RLS:
   - Admin login works.
   - Petugas login works.
   - Dashboard loads.

4. Run Supabase SQL migration:
   - `migrations/secure-rls-authenticated.sql`

5. Run production closure tests below.

## Production Closure Tests

The bug can be closed after these pass on `https://madis.sabdamu.my.id/`:

- Unauthenticated browser/curl request to `/api/get-mcu-files?mcuId=QA-NOT-FOUND` returns `401`.
- Unauthenticated browser/curl request to `/api/download-file?fileId=QA-NOT-FOUND` returns `401`.
- Unauthenticated browser/curl request to `/api/test-r2-config` returns `401`.
- Supabase anon request cannot read/count protected app tables such as `users`, `employees`, `mcus`, `mcufiles`, and `activity_log`.
- Admin login succeeds and can open Dashboard, Kelola Karyawan, Data Master, Kelola User.
- Petugas login succeeds and cannot open Kelola User.
- Upload file MCU succeeds while logged in.
- File list/download succeeds while logged in.
- Logout clears session and protected pages redirect back to login.
- Response headers include:
  - `Strict-Transport-Security`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Content-Security-Policy`

## Rollback Plan

Preferred rollback:

1. Roll Vercel back to the previous working deployment.
2. If RLS migration has already been applied and the old deployment cannot log in, temporarily restore the previous permissive policies only as an emergency measure.
3. Re-apply the fixed deployment and `secure-rls-authenticated.sql` as soon as possible.

Security note: restoring permissive anon policies reopens the original exposure and should only be used for short emergency recovery.

## Closure Status

Code is ready for deploy and production verification.

Do not mark the bug fully closed until:

- `SUPABASE_JWT_SECRET` is configured in Vercel.
- Fixed code is deployed.
- `migrations/secure-rls-authenticated.sql` is applied.
- Production closure tests pass.
