-- MCU approval workflow: operational settings, signatures, and document failures.

BEGIN;

CREATE OR REPLACE FUNCTION public.workflow_confirm_doctor_signature(
    p_actor_user_id TEXT,
    p_expected_version INTEGER,
    p_object_key TEXT,
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
    profile_record public.doctor_profiles%ROWTYPE;
    response JSONB;
BEGIN
    PERFORM public.workflow_require_request(p_request_id, p_idempotency_key);
    actor_role := public.workflow_require_actor(p_actor_user_id, ARRAY['Dokter']);

    response := public.workflow_existing_response(
        p_actor_user_id,
        'doctor_signature_confirm',
        p_idempotency_key
    );
    IF response IS NOT NULL THEN RETURN response; END IF;

    SELECT * INTO profile_record
    FROM public.doctor_profiles
    WHERE user_id = p_actor_user_id
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'WF_NOT_FOUND'; END IF;
    IF profile_record.signature_version <> p_expected_version THEN
        RAISE EXCEPTION 'WF_VERSION_CONFLICT';
    END IF;
    IF NULLIF(BTRIM(p_object_key), '') IS NULL
       OR p_object_key NOT LIKE 'doctor-signatures/' || p_actor_user_id || '/%'
       OR p_object_key LIKE '%..%'
       OR POSITION(CHR(92) IN p_object_key) > 0
       OR p_object_key !~ '\.(png|jpg)$' THEN
        RAISE EXCEPTION 'WF_VALIDATION_FAILED'
            USING DETAIL = '{"field":"objectKey"}';
    END IF;

    UPDATE public.doctor_profiles
    SET signature_object_key = p_object_key,
        signature_version = signature_version + 1,
        updated_at = NOW()
    WHERE user_id = p_actor_user_id;

    response := jsonb_build_object(
        'userId', p_actor_user_id,
        'signatureVersion', profile_record.signature_version + 1,
        'updatedAt', NOW()
    );

    PERFORM public.workflow_append_event(
        NULL,
        NULL,
        'doctor_signature_confirm',
        NULL,
        NULL,
        p_actor_user_id,
        actor_role,
        p_request_id,
        p_idempotency_key,
        jsonb_build_object('response', response)
    );

    RETURN response;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_record_document_failure(
    p_review_cycle_id UUID,
    p_actor_user_id TEXT,
    p_failure_code TEXT,
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
    mcu_status TEXT;
    response JSONB;
BEGIN
    PERFORM public.workflow_require_request(p_request_id, p_idempotency_key);
    PERFORM public.workflow_require_enabled();
    actor_role := public.workflow_require_actor(p_actor_user_id, ARRAY['Dokter', 'Admin']);

    response := public.workflow_existing_response(
        p_actor_user_id,
        'document_failed',
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

    SELECT workflow_status INTO mcu_status
    FROM public.mcus
    WHERE mcu_id = cycle_record.mcu_id;

    response := jsonb_build_object(
        'reviewCycleId', p_review_cycle_id,
        'status', 'failed'
    );

    PERFORM public.workflow_append_event(
        cycle_record.mcu_id,
        p_review_cycle_id,
        'document_failed',
        mcu_status,
        mcu_status,
        p_actor_user_id,
        actor_role,
        p_request_id,
        p_idempotency_key,
        jsonb_build_object(
            'failureCode', LEFT(COALESCE(NULLIF(BTRIM(p_failure_code), ''), 'DOCUMENT_FAILED'), 100),
            'response', response
        )
    );

    RETURN response;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_update_expiry_months(
    p_actor_user_id TEXT,
    p_expected_version BIGINT,
    p_expiry_months INTEGER,
    p_impact JSONB,
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
    setting_record public.app_settings%ROWTYPE;
    response JSONB;
BEGIN
    PERFORM public.workflow_require_request(p_request_id, p_idempotency_key);
    actor_role := public.workflow_require_actor(p_actor_user_id, ARRAY['Admin']);

    response := public.workflow_existing_response(
        p_actor_user_id,
        'expiry_setting_updated',
        p_idempotency_key
    );
    IF response IS NOT NULL THEN RETURN response; END IF;

    IF p_expiry_months < 1 OR p_expiry_months > 120
       OR jsonb_typeof(COALESCE(p_impact, '{}'::jsonb)) <> 'object' THEN
        RAISE EXCEPTION 'WF_VALIDATION_FAILED';
    END IF;

    SELECT * INTO setting_record
    FROM public.app_settings
    WHERE setting_key = 'mcu_expiry_months'
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'WF_NOT_FOUND'; END IF;
    IF setting_record.version <> p_expected_version THEN
        RAISE EXCEPTION 'WF_VERSION_CONFLICT';
    END IF;

    UPDATE public.app_settings
    SET setting_value = to_jsonb(p_expiry_months),
        version = version + 1,
        updated_by = p_actor_user_id,
        updated_at = NOW()
    WHERE setting_key = 'mcu_expiry_months';

    response := jsonb_build_object(
        'expiryMonths', p_expiry_months,
        'version', setting_record.version + 1,
        'impact', COALESCE(p_impact, '{}'::jsonb)
    );
    PERFORM public.workflow_append_event(
        NULL, NULL, 'expiry_setting_updated', NULL, NULL,
        p_actor_user_id, actor_role, p_request_id, p_idempotency_key,
        jsonb_build_object('response', response)
    );
    RETURN response;
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_set_feature_flag(
    p_actor_user_id TEXT,
    p_expected_version BIGINT,
    p_enabled BOOLEAN,
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
    setting_record public.app_settings%ROWTYPE;
    response JSONB;
BEGIN
    PERFORM public.workflow_require_request(p_request_id, p_idempotency_key);
    actor_role := public.workflow_require_actor(p_actor_user_id, ARRAY['Admin']);

    response := public.workflow_existing_response(
        p_actor_user_id,
        'workflow_feature_updated',
        p_idempotency_key
    );
    IF response IS NOT NULL THEN RETURN response; END IF;

    IF NULLIF(BTRIM(p_reason), '') IS NULL THEN
        RAISE EXCEPTION 'WF_VALIDATION_FAILED'
            USING DETAIL = '{"field":"reason"}';
    END IF;

    SELECT * INTO setting_record
    FROM public.app_settings
    WHERE setting_key = 'mcu_approval_workflow_enabled'
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'WF_NOT_FOUND'; END IF;
    IF setting_record.version <> p_expected_version THEN
        RAISE EXCEPTION 'WF_VERSION_CONFLICT';
    END IF;

    UPDATE public.app_settings
    SET setting_value = to_jsonb(p_enabled),
        version = version + 1,
        updated_by = p_actor_user_id,
        updated_at = NOW()
    WHERE setting_key = 'mcu_approval_workflow_enabled';

    response := jsonb_build_object(
        'workflowEnabled', p_enabled,
        'version', setting_record.version + 1
    );
    PERFORM public.workflow_append_event(
        NULL, NULL, 'workflow_feature_updated', NULL, NULL,
        p_actor_user_id, actor_role, p_request_id, p_idempotency_key,
        jsonb_build_object(
            'enabled', p_enabled,
            'reason', LEFT(BTRIM(p_reason), 1000),
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
        'workflow_confirm_doctor_signature(text,integer,text,text,text)',
        'workflow_record_document_failure(uuid,text,text,text,text)',
        'workflow_update_expiry_months(text,bigint,integer,jsonb,text,text)',
        'workflow_set_feature_flag(text,bigint,boolean,text,text,text)'
    ]
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', function_signature);
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', function_signature);
    END LOOP;
END;
$$;

COMMIT;
