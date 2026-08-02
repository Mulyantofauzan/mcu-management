-- MCU approval workflow: append-only follow-up evidence submissions.

BEGIN;

CREATE TABLE IF NOT EXISTS public.mcu_followup_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mcu_id VARCHAR(50) NOT NULL
        REFERENCES public.mcus(mcu_id) ON DELETE RESTRICT,
    prior_review_cycle_id UUID NOT NULL
        REFERENCES public.mcu_review_cycles(id) ON DELETE RESTRICT,
    evidence_notes TEXT NOT NULL,
    attachment_file_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    submitted_by VARCHAR(50) NOT NULL
        REFERENCES public.users(user_id) ON DELETE RESTRICT,
    request_id VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT mcu_followup_submissions_actor_key_unique
        UNIQUE (submitted_by, idempotency_key),
    CONSTRAINT mcu_followup_submissions_attachments_array_check
        CHECK (jsonb_typeof(attachment_file_ids) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_mcu_followup_submissions_mcu_created
    ON public.mcu_followup_submissions (mcu_id, created_at DESC);

DROP TRIGGER IF EXISTS workflow_immutable_rows ON public.mcu_followup_submissions;
CREATE TRIGGER workflow_immutable_rows
BEFORE UPDATE OR DELETE ON public.mcu_followup_submissions
FOR EACH ROW EXECUTE FUNCTION public.workflow_reject_immutable_change();

ALTER TABLE public.mcu_followup_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mcu_followup_submissions FROM anon, authenticated;
GRANT ALL ON public.mcu_followup_submissions TO service_role;

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
    IF mcu_record.workflow_status <> 'followup_required'
       OR mcu_record.current_medical_result NOT IN ('Follow-Up', 'Temporary Unfit')
       OR mcu_record.current_share_cycle_id IS NULL THEN
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
        'followup_required',
        'pending_review',
        p_actor_user_id,
        actor_role,
        p_request_id,
        p_idempotency_key,
        jsonb_build_object(
            'followupSubmissionId', evidence_id,
            'attachmentCount', jsonb_array_length(COALESCE(p_attachment_file_ids, '[]'::jsonb)),
            'response', response
        )
    );

    RETURN response;
END;
$$;

REVOKE ALL ON FUNCTION public.workflow_submit_followup_evidence(
    text, text, bigint, text, jsonb, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_submit_followup_evidence(
    text, text, bigint, text, jsonb, text, text
) TO service_role;

COMMIT;
