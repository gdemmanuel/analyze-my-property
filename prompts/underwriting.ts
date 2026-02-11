/**
 * Advanced Underwriting Prompt Library
 * 9 specialized AI prompts for comprehensive real estate analysis
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PropertyFacts {
  beds?: number;
  baths?: number;
  sqft?: number;
  taxes?: number;
  hoa?: number;
}

export interface PropertyAudit {
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

export interface UnderwriteInput {
  strategy: 'STR' | 'MTR' | 'LTR';
  assumptions: {
    price: number;
    downPaymentPercent: number;
    mortgageRate: number;
    adr?: number;
    occupancy?: number;
    mtrRent?: number;
    ltrRent?: number;
    propertyTax: number;
    hoa: number;
    insurance: number;
    maintenance: number;
    mgmtFee: number;
  };
  amenities: { name: string; cost: number; adrBoost: number; occBoost: number }[];
  capital: {
    helocPct: number;
    helocAPR: number;
    interestOnlyMonths: number;
  };
  seasonality?: number[];
}

export interface UnderwriteResult {
  kpis: {
    capRate: number;
    cashOnCash: number;
    dscr: number;
    netNoi: number;
    ownerSurplus: number;
  };
  ledger: {
    monthly: MonthlyLedgerEntry[];
    annual: AnnualLedgerEntry[];
  };
  amenities: {
    summary: { name: string; deltaRevenue: number; paybackMonths: number }[];
  };
  assumptionsEcho: Record<string, any>;
}

export interface MonthlyLedgerEntry {
  month: number;
  revenue: number;
  expenses: number;
  noi: number;
  mortgagePayment: number;
  helocInterest: number;
  cashFlow: number;
  mortgageBalance: number;
  helocBalance: number;
}

export interface AnnualLedgerEntry {
  year: number;
  totalRevenue: number;
  totalExpenses: number;
  totalNoi: number;
  totalCashFlow: number;
  endingMortgageBalance: number;
  endingHelocBalance: number;
}

export interface SensitivityMatrix {
  adrVariations: number[];
  occVariations: number[];
  rateVariations: number[];
  matrix: {
    adrDelta: number;
    occDelta: number;
    ownerSurplus: number;
    cashOnCash: number;
    dscr: number;
  }[];
  breakpoints: {
    description: string;
    threshold: string;
  }[];
  guidance: string;
}

export interface AmenityROIInput {
  currentADR: number;
  currentOccupancy: number;
  baseAssumptions: Record<string, any>;
  amenities: {
    name: string;
    setupCost: number;
    adrLiftPct: number;
    occLiftPct: number;
  }[];
}

export interface AmenityROIResult {
  rankedList: {
    rank: number;
    name: string;
    setupCost: number;
    deltaRevenue: number;
    paybackMonths: number;
    confidenceRange: { low: number; high: number };
    diminishingReturnsNote?: string;
    buyImpactScore?: number;
  }[];
  stackingRecommendations: string[];
}

export interface RegulationReport {
  city: string;
  riskScore: 'Low' | 'Medium' | 'High';
  summary: string;
  keyRules: string[];
  permits: string[];
  restrictions: string[];
  uncertainties: string[];
  sources: { title: string; url: string }[];
  recommendation: string;
}

export interface LenderPacket {
  executiveSummary: {
    recommendation: 'Strong Buy' | 'Buy' | 'Pass';
    highlights: string[];
    dealSnapshot: {
      listPrice: number;
      acquisitionPrice: number;
      downPayment: number;
      totalCashRequired: number;
      projectedCoC: number;
      projectedCapRate: number;
      projectedDSCR: number;
    };
  };
  propertyOverview: {
    address: string;
    propertyType: string;
    beds: number;
    baths: number;
    sqft: number;
    yearBuilt: number;
    lotSize: string;
    zoning: string;
    condition: string;
    notableFeatures: string[];
  };
  financialAnalysis: {
    purchaseAnalysis: {
      listPrice: number;
      acquisitionPrice: number;
      downPaymentPercent: number;
      downPaymentAmount: number;
      loanAmount: number;
      estimatedClosingCosts: number;
      totalCashRequired: number;
    };
    operatingPerformance: {
      projectedGrossRevenue: number;
      operatingExpenses: number;
      noi: number;
      annualDebtService: number;
      cashFlowAfterDebt: number;
    };
    investmentMetrics: {
      capRate: number;
      cashOnCash: number;
      dscr: number;
      grossYield: number;
      breakEvenOccupancy: number;
    };
    fiveYearProjections: {
      year: number;
      revenue: number;
      expenses: number;
      cashFlow: number;
      equity: number;
      cumulativeReturn: number;
    }[];
  };
  marketAnalysis: {
    comparables: {
      address: string;
      beds: number;
      baths: number;
      adr: number;
      occupancy: number;
      distance: string;
    }[];
    marketTrends: {
      avgADR: number;
      avgOccupancy: number;
      seasonality: string;
      growthTrend: string;
    };
    competitivePosition: string;
    demandIndicators: {
      tourism: string;
      events: string;
      accessibility: string;
    };
  };
  revenueStrategy: {
    strategy: string;
    pricingStrategy: {
      peakSeasonADR: number;
      offSeasonADR: number;
      avgADR: number;
    };
    occupancyProjections: {
      year1: number;
      year2: number;
      year3: number;
    };
    amenityImpact: {
      name: string;
      adrIncrease: number;
      cost: number;
      paybackMonths: number;
    }[];
    managementPlan: string;
  };
  riskAssessment: {
    regulatoryRisks: { risk: string; severity: 'Low' | 'Medium' | 'High'; mitigation: string }[];
    marketRisks: { risk: string; severity: 'Low' | 'Medium' | 'High'; mitigation: string }[];
    propertyRisks: { risk: string; severity: 'Low' | 'Medium' | 'High'; mitigation: string }[];
    financialRisks: { risk: string; severity: 'Low' | 'Medium' | 'High'; mitigation: string }[];
  };
  sources: { title: string; url: string }[];
  generatedDate: string;
}

export interface PathToYes {
  currentStatus: 'Strong Buy' | 'Buy' | 'Conditional Buy' | 'Review' | 'No-Buy';
  statusReason: string;
  metricsEvaluated: string[];
  metricsExcluded?: string[];
  targetGap: {
    metric: string;
    current: number;
    target: number;
    gap: number;
  }[];
  recommendations: {
    priority: number;
    action: string;
    quantifiedImpact: string;
    implementationNotes: string;
  }[];
  minimalChanges: string[];
}

export interface MarketDiscoveryInput {
  budget: number;
  targetCoC: number;
}

export interface MarketList {
  markets: {
    rank: number;
    city: string;
    state: string;
    rationale: string;
    estimatedCoC: number;
    risks: string[];
    sources: { title: string; url: string }[];
  }[];
}

export interface CompScore {
  score: number;
  drivers: {
    factor: string;
    score: number;
    notes: string;
  }[];
  recommendations: string[];
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

export const AUDIT_PROMPT = (address: string, knownFacts?: PropertyFacts): string => `
You are an assistant that produces an AI-grounded property & market audit for real-estate underwriting.

INPUTS:
- Address: ${address}
${knownFacts ? `- Known facts: ${JSON.stringify(knownFacts)}` : '- No known facts provided'}

GOALS:
- Verify key facts or return 'unknown' with confidence note.
- Summarize local STR rules (if available), MTR demand nodes (hospitals, enterprise hubs), and any notable seasonality.
- Propose starting assumptions for STR ADR & occupancy, MTR monthly rent, LTR monthly rent.
- RETURN sources[] with title+url for any claim beyond calculations.

OUTPUT JSON SCHEMA:
{
  "address": "string",
  "facts": {"beds": number|null, "baths": number|null, "sqft": number|null, "taxes": number|null, "hoa": number|null, "notes": "string"},
  "market": {"regNotes": "string", "mtrNodes": ["string"], "seasonalNotes": "string"},
  "suggestions": {"adr": number, "occ": number, "mtrRent": number, "ltrRent": number},
  "risks": ["string"],
  "sources": [{"title": "string", "url": "string"}]
}

CONSTRAINTS:
- If you cannot verify, return null fields and add a risk note.
- Never fabricate URLs; prefer official sources.
- Return ONLY valid JSON, no additional text.
`;

export const UNDERWRITE_PROMPT = (input: UnderwriteInput): string => `
You compute underwriting KPIs given user assumptions, amenities, and capital strategy (HELOC-first).

INPUT JSON:
${JSON.stringify(input, null, 2)}

TASKS:
- Apply strategy defaults (fees/turnover).
- For STR, apply seasonality to ADR & Occupancy if provided.
- Compute mortgage amortization; HELOC IO then surplus-first principal until zero.
- Return KPIs (Cap Rate, CoC, DSCR, Net NOI, Owner Surplus) and 20-year monthly arrays: cashFlow[], mortgageBalance[], helocBalance[].
- Compute amenity ΔRevenue and payback, with diminishing returns when stacking similar amenities.

OUTPUT JSON SCHEMA:
{
  "kpis": {"capRate": number, "cashOnCash": number, "dscr": number, "netNoi": number, "ownerSurplus": number},
  "ledger": {
    "monthly": [{"month": number, "revenue": number, "expenses": number, "noi": number, "mortgagePayment": number, "helocInterest": number, "cashFlow": number, "mortgageBalance": number, "helocBalance": number}],
    "annual": [{"year": number, "totalRevenue": number, "totalExpenses": number, "totalNoi": number, "totalCashFlow": number, "endingMortgageBalance": number, "endingHelocBalance": number}]
  },
  "amenities": {"summary": [{"name": "string", "deltaRevenue": number, "paybackMonths": number}]},
  "assumptionsEcho": {}
}

Return ONLY valid JSON, no additional text.
`;

export const SENSITIVITY_PROMPT = (baseKPIs: { adr: number; occupancy: number; rate: number; ownerSurplus: number; cashOnCash: number; dscr: number }): string => `
Create a sensitivity table for the following base case:
- ADR: $${baseKPIs.adr}
- Occupancy: ${baseKPIs.occupancy}%
- Mortgage Rate: ${baseKPIs.rate}%
- Current Owner Surplus: $${baseKPIs.ownerSurplus}
- Current Cash-on-Cash: ${baseKPIs.cashOnCash}%
- Current DSCR: ${baseKPIs.dscr}

TASKS:
1. Create a 5x5 matrix for ADR ±10% (5%, 10%) and Occupancy ±10% (5%, 10%)
2. Add rate sensitivity at ±50 bps and ±100 bps
3. For each cell, calculate: Owner Surplus, CoC, DSCR changes
4. Identify breakpoints where Buy/No-buy decision flips

OUTPUT JSON SCHEMA:
{
  "adrVariations": [-10, -5, 0, 5, 10],
  "occVariations": [-10, -5, 0, 5, 10],
  "rateVariations": [-100, -50, 0, 50, 100],
  "matrix": [{"adrDelta": number, "occDelta": number, "ownerSurplus": number, "cashOnCash": number, "dscr": number}],
  "breakpoints": [{"description": "string", "threshold": "string"}],
  "guidance": "string"
}

Return ONLY valid JSON, no additional text.
`;

export const AMENITY_ROI_PROMPT = (input: AmenityROIInput): string => `
Analyze amenities to recommend the BEST PATH TO BUY STATUS by improving investment metrics.

CURRENT STATE:
- ADR: $${input.currentADR}
- Occupancy: ${input.currentOccupancy}%
- Base Assumptions: ${JSON.stringify(input.baseAssumptions)}

PROPOSED AMENITIES:
${JSON.stringify(input.amenities, null, 2)}

CRITICAL OBJECTIVE:
Rank amenities by their ability to improve INVESTMENT METRICS (Cap Rate, Cash-on-Cash, DSCR), not just raw ROI.
Consider:
1. Revenue increase (improves Cap Rate, CoC, DSCR)
2. Setup cost impact on cash invested (affects CoC)
3. Net impact on annual cash flow (affects DSCR)
4. Payback period

RANKING CRITERIA (in priority order):
1. **Strongest Buy Impact**: Amenities that most improve Cap Rate, CoC, and DSCR
2. **Fastest Payback**: Quick return on investment
3. **Lowest Risk**: High confidence in revenue boost
4. **Stacking Efficiency**: Works well with other amenities

TASKS:
1. Calculate ΔRevenue for each amenity (annual increase)
2. Calculate impact on investment metrics:
   - Cap Rate improvement (ΔRevenue / property price)
   - CoC improvement (ΔRevenue / setup cost)
   - DSCR improvement (ΔRevenue / annual debt service)
3. Calculate payback period in months
4. Apply diminishing returns when combining similar amenities (e.g., spa features stack at 70% efficiency)
5. Provide 90% confidence range for payback
6. **Rank by strongest path to Buy status** (not just payback period)

OUTPUT JSON SCHEMA:
{
  "rankedList": [
    {
      "rank": number,
      "name": "string",
      "setupCost": number,
      "deltaRevenue": number,
      "paybackMonths": number,
      "confidenceRange": {"low": number, "high": number},
      "diminishingReturnsNote": "string|null",
      "buyImpactScore": number (1-10, how much this improves investment metrics)
    }
  ],
  "stackingRecommendations": ["string - focus on combinations that maximize investment metrics, not just revenue"]
}

IMPORTANT: Rank by buyImpactScore first, then payback period. Prioritize amenities that turn a No-Buy into a Buy.

Return ONLY valid JSON, no additional text.
`;

export const REGULATION_SCANNER_PROMPT = (city: string): string => `
Search the web for '${city} short-term rental regulations' and summarize the most recent official rules.

TASKS:
1. Find official city/county STR regulations
2. Summarize key requirements (permits, licenses, taxes)
3. Note any restrictions (days per year, zones, owner-occupancy)
4. Provide a risk score (Low/Med/High)
5. Cite ONLY official URLs (city websites, municipal codes)
6. If uncertainty exists, state it clearly and recommend contacting the city clerk or zoning office

OUTPUT JSON SCHEMA:
{
  "city": "string",
  "riskScore": "Low" | "Medium" | "High",
  "summary": "string",
  "keyRules": ["string"],
  "permits": ["string"],
  "restrictions": ["string"],
  "uncertainties": ["string"],
  "sources": [{"title": "string", "url": "string"}],
  "recommendation": "string"
}

Return ONLY valid JSON, no additional text.
`;

export const PACKET_SUMMARY_PROMPT = (analysis: {
  address: string;
  strategy: string;
  kpis: { noi: number; dscr: number; capRate: number; cashOnCash: number };
  ownerSurplus: number;
  assumptions: Record<string, any>;
  amenities: { name: string; cost: number; paybackMonths: number }[];
  propertyDetails?: any;
  marketData?: any;
  compsData?: any[];
  risks: string[];
  sources: { title: string; url: string }[];
}): string => `
Generate a comprehensive, professional MLS-style lender packet for this short-term rental investment property.

PROPERTY DATA:
${JSON.stringify(analysis, null, 2)}

REQUIREMENTS:

1. EXECUTIVE SUMMARY
   - Recommendation: "Strong Buy" (all metrics exceed targets by 25%+), "Buy" (all metrics meet targets), or "Pass"
   - 3-5 investment highlights (key selling points)
   - Deal snapshot with all key numbers

2. PROPERTY OVERVIEW
   - Use actual property details from analysis.propertyDetails if available
   - Property type: ${analysis.propertyDetails?.propertyType || analysis.strategy}
   - Beds: ${analysis.propertyDetails?.bedrooms || 3}, Baths: ${analysis.propertyDetails?.bathrooms || 2}, Sqft: ${analysis.propertyDetails?.squareFootage || 'estimate from typical property'}
   - Year built: ${analysis.propertyDetails?.yearBuilt || 'estimate if not provided'}
   - Lot size: ${analysis.propertyDetails?.lotSize || 'estimate, e.g., 0.25 acres'}
   - Zoning: ${analysis.propertyDetails?.zoning || 'infer from location'}
   - Listing type: ${analysis.propertyDetails?.listingType || 'Standard'}
   - Days on market: ${analysis.propertyDetails?.daysOnMarket || 'N/A'}
   - Condition: Infer from property features and age
   - Notable features: ${analysis.propertyDetails?.features ? Object.entries(analysis.propertyDetails.features).filter(([,v]) => v != null).map(([k]) => k).join(', ') : 'based on amenities'}
   - Tax assessments: Include historical assessment values if available

3. FINANCIAL ANALYSIS
   a) Purchase Analysis:
      - List price: ${analysis.assumptions.price || 0}
      - Acquisition price: ${analysis.assumptions.price || 0}
      - Down payment %: ${analysis.assumptions.downPaymentPercent || 25}%
      - Down payment amount: calculate
      - Loan amount: calculate
      - Estimated closing costs: 3% of purchase price
      - Total cash required: down payment + closing costs + initial furnishings
   
   b) Operating Performance:
      - Projected gross revenue: calculate from ADR × occupancy × 365
      - Operating expenses: include property tax ${analysis.assumptions.propertyTax}, HOA ${analysis.assumptions.hoaFee}, management ${analysis.assumptions.managementMode}
      - NOI: ${analysis.kpis.noi}
      - Annual debt service: calculate from loan
      - Cash flow after debt: NOI - debt service
   
   c) Investment Metrics:
      - Cap Rate: ${analysis.kpis.capRate}%
      - Cash-on-Cash: ${analysis.kpis.cashOnCash}%
      - DSCR: ${analysis.kpis.dscr}
      - Gross Yield: (Gross Revenue / Purchase Price) × 100
      - Break-even Occupancy: (Operating Expenses + Debt Service) / (ADR × 365)
   
   d) 5-Year Projections:
      - Assume 3% annual revenue growth, 2% expense growth, 3% appreciation
      - For each year: revenue, expenses, cash flow, equity, cumulative return

4. MARKET ANALYSIS
   - Use actual market comps from analysis.compsData if available (${analysis.compsData?.length || 0} comparables provided)
   - Market data: Median price ${analysis.marketData?.medianPrice || 'estimate'}, Median rent ${analysis.marketData?.medianRent || 'estimate'}, Avg DOM ${analysis.marketData?.averageDaysOnMarket || 'estimate'}
   - Market trends: Estimate avg ADR, occupancy, seasonality, growth trend for ${analysis.marketData?.zipCode || 'the area'}
   - Competitive position: How this property compares (above/below/at market)
   - Demand indicators: Tourism, events, accessibility for the location

5. REVENUE STRATEGY
   - Strategy: ${analysis.strategy}
   - Pricing strategy: Peak season ADR (+20% from ${analysis.assumptions.adr}), off-season ADR (-15% from ${analysis.assumptions.adr}), avg ADR
   - Occupancy projections: Year 1 ${analysis.assumptions.occupancy}%, Year 2, Year 3 (ramp-up)
   - Amenity impact: ${JSON.stringify(analysis.amenities)}
   - Management plan: ${analysis.assumptions.managementMode}

6. RISK ASSESSMENT
   - Include provided risks: ${analysis.risks.join('; ')}
   - For each risk category, provide 2-3 specific risks with severity and mitigation:
   - Regulatory Risks: STR regulations, permits, zoning
   - Market Risks: Competition, seasonality, economic downturn
   - Property Risks: Maintenance, vacancy, guest damage
   - Financial Risks: Interest rate changes, DSCR stress, cash flow gaps

OUTPUT JSON SCHEMA:
{
  "executiveSummary": {
    "recommendation": "Strong Buy" | "Buy" | "Pass",
    "highlights": ["string"],
    "dealSnapshot": {
      "listPrice": number,
      "acquisitionPrice": number,
      "downPayment": number,
      "totalCashRequired": number,
      "projectedCoC": number,
      "projectedCapRate": number,
      "projectedDSCR": number
    }
  },
  "propertyOverview": {
    "address": "string",
    "propertyType": "string",
    "beds": number,
    "baths": number,
    "sqft": number,
    "yearBuilt": number,
    "lotSize": "string",
    "zoning": "string",
    "condition": "string",
    "notableFeatures": ["string"]
  },
  "financialAnalysis": {
    "purchaseAnalysis": {},
    "operatingPerformance": {},
    "investmentMetrics": {},
    "fiveYearProjections": [{"year": 1, "revenue": number, "expenses": number, "cashFlow": number, "equity": number, "cumulativeReturn": number}]
  },
  "marketAnalysis": {
    "comparables": [{"address": "string", "beds": number, "baths": number, "adr": number, "occupancy": number, "distance": "string"}],
    "marketTrends": {"avgADR": number, "avgOccupancy": number, "seasonality": "string", "growthTrend": "string"},
    "competitivePosition": "string",
    "demandIndicators": {"tourism": "string", "events": "string", "accessibility": "string"}
  },
  "revenueStrategy": {
    "strategy": "string",
    "pricingStrategy": {"peakSeasonADR": number, "offSeasonADR": number, "avgADR": number},
    "occupancyProjections": {"year1": number, "year2": number, "year3": number},
    "amenityImpact": [{"name": "string", "adrIncrease": number, "cost": number, "paybackMonths": number}],
    "managementPlan": "string"
  },
  "riskAssessment": {
    "regulatoryRisks": [{"risk": "string", "severity": "Low"|"Medium"|"High", "mitigation": "string"}],
    "marketRisks": [{"risk": "string", "severity": "Low"|"Medium"|"High", "mitigation": "string"}],
    "propertyRisks": [{"risk": "string", "severity": "Low"|"Medium"|"High", "mitigation": "string"}],
    "financialRisks": [{"risk": "string", "severity": "Low"|"Medium"|"High", "mitigation": "string"}]
  },
  "sources": [{"title": "string", "url": "string"}],
  "generatedDate": "YYYY-MM-DD"
}

TONE: Professional, objective, data-driven. Use industry-standard real estate and investment terminology.

Return ONLY valid JSON, no additional text.
`;

export const PATH_TO_YES_PROMPT = (current: {
  kpis: { capRate: number; cashOnCash: number; dscr: number; ownerSurplus: number };
  targets: { minCapRate: number; minCoC: number; minDSCR: number };
  assumptions: Record<string, any>;
  cashInvested?: number;
}): string => `
Analyze this property investment and assign a 5-tier status based on how many metrics meet targets.

CURRENT METRICS:
- Cap Rate: ${current.kpis.capRate.toFixed(2)}%
- Cash-on-Cash: ${current.kpis.cashOnCash.toFixed(2)}%
- DSCR: ${current.kpis.dscr.toFixed(2)}
- Owner Surplus: $${current.kpis.ownerSurplus.toLocaleString()}
- Cash Invested: $${(current.cashInvested || 0).toLocaleString()}

TARGET THRESHOLDS:
- Min Cap Rate: ${current.targets.minCapRate}%
- Min Cash-on-Cash: ${current.targets.minCoC}%
- Min DSCR: ${current.targets.minDSCR}

EVALUATION PROCESS:

STEP 1: Determine which metrics to evaluate
${(current.cashInvested || 0) < 1000
    ? '- Cash Invested < $1,000 → EXCLUDE Cash-on-Cash (mark as N/A)\n- Evaluate: Cap Rate, DSCR (2 metrics total)'
    : '- Cash Invested >= $1,000 → INCLUDE all metrics\n- Evaluate: Cap Rate, Cash-on-Cash, DSCR (3 metrics total)'}

STEP 2: Check each metric against target (use >= comparison)
${(current.cashInvested || 0) < 1000
    ? `- Cap Rate: ${current.kpis.capRate.toFixed(2)}% >= ${current.targets.minCapRate}%? ${current.kpis.capRate >= current.targets.minCapRate ? 'YES ✓' : 'NO ✗'}
- Cash-on-Cash: EXCLUDED (N/A)
- DSCR: ${current.kpis.dscr.toFixed(2)} >= ${current.targets.minDSCR}? ${current.kpis.dscr >= current.targets.minDSCR ? 'YES ✓' : 'NO ✗'}`
    : `- Cap Rate: ${current.kpis.capRate.toFixed(2)}% >= ${current.targets.minCapRate}%? ${current.kpis.capRate >= current.targets.minCapRate ? 'YES ✓' : 'NO ✗'}
- Cash-on-Cash: ${current.kpis.cashOnCash.toFixed(2)}% >= ${current.targets.minCoC}%? ${current.kpis.cashOnCash >= current.targets.minCoC ? 'YES ✓' : 'NO ✗'}
- DSCR: ${current.kpis.dscr.toFixed(2)} >= ${current.targets.minDSCR}? ${current.kpis.dscr >= current.targets.minDSCR ? 'YES ✓' : 'NO ✗'}`}

STEP 3: Count how many metrics meet targets
Count the number of YES ✓ marks above.

STEP 4: Determine status based on count
${(current.cashInvested || 0) < 1000
    ? `- 2 of 2 meet targets AND all exceed by 25%+ → "Strong Buy"
- 2 of 2 meet targets → "Buy"
- 1 of 2 meets targets → "Review"
- 0 of 2 meet targets → "No-Buy"`
    : `- 3 of 3 meet targets AND all exceed by 25%+ → "Strong Buy"
- 3 of 3 meet targets → "Buy"
- 2 of 3 meet targets → "Conditional Buy"
- 1 of 3 meets targets → "Review"
- 0 of 3 meet targets → "No-Buy"`}

STEP 5: Generate statusReason (1-2 sentences explaining the determination)

STEP 6: List metricsEvaluated and metricsExcluded

STEP 7: Calculate targetGap for metrics that fall short

STEP 8: Provide recommendations (empty array for Buy/Strong Buy)

OUTPUT JSON:
{
  "currentStatus": "Strong Buy" | "Buy" | "Conditional Buy" | "Review" | "No-Buy",
  "statusReason": "string",
  "metricsEvaluated": ["Cap Rate", "DSCR"] or ["Cap Rate", "Cash-on-Cash", "DSCR"],
  "metricsExcluded": ["Cash-on-Cash (N/A - minimal cash invested)"] or [],
  "targetGap": [{"metric": "string", "current": number, "target": number, "gap": number}],
  "recommendations": [{"priority": number, "action": "string", "quantifiedImpact": "string", "implementationNotes": "string"}],
  "minimalChanges": ["string"]
}

CRITICAL: Follow the evaluation process EXACTLY as shown above. Do not make assumptions. Return ONLY valid JSON.
`;

export const MARKET_DISCOVERY_PROMPT = (input: MarketDiscoveryInput): string => `
User intent: discover markets for <$${input.budget.toLocaleString()} budget with target CoC >= ${input.targetCoC}%.

TASKS:
1. Return a short-list of 5 markets
2. Provide a 2-sentence rationale per market
3. List 3 risks per market
4. Include links to data sources (official/statistical where possible)

OUTPUT JSON SCHEMA:
{
  "markets": [
    {
      "rank": number,
      "city": "string",
      "state": "string",
      "rationale": "string",
      "estimatedCoC": number,
      "risks": ["string", "string", "string"],
      "sources": [{"title": "string", "url": "string"}]
    }
  ]
}

Return ONLY valid JSON, no additional text.
`;

export const COMPS_STRENGTH_PROMPT = (comps: { address: string; beds: number; baths: number; sqft: number; adr: number; occupancy: number; distance: number; daysOnMarket?: number }[], subject: { beds: number; baths: number; sqft: number; amenities: string[] }): string => `
Rate the strength of the current comp set for the subject property.

SUBJECT PROPERTY:
- Beds: ${subject.beds}
- Baths: ${subject.baths}
- Sqft: ${subject.sqft}
- Amenities: ${subject.amenities.join(', ')}

COMPARABLES:
${JSON.stringify(comps, null, 2)}

SCORING FACTORS:
1. Similarity (beds, baths, sqft within 20%)
2. Sample size (more comps = better)
3. Spread (tight range = better)
4. Recency (recent data = better)
5. Distance (closer = better)

TASKS:
1. Score each factor 0-20
2. Calculate total score 0-100
3. Explain what's driving the score
4. Provide 3 actionable recommendations to strengthen comps

OUTPUT JSON SCHEMA:
{
  "score": number,
  "drivers": [
    {"factor": "string", "score": number, "notes": "string"}
  ],
  "recommendations": ["string", "string", "string"]
}

Return ONLY valid JSON, no additional text.
`;
