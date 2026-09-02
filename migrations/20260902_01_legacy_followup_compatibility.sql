-- Allow actionable legacy follow-up records to enter the current review workflow.

BEGIN;

ALTER TABLE public.mcu_followup_submissions
    ALTER COLUMN prior_review_cycle_id DROP NOT NULL;

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
       AND (
           OLD.workflow_status IN ('draft', 'correction_required', 'followup_required')
           OR (
               OLD.workflow_status = 'approved_legacy'
               AND OLD.current_medical_result IN ('Follow-Up', 'Temporary Unfit')
           )
       ) THEN
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
    target_result TEXT;
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
    SELECT workflow_status, current_medical_result
    INTO target_status, target_result
    FROM public.mcus
    WHERE mcu_id = target_mcu_id
      AND deleted_at IS NULL;

    IF target_status NOT IN ('draft', 'correction_required', 'followup_required')
       AND NOT (
           target_status = 'approved_legacy'
           AND target_result IN ('Follow-Up', 'Temporary Unfit')
       ) THEN
        RAISE EXCEPTION 'WF_FORBIDDEN';
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_submit_followup_evidence(
    p_mcu_id TEXT,
    p_actor_user_id TEXT,
    p_expected_version BIGINT,
    p_evidence_notes TEXT,
    p_attachment_file_ids JSONB,
    p_request_id TEXT,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor_role TEXT;
    mcu_record public.mcus%ROWTYPE;
    evidence_id UUID;
    response JSONB;
    is_legacy_followup BOOLEAN;
BEGIN
    PERFORM public.workflow_require_request(p_request_id, p_idempotency_key);
    PERFORM public.workflow_require_enabled();
    actor_role := public.workflow_require_actor(p_actor_user_id, ARRAY['Petugas']);

    response := public.workflow_existing_response(
        p_actor_user_id,
        'submit_followup_evidence',
        p_idempotency_key
    );
    IF response IS NOT NULL THEN RETURN response; END IF;

    IF NULLIF(BTRIM(p_evidence_notes), '') IS NULL
       OR jsonb_typeof(COALESCE(p_attachment_file_ids, '[]'::jsonb)) <> 'array'
       OR jsonb_array_length(COALESCE(p_attachment_file_ids, '[]'::jsonb)) > 50 THEN
        RAISE EXCEPTION 'WF_VALIDATION_FAILED';
    END IF;

    SELECT * INTO mcu_record
    FROM public.mcus
    WHERE mcu_id = p_mcu_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'WF_NOT_FOUND'; END IF;
    IF mcu_record.workflow_version <> p_expected_version THEN
        RAISE EXCEPTION 'WF_VERSION_CONFLICT';
    END IF;

    is_legacy_followup := mcu_record.workflow_status = 'approved_legacy'
        AND mcu_record.current_medical_result IN ('Follow-Up', 'Temporary Unfit');

    IF NOT (
        (
            mcu_record.workflow_status = 'followup_required'
            AND mcu_record.current_medical_result IN ('Follow-Up', 'Temporary Unfit')
            AND mcu_record.current_share_cycle_id IS NOT NULL
        )
        OR is_legacy_followup
    ) THEN
        RAISE EXCEPTION 'WF_INVALID_TRANSITION';
    END IF;

    INSERT INTO public.mcu_followup_submissions (
        mcu_id,
        prior_review_cycle_id,
        evidence_notes,
        attachment_file_ids,
        submitted_by,
        request_id,
        idempotency_key
    ) VALUES (
        p_mcu_id,
        mcu_record.current_share_cycle_id,
        LEFT(BTRIM(p_evidence_notes), 4000),
        COALESCE(p_attachment_file_ids, '[]'::jsonb),
        p_actor_user_id,
        p_request_id,
        p_idempotency_key
    )
    RETURNING id INTO evidence_id;

    UPDATE public.mcus
    SET workflow_status = 'pending_review',
        workflow_version = workflow_version + 1,
        claimed_by = NULL,
        claimed_at = NULL,
        claim_expires_at = NULL,
        updated_at = NOW()
    WHERE mcu_id = p_mcu_id;

    response := public.workflow_mcu_snapshot(p_mcu_id)
        || jsonb_build_object('followupSubmissionId', evidence_id);
    PERFORM public.workflow_append_event(
        p_mcu_id,
        mcu_record.current_share_cycle_id,
        'submit_followup_evidence',
        mcu_record.workflow_status,
        'pending_review',
        p_actor_user_id,
        actor_role,
        p_request_id,
        p_idempotency_key,
        jsonb_build_object(
            'followupSubmissionId', evidence_id,
            'attachmentCount', jsonb_array_length(COALESCE(p_attachment_file_ids, '[]'::jsonb)),
            'legacyFollowup', is_legacy_followup,
            'response', response
        )
    );

    RETURN response;
END;
$$;

REVOKE ALL ON FUNCTION public.workflow_guard_mcus() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflow_guard_raw_child() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflow_submit_followup_evidence(
    text, text, bigint, text, jsonb, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_guard_mcus() TO service_role;
GRANT EXECUTE ON FUNCTION public.workflow_guard_raw_child() TO service_role;
GRANT EXECUTE ON FUNCTION public.workflow_submit_followup_evidence(
    text, text, bigint, text, jsonb, text, text
) TO service_role;

COMMIT;
