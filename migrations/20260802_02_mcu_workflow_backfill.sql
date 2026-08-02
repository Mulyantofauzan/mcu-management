-- MCU approval workflow: legacy backfill and compatibility defaults.
-- Safe to rerun after 20260802_01_mcu_workflow_schema.sql.

BEGIN;

CREATE OR REPLACE FUNCTION public.workflow_is_enabled()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (
            SELECT (setting_value #>> '{}')::BOOLEAN
            FROM public.app_settings
            WHERE setting_key = 'mcu_approval_workflow_enabled'
        ),
        FALSE
    );
$$;

REVOKE ALL ON FUNCTION public.workflow_is_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.workflow_is_enabled() TO service_role;

UPDATE public.employees
SET joining_status = 'joined',
    joining_version = COALESCE(joining_version, 0)
WHERE joining_status IS NULL;

UPDATE public.mcus
SET workflow_status = 'approved_legacy',
    workflow_version = COALESCE(workflow_version, 0),
    current_medical_result = COALESCE(final_result, initial_result, status),
    current_review_cycle = COALESCE(current_review_cycle, 0),
    activated_at = COALESCE(
        activated_at,
        updated_at,
        created_at,
        mcu_date::TIMESTAMP AT TIME ZONE 'Asia/Makassar'
    ),
    current_share_status = COALESCE(current_share_status, 'not_started'),
    claimed_by = NULL,
    claimed_at = NULL,
    claim_expires_at = NULL
WHERE workflow_status IS NULL;

INSERT INTO public.employee_joining_status_events (
    employee_id,
    previous_status,
    next_status,
    actor_role,
    reason,
    request_id,
    idempotency_key
)
SELECT
    employee_id,
    NULL,
    'joined',
    'System',
    'Legacy workflow backfill',
    'legacy-backfill-employee-' || employee_id,
    'legacy-backfill-employee-' || employee_id
FROM public.employees AS employee
WHERE employee.joining_status = 'joined'
  AND NOT EXISTS (
      SELECT 1
      FROM public.employee_joining_status_events AS event
      WHERE event.employee_id = employee.employee_id
        AND event.idempotency_key = 'legacy-backfill-employee-' || employee.employee_id
  );

INSERT INTO public.mcu_workflow_events (
    mcu_id,
    action,
    previous_status,
    next_status,
    actor_role,
    request_id,
    idempotency_key,
    metadata
)
SELECT
    mcu_id,
    'legacy_backfill',
    NULL,
    'approved_legacy',
    'System',
    'legacy-backfill-mcu-' || mcu_id,
    'legacy-backfill-mcu-' || mcu_id,
    jsonb_build_object(
        'medicalResult', current_medical_result,
        'response', jsonb_build_object(
            'mcuId', mcu_id,
            'workflowStatus', 'approved_legacy',
            'workflowVersion', workflow_version
        )
    )
FROM public.mcus AS mcu
WHERE mcu.workflow_status = 'approved_legacy'
  AND NOT EXISTS (
      SELECT 1
      FROM public.mcu_workflow_events AS event
      WHERE event.mcu_id = mcu.mcu_id
        AND event.action = 'legacy_backfill'
  );

ALTER TABLE public.employees
    ALTER COLUMN joining_status SET DEFAULT 'candidate',
    ALTER COLUMN joining_status SET NOT NULL,
    ALTER COLUMN joining_version SET DEFAULT 0,
    ALTER COLUMN joining_version SET NOT NULL;

ALTER TABLE public.mcus
    ALTER COLUMN workflow_status SET DEFAULT 'draft',
    ALTER COLUMN workflow_status SET NOT NULL,
    ALTER COLUMN workflow_version SET DEFAULT 0,
    ALTER COLUMN workflow_version SET NOT NULL,
    ALTER COLUMN current_review_cycle SET DEFAULT 0,
    ALTER COLUMN current_review_cycle SET NOT NULL,
    ALTER COLUMN current_share_status SET DEFAULT 'not_started',
    ALTER COLUMN current_share_status SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.employees'::regclass
          AND conname = 'employees_joining_status_check'
    ) THEN
        ALTER TABLE public.employees
            ADD CONSTRAINT employees_joining_status_check
            CHECK (joining_status IN ('candidate', 'joined', 'not_joined')) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.employees'::regclass
          AND conname = 'employees_joining_version_check'
    ) THEN
        ALTER TABLE public.employees
            ADD CONSTRAINT employees_joining_version_check
            CHECK (joining_version >= 0) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.mcus'::regclass
          AND conname = 'mcus_workflow_status_check'
    ) THEN
        ALTER TABLE public.mcus
            ADD CONSTRAINT mcus_workflow_status_check
            CHECK (workflow_status IN (
                'draft',
                'pending_review',
                'in_review',
                'correction_required',
                'followup_required',
                'completed',
                'approved_legacy'
            )) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.mcus'::regclass
          AND conname = 'mcus_workflow_version_check'
    ) THEN
        ALTER TABLE public.mcus
            ADD CONSTRAINT mcus_workflow_version_check
            CHECK (workflow_version >= 0) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.mcus'::regclass
          AND conname = 'mcus_current_review_cycle_check'
    ) THEN
        ALTER TABLE public.mcus
            ADD CONSTRAINT mcus_current_review_cycle_check
            CHECK (current_review_cycle >= 0) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.mcus'::regclass
          AND conname = 'mcus_current_medical_result_check'
    ) THEN
        ALTER TABLE public.mcus
            ADD CONSTRAINT mcus_current_medical_result_check
            CHECK (
                current_medical_result IS NULL
                OR current_medical_result IN (
                    'Fit',
                    'Fit With Note',
                    'Unfit',
                    'Follow-Up',
                    'Temporary Unfit'
                )
            ) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.mcus'::regclass
          AND conname = 'mcus_current_share_status_check'
    ) THEN
        ALTER TABLE public.mcus
            ADD CONSTRAINT mcus_current_share_status_check
            CHECK (current_share_status IN (
                'not_started',
                'prepared',
                'confirmed_by_user',
                'failed'
            )) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.mcus'::regclass
          AND conname = 'mcus_claim_state_check'
    ) THEN
        ALTER TABLE public.mcus
            ADD CONSTRAINT mcus_claim_state_check
            CHECK (
                (workflow_status = 'in_review'
                    AND claimed_by IS NOT NULL
                    AND claimed_at IS NOT NULL
                    AND claim_expires_at IS NOT NULL)
                OR
                (workflow_status <> 'in_review'
                    AND claimed_by IS NULL
                    AND claimed_at IS NULL
                    AND claim_expires_at IS NULL)
            ) NOT VALID;
    END IF;
