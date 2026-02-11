# 🔧 Phase 2 Refactor Plan - Simplify & Optimize

**Created**: February 10, 2026  
**Status**: Planning  
**Goal**: Fix complexity issues introduced in Phase 1, improve reliability, prepare for React Query

---

## 🔴 PROBLEMS IDENTIFIED

### 1. **Caching Layer Complexity**
- Custom `cacheService.ts` with `Symbol(NOT_IN_CACHE)` causing confusion
- Cache checks scattered across multiple files
- No clear cache invalidation strategy
- Hard to debug when cache returns unexpected values

### 2. **API Call Architecture Issues**
- `Promise.all()` making all requests simultaneously → hitting rate limits faster
- Multiple fallback chains (RentCast → Web Search → AI) creating unpredictable behavior
- Too many delays/sleeps added as band-aids
- No request queuing or proper throttling

### 3. **Data Quality Issues**
- RentCast sales comps not returning data (API endpoint may be wrong)
- STR comps defaulting to AI web search too often
- Inaccurate estimates when RentCast data is missing

### 4. **Font Color Issue**
- Changed `text-slate-700` → `text-[#1e293b]` but browser cache preventing updates
- Suggests deeper Tailwind CDN/build issue

### 5. **Production Readiness**
- Tailwind CDN warning (can't use in production)
- No proper build process
- Missing error boundaries
- Rate limit handling is reactive, not proactive

---

## ✅ PHASE 2 GOALS

### Primary Objectives:
1. **Remove custom caching** - Let React Query handle it (Phase 2b)
2. **Simplify API call flow** - Sequential when needed, parallel when safe
3. **Fix RentCast comps** - Use working endpoint or remove feature
4. **Optimize Claude API usage** - Request pooling, better rate limit handling
5. **Fix Tailwind build** - Move from CDN to PostCSS
6. **Improve data reliability** - Better fallbacks, clearer error states

---

## 📋 PHASE 2A: IMMEDIATE FIXES (1-2 hours)

### Task 1: Fix Tailwind CSS Build Issue ✅ HIGH PRIORITY
**Problem**: Using CDN in production (bad performance, cache issues)  
**Solution**: 
- Install Tailwind as PostCSS plugin
- Configure `tailwind.config.js` properly
- Remove CDN script from `index.html`
- Build CSS during Vite compilation

**Files to modify**:
- `package.json` - Add tailwind dependencies
- `tailwind.config.js` - Verify configuration
- `src/index.css` - Add Tailwind directives
- `index.html` - Remove CDN script tag

**Expected outcome**: Proper CSS builds, font color fix finally works

---

### Task 2: Simplify RentCast API Calls ✅ HIGH PRIORITY
**Problem**: Sales comps endpoint not working, too many API calls  
**Solution**:
- Test RentCast `/comps/sale` endpoint manually
- If broken, fallback to property valuations only
- Remove unnecessary `fetchSTRComps` if data isn't available
- Use rent estimate comps instead (already working)

**Files to modify**:
- `services/rentcastService.ts`

**Expected outcome**: Either working sales comps OR simplified flow without them

---

### Task 3: Remove Custom Cache Layer ✅ MEDIUM PRIORITY
**Problem**: Symbol(NOT_IN_CACHE) causing confusion, hard to debug  
**Solution**:
- Remove `cacheService.ts` entirely
- Remove all `cacheService.get()` and `cacheService.set()` calls
- Let React Query handle caching in Phase 2b (or use simple localStorage)

**Files to modify**:
- Delete `services/cacheService.ts`
- `services/rentcastService.ts` - Remove cache checks
- `services/claudeService.ts` - Remove cache checks
- `App.tsx` - Remove cache imports

**Expected outcome**: Simpler code, easier debugging, no Symbol issues

---

### Task 4: Optimize Claude API Rate Limiting ✅ MEDIUM PRIORITY
**Problem**: Hitting 429 errors frequently, delays not helping  
**Solution**:
- Implement request queue (max 1-2 requests per minute)
- Remove `Promise.all()` for Claude calls
- Make calls sequential with proper delays
- Add exponential backoff (already started, needs refinement)

**Files to modify**:
- `services/claudeService.ts` - Add request queue
- `App.tsx` - Sequential Claude calls instead of parallel

**Expected outcome**: Fewer 429 errors, more predictable API usage

---

## 📋 PHASE 2B: REACT QUERY MIGRATION (2-3 hours)

**Do this AFTER Phase 2A is complete and stable**

### Benefits:
- Automatic request deduplication
- Built-in caching (replaces custom cache)
- Better loading states
- Automatic retries
- Request cancellation
- Much cleaner code

### Files to migrate:
1. `App.tsx` - Replace `useState` + `useEffect` with `useQuery`
2. `services/rentcastService.ts` - Return data directly (no cache logic)
3. `services/claudeService.ts` - Return data directly (no cache logic)

### What to install:
```bash
npm install @tanstack/react-query
```

### Setup:
```typescript
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      retry: 1,
    },
  },
});

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

---

## 📋 PHASE 2C: CLEANUP & POLISH (1 hour)

### Task 1: Add Error Boundaries
- Catch React errors gracefully
- Show user-friendly error messages

### Task 2: Improve Loading States
- Better spinners/skeletons
- Progress indicators for long operations

### Task 3: Add Request Status Indicators
- Show when using cached data vs fresh data
- Display last update timestamp
- Show rate limit status

---

## 🎯 IMPLEMENTATION ORDER

### Week 1: Phase 2A (Immediate Fixes)
1. **Day 1**: Fix Tailwind CSS build (Task 1)
2. **Day 2**: Simplify RentCast API calls (Task 2)
3. **Day 3**: Remove custom cache layer (Task 3)
4. **Day 4**: Optimize Claude rate limiting (Task 4)
5. **Day 5**: Test everything, fix regressions

### Week 2: Phase 2B (React Query)
6. **Day 1-2**: Install React Query, setup providers
7. **Day 3-4**: Migrate API calls to useQuery hooks
8. **Day 5**: Test, optimize, cleanup

### Week 3: Phase 2C (Polish)
9. **Day 1-2**: Error boundaries, loading states
10. **Day 3**: Final testing and documentation

---

## 🚨 CRITICAL DECISIONS NEEDED

### Decision 1: RentCast Comps Strategy
**Options**:
- A) Fix sales comps endpoint (test manually first)
- B) Use rent estimate comps instead (already working)
- C) Remove comps feature entirely, rely on AI only
- D) Add different data source (AirDNA, Mashvisor)

**Recommendation**: Option B (use rent estimate comps)

---

### Decision 2: Caching Strategy
**Options**:
- A) Remove all caching (simplest, may be slower)
- B) Keep custom cache but simplify (remove Symbol pattern)
- C) Wait for React Query (best long-term)

**Recommendation**: Option A for Phase 2A, then Option C for Phase 2B

---

### Decision 3: API Call Pattern
**Options**:
- A) All sequential (safest, slowest)
- B) Smart batching (complex, faster)
- C) Keep Promise.all() (current, causes rate limits)

**Recommendation**: Option A for Phase 2A, then Option B with React Query

---

## 📊 EXPECTED OUTCOMES

### After Phase 2A:
- ✅ Tailwind font colors finally work
- ✅ Fewer 429 rate limit errors
- ✅ Simpler, more debuggable code
- ✅ RentCast comps either working or removed
- ✅ No more Symbol(NOT_IN_CACHE) confusion

### After Phase 2B:
- ✅ 50-80% less code
- ✅ Automatic caching and deduplication
- ✅ Better loading states
- ✅ Faster perceived performance

### After Phase 2C:
- ✅ Production-ready
- ✅ Better error handling
- ✅ Professional UX polish

---

## 🔧 ROLLBACK PLAN

If Phase 2A causes major issues:
1. Git revert to last working commit
2. Create new branch for Phase 2 work
3. Test incrementally before merging

**Backup points**:
- Before Phase 2A starts: `git tag phase-1-backup`
- After each task: `git commit` with clear message
- Before Phase 2B: `git tag phase-2a-complete`

---

## 📝 NEXT STEPS

1. **Review this plan** - Any concerns or changes?
2. **Make Decision 1-3** - Choose strategies above
3. **Start Phase 2A Task 1** - Fix Tailwind CSS build
4. **Test after each task** - Don't move forward until stable

---

**Ready to proceed?** Let's start with **Phase 2A Task 1: Fix Tailwind CSS Build**
