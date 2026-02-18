# 🚀 RentCast API Optimization Strategy

## 📊 Current Situation

**RentCast Plan:** Foundation Tier
- **Cost:** $74/month
- **Limit:** 1,000 API requests/month
- **Current Usage:** 889/1,000 (88.9%)
- **Days Left:** 14 of 28 days (50% of billing period)
- **Projected End of Month:** ~1,778 requests (77.8% over limit!)

**Overage Costs:** $0.06 per request over 1,000
- **Projected Overage:** 778 requests × $0.06 = **$46.68 extra**
- **Total Month Cost:** $74 + $46.68 = **$120.68**

---

## 🎯 Optimization Goals

1. **Reduce API calls by 60%** to stay under 1,000/month
2. **Extend cache TTL** for rarely-changing data
3. **Implement database persistence** for property data
4. **Add cache warmup** for common queries

---

## 📈 Current RentCast API Calls Per Analysis

Each property analysis makes approximately **18-20 RentCast calls:**

### **Per `fetchPropertyData()` (3 calls)**
1. `/listings/sale?address=...&status=Active`
2. `/avm/value?address=...` 
3. `/properties?address=...`

### **Per `fetchMarketStats()` (1 call)**
4. `/markets?zipCode=...&dataType=All`

### **Per `fetchRentEstimate()` (1 call)**
5. `/avm/rent/long-term?address=...`

### **Per `fetchRentalListings()` (1 call - if used)**
6. `/listings/rental/long-term?zipCode=...`

### **Total per unique property:** ~6 calls
### **With testing/refreshes:** 18-20 calls per session

---

## 🛠️ Optimization Strategies

### **Strategy 1: Extend Cache TTL** ⚡ (Quick Win)

**Current:** 2 hours
**Recommended:** 24-48 hours for most data

**Rationale:**
- Property data (beds, baths, sqft) doesn't change frequently
- Market stats update monthly at most
- Tax assessments change once per year
- AVM values update weekly/monthly

**Implementation:**
```typescript
// server/cache.ts
export const rentcastCache = new TTLCache(
  24 * 60 * 60 * 1000,  // 24 hours (from 2 hours)
  1000                   // Increase max size to 1000
);
```

**Impact:** Reduces calls by 40-50% for repeat searches

---

### **Strategy 2: Database-Backed Cache** 💾 (High Impact)

Store RentCast responses in PostgreSQL with longer TTL:

**Create new table:**
```sql
CREATE TABLE rentcast_cache (
  id SERIAL PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  endpoint TEXT NOT NULL,
  response_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rentcast_cache_key ON rentcast_cache(cache_key);
CREATE INDEX idx_rentcast_cache_expires ON rentcast_cache(expires_at);
```

**TTL by endpoint type:**
- Property details: 7 days
- Market stats: 30 days
- AVM values: 7 days
- Rental listings: 3 days

**Impact:** Reduces calls by 70-80% across all users

---

### **Strategy 3: Smarter Parallel Fetching** 🔄 (Medium Impact)

**Current Issue:** `fetchPropertyData()` makes 3 API calls even if some data exists in cache

**Solution:** Check cache before each individual call:
```typescript
// Only fetch what's not cached
const [listing, avm, prop] = await Promise.all([
  cachedListing || fetchListing(),
  cachedAVM || fetchAVM(),
  cachedProp || fetchProperty()
]);
```

**Impact:** Reduces calls by 20-30%

---

### **Strategy 4: Aggressive Frontend Caching** 📦 (Quick Win)

**Current:** React Query caches by address only
**Enhancement:** Never refetch unless user explicitly clicks refresh

```typescript
// src/hooks/usePropertyData.ts
export const usePropertyData = (address: string) => {
  return useQuery({
    queryKey: ['property', address],
    queryFn: () => fetchPropertyData(address),
    staleTime: 24 * 60 * 60 * 1000,  // 24 hours
    cacheTime: 48 * 60 * 60 * 1000,  // Keep in cache for 48 hours
    refetchOnMount: false,            // Don't refetch on remount
    refetchOnWindowFocus: false,      // Don't refetch on focus
    refetchOnReconnect: false,        // Don't refetch on reconnect
  });
};
```

