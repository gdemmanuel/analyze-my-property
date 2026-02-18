/**
 * Database-backed API Cost Tracker
 * 
 * Persists API usage and costs to PostgreSQL for:
 * - Historical tracking across server restarts
 * - Cost analysis and budgeting
 * - User-level usage analytics
 */

import { getSupabaseAdmin } from './supabaseAuth.js';

// Anthropic API pricing (as of Feb 2026)
const CLAUDE_PRICING = {
  'claude-sonnet-4-6': {
    inputPerMToken: 3.0,    // $3.00 per 1M input tokens
    outputPerMToken: 15.0,  // $15.00 per 1M output tokens
  },
  'claude-sonnet-4': {
    inputPerMToken: 3.0,    // $3.00 per 1M input tokens (legacy)
    outputPerMToken: 15.0,
  },
  'claude-haiku-4-5': {
    inputPerMToken: 1.0,    // $1.00 per 1M input tokens
    outputPerMToken: 5.0,   // $5.00 per 1M output tokens
  },
  'claude-3-5-haiku': {
    inputPerMToken: 0.8,    // $0.80 per 1M input tokens (legacy)
    outputPerMToken: 4.0,
  },
} as const;

// RentCast API pricing
let RENTCAST_COST_PER_REQUEST = 0.03; // Default: Growth plan pricing

interface DailyCosts {
  date: string;
  totalCost: number;
  claudeCost: number;
  rentcastCost: number;
  totalCalls: number;
  claudeCalls: number;
  rentcastCalls: number;
  byModel: Record<string, { calls: number; cost: number; inputTokens: number; outputTokens: number }>;
  byRentCastEndpoint: Record<string, { calls: number; cost: number }>;
}

export class DatabaseCostTracker {
  private dailyBudget: number;
  private alertThreshold: number;
  private hasAlertedToday = false;
  private lastResetDate = new Date().toDateString();

  constructor(dailyBudgetUSD: number = 50, alertThresholdPercent: number = 80) {
    this.dailyBudget = dailyBudgetUSD;
    this.alertThreshold = alertThresholdPercent;

    // Reset alert flag at midnight
    setInterval(() => {
      const today = new Date().toDateString();
      if (today !== this.lastResetDate) {
        this.lastResetDate = today;
        this.hasAlertedToday = false;
      }
    }, 60 * 1000);
  }

