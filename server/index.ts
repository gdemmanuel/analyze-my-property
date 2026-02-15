import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { claudeCache, rentcastCache } from './cache.js';
import { authMiddleware as oldAuthMiddleware, createSession, startSessionCleanup, TIER_LIMITS as OLD_TIER_LIMITS, checkUsageLimits as oldCheckUsageLimits, incrementUsage as oldIncrementUsage } from './auth.js';
import { authMiddleware, checkUsageLimits, incrementUsage, TIER_LIMITS } from './supabaseAuth.js';
import { metricsMiddleware, metricsStore } from './metrics.js';
import { claudeQueue } from './claudeQueue.js';
import { costTracker } from './costTracker.js';
import testRoutes from './test-routes.js';
import userRoutes from './routes/user.js';

// Load environment variables from .env (only in development, Railway injects them directly in production)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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
  message: { error: 'Analysis rate limit reached. Please wait before running another full analysis.', retryAfter: 600 },
});

// Admin routes registered BEFORE rate limiter to avoid any interference
app.get('/api/admin/metrics', (_req, res) => {
  console.log('[Server] Admin metrics requested');
  res.json(metricsStore.getSnapshot());
});

app.get('/api/admin/queue', (_req, res) => {
  console.log('[Server] Queue stats requested');
  res.json(claudeQueue.getStats());
});

app.get('/api/admin/costs', (_req, res) => {
  console.log('[Server] Cost stats requested');
  res.json(costTracker.getSummary());
});

app.get('/api/admin/cost-history', (_req, res) => {
  console.log('[Server] Cost history requested');
  res.json(costTracker.getHistory());
});

app.post('/api/admin/budget', (req, res) => {
  const { budget } = req.body;
  if (typeof budget !== 'number' || budget <= 0) {
    return res.status(400).json({ error: 'Invalid budget value' });
  }
  costTracker.setDailyBudget(budget);
  res.json({ success: true, budget });
});

app.get('/api/admin/pricing', (_req, res) => {
  res.json(costTracker.getPricingInfo());
});

app.post('/api/admin/rentcast-cost', (req, res) => {
  const { costPerRequest } = req.body;
  if (typeof costPerRequest !== 'number' || costPerRequest < 0) {
    return res.status(400).json({ error: 'Invalid cost per request value' });
  }
  costTracker.setRentCastCostPerRequest(costPerRequest);
  res.json({ success: true, costPerRequest });
});

app.get('/api/admin/rate-limits', (_req, res) => {
  res.json({ limits: TIER_LIMITS });
});

