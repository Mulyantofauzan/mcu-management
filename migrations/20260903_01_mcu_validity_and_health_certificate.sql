-- Fixed MCU validity and health-certificate rules.

BEGIN;

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.mcus'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%mcu_type%'
    LOOP
        EXECUTE format('ALTER TABLE public.mcus DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END;
$$;

ALTER TABLE public.mcus
    ADD CONSTRAINT mcus_mcu_type_check
    CHECK (mcu_type IN ('Pre-Employee', 'Annual', 'Khusus', 'Final', 'Surat Sehat'))
    NOT VALID;

ALTER TABLE public.mcus VALIDATE CONSTRAINT mcus_mcu_type_check;

CREATE OR REPLACE FUNCTION public.workflow_validate_health_certificate_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.employee_id, 0));

    IF NEW.deleted_at IS NULL AND NEW.mcu_type = 'Surat Sehat' THEN
        IF TG_OP = 'UPDATE'
           AND OLD.mcu_type IS DISTINCT FROM 'Surat Sehat' THEN
            RAISE EXCEPTION 'Karyawan dengan riwayat MCU tidak dapat diperpanjang memakai Surat Sehat.';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM public.mcus history
            WHERE history.employee_id = NEW.employee_id
              AND history.deleted_at IS NULL
              AND history.mcu_type <> 'Surat Sehat'
              AND history.mcu_id <> NEW.mcu_id
        ) THEN
            RAISE EXCEPTION 'Karyawan dengan riwayat MCU tidak dapat diperpanjang memakai Surat Sehat.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzz_validate_health_certificate_history ON public.mcus;
CREATE TRIGGER zzz_validate_health_certificate_history
BEFORE INSERT OR UPDATE OF employee_id, mcu_type, deleted_at ON public.mcus
FOR EACH ROW EXECUTE FUNCTION public.workflow_validate_health_certificate_history();

REVOKE ALL ON FUNCTION public.workflow_validate_health_certificate_history() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.workflow_validate_health_certificate_history() TO service_role;

CREATE OR REPLACE FUNCTION public.workflow_mcu_validity_months(p_mcu_type TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT CASE WHEN BTRIM(p_mcu_type) = 'Surat Sehat' THEN 3 ELSE 12 END;
$$;

REVOKE ALL ON FUNCTION public.workflow_mcu_validity_months(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workflow_mcu_validity_months(TEXT) TO authenticated, service_role;

CREATE OR REPLACE VIEW public.v_current_reviewed_mcu
WITH (security_invoker = TRUE)
AS
SELECT DISTINCT ON (m.employee_id) m.*
FROM public.mcus m
CROSS JOIN public.workflow_analytics_config() config
WHERE m.deleted_at IS NULL
  AND (
      config.workflow_enabled IS FALSE
      OR (
          m.activated_at IS NOT NULL
          AND m.workflow_status IN ('completed', 'followup_required', 'approved_legacy')
      )
  )
ORDER BY
    m.employee_id,
    CASE WHEN m.mcu_type = 'Surat Sehat' THEN 1 ELSE 0 END,
    m.mcu_date DESC NULLS LAST,
    m.updated_at DESC NULLS LAST,
    m.mcu_id DESC;

CREATE OR REPLACE VIEW public.v_analytics_eligible_current
WITH (security_invoker = TRUE)
AS
SELECT
    e.employee_id,
    m.mcu_id,
    TO_JSONB(e) AS employee,
    TO_JSONB(m) AS mcu,
    (
        m.mcu_date
        + MAKE_INTERVAL(months => public.workflow_mcu_validity_months(m.mcu_type))
    )::DATE AS expiry_date,
    public.workflow_mcu_validity_months(m.mcu_type) AS expiry_months
FROM public.employees e
JOIN public.v_current_reviewed_mcu m ON m.employee_id = e.employee_id
CROSS JOIN public.workflow_analytics_config() config
WHERE e.deleted_at IS NULL
  AND e.is_active IS TRUE
  AND (config.workflow_enabled IS FALSE OR e.joining_status = 'joined')
  AND (
      config.workflow_enabled IS FALSE
      OR (
          m.mcu_date
          + MAKE_INTERVAL(months => public.workflow_mcu_validity_months(m.mcu_type))
      )::DATE >= config.local_today
  );

CREATE OR REPLACE VIEW public.v_mcu_expiry_overview
WITH (security_invoker = TRUE)
AS
SELECT
    e.employee_id,
    e.name,
    e.department,
    e.job_title,
    m.mcu_id,
    m.mcu_date AS last_mcu_date,
    expiry.expiry_date,
    CASE WHEN expiry.expiry_date IS NULL THEN NULL
         ELSE expiry.expiry_date - config.local_today END AS days_left,
    CASE
        WHEN m.mcu_id IS NULL THEN 'NO_MCU'
        WHEN expiry.expiry_date < config.local_today THEN 'EXPIRED'
        WHEN expiry.expiry_date <= config.local_today + 60 THEN 'WARNING'
        ELSE 'OK'
    END AS expiry_status,
    CASE WHEN m.mcu_id IS NULL THEN NULL
         ELSE public.workflow_mcu_validity_months(m.mcu_type) END AS expiry_months,
    m.mcu_type AS document_type
FROM public.employees e
LEFT JOIN public.v_current_reviewed_mcu m ON m.employee_id = e.employee_id
CROSS JOIN public.workflow_analytics_config() config
CROSS JOIN LATERAL (
    SELECT CASE
        WHEN m.mcu_date IS NULL THEN NULL::DATE
        ELSE (
            m.mcu_date
            + MAKE_INTERVAL(months => public.workflow_mcu_validity_months(m.mcu_type))
        )::DATE
    END AS expiry_date
) expiry
WHERE e.deleted_at IS NULL
  AND e.is_active IS TRUE
  AND (config.workflow_enabled IS FALSE OR e.joining_status = 'joined');

COMMIT;
