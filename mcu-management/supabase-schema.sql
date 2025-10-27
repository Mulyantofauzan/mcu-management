-- ============================================
-- MCU Management System - Supabase Schema
-- ============================================
-- Run this SQL in Supabase SQL Editor to create all tables
-- Dashboard: https://app.supabase.com/project/YOUR_PROJECT/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(50) UNIQUE NOT NULL, -- Custom ID format: USR-YYYYMMDD-XXXX
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Petugas')),
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============================================
-- 2. JOB TITLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS job_titles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. DEPARTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. VENDORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. EMPLOYEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) UNIQUE NOT NULL, -- Custom ID: EMP-YYYYMMDD-XXXX
    name VARCHAR(200) NOT NULL,
    job_title VARCHAR(200) NOT NULL,
    department VARCHAR(200) NOT NULL,
    date_of_birth DATE NOT NULL,
    blood_type VARCHAR(10) CHECK (blood_type IN ('A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    jenis_kelamin VARCHAR(20) DEFAULT 'Laki-laki',
    employee_type VARCHAR(50) NOT NULL CHECK (employee_type IN ('Karyawan PST', 'Vendor')),
    vendor_name VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    inactive_reason TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for employees
CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON employees(deleted_at);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);

-- ============================================
-- 6. MCUs TABLE (Medical Check-Up Records)
-- ============================================
CREATE TABLE IF NOT EXISTS mcus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mcu_id VARCHAR(50) UNIQUE NOT NULL, -- Custom ID: MCU-YYYYMMDD-XXXX
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    mcu_type VARCHAR(100) NOT NULL CHECK (mcu_type IN ('Pre-Employee', 'Annual', 'Khusus', 'Final')),
    mcu_date DATE NOT NULL,

    -- Examination results
    bmi DECIMAL(5,2),
    blood_pressure VARCHAR(20),
    vision VARCHAR(50),
    audiometry VARCHAR(100),
    spirometry VARCHAR(100),
    hbsag VARCHAR(50) CHECK (hbsag IN ('', 'Negatif', 'Positif', 'Reaktif')),
    sgot VARCHAR(50),
    sgpt VARCHAR(50),
    cbc VARCHAR(100),
    xray TEXT,
    ekg TEXT,
    treadmill TEXT,
    kidney_liver_function TEXT,
    napza VARCHAR(100),

    -- Initial result
    initial_result VARCHAR(50) CHECK (initial_result IN ('Fit', 'Fit With Note', 'Temporary Unfit', 'Follow-Up', 'Unfit')),
    initial_notes TEXT,

    -- Final result (after follow-up)
    final_result VARCHAR(50) CHECK (final_result IN ('Fit', 'Fit With Note', 'Temporary Unfit', 'Follow-Up', 'Unfit')),
    final_notes TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'Fit' CHECK (status IN ('Fit', 'Fit With Note', 'Temporary Unfit', 'Follow-Up', 'Unfit')),

    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

-- Indexes for MCUs
CREATE INDEX IF NOT EXISTS idx_mcus_employee_id ON mcus(employee_id);
CREATE INDEX IF NOT EXISTS idx_mcus_mcu_date ON mcus(mcu_date DESC);
CREATE INDEX IF NOT EXISTS idx_mcus_deleted_at ON mcus(deleted_at);
CREATE INDEX IF NOT EXISTS idx_mcus_initial_result ON mcus(initial_result);
CREATE INDEX IF NOT EXISTS idx_mcus_final_result ON mcus(final_result);
CREATE INDEX IF NOT EXISTS idx_mcus_status ON mcus(status);
CREATE INDEX IF NOT EXISTS idx_mcus_created_by ON mcus(created_by);

-- ============================================
-- 7. MCU CHANGES TABLE (Change History)
-- ============================================
CREATE TABLE IF NOT EXISTS mcu_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mcu_id VARCHAR(50) NOT NULL REFERENCES mcus(mcu_id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by VARCHAR(50) -- user_id of who made the change
);

-- Index for MCU changes
CREATE INDEX IF NOT EXISTS idx_mcu_changes_mcu_id ON mcu_changes(mcu_id);
CREATE INDEX IF NOT EXISTS idx_mcu_changes_changed_at ON mcu_changes(changed_at DESC);

-- ============================================
-- 8. ACTIVITY LOG TABLE (AUDIT TRAIL - IMMUTABLE)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(50),
    user_name VARCHAR(200),
    action VARCHAR(100) NOT NULL,
    target VARCHAR(200),
    target_id VARCHAR(100),
    details TEXT,

    -- Audit compliance fields
    ip_address VARCHAR(45), -- supports both IPv4 and IPv6
    user_agent TEXT,
    old_value TEXT, -- for change tracking: previous value
    new_value TEXT, -- for change tracking: new value
    change_field VARCHAR(100), -- which field was changed

    -- Immutability & integrity
    is_immutable BOOLEAN DEFAULT true, -- write-once, cannot be deleted
    hash_value TEXT, -- SHA256 hash for integrity verification
    archived BOOLEAN DEFAULT false,
    archive_date TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_target ON activity_log(target, target_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_ip ON activity_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_activity_log_archived ON activity_log(archived);

-- Audit log retention table (for deleted/archived records)
CREATE TABLE IF NOT EXISTS audit_log_archive (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_activity_id UUID NOT NULL,
    archive_reason VARCHAR(200), -- 'retention_policy', 'manual_archive', etc
    archived_data JSONB NOT NULL, -- full snapshot of activity_log record
    archived_by VARCHAR(50), -- user_id who archived
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    retention_until TIMESTAMP WITH TIME ZONE -- when it will be permanently deleted
);

CREATE INDEX IF NOT EXISTS idx_audit_archive_date ON audit_log_archive(archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_archive_retention ON audit_log_archive(retention_until);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mcus_updated_at BEFORE UPDATE ON mcus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Optional
-- ============================================
-- Uncomment if you want to enable RLS for multi-tenant security

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE mcus ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (adjust as needed):
-- CREATE POLICY "Users can view all employees"
--     ON employees FOR SELECT
--     USING (true);

-- ============================================
-- SEED DATA (Optional)
-- ============================================
-- Insert default admin user (password: admin123)
-- Note: In production, use proper password hashing (bcrypt)
INSERT INTO users (user_id, username, password_hash, display_name, role)
VALUES
    ('USR-20250101-0001', 'admin', 'YWRtaW4xMjM=', 'Administrator', 'Admin'),
    ('USR-20250101-0002', 'petugas', 'cGV0dWdhczEyMw==', 'Petugas MCU', 'Petugas')
ON CONFLICT (username) DO NOTHING;

-- Insert default master data
INSERT INTO departments (name) VALUES
    ('IT'), ('HR'), ('Finance'), ('Operations'), ('Sales')
ON CONFLICT (name) DO NOTHING;

INSERT INTO job_titles (name) VALUES
    ('Manager'), ('Staff'), ('Supervisor'), ('Director'), ('Coordinator')
ON CONFLICT (name) DO NOTHING;

INSERT INTO vendors (name) VALUES
    ('PT Vendor A'), ('PT Vendor B'), ('PT Vendor C')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify tables were created:

-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT * FROM users;
-- SELECT * FROM departments;
-- SELECT * FROM job_titles;
-- SELECT * FROM vendors;
