-- API Cost Tracking Schema (Step 2: Function)
-- Run this AFTER step 1 succeeds

CREATE OR REPLACE FUNCTION increment_daily_cost(
  p_date DATE,
  p_api_type TEXT,
  p_cost DECIMAL,
  p_model TEXT DEFAULT NULL,
  p_endpoint TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO daily_api_costs (
    date, 
    total_cost_usd, 
    claude_cost_usd, 
    rentcast_cost_usd, 
    total_calls, 
    claude_calls, 
    rentcast_calls
  )
  VALUES (
    p_date, 
    p_cost, 
    CASE WHEN p_api_type = 'claude' THEN p_cost ELSE 0 END,
    CASE WHEN p_api_type = 'rentcast' THEN p_cost ELSE 0 END,
    1,
    CASE WHEN p_api_type = 'claude' THEN 1 ELSE 0 END,
    CASE WHEN p_api_type = 'rentcast' THEN 1 ELSE 0 END
  )
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
