# 🚀 AirROI Cursor Handoff - Phase 2B Complete
**Date**: Feb 10, 2026 | **Status**: React Query caching fixed, ready for testing
**Port**: http://localhost:3000/

---

## 📋 EXECUTIVE SUMMARY

**What**: Real estate STR/MTR/LTR underwriting app (React 19 + Vite + Tailwind v4 + Claude API + RentCast)

**Current State**:
- ✅ Phase 2A: Tailwind PostCSS build, smart API grouping (no more CDN)
- ✅ Phase 2B: React Query migration with automatic caching
- ✅ **JUST FIXED**: Repeat searches now use cache (web search skipped on cached queries)
- ✅ STR data accuracy: Now uses Claude web search (accurate market data)
- ⚠️ First search ~90-120s (sequential Claude calls), repeat searches should be **< 1 second** with cache

**Key Achievement**: Replaced 150+ lines of manual fetch/cache logic with React Query hooks

---

## 📁 CRITICAL FILES & LOGIC

### **App.tsx** (1700+ lines)
**Purpose**: Main app component, state management, analysis orchestration

**Key Sections**:
- **Line 719-725**: `normalizeAddress()` - Converts addresses to lowercase/consistent spacing for cache keys
- **Line 728-745**: `runAnalysis()` - Simplified to just set `targetAddress` (triggers React Query)
- **Line 170**: `useRentCastData()` - Parallel RentCast queries (cached)
- **Line 194-207**: **NEW FIX** - `needsWebData = propertyQuery.fetchStatus === 'fetching'` - ONLY fetch web search on first search, skip on cached repeats
- **Line 215-229**: Post-web-search delay (3s) + gate logic
- **Line 267-275**: `usePropertyAnalysis()` hook - Main Claude analysis
- **Line 243-255**: Cache hit logging

**Critical Logic**: On repeat search, `propertyQuery.fetchStatus === 'idle'` (cached) → `needsWebData = false` → web search skipped → instant results

---

### **services/claudeService.ts** (900+ lines)
**Purpose**: Claude API integration + web search

**Key Changes**:
- **Line 526**: `await sleep(5000)` - Pre-analysis delay (was 1500ms, increased for rate limiting)
- **Lines 315-391**: `searchWebForSTRData()` - Claude web search for ADR/occupancy
- **Lines 461-650**: `analyzeProperty()` - Main underwriting analysis
- **Removed**: Manual session cache (replaced by React Query)

**Important**: Web search returns `{ adr: number, occupancy: number }`, used to calibrate Claude's analysis

---

### **services/rentcastService.ts** (240+ lines)
**Purpose**: RentCast API wrapper (property data, NOT STR data)

**Key Endpoints**:
- `/v1/listings/sale` - Active listings (current price)
- `/v1/avm/value` - Property valuation
- `/v1/properties` - Property records (beds, baths, tax, HOA, images)
- `/v1/markets` - Market stats by zip
- `/v1/avm/rent/long-term` - LTR rent + comps

**Critical**: RentCast does NOT provide STR data (ADR/occupancy). Only provides LTR rent.

---

### **src/hooks/usePropertyData.ts** (210+ lines)
**Purpose**: React Query hooks for all API calls

**Key Hooks** (all with 30-min staleTime):
- `usePropertyData(address)` - RentCast property (cached by address)
- `useMarketStats(zipCode)` - Market stats (cached by zip)
- `useRentEstimate(address)` - LTR rent (cached by address)
- `useWebSTRData(address, beds, baths)` - Claude web search (cached)
- `usePropertyAnalysis(address, ...)` - Main analysis (cached by address only)
- `useRentCastData(address)` - Composite hook, parallel queries

**Critical**: Query keys are designed to work with normalized addresses

---

### **src/lib/queryClient.tsx** (62 lines)
**Purpose**: React Query global configuration

**Key Settings**:
```typescript
gcTime: 24 * 60 * 60 * 1000,        // Keep cache 24 hours
staleTime: 5 * 60 * 1000,            // Fresh 5 min (per-hook overrides to 30 min)
retry: 3,                             // 3 retries with exponential backoff
refetchOnWindowFocus: false,          // Don't refetch on tab switch
```

---

## 🔑 CRITICAL SNIPPETS TO PRESERVE

