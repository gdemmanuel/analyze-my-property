-- Additional SQL functions for usage tracking
-- Run this AFTER schema.sql and rls-policies.sql

-- Function to increment analyses counter
CREATE OR REPLACE FUNCTION increment_analyses(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_usage
  SET 
    analyses_today = analyses_today + 1,
    last_analysis_timestamp = NOW(),
    updated_at = NOW()
  WHERE user_usage.user_id = increment_analyses.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment Claude calls counter
CREATE OR REPLACE FUNCTION increment_claude_calls(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_usage
  SET 
    claude_calls_this_hour = claude_calls_this_hour + 1,
    last_claude_call_timestamp = NOW(),
    updated_at = NOW()
  WHERE user_usage.user_id = increment_claude_calls.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
