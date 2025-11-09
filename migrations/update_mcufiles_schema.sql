-- Migration: Update mcufiles table for Google Drive primary storage
-- Description: Remove Supabase storage path column, add Google Drive fields as primary

-- 1. Add new columns for Google Drive if they don't exist
ALTER TABLE public.mcufiles
ADD COLUMN IF NOT EXISTS google_drive_file_id TEXT,
ADD COLUMN IF NOT EXISTS google_drive_link TEXT,
ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT;

-- 2. Remove old Supabase-specific column if it exists
-- (Keeping it for backward compatibility, but it won't be used)
-- ALTER TABLE public.mcufiles DROP COLUMN IF EXISTS supabase_storage_path;

-- 3. Update table comment
COMMENT ON TABLE public.mcufiles IS 'MCU file records - files stored in Google Drive, links/metadata stored here';

-- 4. Add column comments
COMMENT ON COLUMN public.mcufiles.google_drive_file_id IS 'Google Drive file ID for direct access';
COMMENT ON COLUMN public.mcufiles.google_drive_link IS 'Google Drive web view link for opening in browser';
COMMENT ON COLUMN public.mcufiles.google_drive_folder_id IS 'Google Drive folder ID (per-employee folder)';
COMMENT ON COLUMN public.mcufiles.supabase_storage_path IS '[DEPRECATED] No longer used - files stored in Google Drive only';

-- 5. Verify the updated table structure
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'mcufiles'
ORDER BY ordinal_position;
