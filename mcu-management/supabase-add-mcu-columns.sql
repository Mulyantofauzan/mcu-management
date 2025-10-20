-- ============================================
-- Add Missing Columns to MCU Tables
-- ============================================

-- Add lastUpdatedTimestamp to mcus table
ALTER TABLE mcus
ADD COLUMN IF NOT EXISTS last_updated_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add field_name to mcu_changes (make it nullable since it's optional)
ALTER TABLE mcu_changes
ADD COLUMN IF NOT EXISTS field_name VARCHAR(100);

-- Verify columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('mcus', 'mcu_changes')
ORDER BY table_name, ordinal_position;
