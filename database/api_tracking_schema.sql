-- API Cost Tracking Schema
-- Persistent storage for API usage, costs, and history

-- Table: api_usage_log
-- Stores every API call for historical tracking
CREATE TABLE IF NOT EXISTS api_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_type TEXT NOT NULL CHECK (api_type IN ('claude', 'rentcast')),
  endpoint TEXT NOT NULL,
  
  -- Claude-specific fields
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  
  -- Cost tracking
  cost_usd DECIMAL(10, 6) NOT NULL,
  
  -- Metadata
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Indexes for fast queries
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast queries by user and date
CREATE INDEX IF NOT EXISTS idx_api_usage_user_date ON api_usage_log(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage_log(date DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage_log(timestamp DESC);

-- Table: daily_api_costs
-- Aggregated daily costs for fast dashboard queries
CREATE TABLE IF NOT EXISTS daily_api_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  
  -- Total costs
  total_cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,
  claude_cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,
  rentcast_cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,
  
  -- Total calls
  total_calls INTEGER NOT NULL DEFAULT 0,
  claude_calls INTEGER NOT NULL DEFAULT 0,
  rentcast_calls INTEGER NOT NULL DEFAULT 0,
  
  -- Model breakdown (JSON)
  by_model JSONB DEFAULT '{}',
  by_rentcast_endpoint JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_costs_date ON daily_api_costs(date DESC);

-- Function: increment_daily_cost
-- Atomically increment daily cost aggregates
CREATE OR REPLACE FUNCTION increment_daily_cost(
  p_date DATE,
  p_api_type TEXT,
  p_cost DECIMAL,
  p_model TEXT DEFAULT NULL,
  p_endpoint TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO daily_api_costs (date, total_cost_usd, claude_cost_usd, rentcast_cost_usd, total_calls, claude_calls, rentcast_calls)
  VALUES (p_date, p_cost, 
          CASE WHEN p_api_type = 'claude' THEN p_cost ELSE 0 END,
          CASE WHEN p_api_type = 'rentcast' THEN p_cost ELSE 0 END,
          1,
          CASE WHEN p_api_type = 'claude' THEN 1 ELSE 0 END,
          CASE WHEN p_api_type = 'rentcast' THEN 1 ELSE 0 END)
  ON CONFLICT (date) DO UPDATE SET
    total_cost_usd = daily_api_costs.total_cost_usd + p_cost,
    claude_cost_usd = daily_api_costs.claude_cost_usd + CASE WHEN p_api_type = 'claude' THEN p_cost ELSE 0 END,
    rentcast_cost_usd = daily_api_costs.rentcast_cost_usd + CASE WHEN p_api_type = 'rentcast' THEN p_cost ELSE 0 END,
    total_calls = daily_api_costs.total_calls + 1,
    claude_calls = daily_api_costs.claude_calls + CASE WHEN p_api_type = 'claude' THEN 1 ELSE 0 END,
    rentcast_calls = daily_api_costs.rentcast_calls + CASE WHEN p_api_type = 'rentcast' THEN 1 ELSE 0 END,
    updated_at = NOW();
END;
$$;

-- Enable Row Level Security
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_api_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can view API cost data
CREATE POLICY "Admins can view all API usage logs"
  ON api_usage_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can insert API usage logs"
  ON api_usage_log FOR INSERT
  WITH CHECK (TRUE); -- Server uses service role, bypasses RLS

CREATE POLICY "Admins can view daily costs"
  ON daily_api_costs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can update daily costs"
  ON daily_api_costs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = TRUE
    )
  );

-- Grant permissions for service role to bypass RLS
GRANT ALL ON api_usage_log TO service_role;
GRANT ALL ON daily_api_costs TO service_role;
