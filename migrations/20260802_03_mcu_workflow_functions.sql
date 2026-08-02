-- MCU approval workflow: transactional state transitions.
-- All public entry points are callable only by service_role.

BEGIN;

CREATE OR REPLACE FUNCTION public.workflow_require_request(
    p_request_id TEXT,
    p_idempotency_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
    IF NULLIF(BTRIM(p_request_id), '') IS NULL
       OR CHAR_LENGTH(p_request_id) > 100 THEN
        RAISE EXCEPTION 'WF_VALIDATION_FAILED'
            USING DETAIL = '{"field":"requestId"}';
    END IF;

    IF NULLIF(BTRIM(p_idempotency_key), '') IS NULL
       OR CHAR_LENGTH(p_idempotency_key) > 100 THEN
        RAISE EXCEPTION 'WF_VALIDATION_FAILED'
            USING DETAIL = '{"field":"idempotencyKey"}';
    END IF;
END;
$$;

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

    IF NOT actor_role = ANY(p_allowed_roles) THEN
        RAISE EXCEPTION 'WF_FORBIDDEN';
    END IF;

    RETURN actor_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_require_enabled()
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.workflow_is_enabled() IS NOT TRUE THEN
        RAISE EXCEPTION 'WF_FEATURE_DISABLED';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_mcu_snapshot(p_mcu_id TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'mcuId', mcu_id,
        'employeeId', employee_id,
        'workflowStatus', workflow_status,
        'workflowVersion', workflow_version,
        'medicalResult', current_medical_result,
        'reviewCycle', current_review_cycle,
        'claimedBy', claimed_by,
        'claimedAt', claimed_at,
        'claimExpiresAt', claim_expires_at,
        'activatedAt', activated_at,
        'shareCycleId', current_share_cycle_id,
        'shareStatus', current_share_status
    )
    FROM public.mcus
    WHERE mcu_id = p_mcu_id;
$$;

CREATE OR REPLACE FUNCTION public.workflow_existing_response(
    p_actor_user_id TEXT,
    p_action TEXT,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT metadata -> 'response'
    FROM public.mcu_workflow_events
    WHERE actor_user_id = p_actor_user_id
      AND action = p_action
      AND idempotency_key = p_idempotency_key
    ORDER BY created_at DESC
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.workflow_append_event(
    p_mcu_id TEXT,
    p_review_cycle_id UUID,
    p_action TEXT,
    p_previous_status TEXT,
    p_next_status TEXT,
    p_actor_user_id TEXT,
    p_actor_role TEXT,
    p_request_id TEXT,
    p_idempotency_key TEXT,
    p_metadata JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    event_id UUID;
BEGIN
    IF jsonb_typeof(COALESCE(p_metadata, '{}'::jsonb)) <> 'object' THEN
        RAISE EXCEPTION 'WF_VALIDATION_FAILED';
    END IF;

    INSERT INTO public.mcu_workflow_events (
        mcu_id,
        review_cycle_id,
        action,
        previous_status,
        next_status,
        actor_user_id,
        actor_role,
        request_id,
        idempotency_key,
        metadata
    ) VALUES (
        p_mcu_id,
        p_review_cycle_id,
        p_action,
        p_previous_status,
        p_next_status,
        p_actor_user_id,
        p_actor_role,
        p_request_id,
        p_idempotency_key,
        COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING id INTO event_id;

    RETURN event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_submit_review(
    p_mcu_id TEXT,
    p_actor_user_id TEXT,
    p_expected_version BIGINT,
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
    previous_status TEXT;
    response JSONB;
BEGIN
    PERFORM public.workflow_require_request(p_request_id, p_idempotency_key);
    PERFORM public.workflow_require_enabled();
    actor_role := public.workflow_require_actor(p_actor_user_id, ARRAY['Petugas']);

    response := public.workflow_existing_response(
        p_actor_user_id,
        'submit_review',
        p_idempotency_key
    );
    IF response IS NOT NULL THEN
        RETURN response;
    END IF;

    SELECT * INTO mcu_record
    FROM public.mcus
    WHERE mcu_id = p_mcu_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'WF_NOT_FOUND';
    END IF;
    IF mcu_record.workflow_version <> p_expected_version THEN
        RAISE EXCEPTION 'WF_VERSION_CONFLICT';
    END IF;
    IF mcu_record.workflow_status NOT IN ('draft', 'correction_required') THEN
        RAISE EXCEPTION 'WF_INVALID_TRANSITION';
    END IF;
    IF mcu_record.employee_id IS NULL
       OR mcu_record.mcu_type IS NULL
       OR mcu_record.mcu_date IS NULL THEN
        RAISE EXCEPTION 'WF_VALIDATION_FAILED';
    END IF;

    previous_status := mcu_record.workflow_status;
    UPDATE public.mcus
    SET workflow_status = 'pending_review',
        workflow_version = workflow_version + 1,
        claimed_by = NULL,
        claimed_at = NULL,
        claim_expires_at = NULL,
        updated_at = NOW()
    WHERE mcu_id = p_mcu_id;

    response := public.workflow_mcu_snapshot(p_mcu_id);
    PERFORM public.workflow_append_event(
        p_mcu_id,
        NULL,
        'submit_review',
        previous_status,
        'pending_review',
        p_actor_user_id,
        actor_role,
        p_request_id,
        p_idempotency_key,
        jsonb_build_object(
            'isResubmission', previous_status = 'correction_required',
            'response', response
        )
    );

    RETURN response;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_claim_review(
    p_mcu_id TEXT,
    p_actor_user_id TEXT,
    p_expected_version BIGINT,
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
    response JSONB;
    takeover BOOLEAN := FALSE;
BEGIN
    PERFORM public.workflow_require_request(p_request_id, p_idempotency_key);
    PERFORM public.workflow_require_enabled();
    actor_role := public.workflow_require_actor(p_actor_user_id, ARRAY['Dokter']);

    response := public.workflow_existing_response(
        p_actor_user_id,
        'claim_review',
        p_idempotency_key
    );
    IF response IS NOT NULL THEN
        RETURN response;
    END IF;

    SELECT * INTO mcu_record
    FROM public.mcus
    WHERE mcu_id = p_mcu_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'WF_NOT_FOUND';
    END IF;
    IF mcu_record.workflow_version <> p_expected_version THEN
        RAISE EXCEPTION 'WF_VERSION_CONFLICT';
    END IF;

    IF mcu_record.workflow_status = 'in_review' THEN
        IF mcu_record.claimed_by = p_actor_user_id
           AND mcu_record.claim_expires_at > NOW() THEN
            RETURN public.workflow_mcu_snapshot(p_mcu_id);
        END IF;

        IF mcu_record.claim_expires_at > NOW() THEN
            RAISE EXCEPTION 'WF_LOCKED'
                USING DETAIL = jsonb_build_object(
                    'claimedBy', mcu_record.claimed_by,
                    'claimExpiresAt', mcu_record.claim_expires_at
                )::TEXT;
        END IF;

        takeover := TRUE;
        PERFORM public.workflow_append_event(
            p_mcu_id,
            NULL,
            'claim_expired',
            'in_review',
            'in_review',
            NULL,
            'System',
            p_request_id,
            NULL,
            jsonb_build_object('previousClaimedBy', mcu_record.claimed_by)
        );
    ELSIF mcu_record.workflow_status <> 'pending_review' THEN
        RAISE EXCEPTION 'WF_INVALID_TRANSITION';
    END IF;

    UPDATE public.mcus
    SET workflow_status = 'in_review',
        workflow_version = workflow_version + 1,
        claimed_by = p_actor_user_id,
        claimed_at = NOW(),
        claim_expires_at = NOW() + INTERVAL '30 minutes',
        updated_at = NOW()
    WHERE mcu_id = p_mcu_id;

    response := public.workflow_mcu_snapshot(p_mcu_id);
    PERFORM public.workflow_append_event(
        p_mcu_id,
        NULL,
        'claim_review',
        mcu_record.workflow_status,
        'in_review',
        p_actor_user_id,
        actor_role,
        p_request_id,
        p_idempotency_key,
        jsonb_build_object('takeover', takeover, 'response', response)
    );

    RETURN response;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_release_claim(
    p_mcu_id TEXT,
    p_actor_user_id TEXT,
    p_expected_version BIGINT,
    p_reason TEXT,
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
    response JSONB;
BEGIN
    PERFORM public.workflow_require_request(p_request_id, p_idempotency_key);
    PERFORM public.workflow_require_enabled();
    actor_role := public.workflow_require_actor(p_actor_user_id, ARRAY['Dokter', 'Admin']);

    response := public.workflow_existing_response(
        p_actor_user_id,
        'release_claim',
        p_idempotency_key
    );
    IF response IS NOT NULL THEN
        RETURN response;
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
    IF mcu_record.workflow_status <> 'in_review' THEN
        RAISE EXCEPTION 'WF_INVALID_TRANSITION';
    END IF;
    IF actor_role = 'Dokter' AND mcu_record.claimed_by <> p_actor_user_id THEN
        RAISE EXCEPTION 'WF_FORBIDDEN';
    END IF;
    IF actor_role = 'Admin' AND NULLIF(BTRIM(p_reason), '') IS NULL THEN
        RAISE EXCEPTION 'WF_VALIDATION_FAILED'
            USING DETAIL = '{"field":"reason"}';
    END IF;

    UPDATE public.mcus
    SET workflow_status = 'pending_review',
        workflow_version = workflow_version + 1,
        claimed_by = NULL,
        claimed_at = NULL,
        claim_expires_at = NULL,
        updated_at = NOW()
    WHERE mcu_id = p_mcu_id;

    response := public.workflow_mcu_snapshot(p_mcu_id);
    PERFORM public.workflow_append_event(
        p_mcu_id,
        NULL,
        'release_claim',
        'in_review',
        'pending_review',
        p_actor_user_id,
        actor_role,
        p_request_id,
        p_idempotency_key,
        jsonb_build_object(
            'reason', NULLIF(LEFT(BTRIM(p_reason), 1000), ''),
            'response', response
        )
    );

    RETURN response;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_apply_doctor_decision(
    p_mcu_id TEXT,
    p_actor_user_id TEXT,
    p_expected_version BIGINT,
    p_decision TEXT,
    p_medical_result TEXT,
    p_clinical_notes TEXT,
    p_rejection_reason TEXT,
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
    review_cycle_id UUID;
    cycle_number INTEGER;
    review_stage TEXT;
    next_status TEXT;
    response JSONB;
BEGIN
    PERFORM public.workflow_require_request(p_request_id, p_idempotency_key);
    PERFORM public.workflow_require_enabled();
    actor_role := public.workflow_require_actor(p_actor_user_id, ARRAY['Dokter']);

    response := public.workflow_existing_response(
        p_actor_user_id,
        'doctor_decision',
        p_idempotency_key
    );
    IF response IS NOT NULL THEN
        RETURN response;
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
    IF mcu_record.workflow_status <> 'in_review'
       OR mcu_record.claimed_by <> p_actor_user_id THEN
        RAISE EXCEPTION 'WF_INVALID_TRANSITION';
    END IF;
    IF mcu_record.claim_expires_at <= NOW() THEN
        RAISE EXCEPTION 'WF_LOCKED'
            USING DETAIL = jsonb_build_object(
                'claimedBy', mcu_record.claimed_by,
                'claimExpiresAt', mcu_record.claim_expires_at
            )::TEXT;
    END IF;
    IF p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'WF_VALIDATION_FAILED'
            USING DETAIL = '{"field":"decision"}';
    END IF;

    IF p_decision = 'approved' THEN
        IF p_medical_result NOT IN (
            'Fit', 'Fit With Note', 'Unfit', 'Follow-Up', 'Temporary Unfit'
        ) THEN
            RAISE EXCEPTION 'WF_VALIDATION_FAILED'
                USING DETAIL = '{"field":"medicalResult"}';
        END IF;
        IF NULLIF(BTRIM(p_clinical_notes), '') IS NULL THEN
            RAISE EXCEPTION 'WF_VALIDATION_FAILED'
                USING DETAIL = '{"field":"clinicalNotes"}';
        END IF;
    ELSIF NULLIF(BTRIM(p_rejection_reason), '') IS NULL THEN
        RAISE EXCEPTION 'WF_VALIDATION_FAILED'
            USING DETAIL = '{"field":"rejectionReason"}';
    END IF;

    cycle_number := mcu_record.current_review_cycle + 1;
    review_stage := CASE
        WHEN mcu_record.activated_at IS NULL THEN 'initial'
        ELSE 'follow_up'
    END;

    INSERT INTO public.mcu_review_cycles (
        mcu_id,
        cycle_number,
        review_stage,
        decision,
        medical_result,
        clinical_notes,
        rejection_reason,
        doctor_user_id,
        started_at,
        finalized_at,
        idempotency_key
    ) VALUES (
        p_mcu_id,
        cycle_number,
        review_stage,
        p_decision,
        CASE WHEN p_decision = 'approved' THEN p_medical_result ELSE NULL END,
        CASE WHEN p_decision = 'approved' THEN LEFT(BTRIM(p_clinical_notes), 4000) ELSE NULL END,
        CASE WHEN p_decision = 'rejected' THEN LEFT(BTRIM(p_rejection_reason), 2000) ELSE NULL END,
        p_actor_user_id,
        mcu_record.claimed_at,
        NOW(),
        p_idempotency_key
    )
    RETURNING id INTO review_cycle_id;

    IF p_decision = 'rejected' THEN
        next_status := 'correction_required';
        UPDATE public.mcus
        SET workflow_status = next_status,
            workflow_version = workflow_version + 1,
            current_review_cycle = cycle_number,
            claimed_by = NULL,
            claimed_at = NULL,
            claim_expires_at = NULL,
            updated_at = NOW()
        WHERE mcu_id = p_mcu_id;
    ELSE
        next_status := CASE
            WHEN p_medical_result IN ('Follow-Up', 'Temporary Unfit')
                THEN 'followup_required'
            ELSE 'completed'
        END;

        UPDATE public.mcus
        SET workflow_status = next_status,
            workflow_version = workflow_version + 1,
            current_medical_result = p_medical_result,
            current_review_cycle = cycle_number,
            activated_at = COALESCE(activated_at, NOW()),
            current_share_cycle_id = review_cycle_id,
            current_share_status = 'not_started',
            initial_result = CASE
                WHEN activated_at IS NULL THEN p_medical_result
                ELSE initial_result
            END,
            initial_notes = CASE
                WHEN activated_at IS NULL THEN LEFT(BTRIM(p_clinical_notes), 4000)
                ELSE initial_notes
            END,
            final_result = CASE
                WHEN activated_at IS NULL THEN final_result
                ELSE p_medical_result
            END,
            final_notes = CASE
                WHEN activated_at IS NULL THEN final_notes
                ELSE LEFT(BTRIM(p_clinical_notes), 4000)
            END,
            status = p_medical_result,
            claimed_by = NULL,
            claimed_at = NULL,
            claim_expires_at = NULL,
            updated_at = NOW()
        WHERE mcu_id = p_mcu_id;
    END IF;

    response := public.workflow_mcu_snapshot(p_mcu_id)
        || jsonb_build_object('reviewCycleId', review_cycle_id);

    PERFORM public.workflow_append_event(
        p_mcu_id,
        review_cycle_id,
        'doctor_decision',
        'in_review',
        next_status,
        p_actor_user_id,
        actor_role,
        p_request_id,
        p_idempotency_key,
        jsonb_build_object(
            'decision', p_decision,
            'medicalResult', CASE WHEN p_decision = 'approved' THEN p_medical_result ELSE NULL END,
            'response', response
        )
    );

    RETURN response;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_submit_followup(
    p_mcu_id TEXT,
    p_actor_user_id TEXT,
    p_expected_version BIGINT,
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
    response JSONB;
BEGIN
    PERFORM public.workflow_require_request(p_request_id, p_idempotency_key);
    PERFORM public.workflow_require_enabled();
    actor_role := public.workflow_require_actor(p_actor_user_id, ARRAY['Petugas']);

    response := public.workflow_existing_response(
        p_actor_user_id,
        'submit_followup',
        p_idempotency_key
    );
    IF response IS NOT NULL THEN RETURN response; END IF;

    SELECT * INTO mcu_record
    FROM public.mcus
    WHERE mcu_id = p_mcu_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'WF_NOT_FOUND'; END IF;
    IF mcu_record.workflow_version <> p_expected_version THEN
        RAISE EXCEPTION 'WF_VERSION_CONFLICT';
    END IF;
    IF mcu_record.workflow_status <> 'followup_required'
       OR mcu_record.current_medical_result NOT IN ('Follow-Up', 'Temporary Unfit') THEN
        RAISE EXCEPTION 'WF_INVALID_TRANSITION';
    END IF;

    UPDATE public.mcus
    SET workflow_status = 'pending_review',
        workflow_version = workflow_version + 1,
        claimed_by = NULL,
        claimed_at = NULL,
        claim_expires_at = NULL,
        updated_at = NOW()
    WHERE mcu_id = p_mcu_id;

    response := public.workflow_mcu_snapshot(p_mcu_id);
    PERFORM public.workflow_append_event(
        p_mcu_id,
        NULL,
        'submit_followup',
        'followup_required',
        'pending_review',
        p_actor_user_id,
        actor_role,
        p_request_id,
        p_idempotency_key,
        jsonb_build_object('response', response)
    );

    RETURN response;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_apply_joining_decision(
    p_employee_id TEXT,
    p_mcu_id TEXT,
    p_actor_user_id TEXT,
    p_expected_version BIGINT,
    p_next_status TEXT,
    p_reason TEXT,
    p_share_override_reason TEXT,
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
    employee_record public.employees%ROWTYPE;
    mcu_record public.mcus%ROWTYPE;
    response JSONB;
BEGIN
    PERFORM public.workflow_require_request(p_request_id, p_idempotency_key);
    PERFORM public.workflow_require_enabled();
    actor_role := public.workflow_require_actor(p_actor_user_id, ARRAY['Admin']);

    response := public.workflow_existing_response(
        p_actor_user_id,
        'joining_decision',
        p_idempotency_key
    );
    IF response IS NOT NULL THEN RETURN response; END IF;

    SELECT * INTO employee_record
    FROM public.employees
    WHERE employee_id = p_employee_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'WF_NOT_FOUND'; END IF;
    IF employee_record.joining_version <> p_expected_version THEN
        RAISE EXCEPTION 'WF_VERSION_CONFLICT';
    END IF;
    IF employee_record.joining_status <> 'candidate'
       OR p_next_status NOT IN ('joined', 'not_joined') THEN
        RAISE EXCEPTION 'WF_INVALID_TRANSITION';
    END IF;
    IF p_next_status = 'not_joined'
       AND NULLIF(BTRIM(p_reason), '') IS NULL THEN
        RAISE EXCEPTION 'WF_VALIDATION_FAILED'
            USING DETAIL = '{"field":"reason"}';
    END IF;

    SELECT * INTO mcu_record
    FROM public.mcus
    WHERE mcu_id = p_mcu_id
      AND employee_id = p_employee_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND
       OR mcu_record.workflow_status <> 'completed'
       OR mcu_record.current_medical_result NOT IN ('Fit', 'Fit With Note', 'Unfit') THEN
        RAISE EXCEPTION 'WF_INVALID_TRANSITION';
    END IF;
    IF mcu_record.current_share_status <> 'confirmed_by_user'
       AND NULLIF(BTRIM(p_share_override_reason), '') IS NULL THEN
        RAISE EXCEPTION 'WF_VALIDATION_FAILED'
            USING DETAIL = '{"field":"shareOverrideReason"}';
    END IF;

    UPDATE public.employees
    SET joining_status = p_next_status,
        joining_version = joining_version + 1,
        joining_decided_by = p_actor_user_id,
        joining_decided_at = NOW(),
        joining_decision_reason = CASE
            WHEN p_next_status = 'not_joined' THEN LEFT(BTRIM(p_reason), 2000)
            ELSE NULL
        END,
        updated_at = NOW()
    WHERE employee_id = p_employee_id;

    response := jsonb_build_object(
        'employeeId', p_employee_id,
        'joiningStatus', p_next_status,
        'joiningVersion', employee_record.joining_version + 1
    );

    INSERT INTO public.employee_joining_status_events (
        employee_id,
        previous_status,
        next_status,
        actor_user_id,
        actor_role,
        reason,
        request_id,
        idempotency_key
    ) VALUES (
        p_employee_id,
        'candidate',
        p_next_status,
        p_actor_user_id,
        actor_role,
        NULLIF(LEFT(BTRIM(p_reason), 2000), ''),
        p_request_id,
        p_idempotency_key
    );

    PERFORM public.workflow_append_event(
        p_mcu_id,
        NULL,
        'joining_decision',
        NULL,
        NULL,
        p_actor_user_id,
        actor_role,
        p_request_id,
        p_idempotency_key,
        jsonb_build_object(
            'employeeId', p_employee_id,
            'joiningStatus', p_next_status,
            'shareOverrideReason', NULLIF(LEFT(BTRIM(p_share_override_reason), 1000), ''),
            'response', response
        )
    );

    RETURN response;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_correct_joining_status(
    p_employee_id TEXT,
    p_actor_user_id TEXT,
    p_expected_version BIGINT,
    p_reason TEXT,
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
    employee_record public.employees%ROWTYPE;
    response JSONB;
BEGIN
    PERFORM public.workflow_require_request(p_request_id, p_idempotency_key);
    PERFORM public.workflow_require_enabled();
    actor_role := public.workflow_require_actor(p_actor_user_id, ARRAY['Admin']);
    IF NULLIF(BTRIM(p_reason), '') IS NULL THEN
        RAISE EXCEPTION 'WF_VALIDATION_FAILED'
            USING DETAIL = '{"field":"reason"}';
    END IF;

    response := public.workflow_existing_response(
        p_actor_user_id,
        'joining_correction',
        p_idempotency_key
    );
    IF response IS NOT NULL THEN RETURN response; END IF;

    SELECT * INTO employee_record
    FROM public.employees
    WHERE employee_id = p_employee_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'WF_NOT_FOUND'; END IF;
    IF employee_record.joining_version <> p_expected_version THEN
        RAISE EXCEPTION 'WF_VERSION_CONFLICT';
    END IF;
    IF employee_record.joining_status <> 'not_joined' THEN
        RAISE EXCEPTION 'WF_INVALID_TRANSITION';
    END IF;

    UPDATE public.employees
    SET joining_status = 'candidate',
        joining_version = joining_version + 1,
        joining_decided_by = NULL,
        joining_decided_at = NULL,
        joining_decision_reason = NULL,
        updated_at = NOW()
    WHERE employee_id = p_employee_id;

    response := jsonb_build_object(
        'employeeId', p_employee_id,
        'joiningStatus', 'candidate',
        'joiningVersion', employee_record.joining_version + 1
    );

    INSERT INTO public.employee_joining_status_events (
        employee_id,
        previous_status,
        next_status,
        actor_user_id,
        actor_role,
        reason,
        request_id,
        idempotency_key
    ) VALUES (
        p_employee_id,
        'not_joined',
        'candidate',
        p_actor_user_id,
        actor_role,
        LEFT(BTRIM(p_reason), 2000),
        p_request_id,
        p_idempotency_key
    );

    PERFORM public.workflow_append_event(
        NULL,
        NULL,
        'joining_correction',
        NULL,
        NULL,
        p_actor_user_id,
        actor_role,
        p_request_id,
        p_idempotency_key,
        jsonb_build_object(
            'employeeId', p_employee_id,
            'response', response
        )
    );

    RETURN response;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_set_share_status(
    p_mcu_id TEXT,
    p_actor_user_id TEXT,
    p_expected_version BIGINT,
    p_next_status TEXT,
    p_failure_reason TEXT,
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
    response JSONB;
BEGIN
    PERFORM public.workflow_require_request(p_request_id, p_idempotency_key);
    PERFORM public.workflow_require_enabled();
    actor_role := public.workflow_require_actor(
        p_actor_user_id,
        ARRAY['Admin', 'Petugas', 'Dokter']
    );

    response := public.workflow_existing_response(
        p_actor_user_id,
        'share_status',
        p_idempotency_key
    );
    IF response IS NOT NULL THEN RETURN response; END IF;

    SELECT * INTO mcu_record
    FROM public.mcus
    WHERE mcu_id = p_mcu_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'WF_NOT_FOUND'; END IF;
    IF mcu_record.workflow_version <> p_expected_version THEN
        RAISE EXCEPTION 'WF_VERSION_CONFLICT';
    END IF;
    IF mcu_record.current_share_cycle_id IS NULL
       OR p_next_status NOT IN ('prepared', 'confirmed_by_user', 'failed') THEN
        RAISE EXCEPTION 'WF_INVALID_TRANSITION';
    END IF;
    IF p_next_status = 'prepared'
       AND mcu_record.current_share_status NOT IN ('not_started', 'failed') THEN
        RAISE EXCEPTION 'WF_INVALID_TRANSITION';
    END IF;
    IF p_next_status = 'confirmed_by_user'
       AND mcu_record.current_share_status <> 'prepared' THEN
        RAISE EXCEPTION 'WF_INVALID_TRANSITION';
    END IF;
    IF p_next_status = 'failed'
       AND mcu_record.current_share_status NOT IN ('not_started', 'prepared', 'failed') THEN
        RAISE EXCEPTION 'WF_INVALID_TRANSITION';
    END IF;

    UPDATE public.mcus
    SET current_share_status = p_next_status,
        workflow_version = workflow_version + 1,
        updated_at = NOW()
    WHERE mcu_id = p_mcu_id;

    response := public.workflow_mcu_snapshot(p_mcu_id);
    PERFORM public.workflow_append_event(
        p_mcu_id,
        mcu_record.current_share_cycle_id,
        'share_status',
        mcu_record.current_share_status,
        p_next_status,
        p_actor_user_id,
        actor_role,
        p_request_id,
        p_idempotency_key,
        jsonb_build_object(
            'failureReason', CASE
                WHEN p_next_status = 'failed'
                    THEN NULLIF(LEFT(BTRIM(p_failure_reason), 1000), '')
                ELSE NULL
            END,
            'response', response
        )
    );

    RETURN response;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_register_review_document(
    p_review_cycle_id UUID,
    p_actor_user_id TEXT,
    p_object_key TEXT,
    p_content_sha256 TEXT,
    p_signature_version INTEGER,
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
    cycle_record public.mcu_review_cycles%ROWTYPE;
    document_record public.mcu_review_documents%ROWTYPE;
    mcu_record public.mcus%ROWTYPE;
    response JSONB;
BEGIN
    PERFORM public.workflow_require_request(p_request_id, p_idempotency_key);
    PERFORM public.workflow_require_enabled();
    actor_role := public.workflow_require_actor(p_actor_user_id, ARRAY['Dokter', 'Admin']);

    response := public.workflow_existing_response(
        p_actor_user_id,
        'document_prepared',
        p_idempotency_key
    );
    IF response IS NOT NULL THEN RETURN response; END IF;

    SELECT * INTO cycle_record
    FROM public.mcu_review_cycles
    WHERE id = p_review_cycle_id;

    IF NOT FOUND
       OR cycle_record.decision <> 'approved'
       OR cycle_record.medical_result NOT IN ('Follow-Up', 'Temporary Unfit') THEN
        RAISE EXCEPTION 'WF_INVALID_TRANSITION';
    END IF;

    SELECT * INTO mcu_record
    FROM public.mcus
    WHERE mcu_id = cycle_record.mcu_id
    FOR UPDATE;

    IF NULLIF(BTRIM(p_object_key), '') IS NULL
       OR NULLIF(BTRIM(p_content_sha256), '') IS NULL
       OR p_content_sha256 !~ '^[0-9a-f]{64}$'
       OR p_signature_version <= 0 THEN
        RAISE EXCEPTION 'WF_VALIDATION_FAILED';
    END IF;

    INSERT INTO public.mcu_review_documents (
        review_cycle_id,
        document_type,
        object_key,
        content_sha256,
        signature_version,
        request_id
    ) VALUES (
        p_review_cycle_id,
        'referral_letter',
        p_object_key,
        p_content_sha256,
        p_signature_version,
        p_request_id
    )
    ON CONFLICT (review_cycle_id, document_type) DO NOTHING;

    SELECT * INTO document_record
    FROM public.mcu_review_documents
    WHERE review_cycle_id = p_review_cycle_id
      AND document_type = 'referral_letter';

    IF document_record.content_sha256 <> p_content_sha256 THEN
        RAISE EXCEPTION 'WF_VERSION_CONFLICT';
    END IF;

    UPDATE public.mcus
    SET workflow_version = workflow_version + 1,
        updated_at = NOW()
    WHERE mcu_id = cycle_record.mcu_id;

    response := public.workflow_mcu_snapshot(cycle_record.mcu_id)
        || jsonb_build_object(
            'documentId', document_record.id,
            'reviewCycleId', p_review_cycle_id
        );

    PERFORM public.workflow_append_event(
        cycle_record.mcu_id,
        p_review_cycle_id,
        'document_prepared',
        mcu_record.workflow_status,
        mcu_record.workflow_status,
        p_actor_user_id,
        actor_role,
        p_request_id,
        p_idempotency_key,
        jsonb_build_object(
            'documentId', document_record.id,
            'response', response
        )
    );

    RETURN response;
END;
$$;

DO $$
DECLARE
    function_signature TEXT;
BEGIN
    FOREACH function_signature IN ARRAY ARRAY[
        'workflow_require_request(text,text)',
        'workflow_require_actor(text,text[])',
        'workflow_require_enabled()',
        'workflow_mcu_snapshot(text)',
        'workflow_existing_response(text,text,text)',
        'workflow_append_event(text,uuid,text,text,text,text,text,text,text,jsonb)',
        'workflow_submit_review(text,text,bigint,text,text)',
        'workflow_claim_review(text,text,bigint,text,text)',
        'workflow_release_claim(text,text,bigint,text,text,text)',
        'workflow_apply_doctor_decision(text,text,bigint,text,text,text,text,text,text)',
        'workflow_submit_followup(text,text,bigint,text,text)',
        'workflow_apply_joining_decision(text,text,text,bigint,text,text,text,text,text)',
        'workflow_correct_joining_status(text,text,bigint,text,text,text)',
        'workflow_set_share_status(text,text,bigint,text,text,text,text,text)',
        'workflow_register_review_document(uuid,text,text,text,integer,text,text)'
    ]
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', function_signature);
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', function_signature);
    END LOOP;
END;
$$;

COMMIT;
