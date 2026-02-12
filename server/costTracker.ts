/**
 * Real-time API Cost Tracker
 * 
 * Monitors Claude and RentCast API usage and costs with:
 * - Per-model token usage tracking (Claude)
 * - Per-endpoint request tracking (RentCast)
 * - Real-time cost calculation based on API pricing
 * - Daily budget alerts
 * - Auto-throttling when approaching limits
 */

// Anthropic API pricing (as of Feb 2026)
const CLAUDE_PRICING = {
  'claude-sonnet-4': {
    inputPerMToken: 15.0,   // $15 per 1M input tokens
    outputPerMToken: 75.0,  // $75 per 1M output tokens
  },
  'claude-3-5-haiku': {
    inputPerMToken: 0.8,    // $0.80 per 1M input tokens
    outputPerMToken: 4.0,   // $4.00 per 1M output tokens
  },
} as const;

// RentCast API pricing (based on typical Growth plan: $0.03 per request)
// User should configure based on their actual plan
let RENTCAST_COST_PER_REQUEST = 0.03; // Default: Growth plan pricing

interface ClaudeUsageEntry {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: number;
  endpoint: string;
  userId: string;
}

interface RentCastUsageEntry {
  endpoint: string;
  cost: number;
  timestamp: number;
  userId: string;
}

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

export class CostTracker {
  private claudeUsageLog: ClaudeUsageEntry[] = [];
  private rentcastUsageLog: RentCastUsageEntry[] = [];
  private dailyBudget: number;
  private alertThreshold: number;
  private hasAlertedToday = false;
  private lastResetDate = new Date().toDateString();

  constructor(dailyBudgetUSD: number = 50, alertThresholdPercent: number = 80) {
    this.dailyBudget = dailyBudgetUSD;
    this.alertThreshold = alertThresholdPercent;

    // Reset daily tracking at midnight
    setInterval(() => {
      const today = new Date().toDateString();
      if (today !== this.lastResetDate) {
        this.lastResetDate = today;
        this.hasAlertedToday = false;
        // Keep last 7 days of logs
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        this.claudeUsageLog = this.claudeUsageLog.filter(entry => entry.timestamp > sevenDaysAgo);
        this.rentcastUsageLog = this.rentcastUsageLog.filter(entry => entry.timestamp > sevenDaysAgo);
      }
    }, 60 * 1000); // Check every minute
  }

