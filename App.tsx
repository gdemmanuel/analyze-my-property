import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import {
  Search, Loader2, BarChart3, Calendar, TrendingUp
} from 'lucide-react';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { useToast } from './components/ui/ToastContext';
import ProgressIndicator, { useAnalysisProgress } from './components/ui/ProgressIndicator';
import { PropertyConfig, MarketInsight, SavedAssessment, Amenity, RentalStrategy } from './types';
import { DEFAULT_CONFIG, AMENITIES } from './constants';
import { calculateMonthlyProjections, aggregateToYearly } from './utils/financialLogic';
import { formatCurrency } from './utils/formatCurrency';
import { exportUnderwritingReport } from './utils/exportReport';
import { analyzeProperty, suggestAmenityImpact, searchWebForSTRData, runSensitivityAnalysis, runAmenityROI, calculatePathToYes, generateLenderPacket, onRateLimitCountdown, estimateAmenityCosts, estimateCustomAmenityCost } from './services/claudeService';
import { SensitivityMatrix, AmenityROIResult, PathToYes, LenderPacket } from './prompts/underwriting';
import { Save } from 'lucide-react';
const Charts = React.lazy(() => import('./components/Charts'));
const FinancialTables = React.lazy(() => import('./components/FinancialTables'));
import { fetchPropertyData, fetchMarketStats, fetchRentEstimate, fetchSTRData, fetchSTRComps, RentCastProperty, extractMarketTrends, getBedroomMatchedStats, MarketStats } from './services/rentcastService';
import { useRentCastData, useWebSTRData, usePropertyAnalysis } from './src/hooks/usePropertyData';
import { supabase } from './src/lib/supabase';
import type { User } from '@supabase/supabase-js';

// Extracted components
import NavBar from './components/NavBar';
import SearchBar from './components/SearchBar';
import DashboardTab from './components/DashboardTab';
import SettingsTab from './components/SettingsTab';
const RentCastDataTab = React.lazy(() => import('./components/RentCastDataTab'));
const AdminTab = React.lazy(() => import('./components/AdminTab'));
const PortfolioTab = React.lazy(() => import('./components/PortfolioTab'));
import ComparisonModal from './components/ComparisonModal';
import { AuthModal } from './components/AuthModal';
import { UserMenu } from './components/UserMenu';
import { DataMigrationNotice } from './components/DataMigration';


