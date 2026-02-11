# 🔄 Cursor Handoff: React Query Cache Refactor

**Date**: Feb 11, 2026  
**Status**: Ready for clean architecture refactor  
**Port**: http://localhost:3000  
**Issue**: Second searches trigger duplicate API calls (429 errors) and don't finish

---

## 🎯 EXACT NEXT TASK

**Refactor App.tsx to simplify caching logic:**

### Current Problem
Complex state tracking (`lastWebSearchAddress`, `needsWebData`, `isNewSearch`) causes:
- Analysis runs TWICE (first with null data, then with web data) → 429 error
- UI doesn't update on second search (infinite re-renders)
- Race conditions between state updates and query enables

### Solution: Trust React Query
1. **Remove** all manual cache tracking state
2. **Always enable** queries when address exists (React Query handles caching)
3. **Simplify** `canAnalyze` to basic dependency check
4. **Let** `staleTime: 30min` control freshness

### Expected Result
- First search: ~90s (fetches all data)
- Repeat search: < 1s (all from cache)
- No duplicate calls, no 429 errors

---

## 📁 CRITICAL FILES

### **App.tsx** (1695 lines) - Main component
**Lines to refactor:**
- **190-218**: Remove `lastWebSearchAddress` state, `isNewSearch` logic
- **198-201**: Change to `const webSTRQuery = useWebSTRData(targetAddress, propertyQuery.data?.bedrooms, propertyQuery.data?.bathrooms, !!targetAddress)`
- **233-236**: Simplify to `const canAnalyze = propertyQuery.isSuccess && marketStatsQuery.isSuccess && rentEstimateQuery.isSuccess && webSTRQuery.isSuccess && !!strData`
- **273-280**: Fix results processing - remove `displayedAddress` check causing infinite loop

**Keep unchanged:**
- **719-725**: `normalizeAddress()` - critical for cache keys
- **728-735**: `runAnalysis()` - just sets `targetAddress`

### **src/hooks/usePropertyData.ts** (117 lines) - React Query hooks
**Lines 93-114**: `usePropertyAnalysis` hook
```typescript
queryKey: ['propertyAnalysis', address], // Only address in key
enabled: enabled && !!address,
staleTime: 30 * 60 * 1000,
refetchOnMount: false, // Critical: use cache
retry: (failureCount, error: any) => error?.status === 429 ? false : failureCount < 1
```

### **src/lib/queryClient.tsx** (62 lines) - Global config
```typescript
gcTime: 24 * 60 * 60 * 1000,  // 24hr cache
staleTime: 5 * 60 * 1000,      // 5min fresh (hooks override to 30min)
refetchOnWindowFocus: false,
refetchOnReconnect: false
```

### **services/claudeService.ts** (915 lines)
**Line 526**: `await sleep(5000)` - pre-analysis delay for rate limiting  
**Lines 315-391**: `searchWebForSTRData()` - web search with tool  
**Lines 37-43**: API key logging (SECURITY: now masked, only in DEV)

---

## 🔑 CRITICAL SNIPPETS - DO NOT MODIFY

### Address Normalization (App.tsx:719-725)
```typescript
const normalizeAddress = (address: string): string => {
  return address
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/,\s*/g, ', ');
};
```

### Query Key Patterns (must stay consistent)
```typescript
['property', address]           // RentCast property
['marketStats', zipCode]        // Market stats
['rentEstimate', address]       // LTR rent
['webSTRData', address, beds, baths]  // Web search (current)
['propertyAnalysis', address]   // Main analysis
```

### Web Search Tool (claudeService.ts:323-328)
```typescript
tools: [{
  type: "web_search_20250305",
  name: "web_search"
}]
```

---

## 🐛 KNOWN ISSUES

| Issue | Root Cause | Status |
|-------|-----------|--------|
| Second search never finishes | Duplicate analysis calls + infinite re-render | 🔴 BLOCKING |
| 429 errors on first search | Analysis runs twice (before & after web search) | 🔴 BLOCKING |
| `needsWebData` logic broken | `isNewSearch` toggles too early, disabling web query | 🔴 BLOCKING |
| API key in console (FIXED) | `fullKey` was logged | ✅ Now masked in DEV only |

---

## 🔄 REFACTOR STEPS

