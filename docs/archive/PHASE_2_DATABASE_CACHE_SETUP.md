# 📦 Phase 2: Database-Backed Cache - Setup Instructions

## ✅ What Was Implemented

Phase 2 adds **persistent database-backed caching** for RentCast API responses with:

1. **PostgreSQL cache table** in Supabase
2. **Configurable TTL** per endpoint type (7-30 days)
3. **Dual-layer caching**: Memory (fast) + Database (persistent)
4. **Hit tracking & cost savings analytics**
5. **Automatic cleanup** of expired entries
6. **Admin dashboard** showing cache performance

---

## 🚀 Setup Steps

### Step 1: Run Database Migration

1. Open your **Supabase Dashboard** (https://supabase.com/dashboard)
2. Navigate to your project → **SQL Editor**
3. Copy the entire contents of `database/rentcast_cache_schema.sql`
4. Paste into the SQL Editor
5. Click **"Run"**

**What this creates:**
- `rentcast_cache` table with indexes
- Helper functions for analytics and cleanup
- Automatic expiration handling

### Step 2: Verify Table Creation

Run this query in Supabase SQL Editor:

```sql
SELECT * FROM rentcast_cache LIMIT 10;
```

Expected result: Empty table (no errors)

### Step 3: Test Cache Function

Run this query to test the helper functions:

```sql
SELECT * FROM get_rentcast_cache_stats();
```

Expected result: One row with all zeros (cache is empty initially)

### Step 4: Deploy to Railway

The code changes are already pushed. Deploy:

```bash
# Railway auto-deploys from master branch
# Or trigger manual deployment:
railway up
```

### Step 5: Monitor in Admin Dashboard

1. Login as admin user
2. Go to **Admin → Usage Analytics**
3. Scroll to **"Database Cache Performance"** section
4. You should see:
   - Active Entries: 0 (initially)
   - Total Hits: 0 (will increase as cache is used)
   - Avg Hit Count: 0
   - Cost Saved: $0.00

---

## 📊 How It Works

### Cache Flow

```
User Request → RentCast Proxy
    ↓
1. Check Memory Cache (fastest) ← 24h TTL
    ↓ MISS
2. Check Database Cache ← 7-30 day TTL
    ↓ MISS
3. Call RentCast API ($0.06/call after 1,000)
    ↓
4. Save to Database Cache (persistent)
5. Save to Memory Cache (fast access)
    ↓
Return Response
```

### TTL Configuration

Configured in `server/databaseCache.ts`:

| Endpoint | TTL | Why? |
|----------|-----|------|
| `/properties` | 7 days | Property details rarely change |
| `/avm/value` | 7 days | Valuations update weekly |
| `/avm/rent/long-term` | 7 days | Rent estimates stable |
| `/markets` | 30 days | Market stats update monthly |
| `/listings/sale` | 3 days | Listings more dynamic |
| `/listings/rental/long-term` | 3 days | Rentals change frequently |

### Cost Tracking

Every cache hit saves $0.06 (cost per RentCast call after 1,000 free).

**Example:**
- Property searched 10 times
- First search: API call ($0.06)
- Next 9 searches: Cache hits (saved $0.54)
- Total savings per property: **$0.54**

---

## 📈 Expected Impact

### Before Phase 2
- Memory cache: 24 hours
- Cache resets on server restart
- No cross-user cache sharing

### After Phase 2
- Database cache: 7-30 days
- Survives server restarts
- All users share cache
- **Additional 10-15% reduction in API calls**

### Combined Impact (Phase 1 + 2)
- **Total reduction: 70-85%**
- From 63.5 → 10-15 calls/day
- Monthly: 300-450 calls (70% under limit!)
- Annual savings: **$564-$846** in overage fees

---

## 🔍 Monitoring & Analytics

### Admin Dashboard - Usage Analytics Tab

**Database Cache Performance Card:**
- Active Entries: Number of cached responses
- Total Hits: How many times cache was used
- Avg Hit Count: Average hits per cached item
- Cost Saved: Total $ saved from cache hits

**Cache by Endpoint:**
- Shows which endpoints are cached most
- Cost saved per endpoint
- Hit counts per endpoint

**Most Cached Properties:**
- Top 5 properties by cache hits
- Identifies popular/frequently searched addresses

### Console Logs

Watch server logs for cache activity:

```
[Memory Cache HIT] /properties (8ms)
[DB Cache HIT] /avm/value (hits: 5)
[Cache MISS] /markets
[DB Cache SAVE] /properties (TTL: 604800s = 168h)
```

---

## 🛠️ Manual Cache Management

### View All Cache Entries

```sql
SELECT 
  endpoint,
  COUNT(*) as entries,
  SUM(hit_count) as total_hits,
  SUM(cost_saved_usd) as cost_saved
FROM rentcast_cache
WHERE expires_at > NOW()
GROUP BY endpoint
ORDER BY total_hits DESC;
```

### View Specific Cached Property

```sql
SELECT 
  endpoint,
  request_params,
  hit_count,
  cost_saved_usd,
  created_at,
  expires_at
FROM rentcast_cache
WHERE request_params->>'address' ILIKE '%123 Main St%'
ORDER BY created_at DESC;
```

### Clear Expired Entries

```sql
SELECT cleanup_expired_rentcast_cache();
```

### Clear All Cache (Emergency)

```sql
DELETE FROM rentcast_cache;
```

Or via Admin Dashboard:
1. Go to **Admin → System**
2. Scroll to **Cache Management**
3. Click **"Clear RentCast Cache"** or **"Clear All Caches"**

---

## 🔄 Automatic Cleanup

The system automatically cleans expired cache entries:

- **Frequency:** Every 6 hours
- **Also runs:** 5 seconds after server startup
- **Removes:** Entries where `expires_at < NOW()`
- **Max age:** 30 days (even if not expired)

**Console log example:**
```
[DB Cache] Periodic cleanup: removed 42 expired entries
```

---

## 🎯 Cache Hit Rate Goals

**Target metrics:**

| Metric | Goal | Excellent |
|--------|------|-----------|
| Memory Cache Hit Rate | >60% | >80% |
| Database Cache Hit Rate | >40% | >60% |
| Combined Hit Rate | >70% | >85% |
| Avg Hits per Entry | >3 | >5 |

**How to improve:**
- Let cache warm up over time
- Focus on common properties
- Pre-cache popular addresses (Phase 3)

---

## 🐛 Troubleshooting

### Cache not working?

**Check 1: Is table created?**
```sql
SELECT COUNT(*) FROM rentcast_cache;
```
- If error: Run migration again

**Check 2: Are entries being saved?**
```sql
SELECT * FROM rentcast_cache ORDER BY created_at DESC LIMIT 5;
```
- If empty: Check server logs for errors

**Check 3: Is Supabase connection working?**
- Check environment variables in Railway
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

**Check 4: Check server logs**
```
[DB Cache] Error saving to database: ...
```
- Fix Supabase credentials
- Check table permissions

### Cache not expiring?

Run manual cleanup:
```sql
SELECT cleanup_expired_rentcast_cache();
```

### High memory usage?

Reduce memory cache size in `server/cache.ts`:
```typescript
export const rentcastCache = new TTLCache(
  24 * 60 * 60 * 1000,
  500  // Reduce from 1000 to 500
);
```

---

## 📋 Verification Checklist

After deployment, verify:

- [ ] Database table created (run `SELECT * FROM rentcast_cache`)
- [ ] Functions exist (run `SELECT get_rentcast_cache_stats()`)
- [ ] Server logs show cache activity
- [ ] Admin dashboard shows "Database Cache Performance"
- [ ] Make a property search
- [ ] Verify cache entry created in Supabase
- [ ] Search same property again
- [ ] Verify hit_count increased

---

## 🎉 Success!

Once deployed and verified, you have:

✅ Persistent caching across server restarts  
✅ Longer TTL (7-30 days vs 24 hours)  
✅ Shared cache for all users  
✅ Cost tracking and analytics  
✅ Automatic cleanup  
✅ **70-85% reduction in API calls**  
✅ **~$564/year saved in overage fees**

---

## 🚀 What's Next? (Phase 3)

Future optimizations:
- Request deduplication (prevent duplicate in-flight requests)
- Pre-caching popular properties
- Cache warmup job (nightly refresh of top properties)
- Smart cache invalidation rules
- Cache key compression (reduce storage)

See `RENTCAST_OPTIMIZATION_STRATEGY.md` for full roadmap.
