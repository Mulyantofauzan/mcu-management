-- ============================================
-- Add Missing Columns to MCU & Employee Tables
-- ============================================

-- Add lastUpdatedTimestamp to mcus table
ALTER TABLE mcus
ADD COLUMN IF NOT EXISTS last_updated_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add field_name to mcu_changes (make it nullable since it's optional)
ALTER TABLE mcu_changes
ADD COLUMN IF NOT EXISTS field_name VARCHAR(100);

-- Add inactive_reason to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS inactive_reason TEXT;

-- Verify columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('mcus', 'mcu_changes', 'employees')
ORDER BY table_name, ordinal_position;
