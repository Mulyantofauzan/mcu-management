-- Run after all workflow migrations on a production-shaped staging database.
-- psql -v ON_ERROR_STOP=1 "$WORKFLOW_TEST_DATABASE_URL" -f tests/workflow/state-machine.sql

BEGIN;

UPDATE public.app_settings
SET setting_value = 'true'::jsonb,
    version = version + 1
WHERE setting_key = 'mcu_approval_workflow_enabled';

SELECT set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
);

INSERT INTO public.users (
    user_id, username, password_hash, display_name, role, active
) VALUES
    ('WF-TEST-ADMIN', 'wf_test_admin', 'test-only', 'Workflow Test Admin', 'Admin', TRUE),
    ('WF-TEST-PETUGAS', 'wf_test_petugas', 'test-only', 'Workflow Test Petugas', 'Petugas', TRUE),
    ('WF-TEST-DOCTOR-1', 'wf_test_doctor_1', 'test-only', 'Workflow Test Doctor 1', 'Dokter', TRUE),
    ('WF-TEST-DOCTOR-2', 'wf_test_doctor_2', 'test-only', 'Workflow Test Doctor 2', 'Dokter', TRUE)
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role,
    active = TRUE;

INSERT INTO public.employees (
    employee_id,
    name,
    job_title,
    department,
    date_of_birth,
    jenis_kelamin,
    employee_type,
    is_active
) VALUES (
    'WF-TEST-EMPLOYEE',
    'Workflow Test Candidate',
    'Test',
    'Test',
    DATE '1990-01-01',
    'Laki-laki',
    'Karyawan PST',
    TRUE
);

INSERT INTO public.mcus (
    mcu_id,
    employee_id,
    mcu_type,
    mcu_date,
    created_by
) VALUES (
    'WF-TEST-MCU',
    'WF-TEST-EMPLOYEE',
    'Pre-Employee',
    CURRENT_DATE,
    'WF-TEST-PETUGAS'
);

SELECT public.workflow_submit_review(
    'WF-TEST-MCU',
    'WF-TEST-PETUGAS',
    0,
    'wf-test-submit-1',
    'wf-test-submit-1'
);

SELECT public.workflow_claim_review(
    'WF-TEST-MCU',
    'WF-TEST-DOCTOR-1',
    1,
    'wf-test-claim-1',
    'wf-test-claim-1'
);

DO $$
BEGIN
    BEGIN
        PERFORM public.workflow_claim_review(
            'WF-TEST-MCU',
            'WF-TEST-DOCTOR-2',
            2,
            'wf-test-claim-locked',
            'wf-test-claim-locked'
        );
        RAISE EXCEPTION 'Expected WF_LOCKED';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%WF_LOCKED%' THEN
            RAISE;
        END IF;
    END;
END;
$$;

SELECT public.workflow_apply_doctor_decision(
    'WF-TEST-MCU',
    'WF-TEST-DOCTOR-1',
    2,
    'approved',
    'Follow-Up',
    'Follow-up test required.',
    NULL,
    'wf-test-review-1',
    'wf-test-review-1'
);

-- Exact retry must return the original response and create no duplicate cycle.
SELECT public.workflow_apply_doctor_decision(
    'WF-TEST-MCU',
    'WF-TEST-DOCTOR-1',
    2,
    'approved',
    'Follow-Up',
    'Follow-up test required.',
    NULL,
    'wf-test-review-1-retry',
    'wf-test-review-1'
);

SELECT public.workflow_submit_followup(
    'WF-TEST-MCU',
    'WF-TEST-PETUGAS',
    3,
    'wf-test-followup-1',
    'wf-test-followup-1'
);

SELECT public.workflow_claim_review(
    'WF-TEST-MCU',
    'WF-TEST-DOCTOR-2',
    4,
    'wf-test-claim-2',
    'wf-test-claim-2'
);

SELECT public.workflow_apply_doctor_decision(
    'WF-TEST-MCU',
    'WF-TEST-DOCTOR-2',
    5,
    'approved',
    'Fit',
    'Follow-up completed.',
    NULL,
    'wf-test-review-2',
    'wf-test-review-2'
);

SELECT public.workflow_set_share_status(
    'WF-TEST-MCU',
    'WF-TEST-PETUGAS',
    6,
    'prepared',
    NULL,
    'wf-test-share-prepared',
    'wf-test-share-prepared'
);

SELECT public.workflow_set_share_status(
    'WF-TEST-MCU',
    'WF-TEST-PETUGAS',
    7,
    'confirmed_by_user',
    NULL,
    'wf-test-share-confirmed',
    'wf-test-share-confirmed'
);

SELECT public.workflow_apply_joining_decision(
    'WF-TEST-EMPLOYEE',
    'WF-TEST-MCU',
    'WF-TEST-ADMIN',
    0,
    'joined',
    NULL,
    NULL,
    'wf-test-joining',
    'wf-test-joining'
);

DO $$
DECLARE
    mcu_record public.mcus%ROWTYPE;
    employee_record public.employees%ROWTYPE;
    review_count INTEGER;
BEGIN
    SELECT * INTO mcu_record
    FROM public.mcus
    WHERE mcu_id = 'WF-TEST-MCU';

    SELECT * INTO employee_record
    FROM public.employees
    WHERE employee_id = 'WF-TEST-EMPLOYEE';

    SELECT COUNT(*) INTO review_count
    FROM public.mcu_review_cycles
    WHERE mcu_id = 'WF-TEST-MCU';

    IF mcu_record.workflow_status <> 'completed'
       OR mcu_record.current_medical_result <> 'Fit'
       OR mcu_record.current_review_cycle <> 2
       OR mcu_record.workflow_version <> 8 THEN
        RAISE EXCEPTION 'Unexpected final MCU projection: %', row_to_json(mcu_record);
    END IF;

    IF employee_record.joining_status <> 'joined'
       OR employee_record.joining_version <> 1 THEN
        RAISE EXCEPTION 'Unexpected joining projection: %', row_to_json(employee_record);
    END IF;

    IF review_count <> 2 THEN
        RAISE EXCEPTION 'Expected 2 immutable review cycles, found %', review_count;
    END IF;
END;
$$;

ROLLBACK;
