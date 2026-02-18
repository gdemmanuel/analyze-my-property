/**
 * Database-backed Claude Analysis Cache
 *
 * Persists Claude analysis results to PostgreSQL so the cache survives
 * server restarts and Railway redeployments. Uses a two-tier strategy:
 *   1. In-memory TTLCache (fast, lost on restart)
 *   2. PostgreSQL claude_analysis_cache table (persistent)
 *
 * TTL: 7 days — property fundamentals don't change quickly.
 * Cost saved per hit: ~$0.18 avg (Sonnet 4.6 at 4096 output tokens)
 */

import { getSupabaseAdmin } from './supabaseAuth.js';
import { claudeCache as memoryCache } from './cache.js';

const TTL_SECONDS = 7 * 24 * 60 * 60;       // 7 days
const TTL_MS = TTL_SECONDS * 1000;
const CLAUDE_COST_PER_ANALYSIS = 0.18;       // Approximate Sonnet 4.6 cost per analysis

// =============================================================================
// Database Operations
// =============================================================================

/**
 * Check database for a cached Claude analysis result.
 * Returns the cached content array, or null on miss.
 */
export async function getClaudeAnalysisFromDB(cacheKey: string): Promise<any[] | null> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('claude_analysis_cache')
      .select('id, response_data, hit_count')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;

    // Update hit count and cost saved asynchronously
    supabase
      .from('claude_analysis_cache')
      .update({
        hit_count: data.hit_count + 1,
        last_accessed_at: new Date().toISOString(),
        cost_saved_usd: (data.hit_count + 1) * CLAUDE_COST_PER_ANALYSIS,
      })
      .eq('id', data.id)
      .then(({ error: updateError }) => {
        if (updateError) console.error('[Claude Cache] Hit count update error:', updateError.message);
      });

    console.log(`[Claude DB Cache HIT] ${cacheKey} (hits: ${data.hit_count + 1})`);
    return data.response_data as any[];
  } catch (err) {
    console.error('[Claude Cache] DB read error:', err);
    return null;
  }
}

/**
 * Save a Claude analysis result to the database.
 * Fire-and-forget — does not block the response.
 */
export async function saveClaudeAnalysisToDB(
  cacheKey: string,
  address: string,
  model: string,
  responseData: any[]
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

    const { error } = await supabase
      .from('claude_analysis_cache')
      .upsert({
        cache_key: cacheKey,
        address,
        model,
        response_data: responseData,
        expires_at: expiresAt,
        ttl_seconds: TTL_SECONDS,
        created_at: new Date().toISOString(),
        hit_count: 0,
        last_accessed_at: new Date().toISOString(),
        cost_saved_usd: 0,
      }, { onConflict: 'cache_key' });

    if (error) {
      console.error('[Claude Cache] DB save error:', error.message);
    } else {
      console.log(`[Claude DB Cache SAVE] ${cacheKey} (TTL: 7 days)`);
    }
  } catch (err) {
    console.error('[Claude Cache] DB save error:', err);
  }
}

// =============================================================================
// Unified Two-Tier Cache Interface
// =============================================================================

/**
 * Get a Claude analysis result — checks memory first, then database.
 * Populates memory cache from DB for faster subsequent access.
 */
export async function getCachedClaudeAnalysis(cacheKey: string): Promise<any[] | null> {
  // 1. Memory cache (instant)
  const memHit = memoryCache.get(cacheKey);
  if (memHit) {
    console.log(`[Claude Memory Cache HIT] ${cacheKey}`);
    return memHit as any[];
  }

  // 2. Database cache (persistent)
  const dbHit = await getClaudeAnalysisFromDB(cacheKey);
  if (dbHit) {
    // Warm the memory cache so the next hit is instant
    memoryCache.set(cacheKey, dbHit, TTL_MS);
    return dbHit;
  }

  console.log(`[Claude Cache MISS] ${cacheKey}`);
  return null;
}

/**
 * Store a Claude analysis result in both memory and database.
 */
export async function setCachedClaudeAnalysis(
  cacheKey: string,
  address: string,
  model: string,
  responseData: any[]
): Promise<void> {
  // Save to memory immediately
  memoryCache.set(cacheKey, responseData, TTL_MS);

  // Save to DB in background — don't await
  saveClaudeAnalysisToDB(cacheKey, address, model, responseData).catch(err => {
    console.error('[Claude Cache] Background DB save failed:', err);
  });
}

// =============================================================================
// Analytics
// =============================================================================

export async function getClaudeCacheStats(): Promise<{
  activeEntries: number;
  totalHits: number;
  totalCostSaved: number;
} | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('get_claude_cache_stats');

    if (error || !data || data.length === 0) return null;

    const row = data[0];
    return {
      activeEntries: parseInt(row.active_entries) || 0,
      totalHits: parseInt(row.total_hits) || 0,
      totalCostSaved: parseFloat(row.total_cost_saved_usd) || 0,
    };
  } catch (err) {
    console.error('[Claude Cache] Stats error:', err);
    return null;
  }
}

// =============================================================================
// Periodic Cleanup
// =============================================================================

async function cleanupExpiredClaudeCache(): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('cleanup_expired_claude_cache');
    if (!error && data > 0) {
      console.log(`[Claude Cache] Cleanup: removed ${data} expired entries`);
    }
  } catch (err) {
    console.error('[Claude Cache] Cleanup error:', err);
  }
}

// Cleanup every 6 hours
setInterval(() => {
  cleanupExpiredClaudeCache().catch(() => {});
}, 6 * 60 * 60 * 1000);

// Initial cleanup 10 seconds after startup
setTimeout(() => {
  cleanupExpiredClaudeCache().catch(() => {});
}, 10_000);
