/**
 * Test Scenarios Configuration
 * 
 * Defines different test scenarios for load testing the multi-user system
 */

export interface TestUser {
  id: string;
  name: string;
  tier: 'free' | 'pro';
  token?: string;
}

export interface TestScenario {
  name: string;
  description: string;
  users: TestUser[];
  actions: TestAction[];
  expectedResults: string[];
}

export interface TestAction {
  userId: string;
  type: 'analysis' | 'claude' | 'rentcast' | 'wait';
  delay?: number; // ms to wait before executing
  repeat?: number; // number of times to repeat this action
  address?: string; // for analysis actions
}

// Test property addresses for consistent testing
export const TEST_ADDRESSES = [
  '2711 oak view ln, tobyhanna, pa 18466',
  '8434 bear trail dr, tobyhanna, pa 18466',
  '123 main st, new york, ny 10001',
  '456 elm st, los angeles, ca 90001',
  '789 oak ave, chicago, il 60601',
];

// ============================================================================
// SCENARIO 1: Rate Limit Testing
// ============================================================================
export const rateLimitScenario: TestScenario = {
  name: 'Rate Limit Enforcement',
  description: 'Verify that free tier users hit 3/day limit and pro users hit 50/day limit',
  users: [
    { id: 'free_test_1', name: 'Free User 1', tier: 'free' },
    { id: 'free_test_2', name: 'Free User 2', tier: 'free' },
    { id: 'pro_test_1', name: 'Pro User 1', tier: 'pro' },
  ],
  actions: [
    // Free user 1: Try 4 analyses (should fail on 4th)
    { userId: 'free_test_1', type: 'analysis', address: TEST_ADDRESSES[0] },
    { userId: 'free_test_1', type: 'analysis', address: TEST_ADDRESSES[1], delay: 1000 },
    { userId: 'free_test_1', type: 'analysis', address: TEST_ADDRESSES[2], delay: 1000 },
    { userId: 'free_test_1', type: 'analysis', address: TEST_ADDRESSES[3], delay: 1000 }, // Should fail
    
    // Free user 2: Try 16 Claude calls in an hour (should fail on 16th)
    { userId: 'free_test_2', type: 'claude', repeat: 16, delay: 100 },
    
    // Pro user: Try 5 analyses (should all succeed)
    { userId: 'pro_test_1', type: 'analysis', address: TEST_ADDRESSES[0] },
    { userId: 'pro_test_1', type: 'analysis', address: TEST_ADDRESSES[1], delay: 1000 },
    { userId: 'pro_test_1', type: 'analysis', address: TEST_ADDRESSES[2], delay: 1000 },
    { userId: 'pro_test_1', type: 'analysis', address: TEST_ADDRESSES[3], delay: 1000 },
    { userId: 'pro_test_1', type: 'analysis', address: TEST_ADDRESSES[4], delay: 1000 },
  ],
  expectedResults: [
    'Free user 1: 3 analyses succeed, 4th fails with rate limit error',
    'Free user 2: 15 Claude calls succeed, 16th fails with hourly limit error',
    'Pro user 1: All 5 analyses succeed',
  ],
};

// ============================================================================
// SCENARIO 2: Concurrent Access Testing
// ============================================================================
export const concurrentScenario: TestScenario = {
  name: 'Concurrent User Access',
  description: 'Test 5 users making requests to verify queue and rate limiting',
  users: Array.from({ length: 5 }, (_, i) => ({
    id: `concurrent_test_${i + 1}`,
    name: `User ${i + 1}`,
    tier: i < 3 ? 'free' : 'pro', // 60% free, 40% pro
  })),
  actions: [
    // All users trigger Claude calls (lighter than full analysis)
    // Stagger requests to avoid hitting express rate limiter
    ...Array.from({ length: 5 }, (_, i) => ({
      userId: `concurrent_test_${i + 1}`,
      type: 'claude' as const,
      delay: i * 1000, // Stagger by 1 second each (5 seconds total spread)
    })),
  ],
  expectedResults: [
    'All 5 users get queued',
    'Pro users (2) get priority in queue',
    'Free users (3) process after pro users',
    'Token bucket rate limiting controls concurrency (3 max concurrent)',
    'All requests complete within reasonable time',
    'No race conditions or errors',
  ],
};