app.post('/api/admin/rate-limits', (req, res) => {
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
  
  (TIER_LIMITS as any)[tier] = { analysesPerDay, claudeCallsPerHour };
  res.json({ success: true, limits: TIER_LIMITS });
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

app.post('/api/admin/cache/clear', (req, res) => {
  const { target } = req.body || {};
  if (target === 'claude' || target === 'all') claudeCache.clear();
  if (target === 'rentcast' || target === 'all') rentcastCache.clear();
  res.json({ success: true, cleared: target || 'all', cache: { claude: claudeCache.size, rentcast: rentcastCache.size } });
});

app.use('/api', generalLimiter);

// ============================================================================
// TEST ROUTES (DEV ONLY)
// ============================================================================
app.use('/api/test', testRoutes);

// ============================================================================
// USER ROUTES (AUTHENTICATED)
// ============================================================================
app.use('/api/user', userRoutes);

// ============================================================================
// CLAUDE PROXY ROUTES
// ============================================================================

/**
 * POST /api/claude/messages
 * Generic proxy for Claude messages.create()
 * Body: { model, max_tokens, messages, tools?, system? }
 * Returns: Claude API response content array
 */
app.post('/api/claude/messages', claudeLimiter, async (req, res) => {
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
      const cost = costTracker.recordClaude(model, inputTokens, outputTokens, '/api/claude/messages', userId);
      
      if (isDev) console.log(`[CostTracker] Request cost: $${cost.toFixed(4)} (${inputTokens} in, ${outputTokens} out)`);
      
      return response.content;
    });

    // Cache the response content
    claudeCache.set(cacheKey, result);

    return res.json({ content: result, cached: false });
  } catch (error: any) {
    console.error('[Server] Claude API error:', error.status || error.message);

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
 * Stricter rate limit for full property analysis (the most expensive call)
 */
app.post('/api/claude/analysis', analysisLimiter, async (req, res) => {
  try {
    const { model, max_tokens, messages, tools, system } = req.body;

    if (!model || !max_tokens || !messages) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user info from auth middleware
    const userId = (req as any).user?.id || 'anonymous';
    const tier = (req as any).userProfile?.tier || 'free';

    // Check BOTH analysis AND Claude limits
    if (userId !== 'anonymous') {
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
    }

    // Build cache key
    const cacheKey = `analysis:${JSON.stringify({ model, messages, tools, system })}`;
    const cached = claudeCache.get(cacheKey);
    if (cached) {
      if (isDev) console.log(`[Server] Cache HIT for analysis request`);
      (res as any).__cached = true;
      return res.json({ content: cached, cached: true });
    }

    if (isDev) console.log(`[Server] Proxying analysis request`);

    // Increment BOTH counters
    if (userId !== 'anonymous') {
      await incrementUsage(userId, 'analysis');
      await incrementUsage(userId, 'claude');
    }

    // Queue the call
    const result = await claudeQueue.enqueue(userId, tier, async () => {
      const createParams: any = { model, max_tokens, messages };
      if (tools) createParams.tools = tools;
      if (system) createParams.system = system;

      const response = await anthropic.messages.create(createParams);
      
      // Track cost
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      const cost = costTracker.recordClaude(model, inputTokens, outputTokens, '/api/claude/analysis', userId);
      
      if (isDev) console.log(`[CostTracker] Analysis cost: $${cost.toFixed(4)} (${inputTokens} in, ${outputTokens} out)`);
      
      return response.content;
    });

    claudeCache.set(cacheKey, result);

    return res.json({ content: result, cached: false });
  } catch (error: any) {
    console.error('[Server] Claude analysis error:', error.status || error.message);

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
 */
app.use('/api/rentcast', async (req, res) => {
  if (!RENTCAST_API_KEY) {
    return res.status(503).json({ error: 'RentCast API key not configured on server' });
  }

  try {
    // req.url = everything after /api/rentcast, e.g. /properties?address=...
    const url = `https://api.rentcast.io/v1${req.url}`;

    // Check cache
    const cacheKey = `rentcast:${url}`;
    const cached = rentcastCache.get(cacheKey);
    if (cached) {
      if (isDev) console.log(`[Server] Cache HIT for RentCast: ${req.url}`);
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
      console.error(`[Server] RentCast error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({
        error: `RentCast API error: ${response.status}`,
      });
    }

    const data = await response.json();

    // Track RentCast API cost
    const userId = (req as any).userId || 'anonymous';
    const cost = costTracker.recordRentCast(req.url, userId);
    if (isDev) console.log(`[CostTracker] RentCast request cost: $${cost.toFixed(4)}`);

    // Cache successful responses for 60 minutes
    rentcastCache.set(cacheKey, data);

    return res.json(data);
  } catch (error: any) {
    console.error('[Server] RentCast proxy error:', error.message);
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

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    user: (req as any).userId,
    tier: (req as any).tier,
    cache: {
      claude: claudeCache.size,
      rentcast: rentcastCache.size,
    },
    keys: {
      anthropic: !!ANTHROPIC_API_KEY,
      rentcast: !!RENTCAST_API_KEY,
    },
  });
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

app.listen(PORT, () => {
  console.log(`\n🚀 Analyze My Property API Server running on http://localhost:${PORT}`);
  console.log(`   Claude proxy:   POST http://localhost:${PORT}/api/claude/messages`);
  console.log(`   Analysis proxy: POST http://localhost:${PORT}/api/claude/analysis`);
  console.log(`   RentCast proxy: GET  http://localhost:${PORT}/api/rentcast/*`);
  console.log(`   Admin metrics:  GET  http://localhost:${PORT}/api/admin/metrics`);
  console.log(`   Health check:   GET  http://localhost:${PORT}/api/health`);
  console.log(`   Rate limits:    30 req/min general, 10 req/min Claude, 3/10min analysis\n`);
});
