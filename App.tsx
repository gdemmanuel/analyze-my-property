import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calculator, Search, TrendingUp, ShieldAlert, Settings,
  LayoutDashboard, Calendar, BarChart3, Loader2,
  ShieldCheck, Zap, Building2, ExternalLink,
  Save, Printer, Home, Layers, Ruler, Plus, Trash, Briefcase, MapPin, Sparkles, PlusCircle,
  FileBarChart, ArrowLeftRight, Edit3, Check, Armchair, User, UserCheck, ShieldPlus, AlertTriangle, FileText, Waves, Thermometer, Gamepad2, Map, Target, ChevronDown
} from 'lucide-react';
import { PropertyConfig, MarketInsight, MonthlyProjection, SavedAssessment, Amenity, RentalStrategy } from './types';
import { DEFAULT_CONFIG, AMENITIES } from './constants';
import { calculateMonthlyProjections, aggregateToYearly } from './utils/financialLogic';
import { analyzeProperty, getAddressSuggestions, suggestAmenityImpact, searchWebForSTRData, runSensitivityAnalysis, runAmenityROI, calculatePathToYes, generateLenderPacket, onRateLimitCountdown } from './services/claudeService';
import { SensitivityMatrix, AmenityROIResult, PathToYes, LenderPacket } from './prompts/underwriting';
import SensitivityTable from './components/SensitivityTable';
import AmenityROIPanel from './components/AmenityROIPanel';
import PathToYesPanel from './components/PathToYesPanel';
import InvestmentTargetsSettings from './components/InvestmentTargetsSettings';
import LenderPacketExport from './components/LenderPacketExport';
import Charts from './components/Charts';
import FinancialTables from './components/FinancialTables';
import ComparisonReport from './components/ComparisonReport';
import PropertyChat from './components/PropertyChat';
import InfoTooltip from './components/InfoTooltip';
import { fetchPropertyData, fetchMarketStats, fetchRentEstimate, fetchSTRData, fetchSTRComps, RentCastProperty } from './services/rentcastService';


