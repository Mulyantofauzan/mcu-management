-- Add 'active' column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Update existing users to be active
UPDATE users SET active = TRUE WHERE active IS NULL;

-- Verify
SELECT user_id, username, active FROM users;
