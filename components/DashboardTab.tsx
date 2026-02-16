import React from 'react';
import {
  Building2, Home, Layers, Ruler, Map, Save, Printer,
  Sparkles, ShieldAlert, Calculator, ShieldCheck, MapPin,
  ShieldPlus, ChevronDown, ExternalLink, FileText,
  TrendingUp, Clock, Tag, Activity, Droplets, Flame,
  Car, Eye, Phone, Mail, BarChart3, Users, Zap
} from 'lucide-react';
import ErrorBoundary from './ui/ErrorBoundary';
import InfoTooltip from './InfoTooltip';
import BulletContent from './BulletContent';
import { getAmenityIcon } from './AmenityIcon';
import SensitivityTable from './SensitivityTable';
import AmenityROIPanel from './AmenityROIPanel';
import PathToYesPanel from './PathToYesPanel';
import LenderPacketExport from './LenderPacketExport';
import PropertyChat from './PropertyChat';
import { formatCurrency } from '../utils/formatCurrency';
import { MarketInsight, PropertyConfig, Amenity, RentalStrategy } from '../types';
import { SensitivityMatrix, AmenityROIResult, PathToYes, LenderPacket } from '../prompts/underwriting';
import { RentCastProperty, MarketStats, MarketTrendEntry, RentalListing, AVMComparable } from '../services/rentcastService';

interface DashboardTabProps {
  insight: MarketInsight;
  displayedAddress: string;
  strategy: RentalStrategy;
  setStrategy?: (s: RentalStrategy) => void;
  userTier: 'free' | 'pro';
  baseConfig: PropertyConfig;
  finalConfig: PropertyConfig;
  // Metrics
  capRate: number;
  cashOnCash: number;
  cashPortion: number;
  annualNoi: number;
  annualGross: number;
  annualProfit: number;
  annualSurplus: number;
  grossYield: number;
  downPayment: number;
  helocPortion: number;
  totalUpfrontCapital: number;
  currentRateValue: number;
  year1Data: any;
  totalDscr: number;
  isUsingWebData: boolean;
  // Amenities
  amenities: Amenity[];
  selectedAmenityIds: string[];
  furnishingBreakdown: any;
  showFurnishingDropdown: boolean;
  setShowFurnishingDropdown: (v: boolean) => void;
  setFurnishingBreakdown: (fn: any) => void;
  toggleAmenity: (id: string) => void;
  // Query state
  analysisQuery: any;
  // Handlers
  handleInputChange: (field: keyof PropertyConfig, value: string) => void;
  handleManagementSliderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  getManagementLabel: (pct: number) => string;
  getManagementIndex: (pct: number) => number;
  onExportReport: () => void;
  onSaveAssessment: () => void;
  // Advanced Analysis
  sensitivityData: SensitivityMatrix | null;
  amenityROIData: AmenityROIResult | null;
  pathToYesData: PathToYes | null;
  lenderPacket: LenderPacket | null;
  isLoadingSensitivity: boolean;
  isLoadingAmenityROI: boolean;
  isLoadingPathToYes: boolean;
  isLoadingLenderPacket: boolean;
  handleRunSensitivity: () => void;
  handleRunAmenityROI: () => void;
  handleRunPathToYes: () => void;
  handleGenerateLenderPacket: () => void;
  investmentTargets: { minCapRate: number; minCoC: number; minDSCR: number };
  // Enhanced RentCast data
  propertyData: RentCastProperty | null;
  marketStats: MarketStats | null;
  marketTrends: { saleTrends: MarketTrendEntry[]; rentalTrends: MarketTrendEntry[] };
  bedroomStats: { sale?: any; rental?: any };
  rentalListings: RentalListing[] | null;
  rentEstimateData: any;
}

