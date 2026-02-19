// Load environment variables FIRST, before any imports that use them
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Now import everything else
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { claudeCache, rentcastCache } from './cache.js';
import { authMiddleware as oldAuthMiddleware, createSession, startSessionCleanup, TIER_LIMITS as OLD_TIER_LIMITS, checkUsageLimits as oldCheckUsageLimits, incrementUsage as oldIncrementUsage } from './auth.js';
import { authMiddleware, requireAuth, requireAdmin, checkUsageLimits, incrementUsage, TIER_LIMITS, isInTrial, loadTierLimitsFromDatabase, saveTierLimitsToDatabase } from './supabaseAuth.js';
import { metricsMiddleware, metricsStore } from './metrics.js';
import { claudeQueue } from './claudeQueue.js';
import { costTracker } from './databaseCostTracker.js';
import { getCachedClaudeAnalysis, setCachedClaudeAnalysis } from './claudeAnalysisCache.js';
import Stripe from 'stripe';
import testRoutes from './test-routes.js';
import userRoutes from './routes/user.js';
import stripeRoutes from './routes/stripe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy (Railway, etc.) so rate limiting and req.ip use X-Forwarded-For correctly
app.set('trust proxy', 1);

// Health check BEFORE any middleware — Railway probes this
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Stripe webhook needs raw body for signature verification — must come before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // CSP breaks inline styles from Tailwind — configure properly for prod
}));

// CORS — restrict to known origins in production
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : [
      'http://localhost:3000', 
      'http://localhost:3001', 
      'http://localhost:3002',
      'http://10.1.10.102:3001', // Network IP from Vite
    ];
app.use(cors({ 
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(authMiddleware);
app.use(metricsMiddleware);

// Note: Old session cleanup is deprecated, Supabase handles auth sessions
// startSessionCleanup();

// ============================================================================
// API KEY VALIDATION
// ============================================================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY;

if (!ANTHROPIC_API_KEY || !ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
  console.error('❌ ANTHROPIC_API_KEY is missing or invalid. Set it in .env');
  process.exit(1);
}
if (!RENTCAST_API_KEY) {
  console.warn('⚠️  RENTCAST_API_KEY is missing. RentCast endpoints will return errors.');
}

const isDev = process.env.NODE_ENV !== 'production';
if (isDev) console.log('✅ API keys loaded successfully');

// ============================================================================
// ANTHROPIC CLIENT (server-side only — never exposed to browser)
// ============================================================================

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ============================================================================
// RATE LIMITING
// ============================================================================

// General API rate limit: 30 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.', retryAfter: 60 },
});

// Claude-specific rate limit: 10 Claude calls per minute per IP
const claudeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Claude API rate limit reached. Please wait a moment.', retryAfter: 60 },
});

// Heavy analysis rate limit: 3 full analyses per 10 minutes per IP
const analysisLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'You\'ve reached your analysis limit. Upgrade to Pro for unlimited analyses.', retryAfter: 600 },
});

// Admin routes: require auth + admin (authMiddleware is already global)
app.get('/api/admin/metrics', requireAuth, requireAdmin, async (_req, res) => {
  if (isDev) console.log('[Server] Admin metrics requested');
  const snapshot = await metricsStore.getSnapshot();
  res.json(snapshot);
});

app.get('/api/admin/queue', requireAuth, requireAdmin, (_req, res) => {
  if (isDev) console.log('[Server] Queue stats requested');
  res.json(claudeQueue.getStats());
});

app.get('/api/admin/costs', requireAuth, requireAdmin, async (_req, res) => {
  if (isDev) console.log('[Server] Cost stats requested');
  const summary = await costTracker.getSummary();
  res.json(summary);
});

app.get('/api/admin/cost-history', requireAuth, requireAdmin, async (_req, res) => {
  if (isDev) console.log('[Server] Cost history requested');
  const history = await costTracker.getHistory();
  res.json(history);
});

app.get('/api/admin/user-stats', requireAuth, requireAdmin, async (_req, res) => {
  if (isDev) console.log('[Server] User stats requested');
  const stats = await costTracker.getUserCallStats();
  res.json(stats);
});

app.post('/api/admin/budget', requireAuth, requireAdmin, (req, res) => {
  const { budget } = req.body;
  if (typeof budget !== 'number' || budget <= 0) {
    return res.status(400).json({ error: 'Invalid budget value' });
  }
  costTracker.setDailyBudget(budget);
  res.json({ success: true, budget });
});

