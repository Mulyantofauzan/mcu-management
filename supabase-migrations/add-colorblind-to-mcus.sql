-- ============================================
-- ADD COLORBLIND FIELD TO MCUS TABLE
-- ============================================
-- Kolom untuk menyimpan hasil pemeriksaan buta warna
-- Format: "Normal", "Merah-Hijau", dll

ALTER TABLE IF EXISTS public.mcus
ADD COLUMN IF NOT EXISTS colorblind VARCHAR(255);

-- Create index untuk faster lookups
CREATE INDEX IF NOT EXISTS idx_mcus_colorblind ON public.mcus(colorblind);
