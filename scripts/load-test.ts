/**
 * Multi-User Load Testing Script
 * 
 * Simulates 10-20 concurrent users to test:
 * - Rate limiting (free vs pro tiers)
 * - Queue system and prioritization
 * - Cost attribution per user
 * - Concurrent access handling
 * 
 * Usage:
 *   npm run test:load              # Run all scenarios
 *   npm run test:rate-limits       # Test rate limits only
 *   npm run test:concurrent        # Test concurrent access
 *   npm run test:queue             # Test queue prioritization
 */

import { ALL_SCENARIOS, ScenarioName, TestUser, TestAction } from './test-scenarios.js';

const API_BASE = 'http://localhost:3000/api';
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

interface TestResult {
  scenario: string;
  startTime: number;
  endTime: number;
  duration: number;
  usersCreated: number;
  actionsExecuted: number;
  actionsFailed: number;
  results: {
    userId: string;
    action: string;
    success: boolean;
    error?: string;
    responseTime?: number;
  }[];
  queueStats?: any;
  costSummary?: any;
}

class LoadTester {
  private userTokens: Map<string, string> = new Map();
  private results: TestResult[] = [];

  constructor() {}

  /**
   * Log with color
   */
  private log(message: string, color: keyof typeof COLORS = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
  }

  /**
   * Create a test user
   */
  private async createUser(user: TestUser): Promise<string> {
    try {
      const res = await fetch(`${API_BASE}/test/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: user.tier, name: user.name }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create user: ${res.status}`);
      }

      const data = await res.json();
      this.userTokens.set(user.id, data.token);
      
      this.log(`  ✓ Created ${user.tier} user: ${data.userId}`, 'green');
      return data.token;
    } catch (error: any) {
      this.log(`  ✗ Failed to create user ${user.id}: ${error.message}`, 'red');
      throw error;
    }
  }

  /**
   * Execute a test action
   */
  private async executeAction(action: TestAction): Promise<{ success: boolean; error?: string; responseTime: number }> {
    const startTime = Date.now();
    const token = this.userTokens.get(action.userId);

    if (!token) {
      return { success: false, error: 'User token not found', responseTime: 0 };
    }

    try {
      // Add delay if specified
      if (action.delay) {
        await new Promise(resolve => setTimeout(resolve, action.delay));
      }

      let res;
      switch (action.type) {
        case 'analysis':
          // Trigger a full property analysis
          res = await fetch(`${API_BASE}/claude/analysis`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 8192,
              messages: [{ 
                role: 'user', 
                content: `Analyze this property for STR investment: ${action.address || 'Test property'}` 
              }],
            }),
          });
          break;

        case 'claude':
          // Trigger a simple Claude call
          res = await fetch(`${API_BASE}/claude/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              model: 'claude-3-5-haiku-20241022',
              max_tokens: 1024,
              messages: [{ role: 'user', content: 'Test message' }],
            }),
          });
          break;

        case 'rentcast':
          // Trigger a RentCast call
          res = await fetch(`${API_BASE}/rentcast/properties?address=${encodeURIComponent(action.address || 'test')}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          break;

        case 'wait':
          await new Promise(resolve => setTimeout(resolve, action.delay || 1000));
          return { success: true, responseTime: action.delay || 1000 };

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      const responseTime = Date.now() - startTime;
      const success = res!.status < 400;

      if (!success) {
        const errorData = await res!.json().catch(() => ({ error: 'Unknown error' }));
        return { success: false, error: errorData.error || `HTTP ${res!.status}`, responseTime };
      }

      return { success: true, responseTime };
    } catch (error: any) {
      return { success: false, error: error.message, responseTime: Date.now() - startTime };
    }
  }

  /**
   * Run a test scenario
   */
  async runScenario(scenarioName: ScenarioName): Promise<TestResult> {
    const scenario = ALL_SCENARIOS[scenarioName];
    
    this.log(`\n${'='.repeat(80)}`, 'cyan');
    this.log(`SCENARIO: ${scenario.name}`, 'bright');
    this.log(`${scenario.description}`, 'cyan');
    this.log(`${'='.repeat(80)}\n`, 'cyan');

    const result: TestResult = {
      scenario: scenario.name,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      usersCreated: 0,
      actionsExecuted: 0,
      actionsFailed: 0,
      results: [],
    };

    // Step 1: Create users
    this.log('Step 1: Creating test users...', 'yellow');
    for (const user of scenario.users) {
      try {
        await this.createUser(user);
        result.usersCreated++;
        // Add delay to avoid hitting rate limiter during user creation
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        this.log(`  Failed to create user ${user.id}`, 'red');
      }
    }
    this.log(`\n✓ Created ${result.usersCreated}/${scenario.users.length} users\n`, 'green');

    // Step 2: Execute actions
    this.log('Step 2: Executing test actions...', 'yellow');
    
    const actionPromises = scenario.actions.map(async (action, index) => {
      const repeat = action.repeat || 1;
      
      for (let i = 0; i < repeat; i++) {
        const actionResult = await this.executeAction(action);
        
        result.results.push({
          userId: action.userId,
          action: `${action.type}${action.address ? ` (${action.address})` : ''}`,
          success: actionResult.success,
          error: actionResult.error,
          responseTime: actionResult.responseTime,
        });

        if (actionResult.success) {
          result.actionsExecuted++;
          this.log(`  ✓ ${action.userId}: ${action.type} (${actionResult.responseTime}ms)`, 'green');
        } else {
          result.actionsFailed++;
          this.log(`  ✗ ${action.userId}: ${action.type} - ${actionResult.error}`, 'red');
        }
      }
    });

    await Promise.all(actionPromises);

    // Step 3: Get final stats
    this.log('\nStep 3: Collecting final statistics...', 'yellow');
    
    try {
      const queueRes = await fetch(`${API_BASE}/test/queue`);
      result.queueStats = await queueRes.json();
      
      const costRes = await fetch(`${API_BASE}/admin/costs`);
      result.costSummary = await costRes.json();
    } catch (error) {
      this.log('  Warning: Could not fetch final stats', 'yellow');
    }

    result.endTime = Date.now();
    result.duration = result.endTime - result.startTime;

    // Step 4: Print results
    this.printResults(result, scenario.expectedResults);

    this.results.push(result);
    return result;
  }

  /**
   * Print test results
   */
  private printResults(result: TestResult, expectedResults: string[]) {
    this.log(`\n${'='.repeat(80)}`, 'cyan');
    this.log('TEST RESULTS', 'bright');
    this.log(`${'='.repeat(80)}`, 'cyan');

    this.log(`\nScenario: ${result.scenario}`, 'bright');
    this.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`, 'cyan');
    this.log(`Users Created: ${result.usersCreated}`, 'cyan');
    this.log(`Actions Executed: ${result.actionsExecuted}`, 'green');
    this.log(`Actions Failed: ${result.actionsFailed}`, result.actionsFailed > 0 ? 'red' : 'green');

    if (result.queueStats?.stats) {
      this.log(`\nQueue Stats:`, 'yellow');
      this.log(`  Completed: ${result.queueStats.stats.completedJobs}`, 'green');
      this.log(`  Failed: ${result.queueStats.stats.failedJobs}`, result.queueStats.stats.failedJobs > 0 ? 'red' : 'green');
      this.log(`  Avg Wait: ${result.queueStats.stats.averageWaitTime.toFixed(2)}s`, 'cyan');
      this.log(`  Avg Processing: ${result.queueStats.stats.averageProcessingTime.toFixed(2)}s`, 'cyan');
    } else if (result.actionsFailed === result.actionsExecuted + result.actionsFailed) {
      this.log(`\nQueue Stats: Not available (all requests failed before reaching queue)`, 'yellow');
    }

    if (result.costSummary?.today) {
      this.log(`\nCost Summary:`, 'yellow');
      this.log(`  Total: $${result.costSummary.today.totalCost.toFixed(2)}`, 'cyan');
      this.log(`  Claude: $${result.costSummary.today.claudeCost.toFixed(2)}`, 'blue');
      this.log(`  RentCast: $${result.costSummary.today.rentcastCost.toFixed(2)}`, 'green');
    } else {
      this.log(`\nCost Summary: Not available`, 'yellow');
    }

    this.log(`\nExpected Results:`, 'yellow');
    expectedResults.forEach(expected => {
      this.log(`  • ${expected}`, 'cyan');
    });

    this.log(`\n${'='.repeat(80)}\n`, 'cyan');
  }

  /**
   * Run all scenarios
   */
  async runAll() {
    this.log('\n🚀 Running all test scenarios...\n', 'bright');
    
    for (const scenarioName of Object.keys(ALL_SCENARIOS) as ScenarioName[]) {
      await this.runScenario(scenarioName);
      
      // Wait between scenarios
      this.log('\nWaiting 5 seconds before next scenario...\n', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    this.log('✓ All scenarios completed!\n', 'green');
    this.printSummary();
  }

  /**
   * Print overall summary
   */
  private printSummary() {
    this.log(`\n${'='.repeat(80)}`, 'magenta');
    this.log('OVERALL SUMMARY', 'bright');
    this.log(`${'='.repeat(80)}`, 'magenta');

    const totalActions = this.results.reduce((sum, r) => sum + r.actionsExecuted + r.actionsFailed, 0);
    const totalSuccess = this.results.reduce((sum, r) => sum + r.actionsExecuted, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.actionsFailed, 0);
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    this.log(`\nScenarios Run: ${this.results.length}`, 'cyan');
    this.log(`Total Actions: ${totalActions}`, 'cyan');
    this.log(`Successful: ${totalSuccess} (${((totalSuccess / totalActions) * 100).toFixed(1)}%)`, 'green');
    this.log(`Failed: ${totalFailed} (${((totalFailed / totalActions) * 100).toFixed(1)}%)`, totalFailed > 0 ? 'red' : 'green');
    this.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`, 'cyan');

    this.log(`\n${'='.repeat(80)}\n`, 'magenta');
  }

  /**
   * Export results to JSON
   */
  async exportResults(filename: string = 'test-results.json') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const outputPath = path.join(process.cwd(), filename);
      fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
      
      this.log(`\n✓ Results exported to: ${outputPath}`, 'green');
    } catch (error: any) {
      this.log(`\n⚠ Could not export results: ${error.message}`, 'yellow');
    }
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const scenarioArg = args[0];

  const tester = new LoadTester();

  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                   AirROI Multi-User Load Testing                          ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `);

  try {
    if (!scenarioArg || scenarioArg === 'all') {
      // Run all scenarios
      await tester.runAll();
    } else if (scenarioArg in ALL_SCENARIOS) {
      // Run specific scenario
      await tester.runScenario(scenarioArg as ScenarioName);
    } else {
      console.error(`${COLORS.red}Error: Unknown scenario "${scenarioArg}"${COLORS.reset}`);
      console.log(`\nAvailable scenarios:`);
      Object.keys(ALL_SCENARIOS).forEach(name => {
        console.log(`  - ${name}`);
      });
      process.exit(1);
    }

    // Export results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    await tester.exportResults(`test-results-${timestamp}.json`);

    console.log(`\n${COLORS.green}${COLORS.bright}✓ Testing complete!${COLORS.reset}\n`);
    process.exit(0);
  } catch (error: any) {
    console.error(`\n${COLORS.red}${COLORS.bright}✗ Testing failed: ${error.message}${COLORS.reset}\n`);
    process.exit(1);
  }
}

// Run if called directly
// Always run main when this file is executed
main();

export { LoadTester };
