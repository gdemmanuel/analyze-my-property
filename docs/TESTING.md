# Multi-User Testing Guide

## Overview

This guide covers testing the multi-user functionality of AirROI, including rate limiting, queue management, concurrent access, and per-user cost tracking.

## Prerequisites

1. **Development environment running:**
   ```bash
   npm run dev:full
   ```

2. **Server accessible at:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3002

## Testing Approaches

### Approach 1: Manual Testing (Visual Dashboard)

Best for: Interactive testing, visual monitoring, understanding system behavior

#### Access the Test Dashboard

Open in your browser:
```
http://localhost:3000/test-dashboard.html
```

#### Features

**Create Test Users:**
- Enter a name (optional)
- Select tier (Free or Pro)
- Click "Create User"
- Token is displayed for reference

**Quick Setup:**
- Click "Quick Setup" button (bottom right)
- Creates 5 free users + 2 pro users instantly
- Perfect for getting started quickly

**Monitor Active Sessions:**
- View all active test users
- See usage stats (analyses today, Claude calls/hour)
- Track request counts
- Auto-refreshes every 5 seconds

**Queue Status:**
- Real-time queue metrics
- Queued, processing, completed, failed jobs
- Average wait and processing times

**Cost Summary:**
- Today's total costs
- Claude vs RentCast breakdown
- Budget usage percentage

#### Manual Testing Workflow

1. **Create users:**
   - Create 3-5 free tier users
   - Create 1-2 pro tier users

2. **Test rate limits:**
   - Open multiple browser windows/tabs
   - Use different test user tokens
   - Make property analyses
   - Verify free users hit 3/day limit
   - Verify pro users can do 50/day

3. **Test queue priority:**
   - Make simultaneous requests from multiple users
   - Observe queue position
   - Verify pro users get priority

4. **Monitor costs:**
   - Check Admin tab → API Costs
   - Verify costs are tracked correctly
   - Check per-user attribution

### Approach 2: Automated Load Testing (Scripts)

Best for: Systematic testing, reproducible results, stress testing

#### Available Test Scenarios

1. **Rate Limit Enforcement**
   ```bash
   npm run test:rate-limits
   ```
   - Tests free tier: 3 analyses/day, 15 calls/hour
   - Tests pro tier: 50 analyses/day, 100 calls/hour
   - Verifies error messages when limits hit

2. **Concurrent User Access**
   ```bash
   npm run test:concurrent
   ```
   - Simulates 20 users (14 free, 6 pro)
   - All users make simultaneous requests
   - Tests queue handling and prioritization

3. **Queue Priority Verification**
   ```bash
   npm run test:queue
   ```
   - Queues 3 free users first
   - Adds 2 pro users later
   - Verifies pro users jump ahead

4. **Per-User Cost Attribution**
   ```bash
   npm run test:costs
   ```
   - 3 users make different numbers of requests
   - Verifies costs tracked separately per user
   - Checks cost aggregation accuracy

5. **Stress Test**
   ```bash
   npm run test:stress
   ```
   - 20 users making 40-60 total requests
   - Random delays and patterns
   - Tests system stability under load

6. **Run All Scenarios**
   ```bash
   npm run test:load
   ```
   - Runs all 5 scenarios sequentially
   - Generates comprehensive report
   - Exports results to JSON file

#### Understanding Test Output

**Color Coding:**
- 🟢 Green: Successful actions
- 🔴 Red: Failed actions (expected for rate limit tests)
- 🟡 Yellow: Section headers and warnings
- 🔵 Blue/Cyan: Information and stats

**Test Results Include:**
- Users created
- Actions executed vs failed
- Queue statistics (wait time, processing time)
- Cost summary (total, Claude, RentCast)
- Expected results checklist

**Output Files:**
- `test-results-YYYY-MM-DDTHH-MM-SS.json` - Detailed JSON report

## What Each Test Validates

### Rate Limit Tests

