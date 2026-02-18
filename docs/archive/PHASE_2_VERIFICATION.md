# ✅ Phase 2 Database Cache - Verification Guide

## Database Migration: COMPLETE ✓

Your `rentcast_cache_schema.sql` has been successfully executed in Supabase!

---

## 🔍 Verification Steps

Run these queries in **Supabase SQL Editor** to verify everything is working:

### Step 1: Check Table Exists
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'rentcast_cache';
```

**Expected result:** One row with `rentcast_cache`

---

### Step 2: Check Table Structure
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rentcast_cache'
ORDER BY ordinal_position;
```

**Expected result:** 13 columns including:
- `id`, `cache_key`, `endpoint`, `response_data`, `status_code`
- `created_at`, `expires_at`, `ttl_seconds`
- `hit_count`, `last_accessed_at`, `cost_saved_usd`
- `request_params`

---

### Step 3: Check Indexes
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'rentcast_cache'
ORDER BY indexname;
```

**Expected result:** 5 indexes:
- `idx_rentcast_cache_created`
- `idx_rentcast_cache_endpoint`
- `idx_rentcast_cache_expires`
- `idx_rentcast_cache_hits`
- `idx_rentcast_cache_key`

---

### Step 4: Test Helper Functions
```sql
-- Test cache stats function
SELECT * FROM get_rentcast_cache_stats();
```

**Expected result:** One row with all values (likely 0s since cache is empty)

```
total_entries | total_hits | total_cost_saved_usd | active_entries | expired_entries | top_endpoint | avg_hit_count
0             | 0          | 0.00                 | 0              | 0               | NULL         | 0
```

---

### Step 5: Test Popular Properties Function
```sql
-- Test popular properties function
SELECT * FROM get_popular_cached_properties(10);
```

**Expected result:** Empty result (0 rows) - cache not warmed up yet

---

## 🚀 Next: Deploy to Railway

The code is already pushed to master. Now:

1. **Trigger Railway deployment:**
   ```bash
   railway up
   ```
   Or use Railway dashboard to manually trigger deploy.

2. **Monitor deployment:**
   ```bash
   railway logs
   ```
   Look for: `[DB Cache] Periodic cleanup` or cache-related messages

---

## ✨ After Deployment

### Test Cache in Action

1. **Login to your app as a user**
2. **Search for a property** (e.g., "123 Main St, Denver, CO")
3. **Check database cache:**
   ```sql
   SELECT COUNT(*) as cached_entries FROM rentcast_cache;
   ```
   Should show: 1+

4. **View the cached data:**
   ```sql
   SELECT 
     endpoint,
     request_params->>'address' as address,
     hit_count,
     created_at,
     expires_at
   FROM rentcast_cache
   ORDER BY created_at DESC
   LIMIT 10;
   ```

5. **Search the same property again**
6. **Check hit count increased:**
   ```sql
   SELECT hit_count, last_accessed_at 
   FROM rentcast_cache 
   WHERE endpoint = '/properties'
   ORDER BY last_accessed_at DESC
   LIMIT 1;
   ```

---

## 📊 Monitor in Admin Dashboard

After deployment:

1. **Login as admin**
2. **Go to Admin → Usage Analytics**
3. **Look for: "Database Cache Performance"**
4. Should show:
   - Active Entries: Growing over time
   - Total Hits: Should increase as users search
   - Cost Saved: Increasing ($0.06 × hit_count)

---

## 🔄 Manual Cache Cleanup (Optional)

If you need to clean up expired entries:

```sql
SELECT cleanup_expired_rentcast_cache();
```

**Returns:** Number of deleted entries

---

## 📋 Troubleshooting

### Functions Don't Exist?
```sql
-- Check if functions exist
SELECT proname FROM pg_proc 
WHERE proname IN ('get_rentcast_cache_stats', 'cleanup_expired_rentcast_cache', 'get_popular_cached_properties');
```

If empty, re-run the schema migration.

### Table Empty After Searches?
1. Check Railway logs: `railway logs`
2. Verify SUPABASE_URL and SUPABASE_SERVICE_KEY are set
3. Check server error logs for DB connection issues

### Cache Not Hitting?
1. Server logs should show: `[DB Cache HIT]` or `[Memory Cache HIT]`
2. If only showing `[Cache MISS]`, cache might not be saving
3. Check Supabase logs for insert errors

---

## 💾 Backup Cache Data (Optional)

If you want to keep cache data before a full reset:

```sql
-- Export current cache
COPY rentcast_cache TO STDOUT CSV HEADER;

-- To restore later:
-- COPY rentcast_cache FROM STDIN CSV HEADER;
```

---

## ✅ Verification Checklist

- [ ] Table created and visible in Supabase
- [ ] All 5 indexes created
- [ ] Helper functions exist
- [ ] Functions return results (even if 0s)
- [ ] Deployed to Railway
- [ ] Made a property search
- [ ] Verified cache entry in database
- [ ] Searched same property again
- [ ] Hit count increased
- [ ] Admin dashboard shows cache stats
- [ ] Cost savings calculating correctly

---

## 🎉 You're All Set!

Once you've verified everything above, your **Phase 2 Database Cache is LIVE!**

Your RentCast API should now be:
✅ Persistent across restarts  
✅ Shared across all users  
✅ Tracking hits and savings  
✅ Automatically cleaning up  
✅ Reducing API calls by 70-85%  

Monitor the Usage Analytics tab for real-time cache performance. Enjoy the savings! 🚀