const DashboardTab: React.FC<DashboardTabProps> = ({
  insight, displayedAddress, strategy, setStrategy, userTier, baseConfig, finalConfig,
  capRate, cashOnCash, cashPortion, annualNoi, annualGross,
  annualProfit, annualSurplus, grossYield, downPayment, helocPortion,
  totalUpfrontCapital, currentRateValue, year1Data, totalDscr,
  isUsingWebData, amenities, selectedAmenityIds, furnishingBreakdown,
  showFurnishingDropdown, setShowFurnishingDropdown, setFurnishingBreakdown,
  toggleAmenity, analysisQuery,
  handleInputChange, handleManagementSliderChange, getManagementLabel,
  getManagementIndex, onExportReport, onSaveAssessment,
  sensitivityData, amenityROIData, pathToYesData, lenderPacket,
  isLoadingSensitivity, isLoadingAmenityROI, isLoadingPathToYes, isLoadingLenderPacket,
  handleRunSensitivity, handleRunAmenityROI, handleRunPathToYes, handleGenerateLenderPacket,
  investmentTargets,
  propertyData, marketStats, marketTrends, bedroomStats, rentalListings, rentEstimateData
}) => {
  // State for Pro-only feature access
  const [showProModal, setShowProModal] = React.useState(false);
  const [showingSampleData, setShowingSampleData] = React.useState(false);
  const sampleSensitivityData = {
    adrVariations: [-10, -5, 0, 5, 10],
    occVariations: [-10, -5, 0, 5, 10],
    rateVariations: [-100, -50, 0, 50, 100],
    matrix: [
      { adrDelta: -10, occDelta: -10, ownerSurplus: -2000, cashOnCash: 2.5, dscr: 0.85 },
      { adrDelta: -10, occDelta: -5, ownerSurplus: -1500, cashOnCash: 3.0, dscr: 0.90 },
      { adrDelta: -10, occDelta: 0, ownerSurplus: -1000, cashOnCash: 3.5, dscr: 0.95 },
      { adrDelta: -10, occDelta: 5, ownerSurplus: -500, cashOnCash: 4.0, dscr: 1.00 },
      { adrDelta: -10, occDelta: 10, ownerSurplus: 0, cashOnCash: 4.5, dscr: 1.05 },
      { adrDelta: -5, occDelta: -10, ownerSurplus: -1000, cashOnCash: 3.5, dscr: 0.90 },
      { adrDelta: -5, occDelta: -5, ownerSurplus: -600, cashOnCash: 4.0, dscr: 0.95 },
      { adrDelta: -5, occDelta: 0, ownerSurplus: 0, cashOnCash: 4.77, dscr: 1.09 },
      { adrDelta: -5, occDelta: 5, ownerSurplus: 1000, cashOnCash: 5.5, dscr: 1.15 },
      { adrDelta: -5, occDelta: 10, ownerSurplus: 1500, cashOnCash: 6.0, dscr: 1.20 },
      { adrDelta: 0, occDelta: -10, ownerSurplus: 1000, cashOnCash: 5.0, dscr: 1.00 },
      { adrDelta: 0, occDelta: -5, ownerSurplus: 2000, cashOnCash: 6.0, dscr: 1.09 },
      { adrDelta: 0, occDelta: 0, ownerSurplus: 2500, cashOnCash: 6.60, dscr: 1.20 },
      { adrDelta: 0, occDelta: 5, ownerSurplus: 3000, cashOnCash: 7.5, dscr: 1.30 },
      { adrDelta: 0, occDelta: 10, ownerSurplus: 3500, cashOnCash: 8.0, dscr: 1.40 },
      { adrDelta: 5, occDelta: -10, ownerSurplus: 2000, cashOnCash: 6.0, dscr: 1.10 },
      { adrDelta: 5, occDelta: -5, ownerSurplus: 3000, cashOnCash: 7.0, dscr: 1.20 },
      { adrDelta: 5, occDelta: 0, ownerSurplus: 3500, cashOnCash: 8.0, dscr: 1.30 },
      { adrDelta: 5, occDelta: 5, ownerSurplus: 4000, cashOnCash: 9.0, dscr: 1.40 },
      { adrDelta: 5, occDelta: 10, ownerSurplus: 4500, cashOnCash: 9.5, dscr: 1.50 },
      { adrDelta: 10, occDelta: -10, ownerSurplus: 4000, cashOnCash: 8.0, dscr: 1.25 },
      { adrDelta: 10, occDelta: -5, ownerSurplus: 4500, cashOnCash: 9.0, dscr: 1.35 },
      { adrDelta: 10, occDelta: 0, ownerSurplus: 5000, cashOnCash: 10.0, dscr: 1.45 },
      { adrDelta: 10, occDelta: 5, ownerSurplus: 5500, cashOnCash: 11.0, dscr: 1.55 },
      { adrDelta: 10, occDelta: 10, ownerSurplus: 6000, cashOnCash: 12.0, dscr: 1.65 }
    ],
    breakpoints: [
      { description: 'Owner Surplus breaks even', threshold: 'ADR -8% or Occupancy -7%' },
      { description: 'Cash-on-Cash breaks even', threshold: 'ADR -6% or Occupancy -5%' },
      { description: 'DSCR reaches 1.0 (debt coverage)', threshold: 'ADR +3% or Occupancy +4%' },
      { description: 'Rate sensitivity: positive CoC', threshold: 'Mortgage rate below 6.25%' },
      { description: 'Rate sensitivity: DSCR above 1.0', threshold: 'Mortgage rate below 5.75%' }
    ],
    guidance: 'Investment shows marginal viability with DSCR below 1.0 and low CoC. Requires ADR growth or occupancy improvement for strong returns. Rate increases above 50bps make investment unviable. Consider passing unless significant operational improvements are achievable.'
  };

  const sampleAmenityROIData = {
    rankedList: [
      {
        rank: 1,
        name: 'EV Charger',
        setupCost: 1500,
        deltaRevenue: 2834,
        paybackMonths: 6.4,
        confidenceRange: { low: 5.8, high: 7.1 }
      },
      {
        rank: 2,
        name: 'Game Room',
        setupCost: 4000,
        deltaRevenue: 8964,
        paybackMonths: 5.4,
        confidenceRange: { low: 4.9, high: 5.9 }
      },
      {
        rank: 3,
        name: 'Hot Tub',
        setupCost: 8500,
        deltaRevenue: 21318,
        paybackMonths: 4.8,
        confidenceRange: { low: 4.3, high: 5.3 },
        diminishingReturnsNote: 'Stacks at 70% efficiency with Cedar Sauna (spa overlap)'
      },
      {
        rank: 4,
        name: 'Cedar Sauna',
        setupCost: 6500,
        deltaRevenue: 11577,
        paybackMonths: 6.8,
        confidenceRange: { low: 6.1, high: 7.5 },
        diminishingReturnsNote: 'Stacks at 70% efficiency with Hot Tub (spa overlap)'
      },
      {
        rank: 5,
        name: 'Luxury Deck',
        setupCost: 12000,
        deltaRevenue: 16497,
        paybackMonths: 8.7,
        confidenceRange: { low: 7.8, high: 9.6 }
      }
    ],
    stackingRecommendations: [
      'Start with EV Charger + Game Room for maximum buy impact with minimal capital ($5,500 total)',
      'Add Hot Tub as third amenity for premium positioning (total $14,000 investment)',
      'Avoid combining Hot Tub + Cedar Sauna due to spa feature overlap (70% efficiency)',
      'EV Charger + Game Room + Hot Tub combination provides optimal investment metric improvement',
      'Luxury Deck should be considered only after core amenities due to high capital requirement vs. impact'
    ]
  };

  const samplePathToYesData = {
    currentStatus: 'Review' as const,
    statusReason: 'CoC of 4.77% meets the target threshold. While the cap rate exceeds the 6% minimum, both cash-on-cash return and DSCR fall significantly short of targets.',
    metricsEvaluated: ['CAP RATE', 'CASH-ON-CASH', 'DSCR'],
    metricsExcluded: [],
    targetGap: [
      { metric: 'CAP RATE', current: 6.60, target: 6.00, gap: 0 },
      { metric: 'CASH-ON-CASH', current: 4.77, target: 10.00, gap: 5.23 },
      { metric: 'DSCR', current: 1.09, target: 1.25, gap: 0.16 }
    ],
    recommendations: [
      {
        priority: 1,
        action: 'Increase rental income or reduce operating expenses',
        quantifiedImpact: 'Need to improve cash flow by ~$5,130 annually to reach 10% cash-on-cash target',
        implementationNotes: 'Consider rent increases, reduce vacancy periods, or negotiate lower property management fees'
      },
      {
        priority: 2,
        action: 'Refinance to lower debt service payments',
        quantifiedImpact: 'Reducing monthly debt service by ~$390 would achieve minimum 1.25 DSCR',
        implementationNotes: 'Explore refinancing options with lower interest rates or longer amortization periods'
      }
    ],
    minimalChanges: ['Improve monthly cash flow by $428 to achieve both DSCR and cash-on-cash targets']
  };

  const sampleLenderPacket = {
    generatedDate: '2024-12-19',
    executiveSummary: {
      recommendation: 'Strong Buy' as const,
      highlights: [
        'Exceptional 13.5% cash-on-cash return with strong 1.57 DSCR providing comfortable debt coverage',
        '9.5% cap rate significantly exceeds typical STR market returns of 6-8%',
        'Prime Pocono Mountains location with proven tourism demand and 42% occupancy at $370 ADR',
        'Hot tub amenity with 15-month payback period to drive premium pricing and occupancy',
        'Below-market purchase price of $329,900 vs. median $285,000 with strong upside potential'
      ],
      dealSnapshot: {
        listPrice: 349900,
        acquisitionPrice: 329900,
        downPayment: 65980,
        totalCashRequired: 84377,
        projectedCoC: 13.5,
        projectedCapRate: 9.54,
        projectedDSCR: 1.57
      }
    },
    propertyOverview: {
      address: '123 Sample Street, Pocono Mountains, PA 18466',
      propertyType: 'Single Family',
      beds: 4,
      baths: 2,
      sqft: 1740,
      yearBuilt: 1998,
      lotSize: '0.35 acres',
      zoning: 'R-1 Residential',
      condition: 'Good',
      notableFeatures: ['Hot Tub', 'Mountain Views', 'Game Room', 'Fire Pit']
    },
    financialAnalysis: {
      purchaseAnalysis: {
        listPrice: 349900,
        acquisitionPrice: 329900,
        downPaymentPercent: 20,
        downPaymentAmount: 65980,
        loanAmount: 263920,
        estimatedClosingCosts: 18397,
        totalCashRequired: 84377
      },
      operatingPerformance: {
        projectedGrossRevenue: 54000,
        operatingExpenses: 22000,
        noi: 32000,
        annualDebtService: 18000,
        cashFlowAfterDebt: 14000
      },
      investmentMetrics: {
        capRate: 9.54,
        cashOnCash: 13.5,
        dscr: 1.57,
        grossYield: 16.4,
        breakEvenOccupancy: 38
      },
      fiveYearProjections: [
        { year: 1, revenue: 54000, expenses: 22000, cashFlow: 14000, equity: 68000, cumulativeReturn: 14000 },
        { year: 2, revenue: 56700, expenses: 22660, cashFlow: 15040, equity: 71500, cumulativeReturn: 29040 },
        { year: 3, revenue: 59535, expenses: 23340, cashFlow: 16195, equity: 75200, cumulativeReturn: 45235 },
        { year: 4, revenue: 62512, expenses: 24040, cashFlow: 17472, equity: 79100, cumulativeReturn: 62707 },
        { year: 5, revenue: 65638, expenses: 24762, cashFlow: 18876, equity: 83200, cumulativeReturn: 81583 }
      ]
    },
    marketAnalysis: {
      comparables: [
        { address: '456 Mountain Dr', beds: 4, baths: 2, adr: 380, occupancy: 45, distance: '0.8 mi' },
        { address: '789 Forest Ln', beds: 3, baths: 2, adr: 350, occupancy: 40, distance: '1.2 mi' },
        { address: '321 Lake View Rd', beds: 4, baths: 3, adr: 420, occupancy: 48, distance: '1.5 mi' }
      ],
      marketTrends: {
        avgADR: 370,
        avgOccupancy: 42,
        seasonality: 'Strong winter (ski season) and summer, moderate spring/fall',
        growthTrend: 'Growing 5-8% annually'
      },
      competitivePosition: 'Property is competitively positioned with recent upgrades and amenities matching top-performing comps',
      demandIndicators: {
        tourism: 'High - Pocono Mountains ski resorts, hiking, lakes',
        events: 'Year-round festivals and outdoor events',
        accessibility: 'Within 90 minutes of NYC/Philadelphia'
      }
    },
    revenueStrategy: {
      strategy: 'Premium positioning with hot tub and game room amenities targeting families and groups',
      pricingStrategy: {
        peakSeasonADR: 450,
        offSeasonADR: 310,
        avgADR: 370
      },
      occupancyProjections: {
        year1: 42,
        year2: 45,
        year3: 48
      },
      amenityImpact: [
        { name: 'Hot Tub', adrIncrease: 50, cost: 8500, paybackMonths: 15 },
        { name: 'Game Room', adrIncrease: 30, cost: 4000, paybackMonths: 12 }
      ],
      managementPlan: 'Professional STR management with dynamic pricing and 24/7 guest support'
    },
    riskAssessment: {
      regulatoryRisks: [
        { risk: 'STR permit requirements', severity: 'Low' as const, mitigation: 'Zoning allows STRs with proper registration' }
      ],
      marketRisks: [
        { risk: 'Seasonality impacts revenue', severity: 'Medium' as const, mitigation: 'Winter ski season offsets summer tourism' }
      ],
      propertyRisks: [
        { risk: 'Hot tub maintenance costs', severity: 'Low' as const, mitigation: 'Built into operating expense projections' }
      ],
      financialRisks: [
        { risk: 'Interest rate increases', severity: 'Low' as const, mitigation: 'Fixed 30-year mortgage locks in rate' }
      ]
    },
    sources: [
      { title: 'AirDNA Market Data', url: 'https://www.airdna.co' },
      { title: 'Pocono Mountains Visitors Bureau', url: 'https://www.poconomountains.com' }
    ]
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
      {/* Hero Card */}
      <div className="rounded-3xl bg-[#0f172a] shadow-2xl relative overflow-hidden border border-white/5 min-h-[300px]">
        <div className="p-4 lg:p-6 relative z-10 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-[#f43f5e] font-black text-[9px] uppercase tracking-[0.3em]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] animate-pulse" />
                {strategy} AUDIT • REAL-TIME DATA
              </div>
              <div className="flex flex-col gap-2 items-end">
                {/* Export PDF and Save buttons */}
                <div className="flex gap-2">
                  <button onClick={onExportReport} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 border border-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-lg"><Printer size={12} /> EXPORT PDF</button>
                  <button onClick={onSaveAssessment} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f43f5e] hover:bg-[#e11d48] rounded-lg text-[9px] font-black uppercase tracking-widest shadow-xl"><Save size={12} /> SAVE</button>
                </div>
                {/* Strategy Toggle Below */}
                <div className="flex items-center gap-1 bg-[#1e293b]/50 rounded-lg p-1 border border-white/5">
                  {[
                    { id: 'STR', label: 'STR', color: 'bg-[#f43f5e]' },
                    { id: 'MTR', label: 'MTR', color: 'bg-blue-500' },
                    { id: 'LTR', label: 'LTR', color: 'bg-[#10b981]' }
                  ].map((s: any) => (
                    <button
                      key={s.id}
                      onClick={() => setStrategy?.(s.id as RentalStrategy)}
                      className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${strategy === s.id ? `${s.color} text-white shadow-lg` : 'text-slate-400 hover:text-white'}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mb-4">
              {/* Address Row */}
              <div className="flex items-center gap-3 group mb-1">
                <h2 className="text-2xl lg:text-3xl font-black tracking-tighter leading-none text-white">{displayedAddress}</h2>
                <a href={`https://www.zillow.com/homes/for_sale/${encodeURIComponent(displayedAddress)}_rb/`} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 hover:bg-[#f43f5e] hover:scale-110 rounded-full transition-all text-white"><Map size={14} /></a>
              </div>
              {/* Property info row with badges in center */}
              <div className="flex items-center gap-6">
                {/* Beds/Baths/SQFT on left */}
                <div className="flex gap-4 text-slate-600 text-[10px] font-black uppercase tracking-[0.25em]">
                  <span className="flex gap-2 items-center"><Home size={14} className="text-[#f43f5e]" /> {insight.beds} BEDS</span>
                  <span className="flex gap-2 items-center"><Layers size={14} className="text-[#3b82f6]" /> {insight.baths} BATHS</span>
                  <span className="flex gap-2 items-center"><Ruler size={14} className="text-[#10b981]" /> {insight.sqft.toLocaleString()} SQFT</span>
                </div>
                {/* Property Features Badges in center/middle */}
                {propertyData?.features && Object.values(propertyData.features).some(v => v != null) && (
                  <div className="flex flex-wrap gap-2">
                    {propertyData.features.fireplace && <span className="px-3 py-1.5 bg-orange-500/20 text-orange-200 rounded text-[9px] font-black flex items-center gap-1 whitespace-nowrap"><Flame size={12} /> Fireplace</span>}
                    {propertyData.features.coolingType && <span className="px-3 py-1.5 bg-cyan-500/20 text-cyan-200 rounded text-[9px] font-black whitespace-nowrap">AC: {propertyData.features.coolingType}</span>}
                    {propertyData.features.heatingType && <span className="px-3 py-1.5 bg-red-500/20 text-red-200 rounded text-[9px] font-black whitespace-nowrap">Heat: {propertyData.features.heatingType}</span>}
                    {propertyData.zoning && <span className="px-3 py-1.5 bg-amber-500/20 text-amber-200 rounded text-[9px] font-black whitespace-nowrap">Zone: {propertyData.zoning}</span>}
                    {propertyData.features.pool && <span className="px-3 py-1.5 bg-blue-500/20 text-blue-200 rounded text-[9px] font-black flex items-center gap-1 whitespace-nowrap"><Droplets size={12} /> Pool</span>}
                    {propertyData.features.garage && <span className="px-3 py-1.5 bg-slate-500/20 text-slate-200 rounded text-[9px] font-black flex items-center gap-1 whitespace-nowrap"><Car size={12} /> {propertyData.features.garageSpaces || '?'}-Car</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-4 bg-white/5 rounded-xl border border-white/5"><div className="flex items-center gap-1.5 mb-1.5"><p className="text-[9px] font-black text-[#f43f5e] uppercase tracking-widest">CAP RATE</p><InfoTooltip content="Capitalization Rate: Annual NOI divided by purchase price. Measures return independent of financing. Higher = better." /></div><p className="text-2xl font-black tracking-tighter text-white">{capRate.toFixed(2)}%</p></div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/5"><div className="flex items-center gap-1.5 mb-1.5"><p className="text-[9px] font-black text-[#10b981] uppercase tracking-widest">CASH-ON-CASH</p><InfoTooltip content="Cash-on-Cash Return: Annual cash flow divided by total cash invested (down payment + closing costs). Measures return on YOUR money." /></div><p className="text-2xl font-black tracking-tighter text-white">{cashPortion >= 1000 ? `${cashOnCash.toFixed(2)}%` : 'N/A'}</p>{cashPortion < 1000 && <p className="text-[8px] text-slate-500 mt-1">Minimal cash invested</p>}</div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/5"><div className="flex items-center gap-1.5 mb-1.5"><p className="text-[9px] font-black text-[#818cf8] uppercase tracking-widest">NET NOI</p><InfoTooltip content="Net Operating Income: Total rental revenue minus all operating expenses (utilities, management, maintenance, taxes, insurance). Does not include mortgage payments." /></div><p className="text-2xl font-black tracking-tighter text-white">${(annualNoi / 1000).toFixed(1)}k</p></div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/5"><div className="flex items-center gap-1.5 mb-1.5"><p className="text-[9px] font-black text-[#f59e0b] uppercase tracking-widest">GROSS YIELD</p><InfoTooltip content="Gross Rental Yield: Annual gross rental income divided by purchase price. Quick comparison metric before expenses." /></div><p className="text-2xl font-black tracking-tighter text-white">{grossYield.toFixed(2)}%</p></div>
            <div className="p-4 bg-gradient-to-br from-[#f43f5e]/20 to-rose-600/10 rounded-xl border border-[#f43f5e]/30">
              <p className="text-[9px] font-black text-[#f43f5e] uppercase tracking-widest mb-1.5">ACQUISITION PRICE</p>
              <div className="relative"><span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-500 font-black text-lg">$</span><input type="text" value={new Intl.NumberFormat().format(baseConfig.price)} onChange={(e) => handleInputChange('price', e.target.value)} className="bg-transparent border-none pl-5 py-0 text-2xl font-black text-white w-full outline-none" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <div className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col justify-between min-h-[100px]">
          <div><h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">CAPITAL STRATEGY</h4><div className="space-y-1"><div className="flex justify-between text-[10px] font-black"><span className="text-slate-600">DOWN PMT</span><span className="text-slate-900">{formatCurrency(cashPortion)}</span></div><div className="flex justify-between text-[10px] font-black"><span className="text-[#f43f5e]">HELOC</span><span className="text-[#f43f5e]">{formatCurrency(helocPortion)}</span></div></div></div>
          <input type="range" min="0" max="100" value={baseConfig.helocFundingPercent} onChange={(e) => handleInputChange('helocFundingPercent', e.target.value)} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#f43f5e] mt-2" />
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col justify-between min-h-[100px]">
          <div><div className="flex justify-between items-center mb-2"><h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest">MGMT MODE</h4><div className="p-0.5 bg-indigo-500/20 rounded-full text-[#818cf8]"><ShieldPlus size={10} /></div></div><div className="space-y-1"><div className="flex justify-between text-[10px] font-black"><span className="text-slate-600">SELECTION</span><span className="text-slate-900">{getManagementLabel(baseConfig.mgmtFeePercent).split(' ')[0]}</span></div><div className="flex justify-between text-[10px] font-black"><span className="text-slate-600">EST. COST</span><span className="text-[#818cf8]">{formatCurrency(year1Data?.mgmtFee || 0)}</span></div></div></div>
          <input type="range" min="0" max="2" step="1" value={getManagementIndex(baseConfig.mgmtFeePercent)} onChange={handleManagementSliderChange} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#818cf8] mt-2" />
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center min-h-[100px]"><div className="flex items-center gap-1 mb-1"><p className="text-[8px] font-black text-[#10b981] uppercase tracking-widest">PROFIT (Y1)</p></div><p className={`text-xl font-black tracking-tighter leading-none ${annualProfit < 0 ? 'text-[#f43f5e]' : 'text-[#10b981]'}`}>{formatCurrency(annualProfit)}</p></div>
        <div className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center min-h-[100px]"><div className="flex items-center gap-1 mb-1"><p className="text-[8px] font-black text-[#818cf8] uppercase tracking-widest">OWNER SURPLUS</p></div><p className={`text-xl font-black tracking-tighter leading-none ${annualSurplus < 0 ? 'text-[#f43f5e]' : 'text-slate-900'}`}>{formatCurrency(annualSurplus)}</p></div>
      </div>

      {/* Amenities */}
      <div className="p-4 bg-white rounded-xl border border-slate-100 mb-3">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest">REVENUE AMENITIES</h4>
          <div className="flex gap-3 text-[12px] font-black uppercase items-center">
            <div className="flex items-center gap-1">
              <span className="text-[#f43f5e]">ADR: {formatCurrency(currentRateValue)}</span>
              {insight?.dataSource?.adrSource && (
                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${insight.dataSource.adrSource === 'RentCast' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                  {insight.dataSource.adrSource === 'RentCast' ? '✓ RC' : 'AI'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[#10b981]">OCC: {year1Data?.occupancy.toFixed(0)}%</span>
              {insight?.dataSource?.occupancySource && (
                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${insight.dataSource.occupancySource === 'RentCast' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                  {insight.dataSource.occupancySource === 'RentCast' ? '✓ RC' : 'AI'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {amenities.filter(a => a.active).map(am => (
            <div key={am.id} className="relative">
              <button onClick={() => toggleAmenity(am.id)} className={`w-full p-2 rounded-lg border transition-all flex flex-col gap-1 text-left text-[7px] ${selectedAmenityIds.includes(am.id) ? 'bg-[#f43f5e] border-[#fb7185] text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'}`}>
                <div className="flex items-center gap-1">
                  <span className={selectedAmenityIds.includes(am.id) ? 'text-white' : 'text-rose-400'}>{getAmenityIcon(am.icon)}</span>
                  <span className="font-black uppercase truncate">{am.name}</span>
                  {am.id === 'furnishings' && (
                    <span
                      onClick={(e) => { e.stopPropagation(); setShowFurnishingDropdown(!showFurnishingDropdown); }}
                      className="ml-auto p-1 hover:bg-white/20 rounded transition-colors cursor-pointer"
                    >
                      <ChevronDown size={10} className={`transition-transform ${showFurnishingDropdown ? 'rotate-180' : ''}`} />
                    </span>
                  )}
                </div>
                <span className={`font-black ${selectedAmenityIds.includes(am.id) ? 'text-white' : 'text-yellow-300'}`}>${am.cost.toLocaleString()}</span>
              </button>
            </div>
          ))}
        </div>
        {showFurnishingDropdown && (
          <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div><label className="text-[9px] font-bold text-slate-600">Beds</label><input type="number" value={furnishingBreakdown.beds} onChange={(e) => setFurnishingBreakdown((prev: any) => ({ ...prev, beds: parseInt(e.target.value) || 0 }))} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm font-semibold text-slate-900" /></div>
              <div><label className="text-[9px] font-bold text-slate-600">$/Bed</label><input type="number" value={furnishingBreakdown.costPerBed} onChange={(e) => setFurnishingBreakdown((prev: any) => ({ ...prev, costPerBed: parseFloat(e.target.value) || 0 }))} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm font-semibold text-slate-900" /></div>
              <div><label className="text-[9px] font-bold text-slate-600">Baths</label><input type="number" value={furnishingBreakdown.baths} onChange={(e) => setFurnishingBreakdown((prev: any) => ({ ...prev, baths: parseInt(e.target.value) || 0 }))} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm font-semibold text-slate-900" /></div>
              <div><label className="text-[9px] font-bold text-slate-600">$/Bath</label><input type="number" value={furnishingBreakdown.costPerBath} onChange={(e) => setFurnishingBreakdown((prev: any) => ({ ...prev, costPerBath: parseFloat(e.target.value) || 0 }))} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm font-semibold text-slate-900" /></div>
              <div><label className="text-[9px] font-bold text-slate-600">Living</label><input type="number" value={furnishingBreakdown.livingRoom} onChange={(e) => setFurnishingBreakdown((prev: any) => ({ ...prev, livingRoom: parseFloat(e.target.value) || 0 }))} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm font-semibold text-slate-900" /></div>
              <div><label className="text-[9px] font-bold text-slate-600">Kitchen</label><input type="number" value={furnishingBreakdown.kitchenDining} onChange={(e) => setFurnishingBreakdown((prev: any) => ({ ...prev, kitchenDining: parseFloat(e.target.value) || 0 }))} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm font-semibold text-slate-900" /></div>
              <div><label className="text-[9px] font-bold text-slate-600">Tech/Decor</label><input type="number" value={furnishingBreakdown.techDecor} onChange={(e) => setFurnishingBreakdown((prev: any) => ({ ...prev, techDecor: parseFloat(e.target.value) || 0 }))} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm font-semibold text-slate-900" /></div>
            </div>
          </div>
        )}
      </div>

      {/* AI Analysis Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col h-full"><div className="flex items-center gap-3 mb-5"><div className="p-2.5 bg-red-50 rounded-xl text-[#f43f5e]"><Building2 size={16} /></div><h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Snapshot</h3></div><BulletContent text={insight.snapshot} /></div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col h-full"><div className="flex items-center gap-3 mb-5"><div className="p-2.5 bg-amber-50 rounded-xl text-amber-500"><ShieldAlert size={16} /></div><h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Regulations</h3></div><BulletContent text={insight.regulations} /></div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col h-full"><div className="flex items-center gap-3 mb-5"><div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-500"><Calculator size={16} /></div><h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Break-Even</h3></div><BulletContent text={insight.breakEvenAnalysis} /></div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col h-full"><div className="flex items-center gap-3 mb-5"><div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-500"><ShieldCheck size={16} /></div><h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Recommendation</h3></div><div className="p-6 bg-[#0f172a] rounded-xl text-white flex-1"><BulletContent text={insight.recommendation} isDark /></div></div>
      </div>

      {/* ADVANCED ANALYSIS SECTION */}
      <div className="mt-6 pt-6 border-t border-slate-200" style={userTier === 'free' && !showingSampleData ? { position: 'relative', opacity: 0.5 } : {}}>
        {/* Sample watermark for free users viewing samples */}
        {userTier === 'free' && showingSampleData && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="text-9xl font-black text-slate-300 opacity-20 transform -rotate-12">SAMPLE</div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg"><Sparkles size={18} /></div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
                Advanced Analysis {userTier === 'free' && <span className="text-xs text-purple-600 font-black ml-2">PRO ONLY</span>}
              </h2>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                AI-Powered Deep Dive Tools {userTier === 'free' && '• Click any button to see sample'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <ErrorBoundary>
            <PathToYesPanel
              data={userTier === 'free' && showingSampleData ? samplePathToYesData : pathToYesData}
              isLoading={isLoadingPathToYes}
              onRefresh={() => userTier === 'free' ? setShowingSampleData(true) : handleRunPathToYes()}
              liveKpis={{ capRate, cashOnCash, dscr: totalDscr }}
              targets={investmentTargets}
            />
          </ErrorBoundary>
          <ErrorBoundary>
            <AmenityROIPanel
              data={userTier === 'free' && showingSampleData ? sampleAmenityROIData : amenityROIData}
              isLoading={isLoadingAmenityROI}
              onRefresh={() => userTier === 'free' ? setShowingSampleData(true) : handleRunAmenityROI()}
            />
          </ErrorBoundary>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ErrorBoundary>
            <SensitivityTable
              data={userTier === 'free' && showingSampleData ? sampleSensitivityData : sensitivityData}
              isLoading={isLoadingSensitivity}
              onRefresh={() => userTier === 'free' ? setShowingSampleData(true) : handleRunSensitivity()}
            />
          </ErrorBoundary>
          <ErrorBoundary>
            <LenderPacketExport
              packet={userTier === 'free' && showingSampleData ? sampleLenderPacket : lenderPacket}
              isLoading={isLoadingLenderPacket}
              onGenerate={() => userTier === 'free' ? setShowingSampleData(true) : handleGenerateLenderPacket()}
            />
          </ErrorBoundary>
        </div>
        
        {/* Upgrade banner for free users viewing samples */}
        {userTier === 'free' && showingSampleData && (
          <div className="mt-4 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl text-white text-center">
            <h3 className="text-lg font-black uppercase tracking-tight mb-2">Unlock Advanced Analysis</h3>
            <p className="text-sm mb-4 opacity-90">Get real insights for your properties with Pro tier</p>
            <button
              onClick={() => {
                alert('Pro tier: $29/month\n\n✓ 50 analyses per day\n✓ 100 Claude calls per hour\n✓ Advanced Analysis Tools\n✓ Priority support\n\nStripe payment integration coming in Phase 18!');
              }}
              className="px-8 py-3 bg-white text-purple-600 font-black rounded-lg hover:bg-slate-100 transition-all"
            >
              UPGRADE TO PRO
            </button>
          </div>
        )}
      </div>

      {/* Pro Upgrade Modal (simple version) */}
      {showProModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white mb-4 inline-block">
              <Sparkles size={24} />
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 mb-3">Upgrade to Pro</h2>
            <p className="text-slate-600 mb-6 text-sm font-bold">
              Get access to Advanced Analysis tools and unlimited analyses
            </p>
            
            <button
              onClick={() => {
                setShowProModal(false);
                alert('Pro tier: $29/month\n\n✓ 50 analyses per day\n✓ 100 Claude calls per hour\n✓ Advanced Analysis Tools\n✓ Priority support\n\nStripe payment integration coming in Phase 18!');
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black rounded-lg transition-all mb-3"
            >
              UPGRADE TO PRO
            </button>
            
            <button
              onClick={() => setShowProModal(false)}
              className="w-full px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Market Comps Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-6 border-b pb-6">
            <div className="p-3 bg-rose-50 rounded-xl text-rose-500"><MapPin size={18} /></div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">Market Comps</h3>
          </div>

          {/* AVM Sale Comparables */}
          {propertyData?.avmComparables && propertyData.avmComparables.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-[9px] font-black text-blue-600 uppercase tracking-widest">SALE COMPS (AVM)</h4>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[7px] font-black">RentCast</span>
              </div>
              <div className="space-y-2">
                {propertyData.avmComparables.slice(0, 5).map((comp, i) => (
                  <div key={i} className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[9px] font-black text-slate-800 truncate flex-1 uppercase">{comp.formattedAddress}</p>
                      {comp.correlation != null && (
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[7px] font-black flex-shrink-0 ${
                          comp.correlation >= 0.9 ? 'bg-emerald-100 text-emerald-700' :
                          comp.correlation >= 0.7 ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>{(comp.correlation * 100).toFixed(0)}% match</span>
                      )}
                    </div>
                    <div className="flex gap-3 text-[9px] font-bold text-slate-600 flex-wrap">
                      {comp.price != null && <span className="font-black text-slate-900">{formatCurrency(comp.price)}</span>}
                      {comp.bedrooms != null && <span>{comp.bedrooms}bd/{comp.bathrooms || '?'}ba</span>}
                      {comp.squareFootage != null && <span>{comp.squareFootage.toLocaleString()}sf</span>}
                      {comp.distance != null && <span>{comp.distance.toFixed(1)}mi</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-2"><PropertyChat insight={insight} config={baseConfig} /></div>
      </div>

      {/* Sources & Citations */}
      {insight.sources && insight.sources.length > 0 && (
        <div className="mt-8 pt-8 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><FileText size={16} /></div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Data Sources & Citations</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {insight.sources.map((source, idx) => {
              // Validate URL
              const isValidUrl = source?.uri && (source.uri.startsWith('http://') || source.uri.startsWith('https://'));
              return isValidUrl ? (
                <a
                  key={idx}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-black text-slate-600 hover:border-rose-200 hover:text-rose-500 transition-all flex items-center gap-2 shadow-sm"
                >
                  <ExternalLink size={12} />
                  {source.title}
                </a>
              ) : (
                <div
                  key={idx}
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 flex items-center gap-2 shadow-sm"
                >
                  <FileText size={12} />
                  {source.title || 'Source'}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardTab;
