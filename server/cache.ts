/**
 * Simple in-memory TTL cache for server-side response caching.
 * Same address across different users returns cached result instantly.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class TTLCache<T = any> {
  private store = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;
  private maxSize: number;

  constructor(defaultTTLMs: number = 30 * 60 * 1000, maxSize: number = 500) {
    this.defaultTTL = defaultTTLMs;
    this.maxSize = maxSize;

    // Periodic cleanup every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs?: number): void {
    // Evict oldest entries if at capacity
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// Shared cache instances
export const claudeCache = new TTLCache(30 * 60 * 1000);   // 30 min for Claude responses
export const rentcastCache = new TTLCache(60 * 60 * 1000);  // 60 min for RentCast data
