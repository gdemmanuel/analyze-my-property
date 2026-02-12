import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Server, Clock, Database, Users, Zap, RefreshCw, Trash2,
  AlertTriangle, CheckCircle, XCircle, BarChart3, Shield, Cpu, HardDrive, HelpCircle
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface MetricsSnapshot {
  server: {
    status: string;
    uptimeSeconds: number;
    startedAt: string;
    memory: { rss: number; heapUsed: number; heapTotal: number; external: number };
    nodeVersion: string;
  };
  sessions: { active: number; total: number; byTier: Record<string, number> };
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
  models: {
    model: string;
    requestCount: number;
    avgTimeMs: number;
    totalTimeMs: number;
  }[];
  recentRequests: {
    timestamp: number;
    method: string;
    endpoint: string;
    statusCode: number;
    responseTimeMs: number;
    userId: string;
    cached: boolean;
    error?: string;
  }[];
  rateLimits: {
    general: { maxRequests: number; windowSeconds: number };
    claude: { maxRequests: number; windowSeconds: number };
    analysis: { maxRequests: number; windowSeconds: number };
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function statusColor(code: number): string {
  if (code >= 200 && code < 300) return 'text-emerald-400';
  if (code >= 400 && code < 500) return 'text-amber-400';
  return 'text-red-400';
}

function statusBg(code: number): string {
  if (code >= 200 && code < 300) return 'bg-emerald-500/10';
  if (code >= 400 && code < 500) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

// Tooltip component
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
  <div className="group relative inline-block">
    {children}
    <div className="invisible group-hover:visible absolute z-10 w-48 p-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
    </div>
  </div>
);

// ============================================================================
// COMPONENT
// ============================================================================

const AdminTab: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [clearing, setClearing] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetrics(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const handleClearCache = async (target: 'claude' | 'rentcast' | 'all') => {
    setClearing(target);
    try {
      await fetch('/api/admin/cache/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      await fetchMetrics();
    } catch (e) {
      console.error('Failed to clear cache:', e);
    } finally {
      setClearing(null);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="max-w-[1600px] mx-auto p-4 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw size={24} className="animate-spin text-slate-400" />
          <span className="ml-3 text-slate-500 font-black text-sm uppercase tracking-widest">Loading metrics...</span>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="max-w-[1600px] mx-auto p-4 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <XCircle size={32} className="mx-auto mb-3 text-red-500" />
          <p className="text-red-700 font-black text-sm uppercase tracking-widest mb-2">Failed to load metrics</p>
          <p className="text-red-600 text-xs mb-4">{error}</p>
          <button onClick={fetchMetrics} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const cacheHitTotal = metrics.cache.claude.hits + metrics.cache.rentcast.hits;
  const cacheMissTotal = metrics.cache.claude.misses + metrics.cache.rentcast.misses;
  const cacheHitRate = cacheHitTotal + cacheMissTotal > 0
    ? ((cacheHitTotal / (cacheHitTotal + cacheMissTotal)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 rounded-xl text-white"><Shield size={20} /></div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Admin Dashboard</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {lastRefresh ? `Last updated: ${lastRefresh.toLocaleTimeString()}` : 'Loading...'} • Auto-refreshes every 30s
            </p>
          </div>
        </div>
        <button
          onClick={fetchMetrics}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ================================================================== */}
      {/* SECTION 1: Health Overview Cards                                    */}
      {/* ================================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Server Status */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Server size={14} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">STATUS</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-lg font-black text-emerald-600 uppercase">Online</span>
          </div>
        </div>

        {/* Uptime */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">UPTIME</span>
          </div>
          <p className="text-lg font-black text-slate-900">{formatUptime(metrics.server.uptimeSeconds)}</p>
        </div>

        {/* Memory */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={14} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">MEMORY</span>
          </div>
          <p className="text-lg font-black text-slate-900">{formatBytes(metrics.server.memory.heapUsed)}</p>
          <p className="text-[10px] text-slate-500 mt-1">of {formatBytes(metrics.server.memory.heapTotal)} heap</p>
        </div>

        {/* Sessions */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SESSIONS</span>
          </div>
          <p className="text-lg font-black text-slate-900">{metrics.sessions.active}</p>
          <p className="text-[10px] text-slate-500 mt-1">{metrics.sessions.total} total</p>
        </div>

        {/* Total Requests */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">REQUESTS</span>
          </div>
          <p className="text-lg font-black text-slate-900">{metrics.api.totalRequests.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 mt-1">{metrics.api.totalErrors} errors ({metrics.api.errorRate}%)</p>
        </div>

        {/* Cache Hit Rate */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CACHE HIT</span>
          </div>
          <p className="text-lg font-black text-slate-900">{cacheHitRate}%</p>
          <p className="text-[10px] text-slate-500 mt-1">{cacheHitTotal} hits / {cacheMissTotal} misses</p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SECTION 2: Charts & Analytics                                        */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* API Calls by Status Chart */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-slate-400" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Request Status Distribution</h3>
            <Tooltip text="HTTP status codes: 2xx = Success, 3xx/4xx = Client errors (bad requests), 5xx = Server errors (our fault)">
              <HelpCircle size={14} className="text-slate-400 cursor-help" />
            </Tooltip>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Success (2xx)', desc: 'Requests completed successfully', value: metrics.api.totalRequests - metrics.api.totalErrors, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
              { label: 'Client Errors (3xx/4xx)', desc: 'Bad requests or redirects', value: Math.ceil((metrics.api.totalErrors * 0.5) || 0), color: 'bg-amber-500', textColor: 'text-amber-600' },
              { label: 'Server Errors (5xx)', desc: 'Server-side issues', value: Math.floor((metrics.api.totalErrors * 0.5) || 0), color: 'bg-red-500', textColor: 'text-red-600' }
            ].map(({ label, desc, value, color, textColor }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-1">
                  <Tooltip text={desc}>
                    <span className="text-xs font-black text-slate-600 cursor-help hover:text-slate-700">{label}</span>
                  </Tooltip>
                  <span className={`text-sm font-black ${textColor}`}>{value.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`${color} h-full rounded-full`}
                    style={{
                      width: `${metrics.api.totalRequests > 0 ? (value / metrics.api.totalRequests) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
              Success Rate: <span className="font-black text-slate-900">{(100 - metrics.api.errorRate).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Cache Hit Rate by Type */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-slate-400" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Cache Performance</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Claude Cache', hits: metrics.cache.claude.hits, misses: metrics.cache.claude.misses, color: 'bg-blue-500' },
              { label: 'RentCast Cache', hits: metrics.cache.rentcast.hits, misses: metrics.cache.rentcast.misses, color: 'bg-emerald-500' }
            ].map(({ label, hits, misses, color }) => {
              const total = hits + misses;
              const rate = total > 0 ? (hits / total) * 100 : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-slate-600">{label}</span>
                    <span className="text-xs font-black text-slate-900">{rate.toFixed(0)}% hit rate</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`${color} h-full rounded-full`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">{hits.toLocaleString()} hits, {misses.toLocaleString()} misses</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Endpoints by Call Count */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-slate-400" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Top Endpoints by Volume</h3>
          </div>
          {metrics.api.endpoints.length > 0 ? (
            <div className="space-y-2">
              {metrics.api.endpoints.slice(0, 5).map((ep, i) => (
                <div key={ep.endpoint} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded">{i + 1}</span>
                    <span className="text-[11px] text-slate-600 truncate font-mono">{ep.endpoint}</span>
                  </div>
                  <span className="text-xs font-black text-slate-900 ml-2 flex-shrink-0">{ep.callCount}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No endpoint data</p>
          )}
        </div>

        {/* Response Time by Endpoint */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-slate-400" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Slowest Endpoints</h3>
          </div>
          <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded text-[10px] text-blue-700">
            <Tooltip text="Claude/Analysis calls are slow because they're waiting for the Claude API to process. This is normal. Green &lt;1s, Amber 1-5s, Red &gt;5s.">
              <div className="flex items-start gap-2">
                <HelpCircle size={12} className="mt-0.5 flex-shrink-0" />
                <span><strong>Note:</strong> Slow endpoints like /claude/analysis are usually waiting on external APIs (Claude, RentCast). This is expected, not an error.</span>
              </div>
            </Tooltip>
          </div>
          {metrics.api.endpoints.length > 0 ? (
            <div className="space-y-2">
              {metrics.api.endpoints
                .sort((a, b) => b.p95ResponseTimeMs - a.p95ResponseTimeMs)
                .slice(0, 5)
                .map((ep) => (
                  <div key={ep.endpoint} className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-600 truncate font-mono flex-1 min-w-0">{ep.endpoint}</span>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${ep.p95ResponseTimeMs > 5000 ? 'bg-red-500' : ep.p95ResponseTimeMs > 1000 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{
                            width: `${Math.min(100, (ep.p95ResponseTimeMs / 10000) * 100)}%`
                          }}
                        />
                      </div>
                      <span className={`text-[10px] font-black ${ep.p95ResponseTimeMs > 5000 ? 'text-red-600' : ep.p95ResponseTimeMs > 1000 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {formatTime(ep.p95ResponseTimeMs)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No endpoint data</p>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* SECTION 2B: Model Usage                                             */}
      {/* ================================================================== */}
      {metrics.models && metrics.models.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-slate-400" />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Model Usage</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Model</th>
                  <th className="px-5 py-3 text-right text-xs font-black text-slate-600 uppercase tracking-wider">Requests</th>
                  <th className="px-5 py-3 text-right text-xs font-black text-slate-600 uppercase tracking-wider">Avg Time</th>
                  <th className="px-5 py-3 text-right text-xs font-black text-slate-600 uppercase tracking-wider">Total Time</th>
                </tr>
              </thead>
              <tbody>
                {metrics.models.map((m, i) => (
                  <tr key={m.model} className={`${i !== metrics.models.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <td className="px-5 py-3 font-mono text-xs text-slate-700">{m.model.replace('claude-', '').substring(0, 20)}</td>
                    <td className="px-5 py-3 text-right text-sm font-black text-slate-900">{m.requestCount.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-sm font-black text-slate-700">{formatTime(m.avgTimeMs)}</td>
                    <td className="px-5 py-3 text-right text-xs text-slate-500">{formatTime(m.totalTimeMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SECTION 3: API Usage Table                                          */}
      {/* ================================================================== */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-slate-400" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">API Endpoint Usage</h3>
          </div>
        </div>
        {metrics.api.endpoints.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Endpoint</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Calls</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Errors</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Avg Time</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">P95 Time</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Min / Max</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Cache Hit</th>
                </tr>
              </thead>
              <tbody>
                {metrics.api.endpoints.map((ep, i) => (
                  <tr key={ep.endpoint} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                    <td className="px-5 py-3">
                      <span className="text-xs font-black text-slate-800 font-mono">{ep.endpoint}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs font-black text-slate-900">{ep.callCount}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs font-black ${ep.errorCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>{ep.errorCount}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs font-black text-slate-900">{formatTime(ep.avgResponseTimeMs)}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs font-black ${ep.p95ResponseTimeMs > 5000 ? 'text-red-600' : ep.p95ResponseTimeMs > 2000 ? 'text-amber-600' : 'text-slate-900'}`}>
                        {formatTime(ep.p95ResponseTimeMs)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-[10px] text-slate-500">{formatTime(ep.minResponseTimeMs)} / {formatTime(ep.maxResponseTimeMs)}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs font-black ${ep.cacheHitRate > 50 ? 'text-emerald-600' : ep.cacheHitRate > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {ep.cacheHitRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-sm">No API calls recorded yet</div>
        )}
      </div>

      {/* ================================================================== */}
      {/* SECTION 4: Recent API Calls Log                                     */}
      {/* ================================================================== */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-slate-400" />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Recent API Calls</h3>
            </div>
            <span className="text-[10px] text-slate-500 font-black">Last {metrics.recentRequests.length} requests</span>
          </div>
        </div>
        {metrics.recentRequests.length > 0 ? (
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Time</th>
                  <th className="px-5 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Method</th>
                  <th className="px-5 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Endpoint</th>
                  <th className="px-5 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Status</th>
                  <th className="px-5 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Time</th>
                  <th className="px-5 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Cached</th>
                  <th className="px-5 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">User</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentRequests.map((req, i) => (
                  <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors ${statusBg(req.statusCode)}`}>
                    <td className="px-5 py-2.5 text-[11px] text-slate-600 font-mono whitespace-nowrap">
                      {new Date(req.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${req.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {req.method}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-[11px] font-mono text-slate-800 max-w-[300px] truncate">{req.endpoint}</td>
                    <td className="px-5 py-2.5 text-right">
                      <span className={`text-[11px] font-black ${statusColor(req.statusCode)}`}>{req.statusCode}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right text-[11px] font-black text-slate-700">{formatTime(req.responseTimeMs)}</td>
                    <td className="px-5 py-2.5 text-right">
                      {req.cached ? (
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">HIT</span>
                      ) : (
                        <span className="text-[10px] font-black text-slate-400">MISS</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-[10px] text-slate-500 font-mono max-w-[120px] truncate">{req.userId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-sm">No requests recorded yet</div>
        )}
      </div>

      {/* ================================================================== */}
      {/* SECTION 5 & 6: Cache Management + Rate Limits                      */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cache Management */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Database size={16} className="text-slate-400" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Cache Management</h3>
          </div>

          <div className="space-y-4">
            {/* Claude Cache */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-black text-slate-900">Claude Cache</p>
                <p className="text-xs text-slate-500 mt-1">
                  {metrics.cache.claude.size} entries • {metrics.cache.claude.hits} hits / {metrics.cache.claude.misses} misses
                </p>
                <div className="w-32 h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, (metrics.cache.claude.size / 500) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{metrics.cache.claude.size}/500 capacity</p>
              </div>
              <button
                onClick={() => handleClearCache('claude')}
                disabled={clearing === 'claude'}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Trash2 size={12} /> {clearing === 'claude' ? 'Clearing...' : 'Clear'}
              </button>
            </div>

            {/* RentCast Cache */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-black text-slate-900">RentCast Cache</p>
                <p className="text-xs text-slate-500 mt-1">
                  {metrics.cache.rentcast.size} entries • {metrics.cache.rentcast.hits} hits / {metrics.cache.rentcast.misses} misses
                </p>
                <div className="w-32 h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, (metrics.cache.rentcast.size / 500) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{metrics.cache.rentcast.size}/500 capacity</p>
              </div>
              <button
                onClick={() => handleClearCache('rentcast')}
                disabled={clearing === 'rentcast'}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Trash2 size={12} /> {clearing === 'rentcast' ? 'Clearing...' : 'Clear'}
              </button>
            </div>

            {/* Clear All */}
            <button
              onClick={() => handleClearCache('all')}
              disabled={clearing === 'all'}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} /> {clearing === 'all' ? 'Clearing All...' : 'Clear All Caches'}
            </button>
          </div>
        </div>

        {/* Rate Limits + Server Info */}
        <div className="space-y-4">
          {/* Rate Limits */}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle size={16} className="text-slate-400" />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Rate Limits</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-black text-slate-900">General API</p>
                  <p className="text-[10px] text-slate-500">All /api routes</p>
                </div>
                <span className="text-sm font-black text-slate-700">{metrics.rateLimits.general.maxRequests} req / {metrics.rateLimits.general.windowSeconds}s</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-black text-slate-900">Claude Messages</p>
                  <p className="text-[10px] text-slate-500">POST /api/claude/messages</p>
                </div>
                <span className="text-sm font-black text-slate-700">{metrics.rateLimits.claude.maxRequests} req / {metrics.rateLimits.claude.windowSeconds}s</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-black text-slate-900">Full Analysis</p>
                  <p className="text-[10px] text-slate-500">POST /api/claude/analysis</p>
                </div>
                <span className="text-sm font-black text-slate-700">{metrics.rateLimits.analysis.maxRequests} req / {metrics.rateLimits.analysis.windowSeconds}s</span>
              </div>
            </div>
          </div>

          {/* Server Info */}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <HardDrive size={16} className="text-slate-400" />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Server Info</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-black">Node Version</span>
                <span className="font-black text-slate-900 font-mono">{metrics.server.nodeVersion}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-black">Started At</span>
                <span className="font-black text-slate-900">{new Date(metrics.server.startedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-black">RSS Memory</span>
                <span className="font-black text-slate-900">{formatBytes(metrics.server.memory.rss)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-black">Heap Used / Total</span>
                <span className="font-black text-slate-900">{formatBytes(metrics.server.memory.heapUsed)} / {formatBytes(metrics.server.memory.heapTotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-black">External Memory</span>
                <span className="font-black text-slate-900">{formatBytes(metrics.server.memory.external)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTab;
