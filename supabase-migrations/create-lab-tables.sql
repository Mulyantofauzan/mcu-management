-- ============================================
-- CREATE LAB_ITEMS TABLE (Data Master Pemeriksaan)
-- ============================================
-- Ini adalah tabel untuk menyimpan jenis-jenis pemeriksaan lab yang tersedia
-- Digunakan di dropdown untuk select pemeriksaan yang akan dilakukan

CREATE TABLE IF NOT EXISTS public.lab_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,  -- Nama pemeriksaan (misal: SGOT, SGPT, Hemoglobin, dll)
    description TEXT,  -- Penjelasan singkat pemeriksaan
    unit VARCHAR(100),  -- Satuan pemeriksaan (misal: IU/L, g/dL, etc)
    min_range_reference NUMERIC(10,2),  -- Rentang rujukan minimal (normal range lower bound)
    max_range_reference NUMERIC(10,2),  -- Rentang rujukan maksimal (normal range upper bound)
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes untuk lab_items
CREATE INDEX IF NOT EXISTS idx_lab_items_name ON public.lab_items(name);
CREATE INDEX IF NOT EXISTS idx_lab_items_is_active ON public.lab_items(is_active);
CREATE INDEX IF NOT EXISTS idx_lab_items_deleted_at ON public.lab_items(deleted_at);

-- ============================================
-- CREATE PEMERIKSAAN_LAB TABLE (Hasil Pemeriksaan)
-- ============================================
-- Ini adalah tabel untuk menyimpan hasil pemeriksaan lab untuk setiap MCU
-- Satu MCU bisa punya banyak hasil pemeriksaan (one-to-many relationship)

CREATE TABLE IF NOT EXISTS public.pemeriksaan_lab (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mcu_id VARCHAR(50) NOT NULL REFERENCES public.mcus(mcu_id) ON DELETE CASCADE,
    employee_id VARCHAR(50) NOT NULL REFERENCES public.employees(employee_id) ON DELETE CASCADE,
    lab_item_id INTEGER NOT NULL REFERENCES public.lab_items(id) ON DELETE RESTRICT,

    -- Hasil pemeriksaan
    value NUMERIC(10,2) NOT NULL,  -- Nilai hasil pemeriksaan
    unit VARCHAR(100),  -- Satuan (auto-filled dari lab_items.unit)
    min_range_reference NUMERIC(10,2),  -- Batas bawah normal (from lab_items)
    max_range_reference NUMERIC(10,2),  -- Batas atas normal (from lab_items)
    notes TEXT,  -- Catatan pemeriksaan (misal: "normal", "high", "low", dll)

    -- Metadata
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

-- Indexes untuk pemeriksaan_lab
CREATE INDEX IF NOT EXISTS idx_pemeriksaan_lab_mcu_id ON public.pemeriksaan_lab(mcu_id);
CREATE INDEX IF NOT EXISTS idx_pemeriksaan_lab_employee_id ON public.pemeriksaan_lab(employee_id);
CREATE INDEX IF NOT EXISTS idx_pemeriksaan_lab_lab_item_id ON public.pemeriksaan_lab(lab_item_id);
CREATE INDEX IF NOT EXISTS idx_pemeriksaan_lab_deleted_at ON public.pemeriksaan_lab(deleted_at);

-- ============================================
-- REMOVE SGOT, SGPT, CBC FROM MCUS TABLE
-- ============================================
-- Kolom-kolom ini sudah dipindah ke pemeriksaan_lab table
ALTER TABLE IF EXISTS public.mcus
DROP COLUMN IF EXISTS sgot,
DROP COLUMN IF EXISTS sgpt,
DROP COLUMN IF EXISTS cbc;

-- ============================================
-- SEED DATA UNTUK LAB_ITEMS (Optional - untuk testing)
-- ============================================
-- Insert beberapa item pemeriksaan standar
INSERT INTO public.lab_items (name, description, unit, min_range_reference, max_range_reference)
VALUES
    ('SGOT', 'Serum Glutamic-Oxaloacetic Transaminase - pemeriksaan fungsi hati', 'IU/L', 0, 40),
    ('SGPT', 'Serum Glutamic-Pyruvic Transaminase - pemeriksaan fungsi hati', 'IU/L', 0, 44),
    ('Hemoglobin', 'Kadar hemoglobin dalam darah', 'g/dL', 12, 16),
    ('Hematocrit', 'Persentase sel darah merah', '%', 36, 46),
    ('Leukosit', 'Jumlah sel darah putih', '10^3/μL', 4.5, 11),
    ('Trombosit', 'Jumlah trombosit', '10^3/μL', 150, 400),
    ('Glukosa Puasa', 'Kadar gula darah puasa', 'mg/dL', 70, 100),
    ('Kolesterol Total', 'Kadar kolesterol total', 'mg/dL', 0, 200),
    ('Trigliserida', 'Kadar trigliserida', 'mg/dL', 0, 150),
    ('HDL', 'Kolesterol HDL (baik)', 'mg/dL', 40, 999),
    ('LDL', 'Kolesterol LDL (jahat)', 'mg/dL', 0, 100),
    ('Ureum', 'Kadar ureum dalam darah', 'mg/dL', 10, 50),
    ('Kreatinin', 'Kadar kreatinin dalam darah', 'mg/dL', 0.6, 1.2),
    ('Bilirubin Total', 'Kadar bilirubin total', 'mg/dL', 0.1, 1.2),
    ('Bilirubin Direk', 'Kadar bilirubin direk', 'mg/dL', 0, 0.3)
ON CONFLICT (name) DO NOTHING;