**Free Tier:**
- ✅ 3 analyses per day limit enforced
- ✅ 15 Claude calls per hour limit enforced
- ✅ Error message: "Daily analysis limit reached (3/3). Upgrade to Pro for 50/day."
- ✅ Counters reset after 24 hours (daily) and 1 hour (hourly)

**Pro Tier:**
- ✅ 50 analyses per day limit enforced
- ✅ 100 Claude calls per hour limit enforced
- ✅ Higher limits allow more usage
- ✅ Error message: "Daily analysis limit reached (50/50)."

### Queue System Tests

**Token Bucket Rate Limiting:**
- ✅ Max 3 concurrent Claude API calls
- ✅ Token bucket refills at 1 token/second
- ✅ Max 5 tokens in bucket
- ✅ Requests queue when bucket empty

**Priority Queuing:**
- ✅ Pro users (priority: 1) process before free users (priority: 0)
- ✅ Queue position updates correctly
- ✅ Wait time estimates are accurate
- ✅ FIFO within same priority level

### Cost Tracking Tests

**Per-User Attribution:**
- ✅ Each user's API calls tracked separately
- ✅ Costs calculated correctly per user
- ✅ userId field present in all cost entries
- ✅ Aggregate costs sum correctly

**Cost Calculation:**
- ✅ Claude Sonnet-4: $3/M input, $15/M output
- ✅ Claude Haiku: $0.80/M input, $4/M output
- ✅ RentCast: $0.03 per request (configurable)
- ✅ Model name normalization works (e.g., claude-sonnet-4-20250514 → claude-sonnet-4)

### Concurrent Access Tests

**System Stability:**
- ✅ 20 concurrent users don't crash server
- ✅ No race conditions in session management
- ✅ Cache works correctly across users
- ✅ Memory usage stays reasonable
- ✅ Response times remain acceptable

**Data Isolation:**
- ✅ No data leakage between users
- ✅ Each user's session is independent
- ✅ Rate limits apply per-user, not globally
- ✅ Cost tracking separated by user

## Interpreting Results

### Expected Failures

Some failures are **expected** and indicate the system is working correctly:

**Rate Limit Failures:**
- Free user's 4th analysis of the day → EXPECTED ✓
- Free user's 16th Claude call in an hour → EXPECTED ✓
- These prove rate limiting is working

**Queue Behavior:**
- Free users waiting while pro users process → EXPECTED ✓
- Wait times increase with queue depth → EXPECTED ✓

### Concerning Results

These indicate potential issues:

**Unexpected Failures:**
- ❌ Pro user hitting limits before 50/day
- ❌ Server crashes or timeouts
- ❌ Race conditions (duplicate sessions, lost requests)
- ❌ Cost tracking errors (NaN, negative costs)
- ❌ Queue never processing (stuck jobs)

**Performance Issues:**
- ❌ Average wait time > 30 seconds
- ❌ Memory usage growing unbounded
- ❌ Response times > 10 seconds
- ❌ Cache hit rate < 30%

## Troubleshooting

### Test Dashboard Not Loading

**Issue:** 404 error or blank page

**Solution:**
```bash
# Ensure servers are running
npm run dev:full

# Check if file exists
ls public/test-dashboard.html

# Access at correct URL
http://localhost:3000/test-dashboard.html
```

### Load Test Script Errors

**Issue:** "Cannot find module" errors

**Solution:**
```bash
# Ensure tsx is installed
npm install tsx --save-dev

# Run with explicit tsx
npx tsx scripts/load-test.ts
```

### API Endpoints Returning 403

**Issue:** Test routes disabled

**Solution:**
- Test routes only work in development mode
- Ensure `NODE_ENV` is not set to 'production'
- Check server logs for "Test routes are only available in development mode"

### Rate Limits Hitting Too Quickly

**Issue:** Tests fail due to Claude API rate limits (not app rate limits)

**Solution:**
- Wait 1-2 minutes between test runs
- Use smaller test scenarios first
- Check Claude Console for your API tier limits
- Consider upgrading Claude API tier for testing

