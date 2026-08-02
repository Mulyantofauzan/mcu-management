-- MCU approval workflow: additive schema only.
-- Apply before the backfill migration. The workflow remains disabled.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.users'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%role%'
          AND pg_get_constraintdef(oid) ILIKE '%Admin%'
          AND pg_get_constraintdef(oid) ILIKE '%Petugas%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.users DROP CONSTRAINT %I',
            constraint_record.conname
        );
    END LOOP;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.users'::regclass
          AND conname = 'users_role_workflow_check'
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_role_workflow_check
            CHECK (role IN ('Admin', 'Petugas', 'Dokter')) NOT VALID;
    END IF;
END;
$$;

ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS joining_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS joining_version BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS joining_decided_by VARCHAR(50),
    ADD COLUMN IF NOT EXISTS joining_decided_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS joining_decision_reason TEXT;

ALTER TABLE public.mcus
    ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(30),
    ADD COLUMN IF NOT EXISTS workflow_version BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS current_medical_result VARCHAR(50),
    ADD COLUMN IF NOT EXISTS current_review_cycle INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS claimed_by VARCHAR(50),
    ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS claim_expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS current_share_cycle_id UUID,
    ADD COLUMN IF NOT EXISTS current_share_status VARCHAR(30);

CREATE TABLE IF NOT EXISTS public.doctor_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(50) NOT NULL UNIQUE
        REFERENCES public.users(user_id) ON DELETE CASCADE,
    professional_name VARCHAR(200) NOT NULL,
    registration_number VARCHAR(100),
    signature_object_key TEXT,
    signature_version INTEGER NOT NULL DEFAULT 0
        CHECK (signature_version >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_joining_status_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) NOT NULL
        REFERENCES public.employees(employee_id) ON DELETE RESTRICT,
    previous_status VARCHAR(20),
    next_status VARCHAR(20) NOT NULL,
    actor_user_id VARCHAR(50)
        REFERENCES public.users(user_id) ON DELETE SET NULL,
    actor_role VARCHAR(20) NOT NULL,
    reason TEXT,
    request_id VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT employee_joining_event_previous_check
        CHECK (previous_status IS NULL OR previous_status IN ('candidate', 'joined', 'not_joined')),
    CONSTRAINT employee_joining_event_next_check
        CHECK (next_status IN ('candidate', 'joined', 'not_joined')),
    CONSTRAINT employee_joining_event_role_check
        CHECK (actor_role IN ('Admin', 'Petugas', 'Dokter', 'System'))
);

CREATE TABLE IF NOT EXISTS public.mcu_review_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mcu_id VARCHAR(50) NOT NULL
        REFERENCES public.mcus(mcu_id) ON DELETE RESTRICT,
    cycle_number INTEGER NOT NULL CHECK (cycle_number > 0),
    review_stage VARCHAR(20) NOT NULL
        CHECK (review_stage IN ('initial', 'follow_up')),
    decision VARCHAR(20) NOT NULL
        CHECK (decision IN ('approved', 'rejected')),
    medical_result VARCHAR(50),
    clinical_notes TEXT,
    rejection_reason TEXT,
    doctor_user_id VARCHAR(50) NOT NULL
        REFERENCES public.users(user_id) ON DELETE RESTRICT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finalized_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    idempotency_key VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT mcu_review_cycles_number_unique UNIQUE (mcu_id, cycle_number),
    CONSTRAINT mcu_review_cycles_idempotency_unique UNIQUE (doctor_user_id, idempotency_key),
    CONSTRAINT mcu_review_cycles_result_check CHECK (
        (decision = 'approved'
            AND medical_result IN ('Fit', 'Fit With Note', 'Unfit', 'Follow-Up', 'Temporary Unfit')
            AND clinical_notes IS NOT NULL
            AND BTRIM(clinical_notes) <> ''
            AND rejection_reason IS NULL)
        OR
        (decision = 'rejected'
            AND medical_result IS NULL
            AND rejection_reason IS NOT NULL
            AND BTRIM(rejection_reason) <> '')
    )
);

