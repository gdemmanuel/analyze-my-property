# Analyze My Property Launch Handbook
**AI-Powered Real Estate Investment Analysis Platform**

**Version:** 2.3
**Date:** February 2026  
**Document Type:** Product Launch Guide

---

## Table of Contents

1. [Product Vision & Positioning](#1-product-vision--positioning)
2. [MVP Scope, User Stories & Acceptance Criteria](#2-mvp-scope-user-stories--acceptance-criteria)
3. [System Architecture & Data Flow](#3-system-architecture--data-flow)
4. [Technology Stack](#4-technology-stack)
5. [File Map & Component Reference](#5-file-map--component-reference)
6. [Data Sources & API Integration](#6-data-sources--api-integration)
7. [AI Architecture & Prompt Library](#7-ai-architecture--prompt-library)
8. [Caching, Rate Limiting & Performance](#8-caching-rate-limiting--performance)
9. [Security & Compliance](#9-security--compliance)
10. [Deployment Guide](#10-deployment-guide)
11. [Data Model](#11-data-model)
12. [Pricing & Packaging](#12-pricing--packaging)
13. [Financial Plan & KPIs](#13-financial-plan--kpis)
14. [Roadmap & Future Phases](#14-roadmap--future-phases)

---

## 1. Product Vision & Positioning

### Vision Statement
Analyze My Property empowers real estate investors to make data-driven acquisition decisions for short-term rental (STR), mid-term rental (MTR), and long-term rental (LTR) properties with AI-powered underwriting, real-time market data, and comprehensive financial projections.

### Target Market

- **Primary**: Individual STR investors (1-5 properties) — ~2.1M hosts in the US
- **Secondary**: Small property management companies — ~150K companies
- **Tertiary**: Real estate agents serving investors — ~1.5M agents

### Competitive Positioning

- **AI-Powered Analysis**: Claude AI (Sonnet 4 + Haiku) — competitors have none
- **Multi-Strategy**: STR/MTR/LTR in one tool — most competitors are STR-only
- **20-Year Projections**: Full amortization with HELOC modeling — unique in market
- **RentCast Integration**: 6 API endpoints for comprehensive property + market data
- **Price Point**: $29-99/mo vs. $99-399/mo for AirDNA, Mashvisor, Rabbu

### Value Proposition
**"Underwrite any property in 60 seconds with institutional-grade AI analysis at a fraction of the cost."**

---

## 2. MVP Scope, User Stories & Acceptance Criteria

### Current Feature Set (v2.0)

- **Property Analysis**: Address lookup, AI audit, RentCast data, market comparables
- **Financial Modeling**: 20-year projections, 3 rental strategies, seasonality
- **Capital Structure**: Down payment, HELOC funding, mortgage calculations
- **Advanced AI Tools**: Sensitivity analysis, amenity ROI, path to yes, lender packet, regulation scanner
- **RentCast Intelligence**: AVM valuations, sale/rental comps, market trends, owner/agent info
- **Admin Dashboard**: API metrics, model usage, cache management, health monitoring
- **Portfolio Management**: Save assessments, compare up to 4 properties
- **Export**: PDF report generation with AI analysis

### User Stories

**US-001: Property Search & Analysis**
As an investor, I want to enter a property address and receive a complete analysis so I can quickly evaluate acquisition opportunities.

- Address autocomplete suggestions appear after 5 characters — DONE
- Property data fetched from RentCast within 3 seconds — DONE
- AI analysis completes within 90 seconds (first search) — DONE
- Repeat searches return in under 1 second (cached) — DONE
- Results display beds, baths, sqft, year built, property features — DONE
- Suggested ADR, occupancy, and monthly revenue populated — DONE

**US-002: Multi-Strategy Comparison**
As an investor, I want to compare STR, MTR, and LTR scenarios so I can choose the optimal rental strategy.

- Toggle between STR/MTR/LTR with one click — DONE
- Each strategy shows unique revenue/expense calculations — DONE
- Cap Rate and Cash-on-Cash update per strategy — DONE
- Pro forma scenarios show Conservative/Base/Aggressive — DONE

**US-003: Financial Projections**
As an investor, I want to see 20-year cash flow projections so I can understand long-term returns.

- Monthly projections for 240 months — DONE
- Yearly aggregation with cumulative totals — DONE
- Seasonality applied to STR (12 monthly factors) — DONE
- HELOC interest and paydown calculated — DONE
- Property appreciation factored into equity — DONE

**US-004: RentCast Market Intelligence**
As an investor, I want comprehensive market data so I can validate AI analysis with real numbers.

- AVM value range with comparables — DONE
- Sale history, tax assessments, owner info — DONE
- Market health metrics and trend charts — DONE
- Active rental listings with bedroom matching — DONE
- Listing agent contact information — DONE

**US-005: Admin Monitoring**
As an administrator, I want to monitor API usage, costs, and system health.

- Server health overview (uptime, memory, sessions) — DONE
- Per-endpoint API metrics with response times — DONE
- Claude model usage tracking (Sonnet vs Haiku) — DONE
- Cache hit rates and management controls — DONE
- Rate limit configuration display and editing — DONE
- Real-time API cost tracking (Claude + RentCast) with daily budget — DONE
- Cost history chart with 7-day trends — DONE
- Queue status monitoring (queued, processing, completed, failed) — DONE
- Configurable daily budget and RentCast pricing — DONE

---

## 3. System Architecture & Data Flow

### High-Level Architecture

```
Browser (Vite :3000)
    |
    | /api proxy
    v
Express Server (:3002)
    |-- helmet, CORS, rate limiting
    |-- Auth middleware (session-based)
    |-- Metrics middleware (request logging)
    |-- TTL Cache (in-memory)
    |
    |-- /api/claude/messages    --> Anthropic API (Claude Sonnet 4 / Haiku)
    |-- /api/claude/analysis    --> Anthropic API (stricter rate limit)
    |-- /api/rentcast/*         --> RentCast API (transparent passthrough)
    |-- /api/admin/metrics      --> In-memory MetricsStore
    |-- /api/admin/cache/clear  --> Cache management
    |-- /api/auth/session       --> Session creation
    |-- /api/health             --> Health check
    |
    |-- Static files (dist/)    --> SPA fallback
```

### Data Flow: Property Analysis

```
User enters address
    |
    v
Step 1: RentCast Data (parallel calls)
    |-- /properties?address=...          --> Property details, features, history
    |-- /avm/value?address=...           --> AVM value range + sale comps
    |-- /listings/sale?address=...       --> Active sale listing
    |-- /avm/rent/long-term?address=...  --> Rent estimate + rental comps
    |-- /markets?zipCode=...&dataType=All --> Market stats (sale + rental)
    |-- /listings/rental/long-term?zip=...&beds=... --> Active rental listings
    |
    v
Step 2: Claude AI Web Search
    |-- Web search for STR-specific data (ADR, occupancy, regulations)
    |-- 5-second delay to prevent rate limiting
    |
    v
Step 3: Claude AI Analysis (Sonnet 4)
    |-- Property audit with RentCast ground truth
    |-- Market snapshot, regulations, risk assessment
    |-- Pro forma scenarios (3 tiers)
    |-- Recommendation and next steps
    |
    v
Step 4: Client-Side Financial Engine
    |-- 20-year monthly projections
    |-- Seasonality factors (STR)
    |-- Mortgage amortization + HELOC paydown
    |-- KPI calculation (Cap Rate, CoC, DSCR, NOI)
    |
    v
Dashboard renders all data
```

### Tab Structure

- **Audit** — Main analysis dashboard with AI insights, KPIs, and amenities
- **RentCast Data** — Dedicated tab for all RentCast intelligence
- **Performance** — Charts and visual analytics
- **Monthly** — Monthly cash flow projections table
- **Yearly** — Yearly aggregated projections table
- **Portfolio** — Saved assessments and comparison
- **Settings** — Global configuration and investment targets
- **Admin** — System monitoring and cache management

---

## 4. Technology Stack

### Frontend

- **React** 19.2.3 with TypeScript 5.8
- **Vite** 6.2 (build tool, dev server, HMR)
- **Tailwind CSS** 4.1.18 (PostCSS plugin)
- **React Query** (@tanstack/react-query 5.90) — client-side caching
- **Recharts** 3.7 — charts and data visualization
- **Lucide React** 0.563 — icons
- **React Markdown** 9.0 — AI response rendering

### Backend

- **Express** 5.2.1 (Node.js server)
- **Helmet** 8.1 (security headers)
- **CORS** 2.8.6 (cross-origin resource sharing)
- **express-rate-limit** 8.2.1 (IP-based rate limiting)
- **dotenv** 17.2.4 (environment variables)
- **@anthropic-ai/sdk** 0.32.1 (Claude API client)

### Dev Tools

- **tsx** 4.21 (TypeScript execution for server)
- **concurrently** 9.2.1 (parallel dev processes)
- **PostCSS** 8.5.6 + **Autoprefixer** 10.4.24

### External APIs

- **Anthropic Claude** — AI analysis (Sonnet 4 for complex, Haiku for simple)
- **RentCast** — Property data, AVM, market stats, comparables
- **Google Maps** — Street View (key present, not yet integrated in UI)

---

## 5. File Map & Component Reference

### Server (`server/`)

- **index.ts** (514 lines) — Express app, API proxies, rate limiting, admin endpoints (queue, costs, budget), test routes, static serving
- **cache.ts** (84 lines) — TTL in-memory cache with hit/miss tracking
- **auth.ts** (246 lines) — Session-based auth with per-user tier enforcement (free/pro), IP fallback, usage tracking, daily/hourly resets
- **metrics.ts** (254 lines) — Request logging, endpoint stats, model usage tracking, middleware
- **claudeQueue.ts** (216 lines) — Token bucket rate limiter (3 concurrent, 1/sec refill, 5 max), priority queue (pro > free), job stats
- **costTracker.ts** (339 lines) — Real-time per-model cost tracking (Sonnet-4, Haiku, RentCast), daily budget alerts, 7-day history
- **test-routes.ts** (265 lines) — Multi-user test endpoints: create users, view sessions, check limits, trigger calls (dev only, disabled in production)

### Services (`services/`)

- **claudeService.ts** (824 lines) — All Claude API calls via proxy, retry logic, rate limit handling
- **rentcastService.ts** (590 lines) — 12+ interfaces, 6 API endpoints, data extraction
- **streetViewService.ts** (56 lines) — Google Street View URLs (service ready, not wired to UI)

### Core Application

- **App.tsx** (951 lines) — State hub, React Query hooks, computed KPIs, tab routing
- **src/hooks/usePropertyData.ts** (161 lines) — React Query hooks for RentCast + analysis
- **src/lib/queryClient.tsx** (64 lines) — Global cache config (24h gc, 5m stale)
- **prompts/underwriting.ts** (764 lines) — All Claude prompt templates (9 prompts)

### Components — Main Tabs

- **DashboardTab.tsx** (362 lines) — Audit view: KPIs, AI analysis, amenities, advanced tools
- **RentCastDataTab.tsx** (374 lines) — AVM, market health, trends, comps, owner/agent info
- **AdminTab.tsx** (682 lines) — Admin dashboard with sub-tabs (Overview, API Costs, Performance, Configuration), cost tracking charts, queue stats, cache management
- **PortfolioTab.tsx** (177 lines) — Saved assessments grid with comparison mode
- **SettingsTab.tsx** (135 lines) — Global settings, investment targets, amenity editor

### Components — Analysis Panels

- **PathToYesPanel.tsx** (322 lines) — Deal optimization with gap analysis
- **SensitivityTable.tsx** (194 lines) — ADR/Occupancy/Rate stress testing matrix
- **AmenityROIPanel.tsx** (176 lines) — Amenity payback with ranking
- **LenderPacketExport.tsx** (681 lines) — AI-generated lender packet with export
- **PropertyChat.tsx** (113 lines) — Conversational AI about the property

### Components — Data Display

- **Charts.tsx** (257 lines) — Revenue, cash flow, ROI charts
- **FinancialTables.tsx** (211 lines) — Monthly/yearly cash flow tables
- **MarketTrendCharts.tsx** (227 lines) — Historical price/rent trend charts
- **NavBar.tsx** (73 lines) — Top navigation with tabs and strategy toggle
- **SearchBar.tsx** (45 lines) — Address input with suggestions
- **ComparisonModal.tsx** (130 lines) — Side-by-side property comparison

### Components — UI

- **ui/ErrorBoundary.tsx** (116 lines) — Error boundaries
- **ui/ProgressIndicator.tsx** (195 lines) — Step-by-step analysis progress
- **ui/Toast.tsx** + **ui/ToastContext.tsx** (157 lines) — Toast notifications
- **ui/StatusBadge.tsx** (184 lines) — Status badges
- **ui/LoadingSpinner.tsx** (100 lines) — Loading states
- **InfoTooltip.tsx** (38 lines) — Info tooltips for metrics

### Utils

- **utils/financialLogic.ts** (212 lines) — Monthly projections, yearly aggregation
- **utils/exportReport.ts** (265 lines) — HTML report generation + print
- **utils/formatCurrency.ts** (2 lines) — USD formatter

### Config

- **vite.config.ts** (37 lines) — Proxy /api to :3002, HMR, optimizeDeps
- **types.ts** (152 lines) — Core TypeScript interfaces
- **constants.ts** (40 lines) — Default config and amenities

### Scripts (`scripts/`)

- **load-test.ts** — Automated multi-user load testing engine with color-coded output and JSON export
- **test-scenarios.ts** — Pre-configured test scenarios (rate limits, concurrent access, queue priority, cost attribution, stress)
- **clean-start.ps1** — PowerShell script to kill stale Node processes, resolve port conflicts, and start dev servers

### Testing (`public/`)

- **test-dashboard.html** — Interactive web UI for manual multi-user testing (dev only, access at `/test-dashboard.html`)

---

## 6. Data Sources & API Integration

### RentCast API

**Proxy**: All calls go through `Express /api/rentcast/*` which maps transparently to `https://api.rentcast.io/v1/*`. Server adds the `X-Api-Key` header.

**Endpoints Used:**

- `/properties?address=...` — Property details (beds, baths, sqft, features, history, owner, tax)
- `/avm/value?address=...` — Automated valuation with sale comparables and correlation scores
- `/listings/sale?address=...&status=Active` — Active sale listing with price, DOM, agent
- `/avm/rent/long-term?address=...` — Long-term rent estimate with rental comparables
- `/markets?zipCode=...&dataType=All` — Market statistics (sale + rental combined)
- `/listings/rental/long-term?zipCode=...&status=Active&limit=10` — Active rental listings

**Data Extracted (12+ interfaces):**

- `PropertyFeatures` — pool, garage, fireplace, cooling/heating types
- `SaleHistoryEntry` — historical sales with dates and prices
- `TaxAssessmentEntry` — tax history with land/improvement breakdowns
- `PropertyOwner` — owner names, type, occupancy status
- `AVMComparable` — sale comps with correlation scores, distance, DOM
- `ListingDetails` — days on market, listing type, agent, MLS, price history
- `MarketTrendEntry` — historical price/rent data for trend charts
- `MarketStats` — median prices, DOM, inventory, rental rates
- `RentalListing` — active rental listings with details

**Cost**: ~$0.10-0.20 per property search (5-6 API calls)

### Anthropic Claude API

**Proxy**: `/api/claude/messages` (general) and `/api/claude/analysis` (strict rate limit)

**Models:**

- **Claude Sonnet 4** (`claude-sonnet-4-20250514`) — Complex financial analysis, underwriting, audits
- **Claude 3.5 Haiku** (`claude-3-5-haiku-20241022`) — Fast tasks, address suggestions, simple queries

**Cost**: ~$0.02-0.05 per analysis call. Average total per full property analysis: ~$0.20-0.25

### Google Maps Static API

- **Key**: `VITE_GOOGLE_MAPS_API_KEY` in .env (client-side)
- **Status**: Service file exists (`streetViewService.ts`), not yet integrated into UI
- **Future**: Property + comp map visualization using lat/long from RentCast data

---

## 7. AI Architecture & Prompt Library

### Prompt Library (`prompts/underwriting.ts`)

All prompts return structured JSON for seamless UI integration.

- **AUDIT_PROMPT** — Property and market verification with web search. Returns property facts, market snapshot, regulations, suggested values, risks, sources.
- **UNDERWRITE_PROMPT** — Full KPI calculation with HELOC modeling. Returns NOI, DSCR, cap rate, cash-on-cash, pro forma scenarios.
- **SENSITIVITY_PROMPT** — ADR/Occupancy/Rate stress testing. Returns 5x5 matrix with breakpoints.
- **AMENITY_ROI_PROMPT** — Amenity payback analysis with diminishing returns. Returns ranked list with confidence ranges.
- **REGULATION_SCANNER_PROMPT** — STR regulation lookup with web search. Returns permit requirements, restrictions, zoning.
- **PACKET_SUMMARY_PROMPT** — Lender-ready one-pager. Enriched with RentCast property details, market data, and AVM comparables for factual grounding.
- **PATH_TO_YES_PROMPT** — Deal optimization suggestions. Returns target gaps and prioritized recommendations.
- **MARKET_DISCOVERY_PROMPT** — Market discovery for budget/CoC targets with web search. Returns ranked markets.
- **COMPS_STRENGTH_PROMPT** — Comp quality scoring. Returns similarity scores and confidence levels.

### Cost per Prompt

- Property Audit: ~$0.025
- Underwrite Analysis: ~$0.05
- Sensitivity Analysis: ~$0.02
- Amenity ROI: ~$0.02
- Regulation Scanner: ~$0.03
- Lender Packet: ~$0.015
- Path to Yes: ~$0.02
- Market Discovery: ~$0.03
- Comp Strength: ~$0.01

---

## 8. Caching, Rate Limiting & Performance

### Server-Side Cache (In-Memory TTL)

- **Claude Cache**: 2-hour TTL, max 500 entries, LRU eviction
- **RentCast Cache**: 2-hour TTL, max 500 entries, LRU eviction
- Hit/miss counters tracked for admin dashboard
- Cache clears on server restart (acceptable for MVP)

### Client-Side Cache (React Query)

- **Garbage Collection**: 24 hours
- **Stale Time**: 2 hours (per-hook override)
- **Retry**: 3 attempts with exponential backoff
- **Refetch on Mount**: false (prevents unnecessary API calls)

### Rate Limits — Express (IP-Based)

- **General API**: 30 requests per minute
- **Claude Messages**: 10 requests per minute
- **Full Analysis**: 3 requests per 10 minutes

### Rate Limits — Per-User Tier Enforcement

Implemented in `server/auth.ts`. Each user's usage is tracked by session token (or IP fallback for anonymous users). Counters reset automatically.

- **Free Tier**: 3 analyses/day, 15 Claude calls/hour
- **Pro Tier**: 50 analyses/day, 100 Claude calls/hour
- **Daily Reset**: 24 hours from first request
- **Hourly Reset**: 1 hour from first Claude call

### Claude Queue (`server/claudeQueue.ts`)

Token bucket rate limiter that controls concurrent access to the Claude API and prioritizes paying users.

- **Max Concurrent**: 3 simultaneous Claude API calls
- **Token Refill**: 1 token per second
- **Max Tokens**: 5 (burst capacity)
- **Priority**: Pro tier (priority 1) processed before Free tier (priority 0)
- **FIFO**: Same-tier users processed in order of arrival
- **Stats Tracked**: queued, processing, completed, failed jobs; average wait and processing times

### Cost Tracking (`server/costTracker.ts`)

Real-time API cost tracking with per-model granularity and budget alerting.

- **Claude Sonnet-4**: $3.00 / 1M input tokens, $15.00 / 1M output tokens
- **Claude Haiku**: $0.80 / 1M input tokens, $4.00 / 1M output tokens
- **RentCast**: $0.03 per request (configurable via admin)
- **Daily Budget**: $50 default (configurable), alert at 80% threshold
- **History**: 7-day rolling cost history
- **Model Normalization**: Strips date suffixes (e.g., `claude-sonnet-4-20250514` → `claude-sonnet-4`)
- **Admin Endpoints**: `/api/admin/costs`, `/api/admin/cost-history`, `/api/admin/budget`, `/api/admin/pricing`

**Note**: All caches, session state, queue state, and cost data are in-memory. They reset on server restart. This is acceptable for MVP. Consider Redis for persistence in a later phase.

### Performance Baseline

- **First property search**: 90-120 seconds (RentCast + web search + 5s delay + AI analysis)
- **Repeat search (same session)**: Under 1 second (React Query client cache)
- **Repeat search (different session)**: Under 100ms (server cache hit)
- **RentCast calls per search**: 6 API calls
- **Bundle size**: ~1,014 KB JS (gzipped: ~286 KB)

---

## 9. Security & Compliance

### Current Security Model

- **API Keys**: Server-side only (Express proxy). No `VITE_` prefix for secrets.
- **Security Headers**: Helmet middleware (HSTS, X-Frame-Options, etc.)
- **CORS**: Configurable via `CORS_ORIGIN` env var. Defaults to localhost in dev.
- **Rate Limiting**: IP-based via express-rate-limit + per-user tier limits via session auth
- **Authentication**: Session-based auth with usage tracking, tier enforcement, IP fallback for anonymous users
- **Data Storage**: Browser localStorage (portfolio, settings). No server-side persistence.
- **Input Validation**: Basic sanitization on API routes
- **Test Routes**: All `/api/test/*` endpoints disabled when `NODE_ENV=production`
- **Test Dashboard**: `public/test-dashboard.html` exists but only functions in development (API calls go through dev-only routes)

### Environment Variables

```
# Server-side only (NEVER exposed to browser)
ANTHROPIC_API_KEY=sk-ant-api03-...
RENTCAST_API_KEY=your-key-here

# CORS origins (comma-separated, defaults to localhost)
CORS_ORIGIN=https://yourdomain.com

# Client-side (optional)
VITE_GOOGLE_MAPS_API_KEY=your-key-here
```

### What Needs to Change for Production

- Replace session auth with real auth (Supabase, Clerk, or Auth0) for persistent user accounts
- Add Content Security Policy (currently disabled for Tailwind inline styles)
- Add HTTPS enforcement (handled by hosting platform)
- Add environment variable validation on startup
- Consider Redis for cache and session persistence across deploys
- Remove `public/test-dashboard.html` from production build (or add to `.gitignore`)

---

## 10. Deployment Guide

### Prerequisites

- Node.js 18+ installed
- GitHub repository: `https://github.com/gdemmanuel/analyze-my-property.git`
- API keys: `ANTHROPIC_API_KEY`, `RENTCAST_API_KEY`

### How It Works in Production

Analyze My Property runs as a **single Express server** that:
1. Serves the built frontend from `dist/` (static files)
2. Proxies API requests to Claude and RentCast
3. Handles auth, caching, rate limiting, queue management, cost tracking, and admin metrics
4. Falls back to `index.html` for client-side routing (SPA)
5. Disables test routes when `NODE_ENV=production`

### Step-by-Step: Railway Deployment (Recommended)

**Why Railway**: Always-on server ($5/mo), in-memory state persists (sessions, caches, queue, cost tracking), zero code changes needed, auto-deploy from GitHub.

**Why NOT Vercel**: Analyze My Property relies on an always-on Express server with in-memory state (sessions, caches, queue, cost tracking). Vercel converts Express to serverless functions, resetting all state on every invocation. This would break auth, caching, rate limiting, queue management, and cost tracking. Significant refactoring would be required.

**Step 1: Verify production start script exists in package.json**
This should already be present:
```json
"start": "node --import tsx server/index.ts"
```

**Step 2: Create Railway account**
1. Go to [railway.com](https://railway.com)
2. Sign up with GitHub
3. Click "New Project" then "Deploy from GitHub repo"
4. Select `gdemmanuel/analyze-my-property`

**Step 3: Configure environment variables**
In Railway Dashboard > Variables:
- `ANTHROPIC_API_KEY` = your Anthropic key
- `RENTCAST_API_KEY` = your RentCast key
- `CORS_ORIGIN` = your domain (e.g., `https://airroi.up.railway.app`)
- `NODE_ENV` = `production`

**Note on PORT**: Railway automatically assigns a `PORT` env var. The server checks `PORT` first, then falls back to `API_PORT`, then `3002`. You do **not** need to set `PORT` or `API_PORT` manually — Railway handles it.

**Step 4: Configure build**
Railway auto-detects Node.js. Set:
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

**Step 5: Deploy**
Push to master — Railway auto-deploys. URL assigned automatically (e.g., `airroi.up.railway.app`).

**Step 6: Custom domain**
1. Railway Dashboard → Settings → Domains → "+ Custom Domain"
2. Enter your domain (use `www.yourdomain.com` if root domain CNAME isn't supported)
3. Add the CNAME and TXT records Railway provides to your DNS provider
4. Wait 5-30 minutes for DNS propagation and SSL certificate provisioning
5. Update `CORS_ORIGIN` to include your custom domain

### What Happens Automatically in Production

When `NODE_ENV=production`:
- Test routes (`/api/test/*`) return 403 Forbidden
- Test dashboard (`/test-dashboard.html`) has no functional API to call
- All other routes (API, admin, health) work normally
- Static files served from `dist/`

### Alternative Platforms

**Render (Free or $7/mo)**
- Free tier: sleeps after 15 min inactivity, 60s cold start wake — causes in-memory state loss
- Paid tier: always-on, similar to Railway
- Setup: Connect GitHub, set build/start commands, add env vars

**Fly.io ($3-5/mo)**
- Needs a Dockerfile
- Docker-based, edge deployment
- More setup work but cheapest always-on option

**Vercel — NOT recommended for this app**
- Converts Express to serverless functions
- In-memory caches, metrics, sessions, queue, and cost tracking reset per invocation
- Would require significant refactoring (move to Redis/database for all state)

### Build & Run Commands

```bash
# Development (both servers)
npm run dev:full

# Clean start (kill stale processes, resolve ports)
npm run clean-start

# Production build
npm run build

# Production start (serves API + frontend)
npm start

# Individual processes
npm run dev      # Vite dev server only
npm run server   # Express server only

# Multi-user testing (dev only, requires server running)
npm run test:rate-limits    # Rate limit enforcement
npm run test:concurrent     # Concurrent user access
npm run test:queue          # Queue prioritization
npm run test:costs          # Cost attribution
npm run test:stress         # Heavy load test
npm run test:load           # All scenarios
```

### Deployment Checklist

- [ ] `npm run build` succeeds with no errors
- [ ] `start` script exists in `package.json`
- [ ] All environment variables configured on hosting platform
- [ ] `CORS_ORIGIN` set to production domain
- [ ] `NODE_ENV=production` set (disables test routes)
- [ ] Health check passes: `GET /api/health`
- [ ] Admin dashboard accessible: navigate to Admin tab
- [ ] Admin > API Costs section loads correctly
- [ ] First property search completes successfully
- [ ] Repeat search returns cached results (under 1s)
- [ ] Test routes return 403: `GET /api/test/health` should fail
- [ ] Optionally remove `public/test-dashboard.html` from production build

---

## 11. Data Model

### Current: Browser localStorage

- **`airroi_saved_assessments`** — Array of `SavedAssessment` objects
- **`airroi_amenities`** — Custom amenity configurations

### Core TypeScript Interfaces

**PropertyConfig** — 25+ fields for financial modeling:
- Purchase: price, downPaymentPercent, loanCosts
- Financing: mortgageRate, helocRate, helocFundingPercent, helocPaydownPercent
- Revenue: adr, occupancyPercent, mtrMonthlyRent, ltrMonthlyRent
- Expenses: mgmtFeePercent, maintenancePercent, hostFeePercent, fixedOpexMonthly
- Growth: annualAppreciationRate, annualRentGrowthRate, annualExpenseInflationRate

**MarketInsight** — AI analysis output:
- summary, snapshot, regulations, marketPerformance
- proFormaScenarios (3 tiers), breakEvenAnalysis
- recommendation, risks, sources
- Suggested values: ADR, occupancy, MTR/LTR rent, listing price, furnishings, HOA

**SavedAssessment** — Portfolio item:
- id, address, config, insight, selectedAmenities, timestamp
- strategy (STR/MTR/LTR), capRate, cashOnCash, price, annualNoi

**RentCastProperty** — Expanded property data (Phase 5):
- Core: beds, baths, sqft, lotSize, yearBuilt, propertyType
- Phase 5: features, saleHistory, taxAssessments, owner, zoning
- AVM: avmValueRange, avmComparables with correlation scores
- Listing: listingDetails (DOM, type, agent, price history)

### Future: Cloud Database (Supabase PostgreSQL)

```
users/
  - id, email, displayName, subscription, createdAt

assessments/
  - id, userId, address, config, insight, strategy
  - metrics (capRate, cashOnCash, annualNoi)
  - createdAt, updatedAt

settings/
  - userId, defaultConfig, amenities
```

---

## 12. Pricing & Packaging

### Pricing Tiers

- **Free**: $0/mo — 3 analyses/month, basic features
- **Pro**: $29/mo — 25 analyses/month, full features, PDF export, portfolio
- **Team**: $79/mo — 100 analyses/month, 3 seats, shared portfolios
- **Enterprise**: $199/mo — Unlimited, API access, white-label, priority support

### Cost per Analysis

- RentCast API (6 calls): ~$0.10-0.20
- Claude AI (1 analysis): ~$0.02-0.05
- Street View (fallback): ~$0.007
- **Total variable cost**: ~$0.13-0.26

### Margin Analysis

- Free: -100% ($0 revenue, $0.78 cost for 3 analyses)
- Pro: 78% ($29 revenue, $6.50 cost for 25 analyses)
- Team: 67% ($79 revenue, $26 cost for 100 analyses)
- Enterprise: 74% ($199 revenue, ~$52 cost for 200 avg analyses)

---

## 13. Financial Plan & KPIs

### Revenue Projections (Year 1)

- Month 1: 50 free users, 5 pro → $145 MRR
- Month 3: 250 free, 35 pro, 2 team → $1,173 MRR
- Month 6: 850 free, 150 pro, 10 team, 2 enterprise → $5,639 MRR
- Month 12: 3,000 free, 850 pro, 65 team, 12 enterprise → $31,920 MRR
- **Year 1 ARR**: ~$383,000

### Key Performance Indicators

**Acquisition:**
- CAC (Customer Acquisition Cost): target under $50
- Trial-to-Paid Conversion: target over 15%
- Activation Rate (1+ analysis): target over 40%

**Engagement:**
- DAU/MAU: target over 25%
- Analyses per Pro User: target over 8/month
- Portfolio Size: target over 5 saved assessments

**Revenue:**
- MRR Growth Rate: target over 20%/month
- ARPU (Pro): $29
- LTV:CAC Ratio: target over 3:1

**Retention:**
- Monthly Churn (Pro): target under 5%
- Net Revenue Retention: target over 100%
- 90-Day Retention: target over 60%

### Break-Even Analysis

- Monthly Fixed Costs (at M12): ~$12,050
- Variable Cost per Paid User: ~$6.50/mo
- Average Revenue per Paid User: ~$35/mo
- Contribution Margin: $28.50/user
- **Break-Even: 423 paid users**

---

## 14. Roadmap & Future Phases

### Completed Phases

1. **Core MVP** — STR/MTR/LTR underwriting, 20-year projections, AI recommendations
2. **Tailwind v4 Migration** — PostCSS plugin architecture
3. **React Query Integration** — Client-side caching (24h gc, 5m stale)
4. **Error Handling** — Error boundaries, toast system, progress indicator
5. **UI Polish** — Horizontal nav, dashboard reorder, spacing optimization
6. **App.tsx Decomposition** — 1774 to 951 lines, 10+ extracted components
7. **Backend Proxy** — Express API server, keys server-side, rate limiting, TTL cache
8. **Pre-Production Hardening** — Helmet, CORS, API key leak fixes, dead code removal
9. **RentCast Data Expansion** — 6 tiers of data: AVM, features, history, comps, trends, listings
10. **Dashboard Reorganization** — RentCast Data tab, compact layout, professional styling
11. **Admin Dashboard** — Server metrics, API usage, model tracking, cache management, charts
12. **Multi-User Infrastructure** — Per-user rate limiting (free/pro tiers), Claude queue with priority (token bucket), real-time cost tracking with budget alerts, admin endpoints for queue/costs/config
13. **Model Optimization** — Haiku for simple tasks (address suggestions, amenity impact), Sonnet-4 for complex analysis, corrected Claude pricing in cost tracker
14. **Admin Enhancements** — Sub-tabs (Overview, API Costs, Performance, Configuration), API cost history chart (Recharts), external dashboard links (Claude, RentCast), configurable rate limits and budget from admin UI
15. **Multi-User Testing** — Automated load testing scripts (5 scenarios), interactive test dashboard, test API routes (dev only), validated rate limits, queue priority, cost tracking, concurrent access

### Next Phases

**Phase 16: Production Deployment** ✅ COMPLETE
- `start` script added to `package.json` — ✅ DONE
- `PORT` env var handling fixed for Railway — ✅ DONE
- Deployed to Railway at `analyze-my-property-production.up.railway.app` — ✅ DONE
- Environment variables configured (API keys, NODE_ENV, CORS_ORIGIN) — ✅ DONE
- Custom domain `www.analyzemyproperty.com` configured (DNS propagating) — ✅ DONE
- Health check verified, server running successfully — ✅ DONE
- Test routes disabled in production — ✅ DONE

**Phase 17: Real Authentication (Supabase)** ✅ COMPLETE
- Created Supabase project with PostgreSQL database — ✅ DONE
- Implemented database schema:
  - `user_profiles` table (tier management) — ✅ DONE
  - `assessments` table (saved properties) — ✅ DONE
  - `user_settings` table (user config) — ✅ DONE
  - `user_usage` table (rate limit tracking) — ✅ DONE
  - Row Level Security (RLS) policies — ✅ DONE
  - SQL functions for atomic counters — ✅ DONE
- Frontend authentication:
  - `AuthModal.tsx` component (sign in/up) — ✅ DONE
  - `UserMenu.tsx` component (user dropdown) — ✅ DONE
  - Email/password + Google OAuth — ✅ DONE
  - Auth state management in App.tsx — ✅ DONE
- Backend integration:
  - `server/supabaseAuth.ts` (JWT verification) — ✅ DONE
  - `server/routes/user.ts` (8 new API endpoints) — ✅ DONE
  - Updated Claude routes with DB rate limiting — ✅ DONE
  - Replaced in-memory sessions with database — ✅ DONE
- Data migration:
  - Automatic localStorage → Supabase migration — ✅ DONE
  - Preserves user data on first sign-in — ✅ DONE
- Documentation:
  - `SUPABASE_SETUP.md` (setup guide) — ✅ DONE
  - `PHASE_17_TESTING.md` (testing checklist) — ✅ DONE
  - `PHASE_17_PROGRESS.md` (implementation log) — ✅ DONE

**Phase 19: UI Polish & Trial Messaging** ✅ COMPLETE
- Improved trial banner messaging (professional, clearer language) — ✅ DONE
- Fixed SAMPLE watermarks on Pro analysis panels (top/bottom instead of overlapping) — ✅ DONE
- Trial banner now displays: "Free Trial · X days remaining" with clear subtitle — ✅ DONE
- Cached properties correctly excluded from analysis count (no message needed) — ✅ DONE

**Phase 20: Map Integration**
- Google Maps API key already in .env
- Show property + AVM comps + rental listings on interactive map
- Use latitude/longitude from RentCast data
- Click-to-zoom comp details

**Phase 21: Performance Optimization**
- Code splitting with `manualChunks` (vendor, react-query, recharts)
- Lazy-load heavy components (Charts, FinancialTables, MarketTrendCharts)
- `React.memo` and `useCallback` for render optimization
- Reduce/remove 5s pre-analysis delay if rate limiting is stable

**Phase 22: Payments (Stripe)**
- Stripe integration for subscription billing
- Free/Pro/Team/Enterprise tier enforcement
- Usage tracking and overage handling
- Billing portal and invoice management

**Phase 23: Testing & CI/CD**
- Unit tests (Vitest) for financial logic and services
- E2E tests (Playwright) for critical user flows
- GitHub Actions pipeline for build/test/deploy
- Automated deployment on push to master

---

## Important Rules (Preserve These)

1. **Never remove `pt-24` from main element** — preserves nav spacing
2. **Keep `normalizeAddress` identical** — changes break cache keys
3. **Keep `refetchOnMount: false`** — global default prevents cache thrashing
4. **API keys must stay server-side** — never use `VITE_` prefix for secrets
5. **Server must run before frontend** — Vite proxies `/api` to `:3002`
6. **Express 5 in use** — no bare `*` wildcard routes, use `/{*splat}` syntax
7. **Side effects in `useEffect`, never `useMemo`** — recently fixed, don't regress
8. **RentCast proxy is transparent** — new endpoints work automatically via `/api/rentcast/*`
9. **Phase 5+ data is all optional** — every new field on `RentCastProperty` is `?`, UI guards with `&&` checks
10. **In-memory state resets on restart** — caches, metrics, sessions, queue, cost tracking all rebuild from scratch
11. **`NODE_ENV=production` disables test routes** — all `/api/test/*` endpoints return 403 in production
12. **Railway uses `PORT` env var** — server checks `PORT` first, then `API_PORT`, then defaults to `3002`. Never hardcode the port.
13. **Railway is the recommended deployment platform** — Vercel is NOT compatible (serverless breaks in-memory state). Do not introduce Vercel-specific configs.
14. **Claude pricing must stay accurate** — Sonnet-4: $3/$15 per 1M tokens, Haiku: $0.80/$4 per 1M tokens. These are set in `server/costTracker.ts`. Verify against Anthropic pricing page before changing.
15. **Test users have `test_` prefix** — all test sessions created via `/api/test/create-user` are prefixed with `test_` for easy identification and cleanup

---

**Document prepared for Analyze My Property Launch**
**Last Updated:** February 19, 2026
**Version:** 2.4
