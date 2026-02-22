import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BarChart3, TrendingUp, DollarSign, Home,
  ShieldCheck, AlertTriangle, Info, ChevronDown, ChevronUp,
  MapPin, BedDouble, Bath, Ruler, Calendar
} from 'lucide-react';
import { MarketInsight, PropertyConfig, ScenarioData } from '../../types';
import { DEFAULT_CONFIG } from '../../constants';
import { calculateMonthlyProjections, aggregateToYearly } from '../../utils/financialLogic';
import { formatCurrency } from '../../utils/formatCurrency';

// ---------------------------------------------------------------------------
// Hardcoded sample data
// ---------------------------------------------------------------------------

const SAMPLE_ADDRESS = '1842 Beachside Lane, Destin, FL 32541';

const SAMPLE_CONFIG: PropertyConfig = {
  ...DEFAULT_CONFIG,
  price: 625000,
  downPaymentPercent: 20,
  mortgageRate: 6.75,
  adr: 285,
  occupancyPercent: 68,
  expectedMonthlyRevenue: 5814,
  mtrMonthlyRent: 4800,
  ltrMonthlyRent: 3200,
  propertyTaxMonthly: 520,
  mgmtFeePercent: 20,
  hostFeePercent: 15.5,
  cleaningFeeIncome: 1400,
  cleaningExpense: 1200,
  fixedOpexMonthly: 300,
  hoaMonthly: 125,
  helocFundingPercent: 0,
  helocPaydownPercent: 0,
  annualAppreciationRate: 4,
  annualRentGrowthRate: 3,
  annualExpenseInflationRate: 2,
};

const SAMPLE_INSIGHT: MarketInsight = {
  summary:
    'This 4-bed/3-bath coastal property in Destin, FL presents a strong short-term rental opportunity. Destin is a top-10 STR market in the US with consistent year-round demand driven by beach tourism and the Emerald Coast\'s growing popularity. At $625K, the property is priced in line with recent comps, and the projected ADR of $285 aligns with active listings of comparable size within 0.5 miles.',
  snapshot:
    'Destin, FL STR market: Median ADR $265–$310 for 4BR beachside, occupancy 65–72% annually (peaks June–August at 88%). Active listings: 142 within 3-mile radius. Market health: Strong — low inventory, high seasonal demand. Typical STR gross revenue for 4BR: $58K–$78K/year.',
  regulations:
    'Okaloosa County requires a Tourist Development Tax (TDT) registration and collection (6% county + 6% state = 12% total). Short-term rentals are permitted in this zoning district (R-2). No minimum stay requirements at county level; HOA may impose restrictions — verify CC&Rs. Annual business license required ($75/yr).',
  marketPerformance:
    'Destin market has appreciated 4.1% annually over the past 5 years. Rental rates have grown 3.2% YoY. Cap rates for STR properties range from 5.5–8.2% depending on location and management. This property\'s projected 6.8% cap rate is above market median, indicating favorable risk-adjusted return.',
  debtAssumptions:
    '30-year fixed mortgage at 6.75%. No HELOC. Down payment: 20% ($125,000). Estimated closing costs: $7,500. Total upfront capital required: $132,500.',
  proFormaScenarios: [
    {
      label: 'Conservative',
      adr: 255,
      occ: 60,
      gross: 55836,
      platformFee: 8660,
      mgmtFee: 11167,
      opex: 13200,
      noi: 22809,
      debtService: 32520,
      cashFlow: -9711,
    } as ScenarioData,
    {
      label: 'Base',
      adr: 285,
      occ: 68,
      gross: 69768,
      platformFee: 10815,
      mgmtFee: 13954,
      opex: 13200,
      noi: 31799,
      debtService: 32520,
      cashFlow: -721,
    } as ScenarioData,
    {
      label: 'Aggressive',
      adr: 315,
      occ: 76,
      gross: 86940,
      platformFee: 13477,
      mgmtFee: 17388,
      opex: 13200,
      noi: 42875,
      debtService: 32520,
      cashFlow: 10355,
    } as ScenarioData,
  ],
  breakEvenAnalysis:
    'Break-even occupancy at base ADR ($285): 63.2%. Break-even ADR at base occupancy (68%): $267. The property requires modest performance above minimum thresholds to cover debt service, making it a moderate-risk acquisition.',
  pathsToYes:
    'Key levers: (1) Add hot tub (+$45 ADR, +6% occ = +$12K/yr gross); (2) Direct booking site to reduce platform fees by 8%; (3) Dynamic pricing tool to optimize ADR during peak season. With hot tub, Base scenario cash flow turns positive at +$11.6K/yr.',
  risksDiligence:
    'Key risks: (1) HOA STR restrictions — verify CC&Rs before closing; (2) Hurricane season (June–Nov) may require cancellations and increased insurance; (3) Destin market is seasonal — occupancy drops to 40–50% in winter months; (4) Tourism tax compliance required from Day 1.',
  recommendation:
    'CONDITIONAL BUY — Strong market fundamentals and competitive pricing, but thin margins in the Base scenario require active management or value-add (hot tub, direct bookings) to achieve positive cash flow. Recommended for investors comfortable with break-even in Year 1 and upside in Years 2–5 through appreciation and rent growth.',
  nextSteps:
    '1. Verify HOA CC&Rs for STR restrictions\n2. Obtain insurance quote (wind/flood for coastal FL)\n3. Get property inspection with focus on HVAC and roof\n4. Register for Okaloosa County TDT\n5. Price hot tub installation ($8,500–$12,000)',
  comps: [
    { address: '1701 Scenic Hwy 98 #204', price: '$610,000', distance: '0.3 mi', annualRevenue: '$64,200', adr: '$272', occ: '64%', grossYield: '10.5%' },
    { address: '2205 Beachside Dr', price: '$649,000', distance: '0.6 mi', annualRevenue: '$71,800', adr: '$298', occ: '67%', grossYield: '11.1%' },
    { address: '1530 Gulf Shore Dr', price: '$595,000', distance: '0.9 mi', annualRevenue: '$58,400', adr: '$261', occ: '62%', grossYield: '9.8%' },
  ],
  suggestedListingPrice: 625000,
  suggestedMonthlyRevenue: 5814,
  suggestedOccupancy: 68,
  suggestedPropertyTax: 520,
  suggestedCleaningFee: 1400,
  suggestedFurnishingsCost: 25000,
  suggestedHOA: 125,
  suggestedMTRRent: 4800,
  suggestedLTRRent: 3200,
  suggestedADR: 285,
  marketRiskLevel: 'Medium',
  verdict: 'Conditional Buy',
  sources: [
    { title: 'RentCast AVM — 1842 Beachside Lane', uri: '#' },
    { title: 'Okaloosa County STR Regulations', uri: '#' },
    { title: 'Destin Market Report Q1 2026', uri: '#' },
  ],
};