CREATE TABLE IF NOT EXISTS public.mcu_review_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_cycle_id UUID NOT NULL
        REFERENCES public.mcu_review_cycles(id) ON DELETE RESTRICT,
    document_type VARCHAR(30) NOT NULL
        CHECK (document_type IN ('referral_letter')),
    object_key TEXT NOT NULL,
    content_sha256 VARCHAR(64) NOT NULL
        CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
    signature_version INTEGER NOT NULL CHECK (signature_version > 0),
    request_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT mcu_review_documents_cycle_type_unique
        UNIQUE (review_cycle_id, document_type),
    CONSTRAINT mcu_review_documents_object_key_unique UNIQUE (object_key)
);

CREATE TABLE IF NOT EXISTS public.mcu_workflow_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mcu_id VARCHAR(50)
        REFERENCES public.mcus(mcu_id) ON DELETE RESTRICT,
    review_cycle_id UUID
        REFERENCES public.mcu_review_cycles(id) ON DELETE RESTRICT,
    action VARCHAR(60) NOT NULL,
    previous_status VARCHAR(30),
    next_status VARCHAR(30),
    actor_user_id VARCHAR(50)
        REFERENCES public.users(user_id) ON DELETE SET NULL,
    actor_role VARCHAR(20) NOT NULL,
    request_id VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(100),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT mcu_workflow_events_role_check
        CHECK (actor_role IN ('Admin', 'Petugas', 'Dokter', 'System')),
    CONSTRAINT mcu_workflow_events_metadata_object_check
        CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS public.app_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value JSONB NOT NULL,
    version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0),
    updated_by VARCHAR(50)
        REFERENCES public.users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.employees'::regclass
          AND conname = 'employees_joining_decided_by_fkey'
    ) THEN
        ALTER TABLE public.employees
            ADD CONSTRAINT employees_joining_decided_by_fkey
            FOREIGN KEY (joining_decided_by)
            REFERENCES public.users(user_id)
            ON DELETE SET NULL
            NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.mcus'::regclass
          AND conname = 'mcus_claimed_by_fkey'
    ) THEN
        ALTER TABLE public.mcus
            ADD CONSTRAINT mcus_claimed_by_fkey
            FOREIGN KEY (claimed_by)
            REFERENCES public.users(user_id)
            ON DELETE SET NULL
            NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.mcus'::regclass
          AND conname = 'mcus_current_share_cycle_id_fkey'
    ) THEN
        ALTER TABLE public.mcus
            ADD CONSTRAINT mcus_current_share_cycle_id_fkey
            FOREIGN KEY (current_share_cycle_id)
            REFERENCES public.mcu_review_cycles(id)
            ON DELETE SET NULL
            NOT VALID;
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_joining_event_idempotency
    ON public.employee_joining_status_events(actor_user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mcu_workflow_event_idempotency
    ON public.mcu_workflow_events(actor_user_id, action, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_joining_status
    ON public.employees(joining_status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mcus_workflow_queue
    ON public.mcus(workflow_status, claim_expires_at, mcu_date DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mcus_current_reviewed
    ON public.mcus(employee_id, activated_at DESC)
    WHERE deleted_at IS NULL AND activated_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mcu_review_cycles_mcu
    ON public.mcu_review_cycles(mcu_id, cycle_number DESC);

CREATE INDEX IF NOT EXISTS idx_mcu_workflow_events_mcu
    ON public.mcu_workflow_events(mcu_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_joining_events_employee
    ON public.employee_joining_status_events(employee_id, created_at DESC);

INSERT INTO public.app_settings (setting_key, setting_value, version)
VALUES
    ('mcu_approval_workflow_enabled', 'false'::jsonb, 0),
    ('mcu_expiry_months', '18'::jsonb, 0)
ON CONFLICT (setting_key) DO NOTHING;

COMMIT;
