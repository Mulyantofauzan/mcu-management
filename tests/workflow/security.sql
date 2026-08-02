-- Run after state-machine.sql on a production-shaped staging database.
-- Verifies protected columns and immutable records through trigger boundaries.

BEGIN;

UPDATE public.app_settings
SET setting_value = 'true'::jsonb
WHERE setting_key = 'mcu_approval_workflow_enabled';

INSERT INTO public.users (
    user_id, username, password_hash, display_name, role, active
) VALUES
    ('WF-SEC-PETUGAS', 'wf_sec_petugas', 'test-only', 'Security Petugas', 'Petugas', TRUE),
    ('WF-SEC-DOCTOR', 'wf_sec_doctor', 'test-only', 'Security Doctor', 'Dokter', TRUE)
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role,
    active = TRUE;

SELECT set_config(
    'request.jwt.claims',
    '{"role":"authenticated","app_role":"Petugas","app_user_id":"WF-SEC-PETUGAS","sub":"WF-SEC-PETUGAS"}',
    TRUE
);

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
    'WF-SEC-EMPLOYEE',
    'Workflow Security Candidate',
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
    'WF-SEC-MCU',
    'WF-SEC-EMPLOYEE',
    'Pre-Employee',
    CURRENT_DATE,
    'WF-SEC-PETUGAS'
);

DO $$
BEGIN
    BEGIN
        UPDATE public.mcus
        SET current_medical_result = 'Fit',
            workflow_status = 'completed'
        WHERE mcu_id = 'WF-SEC-MCU';
        RAISE EXCEPTION 'Expected protected MCU update to fail';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%WF_FORBIDDEN%' THEN
            RAISE;
        END IF;
    END;

    BEGIN
        UPDATE public.employees
        SET joining_status = 'joined'
        WHERE employee_id = 'WF-SEC-EMPLOYEE';
        RAISE EXCEPTION 'Expected protected employee update to fail';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%WF_FORBIDDEN%' THEN
            RAISE;
        END IF;
    END;
END;
$$;

-- Create one finalized cycle in service context, then prove it is immutable.
SELECT set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
);

INSERT INTO public.mcu_review_cycles (
    mcu_id,
    cycle_number,
    review_stage,
    decision,
    medical_result,
    clinical_notes,
    doctor_user_id,
    started_at,
    finalized_at,
    idempotency_key
) VALUES (
    'WF-SEC-MCU',
    1,
    'initial',
    'approved',
    'Fit',
    'Security test.',
    'WF-SEC-DOCTOR',
    NOW(),
    NOW(),
    'wf-sec-cycle'
);

DO $$
BEGIN
    BEGIN
        UPDATE public.mcu_review_cycles
        SET clinical_notes = 'Tampered'
        WHERE mcu_id = 'WF-SEC-MCU';
        RAISE EXCEPTION 'Expected immutable review update to fail';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%WF_IMMUTABLE_RECORD%' THEN
            RAISE;
        END IF;
    END;
END;
$$;

ROLLBACK;
