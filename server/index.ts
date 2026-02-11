import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { claudeCache, rentcastCache } from './cache.js';
import { authMiddleware, createSession, startSessionCleanup, TIER_LIMITS } from './auth.js';

// Load environment variables from .env
dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(authMiddleware);

// Start session cleanup
startSessionCleanup();

// ============================================================================
// API KEY VALIDATION
// ============================================================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY || process.env.VITE_RENTCAST_API_KEY;

if (!ANTHROPIC_API_KEY || !ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
  console.error('❌ ANTHROPIC_API_KEY is missing or invalid. Set it in .env');
  process.exit(1);
}
if (!RENTCAST_API_KEY) {
  console.warn('⚠️  RENTCAST_API_KEY is missing. RentCast endpoints will return errors.');
}

console.log('✅ API keys loaded successfully');

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

app.use('/api', generalLimiter);

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

    // Build cache key from request payload
    const cacheKey = `claude:${JSON.stringify({ model, messages, tools, system })}`;
    const cached = claudeCache.get(cacheKey);
    if (cached) {
      console.log(`[Server] Cache HIT for Claude request`);
      return res.json({ content: cached, cached: true });
    }

    console.log(`[Server] Proxying Claude request: model=${model}, max_tokens=${max_tokens}`);

    const createParams: any = { model, max_tokens, messages };
    if (tools) createParams.tools = tools;
    if (system) createParams.system = system;

    const response = await anthropic.messages.create(createParams);

    // Cache the response content
    claudeCache.set(cacheKey, response.content);

    return res.json({ content: response.content, cached: false });
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
      error: error.message || 'Claude API call failed',
      type: error.error?.type || 'api_error',
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

    const cacheKey = `analysis:${JSON.stringify({ model, messages })}`;
    const cached = claudeCache.get(cacheKey);
    if (cached) {
      console.log(`[Server] Cache HIT for analysis request`);
      return res.json({ content: cached, cached: true });
    }

    console.log(`[Server] Proxying analysis request: model=${model}`);

    const createParams: any = { model, max_tokens, messages };
    if (tools) createParams.tools = tools;
    if (system) createParams.system = system;

    const response = await anthropic.messages.create(createParams);

    // Cache analysis results for 30 minutes
    claudeCache.set(cacheKey, response.content, 30 * 60 * 1000);

    return res.json({ content: response.content, cached: false });
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
      error: error.message || 'Analysis failed',
      type: error.error?.type || 'api_error',
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
      console.log(`[Server] Cache HIT for RentCast: ${req.url}`);
      return res.json(cached);
    }

    console.log(`[Server] Proxying RentCast request: ${req.url}`);

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
        details: errorText,
      });
    }

    const data = await response.json();

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
 * Create an anonymous session. Returns a bearer token.
 * In production, replace with real login (Supabase, NextAuth, etc.)
 */
app.post('/api/auth/session', (req, res) => {
  const { tier } = req.body || {};
  const { token, session } = createSession(tier === 'pro' ? 'pro' : 'free');
  res.json({
    token,
    userId: session.userId,
    tier: session.tier,
    expiresAt: session.expiresAt,
    limits: TIER_LIMITS[session.tier],
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
// START SERVER
// ============================================================================

const PORT = parseInt(process.env.API_PORT || '3002', 10);

app.listen(PORT, () => {
  console.log(`\n🚀 AirROI API Server running on http://localhost:${PORT}`);
  console.log(`   Claude proxy:   POST http://localhost:${PORT}/api/claude/messages`);
  console.log(`   Analysis proxy: POST http://localhost:${PORT}/api/claude/analysis`);
  console.log(`   RentCast proxy: GET  http://localhost:${PORT}/api/rentcast/*`);
  console.log(`   Health check:   GET  http://localhost:${PORT}/api/health`);
  console.log(`   Rate limits:    30 req/min general, 10 req/min Claude, 3/10min analysis\n`);
});
