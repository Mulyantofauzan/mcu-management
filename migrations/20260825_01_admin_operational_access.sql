-- Administrator inherits Petugas operational access; Doctor decisions stay separated.

BEGIN;

CREATE OR REPLACE FUNCTION public.workflow_require_actor(
    p_actor_user_id TEXT,
    p_allowed_roles TEXT[]
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor_role TEXT;
    actor_active BOOLEAN;
BEGIN
    SELECT role, active
    INTO actor_role, actor_active
    FROM public.users
    WHERE user_id = p_actor_user_id;

    IF actor_role IS NULL OR actor_active IS NOT TRUE THEN
        RAISE EXCEPTION 'WF_USER_INACTIVE';
    END IF;

    IF NOT actor_role = ANY(p_allowed_roles)
       AND NOT (actor_role = 'Admin' AND 'Petugas' = ANY(p_allowed_roles)) THEN
        RAISE EXCEPTION 'WF_FORBIDDEN';
    END IF;

    RETURN actor_role;
END;
$$;

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
        IF actor_role NOT IN ('Admin', 'Petugas') THEN
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

    IF actor_role IN ('Admin', 'Petugas')
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
    IF actor_role NOT IN ('Admin', 'Petugas') THEN
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

REVOKE ALL ON FUNCTION public.workflow_require_actor(text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflow_guard_mcus() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflow_guard_raw_child() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.workflow_require_actor(text, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.workflow_guard_mcus() TO service_role;
GRANT EXECUTE ON FUNCTION public.workflow_guard_raw_child() TO service_role;

COMMIT;
