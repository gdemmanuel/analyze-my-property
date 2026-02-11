# AirROI Cursor Handoff — Phase 5 (RentCast Data Expansion Complete)
**Date**: Feb 11, 2026 | **Branch**: master | **Ahead**: 19 commits | **Uncommitted**: 7 files (see below)

---

## SYSTEM SUMMARY

**What**: Real estate STR/MTR/LTR underwriting app with AI analysis + RentCast market data.
**Stack**: React 19 + Vite + Tailwind v4 + Claude API + RentCast API + Express proxy.

**Architecture**:
```
Browser (Vite :3000) → /api proxy → Express (:3002) → Claude / RentCast APIs
```
- API keys server-side ONLY (no VITE_ prefix for secrets).
- Server: helmet, CORS, rate limiting (IP-based), TTL caching, auth scaffold.
- Frontend: React Query client cache (30m stale, 24h gc, refetchOnMount: false).
- RentCast proxy is a transparent passthrough — any `/api/rentcast/*` maps to `https://api.rentcast.io/v1/*`.

**How to run**:
```bash
npm run dev:full   # concurrently: Express :3002 + Vite :3000 (proxy /api → :3002)
```

---

## UNCOMMITTED CHANGES (Phase 5 — RentCast Data Expansion)

All changes are staged/modified, not yet committed:
```
 M App.tsx                        — passes 6 new props to DashboardTab
 M components/DashboardTab.tsx    — 7 new UI sections for expanded RentCast data
 M services/claudeService.ts      — enriched ground truth with features, history, AVM comps, sale stats
 M services/rentcastService.ts    — 12 new types, expanded data extraction, new endpoints
 M src/hooks/usePropertyData.ts   — new useRentalListings hook, updated composite hook
 M types.ts                       — fixed dataSource union to include 'Web Search'
?? components/MarketTrendCharts.tsx — NEW: historical price/rent trend charts
```

---

## FILE MAP

### Server

| File | Lines | Purpose |
|------|-------|---------|
| `server/index.ts` | 326 | Express server. helmet, CORS, rate limiting, Claude proxy, RentCast passthrough proxy, auth session, health check, static serving + SPA fallback. Rate limits: 30/min general, 10/min Claude, 3/10min analysis. |
| `server/cache.ts` | 74 | TTL in-memory cache. `claudeCache` (30m), `rentcastCache` (60m). maxSize: 500, LRU eviction. |
| `server/auth.ts` | 103 | Session-based auth scaffold. IP fallback. Tier limits defined but NOT enforced. |

### Frontend — Services

| File | Lines | Purpose |
|------|-------|---------|
| `services/rentcastService.ts` | 590 | **HEAVILY EXPANDED in Phase 5.** 12 interfaces (`PropertyFeatures`, `SaleHistoryEntry`, `TaxAssessmentEntry`, `PropertyOwner`, `AVMComparable`, `ListingDetails`, `MarketTrendEntry`, `MarketStats`, `RentalListing`, expanded `RentCastProperty`). `fetchPropertyData` now extracts: features, saleHistory, taxAssessments, owner, zoning, avmValueRange, avmComparables, listingDetails (DOM, type, agent, price history). `fetchMarketStats` now calls `?dataType=All` for sale+rental stats. New: `fetchRentalListings`, `extractMarketTrends`, `getBedroomMatchedStats`. |
| `services/claudeService.ts` | 821 | All Claude calls via `claudeProxy()` → `fetch('/api/claude/...')`. `withRetry` (90s countdown on 429). `analyzeProperty` ground truth now includes: features, sale history, listing details, AVM comps with correlation scores, sale market stats, bedroom-matched data. |

### Frontend — Core

| File | Lines | Purpose |
|------|-------|---------|
| `App.tsx` | 903 | State hub. 30+ useState vars, React Query hooks. Computed values (capRate, CoC, DSCR). New in Phase 5: `marketTrends` memo (extractMarketTrends), `bedroomStats` memo (getBedroomMatchedStats), `rentalListingsQuery`. Passes 6 new props to DashboardTab: `propertyData`, `marketStats`, `marketTrends`, `bedroomStats`, `rentalListings`, `rentEstimateData`. |
| `src/hooks/usePropertyData.ts` | 161 | React Query hooks. New: `useRentalListings`. `useRentCastData` composite now includes `rentalListings` query chained after property data (needs zipCode, bedrooms, propertyType). |
| `src/lib/queryClient.tsx` | 64 | Global: gcTime 24h, staleTime 5m, retry 3 exponential, refetchOnMount false. |

