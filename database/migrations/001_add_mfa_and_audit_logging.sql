/**
 * Database Migration: Add MFA Support & Audit Logging
 *
 * This migration adds:
 * 1. MFA columns to users table
 * 2. audit_logs table for activity logging
 * 3. mfa_audit_log table for MFA-specific events
 * 4. Indexes for query performance
 *
 * To apply:
 * psql -d mcu_management -f migrations/001_add_mfa_and_audit_logging.sql
 */

-- ============================================================================
-- Add MFA columns to users table
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_failed_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_lockout_until TIMESTAMP;

-- Add comment documenting MFA columns
COMMENT ON COLUMN users.mfa_enabled IS 'Whether 2FA is enabled for user';
COMMENT ON COLUMN users.mfa_secret IS 'Encrypted TOTP secret (base32)';
COMMENT ON COLUMN users.mfa_backup_codes IS 'Array of hashed backup codes for recovery';
COMMENT ON COLUMN users.mfa_enabled_at IS 'Timestamp when 2FA was enabled';
COMMENT ON COLUMN users.mfa_failed_attempts IS 'Failed MFA verification attempts';
COMMENT ON COLUMN users.mfa_lockout_until IS 'Account locked until this timestamp';

-- ============================================================================
-- Create audit_logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timestamp
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- User information
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  user_role VARCHAR(50),

  -- Event information
  event_type VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  result VARCHAR(20) CHECK (result IN ('SUCCESS', 'FAILED', 'DENIED')),
  severity VARCHAR(20) CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),

  -- Request context
  ip_address INET,
  user_agent TEXT,

  -- Event details (flexible storage)
  details JSONB,

  -- Metadata
  recorded_at TIMESTAMP DEFAULT NOW(),

  -- Indexes for performance
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_result ON audit_logs(result);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time ON audit_logs(user_id, timestamp DESC);

-- Add table comment
COMMENT ON TABLE audit_logs IS 'Audit trail of all user actions - required for HIPAA and UU PDP compliance';
COMMENT ON COLUMN audit_logs.timestamp IS 'When action occurred';
COMMENT ON COLUMN audit_logs.event_type IS 'Type of action (LOGIN_SUCCESS, VIEW_PATIENT, etc)';
COMMENT ON COLUMN audit_logs.result IS 'Whether action succeeded, failed, or was denied';
COMMENT ON COLUMN audit_logs.severity IS 'Importance level of event';
COMMENT ON COLUMN audit_logs.details IS 'Additional context as JSON';

-- ============================================================================
-- Create MFA audit log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS mfa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and event
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,

  -- Event details
  details JSONB,

  -- Timestamp
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT mfa_audit_log_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_user_id ON mfa_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_event_type ON mfa_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_created_at ON mfa_audit_log(created_at DESC);

COMMENT ON TABLE mfa_audit_log IS 'Audit trail of MFA-specific events (setup, verification, disablement)';

-- ============================================================================
-- Enable Row Level Security (RLS) for audit tables
-- ============================================================================

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own audit logs
CREATE POLICY IF NOT EXISTS "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );

-- Policy: Only system can insert audit logs
CREATE POLICY IF NOT EXISTS "Only system can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Policy: Audit logs are immutable (no updates/deletes)
CREATE POLICY IF NOT EXISTS "Audit logs are immutable"
  ON audit_logs FOR UPDATE
  USING (false);

-- Enable RLS on mfa_audit_log
ALTER TABLE mfa_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own MFA audit logs
CREATE POLICY IF NOT EXISTS "Users can view their own MFA audit logs"
  ON mfa_audit_log FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );

-- Policy: Only system can insert MFA audit logs
CREATE POLICY IF NOT EXISTS "Only system can insert MFA audit logs"
  ON mfa_audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- Backup: Create views for easy audit reporting
-- ============================================================================

-- View: Recent login attempts (last 24 hours)
CREATE OR REPLACE VIEW recent_login_attempts AS
SELECT
  user_name,
  event_type,
  result,
  timestamp,
  ip_address
FROM audit_logs
WHERE event_type IN ('LOGIN_SUCCESS', 'LOGIN_FAILED')
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

COMMENT ON VIEW recent_login_attempts IS 'Recent login attempts for security monitoring';

-- View: Patient data access audit
CREATE OR REPLACE VIEW patient_data_access_audit AS
SELECT
  timestamp,
  user_name,
  user_role,
  event_type,
  details->>'patient_id' AS patient_id,
  ip_address,
  result
FROM audit_logs
WHERE event_type IN (
  'VIEW_PATIENT_RECORD',
  'CREATE_PATIENT',
  'UPDATE_PATIENT',
  'DELETE_PATIENT'
)
ORDER BY timestamp DESC;

COMMENT ON VIEW patient_data_access_audit IS 'All patient data access for HIPAA audit trail';

-- View: Unauthorized access attempts
CREATE OR REPLACE VIEW unauthorized_access_attempts AS
SELECT
  timestamp,
  user_name,
  event_type,
  resource_type,
  resource_id,
  ip_address,
  details
FROM audit_logs
WHERE event_type IN (
  'PERMISSION_DENIED',
  'UNAUTHORIZED_ACCESS'
)
ORDER BY timestamp DESC;

COMMENT ON VIEW unauthorized_access_attempts IS 'Unauthorized access attempts for security analysis';

-- ============================================================================
-- Archival strategy (optional)
-- ============================================================================

-- Create archival table for old audit logs (optional, for large databases)
-- This can be used to keep active table smaller while retaining historical data

CREATE TABLE IF NOT EXISTS audit_logs_archive (
  LIKE audit_logs
) PARTITION BY RANGE (timestamp);

-- Partition by month (example for 2025)
CREATE TABLE IF NOT EXISTS audit_logs_archive_202501 PARTITION OF audit_logs_archive
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS audit_logs_archive_202502 PARTITION OF audit_logs_archive
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- ============================================================================
-- End of migration
-- ============================================================================

-- Verify migration success
SELECT
  'MFA columns added to users table' as status,
  COUNT(*) as audit_log_rows
FROM audit_logs;

SELECT
  'MFA audit log table created' as status,
  COUNT(*) as mfa_audit_log_rows
FROM mfa_audit_log;
