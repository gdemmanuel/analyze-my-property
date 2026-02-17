/**
 * Database-backed RentCast cache layer
 * 
 * Provides persistent caching for RentCast API responses with:
 * - Configurable TTL per endpoint type
 * - Hit tracking and cost savings analytics
 * - Automatic expiration handling
 * - Fallback to in-memory cache on DB errors
 */

import { supabaseAdmin } from './supabaseAdmin.js';
import { rentcastCache as memoryCache } from './cache.js';
import crypto from 'crypto';

// =============================================================================
// TTL Configuration by Endpoint Type
// =============================================================================
const ENDPOINT_TTL_CONFIG: Record<string, number> = {
  // Property data (static info changes rarely)
  '/properties': 7 * 24 * 60 * 60,           // 7 days
  
  // Valuation data (updates weekly)
  '/avm/value': 7 * 24 * 60 * 60,            // 7 days
  '/avm/rent/long-term': 7 * 24 * 60 * 60,   // 7 days
  
  // Market statistics (updates monthly)
  '/markets': 30 * 24 * 60 * 60,             // 30 days
  
  // Listings (more dynamic)
  '/listings/sale': 3 * 24 * 60 * 60,        // 3 days
  '/listings/rental/long-term': 3 * 24 * 60 * 60, // 3 days
  
  // Default for unknown endpoints
  'default': 24 * 60 * 60,                   // 24 hours
};

// RentCast API cost per call (after 1,000 free calls)
const RENTCAST_COST_PER_CALL = 0.06;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate cache key from URL
 */
function generateCacheKey(url: string): string {
  // Use the full URL as the key (already unique)
  return crypto.createHash('sha256').update(url).digest('hex');
}

/**
 * Extract endpoint from URL (e.g., /properties, /avm/value)
 */
function extractEndpoint(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.replace(/^\/v1/, ''); // Remove /v1 prefix
    
    // Match against known endpoints
    for (const endpoint of Object.keys(ENDPOINT_TTL_CONFIG)) {
      if (path.startsWith(endpoint)) {
        return endpoint;
      }
    }
    
    return path;
  } catch {
    return 'unknown';
  }
}

/**
 * Get TTL for endpoint in seconds
 */
function getTTLForEndpoint(endpoint: string): number {
  return ENDPOINT_TTL_CONFIG[endpoint] || ENDPOINT_TTL_CONFIG['default'];
}

/**
 * Extract request parameters from URL for debugging
 */
function extractParams(url: string): Record<string, any> {
  try {
    const urlObj = new URL(url);
    const params: Record<string, any> = {};
    
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    return params;
  } catch {
    return {};
  }
}

// =============================================================================
// Database Cache Operations
// =============================================================================

export interface CacheEntry {
  data: any;
  statusCode: number;
  cachedAt: Date;
  expiresAt: Date;
  hitCount: number;
  fromDatabase?: boolean;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalCostSaved: number;
  activeEntries: number;
  expiredEntries: number;
  topEndpoint: string;
  avgHitCount: number;
}

/**
 * Get cached response from database
 */
export async function getFromDatabaseCache(url: string): Promise<CacheEntry | null> {
  try {
    const cacheKey = generateCacheKey(url);
    
    // Query database
    const { data, error } = await supabaseAdmin
      .from('rentcast_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) {
      // Not found or expired
      return null;
    }
    
    // Update hit count and last accessed time
    await supabaseAdmin
      .from('rentcast_cache')
      .update({
        hit_count: data.hit_count + 1,
        last_accessed_at: new Date().toISOString(),
        cost_saved_usd: (data.hit_count + 1) * RENTCAST_COST_PER_CALL,
      })
      .eq('id', data.id);
    
    console.log(`[DB Cache HIT] ${extractEndpoint(url)} (hits: ${data.hit_count + 1})`);
    
    return {
      data: data.response_data,
      statusCode: data.status_code,
      cachedAt: new Date(data.created_at),
      expiresAt: new Date(data.expires_at),
      hitCount: data.hit_count + 1,
      fromDatabase: true,
    };
  } catch (error) {
    console.error('[DB Cache] Error reading from database:', error);
    return null;
  }
}

/**
 * Save response to database cache
 */
export async function saveToDatabaseCache(
  url: string, 
  responseData: any, 
  statusCode: number = 200
): Promise<void> {
  try {
    const cacheKey = generateCacheKey(url);
    const endpoint = extractEndpoint(url);
    const ttlSeconds = getTTLForEndpoint(endpoint);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    // Upsert into database
    const { error } = await supabaseAdmin
      .from('rentcast_cache')
      .upsert({
        cache_key: cacheKey,
        endpoint,
        request_params: extractParams(url),
        response_data: responseData,
        status_code: statusCode,
        expires_at: expiresAt.toISOString(),
        ttl_seconds: ttlSeconds,
        created_at: new Date().toISOString(),
        hit_count: 0,
        last_accessed_at: new Date().toISOString(),
        cost_saved_usd: 0,
      }, {
        onConflict: 'cache_key',
      });
    
    if (error) {
      console.error('[DB Cache] Error saving to database:', error);
      return;
    }
    
    console.log(`[DB Cache SAVE] ${endpoint} (TTL: ${ttlSeconds}s = ${Math.round(ttlSeconds / 3600)}h)`);
  } catch (error) {
    console.error('[DB Cache] Error saving to database:', error);
  }
}

