-- MCU approval workflow: RLS, immutable audit data, and protected columns.

BEGIN;

CREATE OR REPLACE FUNCTION public.workflow_request_claims()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    raw_claims TEXT;
BEGIN
    raw_claims := current_setting('request.jwt.claims', TRUE);
    IF raw_claims IS NULL OR raw_claims = '' THEN
        RETURN '{}'::jsonb;
    END IF;

    BEGIN
        RETURN raw_claims::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN '{}'::jsonb;
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_is_service_request()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        NULLIF(current_setting('request.jwt.claim.role', TRUE), ''),
        public.workflow_request_claims() ->> 'role',
        ''
    ) = 'service_role';
$$;

CREATE OR REPLACE FUNCTION public.workflow_request_actor_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claims JSONB := public.workflow_request_claims();
    actor_user_id TEXT;
    actor_role TEXT;
BEGIN
    actor_user_id := COALESCE(
        NULLIF(current_setting('request.jwt.claim.app_user_id', TRUE), ''),
        claims ->> 'app_user_id',
        claims ->> 'sub'
    );

    SELECT role INTO actor_role
    FROM public.users
    WHERE user_id = actor_user_id
      AND active IS TRUE;

    RETURN actor_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_guard_employees()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor_role TEXT;
BEGIN
    IF public.workflow_is_enabled() IS NOT TRUE
       OR public.workflow_is_service_request() THEN
        RETURN NEW;
    END IF;

    actor_role := public.workflow_request_actor_role();
    IF actor_role NOT IN ('Admin', 'Petugas') THEN
        RAISE EXCEPTION 'WF_FORBIDDEN';
    END IF;

    IF TG_OP = 'UPDATE' AND (
        NEW.joining_status IS DISTINCT FROM OLD.joining_status
        OR NEW.joining_version IS DISTINCT FROM OLD.joining_version
        OR NEW.joining_decided_by IS DISTINCT FROM OLD.joining_decided_by
        OR NEW.joining_decided_at IS DISTINCT FROM OLD.joining_decided_at
        OR NEW.joining_decision_reason IS DISTINCT FROM OLD.joining_decision_reason
    ) THEN
        RAISE EXCEPTION 'WF_FORBIDDEN';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zz_workflow_guard_employees ON public.employees;
CREATE TRIGGER zz_workflow_guard_employees
BEFORE INSERT OR UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.workflow_guard_employees();

CREATE OR REPLACE FUNCTION public.workflow_guard_mcus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor_role TEXT;
BEGIN
    IF public.workflow_is_enabled() IS NOT TRUE
       OR public.workflow_is_service_request() THEN
        RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END IF;

    actor_role := public.workflow_request_actor_role();
    IF actor_role IS NULL THEN
        RAISE EXCEPTION 'WF_FORBIDDEN';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'WF_FORBIDDEN';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF actor_role <> 'Petugas' THEN
            RAISE EXCEPTION 'WF_FORBIDDEN';
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.workflow_status IS DISTINCT FROM OLD.workflow_status
       OR NEW.workflow_version IS DISTINCT FROM OLD.workflow_version
       OR NEW.current_medical_result IS DISTINCT FROM OLD.current_medical_result
       OR NEW.current_review_cycle IS DISTINCT FROM OLD.current_review_cycle
       OR NEW.claimed_by IS DISTINCT FROM OLD.claimed_by
       OR NEW.claimed_at IS DISTINCT FROM OLD.claimed_at
       OR NEW.claim_expires_at IS DISTINCT FROM OLD.claim_expires_at
       OR NEW.activated_at IS DISTINCT FROM OLD.activated_at
       OR NEW.current_share_cycle_id IS DISTINCT FROM OLD.current_share_cycle_id
       OR NEW.current_share_status IS DISTINCT FROM OLD.current_share_status
       OR NEW.initial_result IS DISTINCT FROM OLD.initial_result
       OR NEW.initial_notes IS DISTINCT FROM OLD.initial_notes
       OR NEW.final_result IS DISTINCT FROM OLD.final_result
       OR NEW.final_notes IS DISTINCT FROM OLD.final_notes
       OR NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'WF_FORBIDDEN';
    END IF;

    IF actor_role = 'Petugas'
       AND OLD.workflow_status IN ('draft', 'correction_required', 'followup_required') THEN
        RETURN NEW;
    END IF;

    IF actor_role = 'Admin'
       AND OLD.workflow_status IN ('draft', 'correction_required')
       AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'WF_FORBIDDEN';