app.get('/api/admin/pricing', requireAuth, requireAdmin, (_req, res) => {
  res.json(costTracker.getPricingInfo());
});

app.post('/api/admin/rentcast-cost', requireAuth, requireAdmin, (req, res) => {
  const { costPerRequest } = req.body;
  if (typeof costPerRequest !== 'number' || costPerRequest < 0) {
    return res.status(400).json({ error: 'Invalid cost per request value' });
  }
  costTracker.setRentCastCostPerRequest(costPerRequest);
  res.json({ success: true, costPerRequest });
});

app.get('/api/admin/rate-limits', requireAuth, requireAdmin, (_req, res) => {
  res.json({ limits: TIER_LIMITS });
});

app.post('/api/admin/rate-limits', requireAuth, requireAdmin, async (req, res) => {
  const { tier, analysesPerDay, claudeCallsPerHour } = req.body;

  if (!tier || !['free', 'pro'].includes(tier)) {
    return res.status(400).json({ error: 'Invalid tier. Must be "free" or "pro"' });
  }

  if (typeof analysesPerDay !== 'number' || analysesPerDay < 1) {
    return res.status(400).json({ error: 'Invalid analysesPerDay value' });
  }

  if (typeof claudeCallsPerHour !== 'number' || claudeCallsPerHour < 1) {
    return res.status(400).json({ error: 'Invalid claudeCallsPerHour value' });
  }

  TIER_LIMITS[tier as 'free' | 'pro'] = {
    analysesPerDay,
    claudeCallsPerHour,
  };

  // Persist to database so limits survive server restart
  await saveTierLimitsToDatabase(TIER_LIMITS);

  res.json({ success: true, limits: TIER_LIMITS });
});

app.get('/api/admin/stripe', requireAuth, requireAdmin, async (_req, res) => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return res.json({ configured: false, activeSubscriptions: 0, mrrCents: 0, dashboardUrl: null });
  }
  try {
    const stripe = new Stripe(key);
    const subs = await stripe.subscriptions.list({ status: 'active', limit: 100 });
    let mrrCents = 0;
    for (const sub of subs.data) {
      const item = sub.items.data[0];
      if (!item?.price?.recurring) continue;
      const amount = (item.price.unit_amount ?? 0) * (item.quantity ?? 1);
      const interval = item.price.recurring.interval;
      const intervalCount = item.price.recurring.interval_count ?? 1;
      if (interval === 'month') mrrCents += amount * intervalCount;
      else if (interval === 'year') mrrCents += (amount * intervalCount) / 12;
      else if (interval === 'week') mrrCents += (amount * intervalCount * 52) / 12;
      else if (interval === 'day') mrrCents += (amount * intervalCount * 365) / 12;
    }
    const dashboardUrl = key.startsWith('sk_live_')
      ? 'https://dashboard.stripe.com'
      : 'https://dashboard.stripe.com/test';
    res.json({
      configured: true,
      activeSubscriptions: subs.data.length,
      mrrCents: Math.round(mrrCents),
      dashboardUrl,
    });
  } catch (err: any) {
    if (isDev) console.error('[Admin] Stripe fetch error:', err?.message);
    res.status(500).json({ configured: true, error: err?.message || 'Stripe API error' });
  }
});

/**
 * GET /api/check-analysis-limit
 * Pre-flight check: Can the user run an analysis?
 * Returns: { canAnalyze: boolean, message?: string, usage?: { analyses: number, limit: number } }
 */
app.get('/api/check-analysis-limit', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    
    // Allow unauthenticated users to check (they're free tier)
    if (!userId) {
      return res.json({ canAnalyze: true });
    }
    
    // Get user profile and check limits
    const profile = (req as any).userProfile;
    if (!profile) {
      if (isDev) console.warn('[Server] No profile for user:', userId);
      return res.json({ canAnalyze: true });
    }
    
    if (isDev) console.log('[Server] Checking analysis limit for user:', userId, 'tier:', profile.tier);
    const check = await checkUsageLimits(userId, 'analysis');
    if (isDev) console.log('[Server] Usage check result:', check);
    
    if (!check.allowed) {
      if (isDev) console.log('[Server] User at limit:', check);
      return res.json({
        canAnalyze: false,
        message: check.message || 'Daily analysis limit reached.',
        showUpgradeLink: profile.tier === 'free',
        usage: check.usage,
        inTrial: isInTrial(profile),
      });
    }
    
    return res.json({
      canAnalyze: true,
      usage: check.usage,
      inTrial: isInTrial(profile),
    });
  } catch (error) {
    if (isDev) console.error('[Server] Error checking analysis limit:', error);
    res.json({ canAnalyze: true }); // Optimistic: allow if check fails
  }
});