### Step 1: Remove Manual State Tracking
```typescript
// DELETE these lines (App.tsx ~196-213):
const [lastWebSearchAddress, setLastWebSearchAddress] = useState('');
const isNewSearch = propertyQuery.isSuccess && targetAddress && targetAddress !== lastWebSearchAddress;
const needsWebData = isNewSearch;

useEffect(() => {
  if (webSTRQuery.isSuccess && targetAddress && targetAddress === lastWebSearchAddress) return;
  if (webSTRQuery.isSuccess && targetAddress) {
    setLastWebSearchAddress(targetAddress);
  }
}, [webSTRQuery.isSuccess, targetAddress, lastWebSearchAddress]);
```

### Step 2: Simplify Query Enabling
```typescript
// REPLACE web search query call:
const webSTRQuery = useWebSTRData(
  targetAddress,
  propertyQuery.data?.bedrooms,
  propertyQuery.data?.bathrooms,
  !!targetAddress  // Simple: enable if we have an address
);
```

### Step 3: Simplify Analysis Gate
```typescript
// REPLACE canAnalyze logic:
const canAnalyze = 
  !!targetAddress &&
  propertyQuery.isSuccess && 
  marketStatsQuery.isSuccess && 
  rentEstimateQuery.isSuccess && 
  webSTRQuery.isSuccess &&
  !!strData;  // Ensure web search completed
```

### Step 4: Fix Results Processing
```typescript
// FIX the useEffect (App.tsx ~273):
useEffect(() => {
  if (!analysisQuery.isSuccess || !analysisQuery.data) return;
  
  const result = analysisQuery.data;
  const factual = propertyQuery.data;
  
  // Process results (existing logic)
  setInsight(result);
  setDisplayedAddress(targetAddress);
  // ... rest of processing
  setIsAnalyzing(false);
}, [analysisQuery.isSuccess, analysisQuery.data, propertyQuery.data, targetAddress]);
```

### Step 5: Remove Debug Logs
```typescript
// DELETE console.log lines:
// - Line 218: [Debug Web Data Logic]
// - Line 230: [strData] Web search data received
// - Line 248: [Analysis] Ready to analyze?
```

---

## ⚙️ ENVIRONMENT

```
Node: v22+
React: 19.2.3
Vite: 6.4.1
Tailwind: v4 (PostCSS)
Claude API: sk-ant-api... (108 chars, in .env)
RentCast API: eba8460a... (in .env)
```

---

## 📊 EXPECTED BEHAVIOR AFTER REFACTOR

### First Search
1. User enters: `2711 Oak View Ln, Tobyhanna, PA 18466`
2. RentCast queries fetch (3-5s)
3. Web search executes via Claude (~30-60s)
4. 5s delay (in claudeService)
5. Main analysis runs (~20-30s)
6. **Total: ~90-120s**

### Repeat Search (Same Address)
1. User enters same address
2. ALL queries return from cache instantly
3. Results display immediately
4. **Total: < 1 second**

### Console Output (Success)
```
[RentCast] Fetching data for: 2711 oak view ln...
[RentCast] Found active listing price: $370000
[Claude] Searching web for STR data: 2711 oak...
[Claude] ✅ Found STR data - ADR: $325, Occ: 36%
[Claude] Data Source Summary: {adr: 'Web Search', occupancy: 'Web Search', ...}
```

---

## 🚨 CRITICAL WARNINGS

1. **DO NOT** change `normalizeAddress()` - breaks cache keys
2. **DO NOT** modify query keys - breaks existing cache
3. **DO NOT** add `enabled` conditions based on component state - causes race conditions
4. **DO** trust React Query's built-in caching
5. **DO** use `staleTime` to control freshness, not manual state

---

## 📦 GIT STATUS

**Branch**: master (ahead of origin by 1 commit)  
**Uncommitted changes**: App.tsx, services/claudeService.ts, src/hooks/usePropertyData.ts  
**Ready to commit after refactor**: Yes

---

## 🎯 SUCCESS CRITERIA

- ✅ First search completes in 90-120s with correct ADR/OCC from web search
- ✅ Second search completes in < 1s with identical results
- ✅ No 429 errors
- ✅ No infinite re-renders
- ✅ Console shows `{adr: 'Web Search', occupancy: 'Web Search'}`
- ✅ All React Query cache hits show `fetchStatus: 'idle'`

---

**Handoff complete. Execute refactor steps 1-5 in order.**