  /**
   * Record Claude API usage and calculate cost
   */
  recordClaude(
    model: string,
    inputTokens: number,
    outputTokens: number,
    endpoint: string,
    userId: string
  ): number {
    // Normalize model name (strip date suffix like -20250514)
    let normalizedModel = model;
    if (model.includes('claude-sonnet-4')) {
      normalizedModel = 'claude-sonnet-4';
    } else if (model.includes('claude-3-5-haiku')) {
      normalizedModel = 'claude-3-5-haiku';
    }

    const pricing = CLAUDE_PRICING[normalizedModel as keyof typeof CLAUDE_PRICING];
    if (!pricing) {
      console.warn(`[CostTracker] Unknown model: ${model} (normalized: ${normalizedModel})`);
      return 0;
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMToken;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMToken;
    const totalCost = inputCost + outputCost;

    this.claudeUsageLog.push({
      model: normalizedModel, // Store normalized name for consistent grouping
      inputTokens,
      outputTokens,
      cost: totalCost,
      timestamp: Date.now(),
      endpoint,
      userId,
    });

    this.checkBudgetAlert();
    return totalCost;
  }

  /**
   * Record RentCast API usage and calculate cost
   */
  recordRentCast(endpoint: string, userId: string): number {
    const cost = RENTCAST_COST_PER_REQUEST;

    this.rentcastUsageLog.push({
      endpoint,
      cost,
      timestamp: Date.now(),
      userId,
    });

    this.checkBudgetAlert();
    return cost;
  }

  /**
   * Check budget and alert if threshold exceeded
   */
  private checkBudgetAlert() {
    const todayCost = this.getTodayCosts().totalCost;
    const budgetPercent = (todayCost / this.dailyBudget) * 100;

    if (budgetPercent >= this.alertThreshold && !this.hasAlertedToday) {
      this.hasAlertedToday = true;
      console.error(
        `🚨 [CostTracker] ALERT: ${budgetPercent.toFixed(1)}% of daily budget consumed ($${todayCost.toFixed(2)}/$${this.dailyBudget})`
      );
    }
  }

  /**
   * Get today's costs
   */
  getTodayCosts(): DailyCosts {
    const today = new Date().toDateString();
    const todayClaudeEntries = this.claudeUsageLog.filter(
      entry => new Date(entry.timestamp).toDateString() === today
    );
    const todayRentCastEntries = this.rentcastUsageLog.filter(
      entry => new Date(entry.timestamp).toDateString() === today
    );

    const byModel: Record<string, { calls: number; cost: number; inputTokens: number; outputTokens: number }> = {};
    const byRentCastEndpoint: Record<string, { calls: number; cost: number }> = {};
    
    let claudeCost = 0;
    let rentcastCost = 0;

    for (const entry of todayClaudeEntries) {
      if (!byModel[entry.model]) {
        byModel[entry.model] = { calls: 0, cost: 0, inputTokens: 0, outputTokens: 0 };
      }
      byModel[entry.model].calls += 1;
      byModel[entry.model].cost += entry.cost;
      byModel[entry.model].inputTokens += entry.inputTokens;
      byModel[entry.model].outputTokens += entry.outputTokens;
      claudeCost += entry.cost;
    }

    for (const entry of todayRentCastEntries) {
      if (!byRentCastEndpoint[entry.endpoint]) {
        byRentCastEndpoint[entry.endpoint] = { calls: 0, cost: 0 };
      }
      byRentCastEndpoint[entry.endpoint].calls += 1;
      byRentCastEndpoint[entry.endpoint].cost += entry.cost;
      rentcastCost += entry.cost;
    }

    return {
      date: today,
      totalCost: claudeCost + rentcastCost,
      claudeCost,
      rentcastCost,
      totalCalls: todayClaudeEntries.length + todayRentCastEntries.length,
      claudeCalls: todayClaudeEntries.length,
      rentcastCalls: todayRentCastEntries.length,
      byModel,
      byRentCastEndpoint,
    };
  }

  /**
   * Get cost summary with budget status
   */
  getSummary() {
    const today = this.getTodayCosts();
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
   * Get last 7 days of cost history
   */
  getHistory(): DailyCosts[] {
    const days: Record<string, DailyCosts> = {};

    for (const entry of this.claudeUsageLog) {
      const date = new Date(entry.timestamp).toDateString();
      
      if (!days[date]) {
        days[date] = {
          date,
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

      if (!days[date].byModel[entry.model]) {
        days[date].byModel[entry.model] = { calls: 0, cost: 0, inputTokens: 0, outputTokens: 0 };
      }

      days[date].byModel[entry.model].calls += 1;
      days[date].byModel[entry.model].cost += entry.cost;
      days[date].byModel[entry.model].inputTokens += entry.inputTokens;
      days[date].byModel[entry.model].outputTokens += entry.outputTokens;
      days[date].totalCost += entry.cost;
      days[date].claudeCost += entry.cost;
      days[date].totalCalls += 1;
      days[date].claudeCalls += 1;
    }

    for (const entry of this.rentcastUsageLog) {
      const date = new Date(entry.timestamp).toDateString();
      
      if (!days[date]) {
        days[date] = {
          date,
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

      if (!days[date].byRentCastEndpoint[entry.endpoint]) {
        days[date].byRentCastEndpoint[entry.endpoint] = { calls: 0, cost: 0 };
      }

      days[date].byRentCastEndpoint[entry.endpoint].calls += 1;
      days[date].byRentCastEndpoint[entry.endpoint].cost += entry.cost;
      days[date].totalCost += entry.cost;
      days[date].rentcastCost += entry.cost;
      days[date].totalCalls += 1;
      days[date].rentcastCalls += 1;
    }

    return Object.values(days).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  /**
   * Set RentCast cost per request (based on user's plan)
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
   * Get pricing information for display
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
    this.hasAlertedToday = false; // Reset alert so it can fire again if needed
  }
}

// Singleton instance
export const costTracker = new CostTracker(50); // $50/day default budget
