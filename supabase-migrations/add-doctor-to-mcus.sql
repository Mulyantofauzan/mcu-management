-- Add doctor field to MCUs table for referral data
ALTER TABLE IF EXISTS public.mcus
ADD COLUMN IF NOT EXISTS doctor TEXT REFERENCES public.doctors(id) ON DELETE SET NULL;

-- Create index on doctor field for faster lookups
CREATE INDEX IF NOT EXISTS idx_mcus_doctor ON public.mcus(doctor);
