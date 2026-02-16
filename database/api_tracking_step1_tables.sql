-- API Cost Tracking Schema (Step 1: Tables only)
-- Run this first

-- Table: api_usage_log
CREATE TABLE IF NOT EXISTS api_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_type TEXT NOT NULL CHECK (api_type IN ('claude', 'rentcast')),
  endpoint TEXT NOT NULL,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd DECIMAL(10, 6) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_date ON api_usage_log(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage_log(date DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage_log(timestamp DESC);

-- Table: daily_api_costs
CREATE TABLE IF NOT EXISTS daily_api_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,
  claude_cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,
  rentcast_cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,
  total_calls INTEGER NOT NULL DEFAULT 0,
  claude_calls INTEGER NOT NULL DEFAULT 0,
  rentcast_calls INTEGER NOT NULL DEFAULT 0,
  by_model JSONB DEFAULT '{}',
  by_rentcast_endpoint JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_costs_date ON daily_api_costs(date DESC);

-- Enable RLS
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_api_costs ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins view API logs" ON api_usage_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.is_admin = TRUE));

CREATE POLICY "Service role can insert API logs" ON api_usage_log FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Admins view daily costs" ON daily_api_costs FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.is_admin = TRUE));

CREATE POLICY "Service role can manage daily costs" ON daily_api_costs FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);
