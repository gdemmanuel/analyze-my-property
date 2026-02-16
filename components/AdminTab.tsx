import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Server, Clock, Database, Users, Zap, RefreshCw, Trash2,
  AlertTriangle, CheckCircle, XCircle, BarChart3, Shield, Cpu, HardDrive, HelpCircle, DollarSign, ExternalLink, TrendingUp
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer
} from 'recharts';
import ApiCostChart from './ApiCostChart';

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

type AdminSubTab = 'overview' | 'costs' | 'performance' | 'config' | 'users';

const AdminTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('overview');
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [clearing, setClearing] = useState<string | null>(null);
  const [costData, setCostData] = useState<any>(null);
  const [costHistory, setCostHistory] = useState<any[]>([]);
  const [pricingInfo, setPricingInfo] = useState<any>(null);
  const [rateLimits, setRateLimits] = useState<any>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userStats, setUserStats] = useState<any[]>([]);
  const [configForm, setConfigForm] = useState({
    dailyBudget: 50,
    rentcastCost: 0.03,
    freeTierAnalyses: 3,
    freeTierCalls: 15,
    proTierAnalyses: 50,
    proTierCalls: 100,
  });

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
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

  const fetchCosts = useCallback(async () => {
    try {
      console.log('[AdminTab] Fetching costs from /api/admin/costs...');
      const res = await fetch('/api/admin/costs');
      console.log('[AdminTab] Costs response:', res.status, res.ok);
      if (res.ok) {
        const data = await res.json();
        console.log('[AdminTab] Costs data received:', data);
        setCostData(data);
      } else {
        console.error('[AdminTab] Costs fetch failed with status:', res.status);
      }
    } catch (e) {
      console.error('[AdminTab] Failed to fetch cost data:', e);
    }
  }, []);

  const fetchCostHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cost-history');
      if (res.ok) {
        const data = await res.json();
        setCostHistory(data);
      }
    } catch (e) {
      console.error('Failed to fetch cost history:', e);
    }
  }, []);

  const fetchPricing = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pricing');
      if (res.ok) {
        const data = await res.json();
        setPricingInfo(data);
      }
    } catch (e) {
      console.error('Failed to fetch pricing info:', e);
    }
  }, []);

  const fetchRateLimits = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/rate-limits');
      if (res.ok) {
        const data = await res.json();
        setRateLimits(data.limits);
        // Initialize form with current values
        setConfigForm(prev => ({
          ...prev,
          freeTierAnalyses: data.limits.free.analysesPerDay,
          freeTierCalls: data.limits.free.claudeCallsPerHour,
          proTierAnalyses: data.limits.pro.analysesPerDay,
          proTierCalls: data.limits.pro.claudeCallsPerHour,
        }));
      }
    } catch (e) {
      console.error('Failed to fetch rate limits:', e);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      // Get session token
      const { data: { session } } = await (await import('../src/lib/supabase')).supabase.auth.getSession();
      if (!session) {
        console.error('[AdminTab] No session found when fetching users');
        return;
      }

      console.log('[AdminTab] Fetching users from /api/user/all...');
      const res = await fetch('/api/user/all', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      console.log('[AdminTab] Users response:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('[AdminTab] Users data received:', data);
        setUsersData(data);
      } else {
        const errorText = await res.text();
        console.error('[AdminTab] Failed to fetch users:', res.status, errorText);
      }
      
      // Fetch user call statistics
      console.log('[AdminTab] Fetching user stats from /api/admin/user-stats...');
      const statsRes = await fetch('/api/admin/user-stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        console.log('[AdminTab] User stats received:', statsData);
        setUserStats(statsData);
      }
    } catch (e) {
      console.error('[AdminTab] Failed to fetch users:', e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchCosts();
    fetchCostHistory();
    fetchPricing();
    fetchRateLimits();
    if (activeSubTab === 'users') {
      fetchUsers();
    }
    const interval = setInterval(() => {
      fetchMetrics();
      fetchCosts();
      fetchCostHistory();
      if (activeSubTab === 'users') {
        fetchUsers();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics, fetchCosts, fetchCostHistory, fetchPricing, fetchRateLimits, fetchUsers, activeSubTab]);

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

  const handleSaveConfig = async () => {
    try {
      // Update daily budget
      await fetch('/api/admin/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: configForm.dailyBudget }),
      });

      // Update RentCast cost
      await fetch('/api/admin/rentcast-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costPerRequest: configForm.rentcastCost }),
      });

      // Update free tier limits
      await fetch('/api/admin/rate-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: 'free',
          analysesPerDay: configForm.freeTierAnalyses,
          claudeCallsPerHour: configForm.freeTierCalls,
        }),
      });

      // Update pro tier limits
      await fetch('/api/admin/rate-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: 'pro',
          analysesPerDay: configForm.proTierAnalyses,
          claudeCallsPerHour: configForm.proTierCalls,
        }),
      });

      // Refresh data
      await fetchCosts();
      await fetchRateLimits();
      setShowConfigModal(false);
    } catch (e) {
      console.error('Failed to save config:', e);
      alert('Failed to save configuration');
    }
  };

  const handleUpdateUserRole = async (userId: string, updates: { tier?: string; is_admin?: boolean }) => {
    try {
      const { data: { session } } = await (await import('../src/lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/user/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        // Refresh users data
        await fetchUsers();
      } else {
        alert('Failed to update user');
      }
    } catch (e) {
      console.error('Failed to update user role:', e);
      alert('Failed to update user');
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
  
  // Individual cache hit rates
  const claudeCacheHitRate = metrics.cache.claude.hits + metrics.cache.claude.misses > 0
    ? ((metrics.cache.claude.hits / (metrics.cache.claude.hits + metrics.cache.claude.misses)) * 100).toFixed(1)
    : '0.0';
  
  const rentcastCacheHitRate = metrics.cache.rentcast.hits + metrics.cache.rentcast.misses > 0
    ? ((metrics.cache.rentcast.hits / (metrics.cache.rentcast.hits + metrics.cache.rentcast.misses)) * 100).toFixed(1)
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
          >
            <HardDrive size={14} /> Configure
          </button>
          <button
            onClick={fetchMetrics}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'costs', label: 'API Costs', icon: DollarSign },
          { id: 'performance', label: 'Performance', icon: TrendingUp },
          { id: 'config', label: 'Configuration', icon: HardDrive },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSubTab(id as AdminSubTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeSubTab === id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* OVERVIEW TAB                                                        */}
      {/* ================================================================== */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
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
      {/* SECTION 2C: API Cost Tracking                                      */}
      {/* ================================================================== */}
      {costData ? (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-slate-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">API Cost Tracking</h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                costData.status === 'exceeded' ? 'bg-red-100 text-red-600' :
                costData.status === 'warning' ? 'bg-amber-100 text-amber-600' :
                'bg-emerald-100 text-emerald-600'
              }`}>
                {costData.status === 'exceeded' ? 'Budget Exceeded' :
                 costData.status === 'warning' ? 'Approaching Limit' :
                 'Within Budget'}
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {/* Quick Access Links */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg border border-slate-200">
              <div className="flex-1">
                <div className="text-xs font-black uppercase tracking-wider text-slate-600 mb-2">API Dashboard Quick Links</div>
                <div className="flex items-center gap-3">
                  <a
                    href="https://console.anthropic.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink size={14} />
                    Claude Dashboard
                  </a>
                  <a
                    href="https://console.anthropic.com/settings/billing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-black uppercase hover:bg-blue-600 transition-colors"
                  >
                    <DollarSign size={14} />
                    Claude Billing
                  </a>
                  <a
                    href="https://app.rentcast.io/app/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-black uppercase hover:bg-emerald-700 transition-colors"
                  >
                    <ExternalLink size={14} />
                    RentCast Dashboard
                  </a>
                </div>
              </div>
            </div>

            {/* Budget Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-black mb-1">Today's Total</div>
                <div className="text-2xl font-black text-slate-900">${costData.today.totalCost.toFixed(2)}</div>
                <div className="text-[10px] text-slate-500 mt-1">{costData.today.totalCalls} calls</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-xs text-blue-600 uppercase tracking-wider font-black mb-1">Claude API</div>
                <div className="text-2xl font-black text-blue-900">${costData.today.claudeCost.toFixed(2)}</div>
                <div className="text-[10px] text-blue-600 mt-1">{costData.today.claudeCalls} calls</div>
              </div>
              <div className="bg-emerald-50 p-4 rounded-lg">
                <div className="text-xs text-emerald-600 uppercase tracking-wider font-black mb-1">RentCast API</div>
                <div className="text-2xl font-black text-emerald-900">${costData.today.rentcastCost.toFixed(2)}</div>
                <div className="text-[10px] text-emerald-600 mt-1">{costData.today.rentcastCalls} calls</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-black mb-1">Daily Budget</div>
                <div className="text-2xl font-black text-slate-900">${costData.dailyBudget.toFixed(2)}</div>
                <div className={`text-[10px] mt-1 ${costData.remaining > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ${costData.remaining.toFixed(2)} left
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-black mb-1">Usage</div>
                <div className={`text-2xl font-black ${
                  costData.budgetPercent >= 100 ? 'text-red-600' :
                  costData.budgetPercent >= 80 ? 'text-amber-600' :
                  'text-emerald-600'
                }`}>
                  {costData.budgetPercent.toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 mt-1">of budget</div>
              </div>
            </div>

            {/* Zero State Message */}
            {costData.today.totalCost === 0 && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600 text-center">
                  <strong>No API costs yet today.</strong> Costs will appear here after you run property analyses.
                </p>
              </div>
            )}

            {/* Budget Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                <span className="text-slate-600">Budget Progress</span>
                <span className="text-slate-500">
                  Claude: ${costData.today.claudeCost.toFixed(2)} • RentCast: ${costData.today.rentcastCost.toFixed(2)}
                </span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    costData.budgetPercent >= 100 ? 'bg-red-500' :
                    costData.budgetPercent >= 80 ? 'bg-amber-500' :
                    'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(costData.budgetPercent, 100)}%` }}
                />
              </div>
            </div>

            {/* API Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              {/* Claude Cost by Model */}
              {Object.keys(costData.today.byModel).length > 0 && (
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-slate-600 mb-2">Claude by Model</div>
                  <div className="space-y-2">
                    {Object.entries(costData.today.byModel).map(([model, data]: [string, any]) => (
                      <div key={model} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Cpu size={14} className="text-blue-400" />
                          <div>
                            <div className="text-xs font-black text-blue-900">{model}</div>
                            <div className="text-[10px] text-blue-600">{data.calls} calls • {data.inputTokens.toLocaleString()} in / {data.outputTokens.toLocaleString()} out</div>
                          </div>
                        </div>
                        <div className="text-sm font-black text-blue-900">${data.cost.toFixed(3)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RentCast Cost by Endpoint */}
              {Object.keys(costData.today.byRentCastEndpoint).length > 0 && (
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-slate-600 mb-2">RentCast by Endpoint</div>
                  <div className="space-y-2">
                    {Object.entries(costData.today.byRentCastEndpoint).map(([endpoint, data]: [string, any]) => (
                      <div key={endpoint} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Database size={14} className="text-emerald-400" />
                          <div>
                            <div className="text-xs font-black text-emerald-900">{endpoint.substring(0, 30)}{endpoint.length > 30 ? '...' : ''}</div>
                            <div className="text-[10px] text-emerald-600">{data.calls} calls</div>
                          </div>
                        </div>
                        <div className="text-sm font-black text-emerald-900">${data.cost.toFixed(3)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-slate-400" />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">API Cost Tracking</h3>
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-500">Loading cost data...</p>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SECTION 2D: API Cost History Graph                                 */}
      {/* ================================================================== */}
      {costHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-slate-400" />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Cost History (Last 7 Days)</h3>
            </div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={costHistory.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  tick={{ fontSize: 11, fontWeight: 600 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis 
                  stroke="#64748b"
                  tick={{ fontSize: 11, fontWeight: 600 }}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <ChartTooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                  formatter={(value: any) => [`$${value.toFixed(2)}`, '']}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalCost" 
                  stroke="#64748b" 
                  strokeWidth={2}
                  name="Total Cost"
                  dot={{ fill: '#64748b', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="claudeCost" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Claude API"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="rentcastCost" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="RentCast API"
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
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
      )}

      {/* ================================================================== */}
      {/* USERS TAB                                                           */}
      {/* ================================================================== */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">User Management</h2>
              <p className="text-sm text-slate-600 mt-1">Manage user accounts, tiers, and permissions</p>
            </div>
            <button
              onClick={fetchUsers}
              disabled={loadingUsers}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loadingUsers ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-900">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-900">Tier</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-900">Admin</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-900">Analyses Today</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-900">Claude Calls/Hr</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-900">Total API Calls</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-900">Last Active</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-900">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                        Loading users...
                      </td>
                    </tr>
                  ) : usersData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    usersData.map((user) => {
                      // Find matching user stats
                      const stats = userStats.find(s => s.userId === user.id) || {
                        totalCalls: 0,
                        claudeCalls: 0,
                        analysisCalls: 0,
                        rentcastCalls: 0
                      };
                      
                      return (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-900">{user.email}</td>
                          <td className="px-4 py-3">
                            <select
                              value={user.tier}
                              onChange={(e) => handleUpdateUserRole(user.id, { tier: e.target.value })}
                              className="px-3 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="free">Free</option>
                              <option value="pro">Pro</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleUpdateUserRole(user.id, { is_admin: !user.is_admin })}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                                user.is_admin
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {user.is_admin ? 'ADMIN' : 'USER'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">{user.analyses_today}</td>
                          <td className="px-4 py-3 text-sm text-slate-900">{user.claude_calls_this_hour}</td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-black text-slate-900">{stats.totalCalls}</div>
                            <div className="text-[10px] text-slate-500">
                              {stats.analysisCalls} analyses • {stats.claudeCalls} Claude
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {user.last_analysis || user.last_claude_call
                              ? new Date(user.last_analysis || user.last_claude_call).toLocaleString()
                              : 'Never'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={20} className="text-blue-600" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-600">Total Users</span>
              </div>
              <div className="text-2xl font-black text-slate-900">{usersData.length}</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={20} className="text-green-600" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-600">Free Users</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {usersData.filter(u => u.tier === 'free').length}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={20} className="text-purple-600" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-600">Pro Users</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {usersData.filter(u => u.tier === 'pro').length}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={20} className="text-red-600" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-600">Admins</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {usersData.filter(u => u.is_admin).length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* COSTS TAB                                                           */}
      {/* ================================================================== */}
      {activeSubTab === 'costs' && (
        <div className="space-y-6">
          <ApiCostChart />
          
          {/* Quick Access Links */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4">External Dashboards</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <a
                href="https://console.anthropic.com/settings/usage"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors group"
              >
                <div>
                  <div className="text-sm font-black text-blue-900">Claude Dashboard</div>
                  <div className="text-xs text-blue-600 mt-1">View usage & billing</div>
                </div>
                <ExternalLink size={16} className="text-blue-600 group-hover:translate-x-0.5 transition-transform" />
              </a>
              
              <a
                href="https://console.anthropic.com/settings/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors group"
              >
                <div>
                  <div className="text-sm font-black text-indigo-900">Claude Billing</div>
                  <div className="text-xs text-indigo-600 mt-1">Payment & invoices</div>
                </div>
                <ExternalLink size={16} className="text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
              </a>
              
              <a
                href="https://app.rentcast.io/app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors group"
              >
                <div>
                  <div className="text-sm font-black text-emerald-900">RentCast Dashboard</div>
                  <div className="text-xs text-emerald-600 mt-1">API usage & limits</div>
                </div>
                <ExternalLink size={16} className="text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* PERFORMANCE TAB                                                     */}
      {/* ================================================================== */}
      {activeSubTab === 'performance' && (
        <div className="space-y-6">
          {/* API Endpoint Usage */}
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-slate-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">API Endpoint Performance</h3>
              </div>
            </div>
            {metrics && metrics.api.endpoints.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest">Endpoint</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Calls</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Errors</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Avg Time</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">P95 Time</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Cache Hit %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.api.endpoints.map((ep, idx) => (
                      <tr key={idx} className={`border-b border-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-900 font-bold">{ep.endpoint}</td>
                        <td className="px-4 py-3 text-center text-sm font-black text-slate-900">{ep.callCount}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-black ${ep.errorCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {ep.errorCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-black text-slate-900">{formatTime(ep.avgResponseTimeMs)}</td>
                        <td className="px-4 py-3 text-right text-sm font-black text-slate-900">{formatTime(ep.p95ResponseTimeMs)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-black ${ep.cacheHitRate > 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {ep.cacheHitRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-slate-500">No endpoint data available yet</div>
            )}
          </div>

          {/* Cache Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Database size={16} className="text-blue-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Claude Cache</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-black">Size</span>
                  <span className="font-black text-slate-900">{metrics?.cache.claude.size || 0} entries</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-black">Hits</span>
                  <span className="font-black text-emerald-600">{metrics?.cache.claude.hits || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-black">Misses</span>
                  <span className="font-black text-amber-600">{metrics?.cache.claude.misses || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-black">Hit Rate</span>
                  <span className="font-black text-blue-600">{claudeCacheHitRate}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Database size={16} className="text-emerald-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">RentCast Cache</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-black">Size</span>
                  <span className="font-black text-slate-900">{metrics?.cache.rentcast.size || 0} entries</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-black">Hits</span>
                  <span className="font-black text-emerald-600">{metrics?.cache.rentcast.hits || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-black">Misses</span>
                  <span className="font-black text-amber-600">{metrics?.cache.rentcast.misses || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-black">Hit Rate</span>
                  <span className="font-black text-emerald-600">{rentcastCacheHitRate}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* CONFIGURATION TAB                                                   */}
      {/* ================================================================== */}
      {activeSubTab === 'config' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 mb-6">System Configuration</h3>
            <button
              onClick={() => setShowConfigModal(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-lg text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
            >
              <HardDrive size={16} />
              Open Configuration Panel
            </button>
          </div>

          {/* Server Info */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Server size={16} className="text-slate-400" />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Server Information</h3>
            </div>
            {metrics && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-black">Node Version</span>
                  <span className="font-black text-slate-900">{metrics.server.nodeVersion}</span>
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Admin Configuration</h3>
                  <p className="text-xs text-slate-500 mt-1">Configure API costs, budgets, and rate limits</p>
                </div>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XCircle size={20} className="text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Budget Settings */}
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3">Budget Settings</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1">Daily Budget (USD)</label>
                    <input
                      type="number"
                      value={configForm.dailyBudget}
                      onChange={(e) => setConfigForm({ ...configForm, dailyBudget: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-black"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* RentCast Pricing */}
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3">RentCast Pricing</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1">Cost Per Request (USD)</label>
                    <input
                      type="number"
                      value={configForm.rentcastCost}
                      onChange={(e) => setConfigForm({ ...configForm, rentcastCost: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-black"
                      step="0.001"
                      min="0"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Developer: $0.20 • Foundation: $0.06 • Growth: $0.03 • Scale: $0.015
                    </p>
                  </div>
                </div>
              </div>

              {/* Claude Pricing (Info Only) */}
              {pricingInfo && (
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3">Claude API Pricing (Read-Only)</h4>
                  <div className="space-y-2 bg-slate-50 p-4 rounded-lg">
                    {Object.entries(pricingInfo.claude).map(([model, pricing]: [string, any]) => (
                      <div key={model} className="flex items-center justify-between text-xs">
                        <span className="font-black text-slate-900">{model}</span>
                        <span className="text-slate-600">
                          ${pricing.inputPerMToken}/M in • ${pricing.outputPerMToken}/M out
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rate Limits - Free Tier */}
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3">Free Tier Limits</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1">Analyses Per Day</label>
                    <input
                      type="number"
                      value={configForm.freeTierAnalyses}
                      onChange={(e) => setConfigForm({ ...configForm, freeTierAnalyses: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-black"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1">Claude Calls Per Hour</label>
                    <input
                      type="number"
                      value={configForm.freeTierCalls}
                      onChange={(e) => setConfigForm({ ...configForm, freeTierCalls: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-black"
                      min="1"
                    />
                  </div>
                </div>
              </div>

              {/* Rate Limits - Pro Tier */}
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3">Pro Tier Limits</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1">Analyses Per Day</label>
                    <input
                      type="number"
                      value={configForm.proTierAnalyses}
                      onChange={(e) => setConfigForm({ ...configForm, proTierAnalyses: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-black"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1">Claude Calls Per Hour</label>
                    <input
                      type="number"
                      value={configForm.proTierCalls}
                      onChange={(e) => setConfigForm({ ...configForm, proTierCalls: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-black"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-black uppercase transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-black uppercase hover:bg-slate-800 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTab;
