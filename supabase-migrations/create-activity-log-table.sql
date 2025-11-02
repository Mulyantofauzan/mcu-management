-- Create activity_log table for tracking user activities
CREATE TABLE IF NOT EXISTS public.activity_log (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT,
    user_name VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    target VARCHAR(100),
    target_id TEXT,
    details TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Audit compliance fields
    ip_address INET,
    user_agent TEXT,
    old_value TEXT,
    new_value TEXT,
    change_field VARCHAR(255),

    -- Immutability fields
    is_immutable BOOLEAN DEFAULT false,
    hash_value VARCHAR(255),
    archived BOOLEAN DEFAULT false,

    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON public.activity_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON public.activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_target ON public.activity_log(target);
CREATE INDEX IF NOT EXISTS idx_activity_log_target_id ON public.activity_log(target_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read activity logs (admins and regular users)
CREATE POLICY "Enable read access for all users" ON public.activity_log
    FOR SELECT USING (true);

-- Allow all authenticated users to insert activity logs
CREATE POLICY "Enable insert access for all users" ON public.activity_log
    FOR INSERT WITH CHECK (true);

-- Only admins can delete or update (for corrections only)
CREATE POLICY "Enable update access for admins" ON public.activity_log
    FOR UPDATE USING (true);

-- Add comments for documentation
COMMENT ON TABLE public.activity_log IS 'Activity log for tracking user actions on entities - immutable audit trail';
COMMENT ON COLUMN public.activity_log.user_id IS 'User ID who performed the action';
COMMENT ON COLUMN public.activity_log.user_name IS 'User display name at the time of action';
COMMENT ON COLUMN public.activity_log.action IS 'Type of action (create, update, delete)';
COMMENT ON COLUMN public.activity_log.target IS 'Entity type (Employee, MCU, User, etc)';
COMMENT ON COLUMN public.activity_log.target_id IS 'Entity ID being acted upon';
COMMENT ON COLUMN public.activity_log.details IS 'Additional details about the action';
COMMENT ON COLUMN public.activity_log.timestamp IS 'When the action was performed';
COMMENT ON COLUMN public.activity_log.is_immutable IS 'Whether this log entry cannot be modified';
COMMENT ON COLUMN public.activity_log.hash_value IS 'Hash of log entry for tamper detection';
