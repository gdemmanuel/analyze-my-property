import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// ============================================================================
// SESSION-BASED AUTH — Lightweight, no external dependencies
// ============================================================================
// For production, replace with Supabase Auth, NextAuth, or Clerk.
// This provides the foundation: session tokens, per-user identification,
// and the middleware pattern that a real auth system would use.

interface Session {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  tier: 'free' | 'pro';
  requestCount: number;
  usage: {
    analysesToday: number;
    claudeCallsThisHour: number;
    lastAnalysisTimestamp: number;
    lastClaudeCallTimestamp: number;
    dailyResetTimestamp: number;
    hourlyResetTimestamp: number;
  };
}

// In-memory session store (replace with Redis/DB in production)
const sessions = new Map<string, Session>();

// User usage tracking for IP-based (non-session) users
const ipUsageTracking = new Map<string, Session['usage']>();

// Tier limits
const TIER_LIMITS = {
  free: { analysesPerDay: 3, claudeCallsPerHour: 15 },
  pro: { analysesPerDay: 50, claudeCallsPerHour: 100 },
};

/**
 * Create a new anonymous session. Returns the session token.
 * In production, this would be replaced by a real login flow.
 */
export function createSession(tier: 'free' | 'pro' = 'free'): { token: string; session: Session } {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const session: Session = {
    id: token,
    userId: `anon_${crypto.randomBytes(8).toString('hex')}`,
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
    tier,
    requestCount: 0,
    usage: {
      analysesToday: 0,
      claudeCallsThisHour: 0,
      lastAnalysisTimestamp: 0,
      lastClaudeCallTimestamp: 0,
      dailyResetTimestamp: now + 24 * 60 * 60 * 1000,
      hourlyResetTimestamp: now + 60 * 60 * 1000,
    },
  };
  sessions.set(token, session);
  return { token, session };
}

/**
 * Get session by token, or null if expired/invalid.
 */
export function getSession(token: string): Session | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session;
}

/**
 * Express middleware: attaches session to req if valid token provided.
 * Falls back to IP-based identification if no token.
 * Does NOT block requests — all users get through, but identified users
 * can get higher rate limits later.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const session = getSession(token);
    if (session) {
      session.requestCount++;
      
      // Reset counters if time windows have passed
      const now = Date.now();
      if (now > session.usage.dailyResetTimestamp) {
        session.usage.analysesToday = 0;
        session.usage.dailyResetTimestamp = now + 24 * 60 * 60 * 1000;
      }
      if (now > session.usage.hourlyResetTimestamp) {
        session.usage.claudeCallsThisHour = 0;
        session.usage.hourlyResetTimestamp = now + 60 * 60 * 1000;
      }
      
      (req as any).session = session;
      (req as any).userId = session.userId;
      (req as any).tier = session.tier;
      (req as any).usage = session.usage;
    }
  }

  // Fallback: use IP as anonymous identifier with tracking
  if (!(req as any).userId) {
    const userId = `ip_${req.ip || req.socket.remoteAddress || 'unknown'}`;
    (req as any).userId = userId;
    (req as any).tier = 'free';
    
    // Get or create IP usage tracking
    let ipUsage = ipUsageTracking.get(userId);
    const now = Date.now();
    
    if (!ipUsage) {
      ipUsage = {
        analysesToday: 0,
        claudeCallsThisHour: 0,
        lastAnalysisTimestamp: 0,
        lastClaudeCallTimestamp: 0,
        dailyResetTimestamp: now + 24 * 60 * 60 * 1000,
        hourlyResetTimestamp: now + 60 * 60 * 1000,
      };
      ipUsageTracking.set(userId, ipUsage);
    }
    
    // Reset counters if time windows have passed
    if (now > ipUsage.dailyResetTimestamp) {
      ipUsage.analysesToday = 0;
      ipUsage.dailyResetTimestamp = now + 24 * 60 * 60 * 1000;
    }
    if (now > ipUsage.hourlyResetTimestamp) {
      ipUsage.claudeCallsThisHour = 0;
      ipUsage.hourlyResetTimestamp = now + 60 * 60 * 1000;
    }
    
    (req as any).usage = ipUsage;
  }

  next();
}

/**
 * Periodic cleanup of expired sessions (run every 10 minutes)
 */
export function startSessionCleanup() {
  setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessions) {
      if (now > session.expiresAt) {
        sessions.delete(token);
      }
    }
    // Clean up old IP tracking (remove entries older than 24 hours)
    for (const [userId, usage] of ipUsageTracking) {
      if (now > usage.dailyResetTimestamp + 24 * 60 * 60 * 1000) {
        ipUsageTracking.delete(userId);
      }
    }
  }, 10 * 60 * 1000);
}

/**
 * Check if user has exceeded their tier limits
 */
export function checkUsageLimits(
  tier: 'free' | 'pro',
  usage: Session['usage'],
  requestType: 'analysis' | 'claude'
): { allowed: boolean; reason?: string; resetIn?: number } {
  const limits = TIER_LIMITS[tier];
  const now = Date.now();

  if (requestType === 'analysis') {
    if (usage.analysesToday >= limits.analysesPerDay) {
      const resetIn = Math.ceil((usage.dailyResetTimestamp - now) / 1000);
      return {
        allowed: false,
        reason: `Daily analysis limit reached (${limits.analysesPerDay}/${limits.analysesPerDay}). ${tier === 'free' ? 'Upgrade to Pro for 50/day.' : ''}`,
        resetIn,
      };
    }
  }

  if (requestType === 'claude') {
    if (usage.claudeCallsThisHour >= limits.claudeCallsPerHour) {
      const resetIn = Math.ceil((usage.hourlyResetTimestamp - now) / 1000);
      return {
        allowed: false,
        reason: `Hourly API limit reached (${limits.claudeCallsPerHour}/${limits.claudeCallsPerHour}). ${tier === 'free' ? 'Upgrade to Pro for 100/hour.' : ''}`,
        resetIn,
      };
    }
  }

  return { allowed: true };
}

/**
 * Increment usage counters
 */
export function incrementUsage(req: any, requestType: 'analysis' | 'claude') {
  const usage = (req as any).usage;
  if (!usage) return;

  if (requestType === 'analysis') {
    usage.analysesToday += 1;
    usage.lastAnalysisTimestamp = Date.now();
  } else if (requestType === 'claude') {
    usage.claudeCallsThisHour += 1;
    usage.lastClaudeCallTimestamp = Date.now();
  }
}

/**
 * Returns session statistics for the admin dashboard.
 */
export function getSessionStats(): { active: number; total: number; byTier: Record<string, number> } {
  const now = Date.now();
  let active = 0;
  const byTier: Record<string, number> = { free: 0, pro: 0 };
  for (const session of sessions.values()) {
    if (now <= session.expiresAt) {
      active++;
      byTier[session.tier] = (byTier[session.tier] || 0) + 1;
    }
  }
  return { active, total: sessions.size, byTier };
}

/**
 * Get all sessions (for testing/admin purposes)
 */
export function getAllSessions(): Session[] {
  return Array.from(sessions.values());
}

export { TIER_LIMITS };
