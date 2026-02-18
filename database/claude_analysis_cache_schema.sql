-- =============================================================================
-- Claude Analysis Cache
-- =============================================================================
-- Purpose: Persist Claude analysis results across server restarts
-- Benefits:
--   - Cache survives Railway redeployments
--   - Shared across all users (same property = one Claude call)
--   - Saves ~$0.10-0.30 per cached analysis (Sonnet 4.6 pricing)
--   - 7-day TTL: property fundamentals don't change quickly
-- =============================================================================

CREATE TABLE IF NOT EXISTS claude_analysis_cache (
  id SERIAL PRIMARY KEY,

  -- Cache identification
  cache_key TEXT UNIQUE NOT NULL,     -- Normalized: "address:model"
  address TEXT NOT NULL,              -- Human-readable address for debugging
  model TEXT NOT NULL,                -- Claude model used (e.g., claude-sonnet-4-6)

  -- Cached response
  response_data JSONB NOT NULL,       -- Full Claude response content array

  -- Timing and expiration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ttl_seconds INTEGER NOT NULL DEFAULT 604800,  -- 7 days default

  -- Analytics
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cost_saved_usd DECIMAL(10, 4) DEFAULT 0.00
);

-- Primary lookup index
CREATE INDEX IF NOT EXISTS idx_claude_cache_key ON claude_analysis_cache(cache_key);

-- Expiration cleanup index
CREATE INDEX IF NOT EXISTS idx_claude_cache_expires ON claude_analysis_cache(expires_at);

-- Analytics index
CREATE INDEX IF NOT EXISTS idx_claude_cache_hits ON claude_analysis_cache(hit_count DESC);

-- Address search index (useful for admin debugging)
CREATE INDEX IF NOT EXISTS idx_claude_cache_address ON claude_analysis_cache(address);

-- =============================================================================
-- Cleanup Function
-- =============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_claude_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM claude_analysis_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Also remove entries older than 30 days regardless of TTL
  DELETE FROM claude_analysis_cache
  WHERE created_at < NOW() - INTERVAL '30 days';

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Stats Function
-- =============================================================================
CREATE OR REPLACE FUNCTION get_claude_cache_stats()
RETURNS TABLE(
  total_entries BIGINT,
  active_entries BIGINT,
  total_hits BIGINT,
  total_cost_saved_usd DECIMAL,
  avg_hit_count DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE expires_at > NOW())::BIGINT,
    COALESCE(SUM(hit_count), 0)::BIGINT,
    COALESCE(SUM(cost_saved_usd), 0)::DECIMAL,
    COALESCE(AVG(hit_count), 0)::DECIMAL
  FROM claude_analysis_cache;
END;
$$ LANGUAGE plpgsql;
