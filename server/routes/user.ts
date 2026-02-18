import { Router, Request, Response } from 'express';
import { requireAuth, getUserProfile, isInTrial, getTrialEndsAt } from '../supabaseAuth';

const router = Router();

/**
 * GET /api/user/profile
 * Returns the authenticated user's profile
 */
router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const profile = await getUserProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const inTrial = isInTrial(profile);
    res.json({
      ...profile,
      inTrial,
      trialEndsAt: inTrial ? getTrialEndsAt(profile).toISOString() : null,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * PUT /api/user/profile
 * Updates the authenticated user's profile
 */
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { full_name } = req.body;
    
    // Note: Tier updates should be done through admin routes or payment flow
    const { supabaseAdmin } = await import('../supabaseAuth');
    
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update({ 
        full_name,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * GET /api/user/usage
 * Returns the authenticated user's current usage stats
 */
router.get('/usage', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { supabaseAdmin } = await import('../supabaseAuth');
    
    const { data, error } = await supabaseAdmin
      .from('user_usage')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (profile not created yet)
      throw error;
    }

    res.json(data || {
      analyses_today: 0,
      claude_calls_this_hour: 0,
      last_analysis_timestamp: null,
      last_claude_call_timestamp: null,
      last_reset_date: null,
      hourly_reset_time: null
    });
  } catch (error) {
    console.error('Error fetching user usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

/**
 * GET /api/user/assessments
 * Returns the authenticated user's saved property assessments
 */
router.get('/assessments', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { supabaseAdmin } = await import('../supabaseAuth');
    
    const { data, error } = await supabaseAdmin
      .from('assessments')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

/**
 * POST /api/user/assessments
 * Saves a new property assessment for the authenticated user
 */
router.post('/assessments', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { assessment_data } = req.body;
    if (!assessment_data) {
      return res.status(400).json({ error: 'Assessment data is required' });
    }

    const { supabaseAdmin } = await import('../supabaseAuth');
    
    const { data, error } = await supabaseAdmin
      .from('assessments')
      .insert({
        user_id: req.user.id,
        assessment_data
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error saving assessment:', error);
    res.status(500).json({ error: 'Failed to save assessment' });
  }
});

/**
 * DELETE /api/user/assessments/:id
 * Deletes a specific assessment
 */
router.delete('/assessments/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const { supabaseAdmin } = await import('../supabaseAuth');
    
    const { error } = await supabaseAdmin
      .from('assessments')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id); // Ensure user can only delete their own

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting assessment:', error);
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

/**
 * GET /api/user/settings
 * Returns the authenticated user's settings
 */
router.get('/settings', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { supabaseAdmin } = await import('../supabaseAuth');
    
    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    // PGRST116 = no rows found (normal for new users)
    // 42P01 = table doesn't exist
    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01') {
        return res.json({ settings_data: {} });
      }
      console.error('Error fetching user settings:', error.code, error.message);
      return res.json({ settings_data: {} });
    }

    res.json(data || { settings_data: {} });
  } catch (error: any) {
    console.error('Error fetching user settings:', error?.message || error);
    res.json({ settings_data: {} });
  }
});

/**
 * PUT /api/user/settings
 * Updates the authenticated user's settings
 */
router.put('/settings', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { settings_data } = req.body;
    if (!settings_data || typeof settings_data !== 'object') {
      return res.status(400).json({ error: 'Valid settings_data object is required' });
    }

    const { supabaseAdmin } = await import('../supabaseAuth');
    
    const { data, error} = await supabaseAdmin
      .from('user_settings')
      .upsert({
        user_id: req.user.id,
        settings_data,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // Table might not exist yet - return success with empty data
      if (error.code === '42P01') {
        console.warn('user_settings table does not exist yet');
        return res.json({ user_id: req.user.id, settings_data });
      }
      console.error('Error updating user settings:', error.code, error.message);
      return res.status(500).json({ error: 'Failed to update settings' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error updating user settings:', error?.message || error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * GET /api/user/all (ADMIN ONLY)
 * Returns all users with their profiles and usage stats
 */
router.get('/all', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const { getUserProfile, supabaseAdmin } = await import('../supabaseAuth');
    const profile = await getUserProfile(req.user.id);
    
    if (!profile || !profile.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Get all user profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    // Get usage data for all users
    const { data: usageData } = await supabaseAdmin
      .from('user_usage')
      .select('*');

    // Get all auth users for emails
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
    }

    // Combine the data
    const usersWithUsage = (profiles || []).map((profile: any) => {
      const authUser = authUsers?.find((au: any) => au.id === profile.id);
      const usage = usageData?.find((u: any) => u.user_id === profile.id);
      
      return {
        id: profile.id,
        email: authUser?.email || 'N/A',
        tier: profile.tier,
        is_admin: profile.is_admin || false,
        created_at: profile.created_at,
        analyses_today: usage?.analyses_today || 0,
        claude_calls_this_hour: usage?.claude_calls_this_hour || 0,
        last_analysis: usage?.last_analysis_timestamp,
        last_claude_call: usage?.last_claude_call_timestamp
      };
    });

    res.json(usersWithUsage);
  } catch (error: any) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

/**
 * PATCH /api/user/:userId/role (ADMIN ONLY)
 * Update a user's tier or admin status
 */
router.patch('/:userId/role', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const { getUserProfile } = await import('../supabaseAuth');
    const profile = await getUserProfile(req.user.id);
    
    if (!profile || !profile.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { tier, is_admin } = req.body;

    if (!tier && is_admin === undefined) {
      return res.status(400).json({ error: 'Must provide tier or is_admin' });
    }

    const { supabaseAdmin } = await import('../supabaseAuth');
    
    const updates: any = { updated_at: new Date().toISOString() };
    if (tier) updates.tier = tier;
    if (is_admin !== undefined) updates.is_admin = is_admin;

    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

export default router;