**Impact:** Reduces calls by 30-40% for repeat visitors

---

### **Strategy 5: Deduplicate Requests** 🔀 (Medium Impact)

**Issue:** Multiple users searching same address simultaneously = multiple API calls

**Solution:** Request deduplication with in-flight tracking:
```typescript
const inflightRequests = new Map<string, Promise<any>>();

async function fetchWithDedup(key: string, fetcher: () => Promise<any>) {
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key);
  }
  
  const promise = fetcher();
  inflightRequests.set(key, promise);
  
  try {
    const result = await promise;
    return result;
  } finally {
    inflightRequests.delete(key);
  }
}
```

**Impact:** Reduces calls by 10-15% during peak usage

---

### **Strategy 6: Pre-Cache Popular Properties** 🔥 (Advanced)

Track most-searched properties and pre-cache them:
- Top 10 most-searched addresses
- Cache warming job runs nightly
- Always fresh data for popular searches

**Impact:** Reduces calls by 15-20% for high-traffic properties

---

## 📊 Combined Impact Projection

| Strategy | Reduction | Effort | Priority |
|----------|-----------|--------|----------|
| **Extend Cache TTL** | 40-50% | Low | 🔴 **High** |
| **Database Cache** | 70-80% | High | 🔴 **High** |
| **Frontend Caching** | 30-40% | Low | 🔴 **High** |
| **Deduplicate Requests** | 10-15% | Medium | 🟡 Medium |
| **Smarter Parallel Fetch** | 20-30% | Medium | 🟡 Medium |
| **Pre-Cache Popular** | 15-20% | High | 🟢 Low |

**Total Projected Reduction:** 70-85% (combined strategies)

---

## 💰 Cost Analysis: Stay on Foundation vs Upgrade

### **Scenario A: Current Trajectory (No Optimization)**
```
Month 1: $120.68 ($74 + $46.68 overage)
Month 2: $150+ (as usage grows)
Annual: ~$1,500-1,800
```

### **Scenario B: Implement Strategies 1-3 (70% reduction)**
```
Current: 889 calls in 14 days = 63.5 calls/day
With 70% reduction: 19 calls/day
Projected monthly: 570 calls (within limit!)
Annual: $888 ($74 × 12)
```

### **Scenario C: Upgrade to Growth Plan**
```
Growth Plan: 5,000 requests/month for $199/month
Monthly: $199
Annual: $2,388
Break-even: Need ~3,350 calls/month to justify
```

**Recommendation:** **Implement Strategies 1-3** before considering upgrade!

---

## 🎯 Implementation Priority

### **Phase 1: Quick Wins (This Week)**
1. ✅ Extend cache TTL to 24 hours
2. ✅ Update React Query config for longer caching
3. ✅ Add usage analytics to admin dashboard (DONE!)

**Estimated Reduction:** 60-70%

### **Phase 2: Database Cache (Next Week)**
1. Create `rentcast_cache` table in Supabase
2. Implement database-backed caching layer
3. Set endpoint-specific TTLs (7-30 days)

**Estimated Additional Reduction:** 10-15%

### **Phase 3: Advanced Optimizations (Future)**
1. Request deduplication
2. Smarter parallel fetching
3. Pre-caching for popular properties

**Estimated Additional Reduction:** 5-10%

---

## 📋 Immediate Action Items

**Do These Today:**

1. **Extend server cache TTL** (5 minutes)
2. **Update React Query staleTime** (5 minutes)
3. **Monitor usage** in new Analytics tab

**Expected Result:** 
- Reduce from 63.5 → 25 calls/day
- Stay under 1,000/month limit
- Save $46.68/month in overage fees

---

## 🔍 Monitoring

Use your new **Usage Analytics** tab to track:
- Daily RentCast call count
- Top users consuming API credits
- Cost projections
- Cache hit rates

**Set alerts:**
- ⚠️ 700 calls (70% of limit)
- 🚨 850 calls (85% of limit)
- 🔴 950 calls (95% of limit)

---

**Ready to implement?** Let me know which strategies you want to start with! 🚀
