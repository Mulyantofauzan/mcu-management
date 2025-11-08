-- ============================================
-- MCU FILES TABLE - File Storage Metadata
-- ============================================
-- This table stores metadata for files uploaded to Supabase Storage
-- Files are physically stored in the 'mcu-documents' bucket

CREATE TABLE IF NOT EXISTS public.mcufiles (
    fileid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) NOT NULL,  -- Reference to employees.employee_id
    mcu_id VARCHAR(50),  -- Reference to mcus.mcu_id (nullable for orphaned files)
    filename TEXT NOT NULL,
    filetype TEXT NOT NULL,
    filesize INTEGER NOT NULL,
    supabase_storage_path TEXT NOT NULL UNIQUE,  -- e.g., "mcu-documents/EMP-20250101-0001/MCU-20250101-0001/2025-11-08-12-34-56-document.pdf"
    uploaded_by VARCHAR(50) NOT NULL,  -- user_id who uploaded
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Foreign key constraints (using DEFERRABLE for flexibility)
    CONSTRAINT fk_mcufiles_employee FOREIGN KEY (employee_id) REFERENCES public.employees(employee_id) ON DELETE CASCADE,
    CONSTRAINT fk_mcufiles_mcu FOREIGN KEY (mcu_id) REFERENCES public.mcus(mcu_id) ON DELETE CASCADE
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_mcufiles_employee_id ON public.mcufiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_mcufiles_mcu_id ON public.mcufiles(mcu_id);
CREATE INDEX IF NOT EXISTS idx_mcufiles_uploaded_at ON public.mcufiles(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcufiles_deleted_at ON public.mcufiles(deleted_at);

-- Trigger for updated_at
CREATE TRIGGER update_mcufiles_updated_at BEFORE UPDATE ON public.mcufiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- NOTES
-- ============================================
-- 1. Files are stored in Supabase Storage bucket 'mcu-documents'
-- 2. Storage path follows pattern: mcu-documents/{employeeId}/{mcuId}/{timestamp}-{filename}
-- 3. Only metadata is stored in this table, not actual file content
-- 4. File compression is applied before upload to maximize storage quota
-- 5. Soft delete is used (deleted_at column) for audit trail
