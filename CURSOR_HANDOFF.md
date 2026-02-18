# AirROI Cursor Handoff — Current State
**Date**: Feb 11, 2026 | **Branch**: master | **Deployment**: Railway (analyzemyproperty.com)

---

## SYSTEM SUMMARY

**What**: Real estate STR/MTR/LTR underwriting app with AI analysis + RentCast market data + Supabase auth.
**Stack**: React 19 + Vite + Tailwind v4 + Claude API + RentCast API + Express proxy + Supabase (auth + PostgreSQL).

**Architecture**:
```
Browser (Vite :3000) → /api proxy → Express (:3002) → Claude / RentCast APIs
                                                     → Supabase (auth, DB, cache)
```
- API keys server-side ONLY (no VITE_ prefix for secrets).
- Server: helmet, CORS, rate limiting (IP-based), dual-layer caching (memory TTL + PostgreSQL), Supabase auth.
- Frontend: React Query client cache (24h stale for RentCast, 12h for listings), lazy-loaded tabs, React.memo on expensive components.
- RentCast proxy with database-backed cache (`rentcast_cache` table) — saves API calls across users and server restarts.
- Vite code splitting with manual chunks (react, recharts, supabase, react-query).

**How to run**:
```bash
npm run dev:full   # concurrently: Express :3002 + Vite :3000 (proxy /api → :3002)
```

---

## KEY FILES

### Server

| File | Purpose |
|------|---------|
| `server/index.ts` | Express server. helmet, CORS, rate limiting, Claude proxy, RentCast proxy with DB cache, admin endpoints (cache stats/clear), health check, static + SPA fallback. |
| `server/cache.ts` | In-memory TTL cache. `claudeCache` (30m), `rentcastCache` (24h). maxSize: 1000, LRU eviction. |
| `server/databaseCache.ts` | Database-backed cache layer. Dual-layer (memory + PostgreSQL). Endpoint-specific TTLs (properties: 7d, markets: 30d, listings: 3d). Analytics functions for admin dashboard. |
| `server/supabaseAuth.ts` | Supabase admin client, auth middleware (`requireAuth`), admin check (`requireAdmin`). |
| `server/databaseCostTracker.ts` | API call cost tracking — logs every RentCast/Claude call with cost estimates. |
| `server/routes/user.ts` | User settings CRUD, user listing (admin), user stats. Graceful error handling for missing tables. |

### Frontend — Services

| File | Purpose |
|------|---------|
| `services/rentcastService.ts` | All RentCast API calls. 12+ interfaces. Property data, market stats, rent estimates, rental listings, AVM comps, market trends. |
| `services/claudeService.ts` | All Claude calls via `claudeProxy()`. `withRetry` (90s countdown on 429). Ground truth enrichment with RentCast data. |

### Frontend — Core

| File | Purpose |
|------|---------|
| `App.tsx` | State hub. React Query hooks. Lazy-loaded tabs (AdminTab, PortfolioTab, RentCastDataTab, Charts, FinancialTables). Suspense fallbacks. Toast-based upgrade prompts. |
| `src/hooks/usePropertyData.ts` | React Query hooks with extended TTLs (24h RentCast, 12h listings). `useRentCastData` composite hook. |
| `src/lib/queryClient.tsx` | Global query config: gcTime 24h, staleTime 5m, retry 3 exponential, refetchOnMount false. |
| `src/lib/supabase.ts` | Supabase browser client. |

### Frontend — Components

| File | Purpose |
|------|---------|
| `components/DashboardTab.tsx` | Main dashboard. Property analysis display, advanced analysis features (Path to Yes, Amenity ROI, Sensitivity, Lender Packet) with free-tier sample data + watermarks. Toast-based upgrade prompts. |
| `components/AdminTab.tsx` | Admin dashboard: overview metrics, API cost tracking, user management, usage analytics with cache performance stats. Uses toast for errors. |
| `components/AuthModal.tsx` | Sign in/up/password reset. Google OAuth. `supabase.auth.resetPasswordForEmail` for forgot password flow. |
| `components/UserMenu.tsx` | User dropdown: sign out, settings, subscription management (toast-based placeholder). |
| `components/NavBar.tsx` | Top nav. Wrapped in `React.memo`. |
| `components/Charts.tsx` | Cash flow, ROI, equity charts (recharts). `React.memo` wrapped. |
| `components/FinancialTables.tsx` | Monthly/yearly tables with sticky headers. `React.memo` wrapped. |
| `components/MarketTrendCharts.tsx` | Historical price/rent trends. `React.memo` wrapped. |
| `components/ui/Toast.tsx` + `ToastContext.tsx` | Toast notification system (success/error/warning/info). |

