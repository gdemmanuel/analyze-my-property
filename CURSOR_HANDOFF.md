# AirROI Cursor Handoff — Phase 3 (Backend Proxy)
**Date**: Feb 11, 2026 | **Branch**: master | **Ahead**: 13+ commits | **Working tree**: Pending cleanup commit

---

## SYSTEM SUMMARY

**What**: Real estate STR/MTR/LTR underwriting app. React 19 + Vite + Tailwind v4 + Claude API + RentCast API.

**Architecture (current)**:
```
Browser (Vite :3000) → /api proxy → Express server (:3002) → Claude / RentCast APIs
```
- API keys live ONLY on the server. Browser never sees them.
- Server adds: rate limiting (IP-based), TTL caching, session auth scaffold.
- Frontend uses React Query for client-side caching (30 min stale, 24h gc).

**How to run**:
```bash
npm run server   # Express API proxy on :3002 (must start first)
npm run dev      # Vite frontend on :3000 (proxies /api → :3002)
```

---

## FILE MAP

### Server (NEW — Express API proxy)

| File | Lines | Purpose |
|------|-------|---------|
| `server/index.ts` | 292 | Express server. Routes: `POST /api/claude/messages`, `POST /api/claude/analysis`, `GET /api/rentcast/*`, `POST /api/auth/session`, `GET /api/health`. Rate limits: 30/min general, 10/min Claude, 3/10min analysis. |
| `server/cache.ts` | 78 | TTL in-memory cache. `claudeCache` (30 min), `rentcastCache` (60 min). Same address across users = instant. |
| `server/auth.ts` | 95 | Session-based auth. IP fallback. Tier limits (free: 3 analyses/day, pro: 50). Scaffold for Supabase/NextAuth. |
| `server/tsconfig.json` | 12 | Separate TS config for server (ES2022, ESNext modules). |

### Frontend — Core

| File | Lines | Purpose |
|------|-------|---------|
| `App.tsx` | 880 | State hub. Hooks, computed values, handlers. Thin JSX routing to tab components. |
| `services/claudeService.ts` | 746 | All Claude calls via `fetch('/api/claude/...')`. `withRetry` (client-side 90s countdown on 429). `parseJSON`. `analyzeProperty` is the main function (uses `/api/claude/analysis` endpoint). |
| `services/rentcastService.ts` | 192 | All RentCast calls via `fetch('/api/rentcast/...')`. No API key in browser. Property, market stats, rent estimate, AVM. |
| `src/hooks/usePropertyData.ts` | 210 | React Query hooks: `useRentCastData`, `useWebSTRData`, `usePropertyAnalysis`. All have `staleTime: 30min`, `refetchOnMount: false`. |
| `src/lib/queryClient.tsx` | 62 | Global: `gcTime: 24h`, `staleTime: 5m`, `retry: 3` with exponential backoff. |

### Frontend — Components (extracted from App.tsx)

| File | Purpose |
|------|---------|
| `components/NavBar.tsx` | Horizontal top nav, strategy toggle (STR/MTR/LTR) |
| `components/SearchBar.tsx` | Address input, data source badge, error display |
| `components/DashboardTab.tsx` | Hero card, metrics, amenities, AI analysis cards, advanced analysis, comps, sources |
| `components/SettingsTab.tsx` | Global settings, investment targets, amenity editor |
| `components/PortfolioTab.tsx` | Saved assessments grid, comparison selection |
| `components/ComparisonModal.tsx` | Side-by-side property comparison overlay |
| `components/BulletContent.tsx` | Reusable bullet-point text renderer |
| `components/AmenityIcon.tsx` | Icon resolver for amenity names |
| `components/PathToYesPanel.tsx` | Path to Yes analysis panel |
| `components/SensitivityTable.tsx` | Sensitivity analysis matrix |
| `components/AmenityROIPanel.tsx` | Amenity ROI analysis panel |
| `components/LenderPacketExport.tsx` | Lender packet generator |
| `components/PropertyChat.tsx` | AI chat about the property |
| `components/Charts.tsx` | Performance charts (recharts) |
| `components/FinancialTables.tsx` | Monthly/yearly cash flow tables |
| `components/ui/ErrorBoundary.tsx` | Error boundaries for sections |
| `components/ui/ProgressIndicator.tsx` | Step-by-step analysis progress |
| `components/ui/Toast.tsx` + `ToastContext.tsx` | Toast notification system |

### Utils

| File | Purpose |
|------|---------|
| `utils/formatCurrency.ts` | USD formatter |
| `utils/exportReport.ts` | HTML report generation + print |
| `utils/financialLogic.ts` | `calculateMonthlyProjections`, `aggregateToYearly` |
| `prompts/underwriting.ts` | All Claude prompt templates |

### Config

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite config. **Proxy**: `/api` → `http://localhost:3002`. HMR on :3000. |
| `.env` | `ANTHROPIC_API_KEY`, `RENTCAST_API_KEY` (server-side, no VITE_ prefix). |
| `types.ts` | `PropertyConfig`, `MarketInsight`, `SavedAssessment`, `Amenity`, `RentalStrategy` |
| `constants.ts` | `DEFAULT_CONFIG`, `AMENITIES` |

---

## CRITICAL SNIPPETS — PRESERVE EXACTLY

### Address Normalization (App.tsx ~L319)
```typescript
const normalizeAddress = (address: string): string => {
  return address.trim().toLowerCase().replace(/\s+/g, ' ').replace(/,\s*/g, ', ');
};
```

