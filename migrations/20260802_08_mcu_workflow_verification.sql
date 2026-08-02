-- Read-only release verification for MCU approval workflow.
-- Run after migrations 01-07. Any failed assertion aborts the transaction.

BEGIN;

DO $$
DECLARE
    invalid_count BIGINT;
    workflow_enabled BOOLEAN;
BEGIN
    IF to_regclass('public.mcu_review_cycles') IS NULL
       OR to_regclass('public.mcu_workflow_events') IS NULL
       OR to_regclass('public.mcu_followup_submissions') IS NULL
       OR to_regclass('public.v_analytics_eligible_current') IS NULL THEN
        RAISE EXCEPTION 'VERIFY_MISSING_WORKFLOW_OBJECT';
    END IF;

    SELECT public.workflow_is_enabled() INTO workflow_enabled;

    SELECT COUNT(*) INTO invalid_count
    FROM public.employees
    WHERE deleted_at IS NULL AND joining_status IS NULL;
    IF invalid_count <> 0 THEN
        RAISE EXCEPTION 'VERIFY_NULL_JOINING_STATUS: %', invalid_count;
    END IF;

    SELECT COUNT(*) INTO invalid_count
    FROM public.mcus
    WHERE deleted_at IS NULL AND workflow_status IS NULL;
    IF invalid_count <> 0 THEN
        RAISE EXCEPTION 'VERIFY_NULL_WORKFLOW_STATUS: %', invalid_count;
    END IF;

    SELECT COUNT(*) INTO invalid_count
    FROM (
        SELECT mcu_id, cycle_number
        FROM public.mcu_review_cycles
        GROUP BY mcu_id, cycle_number
        HAVING COUNT(*) > 1
    ) duplicate_cycles;
    IF invalid_count <> 0 THEN
        RAISE EXCEPTION 'VERIFY_DUPLICATE_REVIEW_CYCLE: %', invalid_count;
    END IF;

    SELECT COUNT(*) INTO invalid_count
    FROM public.mcus
    WHERE workflow_status <> 'in_review'
      AND (claimed_by IS NOT NULL OR claimed_at IS NOT NULL OR claim_expires_at IS NOT NULL);
    IF invalid_count <> 0 THEN
        RAISE EXCEPTION 'VERIFY_ORPHAN_CLAIM: %', invalid_count;
    END IF;

    SELECT COUNT(*) INTO invalid_count
    FROM (
        SELECT employee_id
        FROM public.v_current_reviewed_mcu
        GROUP BY employee_id
        HAVING COUNT(*) > 1
    ) duplicate_current;
    IF invalid_count <> 0 THEN
        RAISE EXCEPTION 'VERIFY_DUPLICATE_CURRENT_MCU: %', invalid_count;
    END IF;

    IF workflow_enabled THEN
        SELECT COUNT(*) INTO invalid_count
        FROM public.v_analytics_eligible_current eligible
        WHERE eligible.employee ->> 'joining_status' <> 'joined'
           OR COALESCE((eligible.employee ->> 'is_active')::BOOLEAN, FALSE) IS NOT TRUE
           OR eligible.mcu ->> 'activated_at' IS NULL;
        IF invalid_count <> 0 THEN
            RAISE EXCEPTION 'VERIFY_INELIGIBLE_ANALYTICS_ROW: %', invalid_count;
        END IF;

        SELECT COUNT(*) INTO invalid_count
        FROM public.mcus m
        JOIN public.v_current_reviewed_mcu current_mcu ON current_mcu.mcu_id = m.mcu_id
        WHERE m.workflow_status IN ('draft', 'pending_review', 'in_review', 'correction_required');
        IF invalid_count <> 0 THEN
            RAISE EXCEPTION 'VERIFY_UNREVIEWED_CURRENT_MCU: %', invalid_count;
        END IF;
    END IF;
END;
$$;

SELECT
    public.workflow_is_enabled() AS workflow_enabled,
    (SELECT COUNT(*) FROM public.employees WHERE deleted_at IS NULL) AS employee_count,
    (SELECT COUNT(*) FROM public.mcus WHERE deleted_at IS NULL) AS mcu_count,
    (SELECT COUNT(*) FROM public.v_analytics_eligible_current) AS analytics_eligible_count,
    (SELECT COUNT(*) FROM public.mcus WHERE workflow_status IN ('pending_review', 'in_review')) AS doctor_queue_count,
    (SELECT COUNT(*) FROM public.employees WHERE joining_status = 'candidate') AS candidate_count;

ROLLBACK;
