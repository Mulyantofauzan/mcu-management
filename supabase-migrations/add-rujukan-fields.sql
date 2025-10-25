-- Add gender field to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS jenis_kelamin VARCHAR(20) DEFAULT 'Laki-laki';

-- Update existing employees to have default gender
UPDATE employees
SET jenis_kelamin = 'Laki-laki'
WHERE jenis_kelamin IS NULL;

-- Add rujukan-related fields to mcus table
ALTER TABLE mcus
ADD COLUMN IF NOT EXISTS respiratory_rate VARCHAR(50),  -- RR/frequensi nafas (e.g., "20 /m")
ADD COLUMN IF NOT EXISTS pulse VARCHAR(50),              -- Nadi (e.g., "80 /m")
ADD COLUMN IF NOT EXISTS temperature VARCHAR(50),        -- Suhu (e.g., "36.5 °C")
ADD COLUMN IF NOT EXISTS keluhan_utama TEXT,             -- Chief complaint
ADD COLUMN IF NOT EXISTS diagnosis_kerja TEXT,           -- Working diagnosis
ADD COLUMN IF NOT EXISTS alasan_rujuk TEXT;              -- Referral reason

-- Add comments for documentation
COMMENT ON COLUMN employees.jenis_kelamin IS 'Gender of employee (Laki-laki/Perempuan)';
COMMENT ON COLUMN mcus.respiratory_rate IS 'Respiratory rate (RR) - format: "XX /m"';
COMMENT ON COLUMN mcus.pulse IS 'Pulse/Nadi - format: "XX /m"';
COMMENT ON COLUMN mcus.temperature IS 'Body temperature/Suhu - format: "XX °C"';
COMMENT ON COLUMN mcus.keluhan_utama IS 'Chief complaint for referral letter';
COMMENT ON COLUMN mcus.diagnosis_kerja IS 'Working diagnosis for referral letter';
COMMENT ON COLUMN mcus.alasan_rujuk IS 'Reason for referral';
