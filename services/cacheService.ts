/**
 * Cache Service for RentCast API Results
 * 
 * Implements a 24-hour cache to reduce API calls and improve performance
 * while maintaining data freshness for property analysis.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  ttlMs: number; // Time to live in milliseconds
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
};

class RentCastCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly cacheKey = 'airROI_rentcast_cache';
  private readonly configKey = 'airROI_cache_metadata';
  private config: CacheConfig = DEFAULT_CACHE_CONFIG;

  constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * Load cache from localStorage on initialization
   */
  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(this.cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Restore cache entries and filter out expired items
        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
          if (value.expiresAt > Date.now()) {
            this.cache.set(key, value);
          }
        });
        console.log(`[Cache] Loaded ${this.cache.size} valid cache entries from localStorage`);
      }
    } catch (e) {
      console.warn('[Cache] Failed to load cache from localStorage', e);
      this.cache.clear();
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToLocalStorage() {
    try {
      const cacheObj: Record<string, CacheEntry<any>> = {};
      this.cache.forEach((value, key) => {
        cacheObj[key] = value;
      });
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheObj));
    } catch (e) {
      console.warn('[Cache] Failed to save cache to localStorage', e);
    }
  }

  /**
   * Generate a cache key from function name and parameters
   */
  private generateKey(functionName: string, params: Record<string, any>): string {
    const paramStr = JSON.stringify(params);
    return `${functionName}:${paramStr}`;
  }

  /**
   * Get a value from cache if it exists and hasn't expired
   */
  get<T>(functionName: string, params: Record<string, any>): T | null {
    const key = this.generateKey(functionName, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      // Cache entry has expired, remove it
      this.cache.delete(key);
      this.saveToLocalStorage();
      console.log(`[Cache] Expired cache entry removed: ${key}`);
      return null;
    }

    const ageMinutes = Math.round((Date.now() - entry.timestamp) / (1000 * 60));
    console.log(`[Cache] ✅ HIT: ${functionName} (cached ${ageMinutes}m ago)`);
    return entry.data as T;
  }

  /**
   * Set a value in cache
   */
  set<T>(functionName: string, params: Record<string, any>, data: T): void {
    const key = this.generateKey(functionName, params);
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + this.config.ttlMs,
    };

    this.cache.set(key, entry);
    this.saveToLocalStorage();

    const hoursToExpire = Math.round(this.config.ttlMs / (60 * 60 * 1000));
    console.log(`[Cache] STORED: ${functionName} (expires in ${hoursToExpire}h)`);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
    localStorage.removeItem(this.cacheKey);
    console.log('[Cache] All cache cleared');
  }

  /**
   * Clear a specific cache entry
   */
  clear(functionName: string, params: Record<string, any>): void {
    const key = this.generateKey(functionName, params);
    this.cache.delete(key);
    this.saveToLocalStorage();
    console.log(`[Cache] Cleared: ${key}`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const validEntries = Array.from(this.cache.values()).filter(
      (entry) => entry.expiresAt > Date.now()
    );
    const now = Date.now();
    return {
      totalEntries: this.cache.size,
      validEntries: validEntries.length,
      ttlMinutes: Math.round(this.config.ttlMs / (1000 * 60)),
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        ageMinutes: Math.round((now - entry.timestamp) / (1000 * 60)),
        expiresInMinutes: Math.round((entry.expiresAt - now) / (1000 * 60)),
      })),
    };
  }

  /**
   * Set custom TTL (time to live)
   */
  setTTL(ttlMs: number): void {
    this.config.ttlMs = ttlMs;
    console.log(`[Cache] TTL updated to ${Math.round(ttlMs / (60 * 60 * 1000))} hours`);
  }
}

export const cacheService = new RentCastCache();
