-- MCU approval workflow: canonical reviewed analytics and calendar-month expiry.

BEGIN;

CREATE OR REPLACE FUNCTION public.workflow_analytics_config()
RETURNS TABLE(workflow_enabled BOOLEAN, expiry_months INTEGER, local_today DATE)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        COALESCE((SELECT (setting_value #>> '{}')::BOOLEAN
                  FROM public.app_settings
                  WHERE setting_key = 'mcu_approval_workflow_enabled'), FALSE),
        COALESCE((SELECT (setting_value #>> '{}')::INTEGER
                  FROM public.app_settings
                  WHERE setting_key = 'mcu_expiry_months'), 18),
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Makassar')::DATE;
$$;

REVOKE ALL ON FUNCTION public.workflow_analytics_config() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workflow_analytics_config() TO authenticated, service_role;

DROP VIEW IF EXISTS public.v_reviewed_mcu_history;
DROP VIEW IF EXISTS public.v_analytics_eligible_current;
DROP VIEW IF EXISTS public.v_mcu_expiry_overview;
DROP VIEW IF EXISTS public.v_current_reviewed_mcu;

CREATE VIEW public.v_current_reviewed_mcu
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
    CASE
        WHEN config.workflow_enabled THEN COALESCE(m.activated_at, m.created_at)
        ELSE COALESCE(m.mcu_date::TIMESTAMP, m.created_at)
    END DESC NULLS LAST,
    m.updated_at DESC NULLS LAST,
    m.mcu_id DESC;

CREATE VIEW public.v_analytics_eligible_current
WITH (security_invoker = TRUE)
AS
SELECT
    e.employee_id,
    m.mcu_id,
    TO_JSONB(e) AS employee,
    TO_JSONB(m) AS mcu,
    (m.mcu_date + MAKE_INTERVAL(months => config.expiry_months))::DATE AS expiry_date,
    config.expiry_months
FROM public.employees e
JOIN public.v_current_reviewed_mcu m ON m.employee_id = e.employee_id
CROSS JOIN public.workflow_analytics_config() config
WHERE e.deleted_at IS NULL
  AND e.is_active IS TRUE
  AND (config.workflow_enabled IS FALSE OR e.joining_status = 'joined')
  AND (
      config.workflow_enabled IS FALSE
      OR (m.mcu_date + MAKE_INTERVAL(months => config.expiry_months))::DATE >= config.local_today
  );

CREATE VIEW public.v_reviewed_mcu_history
WITH (security_invoker = TRUE)
AS
SELECT
    e.employee_id,
    m.mcu_id,
    TO_JSONB(e) AS employee,
    TO_JSONB(m) AS mcu
FROM public.v_analytics_eligible_current eligible
JOIN public.employees e ON e.employee_id = eligible.employee_id
JOIN public.mcus m ON m.employee_id = e.employee_id
CROSS JOIN public.workflow_analytics_config() config
WHERE m.deleted_at IS NULL
  AND (
      config.workflow_enabled IS FALSE
      OR (
          m.activated_at IS NOT NULL
          AND m.workflow_status IN ('completed', 'followup_required', 'approved_legacy')
      )
  );

CREATE VIEW public.v_mcu_expiry_overview
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
    config.expiry_months
FROM public.employees e
LEFT JOIN public.v_current_reviewed_mcu m ON m.employee_id = e.employee_id
CROSS JOIN public.workflow_analytics_config() config
CROSS JOIN LATERAL (
    SELECT CASE
        WHEN m.mcu_date IS NULL THEN NULL::DATE
        WHEN config.workflow_enabled
            THEN (m.mcu_date + MAKE_INTERVAL(months => config.expiry_months))::DATE
        ELSE (m.mcu_date + INTERVAL '365 days')::DATE
    END AS expiry_date
) expiry
WHERE e.deleted_at IS NULL
  AND e.is_active IS TRUE
  AND (config.workflow_enabled IS FALSE OR e.joining_status = 'joined');

CREATE OR REPLACE FUNCTION public.workflow_preview_expiry_impact(
    p_actor_user_id TEXT,
    p_expiry_months INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_months INTEGER;
    local_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Makassar')::DATE;
    impact JSONB;
BEGIN
    PERFORM public.workflow_require_actor(p_actor_user_id, ARRAY['Admin']);
    IF p_expiry_months < 1 OR p_expiry_months > 120 THEN
        RAISE EXCEPTION 'WF_VALIDATION_FAILED';
    END IF;

    SELECT COALESCE((setting_value #>> '{}')::INTEGER, 18)
    INTO current_months
    FROM public.app_settings
    WHERE setting_key = 'mcu_expiry_months';

    WITH base AS (
        SELECT
            e.employee_id,
            m.mcu_id,
            COALESCE(
                (m.mcu_date + MAKE_INTERVAL(months => current_months))::DATE >= local_today,
                FALSE
            ) AS current_eligible,
            COALESCE(
                (m.mcu_date + MAKE_INTERVAL(months => p_expiry_months))::DATE >= local_today,
                FALSE
            ) AS proposed_eligible
        FROM public.employees e
        LEFT JOIN public.v_current_reviewed_mcu m ON m.employee_id = e.employee_id
        WHERE e.deleted_at IS NULL
          AND e.is_active IS TRUE
          AND e.joining_status = 'joined'
    )
    SELECT JSONB_BUILD_OBJECT(
        'currentMonths', current_months,
        'proposedMonths', p_expiry_months,
        'currentEligible', COUNT(*) FILTER (WHERE current_eligible),
        'proposedEligible', COUNT(*) FILTER (WHERE proposed_eligible),
        'entering', COUNT(*) FILTER (WHERE proposed_eligible AND NOT current_eligible),
        'leaving', COUNT(*) FILTER (WHERE current_eligible AND NOT proposed_eligible),
        'proposedExpired', COUNT(*) FILTER (WHERE mcu_id IS NOT NULL AND NOT proposed_eligible),
        'noMcu', COUNT(*) FILTER (WHERE mcu_id IS NULL)
    )
    INTO impact
    FROM base;

    RETURN impact;
END;
$$;

REVOKE ALL ON FUNCTION public.workflow_preview_expiry_impact(TEXT, INTEGER)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_preview_expiry_impact(TEXT, INTEGER)
TO service_role;

REVOKE ALL ON public.v_current_reviewed_mcu FROM PUBLIC, anon;
REVOKE ALL ON public.v_analytics_eligible_current FROM PUBLIC, anon;
REVOKE ALL ON public.v_reviewed_mcu_history FROM PUBLIC, anon;
REVOKE ALL ON public.v_mcu_expiry_overview FROM PUBLIC, anon;
GRANT SELECT ON public.v_current_reviewed_mcu TO authenticated, service_role;
GRANT SELECT ON public.v_analytics_eligible_current TO authenticated, service_role;
GRANT SELECT ON public.v_reviewed_mcu_history TO authenticated, service_role;
GRANT SELECT ON public.v_mcu_expiry_overview TO authenticated, service_role;

COMMIT;