/**
 * Unified cache get with memory + database fallback
 */
export async function getCachedResponse(url: string): Promise<any | null> {
  // 1. Try memory cache first (fastest)
  const memoryCached = memoryCache.get(url);
  if (memoryCached) {
    console.log(`[Memory Cache HIT] ${extractEndpoint(url)}`);
    return memoryCached;
  }
  
  // 2. Try database cache (persistent)
  const dbCached = await getFromDatabaseCache(url);
  if (dbCached) {
    // Populate memory cache for faster subsequent access
    const endpoint = extractEndpoint(url);
    const ttl = getTTLForEndpoint(endpoint) * 1000; // Convert to ms
    memoryCache.set(url, dbCached.data, ttl);
    
    return dbCached.data;
  }
  
  // 3. Cache miss
  console.log(`[Cache MISS] ${extractEndpoint(url)}`);
  return null;
}

/**
 * Unified cache set (saves to both memory and database)
 */
export async function setCachedResponse(
  url: string, 
  data: any, 
  statusCode: number = 200
): Promise<void> {
  const endpoint = extractEndpoint(url);
  const ttl = getTTLForEndpoint(endpoint);
  
  // Save to memory cache
  memoryCache.set(url, data, ttl * 1000); // Convert to ms
  
  // Save to database cache (async, don't wait)
  saveToDatabaseCache(url, data, statusCode).catch(err => {
    console.error('[DB Cache] Failed to save to database:', err);
  });
}

// =============================================================================
// Analytics Functions
// =============================================================================

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats | null> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_rentcast_cache_stats');
    
    if (error || !data || data.length === 0) {
      return null;
    }
    
    const stats = data[0];
    return {
      totalEntries: parseInt(stats.total_entries) || 0,
      totalHits: parseInt(stats.total_hits) || 0,
      totalCostSaved: parseFloat(stats.total_cost_saved_usd) || 0,
      activeEntries: parseInt(stats.active_entries) || 0,
      expiredEntries: parseInt(stats.expired_entries) || 0,
      topEndpoint: stats.top_endpoint || 'N/A',
      avgHitCount: parseFloat(stats.avg_hit_count) || 0,
    };
  } catch (error) {
    console.error('[DB Cache] Error getting stats:', error);
    return null;
  }
}

/**
 * Get popular cached properties
 */
export async function getPopularCachedProperties(limit: number = 10): Promise<any[]> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_popular_cached_properties', { limit_count: limit });
    
    if (error || !data) {
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('[DB Cache] Error getting popular properties:', error);
    return [];
  }
}

/**
 * Cleanup expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('cleanup_expired_rentcast_cache');
    
    if (error) {
      console.error('[DB Cache] Error cleaning up:', error);
      return 0;
    }
    
    const deletedCount = data || 0;
    console.log(`[DB Cache] Cleaned up ${deletedCount} expired entries`);
    return deletedCount;
  } catch (error) {
    console.error('[DB Cache] Error cleaning up:', error);
    return 0;
  }
}

/**
 * Get cache statistics by endpoint
 */
export async function getCacheStatsByEndpoint(): Promise<any[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('rentcast_cache')
      .select('endpoint, hit_count, cost_saved_usd, created_at, expires_at')
      .gt('expires_at', new Date().toISOString());
    
    if (error || !data) {
      return [];
    }
    
    // Group by endpoint
    const grouped = data.reduce((acc: any, row: any) => {
      if (!acc[row.endpoint]) {
        acc[row.endpoint] = {
          endpoint: row.endpoint,
          entries: 0,
          totalHits: 0,
          costSaved: 0,
        };
      }
      
      acc[row.endpoint].entries++;
      acc[row.endpoint].totalHits += row.hit_count;
      acc[row.endpoint].costSaved += parseFloat(row.cost_saved_usd || 0);
      
      return acc;
    }, {});
    
    return Object.values(grouped).sort((a: any, b: any) => b.totalHits - a.totalHits);
  } catch (error) {
    console.error('[DB Cache] Error getting stats by endpoint:', error);
    return [];
  }
}

/**
 * Clear all cache (both memory and database)
 */
export async function clearAllCache(): Promise<void> {
  try {
    // Clear memory cache
    memoryCache.clear();
    
    // Clear database cache
    const { error } = await supabaseAdmin
      .from('rentcast_cache')
      .delete()
      .neq('id', 0); // Delete all rows
    
    if (error) {
      console.error('[DB Cache] Error clearing database:', error);
    } else {
      console.log('[DB Cache] Cleared all cache entries');
    }
  } catch (error) {
    console.error('[DB Cache] Error clearing cache:', error);
  }
}

// =============================================================================
// Automatic cleanup (run periodically)
// =============================================================================

// Run cleanup every 6 hours
setInterval(async () => {
  const deleted = await cleanupExpiredCache();
  if (deleted > 0) {
    console.log(`[DB Cache] Periodic cleanup: removed ${deleted} expired entries`);
  }
}, 6 * 60 * 60 * 1000); // 6 hours

// Run initial cleanup on startup
setTimeout(() => {
  cleanupExpiredCache().catch(err => {
    console.error('[DB Cache] Initial cleanup failed:', err);
  });
}, 5000); // 5 seconds after startup
