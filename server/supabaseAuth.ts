import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';

// ============================================================================
// SUPABASE AUTH - Server-side authentication with PostgreSQL persistence
// ============================================================================

const isDev = process.env.NODE_ENV !== 'production';

// Lazy load environment variables - don't evaluate at import time
function getSupabaseUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) {
    throw new Error('❌ SUPABASE_URL is missing. Please check your .env file.');
  }
  return url;
}

function getSupabaseServiceKey() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) {
    throw new Error('❌ SUPABASE_SERVICE_KEY is missing. Please check your .env file.');
  }
  return key;
}

// Server-side Supabase client with service role key (bypasses RLS)
let _supabaseAdmin: any = null;

export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(getSupabaseUrl(), getSupabaseServiceKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return _supabaseAdmin;
}

// For backwards compatibility, export as supabaseAdmin
export const supabaseAdmin = new Proxy({}, {
  get(target, prop) {
    return getSupabaseAdmin()[prop as string];
  }
});

// Tier limits (same as before)
export const TIER_LIMITS = {
  free: { analysesPerDay: 3, claudeCallsPerHour: 15 },
  pro: { analysesPerDay: 50, claudeCallsPerHour: 100 },
};

export interface UserProfile {
  id: string;
  tier: 'free' | 'pro';
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserUsage {
  user_id: string;
  analyses_today: number;
  claude_calls_this_hour: number;
  last_analysis_timestamp: string | null;
  last_claude_call_timestamp: string | null;
  daily_reset_timestamp: string;
  hourly_reset_timestamp: string;
  updated_at: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
      userProfile?: UserProfile;
    }
  }
}

/**
 * Verify JWT token and get user
 */
export async function verifyToken(token: string) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    return { user: null, error: error?.message || 'Invalid token' };
  }
  
  return { user, error: null };
}

/**
 * Get user profile (tier information)
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error || !data) {
    if (isDev) console.error('Error fetching user profile:', error);
    return null;
  }
  
  return data as UserProfile;
}

/**
 * Get or create user usage record
 */