END;
$$;

ALTER TABLE public.users VALIDATE CONSTRAINT users_role_workflow_check;
ALTER TABLE public.employees VALIDATE CONSTRAINT employees_joining_status_check;
ALTER TABLE public.employees VALIDATE CONSTRAINT employees_joining_version_check;
ALTER TABLE public.employees VALIDATE CONSTRAINT employees_joining_decided_by_fkey;
ALTER TABLE public.mcus VALIDATE CONSTRAINT mcus_workflow_status_check;
ALTER TABLE public.mcus VALIDATE CONSTRAINT mcus_workflow_version_check;
ALTER TABLE public.mcus VALIDATE CONSTRAINT mcus_current_review_cycle_check;
ALTER TABLE public.mcus VALIDATE CONSTRAINT mcus_current_medical_result_check;
ALTER TABLE public.mcus VALIDATE CONSTRAINT mcus_current_share_status_check;
ALTER TABLE public.mcus VALIDATE CONSTRAINT mcus_claim_state_check;
ALTER TABLE public.mcus VALIDATE CONSTRAINT mcus_claimed_by_fkey;
ALTER TABLE public.mcus VALIDATE CONSTRAINT mcus_current_share_cycle_id_fkey;

CREATE OR REPLACE FUNCTION public.workflow_apply_compatibility_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    enabled BOOLEAN := public.workflow_is_enabled();
BEGIN
    IF TG_TABLE_NAME = 'employees' THEN
        NEW.joining_version := COALESCE(NEW.joining_version, 0);
        NEW.joining_status := CASE
            WHEN enabled THEN COALESCE(NEW.joining_status, 'candidate')
            ELSE 'joined'
        END;
        RETURN NEW;
    END IF;

    NEW.workflow_version := COALESCE(NEW.workflow_version, 0);
    NEW.current_review_cycle := COALESCE(NEW.current_review_cycle, 0);
    NEW.current_share_status := COALESCE(NEW.current_share_status, 'not_started');
    NEW.claimed_by := NULL;
    NEW.claimed_at := NULL;
    NEW.claim_expires_at := NULL;

    IF enabled THEN
        NEW.workflow_status := 'draft';
        NEW.current_medical_result := NULL;
        NEW.activated_at := NULL;
        NEW.initial_result := NULL;
        NEW.initial_notes := NULL;
        NEW.final_result := NULL;
        NEW.final_notes := NULL;
        NEW.status := NULL;
    ELSE
        NEW.workflow_status := 'approved_legacy';
        NEW.current_medical_result := COALESCE(NEW.final_result, NEW.initial_result, NEW.status);
        NEW.activated_at := COALESCE(
            NEW.updated_at,
            NEW.created_at,
            NEW.mcu_date::TIMESTAMP AT TIME ZONE 'Asia/Makassar',
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employees_workflow_compatibility_defaults ON public.employees;
CREATE TRIGGER employees_workflow_compatibility_defaults
BEFORE INSERT ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.workflow_apply_compatibility_defaults();

DROP TRIGGER IF EXISTS mcus_workflow_compatibility_defaults ON public.mcus;
CREATE TRIGGER mcus_workflow_compatibility_defaults
BEFORE INSERT ON public.mcus
FOR EACH ROW EXECUTE FUNCTION public.workflow_apply_compatibility_defaults();

CREATE OR REPLACE FUNCTION public.workflow_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS doctor_profiles_touch_updated_at ON public.doctor_profiles;
CREATE TRIGGER doctor_profiles_touch_updated_at
BEFORE UPDATE ON public.doctor_profiles
FOR EACH ROW EXECUTE FUNCTION public.workflow_touch_updated_at();

DROP TRIGGER IF EXISTS app_settings_touch_updated_at ON public.app_settings;
CREATE TRIGGER app_settings_touch_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.workflow_touch_updated_at();

COMMIT;