### Database

| File | Purpose |
|------|---------|
| `database/rentcast_cache_schema.sql` | `rentcast_cache` table, indexes, cleanup functions, stats queries. |
| `database/api_tracking_schema.sql` | API call tracking tables for cost analytics. |

---

## CACHING ARCHITECTURE

### Three Layers
1. **React Query (browser)**: 24h stale for RentCast, 12h for listings. Prevents re-fetches within session.
2. **In-memory TTL (server)**: 24h for RentCast, 30m for Claude. Fast, but lost on restart.
3. **PostgreSQL database (server)**: 7-30 day TTLs by endpoint. Persistent across restarts and shared across users.

### RentCast Cache Flow
```
Request → Memory cache check → DB cache check → RentCast API → Save to both caches
```

---

## AUTH & TIERS

- **Supabase Auth**: Email/password + Google OAuth + email confirmation
- **Free tier**: 3 analyses/day, sample data for advanced features (watermarked)
- **Pro tier**: 50 analyses/day, full advanced analysis access (not yet billable — Stripe deferred)
- **Admin**: Full access + admin dashboard (set via `is_admin` column in `user_profiles`)

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
9. **All RentCast data fields are optional** — UI guards with `&&` checks
10. **Database cache import** — uses `getSupabaseAdmin()` from `supabaseAuth.js`, NOT a direct import

---

## COMPLETED PHASES

1. **Core MVP**: STR/MTR/LTR underwriting, 20-year projections, AI recommendations
2. **Tailwind v4**: PostCSS migration
3. **React Query**: Client-side caching
4. **Error Handling**: Error boundaries, toast system, progress indicator
5. **RentCast Data Expansion**: All 6 tiers — AVM, features, history, market trends, listings
6. **App.tsx Decomposition**: 10+ extracted components
7. **Backend Proxy**: Express API server, keys server-side, rate limiting, TTL cache
8. **Pre-Production Hardening**: helmet, CORS, security fixes, parallelized calls
9. **Supabase Auth**: Email/password, Google OAuth, user profiles, admin roles
10. **Admin Dashboard**: Metrics, API cost tracking, user management, usage analytics
11. **Free/Pro Tier UI**: Sample data with watermarks for free users, disabled interactions
12. **Railway Deployment**: Production on analyzemyproperty.com (www)
13. **RentCast Caching Phase 1**: Extended in-memory TTLs (24h), React Query TTLs
14. **RentCast Caching Phase 2**: Database-backed persistent cache with admin analytics
15. **Custom Domain**: analyzemyproperty.com configured via Railway + GoDaddy
16. **Performance & UX Polish**: Removed 5s sleep, Vite code splitting, lazy loading, React.memo, toast notifications replacing alerts, password reset, settings 500 fix, doc cleanup

---

## NEXT PRIORITIES

1. **Stripe Integration**: Payment processing for Pro tier ($29/month). Customer portal for subscription management.
2. **Admin Subscription Management**: Modify user tiers from admin dashboard (currently requires DB access).
3. **Custom Email Branding**: Configure SMTP to send from noreply@analyzemyproperty.com via Office 365.
4. **Map Integration**: Google Maps with property + comps visualization (API key already in .env).
5. **Mobile Responsiveness**: Further polish for mobile/tablet layouts.
6. **CI/CD**: GitHub Actions for automated testing and deployment.
7. **Monitoring**: Sentry or similar for error tracking in production.

---

## PERFORMANCE BASELINE

| Metric | Value |
|--------|-------|
| First search | ~85-115s (RentCast + web search + analysis) |
| Repeat search (same user) | <1s (React Query client cache) |
| Repeat search (different user, cached) | <2s (database cache hit) |
| Client cache | 24h gcTime, 24h staleTime (RentCast), 12h (listings) |
| Server memory cache | 24h RentCast, 30m Claude, maxSize 1000 |
| Database cache | 7d properties, 30d markets, 3d listings |
| Rate limits | 30/min general, 10/min Claude, 3/10min analysis (per IP) |
| Bundle | Code-split: react, recharts, supabase, react-query as separate chunks |

---

## DOCUMENTATION

- Root: `README.md`, `CURSOR_HANDOFF.md`, `TECHNICAL_ARCHITECTURE.md`, `COMMERCIALIZATION_GUIDE.md`, `PRICING_PAGE_MOCKUP.md`, `PITCH_DECK_OUTLINE.md`
- `docs/`: `SUPABASE_SETUP.md`, `TESTING.md`, `AirROI_PRO_Launch_Handbook.md`
- `docs/archive/`: 30+ completed phase/fix documentation files