### Main Element Padding (App.tsx ~L505) — MUST KEEP pt-24
```typescript
<main className="flex-1 pt-24 px-4 pb-4 lg:px-8 lg:pb-8 print:pt-0 print:p-0">
```
**Why**: `pt-24` spaces content below fixed nav. Using `p-8` would override it to `pt-8`.

### Claude Proxy Function (claudeService.ts ~L113)
```typescript
async function claudeProxy(params: {
  model: string; max_tokens: number;
  messages: { role: string; content: string }[];
  tools?: any[]; system?: string;
}, endpoint: string = '/api/claude/messages'): Promise<{ type: string; text: string }[]> {
```
All Claude calls flow through this. Analysis uses `/api/claude/analysis` endpoint (stricter rate limit).

### Server Key Loading (server/index.ts ~L20)
```typescript
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY || process.env.VITE_RENTCAST_API_KEY;
```
Falls back to `VITE_` prefix for backward compatibility during migration.

### RentCast Proxy (server/index.ts ~L191)
```typescript
app.use('/api/rentcast', async (req, res) => {
  // req.url = everything after /api/rentcast, e.g. /properties?address=...
  const url = `https://api.rentcast.io/v1${req.url}`;
```

---

## KNOWN ISSUES & EDGE CASES

| Issue | Status | Notes |
|-------|--------|-------|
| WebSocket errors in console | Cosmetic | Vite HMR noise, does not affect functionality |
| First search ~90-120s | Expected | RentCast + web search + 5s delay + analysis |
| Repeat search <1s | Expected | React Query cache + server cache |
| STR web search returns prose instead of JSON | Partially fixed | Improved regex extraction; Claude sometimes responds with text first |
| `@anthropic-ai/sdk` in shared deps | Resolved | Server imports it; Vite tree-shakes from frontend. No action needed. |
| `concurrently` | ✅ Installed | `npm run dev:full` now works — runs server + vite with colored labels. |
| Express 5 wildcard routes | Fixed | Used `app.use('/api/rentcast', ...)` instead of `app.get('/api/rentcast/*', ...)` |
| Server cache is in-memory | Limitation | Clears on server restart. Fine for dev/single-server. Use Redis for multi-server prod. |

---

## RECENT COMMITS (12 ahead)

```
a7f1f9e feat: add Express API proxy - move API keys server-side, add rate limiting and caching
86ae6a0 fix: improve web search STR data JSON parsing and error handling
a96d052 refactor: decompose App.tsx from 1774 to 880 lines - extract 10 modules
7359583 refactor(ui): compact whitespace in Advanced Analysis section
c3d6abc fix(ui): Fix nav overlap by using explicit padding directions
4bd0d08 fix(ui): Increase top padding for fixed nav
d611590 refactor(ui): Convert to horizontal nav and reorder dashboard panels
07344b4 feat(ui): Add error boundaries, toast notifications, progress indicator
36a274f Security: Mask API key in debug logs
6a940d3 Fix: Implement React Query caching
8d8aad5 feat: fix react query caching - skip web search on cached repeats
e4d3cd3 Enhance Claude and RentCast services
```

---

## PERFORMANCE BASELINE

| Metric | Value |
|--------|-------|
| First search | 90-120s (RentCast + web search + delays + analysis) |
| Repeat search | <1s (client cache) or <100ms (server cache hit) |
| Client cache TTL | 24h gcTime, 30m staleTime |
| Server cache TTL | 30m Claude, 60m RentCast |
| Bundle size | 953 KB (down from 1,003 KB after removing SDK from browser) |
| Rate limits | 30/min general, 10/min Claude, 3/10min analysis (per IP) |

---

## EXACT NEXT TASK

### Option A: End-to-End Test
1. Run `npm run server` in terminal 1
2. Run `npm run dev` in terminal 2
3. Search `2711 Oak View Ln, Tobyhanna, PA 18466`
4. Verify: console shows `[Server] Proxying...` (not direct API calls)
5. Verify: repeat search uses cache (server logs "Cache HIT")

### Option B: Production Cleanup — DONE
- ~~Remove `@anthropic-ai/sdk`~~ — Kept; server imports it, Vite tree-shakes it from frontend bundle.
- ✅ Installed `concurrently`, fixed `dev:full` script with colored labels.
- ✅ Added `.env.example` with placeholder keys.
- ✅ Deleted 6 stale handoff docs (Phase2D, Refactor, Implementation, Cache Test, Final, Refactor Complete).

### Option C: Deploy
1. Build frontend: `npm run build` (outputs to `dist/`)
2. Add static file serving to `server/index.ts` for production
3. Deploy Express server + static files to Railway/Render/Fly.io
4. Set `ANTHROPIC_API_KEY` and `RENTCAST_API_KEY` as environment variables on host

### Option D: Real Auth (Supabase)
1. Replace `server/auth.ts` scaffold with Supabase Auth
2. Add login/signup UI
3. Per-user rate limits with Supabase session tokens
4. Stripe integration for paid tiers

---

## IMPORTANT RULES

1. **Never remove `pt-24` from main element** — preserves nav spacing
2. **Keep `normalizeAddress` identical** — changes break cache key matching
3. **Keep `refetchOnMount: false`** — global default prevents cache miss
4. **API keys must stay server-side** — never add `VITE_ANTHROPIC_API_KEY` back
5. **Server must run before frontend** — Vite proxies `/api` to `:3002`
6. **Express 5 in use** — no `*` wildcard routes, use `app.use()` for catch-all
