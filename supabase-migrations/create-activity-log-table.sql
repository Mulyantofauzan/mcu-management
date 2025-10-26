-- Create activity_log table for tracking user activities
CREATE TABLE IF NOT EXISTS activity_log (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT,
    user_name VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    target VARCHAR(100),
    details TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_target ON activity_log(target);

-- Add comments for documentation
COMMENT ON TABLE activity_log IS 'Activity log for tracking user actions on entities';
COMMENT ON COLUMN activity_log.user_id IS 'User ID who performed the action';
COMMENT ON COLUMN activity_log.user_name IS 'User display name at the time of action';
COMMENT ON COLUMN activity_log.action IS 'Type of action (create, update, delete)';
COMMENT ON COLUMN activity_log.target IS 'Entity type (Employee, MCU, User, etc)';
COMMENT ON COLUMN activity_log.details IS 'Entity ID or additional details';
COMMENT ON COLUMN activity_log.timestamp IS 'When the action was performed';
