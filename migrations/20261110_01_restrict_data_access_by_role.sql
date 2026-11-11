-- Restrict direct table access to application roles that need it.
--
-- Before: every logged-in app user (including Dokter) could read and write all
-- data tables straight from the browser (policies allowed every row).
-- After: only Admin and Petugas touch these tables directly. Dokter works
-- through /api/workflow (service role), so it needs no direct table access.
--
-- Run after secure-rls-authenticated.sql and the 202608* workflow migrations.
-- Rollback: re-run migrations/secure-rls-authenticated.sql.

BEGIN;

DO $$
DECLARE
  table_name text;
  policy_record record;
  staff_check text := $c$((auth.jwt() ->> 'app_role') IN ('Admin', 'Petugas'))$c$;
  data_tables text[] := ARRAY[
    'employees',
    'mcus',
    'mcufiles',
    'mcu_changes',
    'job_titles',
    'departments',
    'vendors',
    'doctors',
    'diseases',
    'lab_items',
    'activity_log',
    'medical_histories',
    'family_histories',
    'pemeriksaan_lab',
    'framingham_assessment',
    'audit_log_archive'
  ];
BEGIN
  FOREACH table_name IN ARRAY data_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      FOR policy_record IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = table_name
          AND policyname IN (
            table_name || '_select_authenticated',
            table_name || '_insert_authenticated',
            table_name || '_update_authenticated',
            table_name || '_delete_authenticated'
          )
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, table_name);
      END LOOP;

      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)',
        table_name || '_select_staff', table_name, staff_check);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
        table_name || '_insert_staff', table_name, staff_check);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
        table_name || '_update_staff', table_name, staff_check, staff_check);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)',
        table_name || '_delete_staff', table_name, staff_check);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- Verification (Dokter token should return 0 rows / permission errors):
-- select tablename, policyname, cmd from pg_policies
-- where schemaname = 'public' and policyname like '%\_staff' order by 1, 2;
