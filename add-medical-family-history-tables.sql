-- Migration: Add Medical History and Family History tracking
-- Date: 2025-01-16
-- Description: Add tables for tracking employee medical history and family disease history

-- 1. Create diseases master data table
CREATE TABLE IF NOT EXISTS diseases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL, -- cardiovascular, metabolic, respiratory, infectious, cancer, other
    icd_10_code VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create medical history table (diseases the employee has/had)
CREATE TABLE IF NOT EXISTS medical_histories (
    id SERIAL PRIMARY KEY,
    mcu_id VARCHAR(50) NOT NULL REFERENCES mcus(mcu_id) ON DELETE CASCADE,
    disease_id INTEGER REFERENCES diseases(id),
    disease_name VARCHAR(255) NOT NULL, -- For custom diseases not in master list
    year_diagnosed INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_mcu_disease UNIQUE(mcu_id, disease_id, disease_name)
);

-- 3. Create family history table (diseases in family members)
CREATE TABLE IF NOT EXISTS family_histories (
    id SERIAL PRIMARY KEY,
    mcu_id VARCHAR(50) NOT NULL REFERENCES mcus(mcu_id) ON DELETE CASCADE,
    disease_id INTEGER REFERENCES diseases(id),
    disease_name VARCHAR(255) NOT NULL, -- For custom diseases not in master list
    family_member VARCHAR(100) NOT NULL, -- Ayah, Ibu, Kakak, Adik, Anak, etc.
    age_at_diagnosis INTEGER,
    status VARCHAR(50) DEFAULT 'current', -- current, deceased
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_medical_histories_mcu_id ON medical_histories(mcu_id);
CREATE INDEX idx_family_histories_mcu_id ON family_histories(mcu_id);
CREATE INDEX idx_diseases_category ON diseases(category);

-- Insert master disease data (15 most common diseases relevant to MCU)
INSERT INTO diseases (name, category, icd_10_code) VALUES
-- Cardiovascular diseases
('Hipertensi', 'cardiovascular', 'I10'),
('Penyakit Jantung Koroner', 'cardiovascular', 'I25.1'),
('Stroke/Serangan Otak', 'cardiovascular', 'I63'),
('Aritmia Jantung', 'cardiovascular', 'I49'),
-- Metabolic diseases
('Diabetes Tipe 1', 'metabolic', 'E10'),
('Diabetes Tipe 2', 'metabolic', 'E11'),
('Hiperkolesterolemia', 'metabolic', 'E78.0'),
-- Respiratory diseases
('Asma', 'respiratory', 'J45'),
('PPOK (Penyakit Paru Obstruktif Kronis)', 'respiratory', 'J44'),
('Tuberkulosis', 'respiratory', 'A15'),
-- Infectious diseases
('Hepatitis B', 'infectious', 'B18.1'),
('Hepatitis C', 'infectious', 'B18.2'),
-- Other diseases
('Kanker', 'cancer', 'C80'),
('Artritis/Radang Sendi', 'other', 'M19'),
('Gangguan Tiroid', 'other', 'E07')
ON CONFLICT (name) DO NOTHING;

-- Verify tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('diseases', 'medical_histories', 'family_histories')
ORDER BY table_name;
