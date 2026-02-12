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
}

// In-memory session store (replace with Redis/DB in production)
const sessions = new Map<string, Session>();

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
  const session: Session = {
    id: token,
    userId: `anon_${crypto.randomBytes(8).toString('hex')}`,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    tier,
    requestCount: 0,
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
      (req as any).session = session;
      (req as any).userId = session.userId;
      (req as any).tier = session.tier;
    }
  }

  // Fallback: use IP as anonymous identifier
  if (!(req as any).userId) {
    (req as any).userId = `ip_${req.ip || req.socket.remoteAddress || 'unknown'}`;
    (req as any).tier = 'free';
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
  }, 10 * 60 * 1000);
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

export { TIER_LIMITS };