// ---------------------------------------------------------------------------
// Computed financials
// ---------------------------------------------------------------------------

function computeKPIs(config: PropertyConfig) {
  const downPayment = config.price * (config.downPaymentPercent / 100);
  const loanAmount = config.price - downPayment + (config.price * (config.helocFundingPercent / 100));
  const monthlyRate = config.mortgageRate / 100 / 12;
  const n = 360;
  const monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);

  const grossMonthly = config.expectedMonthlyRevenue + config.cleaningFeeIncome;
  const platformFee = grossMonthly * (config.hostFeePercent / 100);
  const mgmtFee = grossMonthly * (config.mgmtFeePercent / 100);
  const totalOpex = config.propertyTaxMonthly + config.fixedOpexMonthly + config.hoaMonthly +
    (grossMonthly * (config.maintenancePercent / 100)) + config.cleaningExpense + platformFee + mgmtFee;
  const monthlyNoi = grossMonthly - totalOpex;
  const annualNoi = monthlyNoi * 12;
  const capRate = (annualNoi / config.price) * 100;
  const totalUpfront = downPayment + config.loanCosts + config.upgradeCost;
  const annualCashFlow = (monthlyNoi - monthlyMortgage) * 12;
  const cashOnCash = (annualCashFlow / totalUpfront) * 100;
  const dscr = monthlyNoi / monthlyMortgage;

  return { downPayment, monthlyMortgage, annualNoi, capRate, cashOnCash, dscr, totalUpfront, annualCashFlow };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SampleAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<string | null>('summary');

  const kpis = computeKPIs(SAMPLE_CONFIG);
  const monthly = calculateMonthlyProjections(SAMPLE_CONFIG, 20, 'STR');
  const yearly = aggregateToYearly(monthly);
  const year5 = yearly[4];
  const year10 = yearly[9];

  const toggleSection = (id: string) => setExpandedSection(expandedSection === id ? null : id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* Top banner */}
      <div className="bg-amber-950 border-b border-amber-800 px-6 py-3">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-300 text-sm">
            <Info className="w-4 h-4 shrink-0" />
            <span>This is a sample analysis using demo data. Figures are illustrative only.</span>
          </div>
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            Analyze Your Own Property <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="border-b border-slate-800 bg-slate-950/90 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span className="font-bold tracking-tight">Analyze My Property</span>
          </button>
          <button
            onClick={() => navigate('/app')}
            className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Get Started Free
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Property header */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <MapPin className="w-4 h-4" /> Sample Property
              </div>
              <h1 className="text-xl font-bold text-slate-100">{SAMPLE_ADDRESS}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-400">
                <span className="flex items-center gap-1"><BedDouble className="w-4 h-4" /> 4 beds</span>
                <span className="flex items-center gap-1"><Bath className="w-4 h-4" /> 3 baths</span>
                <span className="flex items-center gap-1"><Ruler className="w-4 h-4" /> 2,240 sqft</span>
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Built 2018</span>
                <span className="flex items-center gap-1"><Home className="w-4 h-4" /> Single Family</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{formatCurrency(SAMPLE_CONFIG.price)}</div>
              <div className="text-sm text-slate-400">List Price</div>
              <div className={`inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
                SAMPLE_INSIGHT.marketRiskLevel === 'Low' ? 'bg-green-950 text-green-400' :
                SAMPLE_INSIGHT.marketRiskLevel === 'Medium' ? 'bg-yellow-950 text-yellow-400' :
                'bg-red-950 text-red-400'
              }`}>
                {SAMPLE_INSIGHT.marketRiskLevel === 'Low' ? <ShieldCheck className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {SAMPLE_INSIGHT.marketRiskLevel} Risk · {SAMPLE_INSIGHT.verdict}
              </div>
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPICard label="Cap Rate" value={`${kpis.capRate.toFixed(2)}%`} sub="Annual NOI / Price" color="indigo" />
          <KPICard label="Cash-on-Cash" value={`${kpis.cashOnCash.toFixed(2)}%`} sub="Year 1 return on equity" color={kpis.cashOnCash >= 0 ? 'green' : 'red'} />
          <KPICard label="Annual NOI" value={formatCurrency(kpis.annualNoi)} sub="Net operating income" color="indigo" />
          <KPICard label="DSCR" value={kpis.dscr.toFixed(2)} sub="Debt service coverage" color={kpis.dscr >= 1 ? 'green' : 'yellow'} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPICard label="Down Payment" value={formatCurrency(kpis.downPayment)} sub={`${SAMPLE_CONFIG.downPaymentPercent}% of purchase`} color="slate" />
          <KPICard label="Monthly Revenue" value={formatCurrency(SAMPLE_CONFIG.expectedMonthlyRevenue)} sub={`${SAMPLE_CONFIG.occupancyPercent}% occ · $${SAMPLE_CONFIG.adr} ADR`} color="slate" />
          <KPICard label="Year 5 Property Value" value={year5 ? formatCurrency(year5.propertyValue) : '—'} sub="With appreciation" color="slate" />
          <KPICard label="Year 10 Cash Flow" value={year10 ? formatCurrency(year10.cashFlowAfterDebt) : '—'} sub="Annual, with rent growth" color="slate" />
        </div>

        {/* Collapsible Analysis Sections */}
        <AnalysisSection
          id="summary"
          title="AI Property Summary"
          icon={<BarChart3 className="w-4 h-4 text-indigo-400" />}
          expanded={expandedSection === 'summary'}
          onToggle={() => toggleSection('summary')}
        >
          <p className="text-slate-300 text-sm leading-relaxed">{SAMPLE_INSIGHT.summary}</p>
        </AnalysisSection>

        <AnalysisSection
          id="market"
          title="Market Snapshot"
          icon={<TrendingUp className="w-4 h-4 text-indigo-400" />}
          expanded={expandedSection === 'market'}
          onToggle={() => toggleSection('market')}
        >
          <p className="text-slate-300 text-sm leading-relaxed">{SAMPLE_INSIGHT.snapshot}</p>
        </AnalysisSection>

        <AnalysisSection
          id="proforma"
          title="Pro Forma Scenarios"
          icon={<DollarSign className="w-4 h-4 text-indigo-400" />}
          expanded={expandedSection === 'proforma'}
          onToggle={() => toggleSection('proforma')}
        >
          <div className="grid sm:grid-cols-3 gap-4">
            {SAMPLE_INSIGHT.proFormaScenarios.map((s) => (
              <div key={s.label} className={`rounded-lg p-4 border ${
                s.label === 'Base' ? 'border-indigo-700 bg-indigo-950/50' : 'border-slate-700 bg-slate-800/50'
              }`}>
                <div className="font-semibold text-slate-100 mb-3 flex items-center justify-between">
                  {s.label}
                  {s.label === 'Base' && <span className="text-xs text-indigo-400 font-normal">Recommended</span>}
                </div>
                <div className="space-y-2 text-sm">
                  <Row label="ADR" value={`$${s.adr}`} />
                  <Row label="Occupancy" value={`${s.occ}%`} />
                  <Row label="Gross Revenue" value={formatCurrency(s.gross)} />
                  <Row label="NOI" value={formatCurrency(s.noi)} />
                  <div className={`flex justify-between pt-2 border-t border-slate-700 font-semibold ${s.cashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <span>Annual Cash Flow</span>
                    <span>{formatCurrency(s.cashFlow)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AnalysisSection>

        <AnalysisSection
          id="regulations"
          title="Regulations & Compliance"
          icon={<ShieldCheck className="w-4 h-4 text-indigo-400" />}
          expanded={expandedSection === 'regulations'}
          onToggle={() => toggleSection('regulations')}
        >
          <p className="text-slate-300 text-sm leading-relaxed">{SAMPLE_INSIGHT.regulations}</p>
        </AnalysisSection>

        <AnalysisSection
          id="risks"
          title="Risks & Due Diligence"
          icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />}
          expanded={expandedSection === 'risks'}
          onToggle={() => toggleSection('risks')}
        >
          <p className="text-slate-300 text-sm leading-relaxed">{SAMPLE_INSIGHT.risksDiligence}</p>
        </AnalysisSection>

        <AnalysisSection
          id="comps"
          title="Comparable Properties"
          icon={<Home className="w-4 h-4 text-indigo-400" />}
          expanded={expandedSection === 'comps'}
          onToggle={() => toggleSection('comps')}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-left border-b border-slate-700">
                  <th className="pb-2 font-medium">Address</th>
                  <th className="pb-2 font-medium text-right">Price</th>
                  <th className="pb-2 font-medium text-right">Annual Rev.</th>
                  <th className="pb-2 font-medium text-right">ADR</th>
                  <th className="pb-2 font-medium text-right">Occ.</th>
                  <th className="pb-2 font-medium text-right">Gross Yield</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_INSIGHT.comps.map((c) => (
                  <tr key={c.address} className="border-b border-slate-800 text-slate-300">
                    <td className="py-2.5 pr-4">{c.address} <span className="text-slate-500 text-xs">({c.distance})</span></td>
                    <td className="py-2.5 text-right">{c.price}</td>
                    <td className="py-2.5 text-right">{c.annualRevenue}</td>
                    <td className="py-2.5 text-right">{c.adr}</td>
                    <td className="py-2.5 text-right">{c.occ}</td>
                    <td className="py-2.5 text-right">{c.grossYield}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnalysisSection>

        {/* Recommendation */}
        <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-6">
          <h3 className="font-semibold text-indigo-200 mb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> AI Recommendation
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed">{SAMPLE_INSIGHT.recommendation}</p>
        </div>

        {/* CTA */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Ready to analyze your own property?</h2>
          <p className="text-slate-400 text-sm mb-6">
            Enter any US address and get a full AI-powered underwriting report — with live RentCast data, 20-year projections, and a personalized recommendation.
          </p>
          <button
            onClick={() => navigate('/app')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl text-sm font-semibold transition-colors"
          >
            Analyze Your Own Property Free
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="mt-3 text-xs text-slate-500">No credit card required · 7-day full trial</p>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-slate-600 text-center pb-4">
          Sample data is for illustrative purposes only. Not financial advice. Always conduct independent due diligence before making investment decisions.
        </p>

      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface KPICardProps {
  label: string;
  value: string;
  sub: string;
  color: 'indigo' | 'green' | 'red' | 'yellow' | 'slate';
}

const KPICard: React.FC<KPICardProps> = ({ label, value, sub, color }) => {
  const valueClass = {
    indigo: 'text-indigo-300',
    green: 'text-green-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    slate: 'text-slate-100',
  }[color];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${valueClass}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
};

interface AnalysisSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AnalysisSection: React.FC<AnalysisSectionProps> = ({ title, icon, expanded, onToggle, children }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-800/50 transition-colors"
    >
      <div className="flex items-center gap-2 font-medium text-slate-200">
        {icon}
        {title}
      </div>
      {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
    </button>
    {expanded && (
      <div className="px-6 pb-6 pt-1 border-t border-slate-800">
        {children}
      </div>
    )}
  </div>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between text-slate-300">
    <span className="text-slate-500">{label}</span>
    <span>{value}</span>
  </div>
);

export default SampleAnalysis;
