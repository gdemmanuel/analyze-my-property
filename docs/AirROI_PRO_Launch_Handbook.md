# AirROI PRO Launch Handbook
**Real Estate Investment Intelligence Platform**

**Version:** 1.0  
**Date:** February 2026  
**Document Type:** Product Launch Guide

---

## Table of Contents

1. [Product Vision & Positioning](#1-product-vision--positioning)
2. [MVP Scope, User Stories & Acceptance Criteria](#2-mvp-scope-user-stories--acceptance-criteria)
3. [System Architecture & Data Flow](#3-system-architecture--data-flow)
4. [Data Sources & Modeling Details](#4-data-sources--modeling-details)
5. [Security, Compliance & Reliability](#5-security-compliance--reliability)
6. [Deployment Plan - Step by Step](#6-deployment-plan---step-by-step)
7. [Data Model](#7-data-model)
8. [Pricing & Packaging](#8-pricing--packaging)
9. [Financial Plan - Charts & KPIs](#9-financial-plan---charts--kpis)

---

## 1. Product Vision & Positioning

### Vision Statement
AirROI PRO empowers real estate investors to make data-driven acquisition decisions for short-term rental (STR), mid-term rental (MTR), and long-term rental (LTR) properties with AI-powered underwriting, real-time market data, and comprehensive financial projections.

### Target Market
| Segment | Description | Size (US) |
|---------|-------------|-----------|
| **Primary** | Individual STR investors (1-5 properties) | ~2.1M hosts |
| **Secondary** | Small property management companies | ~150K companies |
| **Tertiary** | Real estate agents serving investors | ~1.5M agents |

### Competitive Positioning

| Feature | AirROI PRO | AirDNA | Mashvisor | Rabbu |
|---------|-----------|--------|-----------|-------|
| AI-Powered Analysis | ✅ Claude AI | ❌ | ❌ | ❌ |
| Multi-Strategy (STR/MTR/LTR) | ✅ | ❌ STR only | ✅ | ❌ STR only |
| Real-Time Property Data | ✅ RentCast | ✅ | ✅ | ✅ |
| 20-Year Projections | ✅ | ❌ | ❌ | ❌ |
| HELOC Financing Model | ✅ | ❌ | ❌ | ❌ |
| Seasonality Modeling | ✅ 12-month | ✅ | ❌ | ❌ |
| Portfolio Comparison | ✅ | ✅ | ✅ | ❌ |
| Price Point | $29-99/mo | $99-399/mo | $99-149/mo | $99-249/mo |

### Value Proposition
**"Underwrite any property in 60 seconds with institutional-grade AI analysis at a fraction of the cost."**

---

## 2. MVP Scope, User Stories & Acceptance Criteria

### MVP Feature Set (Current Implementation)

| Category | Features Included |
|----------|-------------------|
| **Property Analysis** | Address lookup, AI underwriting, market comparables |
| **Financial Modeling** | 20-year projections, 3 rental strategies, seasonality |
| **Capital Structure** | Down payment, HELOC funding, mortgage calculations |
| **Portfolio Management** | Save assessments, compare up to 4 properties |
| **Export** | PDF report generation |

### User Stories & Acceptance Criteria

#### US-001: Property Search & Analysis
**As an** investor  
**I want to** enter a property address and receive a complete analysis  
**So that** I can quickly evaluate acquisition opportunities

| Acceptance Criteria | Status |
|---------------------|--------|
| Address autocomplete suggestions appear after 5 characters | ✅ Implemented |
| Property data fetched from RentCast within 3 seconds | ✅ Implemented |
| AI analysis completes within 15 seconds | ✅ Implemented |
| Results display beds, baths, sqft, year built | ✅ Implemented |
| Suggested ADR, occupancy, and monthly revenue populated | ✅ Implemented |

#### US-002: Multi-Strategy Comparison
**As an** investor  
**I want to** compare STR, MTR, and LTR scenarios  
**So that** I can choose the optimal rental strategy

| Acceptance Criteria | Status |
|---------------------|--------|
| Toggle between STR/MTR/LTR with one click | ✅ Implemented |
| Each strategy shows unique revenue/expense calculations | ✅ Implemented |
| Cap Rate and Cash-on-Cash update per strategy | ✅ Implemented |
| Pro forma scenarios show Conservative/Base/Aggressive | ✅ Implemented |

#### US-003: Financial Projections
**As an** investor  
**I want to** see 20-year cash flow projections  
**So that** I can understand long-term returns

| Acceptance Criteria | Status |
|---------------------|--------|
| Monthly projections for 240 months | ✅ Implemented |
| Yearly aggregation with cumulative totals | ✅ Implemented |
| Seasonality applied to STR (12 monthly factors) | ✅ Implemented |
| HELOC interest and paydown calculated | ✅ Implemented |
| Property appreciation factored into equity | ✅ Implemented |

#### US-004: Portfolio Management
**As an** investor  
**I want to** save and compare multiple properties  
**So that** I can prioritize my acquisition pipeline

| Acceptance Criteria | Status |
|---------------------|--------|
| Save assessment to local storage | ✅ Implemented |
| Load saved assessments from Portfolio tab | ✅ Implemented |
| Compare up to 4 properties side-by-side | ✅ Implemented |
| Delete individual assessments | ✅ Implemented |

#### US-005: Export & Reporting
**As an** investor  
**I want to** export a professional PDF report  
**So that** I can share analysis with partners/lenders

| Acceptance Criteria | Status |
|---------------------|--------|
| PDF includes property details, metrics, and AI analysis | ✅ Implemented |
| Professional formatting with branded header | ✅ Implemented |
| Sources and citations included | ✅ Implemented |

---

## 3. System Architecture & Data Flow

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   React UI   │  │  Financial   │  │   Charts     │  │   Export     │ │
│  │   (App.tsx)  │  │    Logic     │  │  (Recharts)  │  │   (Print)    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                              │                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      Service Layer                                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │  │
│  │  │ RentCast API │  │ Claude AI    │  │ Google Street View API   │ │  │
│  │  │   Service    │  │   Service    │  │      Service             │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │  RentCast   │ │  Anthropic  │ │   Google    │
            │     API     │ │     API     │ │  Maps API   │
            │ (Property   │ │  (Claude    │ │ (Street     │
            │   Data)     │ │ Sonnet 4)   │ │   View)     │
            └─────────────┘ └─────────────┘ └─────────────┘
```

### Data Flow Sequence

```
User Input (Address)
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Fetch Property Data (RentCast)                      │
│   • Active Listings API → Current listing price             │
│   • AVM Value API → Automated valuation                     │
│   • Properties API → Beds, baths, sqft, tax, HOA           │
│   • STR AVM API → ADR, occupancy estimates                  │
│   • STR Comps API → Nearby rental comparables               │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: AI Analysis (Claude Sonnet 4)                       │
│   • Market snapshot and regulations                         │
│   • Break-even analysis                                     │
│   • Pro forma scenarios (3 tiers)                          │
│   • Risk assessment and recommendation                      │
│   • Sources and citations                                   │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Financial Projections (Client-Side)                 │
│   • 20-year monthly cash flow                               │
│   • Seasonality factors applied                             │
│   • Mortgage amortization                                   │
│   • HELOC interest and paydown                              │
│   • Cap Rate, Cash-on-Cash, Gross Yield                    │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Property Image (Fallback Logic)                     │
│   • If RentCast has image → Use RentCast image             │
│   • Else → Generate Google Street View URL                  │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
    Dashboard Render
```

### Technology Stack

| Layer | Technology | Version/Details |
|-------|------------|-----------------|
| **Frontend Framework** | React | 18.x with TypeScript |
| **Build Tool** | Vite | 5.x |
| **UI Components** | Custom + Lucide Icons | Lucide React 0.x |
| **Charts** | Recharts | 2.x (bar, line, area charts) |
| **Styling** | Tailwind CSS | 3.x |
| **AI Model** | Claude Sonnet 4 | claude-sonnet-4-20250514 |
| **Property Data** | RentCast API | REST API |
| **Street View** | Google Maps Static API | v1 |
| **Storage** | Browser LocalStorage | Persistent assessments |

---

## 4. Data Sources & Modeling Details

### External Data Sources

#### RentCast API (Primary Data Provider)
**Base URL:** `https://api.rentcast.io/v1`  
**Pricing:** ~$0.01-0.05 per API call (varies by endpoint)

| Endpoint | Purpose | Data Returned |
|----------|---------|---------------|
| `/listings/sale` | Active listing price | Price, status, images |
| `/avm/value` | Automated valuation | Market value estimate |
| `/properties` | Property records | Beds, baths, sqft, tax history |
| `/avm/rent/long-term` | LTR rent estimate | Monthly rent, range |
| `/avm/rent/short-term` | STR metrics | ADR, occupancy, range |
| `/listings/rental/short-term` | STR comparables | Nearby STR performance |
| `/markets/stats` | Market statistics | Avg rent, listings count |

#### Claude AI (Anthropic)
**Model:** claude-sonnet-4-20250514  
**Pricing:** $3 per million input tokens, $15 per million output tokens  
**Average per analysis:** ~$0.02-0.05

| Capability | Usage |
|------------|-------|
| Web Search | Real-time market data when RentCast lacks STR info |
| Analysis | Market snapshot, regulations, recommendation |
| Underwriting | Pro forma scenarios, break-even analysis |

#### Google Street View Static API
**Pricing:** $7 per 1,000 requests ($200/month free tier)  
**Usage:** Fallback when RentCast lacks property images

### Financial Model Parameters

#### Default Configuration
```typescript
{
  price: 500000,              // Purchase price
  downPaymentPercent: 20,     // Down payment %
  mortgageRate: 6.5,          // Annual mortgage rate %
  helocRate: 7.5,             // HELOC interest rate %
  helocFundingPercent: 100,   // % of upfront funded by HELOC
  loanCosts: 7500,            // Closing costs
  mgmtFeePercent: 20,         // Property management %
  maintenancePercent: 5,      // Maintenance reserve %
  hostFeePercent: 15.5,       // Airbnb/platform fee %
  adr: 300,                   // Base ADR for STR
  mtrMonthlyRent: 4500,       // MTR monthly rent
  ltrMonthlyRent: 3000,       // LTR monthly rent
  occupancyPercent: 70,       // Base STR occupancy %
  annualAppreciationRate: 3,  // Property appreciation %
  annualRentGrowthRate: 3,    // Rent growth %
  annualExpenseInflationRate: 2 // Expense inflation %
}
```

#### Seasonality Factors (STR)
Monthly multipliers applied to ADR and Occupancy:

| Month | ADR Factor | Occupancy Factor |
|-------|-----------|------------------|
| Jan | 1.00 | 0.95 |
| Feb | 1.05 | 1.00 |
| Mar | 1.15 | 1.10 |
| Apr | 0.95 | 0.80 |
| May | 0.90 | 0.70 |
| Jun | 1.25 | 1.20 |
| Jul | 1.35 | 1.30 |
| Aug | 1.30 | 1.25 |
| Sep | 1.00 | 0.90 |
| Oct | 0.85 | 0.75 |
| Nov | 0.90 | 0.85 |
| Dec | 1.30 | 1.20 |

#### Strategy-Specific Assumptions

| Parameter | STR | MTR | LTR |
|-----------|-----|-----|-----|
| Base Occupancy | User-defined | 90% | 95% |
| Management Fee | User-defined | Max 15% | Max 10% |
| Platform Fee | 15.5% | 3% | 0% |
| Turns/Month | nights ÷ 3.8 | 0.33 | 0.08 |
| Cleaning Expense | Per-turn | $200/turn | None |
| Fixed OpEx | User-defined | User-defined | $100/mo |

### Amenity Impact Model

| Amenity | Upfront Cost | ADR Boost | Occupancy Boost |
|---------|-------------|-----------|-----------------|
| Initial Furnishings | $25,000 | $0 | 0% |
| Hot Tub | $8,500 | $45 | 6% |
| Cedar Sauna | $6,500 | $25 | 4% |
| Game Room | $4,000 | $20 | 3% |
| Luxury Deck | $12,000 | $35 | 5% |
| EV Charger | $1,500 | $5 | 2% |

---

## 5. Security, Compliance & Reliability

### Current Security Model (MVP)

| Category | Implementation | Risk Level |
|----------|---------------|------------|
| API Keys | Client-side (Vite env vars) | ⚠️ Medium |
| Data Storage | Browser LocalStorage | ⚠️ Medium |
| Authentication | None (single-user) | ⚠️ High for SaaS |
| HTTPS | Depends on hosting | ✅ Low if using Vercel/Netlify |
| Input Validation | Basic sanitization | ⚠️ Medium |

### Production Security Roadmap

#### Phase 1: Backend API Proxy (Pre-Launch)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  API Proxy  │────▶│  External   │
│  (Browser)  │     │  (Vercel/   │     │   APIs      │
│             │◀────│  Netlify)   │◀────│             │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                    API Keys stored
                    server-side only
```

#### Phase 2: Authentication (Post-Launch)
- Firebase Auth or Auth0 integration
- User accounts with email/password or Google SSO
- JWT token-based API access

#### Phase 3: Data Persistence
- Firestore or Supabase for cloud storage
- User-specific saved assessments
- Audit logging for compliance

### Compliance Considerations

| Regulation | Applicability | Status |
|------------|--------------|--------|
| GDPR | If serving EU users | ⚠️ Requires privacy policy |
| CCPA | If serving CA users | ⚠️ Requires opt-out mechanism |
| SOC 2 | Enterprise customers | ❌ Not applicable for MVP |
| PCI DSS | If processing payments | ⚠️ Use Stripe (out of scope) |

### Reliability Targets

| Metric | Target | Current |
|--------|--------|---------|
| Uptime | 99.5% | N/A (not deployed) |
| API Response Time | < 3s (data fetch) | ~2-3s |
| AI Analysis Time | < 15s | ~8-12s |
| Error Rate | < 1% | ~2% (API failures) |

---

## 6. Deployment Plan - Step by Step

### Phase 1: Development Environment (Current)
```bash
# Local development
npm run dev  # Runs Vite dev server on localhost:5173
```

### Phase 2: Production Build
```bash
# 1. Create production build
npm run build

# 2. Preview production build locally
npm run preview

# Output: dist/ folder with optimized assets
```

### Phase 3: Vercel Deployment (Recommended)

#### Step 1: Prepare Repository
```bash
# Initialize Git (if not done)
git init
git add .
git commit -m "Initial production build"

# Push to GitHub
git remote add origin https://github.com/YOUR_ORG/airroi-pro.git
git push -u origin main
```

#### Step 2: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

#### Step 3: Configure Environment Variables
In Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Production |
| `VITE_RENTCAST_API_KEY` | `eba8460...` | Production |
| `VITE_GOOGLE_MAPS_API_KEY` | `AIza...` | Production |

#### Step 4: Deploy
```bash
vercel deploy --prod
```

#### Step 5: Custom Domain (Optional)
1. Vercel Dashboard → Domains
2. Add domain: `app.airroi.pro`
3. Configure DNS:
   - CNAME: `app` → `cname.vercel-dns.com`
   - Or A Record: `76.76.21.21`

### Phase 4: API Key Security (Pre-Production)

#### Create Vercel Serverless Functions
```
/api/
  ├── rentcast.ts      # Proxy for RentCast API
  ├── claude.ts        # Proxy for Anthropic API
  └── streetview.ts    # Proxy for Google API
```

Example `/api/rentcast.ts`:
```typescript
export default async function handler(req, res) {
  const API_KEY = process.env.RENTCAST_API_KEY; // Server-side only
  const { endpoint, params } = req.body;
  
  const response = await fetch(`https://api.rentcast.io/v1/${endpoint}?${params}`, {
    headers: { 'X-Api-Key': API_KEY }
  });
  
  return res.json(await response.json());
}
```

### Phase 5: Monitoring Setup

| Tool | Purpose | Configuration |
|------|---------|---------------|
| Vercel Analytics | Page views, performance | Enabled by default |
| Sentry | Error tracking | Install `@sentry/react` |
| LogRocket | Session replay | Optional for debugging |

### Deployment Checklist

- [ ] All environment variables configured
- [ ] API keys moved to server-side proxies
- [ ] HTTPS enforced
- [ ] Error boundaries implemented
- [ ] Analytics/monitoring enabled
- [ ] Custom domain configured
- [ ] SSL certificate issued
- [ ] Performance tested (Lighthouse score > 80)
- [ ] Mobile responsiveness verified

---

## 7. Data Model

### Current Implementation: LocalStorage

The MVP uses browser LocalStorage for persistence. Data is stored as JSON strings.

#### Storage Keys

| Key | Description | Type |
|-----|-------------|------|
| `airroi_saved_assessments` | Array of saved property analyses | `SavedAssessment[]` |
| `airroi_amenities` | Custom amenity configurations | `Amenity[]` |

### Data Schemas (TypeScript Interfaces)

#### PropertyConfig
```typescript
interface PropertyConfig {
  price: number;                    // Purchase price ($)
  downPaymentPercent: number;       // Down payment (%)
  mortgageRate: number;             // Annual mortgage rate (%)
  helocRate: number;                // HELOC interest rate (%)
  helocFundingPercent: number;      // % of upfront via HELOC
  upgradeCost: number;              // Renovation cost ($)
  loanCosts: number;                // Closing costs ($)
  furnishingsCost: number;          // Furnishing total ($)
  mgmtFeePercent: number;           // Management fee (%)
  maintenancePercent: number;       // Maintenance reserve (%)
  cleaningFeeIncome: number;        // Monthly cleaning income ($)
  cleaningExpense: number;          // Monthly cleaning expense ($)
  hostFeePercent: number;           // Platform fee (%)
  adr: number;                      // Average Daily Rate ($)
  mtrMonthlyRent: number;           // MTR rent ($)
  ltrMonthlyRent: number;           // LTR rent ($)
  expectedMonthlyRevenue: number;   // Target revenue ($)
  occupancyPercent: number;         // Occupancy rate (%)
  propertyTaxMonthly: number;       // Monthly tax ($)
  annualPropertyTaxRate: number;    // Tax rate (%)
  fixedOpexMonthly: number;         // Fixed expenses ($)
  hoaMonthly: number;               // HOA fee ($)
  annualAppreciationRate: number;   // Appreciation (%)
  annualRentGrowthRate: number;     // Rent growth (%)
  annualExpenseInflationRate: number; // Inflation (%)
  helocPaydownPercent: number;      // HELOC paydown allocation (%)
}
```

#### MarketInsight (AI Analysis Output)
```typescript
interface MarketInsight {
  summary: string;
  snapshot: string;                 // Property/market overview
  regulations: string;              // Local STR regulations
  marketPerformance: string;        // Market trends
  debtAssumptions: string;
  proFormaScenarios: ScenarioData[]; // 3 scenario projections
  breakEvenAnalysis: string;
  pathsToYes: string;
  risksDiligence: string;
  recommendation: string;
  nextSteps: string;
  comps: CompProperty[];            // Market comparables
  mainImage?: string;               // Property photo URL
  
  // Physical specs
  beds: string;
  baths: string;
  sqft: string;
  lotSize: string;
  yearBuilt: string;
  
  // Suggested values from AI
  suggestedListingPrice: number;
  suggestedMonthlyRevenue: number;
  suggestedOccupancy: number;       // Percentage (0-100)
  suggestedPropertyTax: number;
  suggestedCleaningFee: number;
  suggestedFurnishingsCost: number;
  suggestedHOA: number;
  suggestedMTRRent: number;
  suggestedLTRRent: number;
  suggestedADR: number;
  marketRiskLevel: 'Low' | 'Medium' | 'High';
  verdict: string;
  sources: { title: string; uri: string }[];
}
```

#### SavedAssessment
```typescript
interface SavedAssessment {
  id: string;                       // UUID
  address: string;                  // Full address
  config: PropertyConfig;           // Financial parameters
  insight: MarketInsight;           // AI analysis
  selectedAmenities: string[];      // Amenity IDs enabled
  timestamp: number;                // Unix timestamp
  strategy: 'STR' | 'MTR' | 'LTR';
  capRate: number;                  // Calculated cap rate
  cashOnCash: number;               // Cash-on-cash return
  price: number;                    // Purchase price
  annualNoi: number;                // Year 1 NOI
}
```

### Future: Firestore Schema (Recommended)

```
/users/{userId}/
  ├── profile
  │   ├── email: string
  │   ├── displayName: string
  │   ├── subscription: 'free' | 'pro' | 'enterprise'
  │   └── createdAt: timestamp
  │
  ├── assessments/{assessmentId}/
  │   ├── address: string
  │   ├── config: PropertyConfig (map)
  │   ├── insight: MarketInsight (map)
  │   ├── strategy: string
  │   ├── metrics: { capRate, cashOnCash, annualNoi }
  │   ├── createdAt: timestamp
  │   └── updatedAt: timestamp
  │
  └── settings/
      ├── defaultConfig: PropertyConfig (map)
      └── amenities: Amenity[] (array)
```

---

## 8. Pricing & Packaging

### Pricing Tiers

| Tier | Price | Analyses/Mo | Features |
|------|-------|-------------|----------|
| **Free** | $0 | 3 | Basic analysis, no save |
| **Pro** | $29/mo | 25 | Full features, PDF export, portfolio |
| **Team** | $79/mo | 100 | Pro + 3 seats, shared portfolios |
| **Enterprise** | $199/mo | Unlimited | API access, white-label, priority support |

### Cost Structure per Analysis

| Component | Cost per Analysis |
|-----------|------------------|
| RentCast API (5-7 calls) | ~$0.10-0.20 |
| Claude AI (1 analysis) | ~$0.02-0.05 |
| Street View (fallback) | ~$0.007 |
| **Total Variable Cost** | **~$0.13-0.26** |

### Pricing Strategy Rationale

**Target Gross Margin:** 80%+

| Tier | Revenue/User | Cost/User | Margin |
|------|-------------|-----------|--------|
| Free | $0 | $0.78 (3×$0.26) | -100% |
| Pro | $29 | $6.50 (25×$0.26) | 78% |
| Team | $79 | $26 (100×$0.26) | 67% |
| Enterprise | $199 | ~$52 (200 avg) | 74% |

### Monetization A/B Tests to Run

1. **Freemium vs. Trial**
   - Test: 3 free analyses vs. 7-day free trial
   - Metric: Pro conversion rate

2. **Annual Discount**
   - Test: 20% vs. 25% annual discount
   - Metric: LTV, churn rate

3. **Pay-per-Analysis**
   - Test: $3/analysis vs. subscription only
   - Metric: Revenue per user, activation rate

---

## 9. Financial Plan - Charts & KPIs

### Revenue Projections (Year 1)

| Month | Free Users | Pro Users | Team | Enterprise | MRR |
|-------|------------|-----------|------|------------|-----|
| M1 | 50 | 5 | 0 | 0 | $145 |
| M2 | 120 | 15 | 1 | 0 | $514 |
| M3 | 250 | 35 | 2 | 0 | $1,173 |
| M4 | 400 | 60 | 4 | 1 | $2,255 |
| M5 | 600 | 100 | 6 | 1 | $3,613 |
| M6 | 850 | 150 | 10 | 2 | $5,639 |
| M7 | 1,100 | 220 | 15 | 3 | $8,167 |
| M8 | 1,400 | 300 | 20 | 4 | $10,876 |
| M9 | 1,750 | 400 | 28 | 5 | $14,407 |
| M10 | 2,100 | 520 | 38 | 7 | $18,865 |
| M11 | 2,500 | 660 | 50 | 9 | $24,431 |
| M12 | 3,000 | 850 | 65 | 12 | $31,920 |

**Year 1 ARR:** ~$383,000

### Key Performance Indicators (KPIs)

#### Acquisition Metrics
| KPI | Target | Formula |
|-----|--------|---------|
| CAC (Customer Acquisition Cost) | < $50 | Marketing Spend ÷ New Customers |
| Trial-to-Paid Conversion | > 15% | Paid Users ÷ Trial Signups |
| Activation Rate | > 40% | Users with 1+ analysis ÷ Signups |

#### Engagement Metrics
| KPI | Target | Formula |
|-----|--------|---------|
| DAU/MAU | > 25% | Daily Active ÷ Monthly Active |
| Analyses per User (Pro) | > 8/mo | Total Analyses (Pro) ÷ Pro Users |
| Portfolio Size | > 5 | Avg saved assessments per user |

#### Revenue Metrics
| KPI | Target | Formula |
|-----|--------|---------|
| MRR Growth Rate | > 20%/mo | (MRR_new - MRR_prev) ÷ MRR_prev |
| ARPU (Pro) | $29 | Pro MRR ÷ Pro Users |
| LTV:CAC Ratio | > 3:1 | Customer LTV ÷ CAC |

#### Retention Metrics
| KPI | Target | Formula |
|-----|--------|---------|
| Monthly Churn (Pro) | < 5% | Churned ÷ Start of Month Users |
| Net Revenue Retention | > 100% | (MRR_end + Expansion) ÷ MRR_start |
| 90-Day Retention | > 60% | Active at Day 90 ÷ Cohort Size |

### Cost Projections (Monthly at Scale)

| Category | M1 | M6 | M12 |
|----------|-----|-----|------|
| **API Costs** | $50 | $500 | $2,500 |
| **Hosting (Vercel)** | $0 | $20 | $50 |
| **Marketing** | $200 | $1,000 | $3,000 |
| **Support** | $0 | $500 | $1,500 |
| **Development** | $0 | $0 | $5,000 |
| **Total** | $250 | $2,020 | $12,050 |

### Break-Even Analysis

**Monthly Fixed Costs (at M12):** ~$12,050  
**Variable Cost per Paid User:** ~$6.50/mo  
**Average Revenue per Paid User:** ~$35/mo  
**Contribution Margin:** $28.50/user  

**Break-Even Users:** 423 paid users ($12,050 ÷ $28.50)

---

## Appendix A: Quick Reference

### API Rate Limits

| API | Rate Limit | Recommended |
|-----|-----------|-------------|
| RentCast | 1,000/month (Free) | Starter $99/mo |
| Anthropic | 4M tokens/min | Standard tier |
| Google Maps | 28,000/month (Free) | Standard tier |

### Environment Variables

```bash
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
VITE_RENTCAST_API_KEY=eba8460...
VITE_GOOGLE_MAPS_API_KEY=AIza...
```

### Key Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production
npm run preview

# Deploy to Vercel
vercel deploy --prod
```

---

**Document prepared for AirROI PRO Launch**  
**Last Updated:** February 2026

---

## 10. Advanced AI Prompt Architecture

### Overview

AirROI PRO uses a modular prompt library with 9 specialized AI prompts for comprehensive underwriting analysis. Each prompt is designed for a specific task and returns structured JSON for seamless UI integration.

### Prompt Library Structure

```
prompts/
└── underwriting.ts          # All prompts + TypeScript interfaces
    ├── Types (15+ interfaces)
    ├── AUDIT_PROMPT
    ├── UNDERWRITE_PROMPT
    ├── SENSITIVITY_PROMPT
    ├── AMENITY_ROI_PROMPT
    ├── REGULATION_SCANNER_PROMPT
    ├── PACKET_SUMMARY_PROMPT
    ├── PATH_TO_YES_PROMPT
    ├── MARKET_DISCOVERY_PROMPT
    └── COMPS_STRENGTH_PROMPT
```

### Prompt Catalog

| Prompt | Purpose | Web Search | Avg Tokens |
|--------|---------|------------|------------|
| `AUDIT_PROMPT` | Property & market verification | ✅ | ~2,000 |
| `UNDERWRITE_PROMPT` | Full KPI calculation with HELOC | ❌ | ~4,000 |
| `SENSITIVITY_PROMPT` | ADR/Occupancy/Rate stress testing | ❌ | ~1,500 |
| `AMENITY_ROI_PROMPT` | Amenity payback with diminishing returns | ❌ | ~1,500 |
| `REGULATION_SCANNER_PROMPT` | STR regulation lookup | ✅ | ~2,500 |
| `PACKET_SUMMARY_PROMPT` | Lender-ready one-pager | ❌ | ~1,500 |
| `PATH_TO_YES_PROMPT` | Deal optimization suggestions | ❌ | ~1,500 |
| `MARKET_DISCOVERY_PROMPT` | Market discovery for budget/CoC | ✅ | ~2,500 |
| `COMPS_STRENGTH_PROMPT` | Comp quality scoring | ❌ | ~1,000 |

### Input/Output Schemas

#### Property Audit

**Input:**
```typescript
interface PropertyFacts {
  beds?: number;
  baths?: number;
  sqft?: number;
  taxes?: number;
  hoa?: number;
}
```

**Output:**
```typescript
interface PropertyAudit {
  address: string;
  facts: PropertyFacts & { notes?: string };
  market: {
    regNotes?: string;
    mtrNodes?: string[];
    seasonalNotes?: string;
  };
  suggestions: {
    adr?: number;
    occ?: number;
    mtrRent?: number;
    ltrRent?: number;
  };
  risks: string[];
  sources: { title: string; url: string }[];
}
```

#### Sensitivity Analysis

**Input:**
```typescript
{
  adr: number;
  occupancy: number;
  rate: number;
  ownerSurplus: number;
  cashOnCash: number;
  dscr: number;
}
```

**Output:**
```typescript
interface SensitivityMatrix {
  adrVariations: number[];      // [-10, -5, 0, 5, 10]
  occVariations: number[];      // [-10, -5, 0, 5, 10]
  rateVariations: number[];     // [-100, -50, 0, 50, 100] bps
  matrix: {
    adrDelta: number;
    occDelta: number;
    ownerSurplus: number;
    cashOnCash: number;
    dscr: number;
  }[];
  breakpoints: { description: string; threshold: string }[];
  guidance: string;
}
```

#### Path to Yes

**Input:**
```typescript
{
  kpis: { capRate: number; cashOnCash: number; dscr: number; ownerSurplus: number };
  targets: { minCapRate: number; minCoC: number; minDSCR: number };
  assumptions: Record<string, any>;
}
```

**Output:**
```typescript
interface PathToYes {
  currentStatus: 'Buy' | 'No-Buy';
  targetGap: { metric: string; current: number; target: number; gap: number }[];
  recommendations: {
    priority: number;
    action: string;
    quantifiedImpact: string;
    implementationNotes: string;
  }[];
  minimalChanges: string[];
}
```

### Service Integration

All prompts are integrated via `claudeService.ts`:

```typescript
import { 
  runPropertyAudit,
  runUnderwriteAnalysis,
  runSensitivityAnalysis,
  runAmenityROI,
  scanRegulations,
  generateLenderPacket,
  calculatePathToYes,
  discoverMarkets,
  scoreCompStrength
} from './services/claudeService';

// Example usage
const sensitivity = await runSensitivityAnalysis({
  adr: 300,
  occupancy: 70,
  rate: 6.5,
  ownerSurplus: 24000,
  cashOnCash: 12.5,
  dscr: 1.35
});
```

### UI Components

| Component | File | Features |
|-----------|------|----------|
| `SensitivityTable` | `components/SensitivityTable.tsx` | 5×5 ADR×Occupancy matrix, color-coded cells, breakpoints |
| `AmenityROIPanel` | `components/AmenityROIPanel.tsx` | Ranked list, payback bars, confidence ranges |
| `PathToYesPanel` | `components/PathToYesPanel.tsx` | Target gaps, prioritized actions, "Apply" buttons |
| `LenderPacketExport` | `components/LenderPacketExport.tsx` | Preview card, PDF export |

### API Cost Estimates

| Prompt | Input Tokens | Output Tokens | Cost/Call |
|--------|-------------|---------------|-----------|
| Property Audit | ~500 | ~1,500 | ~$0.025 |
| Underwrite Analysis | ~1,000 | ~3,000 | ~$0.05 |
| Sensitivity Analysis | ~300 | ~1,200 | ~$0.02 |
| Amenity ROI | ~400 | ~1,100 | ~$0.02 |
| Regulation Scanner | ~200 | ~2,000 | ~$0.03 |
| Lender Packet | ~800 | ~700 | ~$0.015 |
| Path to Yes | ~500 | ~1,000 | ~$0.02 |
| Market Discovery | ~200 | ~2,000 | ~$0.03 |
| Comp Strength | ~600 | ~400 | ~$0.01 |

**Average total per full analysis:** ~$0.20-0.25

### Best Practices

1. **Cache Expensive Calls** - Cache regulation scans and market discovery results for 24 hours
2. **Batch Requests** - Combine multiple prompts in a single analysis workflow
3. **Progressive Loading** - Show results as each prompt completes
4. **Error Handling** - Each function throws on failure; wrap in try-catch with fallback UI

---

**Document prepared for AirROI PRO Launch**  
**Last Updated:** February 2026

