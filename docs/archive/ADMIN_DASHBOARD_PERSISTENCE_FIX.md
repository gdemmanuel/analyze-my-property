# Admin Dashboard Fixes - Database Persistence

## Issues Identified:

1. ❌ **Sessions showing 0** - Old session system removed, not using Supabase auth sessions
2. ❌ **Cost data resets on server restart** - Data stored in memory, not database
3. ❌ **No cost history** - History only exists in memory during current session
4. ❌ **User call counts not showing** - Need to track total lifetime calls per user
5. ❌ **API cost tracking has no history** - Same as #2 and #3

## Root Cause:

All admin metrics (`costTracker`, `metricsStore`) use **in-memory storage** which gets wiped on every Railway deployment or server restart. We need to move this to **PostgreSQL** for persistence.

## Solution Overview:

### Phase 1: Database Schema (✅ READY)
Created `database/api_tracking_schema.sql` with:
- `api_usage_log` table - stores every API call with timestamp, cost, tokens
- `daily_api_costs` table - aggregated daily costs for fast queries
- `increment_daily_cost()` function - atomic cost updates
- RLS policies for admin-only access

### Phase 2: Migrate Cost Tracker (TODO)
1. Replace `server/costTracker.ts` with `server/databaseCostTracker.ts`
2. Update `server/index.ts` to import the new tracker
3. Change `recordClaude()` and `recordRentCast()` calls to `await`

### Phase 3: Fix Session Count (TODO)
Update `server/metrics.ts` to:
- Query Supabase for active user sessions instead of old auth system
- Count users with valid auth tokens (logged in within last 24 hours)

### Phase 4: User Call Tracking (TODO)
Update `server/routes/user.ts` `/api/user/all` to:
- Query `api_usage_log` for total lifetime calls per user
- Add `total_claude_calls` and `total_rentcast_calls` columns
- Join with existing user data

### Phase 5: Cost History UI (TODO)
Update `components/AdminTab.tsx` to:
- Fetch from `/api/admin/cost-history` endpoint
- Display historical data in charts and tables
- Show trends over time

## Implementation Steps:

### Step 1: Run SQL in Supabase
```sql
-- Copy contents of database/api_tracking_schema.sql
-- Paste into Supabase SQL Editor
-- Run the query
```

### Step 2: Update Server Code
- Switch from in-memory to database cost tracker
- Update all cost recording to be async
- Fix session counting

### Step 3: Test
- Verify costs persist after server restart
- Verify history shows properly
- Verify user call counts appear

## Estimated Impact:
- All historical cost data will be preserved
- Accurate session counts from Supabase auth
- User-level analytics for total API usage
- Cost trends and forecasting

---

**Next Action:** Would you like me to implement these changes now? This will require:
1. Running the SQL schema in Supabase
2. Updating multiple server files
3. Testing the changes locally before pushing to production
