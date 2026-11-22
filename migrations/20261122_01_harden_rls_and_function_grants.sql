-- Harden RLS and function grants (security audit run-1 follow-up).
--
-- What this does, in order:
--   1. Replaces EVERY policy on the application data tables (not only the
--      *_authenticated names), so a leftover legacy "USING (true)" policy for
--      PUBLIC/anon can no longer be OR-ed with the staff policies. Then it
--      re-creates the staff policies with finer rules:
--        - hard DELETE of employees, mcus, mcufiles, pemeriksaan_lab,
--          framingham_assessment is Admin only (soft delete is an UPDATE and
--          stays available to staff),
--        - activity_log, mcu_changes, audit_log_archive are append-only
--          (no UPDATE, no DELETE from the browser).
--   2. Enables RLS on tables that the earlier allowlists missed
--      (risk_scores, lab_item_id_corrections, min_max_corrections) if they exist.
--   3. Restricts column reads on public.users so password_hash and mfa_* are
--      never returned to browser tokens (the server uses the service role).
--   4. Revokes EXECUTE on the SECURITY DEFINER workflow_* functions from
--      anon/authenticated (REVOKE ... FROM PUBLIC does not remove the direct
--      grants Supabase adds by default). workflow_analytics_config stays
--      callable because the analytics views use it.
--   5. Binds activity_log.user_id to the JWT app_user_id, and only lets an
--      Admin clear deleted_at (restore) on employees, mcus and mcufiles.
--
-- REVIEW BEFORE RUNNING. Run on staging first. Nothing here touches row data.
-- Run after secure-rls-authenticated.sql and 20261110_01 / 20261111_01 / 20261113_01.
-- Rollback: re-run migrations/20261110_01_restrict_data_access_by_role.sql
-- (policies) and re-grant column/function privileges as needed.

BEGIN;

DO $$
DECLARE
  tbl text;
  pol record;
  staff_check text := $c$((auth.jwt() ->> 'app_role') IN ('Admin', 'Petugas'))$c$;
  admin_check text := $c$((auth.jwt() ->> 'app_role') = 'Admin')$c$;
  data_tables text[] := ARRAY[
    'employees', 'mcus', 'mcufiles', 'mcu_changes', 'job_titles', 'departments',
    'vendors', 'doctors', 'diseases', 'lab_items', 'activity_log',
    'medical_histories', 'family_histories', 'pemeriksaan_lab',
    'framingham_assessment', 'audit_log_archive'
  ];
  append_only text[] := ARRAY['activity_log', 'mcu_changes', 'audit_log_archive'];
  admin_delete text[] := ARRAY['employees', 'mcus', 'mcufiles', 'pemeriksaan_lab', 'framingham_assessment'];
BEGIN
  FOREACH tbl IN ARRAY data_tables LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);

    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;

    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)',
      tbl || '_select_staff', tbl, staff_check);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
      tbl || '_insert_staff', tbl, staff_check);

    IF NOT (tbl = ANY (append_only)) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
        tbl || '_update_staff', tbl, staff_check, staff_check);

      IF tbl = ANY (admin_delete) THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)',
          tbl || '_delete_admin', tbl, admin_check);
      ELSE
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)',
          tbl || '_delete_staff', tbl, staff_check);
      END IF;
    END IF;
  END LOOP;

  -- Tables the earlier allowlists never covered: read-only for staff, writes via service role.
  FOREACH tbl IN ARRAY ARRAY['risk_scores', 'lab_item_id_corrections', 'min_max_corrections'] LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)',
      tbl || '_select_staff', tbl, staff_check);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl);
  END LOOP;
END $$;

-- users: browser tokens may only read non-secret columns (web/src/data/users.js lists them).
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    REVOKE ALL ON public.users FROM anon;
    REVOKE SELECT ON public.users FROM authenticated;
    GRANT SELECT (user_id, username, display_name, role, active, created_at) ON public.users TO authenticated;
  END IF;
END $$;

-- workflow_* SECURITY DEFINER functions: service role only (keep the analytics config helper).
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'workflow\_%'
      AND p.prokind = 'f'
      AND p.prorettype <> 'trigger'::regtype
      AND p.proname <> 'workflow_analytics_config'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
  END LOOP;
END $$;

-- activity_log: attribution comes from the signed token, not from the client payload.
CREATE OR REPLACE FUNCTION public.activity_log_bind_user()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() ->> 'app_user_id') IS NOT NULL THEN
    NEW.user_id := auth.jwt() ->> 'app_user_id';
  END IF;
  RETURN NEW;
END;
$$;

-- restore (clearing deleted_at) is an Admin action; soft delete stays open to staff.
CREATE OR REPLACE FUNCTION public.guard_restore_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  old_deleted timestamptz;
  new_deleted timestamptz;
BEGIN
  IF TG_TABLE_NAME = 'mcufiles' THEN
    old_deleted := OLD.deletedat;
    new_deleted := NEW.deletedat;
  ELSE
    old_deleted := OLD.deleted_at;
    new_deleted := NEW.deleted_at;
  END IF;

  IF old_deleted IS NOT NULL AND new_deleted IS NULL
     AND (auth.jwt() ->> 'role') = 'authenticated'
     AND coalesce(auth.jwt() ->> 'app_role', '') <> 'Admin' THEN
    RAISE EXCEPTION 'Only an Admin can restore deleted records' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.activity_log') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS activity_log_bind_user ON public.activity_log;
    CREATE TRIGGER activity_log_bind_user
      BEFORE INSERT ON public.activity_log
      FOR EACH ROW EXECUTE FUNCTION public.activity_log_bind_user();
  END IF;

  IF to_regclass('public.employees') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS guard_restore_admin_only ON public.employees;
    CREATE TRIGGER guard_restore_admin_only
      BEFORE UPDATE ON public.employees
      FOR EACH ROW EXECUTE FUNCTION public.guard_restore_admin_only();
  END IF;

  IF to_regclass('public.mcus') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS guard_restore_admin_only ON public.mcus;
    CREATE TRIGGER guard_restore_admin_only
      BEFORE UPDATE ON public.mcus
      FOR EACH ROW EXECUTE FUNCTION public.guard_restore_admin_only();
  END IF;

  IF to_regclass('public.mcufiles') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS guard_restore_admin_only ON public.mcufiles;
    CREATE TRIGGER guard_restore_admin_only
      BEFORE UPDATE ON public.mcufiles
      FOR EACH ROW EXECUTE FUNCTION public.guard_restore_admin_only();
  END IF;
END $$;

-- Report any other public table that still has RLS disabled (does not change them).
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
    ORDER BY 1
  LOOP
    RAISE NOTICE 'RLS is still disabled on public.% - review whether it holds health data', rec.relname;
  END LOOP;
END $$;

COMMIT;

-- Verification:
--   select tablename, policyname, cmd, roles from pg_policies where schemaname='public' order by 1,2;
--   select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
--     where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;
--   select p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') anon_x,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') auth_x
--     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--     where n.nspname='public' and p.proname like 'workflow\_%' and p.prosecdef;
