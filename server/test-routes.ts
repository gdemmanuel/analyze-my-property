/**
 * Test Routes - Multi-User Testing Endpoints
 * 
 * DEV ONLY - Provides endpoints for creating test users and monitoring
 * multi-user functionality including rate limits, queue status, and costs.
 */

import { Router, Request, Response } from 'express';
import { createSession, getSession, getAllSessions, checkUsageLimits } from './auth.js';
import { claudeQueue } from './claudeQueue.js';
import { costTracker } from './costTracker.js';

const router = Router();

// Middleware to ensure test routes only work in development
const devOnly = (req: Request, res: Response, next: Function) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Test routes are only available in development mode' });
  }
  next();
};

router.use(devOnly);

/**
 * Create a test user
 * POST /api/test/create-user
 * Body: { tier: 'free' | 'pro', name?: string }
 */
router.post('/create-user', (req: Request, res: Response) => {
  const { tier = 'free', name } = req.body;
  
  if (!['free', 'pro'].includes(tier)) {
    return res.status(400).json({ error: 'Tier must be "free" or "pro"' });
  }

  const { token, session } = createSession(tier as 'free' | 'pro');
  
  // Add test prefix to userId for easy identification
  session.userId = `test_${name || session.userId}`;
  
  res.json({
    token,
    userId: session.userId,
    tier: session.tier,
    expiresAt: new Date(session.expiresAt).toISOString(),
    usage: session.usage,
  });
});

/**
 * Get all active sessions
 * GET /api/test/sessions
 */
router.get('/sessions', (req: Request, res: Response) => {
  const sessions = getAllSessions();
  
  const sessionData = sessions.map(session => ({
    userId: session.userId,
    tier: session.tier,
    requestCount: session.requestCount,
    usage: session.usage,
    createdAt: new Date(session.createdAt).toISOString(),
    expiresAt: new Date(session.expiresAt).toISOString(),
  }));

  res.json({
    totalSessions: sessionData.length,
    byTier: {
      free: sessionData.filter(s => s.tier === 'free').length,
      pro: sessionData.filter(s => s.tier === 'pro').length,
    },
    sessions: sessionData,
  });
});

/**
 * Get session details by token
 * GET /api/test/session/:token
 */
router.get('/session/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  const session = getSession(token);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  res.json({
    userId: session.userId,
    tier: session.tier,
    requestCount: session.requestCount,
    usage: session.usage,
    createdAt: new Date(session.createdAt).toISOString(),
    expiresAt: new Date(session.expiresAt).toISOString(),
  });
});

/**
 * Check rate limit status for a user
 * GET /api/test/rate-limit/:token
 */
router.get('/rate-limit/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  const session = getSession(token);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  const analysisCheck = checkUsageLimits(session.tier, session.usage, 'analysis');
  const claudeCheck = checkUsageLimits(session.tier, session.usage, 'claude');

  res.json({
    userId: session.userId,
    tier: session.tier,
    analysis: {
      allowed: analysisCheck.allowed,
      used: session.usage.analysesToday,
      limit: analysisCheck.allowed ? 'within limit' : analysisCheck.reason,
      resetIn: analysisCheck.resetIn,
    },
    claude: {
      allowed: claudeCheck.allowed,
      used: session.usage.claudeCallsThisHour,
      limit: claudeCheck.allowed ? 'within limit' : claudeCheck.reason,
      resetIn: claudeCheck.resetIn,
    },
  });
});

/**
 * Get queue status
 * GET /api/test/queue
 */
router.get('/queue', (req: Request, res: Response) => {
  const stats = claudeQueue.getStats();
  
  res.json({
    stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get cost breakdown by user
 * GET /api/test/costs
 */
router.get('/costs', (req: Request, res: Response) => {
  const history = costTracker.getHistory();
  const summary = costTracker.getSummary();
  
  // Aggregate costs by user
  const userCosts: Record<string, { claudeCost: number; rentcastCost: number; totalCost: number; calls: number }> = {};
  
  // This is a simplified version - in production you'd want to track per-user costs more explicitly
  res.json({
    summary,
    history,
    note: 'Per-user cost tracking requires userId to be passed through all API calls',
  });
});

/**
 * Trigger a test API call from a specific user
 * POST /api/test/trigger-call
 * Body: { token: string, type: 'analysis' | 'claude' | 'rentcast' }
 */
router.post('/trigger-call', async (req: Request, res: Response) => {
  const { token, type = 'claude' } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const session = getSession(token);
  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  try {
    // Simulate different types of API calls
    switch (type) {
      case 'analysis':
        // This would trigger a full analysis
        res.json({
          success: true,
          message: 'Analysis call simulated',
          userId: session.userId,
          type: 'analysis',
        });
        break;
        
      case 'claude':
        // Simulate a Claude API call through the queue
        const result = await claudeQueue.enqueue(
          session.userId,
          session.tier,
          async () => {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { simulated: true, timestamp: Date.now() };
          }
        );
        
        res.json({
          success: true,
          message: 'Claude call completed',
          userId: session.userId,
          type: 'claude',
          result,
        });
        break;
        
      case 'rentcast':
        res.json({
          success: true,
          message: 'RentCast call simulated',
          userId: session.userId,
          type: 'rentcast',
        });
        break;
        
      default:
        res.status(400).json({ error: 'Invalid call type. Must be: analysis, claude, or rentcast' });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      userId: session.userId,
    });
  }
});

/**
 * Clear all test sessions
 * DELETE /api/test/sessions
 */
router.delete('/sessions', (req: Request, res: Response) => {
  const sessions = getAllSessions();
  const testSessions = sessions.filter(s => s.userId.startsWith('test_'));
  
  // Note: This would require adding a deleteSession function to auth.ts
  res.json({
    message: 'Test session cleanup not fully implemented',
    testSessionsFound: testSessions.length,
    note: 'Test sessions will expire automatically after 24 hours',
  });
});

/**
 * Health check for test routes
 * GET /api/test/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    testRoutesEnabled: true,
  });
});

export default router;
