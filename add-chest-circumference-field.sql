-- Migration: Add chest_circumference field to mcus table
-- Date: 2025-01-16
-- Description: Add Lingkar Dada (chest circumference) measurement to MCU examination results

-- Add column to mcus table if it doesn't exist
ALTER TABLE mcus
ADD COLUMN IF NOT EXISTS chest_circumference NUMERIC(5, 2);

-- Add comment to column
COMMENT ON COLUMN mcus.chest_circumference IS 'Lingkar Dada (Chest Circumference) in cm - Medical Check-Up vital sign measurement';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'mcus' AND column_name = 'chest_circumference';
