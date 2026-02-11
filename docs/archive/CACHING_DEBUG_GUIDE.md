# Caching Debug Guide

## Check if Caching is Actually Working

The second search took 50 seconds instead of < 1 second, which suggests caching might not be working for all queries.

### Step 1: Open Browser Console
1. Open http://localhost:3000/
2. Press **F12** to open DevTools
3. Go to the **Console** tab
4. You should see various `[App]`, `[RentCast]`, `[Claude]` logs

### Step 2: First Search
1. Type: `2711 Oak View Ln, Tobyhanna, PA 18466`
2. Click "UNDERWRITE"
3. Wait for completion (~80-120 seconds)
4. **Look for these console logs**:
   ```
   [App] 🚀 Starting analysis for: 2711 oak view ln, tobyhanna, pa 18466
   [RentCast] Fetching data for: 2711 oak view ln, tobyhanna, pa 18466
   [RentCast] Found active listing price: $370000
   [Claude] Searching web for STR data: 2711 oak view ln, tobyhanna, pa 18466
   [Claude] ✅ Found STR data - ADR: $384, Occ: 46%
   [Cache Debug] { isCached: false, propertyFetchStatus: 'fetching', analysisFetchStatus: 'fetching' }
   [App] AI Result - Occupancy: 46 ADR: 384
   ```

### Step 3: Second Search (Same Address)
1. Type: **EXACT SAME** address: `2711 Oak View Ln, Tobyhanna, PA 18466`
2. Click "UNDERWRITE" again
3. **Look for these console logs** (should be MUCH faster):

**Expected (if cache is working)**:
```
[App] 🚀 Starting analysis for: 2711 oak view ln, tobyhanna, pa 18466
[Cache Debug] { isCached: true, propertyFetchStatus: 'idle', analysisFetchStatus: 'idle' }
[App] AI Result - Occupancy: 46 ADR: 384
```
Completion time: **< 1 second**

**Actual (if cache is NOT working)**:
```
[App] 🚀 Starting analysis for: 2711 oak view ln, tobyhanna, pa 18466
[RentCast] Fetching data for: 2711 oak view ln, tobyhanna, pa 18466
[Claude] Searching web for STR data...
[Cache Debug] { isCached: false, propertyFetchStatus: 'fetching', analysisFetchStatus: 'fetching' }
[App] AI Result - Occupancy: 46 ADR: 384
```
Completion time: **~50-80 seconds**

### Step 4: Report Back
Tell me:
1. Did console show `isCached: true` on second search?
2. Did RentCast logs appear on second search?
3. Did Claude logs appear on second search?
4. How many seconds did second search take?

---

## If Cache is NOT Working

If second search still fetches from APIs and doesn't use cache, the issue could be:

### Possible Issue 1: Page Refresh Between Searches
- Full page reload clears React Query cache
- Cache only persists during the same browser session
- **Solution**: Don't refresh the page between searches

### Possible Issue 2: Different Addresses
- First search: `"2711 Oak View Ln, Tobyhanna, PA 18466"`
- Second search: `"2711 oak view ln, tobyhanna, PA 18466"` (different capitalization)
- Address normalization should handle this, but verify

### Possible Issue 3: targetAddress State Issue
- `targetAddress` might not be matching the normalized address
- **Solution**: Check console for actual normalized address used

### Possible Issue 4: React Query Config Issue
- `refetchOnWindowFocus` might still be true
- `staleTime` might be too short
- **Solution**: Check if data is marked as "stale"

---

## Important: Check These Logs

### Network Tab (F12 → Network)
On second search, you should NOT see:
- ❌ `fetchPropertyData` call
- ❌ `fetchMarketStats` call
- ❌ `fetchRentEstimate` call
- ❌ `searchWebForSTRData` call (Claude)

### Console Logs
Look for these exact patterns:

**Cache Hit Example**:
```
[Cache Debug] {
  address: '2711 oak view ln, tobyhanna, pa 18466',
  propertyStatus: 'success',
  propertyFetchStatus: 'idle',      // ← 'idle' means from cache
  analysisStatus: 'success',
  analysisFetchStatus: 'idle',      // ← 'idle' means from cache
  isCached: true                    // ← THIS IS THE KEY
}
```

**Cache Miss Example**:
```
[Cache Debug] {
  address: '2711 oak view ln, tobyhanna, pa 18466',
  propertyStatus: 'pending',
  propertyFetchStatus: 'fetching',  // ← 'fetching' means API call
  analysisStatus: 'pending',
  analysisFetchStatus: 'fetching',  // ← 'fetching' means API call
  isCached: false                   // ← NOT cached
}
```

---

## Next Steps

1. **Do the 2-search test above**
2. **Check console logs**
3. **Tell me what you see**
4. **I can fix based on actual behavior**

The logs will show exactly where the time is being spent!