## Production Considerations

### Before Deploying

**Test Checklist:**
- ✅ Rate limits work correctly for both tiers
- ✅ Queue system handles concurrent load
- ✅ Cost tracking is accurate
- ✅ No memory leaks after extended testing
- ✅ Cache hit rate is reasonable (>30%)
- ✅ Error messages are user-friendly

### Disable Test Routes

Test routes are automatically disabled in production (check `server/test-routes.ts`):
```typescript
if (process.env.NODE_ENV === 'production') {
  return res.status(403).json({ error: 'Test routes disabled' });
}
```

### Remove Test Dashboard

Before production build:
```bash
# Remove test dashboard from public folder
rm public/test-dashboard.html
```

Or add to `.gitignore`:
```
public/test-dashboard.html
test-results-*.json
```

## Advanced Testing

### Custom Scenarios

Create your own test scenarios in `scripts/test-scenarios.ts`:

```typescript
export const myCustomScenario: TestScenario = {
  name: 'My Custom Test',
  description: 'Test specific behavior',
  users: [
    { id: 'custom_1', name: 'Custom User', tier: 'free' },
  ],
  actions: [
    { userId: 'custom_1', type: 'analysis', address: 'test address' },
  ],
  expectedResults: ['Expected outcome'],
};
```

Then add to `ALL_SCENARIOS` and run:
```bash
npm run test:load myCustom
```

### Monitoring During Tests

**Watch server logs:**
```bash
# In separate terminal
tail -f terminals/[server-terminal-id].txt
```

**Monitor Admin Dashboard:**
- Open http://localhost:3000
- Go to Admin tab → Overview
- Watch real-time metrics during test execution

**Check Queue Status:**
- Admin tab → Overview → Queue section
- See queued/processing/completed jobs
- Monitor wait times

## Test Results Analysis

### Success Criteria

**Rate Limiting:**
- Free tier stops at 3 analyses/day ✓
- Pro tier stops at 50 analyses/day ✓
- Hourly limits reset correctly ✓

**Queue System:**
- Pro users get priority ✓
- Token bucket controls concurrency ✓
- All jobs complete eventually ✓

**Cost Tracking:**
- Per-user costs tracked ✓
- Totals match individual sums ✓
- Budget alerts trigger correctly ✓

**Concurrent Access:**
- 20+ users handled smoothly ✓
- No crashes or errors ✓
- Response times acceptable ✓

### Performance Benchmarks

**Target Metrics:**
- Average wait time: < 10 seconds
- Average processing time: < 5 seconds
- Cache hit rate: > 30%
- Error rate: < 5% (excluding expected rate limit errors)
- Memory usage: < 500MB with 20 concurrent users

## Next Steps After Testing

Once testing is complete and all scenarios pass:

1. ✅ **Confidence in multi-user system**
2. ✅ **Ready for production deployment**
3. ✅ **Rate limits validated**
4. ✅ **Cost tracking verified**
5. ✅ **Queue system proven**

### Production Deployment Checklist

- [ ] All test scenarios pass
- [ ] No memory leaks detected
- [ ] Cache hit rate acceptable
- [ ] Error handling robust
- [ ] Test routes disabled in production
- [ ] Test dashboard removed from build
- [ ] Environment variables configured
- [ ] Database/Redis for session storage (if needed)
- [ ] Monitoring and alerting set up
- [ ] Backup and recovery plan in place

## Support

If you encounter issues during testing:

1. Check server logs for errors
2. Verify all dependencies installed (`npm install`)
3. Ensure ports 3000 and 3002 are available
4. Check Claude API key is valid
5. Verify RentCast API key is valid
6. Review `server/test-routes.ts` for endpoint details

## Summary

This testing suite provides comprehensive validation of your multi-user system. Use the manual dashboard for interactive exploration and the automated scripts for systematic validation. Together, they give you confidence that your application is ready for production with multiple concurrent users.
