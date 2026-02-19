-- Admin settings table for persisting configuration changes
-- This table stores admin-configurable settings like tier limits that need to survive server restarts

CREATE TABLE IF NOT EXISTS admin_settings (
  id TEXT PRIMARY KEY,
  tier_limits JSONB NOT NULL DEFAULT '{
    "free": {"analysesPerDay": 3, "claudeCallsPerHour": 15},
    "pro": {"analysesPerDay": 50, "claudeCallsPerHour": 100}
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (only admins can read/write)
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do anything
CREATE POLICY admin_settings_admin_policy ON admin_settings
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM user_profiles WHERE is_admin = true
    )
  );

-- Policy: Non-admins cannot access
CREATE POLICY admin_settings_deny_policy ON admin_settings
  FOR ALL
  USING (false);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_settings_timestamp
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_settings_timestamp();

-- Insert default admin settings
INSERT INTO admin_settings (id, tier_limits)
VALUES (
  'tier_limits',
  '{
    "free": {"analysesPerDay": 3, "claudeCallsPerHour": 15},
    "pro": {"analysesPerDay": 50, "claudeCallsPerHour": 100}
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