### Frontend — Components

| File | Lines | Purpose |
|------|-------|---------|
| `components/DashboardTab.tsx` | 688 | **HEAVILY EXPANDED in Phase 5.** New sections: AVM Value Range bar, Listing Intel card (DOM/type/MLS/price changes), Property Features chips (pool/garage/fireplace/AC/zoning etc.), Market Health card (6 metrics), Bedroom-Matched Stats row, Sale History timeline, MarketTrendCharts embed, enhanced Market Comps (AVM sale comps with correlation scores + active rental listings + listing agent contact + tax assessments). |
| `components/MarketTrendCharts.tsx` | 227 | **NEW in Phase 5.** Recharts AreaChart/LineChart with toggle between sale price trends and rental rate trends. Calculates annualized appreciation/growth rates. Uses `MarketTrendEntry[]` from rentcastService. |
| `components/NavBar.tsx` | 71 | Horizontal top nav (fixed), strategy toggle (STR/MTR/LTR) |
| `components/SearchBar.tsx` | 45 | Address input, "Web Search Data" badge, UNDERWRITE button |
| `components/Charts.tsx` | 257 | Cash flow, ROI, equity buildup charts (recharts) |
| `components/FinancialTables.tsx` | 211 | Monthly/yearly cash flow tables. Resizable columns. |
| `components/PathToYesPanel.tsx` | 322 | Path to Yes analysis panel |
| `components/SensitivityTable.tsx` | 194 | Sensitivity analysis matrix |
| `components/AmenityROIPanel.tsx` | 176 | Amenity ROI analysis panel |
| `components/LenderPacketExport.tsx` | 681 | Lender packet generator |
| `components/PropertyChat.tsx` | 113 | AI chat about the property |
| `components/SettingsTab.tsx` | 135 | Global settings, investment targets, amenity editor |
| `components/PortfolioTab.tsx` | 177 | Saved assessments grid, comparison selection |
| `components/ComparisonModal.tsx` | 130 | Side-by-side property comparison overlay |
| `components/ui/ErrorBoundary.tsx` | 116 | Error boundaries |
| `components/ui/ProgressIndicator.tsx` | 195 | Step-by-step analysis progress |
| `components/ui/Toast.tsx` + `ToastContext.tsx` | 68+89 | Toast notification system |

### Utils / Config

| File | Lines | Purpose |
|------|-------|---------|
| `utils/financialLogic.ts` | 212 | `calculateMonthlyProjections`, `aggregateToYearly` |
| `utils/formatCurrency.ts` | 2 | USD formatter |
| `utils/exportReport.ts` | 265 | HTML report generation + print |
| `prompts/underwriting.ts` | 764 | All Claude prompt templates (audit, underwrite, sensitivity, amenity ROI, path to yes, lender packet, market discovery, comps strength) |
| `types.ts` | 152 | `PropertyConfig`, `MarketInsight`, `SavedAssessment`, `Amenity`, `RentalStrategy`. **Phase 5**: `dataSource.adrSource` type now includes `'Web Search'`. |
| `constants.ts` | 40 | `DEFAULT_CONFIG`, `AMENITIES` |
| `vite.config.ts` | 37 | Proxy `/api` → `:3002`. HMR ws on localhost:3000. |
| `.env` | 3 keys | `ANTHROPIC_API_KEY`, `RENTCAST_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY` (server-side only for first two). |

---

## CRITICAL SNIPPETS — PRESERVE EXACTLY

### Address Normalization (App.tsx ~L400)
```typescript
const normalizeAddress = (address: string): string => {
  return address.trim().toLowerCase().replace(/\s+/g, ' ').replace(/,\s*/g, ', ');
};
```