END;
$$;

DROP TRIGGER IF EXISTS zz_workflow_guard_mcus ON public.mcus;
CREATE TRIGGER zz_workflow_guard_mcus
BEFORE INSERT OR UPDATE OR DELETE ON public.mcus
FOR EACH ROW EXECUTE FUNCTION public.workflow_guard_mcus();

CREATE OR REPLACE FUNCTION public.workflow_guard_raw_child()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor_role TEXT;
    target_mcu_id TEXT;
    target_status TEXT;
BEGIN
    IF public.workflow_is_enabled() IS NOT TRUE
       OR public.workflow_is_service_request() THEN
        RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END IF;

    actor_role := public.workflow_request_actor_role();
    IF actor_role <> 'Petugas' THEN
        RAISE EXCEPTION 'WF_FORBIDDEN';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.mcu_id IS DISTINCT FROM OLD.mcu_id THEN
        RAISE EXCEPTION 'WF_FORBIDDEN';
    END IF;

    target_mcu_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.mcu_id ELSE NEW.mcu_id END;
    SELECT workflow_status INTO target_status
    FROM public.mcus
    WHERE mcu_id = target_mcu_id
      AND deleted_at IS NULL;

    IF target_status NOT IN ('draft', 'correction_required', 'followup_required') THEN
        RAISE EXCEPTION 'WF_FORBIDDEN';
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'pemeriksaan_lab',
        'medical_histories',
        'family_histories'
    ]
    LOOP
        IF to_regclass('public.' || table_name) IS NOT NULL THEN
            EXECUTE format(
                'DROP TRIGGER IF EXISTS zz_workflow_guard_raw_child ON public.%I',
                table_name
            );
            EXECUTE format(
                'CREATE TRIGGER zz_workflow_guard_raw_child '
                || 'BEFORE INSERT OR UPDATE OR DELETE ON public.%I '
                || 'FOR EACH ROW EXECUTE FUNCTION public.workflow_guard_raw_child()',
                table_name
            );
        END IF;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_reject_immutable_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION 'WF_IMMUTABLE_RECORD';
END;
$$;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'employee_joining_status_events',
        'mcu_review_cycles',
        'mcu_review_documents',
        'mcu_workflow_events'
    ]
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS workflow_immutable_rows ON public.%I',
            table_name
        );
        EXECUTE format(
            'CREATE TRIGGER workflow_immutable_rows '
            || 'BEFORE UPDATE OR DELETE ON public.%I '
            || 'FOR EACH ROW EXECUTE FUNCTION public.workflow_reject_immutable_change()',
            table_name
        );
    END LOOP;
END;
$$;

ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_joining_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcu_review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcu_review_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcu_workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.doctor_profiles FROM anon, authenticated;
REVOKE ALL ON public.employee_joining_status_events FROM anon, authenticated;
REVOKE ALL ON public.mcu_review_cycles FROM anon, authenticated;
REVOKE ALL ON public.mcu_review_documents FROM anon, authenticated;
REVOKE ALL ON public.mcu_workflow_events FROM anon, authenticated;
REVOKE ALL ON public.app_settings FROM anon, authenticated;

GRANT ALL ON public.doctor_profiles TO service_role;
GRANT ALL ON public.employee_joining_status_events TO service_role;
GRANT ALL ON public.mcu_review_cycles TO service_role;
GRANT ALL ON public.mcu_review_documents TO service_role;
GRANT ALL ON public.mcu_workflow_events TO service_role;
GRANT ALL ON public.app_settings TO service_role;

REVOKE ALL ON FUNCTION public.workflow_request_claims() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflow_is_service_request() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflow_request_actor_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflow_guard_employees() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflow_guard_mcus() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflow_guard_raw_child() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflow_reject_immutable_change() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.workflow_request_claims() TO service_role;
GRANT EXECUTE ON FUNCTION public.workflow_is_service_request() TO service_role;
GRANT EXECUTE ON FUNCTION public.workflow_request_actor_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.workflow_guard_employees() TO service_role;
GRANT EXECUTE ON FUNCTION public.workflow_guard_mcus() TO service_role;
GRANT EXECUTE ON FUNCTION public.workflow_guard_raw_child() TO service_role;
GRANT EXECUTE ON FUNCTION public.workflow_reject_immutable_change() TO service_role;

COMMIT;