app.get('/api/queue/status', (req, res) => {
  const userId = (req as any).userId || 'anonymous';
  const position = claudeQueue.getPosition(userId);
  const estimatedWaitTime = claudeQueue.getEstimatedWaitTime(userId);
  const stats = claudeQueue.getStats();
  
  res.json({
    position,
    estimatedWaitTime,
    queuedJobs: stats.queuedJobs,
    processingJobs: stats.processingJobs,
  });
});

app.post('/api/admin/cache/clear', requireAuth, requireAdmin, async (req, res) => {
  const { target } = req.body || {};

  if (target === 'rentcast' || target === 'all') {
    const { clearAllCache } = await import('./databaseCache.js');
    await clearAllCache();
  }

  if (target === 'claude' || target === 'all') {
    claudeCache.clear();
  }

  res.json({
    success: true,
    cleared: target || 'all',
    cache: {
      claude: claudeCache.size,
      rentcast: rentcastCache.size
    }
  });
});

app.get('/api/admin/cache/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { getCacheStats, getCacheStatsByEndpoint, getPopularCachedProperties } = await import('./databaseCache.js');
    
    const [stats, byEndpoint, popularProperties] = await Promise.all([
      getCacheStats(),
      getCacheStatsByEndpoint(),
      getPopularCachedProperties(10),
    ]);
    
    res.json({
      success: true,
      memory: {
        claude: claudeCache.size,
        rentcast: rentcastCache.size,
      },
      database: stats,
      byEndpoint,
      popularProperties,
    });
  } catch (error: any) {
    if (isDev) console.error('[Admin] Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

app.use('/api', generalLimiter);

// ============================================================================
// TEST ROUTES (DEV ONLY — also disabled if DISABLE_TEST_ROUTES=true)
// ============================================================================
if (isDev && process.env.DISABLE_TEST_ROUTES !== 'true') {
  app.use('/api/test', testRoutes);
}

// ============================================================================
// USER ROUTES (AUTHENTICATED)
// ============================================================================
app.use('/api/user', userRoutes);

// ============================================================================
// STRIPE ROUTES (PAYMENTS)
// ============================================================================
app.use('/api/stripe', stripeRoutes);

// ============================================================================
// CLAUDE PROXY ROUTES
// ============================================================================

/**
 * POST /api/claude/messages
 * Generic proxy for Claude messages.create()
 * Body: { model, max_tokens, messages, tools?, system? }
 * Returns: Claude API response content array
 */
app.post('/api/claude/messages', authMiddleware, claudeLimiter, async (req, res) => {
  try {
    const { model, max_tokens, messages, tools, system } = req.body;

    if (!model || !max_tokens || !messages) {
      return res.status(400).json({ error: 'Missing required fields: model, max_tokens, messages' });
    }

    // Get user info from auth middleware
    const userId = (req as any).user?.id || 'anonymous';
    const tier = (req as any).userProfile?.tier || 'free';

    // Check usage limits (Supabase-based)
    if (userId !== 'anonymous') {
      const limitCheck = await checkUsageLimits(userId, 'claude');
      if (!limitCheck.allowed) {
        return res.status(429).json({
          error: limitCheck.message || 'Rate limit exceeded',
          type: 'usage_limit_exceeded',
          usage: limitCheck.usage
        });
      }
    }

    // Build cache key from request payload
    const cacheKey = `claude:${JSON.stringify({ model, messages, tools, system })}`;
    const cached = claudeCache.get(cacheKey);
    if (cached) {
      if (isDev) console.log(`[Server] Cache HIT for Claude request`);
      (res as any).__cached = true;
      return res.json({ content: cached, cached: true });
    }

    if (isDev) console.log(`[Server] Proxying Claude request: model=${model}, max_tokens=${max_tokens}`);

    // Increment usage counter (Supabase-based)
    if (userId !== 'anonymous') {
      await incrementUsage(userId, 'claude');
    }

    // Queue the Claude API call
    const result = await claudeQueue.enqueue(userId, tier, async () => {
      const createParams: any = { model, max_tokens, messages };
      if (tools) createParams.tools = tools;
      if (system) createParams.system = system;

      const response = await anthropic.messages.create(createParams);
      
      // Track cost
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      const cost = await costTracker.recordClaude(model, inputTokens, outputTokens, '/api/claude/messages', userId);
      
      if (isDev) console.log(`[CostTracker] Request cost: $${cost.toFixed(4)} (${inputTokens} in, ${outputTokens} out)`);
      
      return response.content;
    });

    // Cache the response content
    claudeCache.set(cacheKey, result);

    return res.json({ content: result, cached: false });
  } catch (error: any) {
    if (isDev) console.error('[Server] Claude API error:', error.status || error.message);

    // Pass through rate limit errors so client can handle countdown
    if (error.status === 429) {
      return res.status(429).json({
        error: 'Claude API rate limit exceeded',
        retryAfter: error.headers?.['retry-after'] || 60,
        type: 'rate_limit_error',
      });
    }

    return res.status(error.status || 500).json({
      error: 'Claude API call failed',
      type: 'api_error',
    });
  }
});

/**
 * POST /api/claude/analysis
 * Requires sign-in. Stricter rate limit for full property analysis (the most expensive call).
 */
app.post('/api/claude/analysis', authMiddleware, requireAuth, analysisLimiter, async (req, res) => {
  try {
    const { model, max_tokens, messages, tools, system } = req.body;

    if (!model || !max_tokens || !messages) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = (req as any).user.id;
    const tier = (req as any).userProfile?.tier || 'free';

    // Extract address from messages for cache key (before any limit checks)
    let addressForCache = 'unknown';
    try {
      const userMessage = messages.find((m: any) => m.role === 'user');
      if (userMessage && userMessage.content) {
        const addressMatch = userMessage.content.match(/address[:\s]+([^\n,]+)/i);
        if (addressMatch) {
          addressForCache = addressMatch[1].trim().toLowerCase().replace(/\s+/g, ' ');
        }
      }
    } catch (e) {
      addressForCache = 'fallback';
    }

    const cacheKey = `analysis:${addressForCache}:${model}`;
    const cached = await getCachedClaudeAnalysis(cacheKey);
    if (cached) {
      if (isDev) console.log(`[Server] Cache HIT for analysis request: ${addressForCache}`);
      (res as any).__cached = true;
      return res.json({ content: cached, cached: true });
    }

    // Only enforce limits when we're about to run a new (non-cached) analysis
    const analysisCheck = await checkUsageLimits(userId, 'analysis');
    if (!analysisCheck.allowed) {
      return res.status(429).json({
        error: analysisCheck.message || 'Daily analysis limit exceeded',
        type: 'usage_limit_exceeded',
        usage: analysisCheck.usage
      });
    }

    const claudeCheck = await checkUsageLimits(userId, 'claude');
    if (!claudeCheck.allowed) {
      return res.status(429).json({
        error: claudeCheck.message || 'Hourly Claude limit exceeded',
        type: 'usage_limit_exceeded',
        usage: claudeCheck.usage
      });
    }

    if (isDev) console.log(`[Server] Cache MISS - Proxying analysis request for: ${addressForCache}`);

    await incrementUsage(userId, 'analysis');
    await incrementUsage(userId, 'claude');

    // Queue the call
    const result = await claudeQueue.enqueue(userId, tier, async () => {
      const createParams: any = { model, max_tokens, messages };
      if (tools) createParams.tools = tools;
      if (system) createParams.system = system;

      const response = await anthropic.messages.create(createParams);
      
      // Track cost
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      const cost = await costTracker.recordClaude(model, inputTokens, outputTokens, '/api/claude/analysis', userId);
      
      if (isDev) console.log(`[CostTracker] Analysis cost: $${cost.toFixed(4)} (${inputTokens} in, ${outputTokens} out)`);
      
      return response.content;
    });

    // Save to both memory and database (database persists across restarts)
    await setCachedClaudeAnalysis(cacheKey, addressForCache, model, result);

    return res.json({ content: result, cached: false });
  } catch (error: any) {
    if (isDev) console.error('[Server] Claude analysis error:', error.status || error.message);

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Claude API rate limit exceeded',
        retryAfter: error.headers?.['retry-after'] || 60,
        type: 'rate_limit_error',
      });
    }

    return res.status(error.status || 500).json({
      error: 'Claude API call failed',
      type: 'api_error',
    });
  }
});

