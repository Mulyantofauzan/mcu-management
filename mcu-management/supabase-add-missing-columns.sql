-- ============================================
-- Add Missing Columns to Existing Supabase Tables
-- ============================================
-- Run this if you already created tables with old schema
-- This adds columns that were missing

-- Add 'active' column to users (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'active'
    ) THEN
        ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT true;
        UPDATE users SET active = true WHERE active IS NULL;
        RAISE NOTICE 'Added active column to users table';
    ELSE
        RAISE NOTICE 'active column already exists';
    END IF;
END $$;

-- Add 'last_login' column to users (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_login'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_login column to users table';
    ELSE
        RAISE NOTICE 'last_login column already exists';
    END IF;
END $$;

-- Verify columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
