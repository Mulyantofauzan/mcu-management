-- Add doctor field to MCUs table for referral data (storing doctor NAME, not ID)
ALTER TABLE IF EXISTS public.mcus
ADD COLUMN IF NOT EXISTS doctor VARCHAR(255);

-- Create index on doctor field for faster lookups
CREATE INDEX IF NOT EXISTS idx_mcus_doctor ON public.mcus(doctor);