const App: React.FC = () => {
  const toast = useToast();
  const progress = useAnalysisProgress();
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [userTier, setUserTier] = useState<'free' | 'pro'>('free');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'signin' | 'signup'>('signin');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  const [baseConfig, setBaseConfig] = useState<PropertyConfig>(DEFAULT_CONFIG);
  const [amenities, setAmenities] = useState<Amenity[]>(AMENITIES);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>(['furnishings']);
  const [strategy, setStrategy] = useState<RentalStrategy>('STR');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rentcast' | 'analytics' | 'monthly' | 'yearly' | 'portfolio' | 'assumptions' | 'admin'>('dashboard');
  const [propertyInput, setPropertyInput] = useState('');
  const [displayedAddress, setDisplayedAddress] = useState('');
  const [targetAddress, setTargetAddress] = useState(''); // Address to analyze (triggers React Query)
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisErrorShowUpgrade, setAnalysisErrorShowUpgrade] = useState(false);
  const [insight, setInsight] = useState<MarketInsight | null>(null);
  const [savedAssessments, setSavedAssessments] = useState<SavedAssessment[]>([]);
  const [showSaveToast, setShowSaveToast] = useState(false);

  const [newAmenityName, setNewAmenityName] = useState('');
  const [isSuggestingAmenity, setIsSuggestingAmenity] = useState(false);

  // Grounding & Verification State
  const [rentCastData, setRentCastData] = useState<RentCastProperty | null>(null);
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
  
  // Amenity cost estimation state (background task)
  const [amenityCosts, setAmenityCosts] = useState<any>(null);
  const [isEstimatingAmenityCosts, setIsEstimatingAmenityCosts] = useState(false);
  
  // Amenity estimation toggle (opt-in to save API calls)
  const [includeAmenityEstimation, setIncludeAmenityEstimation] = useState(false);
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

  // Rate Limit Countdown State
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  // Stripe upgrade handler — redirect to Stripe Checkout
  const handleUpgrade = React.useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setAuthModalInitialMode('signup');
      setShowAuthModal(true);
      toast.info('Sign in first to upgrade to Pro.');
      return;
    }
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ returnUrlBase: window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to start checkout');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error('Unable to connect to payment service. Please try again.');
    }
  }, [toast]);

  // Stripe portal handler — redirect to Stripe Customer Portal
  const handleManageSubscription = React.useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to open subscription portal');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error('Unable to connect to payment service. Please try again.');
    }
  }, [toast]);

  // Expose globally so server-side upgrade links can trigger it
  React.useEffect(() => {
    (window as any).__triggerUpgrade = handleUpgrade;
  }, [handleUpgrade]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Handle Stripe checkout return: sync tier from Stripe (fallback if webhook missed)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) {
          fetch('/api/stripe/sync-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.updated || data.tier === 'pro') setUserTier('pro');
              toast.success('Welcome to Pro! Your upgrade is active.');
            })
            .catch(() => toast.success('Welcome to Pro! Your upgrade is active.'));
        } else {
          toast.success('Payment received. Sign in to see your Pro subscription.');
        }
      });
    } else if (params.get('upgrade') === 'cancelled') {
      toast.info('Upgrade cancelled. You can upgrade anytime from your profile.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Auth: Check for active session and listen for auth changes
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoadingAuth(false);
      
      // Fetch user tier from profiles
      if (session?.user) {
        // Close auth modal if user just signed in
        setShowAuthModal(false);
        
        fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data.tier) setUserTier(data.tier);
            if (data.is_admin !== undefined) setIsAdmin(data.is_admin);
            setTrialEndsAt(data.inTrial && data.trialEndsAt ? data.trialEndsAt : null);
          })
          .catch(err => console.error('Failed to fetch user tier:', err));
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Close auth modal on successful sign-in
        setShowAuthModal(false);
        
        // Fetch tier on auth change
        fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data.tier) setUserTier(data.tier);
            if (data.is_admin !== undefined) setIsAdmin(data.is_admin);
            setTrialEndsAt(data.inTrial && data.trialEndsAt ? data.trialEndsAt : null);
          })
          .catch(err => console.error('Failed to fetch user tier:', err));
        
        // Load saved assessments from database
        fetch('/api/user/assessments', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setSavedAssessments(data);
            }
          })
          .catch(err => console.error('Failed to fetch assessments:', err));
      } else {
        // User signed out - clear local storage for privacy
        localStorage.removeItem('airroi_v40');
        localStorage.removeItem('investmentTargets');
        localStorage.removeItem('airroi_global_settings');
        
        setSavedAssessments([]);
        setUserTier('free');
        setIsAdmin(false);
        setTrialEndsAt(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load investment targets from localStorage
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

  // Load global settings (baseConfig) from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('airroi_global_settings');
    if (saved) {
      try {
        setBaseConfig(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load global settings:', e);
      }
    }
  }, []);

  // Save global settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('airroi_global_settings', JSON.stringify(baseConfig));
  }, [baseConfig]);

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

  // ============================================================================
  // REACT QUERY HOOKS - Automatic caching and data fetching
  // ============================================================================
  
  // Fetch RentCast data (property, market stats, rent estimate, rental listings) in parallel
  const rentCastQueries = useRentCastData(targetAddress, !!targetAddress);
  const { property: propertyQuery, marketStats: marketStatsQuery, rentEstimate: rentEstimateQuery, rentalListings: rentalListingsQuery } = rentCastQueries;
  
  // Extract comps from rent estimate
  const strComps = useMemo(() => {
    const rentRes = rentEstimateQuery.data;
    if (rentRes?.comparableProperties && Array.isArray(rentRes.comparableProperties) && rentRes.comparableProperties.length > 0) {
      return rentRes.comparableProperties.slice(0, 5).map((comp: any) => ({
        address: comp.formattedAddress || comp.address,
        formattedAddress: comp.formattedAddress || comp.address,
        price: comp.rent || comp.listedPrice || comp.price,
        bedrooms: comp.bedrooms,
        bathrooms: comp.bathrooms,
        squareFootage: comp.squareFootage,
        distance: comp.distance || 0,
        annualRevenue: (comp.rent || comp.listedPrice || comp.price || 0) * 12
      }));
    }
    return null;
  }, [rentEstimateQuery.data]);

  // Extract market trends for charts (Tier 2G)
  const marketTrends = useMemo(() => {
    if (!marketStatsQuery.data) return { saleTrends: [], rentalTrends: [] };
    return extractMarketTrends(marketStatsQuery.data as MarketStats);
  }, [marketStatsQuery.data]);

  // Get bedroom-matched stats (Tier 2I)
  const bedroomStats = useMemo(() => {
    if (!marketStatsQuery.data || !propertyQuery.data?.bedrooms) return { sale: undefined, rental: undefined };
    return getBedroomMatchedStats(marketStatsQuery.data as MarketStats, propertyQuery.data.bedrooms);
  }, [marketStatsQuery.data, propertyQuery.data?.bedrooms]);

  // Fetch web STR data - React Query handles caching automatically
  // CRITICAL: Only enable after property data is loaded to ensure stable query key
  const webSTRQuery = useWebSTRData(
    targetAddress,
    propertyQuery.data?.bedrooms,
    propertyQuery.data?.bathrooms,
    !!targetAddress && propertyQuery.isSuccess // Wait for property data before enabling
  );

  // Prepare STR data (from web search only - RentCast doesn't provide STR data)
  const strData = useMemo(() => {
    if (webSTRQuery.data) {
      return {
        rent: webSTRQuery.data.adr,
        occupancy: webSTRQuery.data.occupancy / 100,
        source: 'web_search'
      };
    }
    return null;
  }, [webSTRQuery.data]);

  // Track web data badge state (side effect must be in useEffect, not useMemo)
  useEffect(() => {
    setIsUsingWebData(!!webSTRQuery.data);
  }, [webSTRQuery.data]);

  // Main property analysis (runs after all data is fetched)
  const canAnalyze = 
    !!targetAddress &&
    propertyQuery.isSuccess && 
    marketStatsQuery.isSuccess && 
    rentEstimateQuery.isSuccess && 
    (webSTRQuery.isSuccess || webSTRQuery.isError) && // Allow if either success or failed
    (strData !== undefined); // strData can be null (failed web search) but should be defined
  
  const analysisQuery = usePropertyAnalysis(
    targetAddress,
    propertyQuery.data || null,
    marketStatsQuery.data,
    rentEstimateQuery.data,
    strData,
    strComps,
    canAnalyze && !!user // only run analysis when logged in
  );

  // Update state when analysis completes OR when cached data is available
  useEffect(() => {
    if (!isAnalyzing) return;
    if (!analysisQuery.isSuccess || !analysisQuery.data) return;
    
    const result = analysisQuery.data;
    const factual = propertyQuery.data;
    
    if (factual?.mainImage) {
      result.mainImage = factual.mainImage;
    }

    setInsight(result);
    setDisplayedAddress(targetAddress);
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
        occupancyPercent: strData?.occupancy ? Math.round(strData.occupancy * 100) : (result.suggestedOccupancy || prev.occupancyPercent),
        propertyTaxMonthly: factual?.taxMonthly || monthlyTax || prev.propertyTaxMonthly,
        hoaMonthly: factual?.hoaMonthly || result.suggestedHOA || prev.hoaMonthly,
        cleaningFeeIncome: (result.suggestedCleaningFee * 8) || prev.cleaningFeeIncome,
        cleaningExpense: (result.suggestedCleaningFee * 7.5) || prev.cleaningExpense,
        adr: strData?.rent || result.proFormaScenarios?.[1]?.adr || result.suggestedADR || prev.adr,
        mtrMonthlyRent: result.suggestedMTRRent || prev.mtrMonthlyRent,
        ltrMonthlyRent: result.suggestedLTRRent || prev.ltrMonthlyRent
      }));
      
      // Debug logging to see which ADR source is being used
      if (import.meta.env.DEV) {
        const selectedAdr = strData?.rent || result.proFormaScenarios?.[1]?.adr || result.suggestedADR || prev.adr;
        console.log('[App] ADR Source Prioritization:', {
          'strData (Web Search)': strData?.rent ? `✅ $${strData.rent}` : '❌ null/undefined',
          'proFormaScenarios[1]': result.proFormaScenarios?.[1]?.adr ? `$${result.proFormaScenarios[1].adr}` : 'undefined',
          'suggestedADR (Claude)': result.suggestedADR ? `$${result.suggestedADR}` : 'undefined',
          'SELECTED': `$${selectedAdr}`,
          'strData full object': strData
        });
      }
      setActiveTab('dashboard');
      setIsAnalyzing(false);
      setAnalysisError(null);
      setAnalysisErrorShowUpgrade(false);
      progress.reset();
      
      // Clear advanced analysis when new property is analyzed
      setSensitivityData(null);
      setAmenityROIData(null);
      setPathToYesData(null);
      setLenderPacket(null);
      
      // Fire off background task: estimate amenity costs based on property location
      // This runs after the analysis completes so the dashboard displays immediately
      // Only if user has opted in (to save API calls and reduce rate limits)
      if (includeAmenityEstimation && factual?.propertyType && marketStatsQuery.data) {
        setIsEstimatingAmenityCosts(true);
        estimateAmenityCosts(
          targetAddress,
          factual.propertyType,
          marketStatsQuery.data
        ).then((costs) => {
          if (costs) {
            setAmenityCosts(costs);
            if (import.meta.env.DEV) console.log('[App] Amenity costs estimated:', costs);
          }
          setIsEstimatingAmenityCosts(false);
        }).catch((err) => {
          console.error('[App] Failed to estimate amenity costs:', err);
          setIsEstimatingAmenityCosts(false);
        });
      }
  }, [isAnalyzing, analysisQuery.isSuccess, analysisQuery.data, analysisQuery.fetchStatus, propertyQuery.data, targetAddress, includeAmenityEstimation]);

  // Handle errors
  useEffect(() => {
    if (analysisQuery.isError) {
      const error = analysisQuery.error as any;
      console.error("Full analysis error:", error);
      setAnalysisError(error.message?.includes("429") ? "AI capacity exceeded. Please retry in 60 seconds." : `Underwriting failed: ${error.message || "Please check the address."}`);
      setAnalysisErrorShowUpgrade(false);
      setIsAnalyzing(false);
      progress.reset();
    }
  }, [analysisQuery.isError, analysisQuery.error]);

  // Track factual data loading state
  useEffect(() => {
    setIsFetchingFactual(rentCastQueries.isLoading);
  }, [rentCastQueries.isLoading]);

  // Track progress through analysis steps
  useEffect(() => {
    if (!progress.isVisible) return;
    if (analysisQuery.isSuccess) {
      progress.updateStep('complete');
    } else if (analysisQuery.isFetching || canAnalyze) {
      progress.updateStep('analysis');
    } else if (webSTRQuery.isSuccess || webSTRQuery.isFetching) {
      progress.updateStep('webSearch');
    } else if (rentEstimateQuery.isSuccess || rentEstimateQuery.isFetching) {
      progress.updateStep('rent');
    } else if (marketStatsQuery.isSuccess || marketStatsQuery.isFetching) {
      progress.updateStep('market');
    } else if (propertyQuery.isFetching || propertyQuery.isSuccess) {
      progress.updateStep('property');
    }
  }, [
    progress.isVisible,
    propertyQuery.isFetching, propertyQuery.isSuccess,
    marketStatsQuery.isFetching, marketStatsQuery.isSuccess,
    rentEstimateQuery.isFetching, rentEstimateQuery.isSuccess,
    webSTRQuery.isFetching, webSTRQuery.isSuccess,
    analysisQuery.isFetching, analysisQuery.isSuccess,
    canAnalyze
  ]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const finalConfig = useMemo(() => {
    let config = { ...baseConfig };
    let totalUpgradeCost = 0;
    let totalFurnishingCost = 0;
    if (import.meta.env.DEV) console.log('[App] finalConfig calculation - baseConfig occ:', baseConfig.occupancyPercent, 'selectedAmenities:', selectedAmenityIds);
    selectedAmenityIds.forEach(id => {
      const am = amenities.find(a => a.id === id);
      if (am) {
        if (am.id === 'furnishings') totalFurnishingCost += am.cost;
        else totalUpgradeCost += am.cost;
        if (strategy === 'STR') {
          config.adr += am.adrBoost;
          const currentOcc = config.occupancyPercent;
          // Amenity occupancy boost is a modest increment (typically 2-6%)
          // Cap total occupancy at 95% (realistic market maximum)
          const boostAmount = am.occBoost; // Use the boost value directly (already in percentage points)
          const newOcc = Math.min(95, currentOcc + Math.max(0, boostAmount));
          if (import.meta.env.DEV) console.log(`[App] Amenity ${am.name}: occBoost=${am.occBoost}, ${currentOcc}% -> ${newOcc}%`);
          config.occupancyPercent = newOcc;
        } else if (strategy === 'MTR') {
          config.mtrMonthlyRent += am.adrBoost * 10;
        } else {
          config.ltrMonthlyRent += am.adrBoost * 3;
        }
      }
    });
    if (import.meta.env.DEV) console.log('[App] finalConfig occ result:', config.occupancyPercent);
    config.upgradeCost = totalUpgradeCost;
    config.furnishingsCost = totalFurnishingCost;
    return config;
  }, [baseConfig, selectedAmenityIds, amenities, strategy]);

  const selectedAmenities = amenities.filter(a => selectedAmenityIds.includes(a.id));

  const monthlyData = useMemo(() => {
    if (!insight) return [];
    return calculateMonthlyProjections(finalConfig, 20, strategy, selectedAmenities);
  }, [finalConfig, strategy, selectedAmenities, insight]);
  
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
  const cashOnCash = cashPortion >= 1000 ? (annualProfit / cashPortion) * 100 : 0;

  // DSCR calculations
  const annualDebtService = year1Data?.mortgagePayment || 0;
  const dscr = annualDebtService > 0 ? annualNoi / annualDebtService : 0;
  const annualHelocInterest = year1Data?.helocInterest || 0;
  const totalAnnualDebtService = annualDebtService + annualHelocInterest;
  const totalDscr = totalAnnualDebtService > 0 ? annualNoi / totalAnnualDebtService : 0;

  const currentRateValue = strategy === 'STR' ? finalConfig.adr : (strategy === 'MTR' ? finalConfig.mtrMonthlyRent : finalConfig.ltrMonthlyRent);

  // ============================================================================
  // HANDLERS
  // ============================================================================

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

  // Normalize address for consistent caching
  const normalizeAddress = (address: string): string => {
    return address
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/,\s*/g, ', ');
  };

  // Ref to prevent multiple rapid analyses
  const analysisTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Check if user can run an analysis BEFORE making API calls
  const checkCanAnalyze = async (): Promise<{ canAnalyze: boolean; message?: string; showUpgradeLink?: boolean }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch('/api/check-analysis-limit', { method: 'GET', headers });
      if (!res.ok) {
        if (import.meta.env.DEV) console.error('[App] Failed to check analysis limit:', res.status);
        return { canAnalyze: true };
      }
      const data = await res.json();
      if (import.meta.env.DEV) console.log('[App] Analysis limit check:', data);
      return data;
    } catch (error) {
      if (import.meta.env.DEV) console.error('[App] Error checking analysis limit:', error);
      return { canAnalyze: true };
    }
  };

  // Simplified runAnalysis - just triggers React Query by setting targetAddress
  const runAnalysis = async (selectedAddr?: string) => {
    // Require sign-in: check session directly so we never run without auth (avoids stale state / deploy lag)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setAuthModalInitialMode('signup');
      setShowAuthModal(true);
      toast.info('Sign up or sign in to run an underwrite.');
      return;
    }

    // Prevent rapid successive clicks
    if (isAnalyzing) return;
    
    const target = selectedAddr || propertyInput;
    if (!target) return;
    
    const limitCheck = await checkCanAnalyze();
    if (!limitCheck.canAnalyze) {
      setAnalysisError(limitCheck.message || 'Unable to run analysis at this time');
      setAnalysisErrorShowUpgrade(!!limitCheck.showUpgradeLink);
      return;
    }
    setAnalysisErrorShowUpgrade(false);
    
    const normalizedAddress = normalizeAddress(target);
    
    setAnalysisError(null);
    setAnalysisErrorShowUpgrade(false);
    setPropertyInput('');
    isSelectingRef.current = true;
    setIsAnalyzing(true);
    progress.start();
    
    const isRepeatSearch = normalizedAddress === targetAddress;
    
    if (!isRepeatSearch) {
      setTargetAddress(normalizedAddress);
    }
  };

  const saveAssessment = async () => {
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
    
    // Also save to database if user is logged in
    if (user) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch('/api/user/assessments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              address: newSave.address,
              config: newSave.config,
              insight: newSave.insight,
              selectedAmenities: newSave.selectedAmenities,
              strategy: newSave.strategy,
              capRate: newSave.capRate,
              cashOnCash: newSave.cashOnCash,
              price: newSave.price,
              annualNoi: newSave.annualNoi
            })
          });
        }
      } catch (err) {
        console.error('Failed to save assessment to database:', err);
        // Silently fail - data is still in localStorage
      }
    }
  };

  const deleteSaved = async (id: string) => {
    setSavedAssessments(prev => prev.filter(a => a.id !== id));
    
    // Also delete from database if user is logged in
    if (user) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(`/api/user/assessments/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });
        }
      } catch (err) {
        console.error('Failed to delete assessment from database:', err);
        // Silently fail - deletion is still in localStorage
      }
    }
  };

  const toggleComparisonMode = () => {
    setComparisonMode(!comparisonMode);
    setSelectedForComparison([]);
  };

  const togglePropertyForComparison = (id: string) => {
    setSelectedForComparison(prev => {
      if (prev.includes(id)) return prev.filter(propId => propId !== id);
      else if (prev.length < 4) return [...prev, id];
      return prev;
    });
  };

  const handleExportReport = () => {
    exportUnderwritingReport({
      insight: insight!,
      displayedAddress,
      strategy,
      finalConfig,
      capRate,
      cashOnCash,
      cashPortion,
      annualNoi,
      annualGross,
      annualProfit,
      annualSurplus,
      grossYield,
      downPayment,
      helocPortion,
      totalUpfrontCapital,
      year1Data
    });
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

  const handleAddAmenity = async () => {
    if (!newAmenityName) return;
    setIsSuggestingAmenity(true);
    try {
      // Use the new AI-driven custom amenity cost estimation
      const aiEstimate = await estimateCustomAmenityCost(
        newAmenityName,
        displayedAddress || targetAddress,
        propertyQuery.data?.propertyType || 'Unknown',
        marketStatsQuery.data || {}
      );
      
      const cost = aiEstimate?.minCost || (aiEstimate?.maxCost && aiEstimate.minCost) ? (aiEstimate.minCost + aiEstimate.maxCost) / 2 : 5000;
      const adrBoost = aiEstimate?.adrBoost || 20;
      const occBoost = aiEstimate?.occBoost || 3;
      
      const newAm: Amenity = { 
        id: Date.now().toString(), 
        name: newAmenityName, 
        cost: Math.round(cost),
        adrBoost: adrBoost,
        occBoost: occBoost,
        icon: 'Sparkles', 
        active: true 
      };
      setAmenities(prev => [...prev, newAm]);
      setNewAmenityName('');
      toast.success(`Added ${newAmenityName} with AI-estimated costs`);
    } catch (e: any) {
      console.error('Failed to add amenity:', e);
      toast.error('Failed to analyze amenity. Please try again.');
    } finally { 
      setIsSuggestingAmenity(false); 
    }
  };

  // ============================================================================
  // ADVANCED ANALYSIS HANDLERS
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
        dscr: totalDscr
      });
      setSensitivityData(result);
      toast.success('Sensitivity analysis complete');
    } catch (e: any) {
      console.error('Sensitivity analysis failed:', e);
      toast.error(e?.message?.includes('429') 
        ? 'Rate limit exceeded. Please wait a moment and try again.' 
        : 'Sensitivity analysis failed. Please try again.');
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
      toast.success('Amenity ROI analysis complete');
    } catch (e: any) {
      console.error('Amenity ROI analysis failed:', e);
      toast.error(e?.message?.includes('429') 
        ? 'Rate limit exceeded. Please wait a moment and try again.' 
        : 'Amenity ROI analysis failed. Please try again.');
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
          dscr: totalDscr,
          ownerSurplus: annualSurplus
        },
        targets: investmentTargets,
        assumptions: {
          price: finalConfig.price,
          adr: finalConfig.adr,
          occupancy: finalConfig.occupancyPercent,
          strategy: strategy
        },
        cashInvested: cashPortion
      });
      setPathToYesData(result);
      toast.success('Path to Yes calculated');
    } catch (e: any) {
      console.error('Path to yes calculation failed:', e);
      toast.error(e?.message?.includes('429') 
        ? 'Rate limit exceeded. Please wait a moment and try again.' 
        : 'Path to Yes calculation failed. Please try again.');
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
          dscr: totalDscr,
          capRate: capRate,
          cashOnCash: cashOnCash
        },
        ownerSurplus: annualSurplus,
        assumptions: {
          price: finalConfig.price,
          downPayment: `${finalConfig.downPaymentPercent}%`,
          mortgageRate: `${finalConfig.mortgageRate}%`,
          adr: finalConfig.adr,
          occupancy: `${finalConfig.occupancyPercent}%`,
          managementMode: getManagementLabel(baseConfig.mgmtFeePercent),
          propertyTax: finalConfig.propertyTaxMonthly,
          hoaFee: finalConfig.hoaMonthly
        },
        amenities: selectedAmenities.filter(a => a.id !== 'furnishings').map(a => ({
          name: a.name,
          cost: a.cost,
          paybackMonths: a.cost / ((a.adrBoost * 30 * (finalConfig.occupancyPercent / 100)) || 1)
        })),
        // Property data valuable to lenders
        propertyDetails: propertyQuery.data ? {
          bedrooms: propertyQuery.data.bedrooms,
          bathrooms: propertyQuery.data.bathrooms,
          squareFootage: propertyQuery.data.squareFootage,
          lotSize: propertyQuery.data.lotSize,
          yearBuilt: propertyQuery.data.yearBuilt,
          propertyType: propertyQuery.data.propertyType,
          avmValueRange: propertyQuery.data.avmValueRange,
          listingType: propertyQuery.data.listingDetails?.listingType,
          daysOnMarket: propertyQuery.data.listingDetails?.daysOnMarket,
          features: propertyQuery.data.features,
          zoning: propertyQuery.data.zoning,
          taxAssessments: propertyQuery.data.taxAssessments?.slice(0, 3)
        } : undefined,
        // Market data valuable to lenders
        marketData: marketStatsQuery.data ? {
          medianPrice: marketStatsQuery.data.saleData?.medianPrice,
          medianRent: marketStatsQuery.data.rentalData?.medianRent,
          averageDaysOnMarket: marketStatsQuery.data.saleData?.averageDaysOnMarket,
          zipCode: propertyQuery.data?.zipCode
        } : undefined,
        // Comps data
        compsData: propertyQuery.data?.avmComparables?.slice(0, 3) || [],
        risks: insight.risksDiligence?.split('\n').filter(Boolean).slice(0, 5) || [],
        sources: insight.sources?.map(s => ({ title: s.title, url: s.uri })) || []
      });
      setLenderPacket(result);
      toast.success('Lender packet generated');
    } catch (e: any) {
      console.error('Lender packet generation failed:', e);
      toast.error(e?.message?.includes('429') 
        ? 'Rate limit exceeded. Please wait a moment and try again.' 
        : 'Lender packet generation failed. Please try again.');
    } finally {
      setIsLoadingLenderPacket(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col print:bg-white print:block">
      {showSaveToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-[#1e293b] text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-6 duration-500 border border-white/10 ring-8 ring-black/5">
          <div className="bg-[#f43f5e] p-2 rounded-full"><Save size={16} /></div>
          <p className="text-xs font-black uppercase tracking-widest leading-none">DEAL SAVED TO REPORTS</p>
        </div>
      )}

      {/* Rate Limit Countdown Toast */}
      {rateLimitCountdown > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-amber-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-pulse border border-amber-400 ring-8 ring-amber-500/20">
          <div className="bg-white/20 p-2 rounded-full">
            <Loader2 size={16} className="animate-spin" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest leading-none">API Rate Limit</p>
            <p className="text-lg font-black mt-1">Retrying in {rateLimitCountdown}s</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <NavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        strategy={strategy}
        setStrategy={setStrategy}
        savedCount={savedAssessments.length}
        user={user}
        userTier={userTier}
        isAdmin={isAdmin}
        onSignIn={() => { setAuthModalInitialMode('signin'); setShowAuthModal(true); }}
        onSettingsClick={() => setActiveTab('assumptions')}
        onUpgradeClick={handleUpgrade}
        onManageSubscription={handleManageSubscription}
      />

      {/* Main Content - pt-24 preserves nav spacing (CRITICAL: do not change to p-8) */}
      <main className="flex-1 pt-24 px-4 pb-4 lg:px-8 lg:pb-8 print:pt-0 print:p-0">
        {/* 7-day trial banner for free tier */}
        {trialEndsAt && activeTab !== 'admin' && (() => {
          const end = new Date(trialEndsAt).getTime();
          const now = Date.now();
          const daysLeft = Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)));
          if (daysLeft <= 0) return null;
          return (
            <div className="max-w-[1600px] mx-auto mb-4 px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-bold text-slate-900">
                  Free Trial · <span className="text-[#0f172a]">{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining</span>
                </p>
                <p className="text-xs font-medium text-slate-600">
                  Free trial provides you with 3 property analyses per day.
                </p>
              </div>
              <button
                type="button"
                onClick={() => (window as any).__triggerUpgrade?.()}
                className="text-sm font-black uppercase tracking-tight text-[#f43f5e] hover:underline whitespace-nowrap"
              >
                Upgrade to Pro →
              </button>
            </div>
          );
        })()}
        {activeTab !== 'admin' && (
          <SearchBar
            propertyInput={propertyInput}
            onInputChange={setPropertyInput}
            onSearch={() => runAnalysis()}
            isAnalyzing={isAnalyzing}
            isFetchingFactual={isFetchingFactual}
            isUsingWebData={isUsingWebData}
            analysisError={analysisError}
            analysisErrorShowUpgrade={analysisErrorShowUpgrade}
            suggestionRef={suggestionRef as React.RefObject<HTMLDivElement>}
            isLoggedIn={!!user}
          />
        )}

        {/* Progress Indicator - shown during long-running analysis */}
        {progress.isVisible && (
          <div className="max-w-[600px] mx-auto mt-6 mb-8">
            <ProgressIndicator 
              currentStep={progress.currentStep}
              isVisible={progress.isVisible}
              startTime={progress.startTime}
            />
          </div>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && insight && (
          <DashboardTab
            insight={insight}
            displayedAddress={displayedAddress}
            strategy={strategy}
            setStrategy={setStrategy}
            userTier={userTier}
            baseConfig={baseConfig}
            finalConfig={finalConfig}
            capRate={capRate}
            cashOnCash={cashOnCash}
            cashPortion={cashPortion}
            annualNoi={annualNoi}
            annualGross={annualGross}
            annualProfit={annualProfit}
            annualSurplus={annualSurplus}
            grossYield={grossYield}
            downPayment={downPayment}
            helocPortion={helocPortion}
            totalUpfrontCapital={totalUpfrontCapital}
            currentRateValue={currentRateValue}
            year1Data={year1Data}
            totalDscr={totalDscr}
            isUsingWebData={isUsingWebData}
            amenities={amenities}
            selectedAmenityIds={selectedAmenityIds}
            furnishingBreakdown={furnishingBreakdown}
            showFurnishingDropdown={showFurnishingDropdown}
            setShowFurnishingDropdown={setShowFurnishingDropdown}
            setFurnishingBreakdown={setFurnishingBreakdown}
            toggleAmenity={toggleAmenity}
            analysisQuery={analysisQuery}
            handleInputChange={handleInputChange}
            handleManagementSliderChange={handleManagementSliderChange}
            getManagementLabel={getManagementLabel}
            getManagementIndex={getManagementIndex}
            onExportReport={handleExportReport}
            onSaveAssessment={saveAssessment}
            sensitivityData={sensitivityData}
            amenityROIData={amenityROIData}
            pathToYesData={pathToYesData}
            lenderPacket={lenderPacket}
            isLoadingSensitivity={isLoadingSensitivity}
            isLoadingAmenityROI={isLoadingAmenityROI}
            isLoadingPathToYes={isLoadingPathToYes}
            isLoadingLenderPacket={isLoadingLenderPacket}
            handleRunSensitivity={handleRunSensitivity}
            handleRunAmenityROI={handleRunAmenityROI}
            handleRunPathToYes={handleRunPathToYes}
            handleGenerateLenderPacket={handleGenerateLenderPacket}
            investmentTargets={investmentTargets}
            // Enhanced RentCast data
            propertyData={propertyQuery.data || null}
            marketStats={(marketStatsQuery.data as MarketStats) || null}
            marketTrends={marketTrends}
            bedroomStats={bedroomStats}
            rentalListings={rentalListingsQuery.data || null}
            rentEstimateData={rentEstimateQuery.data}
            onUpgrade={handleUpgrade}
            onSettingsClick={() => setActiveTab('assumptions')}
          />
        )}

        {/* RENTCAST DATA TAB */}
        {activeTab === 'rentcast' && (
          <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>}>
            <RentCastDataTab
              propertyData={propertyQuery.data || null}
              marketStats={(marketStatsQuery.data as MarketStats) || null}
              marketTrends={marketTrends}
              bedroomStats={bedroomStats}
              rentalListings={rentalListingsQuery.data || null}
              onRefreshData={() => {
                // Re-fetch RentCast data by setting targetAddress (which triggers React Query)
                if (displayedAddress) {
                  setTargetAddress(normalizeAddress(displayedAddress));
                }
              }}
            />
          </Suspense>
        )}

        {/* ANALYTICS TAB (Performance) */}
        {activeTab === 'analytics' && (
          <div className="max-w-[1600px] mx-auto">
            {monthlyData && monthlyData.length > 0 ? (
              <ErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>}>
                  <Charts data={monthlyData} />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <BarChart3 size={48} className="mx-auto mb-4 text-slate-600" />
                <p className="text-slate-600 font-black text-sm uppercase tracking-widest mb-4">No Performance Data Available</p>
                <p className="text-slate-500 text-sm mb-6">Run an underwriting analysis to see financial projections and performance charts.</p>
                <button onClick={() => setActiveTab('dashboard')} className="px-6 py-2 bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900">
                  Go to Audit & Analyze
                </button>
              </div>
            )}
          </div>
        )}

        {/* MONTHLY TAB */}
        {activeTab === 'monthly' && (
          <div className="max-w-[1600px] mx-auto">
            {monthlyData && monthlyData.length > 0 ? (
              <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>}>
                <FinancialTables data={monthlyData} title={`${strategy} Monthly Cash Flow`} />
              </Suspense>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <Calendar size={48} className="mx-auto mb-4 text-slate-600" />
                <p className="text-slate-600 font-black text-sm uppercase tracking-widest mb-4">No Monthly Data Available</p>
                <p className="text-slate-500 text-sm mb-6">Run an underwriting analysis to see monthly financial projections.</p>
                <button onClick={() => setActiveTab('dashboard')} className="px-6 py-2 bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900">
                  Go to Audit & Analyze
                </button>
              </div>
            )}
          </div>
        )}

        {/* YEARLY TAB */}
        {activeTab === 'yearly' && (
          <div className="max-w-[1600px] mx-auto">
            {yearlyData && yearlyData.length > 0 ? (
              <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>}>
                <FinancialTables data={yearlyData} title={`${strategy} Yearly Cash Flow`} isYearly />
              </Suspense>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <TrendingUp size={48} className="mx-auto mb-4 text-slate-600" />
                <p className="text-slate-600 font-black text-sm uppercase tracking-widest mb-4">No Yearly Data Available</p>
                <p className="text-slate-500 text-sm mb-6">Run an underwriting analysis to see yearly financial projections.</p>
                <button onClick={() => setActiveTab('dashboard')} className="px-6 py-2 bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900">
                  Go to Audit & Analyze
                </button>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'assumptions' && (
          <SettingsTab
            baseConfig={baseConfig}
            handleInputChange={handleInputChange}
            investmentTargets={investmentTargets}
            setInvestmentTargets={setInvestmentTargets}
            amenities={amenities}
            newAmenityName={newAmenityName}
            setNewAmenityName={setNewAmenityName}
            isSuggestingAmenity={isSuggestingAmenity}
            handleAddAmenity={handleAddAmenity}
            handleEditAmenity={handleEditAmenity}
            removeAmenity={removeAmenity}
            amenityCosts={amenityCosts}
            isEstimatingAmenityCosts={isEstimatingAmenityCosts}
            displayedAddress={displayedAddress}
            propertyData={propertyQuery.data || null}
            marketStats={marketStatsQuery.data}
            includeAmenityEstimation={includeAmenityEstimation}
            onToggleAmenityEstimation={setIncludeAmenityEstimation}
          />
        )}

        {/* PORTFOLIO TAB */}
        {activeTab === 'portfolio' && (
          <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>}>
          <PortfolioTab
            savedAssessments={savedAssessments}
            comparisonMode={comparisonMode}
            toggleComparisonMode={toggleComparisonMode}
            selectedForComparison={selectedForComparison}
            togglePropertyForComparison={togglePropertyForComparison}
            setShowComparisonModal={setShowComparisonModal}
            deleteSaved={deleteSaved}
            setPropertyInput={setPropertyInput}
            setDisplayedAddress={setDisplayedAddress}
            setStrategy={setStrategy}
            setBaseConfig={setBaseConfig}
            setSelectedAmenityIds={setSelectedAmenityIds}
            setInsight={setInsight}
            setActiveTab={setActiveTab}
          />
          </Suspense>
        )}

        {/* ADMIN TAB */}
        {activeTab === 'admin' && (
          <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>}>
            <AdminTab />
          </Suspense>
        )}

        {/* EMPTY STATE */}
        {!insight && activeTab === 'dashboard' && (
          <div className="py-32 px-10 bg-white rounded-[3rem] border border-slate-100 shadow-xl max-w-6xl mx-auto flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700">
            <div className="w-24 h-24 bg-[#0f172a] rounded-[2.5rem] flex items-center justify-center text-white mb-10 rotate-3"><Search size={40} className="text-[#f43f5e]" /></div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter mb-6">Ready to Analyze your <span className="text-[#f43f5e]">Next Deal?</span></h2>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.3em] max-w-2xl text-center mb-16">Enter an address above to generate a professional-grade underwrite audit in seconds.</p>
          </div>
        )}
      </main>

      {/* COMPARISON MODAL */}
      {showComparisonModal && (
        <ComparisonModal
          savedAssessments={savedAssessments}
          selectedForComparison={selectedForComparison}
          onClose={() => setShowComparisonModal(false)}
          setPropertyInput={setPropertyInput}
          setDisplayedAddress={setDisplayedAddress}
          setStrategy={setStrategy}
          setActiveTab={setActiveTab}
          runAnalysis={runAnalysis}
        />
      )}

      {/* AUTH MODAL */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalInitialMode}
      />

      {/* DATA MIGRATION NOTICE */}
      <DataMigrationNotice />
    </div>
  );
};

export default App;
