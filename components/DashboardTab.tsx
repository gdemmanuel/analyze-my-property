import React from 'react';
import {
  Building2, Home, Layers, Ruler, Map, Save, Printer,
  Sparkles, ShieldAlert, Calculator, ShieldCheck, MapPin,
  ShieldPlus, ChevronDown, ExternalLink, FileText
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
  investmentTargets
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-5 bg-white rounded-xl border border-slate-100 flex flex-col justify-between min-h-[120px]">
          <div><h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">CAPITAL STRATEGY</h4><div className="space-y-2"><div className="flex justify-between text-[11px] font-black"><span className="text-slate-600">DOWN PMT</span><span className="text-slate-900">{formatCurrency(cashPortion)}</span></div><div className="flex justify-between text-[11px] font-black"><span className="text-[#f43f5e]">HELOC</span><span className="text-[#f43f5e]">{formatCurrency(helocPortion)}</span></div></div></div>
          <input type="range" min="0" max="100" value={baseConfig.helocFundingPercent} onChange={(e) => handleInputChange('helocFundingPercent', e.target.value)} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#f43f5e] mt-3" />
        </div>
        <div className="p-5 bg-white rounded-xl border border-slate-100 flex flex-col justify-between min-h-[120px]">
          <div><div className="flex justify-between items-center mb-3"><h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">MGMT MODE</h4><div className="p-1 bg-indigo-500/20 rounded-full text-[#818cf8]"><ShieldPlus size={12} /></div></div><div className="space-y-2"><div className="flex justify-between text-[11px] font-black"><span className="text-slate-600">SELECTION</span><span className="text-slate-900">{getManagementLabel(baseConfig.mgmtFeePercent).split(' ')[0]}</span></div><div className="flex justify-between text-[11px] font-black"><span className="text-slate-600">EST. COST</span><span className="text-[#818cf8]">{formatCurrency(year1Data?.mgmtFee || 0)}</span></div></div></div>
          <input type="range" min="0" max="2" step="1" value={getManagementIndex(baseConfig.mgmtFeePercent)} onChange={handleManagementSliderChange} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#818cf8] mt-3" />
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center"><div className="flex items-center gap-1 mb-1"><p className="text-[9px] font-black text-[#10b981] uppercase tracking-widest">PROFIT (Y1)</p></div><p className={`text-2xl font-black tracking-tighter leading-none ${annualProfit < 0 ? 'text-[#f43f5e]' : 'text-[#10b981]'}`}>{formatCurrency(annualProfit)}</p></div>
        <div className="p-4 bg-white rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center"><div className="flex items-center gap-1 mb-1"><p className="text-[9px] font-black text-[#818cf8] uppercase tracking-widest">OWNER SURPLUS</p></div><p className={`text-2xl font-black tracking-tighter leading-none ${annualSurplus < 0 ? 'text-[#f43f5e]' : 'text-slate-900'}`}>{formatCurrency(annualSurplus)}</p></div>
      </div>

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

      {/* Market Comps & AI Deal Analyst */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col"><div className="flex items-center gap-3 mb-8 border-b pb-6"><div className="p-3 bg-rose-50 rounded-xl text-rose-500"><MapPin size={18} /></div><h3 className="text-[11px] font-black uppercase tracking-[0.3em]">Market Comps</h3>{insight.dataSource?.compsSource && <span className={`ml-auto text-[8px] font-black px-2 py-1 rounded-full ${insight.dataSource.compsSource === 'RentCast' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{insight.dataSource.compsSource === 'RentCast' ? '✓ RentCast' : 'AI'}</span>}</div><div className="space-y-3">{insight.comps.slice(0, 3).map((c, i) => (<div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition-all group"><p className="text-[11px] font-black text-slate-800 truncate mb-2 uppercase">{c.address}</p><div className="flex justify-between text-[10px] font-black uppercase tracking-tight"><div className="flex gap-3"><span className="text-slate-600">{c.price}</span><span className="text-emerald-600">{c.annualRevenue} REV</span></div><div className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md">{((parseInt(c.annualRevenue.replace(/[^0-9]/g, '')) / (parseInt(c.price.replace(/[^0-9]/g, '')) || 1)) * 100).toFixed(1)}% YIELD</div></div></div>))}</div></div>
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
