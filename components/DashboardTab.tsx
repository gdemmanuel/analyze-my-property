import React from 'react';
import {
  Building2, Home, Layers, Ruler, Map, Save, Printer,
  Sparkles, ShieldAlert, Calculator, ShieldCheck, MapPin,
  ShieldPlus, ChevronDown, ExternalLink, FileText,
  TrendingUp, Clock, Tag, Activity, Droplets, Flame,
  Car, Eye, Phone, Mail, BarChart3, Users, Zap
} from 'lucide-react';
import ErrorBoundary from './ui/ErrorBoundary';
import { CacheStatusBadge } from './ui/StatusBadge';
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
import MarketTrendCharts from './MarketTrendCharts';

interface DashboardTabProps {
  insight: MarketInsight;
  displayedAddress: string;
  strategy: RentalStrategy;
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
  insight, displayedAddress, strategy, baseConfig, finalConfig,
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
  const [expandedRentCast, setExpandedRentCast] = React.useState(false);
  const [expandedRentalListings, setExpandedRentalListings] = React.useState(false);
  const [expandedOwnerInfo, setExpandedOwnerInfo] = React.useState(false);
  const [expandedPriceHistory, setExpandedPriceHistory] = React.useState(false);
  
  return (
    <div className="space-y-3 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
      {/* Hero Card */}
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
                <div className="flex gap-2 items-center">
                  {analysisQuery.dataUpdatedAt && (
                    <CacheStatusBadge
                      isCached={analysisQuery.fetchStatus === 'idle' && !analysisQuery.isFetching}
                      updatedAt={analysisQuery.dataUpdatedAt}
                    />
                  )}
                  {insight && (
                    <>
                      {insight.dataSource?.adrSource && (
                        <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                          insight.dataSource.adrSource === 'RentCast'
                            ? 'bg-blue-500/10 border border-blue-400/20 text-blue-400'
                            : insight.dataSource.adrSource === 'Web Search'
                            ? 'bg-amber-500/10 border border-amber-400/20 text-amber-400'
                            : 'bg-purple-500/10 border border-purple-400/20 text-purple-400'
                        }`}>
                          <Building2 size={10} /> {insight.dataSource.adrSource}
                        </div>
                      )}
                      {isUsingWebData && (
                        <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-400/20 rounded text-[8px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Sparkles size={10} /> Web Market Intel
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={onExportReport} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 border border-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-lg"><Printer size={12} /> EXPORT PDF</button>
                <button onClick={onSaveAssessment} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f43f5e] hover:bg-[#e11d48] rounded-lg text-[9px] font-black uppercase tracking-widest shadow-xl"><Save size={12} /> SAVE</button>
              </div>
            </div>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3 group"><h2 className="text-2xl lg:text-3xl font-black tracking-tighter leading-none text-white">{displayedAddress}</h2><a href={`https://www.zillow.com/homes/for_sale/${encodeURIComponent(displayedAddress)}_rb/`} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 hover:bg-[#f43f5e] hover:scale-110 rounded-full transition-all text-white"><Map size={14} /></a></div>
              <div className="flex gap-6 text-slate-600 text-[10px] font-black uppercase tracking-[0.25em]">
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

      {/* Property Details & Market Intelligence */}
      {propertyData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
          {/* AVM Value Range (Tier 1A) */}
          {propertyData.avmValueRange && (
            <div className="p-4 bg-white rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-blue-50 rounded-lg text-blue-500"><TrendingUp size={12} /></div>
                <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest">AVM VALUE RANGE</h4>
              </div>
              <div className="flex items-baseline gap-1 mb-1.5">
                <span className="text-lg font-black text-slate-900 tracking-tight">{formatCurrency(propertyData.lastSalePrice || 0)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-bold">
                <span className="text-slate-500">{formatCurrency(propertyData.avmValueRange.low)}</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full relative overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(10, ((propertyData.lastSalePrice || propertyData.avmValueRange.low) - propertyData.avmValueRange.low) / (propertyData.avmValueRange.high - propertyData.avmValueRange.low) * 100))}%`
                    }}
                  />
                </div>
                <span className="text-slate-500">{formatCurrency(propertyData.avmValueRange.high)}</span>
              </div>
              <p className="text-[7px] text-slate-400 mt-1 font-bold">85% confidence interval</p>
            </div>
          )}

          {/* Listing Details (Tier 1E) */}
          {propertyData.listingDetails && (propertyData.listingDetails.daysOnMarket || propertyData.listingDetails.listingType) && (
            <div className="p-4 bg-white rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-amber-50 rounded-lg text-amber-500"><Clock size={12} /></div>
                <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest">LISTING INTEL</h4>
              </div>
              <div className="space-y-1">
                {propertyData.listingDetails.daysOnMarket != null && (
                  <div className="flex justify-between text-[9px] font-black">
                    <span className="text-slate-600">DAYS ON MARKET</span>
                    <span className={propertyData.listingDetails.daysOnMarket > 90 ? 'text-emerald-600' : propertyData.listingDetails.daysOnMarket > 30 ? 'text-amber-600' : 'text-slate-900'}>
                      {propertyData.listingDetails.daysOnMarket}
                    </span>
                  </div>
                )}
                {propertyData.listingDetails.listingType && (
                  <div className="flex justify-between text-[9px] font-black">
                    <span className="text-slate-600">TYPE</span>
                    <span className={`px-1.5 py-0.5 rounded text-[7px] ${
                      propertyData.listingDetails.listingType === 'Foreclosure' ? 'bg-red-100 text-red-700' :
                      propertyData.listingDetails.listingType === 'Short Sale' ? 'bg-orange-100 text-orange-700' :
                      propertyData.listingDetails.listingType === 'New Construction' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>{propertyData.listingDetails.listingType}</span>
                  </div>
                )}
                {propertyData.listingDetails.mlsNumber && (
                  <div className="flex justify-between text-[9px] font-black">
                    <span className="text-slate-600">MLS #</span>
                    <span className="text-slate-900 text-[8px]">{propertyData.listingDetails.mlsNumber}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Property Features (Tier 1C) */}
          {propertyData.features && Object.values(propertyData.features).some(v => v != null) && (
            <div className="p-4 bg-white rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-emerald-50 rounded-lg text-emerald-500"><Zap size={12} /></div>
                <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest">PROPERTY FEATURES</h4>
              </div>
              <div className="flex flex-wrap gap-1">
                {propertyData.features.pool && (
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[7px] font-black flex items-center gap-0.5"><Droplets size={8} /> Pool</span>
                )}
                {propertyData.features.garage && (
                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[7px] font-black flex items-center gap-0.5"><Car size={8} /> {propertyData.features.garageSpaces || '?'}-Car</span>
                )}
                {propertyData.features.fireplace && (
                  <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded text-[7px] font-black flex items-center gap-0.5"><Flame size={8} /> Fireplace</span>
                )}
                {propertyData.features.coolingType && (
                  <span className="px-1.5 py-0.5 bg-cyan-50 text-cyan-700 rounded text-[7px] font-black">AC: {propertyData.features.coolingType}</span>
                )}
                {propertyData.features.heatingType && (
                  <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[7px] font-black">Heat: {propertyData.features.heatingType}</span>
                )}
                {propertyData.zoning && (
                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[7px] font-black">Zone: {propertyData.zoning}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Property Data Dropdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        {/* Owner Information Dropdown */}
        {propertyData?.owner && (
          <div className="p-4 bg-white rounded-xl border border-slate-100">
            <button
              onClick={() => setExpandedOwnerInfo(!expandedOwnerInfo)}
              className="w-full flex items-center justify-between hover:bg-slate-50 transition-colors p-1 -m-1 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <div className="p-1 bg-purple-50 rounded-lg text-purple-600"><Users size={12} /></div>
                <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest">OWNER INFO</h4>
              </div>
              <ChevronDown size={12} className={`transition-transform text-slate-400 ${expandedOwnerInfo ? 'rotate-180' : ''}`} />
            </button>
            {expandedOwnerInfo && (
              <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                {propertyData.owner.names?.map((name, i) => (
                  <p key={i} className="text-[9px] font-black text-slate-700">{name}</p>
                ))}
                {propertyData.owner.type && (
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-bold text-slate-500">Type:</span>
                    <span className={`px-2 py-0.5 rounded text-[7px] font-black ${propertyData.owner.type === 'Individual' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{propertyData.owner.type}</span>
                  </div>
                )}
                {propertyData.owner.ownerOccupied !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-bold text-slate-500">Status:</span>
                    <span className={`text-[8px] font-black ${propertyData.owner.ownerOccupied ? 'text-green-600' : 'text-blue-600'}`}>{propertyData.owner.ownerOccupied ? 'Owner Occupied' : 'Investor/Vacant'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Listing Price History Dropdown */}
        {propertyData?.listingDetails?.priceHistory && propertyData.listingDetails.priceHistory.length > 0 && (
          <div className="p-4 bg-white rounded-xl border border-slate-100">
            <button
              onClick={() => setExpandedPriceHistory(!expandedPriceHistory)}
              className="w-full flex items-center justify-between hover:bg-slate-50 transition-colors p-1 -m-1 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <div className="p-1 bg-amber-50 rounded-lg text-amber-600"><Tag size={12} /></div>
                <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest">PRICE HISTORY ({propertyData.listingDetails.priceHistory.length})</h4>
              </div>
              <ChevronDown size={12} className={`transition-transform text-slate-400 ${expandedPriceHistory ? 'rotate-180' : ''}`} />
            </button>
            {expandedPriceHistory && (
              <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 max-h-48 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                {propertyData.listingDetails.priceHistory.map((ph, i) => (
                  <div key={i} className="p-2 bg-slate-50 rounded text-[8px]">
                    <div className="flex justify-between font-black text-slate-700">
                      <span>{formatCurrency(ph.price)}</span>
                      <span className="text-slate-500">{new Date(ph.date).toLocaleDateString()}</span>
                    </div>
                    {ph.event && <p className="text-[7px] text-slate-500 mt-0.5">{ph.event}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RentCast Market Data Dropdown (Tier 2G, 2H, 2I) */}
      {(marketStats || marketTrends.saleTrends.length > 0 || marketTrends.rentalTrends.length > 0) && (
        <div className="p-5 bg-white rounded-xl border border-slate-100 mb-6">
          <button
            onClick={() => setExpandedRentCast(!expandedRentCast)}
            className="w-full flex items-center justify-between hover:bg-slate-50 transition-colors p-2 -m-2 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-500"><BarChart3 size={16} /></div>
              <div className="text-left">
                <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">MARKET ANALYSIS</h4>
                <p className="text-[8px] text-slate-400 mt-0.5">Trends • Health • Bedroom Stats</p>
              </div>
            </div>
            <ChevronDown size={16} className={`transition-transform text-slate-400 ${expandedRentCast ? 'rotate-180' : ''}`} />
          </button>

          {expandedRentCast && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
              {/* Market Health (Tier 2H) */}
              {marketStats && (marketStats.saleData || marketStats.rentalData) && (
                <div>
                  <h5 className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-3">Market Health</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {marketStats.saleData?.medianPrice != null && (
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">MEDIAN PRICE</p>
                        <p className="text-sm font-black text-slate-900 tracking-tight">{formatCurrency(marketStats.saleData.medianPrice)}</p>
                      </div>
                    )}
                    {marketStats.saleData?.averageDaysOnMarket != null && (
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">AVG DOM (SALE)</p>
                        <p className="text-sm font-black text-slate-900 tracking-tight">{Math.round(marketStats.saleData.averageDaysOnMarket)} days</p>
                      </div>
                    )}
                    {marketStats.saleData?.totalListings != null && (
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">SALE LISTINGS</p>
                        <p className="text-sm font-black text-slate-900 tracking-tight">{marketStats.saleData.totalListings}</p>
                      </div>
                    )}
                    {marketStats.rentalData?.medianRent != null && (
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <p className="text-[7px] font-black text-blue-600 uppercase tracking-widest mb-0.5">MEDIAN RENT</p>
                        <p className="text-sm font-black text-blue-900 tracking-tight">{formatCurrency(marketStats.rentalData.medianRent)}/mo</p>
                      </div>
                    )}
                    {marketStats.rentalData?.averageDaysOnMarket != null && (
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <p className="text-[7px] font-black text-blue-600 uppercase tracking-widest mb-0.5">AVG DOM (RENTAL)</p>
                        <p className="text-sm font-black text-blue-900 tracking-tight">{Math.round(marketStats.rentalData.averageDaysOnMarket)} days</p>
                      </div>
                    )}
                    {marketStats.rentalData?.totalListings != null && (
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <p className="text-[7px] font-black text-blue-600 uppercase tracking-widest mb-0.5">RENTAL LISTINGS</p>
                        <p className="text-sm font-black text-blue-900 tracking-tight">{marketStats.rentalData.totalListings}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bedroom-Matched Stats (Tier 2I) */}
              {(bedroomStats.sale || bedroomStats.rental) && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[8px] font-black text-[#f43f5e] uppercase tracking-widest mb-2">
                    {propertyData?.bedrooms || '?'}BR MATCHED STATS
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {bedroomStats.rental?.medianRent != null && (
                      <span className="text-[9px] font-black text-slate-700">{propertyData?.bedrooms}BR Median Rent: <span className="text-blue-600">{formatCurrency(bedroomStats.rental.medianRent)}/mo</span></span>
                    )}
                    {bedroomStats.sale?.medianPrice != null && (
                      <span className="text-[9px] font-black text-slate-700">{propertyData?.bedrooms}BR Median Price: <span className="text-slate-900">{formatCurrency(bedroomStats.sale.medianPrice)}</span></span>
                    )}
                    {bedroomStats.rental?.totalListings != null && (
                      <span className="text-[9px] font-black text-slate-700">{propertyData?.bedrooms}BR Listings: <span className="text-blue-600">{bedroomStats.rental.totalListings}</span></span>
                    )}
                    {bedroomStats.sale?.averageDaysOnMarket != null && (
                      <span className="text-[9px] font-black text-slate-700">{propertyData?.bedrooms}BR Avg DOM: <span className="text-slate-900">{Math.round(bedroomStats.sale.averageDaysOnMarket)} days</span></span>
                    )}
                  </div>
                </div>
              )}

              {/* Market Trend Charts (Tier 2G) */}
              {(marketTrends.saleTrends.length > 2 || marketTrends.rentalTrends.length > 2) && (
                <div className="pt-3 border-t border-slate-100">
                  <ErrorBoundary>
                    <MarketTrendCharts
                      saleTrends={marketTrends.saleTrends}
                      rentalTrends={marketTrends.rentalTrends}
                      zipCode={propertyData?.zipCode}
                    />
                  </ErrorBoundary>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sale Transaction History + Listing Agent + Tax Assessments (Tier 1D, 3M, 3L) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Sale History */}
        {propertyData?.saleHistory && propertyData.saleHistory.length > 0 && (
          <div className="p-5 bg-white rounded-xl border border-slate-100 lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-violet-50 rounded-lg text-violet-500"><Activity size={14} /></div>
              <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">SALE HISTORY</h4>
            </div>
            <div className="flex gap-3 overflow-x-auto">
              {propertyData.saleHistory.map((sale, i) => {
                const prevSale = propertyData.saleHistory![i + 1];
                const appreciation = prevSale ? ((sale.price - prevSale.price) / prevSale.price * 100) : null;
                return (
                  <div key={i} className="flex-shrink-0 p-3 bg-slate-50 rounded-lg min-w-[140px]">
                    <p className="text-[9px] font-bold text-slate-500">{new Date(sale.date).toLocaleDateString()}</p>
                    <p className="text-sm font-black text-slate-900">{formatCurrency(sale.price)}</p>
                    {appreciation !== null && (
                      <p className={`text-[9px] font-black ${appreciation >= 0 ? 'text-emerald-600' : 'text-[#f43f5e]'}`}>
                        {appreciation >= 0 ? '+' : ''}{appreciation.toFixed(1)}%
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Listing Agent Contact (Tier 3M) */}
        {propertyData?.listingDetails?.listingAgent?.name && (
          <div className="p-5 bg-white rounded-xl border border-slate-100">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">LISTING AGENT</h4>
            <div className="space-y-2">
              <p className="text-[11px] font-black text-slate-800">{propertyData.listingDetails.listingAgent.name}</p>
              {propertyData.listingDetails.listingOffice?.name && (
                <p className="text-[9px] text-slate-600">{propertyData.listingDetails.listingOffice.name}</p>
              )}
              <div className="space-y-1">
                {propertyData.listingDetails.listingAgent.phone && (
                  <div className="text-[9px] font-bold text-blue-600 flex items-center gap-1"><Phone size={10} /> <span className="truncate">{propertyData.listingDetails.listingAgent.phone}</span></div>
                )}
                {propertyData.listingDetails.listingAgent.email && (
                  <div className="text-[9px] font-bold text-blue-600 flex items-center gap-1"><Mail size={10} /> <span className="truncate">{propertyData.listingDetails.listingAgent.email}</span></div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tax Assessment Breakdown (Tier 3L) */}
      {propertyData?.taxAssessments && propertyData.taxAssessments.length > 0 && (
        <div className="p-5 bg-white rounded-xl border border-slate-100 mb-6">
          <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">TAX ASSESSMENTS</h4>
          <div className="space-y-2">
            {propertyData.taxAssessments.map((ta, i) => (
              <div key={i} className="flex justify-between text-[10px] font-bold text-slate-600 p-2 bg-slate-50 rounded-lg">
                <span className="font-black text-slate-900">{ta.year}</span>
                <span className="font-black text-slate-900">{formatCurrency(ta.value)}</span>
                <span className="text-[9px] text-slate-500">Land: {formatCurrency(ta.land)} | Imp: {formatCurrency(ta.improvements)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amenities */}
      <div className="p-5 bg-white rounded-xl border border-slate-100 mb-6">
        <div className="flex justify-between items-center mb-4"><h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">REVENUE AMENITIES</h4><div className="flex gap-6 text-[13px] font-black uppercase items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-[#f43f5e]">ADR: {formatCurrency(currentRateValue)}</span>
            {insight?.dataSource?.adrSource && (
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${insight.dataSource.adrSource === 'RentCast' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                {insight.dataSource.adrSource === 'RentCast' ? '✓ RentCast' : 'AI'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#10b981]">OCC: {year1Data?.occupancy.toFixed(0)}%</span>
            {insight?.dataSource?.occupancySource && (
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${insight.dataSource.occupancySource === 'RentCast' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                {insight.dataSource.occupancySource === 'RentCast' ? '✓ RentCast' : 'AI'}
              </span>
            )}
          </div>
        </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {amenities.filter(a => a.active).map(am => (
            <div key={am.id} className="relative">
              <button onClick={() => toggleAmenity(am.id)} className={`w-full p-3 rounded-lg border transition-all flex flex-col gap-1 text-left ${selectedAmenityIds.includes(am.id) ? 'bg-[#f43f5e] border-[#fb7185] text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600'}`}>
                <div className="flex items-center gap-1.5">
                  <span className={selectedAmenityIds.includes(am.id) ? 'text-white' : 'text-rose-400'}>{getAmenityIcon(am.icon)}</span>
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
                <div className="flex flex-col"><span className={`text-[11px] font-black ${selectedAmenityIds.includes(am.id) ? 'text-white' : 'text-yellow-300'}`}>${am.cost.toLocaleString()}</span></div>
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
      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Advanced Analysis</h2>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">AI-Powered Deep Dive Tools</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <ErrorBoundary>
            <PathToYesPanel
              data={pathToYesData}
              isLoading={isLoadingPathToYes}
              onRefresh={handleRunPathToYes}
              liveKpis={{ capRate, cashOnCash, dscr: totalDscr }}
              targets={investmentTargets}
            />
          </ErrorBoundary>
          <ErrorBoundary>
            <AmenityROIPanel
              data={amenityROIData}
              isLoading={isLoadingAmenityROI}
              onRefresh={handleRunAmenityROI}
            />
          </ErrorBoundary>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ErrorBoundary>
            <SensitivityTable
              data={sensitivityData}
              isLoading={isLoadingSensitivity}
              onRefresh={handleRunSensitivity}
            />
          </ErrorBoundary>
          <ErrorBoundary>
            <LenderPacketExport
              packet={lenderPacket}
              isLoading={isLoadingLenderPacket}
              onGenerate={handleGenerateLenderPacket}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* Market Comps Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-6 border-b pb-6">
            <div className="p-3 bg-rose-50 rounded-xl text-rose-500"><MapPin size={18} /></div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">Market Comps</h3>
            {insight.dataSource?.compsSource && <span className={`ml-auto text-[8px] font-black px-2 py-1 rounded-full ${insight.dataSource.compsSource === 'RentCast' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{insight.dataSource.compsSource === 'RentCast' ? '✓ RentCast' : 'AI'}</span>}
          </div>

          {/* AVM Sale Comparables (Tier 1B) */}
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
                      {comp.daysOnMarket != null && <span>{comp.daysOnMarket} DOM</span>}
                      {comp.listingType && comp.listingType !== 'Standard' && (
                        <span className={`px-1 rounded text-[7px] ${comp.listingType === 'Foreclosure' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>{comp.listingType}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Rental Listings Dropdown (Tier 2J) */}
          {rentalListings && rentalListings.length > 0 && (
            <div className="border-t border-slate-100 pt-5">
              <button
                onClick={() => setExpandedRentalListings(!expandedRentalListings)}
                className="w-full flex items-center justify-between hover:bg-slate-50 transition-colors p-2 -m-2 rounded-lg mb-2"
              >
                <div className="flex items-center gap-2">
                  <h4 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">ACTIVE RENTAL LISTINGS</h4>
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[7px] font-black">LTR Comps</span>
                </div>
                <ChevronDown size={14} className={`transition-transform text-slate-400 ${expandedRentalListings ? 'rotate-180' : ''}`} />
              </button>
              
              {expandedRentalListings && (
                <div className="space-y-2 mt-2 animate-in slide-in-from-top-2 duration-200">
                  {rentalListings.slice(0, 5).map((listing, i) => (
                    <div key={i} className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                      <p className="text-[9px] font-black text-slate-800 truncate mb-1 uppercase">{listing.formattedAddress}</p>
                      <div className="flex gap-3 text-[9px] font-bold text-slate-600 flex-wrap">
                        {listing.price != null && <span className="font-black text-emerald-700">{formatCurrency(listing.price)}/mo</span>}
                        {listing.bedrooms != null && <span>{listing.bedrooms}bd/{listing.bathrooms || '?'}ba</span>}
                        {listing.squareFootage != null && <span>{listing.squareFootage.toLocaleString()}sf</span>}
                        {listing.daysOnMarket != null && <span>{listing.daysOnMarket} DOM</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="lg:col-span-2"><PropertyChat insight={insight} config={baseConfig} /></div>
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
  );
};

export default DashboardTab;