const App: React.FC = () => {
  const [baseConfig, setBaseConfig] = useState<PropertyConfig>(DEFAULT_CONFIG);
  const [amenities, setAmenities] = useState<Amenity[]>(AMENITIES);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>(['furnishings']);
  const [strategy, setStrategy] = useState<RentalStrategy>('STR');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'monthly' | 'yearly' | 'portfolio' | 'assumptions'>('dashboard');
  const [propertyInput, setPropertyInput] = useState('');
  const [displayedAddress, setDisplayedAddress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [insight, setInsight] = useState<MarketInsight | null>(null);
  const [savedAssessments, setSavedAssessments] = useState<SavedAssessment[]>([]);
  const [showSaveToast, setShowSaveToast] = useState(false);

  const [newAmenityName, setNewAmenityName] = useState('');
  const [isSuggestingAmenity, setIsSuggestingAmenity] = useState(false);
  const [editingAmenityId, setEditingAmenityId] = useState<string | null>(null);

  // Grounding & Verification State
  const [rentCastData, setRentCastData] = useState<RentCastProperty | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isFetchingFactual, setIsFetchingFactual] = useState(false);

  // Granular Furnishing State
  const [furnishingBreakdown, setFurnishingBreakdown] = useState({
    beds: 3,
    baths: 2,
    costPerBed: 3500,
    costPerBath: 1000,
    livingRoom: 4500,
    kitchenDining: 2500,
    techDecor: 1500
  });

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isUsingWebData, setIsUsingWebData] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showFurnishingDropdown, setShowFurnishingDropdown] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);

  // Advanced Analysis State
  const [sensitivityData, setSensitivityData] = useState<SensitivityMatrix | null>(null);
  const [amenityROIData, setAmenityROIData] = useState<AmenityROIResult | null>(null);
  const [pathToYesData, setPathToYesData] = useState<PathToYes | null>(null);
  const [lenderPacket, setLenderPacket] = useState<LenderPacket | null>(null);
  const [isLoadingSensitivity, setIsLoadingSensitivity] = useState(false);
  const [isLoadingAmenityROI, setIsLoadingAmenityROI] = useState(false);
  const [isLoadingPathToYes, setIsLoadingPathToYes] = useState(false);
  const [isLoadingLenderPacket, setIsLoadingLenderPacket] = useState(false);

  // Investment Targets State (customizable thresholds)
  const [investmentTargets, setInvestmentTargets] = useState({
    minCapRate: 6,
    minCoC: 10,
    minDSCR: 1.25
  });

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Rate Limit Countdown State
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  // Load investment targets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('investmentTargets');
    if (saved) {
      try {
        setInvestmentTargets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load investment targets:', e);
      }
    }
  }, []);

  // Save investment targets to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('investmentTargets', JSON.stringify(investmentTargets));
  }, [investmentTargets]);

  // Subscribe to rate limit countdown updates
  useEffect(() => {
    const unsubscribe = onRateLimitCountdown((seconds) => {
      setRateLimitCountdown(seconds);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('airroi_v40');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSavedAssessments(parsed.assessments || []);
      if (parsed.amenities) setAmenities(parsed.amenities);
      if (parsed.selectedAmenityIds) setSelectedAmenityIds(parsed.selectedAmenityIds);
      if (parsed.furnishingBreakdown) setFurnishingBreakdown(parsed.furnishingBreakdown);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('airroi_v40', JSON.stringify({ assessments: savedAssessments, amenities, selectedAmenityIds, furnishingBreakdown }));
  }, [savedAssessments, amenities, selectedAmenityIds, furnishingBreakdown]);

  // Synchronize Furnishing Amenity Cost with Breakdown
  useEffect(() => {
    const total = (furnishingBreakdown.beds * furnishingBreakdown.costPerBed) +
      (furnishingBreakdown.baths * furnishingBreakdown.costPerBath) +
      furnishingBreakdown.livingRoom +
      furnishingBreakdown.kitchenDining +
      furnishingBreakdown.techDecor;

    setAmenities(prev => prev.map(a => a.id === 'furnishings' ? { ...a, cost: total } : a));
  }, [furnishingBreakdown]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (propertyInput.length > 8 && !isAnalyzing && !isSelectingRef.current) {
        try {
          const results = await getAddressSuggestions(propertyInput);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } catch (e) {
          console.error("Suggestions failed", e);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [propertyInput, isAnalyzing]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveAssessment = () => {
    if (!insight) return;
    const newSave: SavedAssessment = {
      id: Date.now().toString(),
      address: displayedAddress,
      config: baseConfig,
      insight: insight,
      selectedAmenities: selectedAmenityIds,
      timestamp: Date.now(),
      strategy: strategy,
      capRate: capRate,
      cashOnCash: cashOnCash,
      price: finalConfig.price,
      annualNoi: annualNoi
    };
    setSavedAssessments([newSave, ...savedAssessments].slice(0, 30));
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 4000);
  };

  const deleteSaved = (id: string) => {
    setSavedAssessments(prev => prev.filter(a => a.id !== id));
  };

  const toggleComparisonMode = () => {
    setComparisonMode(!comparisonMode);
    setSelectedForComparison([]);
  };

  const togglePropertyForComparison = (id: string) => {
    setSelectedForComparison(prev => {
      if (prev.includes(id)) {
        return prev.filter(propId => propId !== id);
      } else if (prev.length < 4) { // Max 4 properties for comparison
        return [...prev, id];
      }
      return prev;
    });
  };

  const exportUnderwritingReport = () => {
    if (!insight || !year1Data) return;

    // Helper function to format text as bullet points
    const formatAsBullets = (text: string) => {
      const lines = text.split('\n').filter(line => line.trim());
      return lines.map(line => {
        const trimmed = line.trim();
        // Remove existing bullet points or dashes
        const cleaned = trimmed.replace(/^[•\-\*]\s*/, '');
        return `<li>${cleaned}</li>`;
      }).join('');
    };

    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Property Underwriting Report - ${displayedAddress}</title>
  <style>
    @media print {
      @page { margin: 0.5in; size: letter; }
      body { margin: 0; padding: 0; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1e293b;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; font-weight: 900; }
    .header .subtitle { opacity: 0.8; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }
    .section { margin-bottom: 25px; page-break-inside: avoid; }
    .section-title {
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #f43f5e;
      border-bottom: 2px solid #f43f5e;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .metric-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background: #f8fafc;
      border-radius: 6px;
    }
    .info-label { font-weight: 700; color: #64748b; font-size: 12px; }
    .info-value { font-weight: 900; color: #0f172a; font-size: 12px; }
    .analysis-box {
      background: #f8fafc;
      border-left: 4px solid #f43f5e;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 15px;
    }
    .analysis-box h3 {
      margin: 0 0 10px 0;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      color: #f43f5e;
    }
    .analysis-box ul {
      margin: 0;
      padding-left: 20px;
      list-style-type: disc;
    }
    .analysis-box li {
      font-size: 11px;
      line-height: 1.6;
      margin-bottom: 6px;
      color: #1e293b;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${displayedAddress}</h1>
    <div class="subtitle">${strategy} Investment Analysis • Generated ${new Date().toLocaleDateString()}</div>
  </div>

  <div class="section">
    <div class="section-title">Property Details</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Address</span><span class="info-value">${displayedAddress}</span></div>
      <div class="info-row"><span class="info-label">Property Type</span><span class="info-value">Single Family</span></div>
      <div class="info-row"><span class="info-label">Bedrooms</span><span class="info-value">${insight.beds}</span></div>
      <div class="info-row"><span class="info-label">Bathrooms</span><span class="info-value">${insight.baths}</span></div>
      <div class="info-row"><span class="info-label">Square Footage</span><span class="info-value">${insight.sqft.toLocaleString()} sqft</span></div>
      <div class="info-row"><span class="info-label">Acquisition Price</span><span class="info-value">${formatCurrency(finalConfig.price)}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Key Performance Metrics</div>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Cap Rate</div>
        <div class="metric-value">${capRate.toFixed(2)}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Cash-on-Cash</div>
        <div class="metric-value">${cashPortion >= 1000 ? `${cashOnCash.toFixed(2)}%` : '∞'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Net NOI</div>
        <div class="metric-value">${formatCurrency(annualNoi)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Gross Yield</div>
        <div class="metric-value">${grossYield.toFixed(2)}%</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Financial Summary (Year 1)</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Annual Revenue</span><span class="info-value">${formatCurrency(annualGross)}</span></div>
      <div class="info-row"><span class="info-label">Annual NOI</span><span class="info-value">${formatCurrency(annualNoi)}</span></div>
      <div class="info-row"><span class="info-label">Annual Profit</span><span class="info-value">${formatCurrency(annualProfit)}</span></div>
      <div class="info-row"><span class="info-label">Owner Surplus</span><span class="info-value">${formatCurrency(annualSurplus)}</span></div>
      <div class="info-row"><span class="info-label">Average Daily Rate</span><span class="info-value">${formatCurrency(year1Data.adr)}</span></div>
      <div class="info-row"><span class="info-label">Occupancy Rate</span><span class="info-value">${year1Data.occupancy.toFixed(0)}%</span></div>
      <div class="info-row"><span class="info-label">Management Fee</span><span class="info-value">${formatCurrency(year1Data.mgmtFee)}</span></div>
      <div class="info-row"><span class="info-label">Maintenance</span><span class="info-value">${formatCurrency(year1Data.maintenance)}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Capital Structure</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Down Payment</span><span class="info-value">${formatCurrency(downPayment)}</span></div>
      <div class="info-row"><span class="info-label">Cash Invested</span><span class="info-value">${formatCurrency(cashPortion)}</span></div>
      <div class="info-row"><span class="info-label">HELOC Funding</span><span class="info-value">${formatCurrency(helocPortion)}</span></div>
      <div class="info-row"><span class="info-label">Total Upfront Capital</span><span class="info-value">${formatCurrency(totalUpfrontCapital)}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">AI Analysis</div>
    <div class="analysis-box">
      <h3>Market Snapshot</h3>
      <ul>${formatAsBullets(insight.snapshot)}</ul>
    </div>
    <div class="analysis-box">
      <h3>Regulations & Compliance</h3>
      <ul>${formatAsBullets(insight.regulations)}</ul>
    </div>
    <div class="analysis-box">
      <h3>Break-Even Analysis</h3>
      <ul>${formatAsBullets(insight.breakEvenAnalysis)}</ul>
    </div>
    <div class="analysis-box">
      <h3>Recommendation</h3>
      <ul>${formatAsBullets(insight.recommendation)}</ul>
    </div>
  </div>

  <div class="footer">
    ${insight.sources && insight.sources.length > 0 ? `
      <div style="margin-bottom: 20px; text-align: left;">
        <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Data Sources & Citations</div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
          ${insight.sources.map(s => `<div style="font-size: 9px; color: #475569;">• ${s.title}: <span style="color: #64748b;">${s.uri}</span></div>`).join('')}
        </div>
      </div>
    ` : ''}
    <p><strong>AirROI PRO</strong> • Property Investment Analysis Platform</p>
    <p>This report is for informational purposes only and does not constitute financial advice.</p>
  </div>
</body>
</html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const finalConfig = useMemo(() => {
    let config = { ...baseConfig };
    let totalUpgradeCost = 0;
    let totalFurnishingCost = 0;
    selectedAmenityIds.forEach(id => {
      const am = amenities.find(a => a.id === id);
      if (am) {
        if (am.id === 'furnishings') totalFurnishingCost += am.cost;
        else totalUpgradeCost += am.cost;
        if (strategy === 'STR') {
          config.adr += am.adrBoost;
          const currentOcc = config.occupancyPercent;
          const remainingRoom = 75 - currentOcc;
          const effectiveBoost = am.occBoost * (remainingRoom / 40);
          config.occupancyPercent = Math.min(75, currentOcc + Math.max(0, effectiveBoost));
        } else if (strategy === 'MTR') {
          config.mtrMonthlyRent += am.adrBoost * 10;
        } else {
          config.ltrMonthlyRent += am.adrBoost * 3;
        }
      }
    });
    config.upgradeCost = totalUpgradeCost;
    config.furnishingsCost = totalFurnishingCost;
    return config;
  }, [baseConfig, selectedAmenityIds, amenities, strategy]);

  // Selected Amenities Array (must be declared before monthlyData)
  const selectedAmenities = amenities.filter(a => selectedAmenityIds.includes(a.id));

  const monthlyData = useMemo(() => calculateMonthlyProjections(finalConfig, 20, strategy, selectedAmenities), [finalConfig, strategy, selectedAmenities]);
  const yearlyData = useMemo(() => aggregateToYearly(monthlyData), [monthlyData]);
  const year1Data = yearlyData?.[0] || null;
  const annualProfit = year1Data?.cashFlowAfterDebt || 0;
  const annualSurplus = year1Data?.netCashToOwner || 0;
  const downPayment = finalConfig.price * (finalConfig.downPaymentPercent / 100);
  const totalUpfrontCapital = downPayment + finalConfig.loanCosts + finalConfig.furnishingsCost + finalConfig.upgradeCost;
  const helocPortion = totalUpfrontCapital * (finalConfig.helocFundingPercent / 100);
  const cashPortion = totalUpfrontCapital - helocPortion;
  const annualNoi = year1Data?.noiAfterPlatform || 0;
  const annualGross = year1Data?.revenue || 0;
  const capRate = finalConfig.price > 0 ? (annualNoi / finalConfig.price) * 100 : 0;
  const grossYield = finalConfig.price > 0 ? (annualGross / finalConfig.price) * 100 : 0;

  // Cash-on-Cash: Prevent unrealistic percentages when cash invested is very low
  // If cash portion < $1000, show "N/A" (return 0 and handle display separately)
  const cashOnCash = cashPortion >= 1000 ? (annualProfit / cashPortion) * 100 : 0;

  // DSCR: Debt Service Coverage Ratio
  // NOTE: year1Data.mortgagePayment is ALREADY the annual total from aggregateToYearly()
  // Traditional DSCR (mortgage only - lender's perspective)
  const annualDebtService = year1Data?.mortgagePayment || 0;
  const dscr = annualDebtService > 0 ? annualNoi / annualDebtService : 0;

  // Total DSCR (mortgage + HELOC interest - true cash flow perspective)
  const annualHelocInterest = year1Data?.helocInterest || 0;
  const totalAnnualDebtService = annualDebtService + annualHelocInterest;
  const totalDscr = totalAnnualDebtService > 0 ? annualNoi / totalAnnualDebtService : 0;



  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const handleInputChange = (field: keyof PropertyConfig, value: string) => {
    let clean = value.replace(/[^0-9.]/g, '');
    let numValue = parseFloat(clean) || 0;
    setBaseConfig(prev => ({ ...prev, [field]: numValue }));
  };

  const handleManagementSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    let pct = 0;
    if (val === 1) pct = 10;
    if (val === 2) pct = 25;
    setBaseConfig(prev => ({ ...prev, mgmtFeePercent: pct }));
  };

  const getManagementLabel = (pct: number) => {
    if (pct === 0) return 'Self Managed';
    if (pct === 10) return 'Hybrid (10%)';
    return 'Full Management (25%)';
  };

  const getManagementIndex = (pct: number) => {
    if (pct === 0) return 0;
    if (pct <= 15) return 1;
    return 2;
  };

  const runAnalysis = async (selectedAddr?: string) => {
    const target = selectedAddr || propertyInput;
    if (!target) return;
    setAnalysisError(null);
    setShowSuggestions(false);
    isSelectingRef.current = true;
    setIsFetchingFactual(true);
    let factual: RentCastProperty | null = null;
    let mktStats: any = null;
    let rentEst: any = null;
    let strData: any = null;
    let strComps: any = null;
    try {
      factual = await fetchPropertyData(target);
      const [statsRes, rentRes, strRes, compsRes] = await Promise.all([
        factual?.zipCode ? fetchMarketStats(factual.zipCode) : null,
        fetchRentEstimate(target),
        fetchSTRData(target, factual?.propertyType, factual?.bedrooms, factual?.bathrooms),
        fetchSTRComps(target, factual?.propertyType, factual?.bedrooms, factual?.bathrooms)
      ]);
      mktStats = statsRes;
      rentEst = rentRes;
      strData = strRes;
      strComps = compsRes;

      // If RentCast has no STR data, automatically search the web
      if (!strData || !strData.rent || !strData.occupancy) {
        console.log('[App] RentCast has no STR data, searching web...');
        const webData = await searchWebForSTRData(target, factual?.bedrooms, factual?.bathrooms);
        if (webData) {
          strData = {
            rent: webData.adr,
            occupancy: webData.occupancy / 100, // Convert percentage to decimal
            source: 'web_search'
          };
          setIsUsingWebData(true);
          console.log('[App] Using web-sourced STR data:', strData);
        }
      } else {
        setIsUsingWebData(false);
      }
    } catch (e) {
      console.warn("Factual fetch failed, falling back to AI intuition", e);
    }
    setIsFetchingFactual(false);
    executeAnalysis(target, factual, mktStats, rentEst, strData, strComps);
  };

  const executeAnalysis = async (target: string, factual: RentCastProperty | null, marketStats?: any, rentEstimate?: any, strData?: any, strComps?: any) => {
    setIsAnalyzing(true);
    setShowVerificationModal(false);

    // Clear previous advanced analysis data when starting new analysis
    setSensitivityData(null);
    setAmenityROIData(null);
    setPathToYesData(null);
    setLenderPacket(null);

    try {
      console.log('[App] STR Data from RentCast:', strData);
      console.log('[App] Factual Photo:', factual?.mainImage ? 'Found' : 'Missing');

      const result = await analyzeProperty(target, factual, marketStats, rentEstimate, strData, strComps);

      // Set property image from RentCast if available
      if (factual?.mainImage) {
        result.mainImage = factual.mainImage;
        console.log('[App] Using RentCast property photo');
      }

      console.log('[App] AI Result - Occupancy:', result.suggestedOccupancy, 'ADR:', result.suggestedADR);
      console.log('[App] Final mainImage:', result.mainImage ? 'Set' : 'Missing');

      setInsight(result);
      setDisplayedAddress(target);
      const factualPrice = factual?.lastSalePrice || 0;
      const aiPrice = result.suggestedListingPrice || 0;
      const useAiPrice = aiPrice > (factualPrice * 1.05) && aiPrice > 0;
      const parsedPrice = useAiPrice ? aiPrice : (factualPrice || aiPrice);
      const parsedBeds = Math.max(factual?.bedrooms || 0, parseInt(result.beds) || 0) || 3;
      const parsedBaths = Math.max(factual?.bathrooms || 0, parseFloat(result.baths) || 0) || 2;
      let monthlyTax = result.suggestedPropertyTax;
      if (parsedPrice > 0 && monthlyTax > (parsedPrice * 0.02)) monthlyTax = Math.round(monthlyTax / 12);
      setFurnishingBreakdown(prev => ({ ...prev, beds: parsedBeds, baths: parsedBaths }));
      setBaseConfig(prev => ({
        ...prev,
        price: parsedPrice || prev.price,
        occupancyPercent: result.suggestedOccupancy || prev.occupancyPercent,
        propertyTaxMonthly: factual?.taxMonthly || monthlyTax || prev.propertyTaxMonthly,
        hoaMonthly: factual?.hoaMonthly || result.suggestedHOA || prev.hoaMonthly,
        cleaningFeeIncome: (result.suggestedCleaningFee * 8) || prev.cleaningFeeIncome,
        cleaningExpense: (result.suggestedCleaningFee * 7.5) || prev.cleaningExpense,
        adr: result.proFormaScenarios?.[1]?.adr || result.suggestedADR || prev.adr,
        mtrMonthlyRent: result.suggestedMTRRent || prev.mtrMonthlyRent,
        ltrMonthlyRent: result.suggestedLTRRent || prev.ltrMonthlyRent
      }));
      setActiveTab('dashboard');
    } catch (e: any) {
      console.error("Full analysis error:", e);
      setAnalysisError(e.message?.includes("429") ? "AI capacity exceeded. Please retry in 60 seconds." : `Underwriting failed: ${e.message || "Please check the address."}`);
    } finally {
      setIsAnalyzing(false);
      isSelectingRef.current = false;
    }
  };

  const handleAddAmenity = async () => {
    if (!newAmenityName) return;
    setIsSuggestingAmenity(true);
    try {
      const suggestion = await suggestAmenityImpact(newAmenityName, displayedAddress);
      const newAm: Amenity = { id: Date.now().toString(), name: newAmenityName, cost: suggestion.cost || 5000, adrBoost: suggestion.adrBoost || 20, occBoost: suggestion.occBoost || 3, icon: 'Sparkles', active: true };
      setAmenities(prev => [...prev, newAm]);
      setNewAmenityName('');
    } finally { setIsSuggestingAmenity(false); }
  };

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenityIds(prev => prev.includes(amenityId) ? prev.filter(id => id !== amenityId) : [...prev, amenityId]);
  };

  const removeAmenity = (id: string) => {
    if (id === 'furnishings') return;
    setAmenities(prev => prev.filter(a => a.id !== id));
    setSelectedAmenityIds(prev => prev.filter(aid => aid !== id));
  };

  const handleEditAmenity = (id: string, updates: Partial<Amenity>) => {
    setAmenities(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const BulletContent = ({ text, isDark = false, bulletColor = 'bg-[#ef4444]' }: { text: string, isDark?: boolean, bulletColor?: string }) => {
    if (!text) return null;
    let lines = text.split(/\n+/);
    if (lines.length <= 1) lines = text.split(/(?:[•\-\*]|\d+\.)\s+/).filter(Boolean);
    const processedLines = lines.map(l => l.trim().replace(/^[•\-\*\d\.\s]+/, '')).filter(line => line.length > 5);
    return (
      <ul className="space-y-4">
        {processedLines.map((line, i) => {
          const splitIndex = line.indexOf(':');
          const hasHeader = splitIndex > 0 && splitIndex < 50;
          return (
            <li key={i} className="flex gap-4 items-start">
              <div className={`shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${bulletColor}`} />
              <div className="flex flex-col">
                {hasHeader && <strong className={`${isDark ? 'text-white' : 'text-[#475569]'} font-extrabold text-[15px] tracking-tight mb-1`}>{line.substring(0, splitIndex).trim()}</strong>}
                <p className={`text-[14px] leading-relaxed font-medium ${isDark ? 'text-slate-300' : 'text-[#94a3b8]'}`}>{(hasHeader ? line.substring(splitIndex + 1).trim() : line).replace(/\*\*/g, '')}</p>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  const getAmenityIcon = (iconName: string) => {
    switch (iconName) {
      case 'Armchair': return <Armchair size={16} />;
      case 'Waves': return <Waves size={16} />;
      case 'Thermometer': return <Thermometer size={16} />;
      case 'Gamepad2': return <Gamepad2 size={16} />;
      case 'Layers': return <Layers size={16} />;
      case 'Zap': return <Zap size={16} />;
      default: return <Sparkles size={16} />;
    }
  };

  // ============================================================================
  // ADVANCED ANALYSIS FUNCTIONS
  // ============================================================================

  const handleRunSensitivity = async () => {
    if (!insight) return;
    setIsLoadingSensitivity(true);
    try {
      const result = await runSensitivityAnalysis({
        adr: finalConfig.adr,
        occupancy: finalConfig.occupancyPercent,
        rate: finalConfig.mortgageRate,
        ownerSurplus: annualSurplus,
        cashOnCash: cashOnCash,
        dscr: totalDscr  // Use Total DSCR (includes HELOC interest)
      });
      setSensitivityData(result);
    } catch (e) {
      console.error('Sensitivity analysis failed:', e);
    } finally {
      setIsLoadingSensitivity(false);
    }
  };

  const handleRunAmenityROI = async () => {
    if (!insight) return;
    setIsLoadingAmenityROI(true);
    try {
      const amenityList = amenities
        .filter(a => a.id !== 'furnishings')
        .map(a => ({
          name: a.name,
          setupCost: a.cost,
          adrLiftPct: (a.adrBoost / finalConfig.adr) * 100,
          occLiftPct: a.occBoost
        }));

      const result = await runAmenityROI({
        currentADR: finalConfig.adr,
        currentOccupancy: finalConfig.occupancyPercent,
        baseAssumptions: {
          price: finalConfig.price,
          strategy: strategy
        },
        amenities: amenityList
      });
      setAmenityROIData(result);
    } catch (e) {
      console.error('Amenity ROI analysis failed:', e);
    } finally {
      setIsLoadingAmenityROI(false);
    }
  };

  const handleRunPathToYes = async () => {
    if (!insight) return;
    setIsLoadingPathToYes(true);
    try {
      const result = await calculatePathToYes({
        kpis: {
          capRate: capRate,
          cashOnCash: cashOnCash,
          dscr: totalDscr,  // Use Total DSCR (includes HELOC interest) for realistic assessment
          ownerSurplus: annualSurplus
        },
        targets: investmentTargets,  // Use dynamic targets from state
        assumptions: {
          price: finalConfig.price,
          adr: finalConfig.adr,
          occupancy: finalConfig.occupancyPercent,
          strategy: strategy
        },
        cashInvested: cashPortion  // Pass cash invested for CoC N/A handling
      });
      setPathToYesData(result);
    } catch (e) {
      console.error('Path to yes calculation failed:', e);
    } finally {
      setIsLoadingPathToYes(false);
    }
  };

  const handleGenerateLenderPacket = async () => {
    if (!insight) return;
    setIsLoadingLenderPacket(true);
    try {
      const result = await generateLenderPacket({
        address: displayedAddress,
        strategy: strategy,
        kpis: {
          noi: annualNoi,
          dscr: totalDscr,  // Use Total DSCR (includes HELOC interest)
          capRate: capRate,
          cashOnCash: cashOnCash
        },
        ownerSurplus: annualSurplus,
        assumptions: {
          price: finalConfig.price,
          downPayment: `${finalConfig.downPaymentPercent}%`,
          mortgageRate: `${finalConfig.mortgageRate}%`,
          adr: finalConfig.adr,
          occupancy: `${finalConfig.occupancyPercent}%`
        },
        amenities: selectedAmenities.filter(a => a.id !== 'furnishings').map(a => ({
          name: a.name,
          cost: a.cost,
          paybackMonths: a.cost / ((a.adrBoost * 30 * (finalConfig.occupancyPercent / 100)) || 1)
        })),
        risks: insight.risksDiligence?.split('\n').filter(Boolean).slice(0, 5) || [],
        sources: insight.sources?.map(s => ({ title: s.title, url: s.uri })) || []
      });
      setLenderPacket(result);
    } catch (e) {
      console.error('Lender packet generation failed:', e);
    } finally {
      setIsLoadingLenderPacket(false);
    }
  };

  const currentRateValue = strategy === 'STR' ? finalConfig.adr : (strategy === 'MTR' ? finalConfig.mtrMonthlyRent / 30 : finalConfig.ltrMonthlyRent / 30);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row print:bg-white print:block">
      {showSaveToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-[#1e293b] text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-6 duration-500 border border-white/10 ring-8 ring-black/5">
          <div className="bg-[#f43f5e] p-2 rounded-full"><Save size={16} /></div>
          <p className="text-xs font-black uppercase tracking-widest leading-none">DEAL SAVED TO REPORTS</p>
        </div>
      )}

      {/* Rate Limit Countdown Toast */}
      {rateLimitCountdown > 0 && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-amber-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-pulse border border-amber-400 ring-8 ring-amber-500/20">
          <div className="bg-white/20 p-2 rounded-full">
            <Loader2 size={16} className="animate-spin" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest leading-none">API Rate Limit</p>
            <p className="text-lg font-black mt-1">Retrying in {rateLimitCountdown}s</p>
          </div>
        </div>
      )}

      {/* Investment Targets Settings Modal */}
      {showSettingsModal && (
        <InvestmentTargetsSettings
          targets={investmentTargets}
          onSave={setInvestmentTargets}
          onClose={() => setShowSettingsModal(false)}
        />
      )}


      <nav className="w-full lg:w-48 bg-[#0f172a] text-white p-5 lg:fixed lg:h-full z-50 flex flex-col border-r border-slate-800 transition-all print:hidden">
        <div className="flex items-center gap-2 mb-10 px-1">
          <div className="p-2 bg-white rounded-xl text-slate-900"><Calculator size={20} /></div>
          <h1 className="text-xl font-black tracking-tighter uppercase leading-none">AirROI <span className="text-[#f43f5e]">PRO</span></h1>
        </div>
        <div className="space-y-2 mb-6 flex-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Audit' },
            { id: 'analytics', icon: BarChart3, label: 'Performance' },
            { id: 'monthly', icon: Calendar, label: 'Monthly' },
            { id: 'yearly', icon: TrendingUp, label: 'Yearly' },
            { id: 'portfolio', icon: Briefcase, label: 'Portfolio' },
            { id: 'assumptions', icon: Settings, label: 'Settings' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-black text-[12px] uppercase tracking-wider ${activeTab === item.id ? 'bg-[#1e293b] text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <div className="w-5 flex justify-center shrink-0"><item.icon size={18} /></div>
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'portfolio' && savedAssessments.length > 0 && (
                <span className="px-2 py-0.5 bg-[#f43f5e] text-white rounded-full text-[9px] font-black">{savedAssessments.length}</span>
              )}
            </button>
          ))}
        </div>
        <div className="p-3 bg-[#1e293b]/50 rounded-2xl flex flex-col gap-2 mb-6 border border-white/5">
          <p className="text-[10px] font-black uppercase text-slate-500 px-2 py-1 tracking-widest">Strategy</p>
          {[{ id: 'STR', label: 'SHORT', color: 'bg-[#f43f5e]' }, { id: 'MTR', label: 'MID', color: 'bg-blue-500' }, { id: 'LTR', label: 'LONG', color: 'bg-[#10b981]' }].map(s => (
            <button key={s.id} onClick={() => setStrategy(s.id as RentalStrategy)} className={`w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${strategy === s.id ? `${s.color} text-white shadow-xl` : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>{s.label}</button>
          ))}
        </div>
      </nav>

      <main className="flex-1 lg:ml-48 p-4 lg:p-10 print:ml-0 print:p-0">
        <div className="max-w-[1600px] mx-auto mb-8 print:hidden relative" ref={suggestionRef}>
          <div className="bg-white p-1 rounded-3xl shadow-xl flex flex-col md:flex-row gap-1 border border-slate-100">
            <div className="relative flex-1">
              <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Enter property address..." className="w-full pl-16 pr-8 py-4 bg-white border-none rounded-2xl outline-none text-[15px] font-black text-slate-800" value={propertyInput} onChange={(e) => setPropertyInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runAnalysis()} />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {isUsingWebData ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-600 rounded-full border border-purple-100">
                    <Sparkles className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-tight">Web Search Data</span>
                  </div>
                ) : import.meta.env.VITE_RENTCAST_API_KEY ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 animate-pulse"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[10px] font-black uppercase tracking-tight">RentCast Live</span></div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /><span className="text-[10px] font-black uppercase tracking-tight">AI Guessing Mode</span></div>
                )}
              </div>
            </div>
            <button onClick={() => runAnalysis()} disabled={isAnalyzing || isFetchingFactual || !propertyInput} className="px-10 py-4 bg-[#0f172a] text-white font-black rounded-2xl hover:bg-black transition-all flex items-center gap-3 uppercase tracking-tighter shadow-xl">
              {isAnalyzing || isFetchingFactual ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} className="text-[#f43f5e]" />}
              {isFetchingFactual ? 'FETCHING DATA...' : 'UNDERWRITE'}
            </button>
          </div>
          {analysisError && <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4"><AlertTriangle size={20} className="text-[#f43f5e]" /><p className="text-[10px] font-black uppercase text-[#f43f5e] tracking-widest">{analysisError}</p></div>}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 z-[60] overflow-hidden">
              {suggestions.map((s, idx) => (<button key={idx} onClick={() => { runAnalysis(s); setShowSuggestions(false); }} className="w-full text-left px-8 py-4 text-xs font-black text-slate-700 hover:bg-slate-50 border-b last:border-0 uppercase tracking-tight">{s}</button>))}
            </div>
          )}
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && insight && (
          <div className="space-y-4 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
            <div className="rounded-3xl bg-[#0f172a] shadow-2xl relative overflow-hidden border border-white/5 min-h-[300px]">
              <div className="p-6 lg:p-8 relative z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-[#f43f5e] font-black text-[9px] uppercase tracking-[0.3em]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] animate-pulse" />
                        {strategy} AUDIT • REAL-TIME DATA
                      </div>

                      <div className="h-4 w-[1px] bg-white/10" />

                      <div className="flex gap-2">
                        {insight && (
                          <>
                            <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-400/20 rounded text-[8px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                              <Building2 size={10} /> RentCast Verified
                            </div>
                            {isUsingWebData ? (
                              <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-400/20 rounded text-[8px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Sparkles size={10} /> Web Market Intel
                              </div>
                            ) : (
                              <div className="px-2 py-0.5 bg-purple-500/10 border border-purple-400/20 rounded text-[8px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Zap size={10} /> AI Enhanced
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={exportUnderwritingReport} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 border border-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-lg"><Printer size={12} /> EXPORT PDF</button>
                      <button onClick={saveAssessment} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f43f5e] hover:bg-[#e11d48] rounded-lg text-[9px] font-black uppercase tracking-widest shadow-xl"><Save size={12} /> SAVE</button>
                    </div>
                  </div>
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-3 group"><h2 className="text-2xl lg:text-3xl font-black tracking-tighter leading-none text-white">{displayedAddress}</h2><a href={`https://www.zillow.com/homes/for_sale/${encodeURIComponent(displayedAddress)}_rb/`} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 hover:bg-[#f43f5e] hover:scale-110 rounded-full transition-all text-white"><Map size={14} /></a></div>
                    <div className="flex gap-6 text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">
                      <span className="flex gap-2 items-center border-r border-white/10 pr-6 last:border-0"><Home size={14} className="text-[#f43f5e]" /> {insight.beds} BEDS</span>
                      <span className="flex gap-2 items-center border-r border-white/10 pr-6 last:border-0"><Layers size={14} className="text-[#3b82f6]" /> {insight.baths} BATHS</span>
                      <span className="flex gap-2 items-center border-r border-white/10 pr-6 last:border-0"><Ruler size={14} className="text-[#10b981]" /> {insight.sqft.toLocaleString()} SQFT</span>
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
                    <div className="relative"><span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">$</span><input type="text" value={new Intl.NumberFormat().format(baseConfig.price)} onChange={(e) => handleInputChange('price', e.target.value)} className="bg-transparent border-none pl-5 py-0 text-2xl font-black text-white w-full outline-none" /></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="p-5 bg-white rounded-xl border border-slate-100 flex flex-col justify-between min-h-[120px]">
                <div><h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">CAPITAL STRATEGY</h4><div className="space-y-2"><div className="flex justify-between text-[11px] font-black"><span className="text-slate-400">DOWN PMT</span><span>{formatCurrency(cashPortion)}</span></div><div className="flex justify-between text-[11px] font-black"><span className="text-[#f43f5e]">HELOC</span><span className="text-[#f43f5e]">{formatCurrency(helocPortion)}</span></div></div></div>
                <input type="range" min="0" max="100" value={baseConfig.helocFundingPercent} onChange={(e) => handleInputChange('helocFundingPercent', e.target.value)} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#f43f5e] mt-3" />
              </div>
              <div className="p-5 bg-white rounded-xl border border-slate-100 flex flex-col justify-between min-h-[120px]">
                <div><div className="flex justify-between items-center mb-3"><h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">MGMT MODE</h4><div className="p-1 bg-indigo-500/20 rounded-full text-[#818cf8]"><ShieldPlus size={12} /></div></div><div className="space-y-2"><div className="flex justify-between text-[11px] font-black"><span className="text-slate-400">SELECTION</span><span>{getManagementLabel(baseConfig.mgmtFeePercent).split(' ')[0]}</span></div><div className="flex justify-between text-[11px] font-black"><span className="text-slate-400">EST. COST</span><span className="text-[#818cf8]">{formatCurrency(year1Data?.mgmtFee || 0)}</span></div></div></div>
                <input type="range" min="0" max="2" step="1" value={getManagementIndex(baseConfig.mgmtFeePercent)} onChange={handleManagementSliderChange} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#818cf8] mt-3" />
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center"><div className="flex items-center gap-1 mb-1"><p className="text-[9px] font-black text-[#10b981] uppercase tracking-widest">PROFIT (Y1)</p></div><p className={`text-2xl font-black tracking-tighter leading-none ${annualProfit < 0 ? 'text-[#f43f5e]' : 'text-[#10b981]'}`}>{formatCurrency(annualProfit)}</p></div>
              <div className="p-4 bg-white rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center"><div className="flex items-center gap-1 mb-1"><p className="text-[9px] font-black text-[#818cf8] uppercase tracking-widest">OWNER SURPLUS</p></div><p className={`text-2xl font-black tracking-tighter leading-none ${annualSurplus < 0 ? 'text-[#f43f5e]' : 'text-slate-900'}`}>{formatCurrency(annualSurplus)}</p></div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-100 mb-6">
              <div className="flex justify-between items-center mb-4"><h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">REVENUE AMENITIES</h4><div className="flex gap-6 text-[13px] font-black uppercase items-center"><span className="text-[#f43f5e]">ADR: {formatCurrency(currentRateValue)}</span><span className="text-[#10b981]">OCC: {year1Data?.occupancy.toFixed(0)}%</span></div></div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {amenities.filter(a => a.active).map(am => (
                  <div key={am.id} className="relative">
                    <button onClick={() => toggleAmenity(am.id)} className={`w-full p-3 rounded-lg border transition-all flex flex-col gap-1 text-left ${selectedAmenityIds.includes(am.id) ? 'bg-[#f43f5e] border-[#fb7185] text-white shadow-lg' : 'bg-[#1e293b] border-white/5 text-slate-400'}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#f43f5e]">{getAmenityIcon(am.icon)}</span>
                        <span className="text-[8px] font-black uppercase truncate">{am.name}</span>
                        {am.id === 'furnishings' && (
                          <span
                            onClick={(e) => { e.stopPropagation(); setShowFurnishingDropdown(!showFurnishingDropdown); }}
                            className="ml-auto p-1 hover:bg-white/20 rounded transition-colors cursor-pointer"
                          >
                            <ChevronDown size={10} className={`transition-transform ${showFurnishingDropdown ? 'rotate-180' : ''}`} />
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col"><span className="text-[11px] font-black">${am.cost.toLocaleString()}</span></div>
                    </button>
                  </div>
                ))}
              </div>
              {/* Furnishing Breakdown Dropdown */}
              {showFurnishingDropdown && (
                <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div><label className="text-[9px] font-bold text-slate-500">Beds</label><input type="number" value={furnishingBreakdown.beds} onChange={(e) => setFurnishingBreakdown({ ...furnishingBreakdown, beds: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm font-semibold" /></div>
                    <div><label className="text-[9px] font-bold text-slate-500">$/Bed</label><input type="number" value={furnishingBreakdown.costPerBed} onChange={(e) => setFurnishingBreakdown({ ...furnishingBreakdown, costPerBed: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm font-semibold" /></div>
                    <div><label className="text-[9px] font-bold text-slate-500">Baths</label><input type="number" value={furnishingBreakdown.baths} onChange={(e) => setFurnishingBreakdown({ ...furnishingBreakdown, baths: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm font-semibold" /></div>
                    <div><label className="text-[9px] font-bold text-slate-500">$/Bath</label><input type="number" value={furnishingBreakdown.costPerBath} onChange={(e) => setFurnishingBreakdown({ ...furnishingBreakdown, costPerBath: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm font-semibold" /></div>
                    <div><label className="text-[9px] font-bold text-slate-500">Living</label><input type="number" value={furnishingBreakdown.livingRoom} onChange={(e) => setFurnishingBreakdown({ ...furnishingBreakdown, livingRoom: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm font-semibold" /></div>
                    <div><label className="text-[9px] font-bold text-slate-500">Kitchen</label><input type="number" value={furnishingBreakdown.kitchenDining} onChange={(e) => setFurnishingBreakdown({ ...furnishingBreakdown, kitchenDining: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm font-semibold" /></div>
                    <div><label className="text-[9px] font-bold text-slate-500">Tech/Decor</label><input type="number" value={furnishingBreakdown.techDecor} onChange={(e) => setFurnishingBreakdown({ ...furnishingBreakdown, techDecor: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm font-semibold" /></div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col h-full"><div className="flex items-center gap-3 mb-5"><div className="p-2.5 bg-red-50 rounded-xl text-[#f43f5e]"><Building2 size={16} /></div><h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Snapshot</h3></div><BulletContent text={insight.snapshot} /></div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col h-full"><div className="flex items-center gap-3 mb-5"><div className="p-2.5 bg-amber-50 rounded-xl text-amber-500"><ShieldAlert size={16} /></div><h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Regulations</h3></div><BulletContent text={insight.regulations} /></div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col h-full"><div className="flex items-center gap-3 mb-5"><div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-500"><Calculator size={16} /></div><h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Break-Even</h3></div><BulletContent text={insight.breakEvenAnalysis} /></div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col h-full"><div className="flex items-center gap-3 mb-5"><div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-500"><ShieldCheck size={16} /></div><h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Recommendation</h3></div><div className="p-6 bg-[#0f172a] rounded-xl text-white flex-1"><BulletContent text={insight.recommendation} isDark /></div></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col"><div className="flex items-center gap-3 mb-8 border-b pb-6"><div className="p-3 bg-rose-50 rounded-xl text-rose-500"><MapPin size={18} /></div><h3 className="text-[11px] font-black uppercase tracking-[0.3em]">Market Comps</h3></div><div className="space-y-3">{insight.comps.slice(0, 3).map((c, i) => (<div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition-all group"><p className="text-[11px] font-black text-slate-800 truncate mb-2 uppercase">{c.address}</p><div className="flex justify-between text-[10px] font-black uppercase tracking-tight"><div className="flex gap-3"><span className="text-slate-400">{c.price}</span><span className="text-emerald-600">{c.annualRevenue} REV</span></div><div className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md">{((parseInt(c.annualRevenue.replace(/[^0-9]/g, '')) / (parseInt(c.price.replace(/[^0-9]/g, '')) || 1)) * 100).toFixed(1)}% YIELD</div></div></div>))}</div></div>
              <div className="lg:col-span-2"><PropertyChat insight={insight} config={baseConfig} /></div>
            </div>

            {/* ADVANCED ANALYSIS SECTION */}
            <div className="mt-12 pt-8 border-t border-slate-200">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight">Advanced Analysis</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI-Powered Deep Dive Tools</p>
                  </div>
                </div>
              </div>

              {/* 2x2 Grid of Advanced Components */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Sensitivity Analysis */}
                <SensitivityTable
                  data={sensitivityData}
                  isLoading={isLoadingSensitivity}
                  onRefresh={handleRunSensitivity}
                />

                {/* Amenity ROI */}
                <AmenityROIPanel
                  data={amenityROIData}
                  isLoading={isLoadingAmenityROI}
                  onRefresh={handleRunAmenityROI}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Path to Yes */}
                <PathToYesPanel
                  data={pathToYesData}
                  isLoading={isLoadingPathToYes}
                  onRefresh={handleRunPathToYes}
                  liveKpis={{
                    capRate: capRate,
                    cashOnCash: cashOnCash,
                    dscr: totalDscr  // Use Total DSCR for consistency
                  }}
                  targets={investmentTargets}  // Use dynamic targets from state
                />

                {/* Lender Packet Export */}
                <LenderPacketExport
                  packet={lenderPacket}
                  isLoading={isLoadingLenderPacket}
                  onGenerate={handleGenerateLenderPacket}
                />
              </div>
            </div>

            {/* Sources & Citations */}
            {insight.sources && insight.sources.length > 0 && (
              <div className="mt-8 pt-8 border-t border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                    <FileText size={16} />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Data Sources & Citations</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {insight.sources.map((source, idx) => (
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
                  ))}
                </div>
              </div>
            )}
          </div>
        )
        }

        {/* OTHER TABS */}
        {activeTab === 'analytics' && <div className="max-w-[1600px] mx-auto"><Charts data={monthlyData} /></div>}
        {activeTab === 'monthly' && <div className="max-w-[1600px] mx-auto"><FinancialTables data={monthlyData} title={`${strategy} Monthly Cash Flow`} /></div>}
        {activeTab === 'yearly' && <div className="max-w-[1600px] mx-auto"><FinancialTables data={yearlyData} title={`${strategy} Yearly Cash Flow`} isYearly /></div>}
        {
          activeTab === 'assumptions' && (
            <div className="space-y-6 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-500">
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
                <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tighter flex items-center gap-4"><div className="p-3 bg-rose-50 rounded-xl text-[#f43f5e]"><Settings size={24} /></div> Global Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
                  {[{ label: 'Purchase Price $', field: 'price' }, { label: 'Down Pmt %', field: 'downPaymentPercent' }, { label: 'Mortgage Rate %', field: 'mortgageRate' }, { label: 'HELOC Funding %', field: 'helocFundingPercent' }, { label: 'HELOC Rate %', field: 'helocRate' }, { label: 'Target STR ADR $', field: 'adr' }, { label: 'Target MTR Rent $', field: 'mtrMonthlyRent' }, { label: 'Target LTR Rent $', field: 'ltrMonthlyRent' }, { label: 'STR Occupancy %', field: 'occupancyPercent' }, { label: 'Mgmt Fee %', field: 'mgmtFeePercent' }, { label: 'Maintenance %', field: 'maintenancePercent' }, { label: 'Fixed Opex / Mo $', field: 'fixedOpexMonthly' }, { label: 'Prop. Tax / Mo $', field: 'propertyTaxMonthly' }, { label: 'Prop. Tax Rate %', field: 'annualPropertyTaxRate' }, { label: 'HELOC Allocation %', field: 'helocPaydownPercent' }, { label: 'Ann. Appreciation %', field: 'annualAppreciationRate' }, { label: 'Ann. Rent Growth %', field: 'annualRentGrowthRate' }, { label: 'Ann. Inflation %', field: 'annualExpenseInflationRate' }].map(item => (
                    <div key={item.field} className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase">{item.label}</label><input type="text" value={item.label.includes('$') ? new Intl.NumberFormat().format((baseConfig as any)[item.field]) : (baseConfig as any)[item.field]} onChange={(e) => handleInputChange(item.field as any, e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black outline-none" /></div>
                  ))}
                </div>
              </div>

              {/* Investment Targets Section */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><Target size={24} /></div>
                    Investment Targets
                  </h2>
                  <button
                    onClick={() => setInvestmentTargets({ minCapRate: 6, minCoC: 10, minDSCR: 1.25 })}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest"
                  >
                    Reset to Defaults
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Min Cap Rate %</label>
                    <input
                      type="number"
                      value={investmentTargets.minCapRate}
                      onChange={(e) => setInvestmentTargets({ ...investmentTargets, minCapRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Min Cash-on-Cash %</label>
                    <input
                      type="number"
                      value={investmentTargets.minCoC}
                      onChange={(e) => setInvestmentTargets({ ...investmentTargets, minCoC: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Min DSCR</label>
                    <input
                      type="number"
                      step="0.01"
                      value={investmentTargets.minDSCR}
                      onChange={(e) => setInvestmentTargets({ ...investmentTargets, minDSCR: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black outline-none"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  These targets are used by Path to Yes to determine deal status. Changes are saved automatically.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
                <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tighter flex items-center gap-4"><div className="p-3 bg-rose-50 rounded-xl text-[#f43f5e]"><Sparkles size={24} /></div> Property Amenities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {amenities.map(am => (
                    <div key={am.id} className="p-6 border rounded-2xl bg-white">
                      <div className="flex justify-between mb-4"><p className="font-black uppercase">{am.name}</p></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400">COST ($)</label><input type="number" value={am.cost} onChange={(e) => handleEditAmenity(am.id, { cost: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 rounded-xl px-4 py-2" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400">ADR BOOST</label><input type="number" value={am.adrBoost} onChange={(e) => handleEditAmenity(am.id, { adrBoost: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 rounded-xl px-4 py-2" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        }

        {/* PORTFOLIO TAB */}
        {
          activeTab === 'portfolio' && (
            <div className="space-y-6 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tighter text-slate-900">My Portfolio</h2>
                {savedAssessments.length > 1 && (
                  <button
                    onClick={toggleComparisonMode}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${comparisonMode
                      ? 'bg-[#f43f5e] text-white shadow-lg'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-[#f43f5e]'
                      }`}
                  >
                    <ArrowLeftRight size={14} />
                    {comparisonMode ? 'Exit Compare' : 'Compare Properties'}
                  </button>
                )}
              </div>

              {comparisonMode && selectedForComparison.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-indigo-600" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-indigo-900">
                      {selectedForComparison.length} {selectedForComparison.length === 1 ? 'Property' : 'Properties'} Selected
                    </span>
                  </div>
                  {selectedForComparison.length >= 2 && (
                    <button
                      onClick={() => setShowComparisonModal(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest"
                    >
                      View Comparison
                    </button>
                  )}
                </div>
              )}

              {savedAssessments.length === 0 ? (
                <div className="py-32 px-10 bg-white rounded-[3rem] border border-slate-100 shadow-xl flex flex-col items-center justify-center">
                  <div className="w-24 h-24 bg-[#0f172a] rounded-[2.5rem] flex items-center justify-center text-white mb-10">
                    <Briefcase size={40} className="text-[#f43f5e]" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Portfolio Empty</h3>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.3em] max-w-2xl text-center">
                    Analyze a property and click "SAVE" to build your portfolio.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedAssessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className={`bg-white rounded-2xl border-2 transition-all overflow-hidden ${comparisonMode && selectedForComparison.includes(assessment.id)
                        ? 'border-[#f43f5e] shadow-lg'
                        : 'border-slate-100 hover:border-slate-200'
                        }`}
                    >
                      {comparisonMode && (
                        <div className="bg-slate-50 border-b border-slate-100 p-3 flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedForComparison.includes(assessment.id)}
                              onChange={() => togglePropertyForComparison(assessment.id)}
                              disabled={selectedForComparison.length >= 4 && !selectedForComparison.includes(assessment.id)}
                              className="w-4 h-4 rounded border-2 border-slate-300 text-[#f43f5e] focus:ring-[#f43f5e] focus:ring-2 cursor-pointer disabled:opacity-50"
                            />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                              Select for Comparison
                            </span>
                          </label>
                          {selectedForComparison.length >= 4 && !selectedForComparison.includes(assessment.id) && (
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Max 4</span>
                          )}
                        </div>
                      )}

                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-sm font-black text-slate-900 mb-1 leading-tight">
                              {assessment.address}
                            </h3>
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                              <span>{assessment.strategy}</span>
                              <span>•</span>
                              <span>{new Date(assessment.timestamp).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {!comparisonMode && (
                            <button
                              onClick={() => deleteSaved(assessment.id)}
                              className="p-2 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash size={14} className="text-slate-400 hover:text-rose-500" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="bg-slate-50 rounded-lg p-3">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Cap Rate</div>
                            <div className="text-lg font-black text-slate-900">{assessment.capRate.toFixed(2)}%</div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-3">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">CoC</div>
                            <div className="text-lg font-black text-slate-900">
                              {assessment.cashOnCash >= 1000 ? '∞' : `${assessment.cashOnCash.toFixed(2)}%`}
                            </div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-3">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Price</div>
                            <div className="text-sm font-black text-slate-900">${(assessment.price / 1000).toFixed(0)}k</div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-3">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">NOI</div>
                            <div className="text-sm font-black text-slate-900">${(assessment.annualNoi / 1000).toFixed(1)}k</div>
                          </div>
                        </div>

                        {!comparisonMode && (
                          <button
                            onClick={() => {
                              setPropertyInput(assessment.address);
                              setDisplayedAddress(assessment.address);
                              setStrategy(assessment.strategy);
                              setActiveTab('dashboard');
                              runAnalysis();
                            }}
                            className="w-full px-4 py-2 bg-[#0f172a] hover:bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                          >
                            View Analysis
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        }

        {/* EMPTY STATE */}
        {
          !insight && activeTab === 'dashboard' && (
            <div className="py-32 px-10 bg-white rounded-[3rem] border border-slate-100 shadow-xl max-w-6xl mx-auto flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700">
              <div className="w-24 h-24 bg-[#0f172a] rounded-[2.5rem] flex items-center justify-center text-white mb-10 rotate-3"><Search size={40} className="text-[#f43f5e]" /></div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter mb-6">Ready to Analyze your <span className="text-[#f43f5e]">Next Deal?</span></h2>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.3em] max-w-2xl text-center mb-16">Enter an address above to generate a professional-grade underwrite audit in seconds.</p>
            </div>
          )
        }
      </main >

      {/* COMPARISON MODAL */}
      {
        showComparisonModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="bg-[#0f172a] text-white p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tighter">Property Comparison</h2>
                  <p className="text-sm text-slate-400 mt-1">Comparing {selectedForComparison.length} properties</p>
                </div>
                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-auto p-6">
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedForComparison.length}, minmax(250px, 1fr))` }}>
                  {savedAssessments
                    .filter(a => selectedForComparison.includes(a.id))
                    .map((assessment) => (
                      <div key={assessment.id} className="bg-slate-50 rounded-2xl p-5 border-2 border-slate-200">
                        {/* Property Header */}
                        <div className="mb-4 pb-4 border-b border-slate-200">
                          <h3 className="text-sm font-black text-slate-900 mb-2 leading-tight">
                            {assessment.address}
                          </h3>
                          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <span>{assessment.strategy}</span>
                            <span>•</span>
                            <span>{new Date(assessment.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="space-y-3">
                          <div className="bg-white rounded-lg p-3">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Purchase Price</div>
                            <div className="text-xl font-black text-slate-900">${(assessment.price / 1000).toFixed(0)}k</div>
                          </div>

                          <div className="bg-white rounded-lg p-3">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Cap Rate</div>
                            <div className="text-xl font-black text-[#10b981]">{assessment.capRate.toFixed(2)}%</div>
                          </div>

                          <div className="bg-white rounded-lg p-3">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Cash-on-Cash</div>
                            <div className="text-xl font-black text-[#3b82f6]">
                              {assessment.cashOnCash >= 1000 ? '∞' : `${assessment.cashOnCash.toFixed(2)}%`}
                            </div>
                          </div>

                          <div className="bg-white rounded-lg p-3">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Annual NOI</div>
                            <div className="text-xl font-black text-slate-900">${(assessment.annualNoi / 1000).toFixed(1)}k</div>
                          </div>

                          <div className="bg-white rounded-lg p-3">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Beds / Baths</div>
                            <div className="text-lg font-black text-slate-900">{assessment.insight.beds} / {assessment.insight.baths}</div>
                          </div>

                          <div className="bg-white rounded-lg p-3">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Square Feet</div>
                            <div className="text-lg font-black text-slate-900">{parseInt(assessment.insight.sqft).toLocaleString()}</div>
                          </div>

                          <div className="bg-white rounded-lg p-3">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">ADR</div>
                            <div className="text-lg font-black text-slate-900">${assessment.config.adr.toFixed(0)}</div>
                          </div>

                          <div className="bg-white rounded-lg p-3">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Occupancy</div>
                            <div className="text-lg font-black text-slate-900">{assessment.config.occupancyPercent.toFixed(0)}%</div>
                          </div>
                        </div>

                        {/* View Button */}
                        <button
                          onClick={() => {
                            setPropertyInput(assessment.address);
                            setDisplayedAddress(assessment.address);
                            setStrategy(assessment.strategy);
                            setShowComparisonModal(false);
                            setActiveTab('dashboard');
                            runAnalysis();
                          }}
                          className="w-full mt-4 px-4 py-2 bg-[#0f172a] hover:bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                          View Full Analysis
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 p-4 flex items-center justify-between border-t border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  Select properties from the Portfolio tab to compare
                </p>
                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="px-6 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default App;
