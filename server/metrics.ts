import { Request, Response, NextFunction } from 'express';
import { claudeCache, rentcastCache } from './cache.js';
import { getSessionStats } from './auth.js';

// ============================================================================
// METRICS STORE — In-memory metrics collection for the admin dashboard
// ============================================================================

interface RequestLogEntry {
  timestamp: number;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTimeMs: number;
  userId: string;
  cached: boolean;
  error?: string;
}

interface EndpointStats {
  callCount: number;
  errorCount: number;
  cacheHits: number;
  cacheMisses: number;
  totalResponseTimeMs: number;
  minResponseTimeMs: number;
  maxResponseTimeMs: number;
  responseTimes: number[]; // kept for p95 calculation, capped
}

interface MetricsSnapshot {
  server: {
    status: 'ok';
    uptimeSeconds: number;
    startedAt: string;
    memory: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    nodeVersion: string;
  };
  sessions: {
    active: number;
    total: number;
    byTier: Record<string, number>;
  };
  cache: {
    claude: { size: number; hits: number; misses: number };
    rentcast: { size: number; hits: number; misses: number };
  };
  api: {
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    endpoints: {
      endpoint: string;
      callCount: number;
      errorCount: number;
      avgResponseTimeMs: number;
      minResponseTimeMs: number;
      maxResponseTimeMs: number;
      p95ResponseTimeMs: number;
      cacheHitRate: number;
    }[];
  };
  recentRequests: RequestLogEntry[];
  rateLimits: {
    general: { maxRequests: number; windowSeconds: number };
    claude: { maxRequests: number; windowSeconds: number };
    analysis: { maxRequests: number; windowSeconds: number };
  };
}

const MAX_LOG_ENTRIES = 1000;
const MAX_RESPONSE_TIMES_PER_ENDPOINT = 500;

class MetricsStore {
  private requestLog: RequestLogEntry[] = [];
  private endpointStats: Map<string, EndpointStats> = new Map();
  private totalRequests = 0;
  private totalErrors = 0;
  private serverStartedAt = new Date();

  /**
   * Record a completed API request.
   */
  record(entry: RequestLogEntry): void {
    // Add to log (FIFO, capped)
    this.requestLog.push(entry);
    if (this.requestLog.length > MAX_LOG_ENTRIES) {
      this.requestLog.shift();
    }

    this.totalRequests++;
    if (entry.statusCode >= 400) {
      this.totalErrors++;
    }

    // Update per-endpoint stats
    const key = `${entry.method} ${entry.endpoint}`;
    let stats = this.endpointStats.get(key);
    if (!stats) {
      stats = {
        callCount: 0,
        errorCount: 0,
        cacheHits: 0,
        cacheMisses: 0,
        totalResponseTimeMs: 0,
        minResponseTimeMs: Infinity,
        maxResponseTimeMs: 0,
        responseTimes: [],
      };
      this.endpointStats.set(key, stats);
    }

    stats.callCount++;
    if (entry.statusCode >= 400) stats.errorCount++;
    if (entry.cached) stats.cacheHits++;
    else stats.cacheMisses++;
    stats.totalResponseTimeMs += entry.responseTimeMs;
    stats.minResponseTimeMs = Math.min(stats.minResponseTimeMs, entry.responseTimeMs);
    stats.maxResponseTimeMs = Math.max(stats.maxResponseTimeMs, entry.responseTimeMs);

    stats.responseTimes.push(entry.responseTimeMs);
    if (stats.responseTimes.length > MAX_RESPONSE_TIMES_PER_ENDPOINT) {
      stats.responseTimes.shift();
    }
  }

  /**
   * Compute p95 from a sorted array of response times.
   */
  private p95(times: number[]): number {
    if (times.length === 0) return 0;
    const sorted = [...times].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[Math.min(idx, sorted.length - 1)];
  }

  /**
   * Return a full snapshot of all metrics for the admin dashboard.
   */
  getSnapshot(): MetricsSnapshot {
    const mem = process.memoryUsage();
    const sessionStats = getSessionStats();

    const endpoints = Array.from(this.endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        callCount: stats.callCount,
        errorCount: stats.errorCount,
        avgResponseTimeMs: stats.callCount > 0 ? Math.round(stats.totalResponseTimeMs / stats.callCount) : 0,
        minResponseTimeMs: stats.minResponseTimeMs === Infinity ? 0 : Math.round(stats.minResponseTimeMs),
        maxResponseTimeMs: Math.round(stats.maxResponseTimeMs),
        p95ResponseTimeMs: Math.round(this.p95(stats.responseTimes)),
        cacheHitRate: stats.callCount > 0 ? Number(((stats.cacheHits / stats.callCount) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.callCount - a.callCount);

    return {
      server: {
        status: 'ok',
        uptimeSeconds: Math.floor(process.uptime()),
        startedAt: this.serverStartedAt.toISOString(),
        memory: {
          rss: mem.rss,
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal,
          external: mem.external,
        },
        nodeVersion: process.version,
      },
      sessions: sessionStats,
      cache: {
        claude: { size: claudeCache.size, hits: claudeCache.hits, misses: claudeCache.misses },
        rentcast: { size: rentcastCache.size, hits: rentcastCache.hits, misses: rentcastCache.misses },
      },
      api: {
        totalRequests: this.totalRequests,
        totalErrors: this.totalErrors,
        errorRate: this.totalRequests > 0 ? Number(((this.totalErrors / this.totalRequests) * 100).toFixed(1)) : 0,
        endpoints,
      },
      recentRequests: this.requestLog.slice(-50).reverse(),
      rateLimits: {
        general: { maxRequests: 30, windowSeconds: 60 },
        claude: { maxRequests: 10, windowSeconds: 60 },
        analysis: { maxRequests: 3, windowSeconds: 600 },
      },
    };
  }
}

// Singleton instance
export const metricsStore = new MetricsStore();

// ============================================================================
// METRICS MIDDLEWARE — Records request timing and status
// ============================================================================

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only track /api routes
  if (!req.path.startsWith('/api')) {
    next();
    return;
  }

  // Skip the metrics endpoint itself to avoid recursion
  if (req.path.startsWith('/api/admin')) {
    next();
    return;
  }

  const start = Date.now();

  // Wrap res.end to capture response data
  const originalEnd = res.end;
  (res as any).end = function (...args: any[]) {
    const responseTimeMs = Date.now() - start;

    // Normalize endpoint for grouping (strip query params, normalize IDs)
    let endpoint = req.path;
    // Group RentCast calls by base path
    if (endpoint.startsWith('/api/rentcast/')) {
      const parts = endpoint.split('/').slice(0, 4); // /api/rentcast/<resource>
      endpoint = parts.join('/');
    }

    metricsStore.record({
      timestamp: Date.now(),
      method: req.method,
      endpoint,
      statusCode: res.statusCode,
      responseTimeMs,
      userId: (req as any).userId || 'unknown',
      cached: (res as any).__cached === true,
      error: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : undefined,
    });

    return originalEnd.apply(res, args);
  };

  next();
}