### Main Element Padding (App.tsx ~L688) — MUST KEEP pt-24
```typescript
<main className="flex-1 pt-24 px-4 pb-4 lg:px-8 lg:pb-8 print:pt-0 print:p-0">
```

### Server Key Loading (server/index.ts ~L41)
```typescript
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY;
```
NO `VITE_*` fallbacks. Keys must NOT have `VITE_` prefix.

### RentCast Proxy (server/index.ts ~L209)
```typescript
app.use('/api/rentcast', async (req, res) => {
  const url = `https://api.rentcast.io/v1${req.url}`;
  // ... transparent passthrough with X-Api-Key header
});
```
All RentCast endpoints work via this passthrough — no server changes needed for new endpoints.

### RentCastProperty Interface (rentcastService.ts ~L155)
```typescript
export interface RentCastProperty {
  // Core fields (existing)
  id, formattedAddress, addressLine1, city, state, zipCode,
  bedrooms, bathrooms, squareFootage, lotSize, yearBuilt, propertyType,
  lastSalePrice?, lastSaleDate?, taxMonthly?, hoaMonthly?, images?, mainImage?,
  // Phase 5 additions
  features?: PropertyFeatures;
  saleHistory?: SaleHistoryEntry[];
  taxAssessments?: TaxAssessmentEntry[];
  owner?: PropertyOwner;
  ownerOccupied?: boolean;
  zoning?: string; subdivision?: string;
  latitude?: number; longitude?: number; county?: string;
  avmValueRange?: { low: number; high: number };
  avmComparables?: AVMComparable[];
  listingDetails?: ListingDetails;
}
```

### fetchMarketStats Now Uses dataType=All (rentcastService.ts ~L300)
```typescript
const response = await fetch(`/api/rentcast/markets?zipCode=${zipCode}&dataType=All`);
```

### Composite Hook (usePropertyData.ts ~L135)
```typescript
export const useRentCastData = (address, enabled) => {
  const propertyQuery = usePropertyData(address, enabled);
  const zipCode = propertyQuery.data?.zipCode;
  const bedrooms = propertyQuery.data?.bedrooms;
  const propertyType = propertyQuery.data?.propertyType;
  const marketStatsQuery = useMarketStats(zipCode, enabled && !!zipCode);
  const rentEstimateQuery = useRentEstimate(address, enabled);
  const rentalListingsQuery = useRentalListings(zipCode, bedrooms, propertyType, enabled && !!zipCode);
  return { property, marketStats, rentEstimate, rentalListings, isLoading, isError, error };
};
```

---

## KNOWN ISSUES & EDGE CASES

| Issue | Status | Notes |
|-------|--------|-------|
| WebSocket errors in console | Cosmetic | Vite HMR noise when port 3000 in use |
| First search ~90-120s | Expected | RentCast + web search + 5s delay + analysis |
| Repeat search <1s | Expected | React Query + server cache |
| STR web search returns prose | Improved | Better regex; Claude sometimes ignores JSON-only instruction |
| Auth tier limits not enforced | Known | Scaffold only — replace with Supabase for real auth |
| Server cache in-memory | Limitation | Clears on restart. Use Redis for multi-server prod. |
| Many `any` types | Tech debt | ~20+ `any` casts in services and components |
| No CI/CD, no monitoring | Missing | No GitHub Actions, Sentry, or APM |
| 5s sleep before analysis | Intentional | Prevents 429 on first search; skipped on cache hits |
| Phase 5 changes uncommitted | Action needed | 7 files modified/new, needs commit |
| RentCast `dataType=All` may be slower | Monitor | New call fetches sale+rental+history; may increase latency |
| Rental listings query depends on property data | By design | Needs zipCode/bedrooms from property query before enabling |
| MarketTrendCharts only renders if >2 data points | By design | Avoids meaningless 1-2 point charts |
| `VITE_GOOGLE_MAPS_API_KEY` in .env | Unused | Present in .env but no map component exists yet |

---

## COMPLETED PHASES

1. **Core MVP**: STR/MTR/LTR underwriting, 20-year projections, AI recommendations
2. **Tailwind v4**: PostCSS migration complete
3. **React Query**: Client-side caching (30m stale, 24h gc)
4. **Error Handling**: Error boundaries, toast system, progress indicator
5. **UI Polish**: Horizontal nav, dashboard reorder, spacing optimization
6. **App.tsx Decomposition**: 1774 → 885 lines, 10+ extracted components
7. **Backend Proxy**: Express API server, keys server-side, rate limiting, TTL cache
8. **Pre-Production Hardening**: helmet, CORS, API key leak fixes, dead code removal, error sanitization, parallelized RentCast calls, event listener cleanup
9. **RentCast Data Expansion (Phase 5)**: All 6 tiers implemented:
   - **Tier 1 (0 API calls)**: AVM value range + sale comps with correlation, property features, sale history, listing details (DOM/type/agent/price history), correlation on rent comps
   - **Tier 2 (+1 enhanced call)**: Market trend charts (historical price/rent back to 2020), market health card, bedroom-matched stats, active rental listings
   - **Tier 3 (0 API calls)**: Owner info, tax assessments, listing agent contacts, zoning
   - Also fixed 3 pre-existing TS errors (dataSource type union, const assertions)

---

## EXACT NEXT TASKS

### Immediate: Commit Phase 5
```bash
git add -A && git commit -m "feat: expand RentCast data integration — all 6 tiers"
```

### Option A: Deploy to Production
1. `npm run build` — builds frontend to `dist/`
2. Server already serves `dist/` via `express.static` + SPA fallback
3. Deploy Express server to Railway/Render/Fly.io
4. Set env vars: `ANTHROPIC_API_KEY`, `RENTCAST_API_KEY`, `CORS_ORIGIN`, `NODE_ENV=production`
5. Add `"start": "node --loader tsx server/index.ts"` script to package.json

### Option B: Real Auth (Supabase)
1. Replace `server/auth.ts` scaffold with Supabase Auth
2. Add login/signup UI
3. Per-user rate limits with Supabase session tokens
4. PostgreSQL for persisting saved assessments
5. Stripe integration for paid tiers

### Option C: Performance & DX
1. Add `manualChunks` to vite.config.ts (vendor, react-query, recharts)
2. Lazy-load Charts, FinancialTables, MarketTrendCharts
3. Wrap heavy components in `React.memo`
4. Use `useCallback` for handlers passed to child components
5. Reduce/remove 5s sleep in `claudeService.ts` if rate limiting is stable

### Option D: Map Integration
1. `VITE_GOOGLE_MAPS_API_KEY` already in .env
2. Use `latitude`/`longitude` from `RentCastProperty` (now extracted in Phase 5)
3. Show property + AVM comps + rental listings on map
4. Click-to-zoom comp details

---

## IMPORTANT RULES

1. **Never remove `pt-24` from main** — preserves nav spacing
2. **Keep `normalizeAddress` identical** — changes break cache keys
3. **Keep `refetchOnMount: false`** — global default prevents cache miss
4. **API keys must stay server-side** — never use `VITE_` prefix for secrets
5. **Server must run before frontend** — Vite proxies `/api` → `:3002`
6. **Express 5 in use** — no `*` wildcard routes, use `app.use()` for catch-all
7. **Side effects in `useEffect`, never `useMemo`** — recently fixed, don't regress
8. **RentCast proxy is transparent** — new endpoints work automatically via `app.use('/api/rentcast')`
9. **Phase 5 data is all optional** — every new field on `RentCastProperty` is `?`, UI guards with `&&` checks

---

## PERFORMANCE BASELINE

| Metric | Value |
|--------|-------|
| First search | 90-120s (RentCast + web search + delays + analysis) |
| Repeat search | <1s (client cache) or <100ms (server cache hit) |
| Client cache | 24h gcTime, 30m staleTime |
| Server cache | 30m Claude, 60m RentCast, maxSize 500 |
| Rate limits | 30/min general, 10/min Claude, 3/10min analysis (per IP) |
| RentCast calls per search | 5 (properties, avm/value, listings/sale, avm/rent/long-term, listings/rental/long-term) + 1 (markets?dataType=All) |