// ============================================================================
// SCENARIO 3: Queue Priority Testing
// ============================================================================
export const queuePriorityScenario: TestScenario = {
  name: 'Queue Priority Verification',
  description: 'Verify pro users jump ahead of free users in the queue',
  users: [
    { id: 'free_queue_1', name: 'Free Queue 1', tier: 'free' },
    { id: 'free_queue_2', name: 'Free Queue 2', tier: 'free' },
    { id: 'free_queue_3', name: 'Free Queue 3', tier: 'free' },
    { id: 'pro_queue_1', name: 'Pro Queue 1', tier: 'pro' },
    { id: 'pro_queue_2', name: 'Pro Queue 2', tier: 'pro' },
  ],
  actions: [
    // Queue up 3 free users first
    { userId: 'free_queue_1', type: 'claude', delay: 0 },
    { userId: 'free_queue_2', type: 'claude', delay: 100 },
    { userId: 'free_queue_3', type: 'claude', delay: 200 },
    
    // Then add 2 pro users (should jump ahead)
    { userId: 'pro_queue_1', type: 'claude', delay: 300 },
    { userId: 'pro_queue_2', type: 'claude', delay: 400 },
  ],
  expectedResults: [
    'Free users queued first (positions 1, 2, 3)',
    'Pro users added later but jump to front (positions 1, 2)',
    'Free users pushed back in queue',
    'Pro users process before free users despite being added later',
  ],
};

// ============================================================================
// SCENARIO 4: Cost Attribution Testing
// ============================================================================
export const costAttributionScenario: TestScenario = {
  name: 'Per-User Cost Tracking',
  description: 'Verify costs are correctly attributed to each user',
  users: [
    { id: 'cost_test_1', name: 'Cost Test 1', tier: 'free' },
    { id: 'cost_test_2', name: 'Cost Test 2', tier: 'free' },
    { id: 'cost_test_3', name: 'Cost Test 3', tier: 'pro' },
  ],
  actions: [
    // User 1: 2 analyses
    { userId: 'cost_test_1', type: 'analysis', address: TEST_ADDRESSES[0] },
    { userId: 'cost_test_1', type: 'analysis', address: TEST_ADDRESSES[1], delay: 2000 },
    
    // User 2: 1 analysis
    { userId: 'cost_test_2', type: 'analysis', address: TEST_ADDRESSES[2], delay: 1000 },
    
    // User 3: 3 analyses
    { userId: 'cost_test_3', type: 'analysis', address: TEST_ADDRESSES[0] },
    { userId: 'cost_test_3', type: 'analysis', address: TEST_ADDRESSES[1], delay: 2000 },
    { userId: 'cost_test_3', type: 'analysis', address: TEST_ADDRESSES[2], delay: 2000 },
  ],
  expectedResults: [
    'User 1 costs: ~$0.62 (2 analyses × $0.31)',
    'User 2 costs: ~$0.31 (1 analysis × $0.31)',
    'User 3 costs: ~$0.93 (3 analyses × $0.31)',
    'Total costs sum correctly',
    'Each user tracked separately in cost logs',
  ],
};

// ============================================================================
// SCENARIO 5: Stress Test
// ============================================================================
export const stressTestScenario: TestScenario = {
  name: 'Stress Test (20 Users)',
  description: 'Heavy load test with 20 concurrent users making multiple requests',
  users: Array.from({ length: 20 }, (_, i) => ({
    id: `stress_test_${i + 1}`,
    name: `Stress User ${i + 1}`,
    tier: i < 14 ? 'free' : 'pro',
  })),
  actions: [
    // Each user makes 2-3 requests with random delays
    ...Array.from({ length: 20 }, (_, i) => {
      const userId = `stress_test_${i + 1}`;
      const numCalls = Math.floor(Math.random() * 2) + 2; // 2-3 calls
      
      return Array.from({ length: numCalls }, (_, j) => ({
        userId,
        type: 'claude' as const,
        delay: Math.random() * 3000, // Random 0-3s delay
      }));
    }).flat(),
  ],
  expectedResults: [
    '40-60 total API calls queued',
    'Server remains responsive',
    'Queue processes all requests',
    'No crashes or race conditions',
    'Memory usage stays reasonable',
    'All users get responses',
  ],
};

// ============================================================================
// Export all scenarios
// ============================================================================
export const ALL_SCENARIOS = {
  rateLimit: rateLimitScenario,
  concurrent: concurrentScenario,
  queuePriority: queuePriorityScenario,
  costAttribution: costAttributionScenario,
  stress: stressTestScenario,
};

export type ScenarioName = keyof typeof ALL_SCENARIOS;
