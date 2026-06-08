-- ============================================
-- MADIS / MCU App - Production RLS Hardening
-- ============================================
-- Run after the app is deployed with SUPABASE_JWT_SECRET set in Vercel.
--
-- Goal:
-- 1. Remove permissive anon policies such as USING (true) for all roles.
-- 2. Allow access only to requests carrying a valid Supabase-compatible JWT
--    with role = authenticated.
-- 3. Keep this as a transitional policy so the existing app keeps working.
--
-- The app mints the JWT in /api/login using the Supabase project JWT secret.

BEGIN;

DO $$
DECLARE
  table_name text;
  policy_record record;
  app_tables text[] := ARRAY[
    'users',
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
  FOREACH table_name IN ARRAY app_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);

      FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = table_name
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, table_name);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Users: admins can manage users; a logged-in user can read their own row.
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    CREATE POLICY "users_select_authenticated"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (
        user_id = (auth.jwt() ->> 'app_user_id')
        OR (auth.jwt() ->> 'app_role') = 'Admin'
      );

    CREATE POLICY "users_insert_admin"
      ON public.users
      FOR INSERT
      TO authenticated
      WITH CHECK ((auth.jwt() ->> 'app_role') = 'Admin');

    CREATE POLICY "users_update_admin"
      ON public.users
      FOR UPDATE
      TO authenticated
      USING ((auth.jwt() ->> 'app_role') = 'Admin')
      WITH CHECK ((auth.jwt() ->> 'app_role') = 'Admin');

    CREATE POLICY "users_delete_admin"
      ON public.users
      FOR DELETE
      TO authenticated
      USING ((auth.jwt() ->> 'app_role') = 'Admin');
  END IF;
END $$;

-- Transitional app data access: any logged-in app user can use existing workflows.
-- Tighten these further later if you add branch/unit ownership columns.
DO $$
DECLARE
  table_name text;
  app_tables text[] := ARRAY[
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
  FOREACH table_name IN ARRAY app_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
        table_name || '_select_authenticated',
        table_name
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (true)',
        table_name || '_insert_authenticated',
        table_name
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)',
        table_name || '_update_authenticated',
        table_name
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (true)',
        table_name || '_delete_authenticated',
        table_name
      );
    END IF;
  END LOOP;
END $$;

COMMIT;

-- Verification:
-- select schemaname, tablename, policyname, roles, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename, policyname;