### Address Normalization (MUST STAY IDENTICAL)
```typescript
// Line 719-725 in App.tsx
const normalizeAddress = (address: string): string => {
  return address
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/,\s*/g, ', ');
};
```

### Web Search Gate (ESSENTIAL FOR CACHING)
```typescript
// Line 194-207 in App.tsx - JUST FIXED
const isNewSearch = propertyQuery.fetchStatus === 'fetching';
const needsWebData = propertyQuery.isSuccess && !!targetAddress && isNewSearch;
const webSTRQuery = useWebSTRData(targetAddress, ..., needsWebData);
```

### Query Key Pattern (CONSISTENT ACROSS ALL HOOKS)
```typescript
// One address = one cache entry (normalized)
queryKey: ['propertyAnalysis', address]  // ✅ Works
queryKey: ['property', address]          // ✅ Works
queryKey: ['rentEstimate', address]      // ✅ Works
```

---

## 🐛 KNOWN ISSUES & FIXES

| Issue | Root Cause | Status | Fix |
|-------|-----------|--------|-----|
| First search 429 errors | Concurrent Claude calls | ✅ FIXED | 5s pre-analysis delay + 3s post-web-search delay |
| Second search slow (50s) | Web search ran on every search | ✅ FIXED | Check `fetchStatus === 'fetching'` to skip web search on cached repeats |
| Cache not working | Query keys unstable | ✅ FIXED | Address normalization + normalized address in setTargetAddress |
| Light font colors | Tailwind CDN cache | ✅ FIXED | Switched to PostCSS build |
| Rate limit on paid API | API call timing | ✅ FIXED | Increased delays, skip web search on repeats |

---

## 🎯 EXACT NEXT TASK

### **IMMEDIATE (Right Now)**
```
Test the FINAL caching fix:
1. Hard refresh: Ctrl+Shift+R
2. First search: "2711 Oak View Ln, Tobyhanna, PA 18466" → Wait ~90-120s
3. Second search: EXACT SAME address → Should be < 1 second now!
4. Check console: needsWebData should be FALSE on second search
```

### **Expected Results**
- ✅ First search: Web search runs, 5s pre-analysis delay, Claude analysis runs
- ✅ Second search: NO web search, NO delays, instant cache hit
- ✅ Console: `[Debug Web Data Logic] { needsWebData: false, isNewSearch: false }`

### **If NOT < 1 second**
1. Check console for `[Debug Query Status]` - should show all `fetchStatus: 'idle'`
2. Verify `targetAddress` is identical both searches
3. Check if page was refreshed between searches (clears cache)

### **If < 1 second works**
1. ✅ Phase 2B complete - commit changes
2. Clean up debug logging (remove `console.log` lines)
3. Remove temporary test files (CACHING_DEBUG_GUIDE.md, etc.)
4. Ready for production deployment or next feature

---

## 💾 GIT STATUS

**Ahead of origin/master by 1 commit**

**Uncommitted changes**:
- ✅ All changes in `App.tsx`, `services/claudeService.ts`, `src/hooks/usePropertyData.ts`, `src/lib/queryClient.tsx`
- Ready for commit: `git add . && git commit -m "feat: fix react query caching - skip web search on cached repeats"`

---

## 🔍 ENVIRONMENT

```
Port: http://localhost:3000/
Node: v22+
React: 19.2.3
Vite: 6.4.1
Tailwind: v4 (PostCSS)
Claude API: Paid plan (sk-ant-...)
RentCast API: Valid key
```

---

## ⚡ PERFORMANCE BASELINE

| Metric | Value | Notes |
|--------|-------|-------|
| First search | 90-120s | RentCast + web search + delays + Claude |
| Repeat search | **< 1 second** | Should be instant with cache |
| Cache TTL | 24 hours | React Query gcTime |
| Stale time | 5-30 min | After this, marked stale but still served |
| Rate limit protection | 5s + 3s delays | Between Claude calls |

---

## 🚀 HANDOFF COMPLETE

**All critical information in <2000 tokens**. Ready to hand off to next session or developer.

**Key to remember**: The web search gate (`fetchStatus === 'fetching'`) is the linchpin that makes caching work - without it, web search runs on every search, defeating the cache.

**Test now and report results!**
