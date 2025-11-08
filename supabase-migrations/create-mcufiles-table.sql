-- ============================================
-- MCU FILES TABLE - File Storage Metadata
-- ============================================
-- NOTE: This table already exists in your database
-- This migration is for reference/documentation only
-- The table schema matches the camelCase naming convention used in your database

-- Table already exists with this structure:
-- CREATE TABLE public.mcufiles (
--   fileid text NOT NULL DEFAULT gen_random_uuid(),
--   employeeid text NOT NULL,
--   mcuid text,
--   filename text NOT NULL,
--   filetype text NOT NULL,
--   filesize integer NOT NULL,
--   supabase_storage_path text NOT NULL,
--   uploadedby text NOT NULL,
--   uploadedat timestamp with time zone DEFAULT now(),
--   deletedat timestamp with time zone,
--   createdat timestamp with time zone DEFAULT now(),
--   updatedat timestamp with time zone DEFAULT now(),
--   CONSTRAINT mcufiles_pkey PRIMARY KEY (fileid)
-- );

-- If you need to recreate the table, uncomment the CREATE TABLE statement below:
-- CREATE TABLE IF NOT EXISTS public.mcufiles (
--     fileid TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
--     employeeid TEXT NOT NULL,
--     mcuid TEXT,
--     filename TEXT NOT NULL,
--     filetype TEXT NOT NULL,
--     filesize INTEGER NOT NULL,
--     supabase_storage_path TEXT NOT NULL UNIQUE,
--     uploadedby TEXT NOT NULL,
--     uploadedat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     deletedat TIMESTAMP WITH TIME ZONE,
--     createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_mcufiles_employeeid ON public.mcufiles(employeeid);
CREATE INDEX IF NOT EXISTS idx_mcufiles_mcuid ON public.mcufiles(mcuid);
CREATE INDEX IF NOT EXISTS idx_mcufiles_uploadedat ON public.mcufiles(uploadedat DESC);
CREATE INDEX IF NOT EXISTS idx_mcufiles_deletedat ON public.mcufiles(deletedat);

-- ============================================
-- NOTES
-- ============================================
-- 1. Files are stored in Supabase Storage bucket 'mcu-documents'
-- 2. Storage path follows pattern: mcu-documents/{employeeId}/{mcuId}/{timestamp}-{filename}
-- 3. Only metadata is stored in this table, not actual file content
-- 4. File compression is applied before upload to maximize storage quota
-- 5. Soft delete is used (deleted_at column) for audit trail
-- 6. Trigger for updated_at will be added after verifying function exists
