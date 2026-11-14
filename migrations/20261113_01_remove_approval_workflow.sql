-- Hapus sistem review/approval MCU. Jalankan SEBELUM deploy aplikasi baru.
--
-- Cek dulu (tidak mengubah apa pun), simpan hasilnya:
--   SELECT mcu_id, employee_id, mcu_date FROM public.mcus WHERE mcu_type = 'Surat Sehat';
--   SELECT workflow_status, COUNT(*) FROM public.mcus WHERE deleted_at IS NULL GROUP BY 1;
--   SELECT username, role FROM public.users WHERE role = 'Dokter';
--
-- Tabel, kolom, dan fungsi workflow lain sengaja tidak dihapus (data histori aman).

BEGIN;

-- 1. Flag off lebih dulu. Trigger penjaga dan trigger default membaca flag ini.
UPDATE public.app_settings
SET setting_value = 'false'::jsonb,
    version = version + 1,
    updated_at = NOW()
WHERE setting_key = 'mcu_approval_workflow_enabled';

-- 2. MCU yang masih mengantri menjadi aktif. Hasil medis yang kosong dibiarkan
--    kosong untuk diisi lewat Edit.
UPDATE public.mcus
SET workflow_status = 'approved_legacy',
    claimed_by = NULL,
    claimed_at = NULL,
    claim_expires_at = NULL,
    activated_at = COALESCE(activated_at, updated_at, created_at, NOW())
WHERE workflow_status IS DISTINCT FROM 'approved_legacy';

-- 3. Karyawan kandidat menjadi bergabung.
UPDATE public.employees
SET joining_status = 'joined'
WHERE joining_status IS DISTINCT FROM 'joined';

-- 4. Surat Sehat dibuang.
UPDATE public.mcus
SET mcu_type = 'Annual'
WHERE mcu_type = 'Surat Sehat';

DROP TRIGGER IF EXISTS zzz_validate_health_certificate_history ON public.mcus;
DROP FUNCTION IF EXISTS public.workflow_validate_health_certificate_history();

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
    CHECK (mcu_type IN ('Pre-Employee', 'Annual', 'Khusus', 'Final'))
    NOT VALID;

ALTER TABLE public.mcus VALIDATE CONSTRAINT mcus_mcu_type_check;

-- 5. View analitik kembali ke definisi 20260802_07 (masa berlaku tetap 365 hari
--    saat flag off), tanpa fungsi validitas per tipe dokumen.
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
    (m.mcu_date + INTERVAL '365 days')::DATE AS expiry_date,
    12 AS expiry_months
FROM public.employees e
JOIN public.v_current_reviewed_mcu m ON m.employee_id = e.employee_id
CROSS JOIN public.workflow_analytics_config() config
WHERE e.deleted_at IS NULL
  AND e.is_active IS TRUE;

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
WHERE m.deleted_at IS NULL;

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
    12 AS expiry_months
FROM public.employees e
LEFT JOIN public.v_current_reviewed_mcu m ON m.employee_id = e.employee_id
CROSS JOIN public.workflow_analytics_config() config
CROSS JOIN LATERAL (
    SELECT CASE
        WHEN m.mcu_date IS NULL THEN NULL::DATE
        ELSE (m.mcu_date + INTERVAL '365 days')::DATE
    END AS expiry_date
) expiry
WHERE e.deleted_at IS NULL
  AND e.is_active IS TRUE;

REVOKE ALL ON public.v_current_reviewed_mcu FROM PUBLIC, anon;
REVOKE ALL ON public.v_analytics_eligible_current FROM PUBLIC, anon;
REVOKE ALL ON public.v_reviewed_mcu_history FROM PUBLIC, anon;
REVOKE ALL ON public.v_mcu_expiry_overview FROM PUBLIC, anon;
GRANT SELECT ON public.v_current_reviewed_mcu TO authenticated, service_role;
GRANT SELECT ON public.v_analytics_eligible_current TO authenticated, service_role;
GRANT SELECT ON public.v_reviewed_mcu_history TO authenticated, service_role;
GRANT SELECT ON public.v_mcu_expiry_overview TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.workflow_mcu_validity_months(TEXT);

-- 6. Akun Dokter dinonaktifkan (tidak dihapus agar histori reviewer utuh).
UPDATE public.users
SET active = false
WHERE role = 'Dokter';

COMMIT;
