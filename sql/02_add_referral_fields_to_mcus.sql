-- Add referral-related fields to mcus table
-- These fields store referral information (optional)

ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS recipient VARCHAR(255),
ADD COLUMN IF NOT EXISTS keluhan_utama TEXT,
ADD COLUMN IF NOT EXISTS diagnosis_kerja TEXT,
ADD COLUMN IF NOT EXISTS alasan_rujuk TEXT;

-- Add comment to columns for clarity
COMMENT ON COLUMN public.mcus.recipient IS 'Kepada Yth (Penerima Rujukan) - Optional field for referral recipient';
COMMENT ON COLUMN public.mcus.keluhan_utama IS 'Keluhan Utama - Main complaint of the patient';
COMMENT ON COLUMN public.mcus.diagnosis_kerja IS 'Diagnosis Kerja - Working diagnosis';
COMMENT ON COLUMN public.mcus.alasan_rujuk IS 'Alasan Dirujuk - Reason for referral';
