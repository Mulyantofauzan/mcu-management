-- Users may only be created, changed or deleted by the server (/api/users),
-- which hashes passwords with bcrypt and enforces "keep one active Admin".
--
-- The server uses the service role, which bypasses RLS, so dropping the
-- browser write policies does not affect it. Reads stay as defined in
-- secure-rls-authenticated.sql (own row, or all rows for Admin).
--
-- Deploy order: ship the app with /api/users first, then run this.
-- Rollback: re-run migrations/secure-rls-authenticated.sql.

BEGIN;

DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;

COMMIT;

-- Verification (only the select policy should remain):
-- select policyname, cmd from pg_policies
-- where schemaname = 'public' and tablename = 'users';