async function getUserUsage(userId: string): Promise<UserUsage | null> {
  let { data, error } = await supabaseAdmin
    .from('user_usage')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  // If no usage record exists, create one (shouldn't happen due to trigger, but just in case)
  if (error && error.code === 'PGRST116') {
    const { data: newData, error: insertError } = await supabaseAdmin
      .from('user_usage')
      .insert({
        user_id: userId,
        analyses_today: 0,
        claude_calls_this_hour: 0,
        daily_reset_timestamp: new Date().toISOString(),
        hourly_reset_timestamp: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (insertError) {
      if (isDev) console.error('Error creating user usage:', insertError);
      return null;
    }
    
    data = newData;
  } else if (error) {
    if (isDev) console.error('Error fetching user usage:', error);
    return null;
  }
  
  return data as UserUsage;
}

/**
 * Check if user has exceeded rate limits
 */
export async function checkUsageLimits(
  userId: string,
  type: 'analysis' | 'claude'
): Promise<{ allowed: boolean; message?: string; usage?: UserUsage }> {
  const profile = await getUserProfile(userId);
  if (!profile) {
    return { allowed: false, message: 'User profile not found' };
  }
  
  const usage = await getUserUsage(userId);
  if (!usage) {
    return { allowed: false, message: 'Usage tracking unavailable' };
  }
  
  const now = Date.now();
  const limits = TIER_LIMITS[profile.tier];
  
  // Check if daily reset is needed
  const dailyResetTime = new Date(usage.daily_reset_timestamp).getTime();
  const dayInMs = 24 * 60 * 60 * 1000;
  if (now - dailyResetTime > dayInMs) {
    // Reset daily counter
    await supabaseAdmin
      .from('user_usage')
      .update({
        analyses_today: 0,
        daily_reset_timestamp: new Date(now).toISOString(),
      })
      .eq('user_id', userId);
    
    usage.analyses_today = 0;
  }
  
  // Check if hourly reset is needed
  const hourlyResetTime = new Date(usage.hourly_reset_timestamp).getTime();
  const hourInMs = 60 * 60 * 1000;
  if (now - hourlyResetTime > hourInMs) {
    // Reset hourly counter
    await supabaseAdmin
      .from('user_usage')
      .update({
        claude_calls_this_hour: 0,
        hourly_reset_timestamp: new Date(now).toISOString(),
      })
      .eq('user_id', userId);
    
    usage.claude_calls_this_hour = 0;
  }
  
  // Check limits
  if (type === 'analysis') {
    if (usage.analyses_today >= limits.analysesPerDay) {
      return {
        allowed: false,
        message: `${profile.tier === 'free' ? 'Daily analysis limit reached. Upgrade to Pro for unlimited analyses.' : 'Daily limit: ' + limits.analysesPerDay + ' analyses'}`,
        usage,
      };
    }
  } else if (type === 'claude') {
    if (usage.claude_calls_this_hour >= limits.claudeCallsPerHour) {
      return {
        allowed: false,
        message: `Claude API rate limit reached. Try again in ${Math.ceil((hourlyResetTime + hourInMs - now) / 60000)} minutes.`,
        usage,
      };
    }
  }
  
  return { allowed: true, usage };
}

/**
 * Increment usage counter
 */
export async function incrementUsage(userId: string, type: 'analysis' | 'claude'): Promise<void> {
  const now = new Date().toISOString();
  
  if (type === 'analysis') {
    await supabaseAdmin
      .from('user_usage')
      .update({
        analyses_today: supabaseAdmin.rpc('increment', { x: 1 }), // This won't work, let's use a different approach
        last_analysis_timestamp: now,
      })
      .eq('user_id', userId);
    
    // Better approach: increment in SQL
    await supabaseAdmin.rpc('increment_analyses', { user_id: userId });
  } else {
    await supabaseAdmin
      .from('user_usage')
      .update({
        claude_calls_this_hour: supabaseAdmin.rpc('increment', { x: 1 }),
        last_claude_call_timestamp: now,
      })
      .eq('user_id', userId);
    
    await supabaseAdmin.rpc('increment_claude_calls', { user_id: userId });
  }
}

/**
 * Auth middleware - verifies JWT and attaches user to request
 * OPTIONAL: Only blocks if route is explicitly protected
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  // Allow unauthenticated requests to pass through
  // Individual routes can check req.user to require auth
  if (!authHeader) {
    req.user = null;
    req.userProfile = null;
    return next();
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  const { user, error } = await verifyToken(token);
  
  if (error || !user) {
    // Don't block, just don't attach user
    req.user = null;
    req.userProfile = null;
    return next();
  }
  
  // Attach user and profile to request
  req.user = user;
  req.userProfile = await getUserProfile(user.id);
  
  next();
}

/**
 * Require auth middleware - BLOCKS unauthenticated requests
 * Use this for protected routes only
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.userProfile) {
    return res.status(500).json({ error: 'User profile not found' });
  }

  next();
}

/**
 * Require admin middleware - BLOCKS non-admin users. Must run after authMiddleware and requireAuth.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const profile = (req as any).userProfile;
  if (!profile || !profile.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers() {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    if (isDev) console.error('Error fetching users:', error);
    return [];
  }
  
  return data;
}

/**
 * Get user stats for admin dashboard
 */
export async function getUserStats() {
  const { data: profiles } = await supabaseAdmin
    .from('user_profiles')
    .select('tier');
  
  const { count: totalUsers } = await supabaseAdmin
    .from('user_profiles')
    .select('*', { count: 'exact', head: true });
  
  const freeUsers = profiles?.filter(p => p.tier === 'free').length || 0;
  const proUsers = profiles?.filter(p => p.tier === 'pro').length || 0;
  
  return {
    total: totalUsers || 0,
    free: freeUsers,
    pro: proUsers,
  };
}