// ============================================================================
// RENTCAST PROXY ROUTES
// ============================================================================

/**
 * RentCast passthrough proxy — intercepts all GET /api/rentcast/... requests.
 * Strips /api/rentcast/ prefix and forwards to https://api.rentcast.io/v1/...
 * with the server-side API key injected.
 * 
 * Phase 2: Database-backed caching with configurable TTL per endpoint
 */
app.use('/api/rentcast', authMiddleware, async (req, res) => {
  if (!RENTCAST_API_KEY) {
    return res.status(503).json({ error: 'RentCast API key not configured on server' });
  }

  try {
    // req.url = everything after /api/rentcast, e.g. /properties?address=...
    const url = `https://api.rentcast.io/v1${req.url}`;

    // Check database cache (checks memory cache first, then DB)
    const { getCachedResponse, setCachedResponse } = await import('./databaseCache.js');
    const cached = await getCachedResponse(url);
    if (cached) {
      (res as any).__cached = true;
      return res.json(cached);
    }

    if (isDev) console.log(`[Server] Proxying RentCast request: ${req.url}`);

    const response = await fetch(url, {
      headers: {
        'X-Api-Key': RENTCAST_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (isDev) console.error(`[Server] RentCast error: ${response.status} - ${errorText}`);
      // 404 from RentCast (e.g. listings/sale not found): return empty array for list endpoints so app doesn't break
      if (response.status === 404 && (req.url?.includes('/listings') || req.url?.includes('/listing'))) {
        return res.json([]);
      }
      return res.status(response.status).json({
        error: `RentCast API error: ${response.status}`,
      });
    }

    const data = await response.json();

    // Track RentCast API cost
    const userId = (req as any).user?.id || 'anonymous';
    const cost = await costTracker.recordRentCast(req.url, userId);
    if (isDev) console.log(`[CostTracker] RentCast request cost: $${cost.toFixed(4)}`);

    // Cache successful responses (saves to both memory and database)
    await setCachedResponse(url, data, response.status);

    return res.json(data);
  } catch (error: any) {
    if (isDev) console.error('[Server] RentCast proxy error:', error.message);
    return res.status(500).json({ error: 'RentCast proxy request failed' });
  }
});

// ============================================================================
// AUTH ROUTES
// ============================================================================

/**
 * POST /api/auth/session
 * DEPRECATED: Now handled by Supabase Auth
 * Kept for backwards compatibility with old clients
 */
app.post('/api/auth/session', (req, res) => {
  // Return minimal response for anonymous users
  res.json({
    token: 'anonymous',
    userId: 'anonymous',
    tier: 'free',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    limits: TIER_LIMITS['free'],
    deprecated: true,
    message: 'Please use Supabase Auth instead'
  });
});

// ============================================================================
// HEALTH & STATUS
// ============================================================================

app.get('/api/status', (req, res) => {
  if (isDev) {
    res.json({
      status: 'ok',
      user: (req as any).userId,
      tier: (req as any).tier,
      cache: { claude: claudeCache.size, rentcast: rentcastCache.size },
      keys: { anthropic: !!ANTHROPIC_API_KEY, rentcast: !!RENTCAST_API_KEY },
    });
  } else {
    res.json({ status: 'ok' });
  }
});

// ============================================================================
// STATIC FILES — Serve Vite build output in production
// ============================================================================

const distPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback: serve index.html for any non-API route
// Express 5 requires named wildcard params instead of bare '*'
app.get('/{*splat}', (req, res) => {
  // Don't serve index.html for API routes (they'll 404 naturally)
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = parseInt(process.env.PORT || process.env.API_PORT || '3002', 10);

app.listen(PORT, '0.0.0.0', async () => {
  // Load admin settings from database on startup
  await loadTierLimitsFromDatabase();
  
  if (isDev) {
    console.log(`\n🚀 Analyze My Property API Server running on http://0.0.0.0:${PORT}`);
    console.log(`   Claude proxy:   POST http://localhost:${PORT}/api/claude/messages`);
    console.log(`   Analysis proxy: POST http://localhost:${PORT}/api/claude/analysis`);
    console.log(`   RentCast proxy: GET  http://localhost:${PORT}/api/rentcast/*`);
    console.log(`   Admin metrics:  GET  http://localhost:${PORT}/api/admin/metrics`);
    console.log(`   Health check:   GET  http://localhost:${PORT}/api/health`);
    console.log(`   Rate limits:    30 req/min general, 10 req/min Claude, 3/10min analysis\n`);
  }
});
