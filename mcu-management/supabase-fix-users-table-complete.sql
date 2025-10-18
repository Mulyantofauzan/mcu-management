-- ============================================
-- COMPLETE FIX: Add ALL missing columns to users table
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- Add 'active' column (if not exists)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Add 'last_login' column (if not exists)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Update existing users
UPDATE users 
SET active = TRUE 
WHERE active IS NULL;

-- Re-insert seed users with correct data (will skip if already exist due to CONFLICT)
INSERT INTO users (user_id, username, password_hash, display_name, role, active)
VALUES
    ('USR-20250101-0001', 'admin', 'YWRtaW4xMjM=', 'Administrator', 'Admin', TRUE),
    ('USR-20250101-0002', 'petugas', 'cGV0dWdhczEyMw==', 'Petugas MCU', 'Petugas', TRUE)
ON CONFLICT (username) 
DO UPDATE SET 
    active = EXCLUDED.active,
    role = EXCLUDED.role;

-- Verify all columns exist and data is correct
SELECT 
    user_id, 
    username, 
    password_hash,
    display_name,
    role,
    active,
    last_login,
    created_at,
    updated_at
FROM users
ORDER BY created_at;

-- ============================================
-- DONE! Users table should now be complete
-- ============================================