  /**
   * Record Claude API usage to database
   */
  async recordClaude(
    model: string,
    inputTokens: number,
    outputTokens: number,
    endpoint: string,
    userId: string
  ): Promise<number> {
    // Normalize model name to match pricing keys
    let normalizedModel = model;
    if (model.includes('claude-sonnet-4-6')) {
      normalizedModel = 'claude-sonnet-4-6';
    } else if (model.includes('claude-sonnet-4')) {
      normalizedModel = 'claude-sonnet-4';
    } else if (model.includes('claude-haiku-4-5')) {
      normalizedModel = 'claude-haiku-4-5';
    } else if (model.includes('claude-3-5-haiku')) {
      normalizedModel = 'claude-3-5-haiku';
    }

    const pricing = CLAUDE_PRICING[normalizedModel as keyof typeof CLAUDE_PRICING];
    if (!pricing) {
      console.warn(`[CostTracker] Unknown model: ${model}`);
      return 0;
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMToken;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMToken;
    const totalCost = inputCost + outputCost;

    const supabase = getSupabaseAdmin();

    try {
      console.log(`[CostTracker] Recording Claude call: user=${userId}, model=${normalizedModel}, endpoint=${endpoint}, cost=$${totalCost.toFixed(4)}`);
      
      // Insert into api_usage_log
      const { error: insertError } = await supabase.from('api_usage_log').insert({
        user_id: userId === 'anonymous' ? null : userId,
        api_type: 'claude',
        endpoint,
        model: normalizedModel,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: totalCost,
      });
      
      if (insertError) {
        console.error('[CostTracker] Error inserting into api_usage_log:', insertError);
      } else {
        console.log('[CostTracker] Successfully inserted into api_usage_log');
      }

      // Update daily aggregate
      const { error: rpcError } = await supabase.rpc('increment_daily_cost', {
        p_date: new Date().toISOString().split('T')[0],
        p_api_type: 'claude',
        p_cost: totalCost,
        p_model: normalizedModel,
        p_endpoint: endpoint,
      });
      
      if (rpcError) {
        console.error('[CostTracker] Error calling increment_daily_cost:', rpcError);
      } else {
        console.log('[CostTracker] Successfully updated daily costs');
      }

      await this.checkBudgetAlert();
      return totalCost;
    } catch (error) {
      console.error('[CostTracker] Error recording Claude usage:', error);
      return totalCost; // Return cost even if DB fails
    }
  }

  /**
   * Record RentCast API usage to database
   */
  async recordRentCast(endpoint: string, userId: string): Promise<number> {
    const cost = RENTCAST_COST_PER_REQUEST;
    const supabase = getSupabaseAdmin();

    try {
      // Insert into api_usage_log
      await supabase.from('api_usage_log').insert({
        user_id: userId === 'anonymous' ? null : userId,
        api_type: 'rentcast',
        endpoint,
        cost_usd: cost,
      });

      // Update daily aggregate
      await supabase.rpc('increment_daily_cost', {
        p_date: new Date().toISOString().split('T')[0],
        p_api_type: 'rentcast',
        p_cost: cost,
        p_endpoint: endpoint,
      });

      await this.checkBudgetAlert();
      return cost;
    } catch (error) {
      console.error('[CostTracker] Error recording RentCast usage:', error);
      return cost;
    }
  }

  /**
   * Check budget and alert if threshold exceeded
   */
  private async checkBudgetAlert() {
    const todayCost = await this.getTodayCosts();
    const budgetPercent = (todayCost.totalCost / this.dailyBudget) * 100;

    if (budgetPercent >= this.alertThreshold && !this.hasAlertedToday) {
      this.hasAlertedToday = true;
      console.error(
        `🚨 [CostTracker] ALERT: ${budgetPercent.toFixed(1)}% of daily budget consumed ($${todayCost.totalCost.toFixed(2)}/$${this.dailyBudget})`
      );
    }
  }

  /**
   * Get today's costs from database
   */
  async getTodayCosts(): Promise<DailyCosts> {
    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('daily_api_costs')
        .select('*')
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found (expected for first call of day)
        throw error;
      }

      if (!data) {
        return {
          date: today,
          totalCost: 0,
          claudeCost: 0,
          rentcastCost: 0,
          totalCalls: 0,
          claudeCalls: 0,
          rentcastCalls: 0,
          byModel: {},
          byRentCastEndpoint: {},
        };
      }

      return {
        date: data.date,
        totalCost: parseFloat(data.total_cost_usd || '0'),
        claudeCost: parseFloat(data.claude_cost_usd || '0'),
        rentcastCost: parseFloat(data.rentcast_cost_usd || '0'),
        totalCalls: data.total_calls || 0,
        claudeCalls: data.claude_calls || 0,
        rentcastCalls: data.rentcast_calls || 0,
        byModel: data.by_model || {},
        byRentCastEndpoint: data.by_rentcast_endpoint || {},
      };
    } catch (error) {
      console.error('[CostTracker] Error fetching today costs:', error);
      return {
        date: today,
        totalCost: 0,
        claudeCost: 0,
        rentcastCost: 0,
        totalCalls: 0,
        claudeCalls: 0,
        rentcastCalls: 0,
        byModel: {},
        byRentCastEndpoint: {},
      };
    }
  }

  /**
   * Get cost summary with budget status
   */
  async getSummary() {
    const today = await this.getTodayCosts();
    const budgetPercent = (today.totalCost / this.dailyBudget) * 100;
    const remaining = Math.max(0, this.dailyBudget - today.totalCost);

    return {
      today,
      dailyBudget: this.dailyBudget,
      budgetPercent: Math.round(budgetPercent * 10) / 10,
      remaining: Math.round(remaining * 100) / 100,
      shouldThrottle: budgetPercent >= this.alertThreshold,
      status: budgetPercent >= 100 ? 'exceeded' : budgetPercent >= this.alertThreshold ? 'warning' : 'normal',
    };
  }

  /**
   * Get last 7 days of cost history from database
   */
  async getHistory(): Promise<DailyCosts[]> {
    const supabase = getSupabaseAdmin();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      const { data, error } = await supabase
        .from('daily_api_costs')
        .select('*')
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      return (data || []).map(row => ({
        date: row.date,
        totalCost: parseFloat(row.total_cost_usd || '0'),
        claudeCost: parseFloat(row.claude_cost_usd || '0'),
        rentcastCost: parseFloat(row.rentcast_cost_usd || '0'),
        totalCalls: row.total_calls || 0,
        claudeCalls: row.claude_calls || 0,
        rentcastCalls: row.rentcast_calls || 0,
        byModel: row.by_model || {},
        byRentCastEndpoint: row.by_rentcast_endpoint || {},
      }));
    } catch (error) {
      console.error('[CostTracker] Error fetching history:', error);
      return [];
    }
  }

  /**
   * Set RentCast cost per request
   */
  setRentCastCostPerRequest(cost: number) {
    RENTCAST_COST_PER_REQUEST = cost;
  }

  /**
   * Get RentCast cost per request
   */
  getRentCastCostPerRequest(): number {
    return RENTCAST_COST_PER_REQUEST;
  }

  /**
   * Get pricing information
   */
  getPricingInfo() {
    return {
      claude: CLAUDE_PRICING,
      rentcast: {
        costPerRequest: RENTCAST_COST_PER_REQUEST,
        plans: {
          developer: { monthly: 0, included: 50, overage: 0.20 },
          foundation: { monthly: 74, included: 1000, overage: 0.06 },
          growth: { monthly: 199, included: 5000, overage: 0.03 },
          scale: { monthly: 449, included: 25000, overage: 0.015 },
        }
      }
    };
  }

  /**
   * Set daily budget
   */
  setDailyBudget(budgetUSD: number) {
    this.dailyBudget = budgetUSD;
    this.hasAlertedToday = false;
  }

  /**
   * Get per-user API call statistics
   */
  async getUserCallStats() {
    try {
      const supabase = getSupabaseAdmin();
      
      // Query API usage log grouped by user_id
      const { data, error } = await supabase
        .from('api_usage_log')
        .select('user_id, api_type, endpoint')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[CostTracker] Error fetching user stats:', error);
        return [];
      }
      
      console.log(`[CostTracker] Fetched ${data?.length || 0} API usage log entries`);
      
      // Aggregate by user
      const userStats = new Map<string, { 
        userId: string; 
        totalCalls: number;
        claudeCalls: number;
        rentcastCalls: number;
        analysisCalls: number;
      }>();
      
      data?.forEach((log: any) => {
        const userId = log.user_id || 'anonymous';
        const apiType = log.api_type;
        const endpoint = log.endpoint;
        
        if (!userStats.has(userId)) {
          userStats.set(userId, {
            userId,
            totalCalls: 0,
            claudeCalls: 0,
            rentcastCalls: 0,
            analysisCalls: 0,
          });
        }
        
        const stats = userStats.get(userId)!;
        stats.totalCalls++;
        
        if (apiType === 'claude') {
          stats.claudeCalls++;
          if (endpoint === '/api/claude/analysis') {
            stats.analysisCalls++;
          }
        } else if (apiType === 'rentcast') {
          stats.rentcastCalls++;
        }
      });
      
      const result = Array.from(userStats.values());
      console.log(`[CostTracker] Aggregated stats for ${result.length} users:`, result);
      return result;
    } catch (error) {
      console.error('[CostTracker] Error fetching user call stats:', error);
      return [];
    }
  }
}

// Singleton instance
export const costTracker = new DatabaseCostTracker(50); // $50/day default budget
