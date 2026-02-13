import React, { useEffect } from 'react';
import { Settings, Sparkles, Trash, Target } from 'lucide-react';
import { PropertyConfig, Amenity } from '../types';

interface SettingsTabProps {
  baseConfig: PropertyConfig;
  handleInputChange: (field: keyof PropertyConfig, value: string) => void;
  investmentTargets: { minCapRate: number; minCoC: number; minDSCR: number };
  setInvestmentTargets: (targets: any) => void;
  amenities: Amenity[];
  newAmenityName: string;
  setNewAmenityName: (v: string) => void;
  isSuggestingAmenity: boolean;
  handleAddAmenity: () => void;
  handleEditAmenity: (id: string, updates: Partial<Amenity>) => void;
  removeAmenity: (id: string) => void;
  amenityCosts?: any; // Location-based amenity cost estimates
  isEstimatingAmenityCosts?: boolean; // Background task status
  displayedAddress?: string; // Current property address
  propertyData?: any; // Current property data for custom amenity estimation
  marketStats?: any; // Market data for custom amenity estimation
  includeAmenityEstimation?: boolean; // Whether to include AI amenity estimation
  onToggleAmenityEstimation?: (value: boolean) => void; // Toggle amenity estimation
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  baseConfig, handleInputChange, investmentTargets, setInvestmentTargets,
  amenities, newAmenityName, setNewAmenityName, isSuggestingAmenity,
  handleAddAmenity, handleEditAmenity, removeAmenity,
  amenityCosts, isEstimatingAmenityCosts,
  displayedAddress, propertyData, marketStats,
  includeAmenityEstimation, onToggleAmenityEstimation
}) => {
  // List of fields that get auto-populated from AI analysis and should be visually distinguished
  const autoPopulatedFields = ['adr', 'occupancyPercent', 'mtrMonthlyRent', 'ltrMonthlyRent', 'propertyTaxMonthly', 'hoaMonthly'];

  // Auto-apply amenity cost suggestions when available
  useEffect(() => {
    if (!amenityCosts) return;
    
    const costKeyMap: { [key: string]: string } = {
      'furnishings': 'furnishings',
      'hottub': 'hottub',
      'sauna': 'sauna',
      'gameroom': 'gameroom',
      'deck': 'deck',
      'ev': 'evcharger'
    };

    amenities.forEach(am => {
      const costKey = costKeyMap[am.id];
      if (!costKey || !amenityCosts[costKey]) return;

      const suggestion = amenityCosts[costKey];
      
      // Auto-update cost if different and valid
      if (suggestion.minCost && suggestion.minCost > 0 && suggestion.minCost !== am.cost) {
        handleEditAmenity(am.id, { cost: suggestion.minCost });
      }
      
      // Auto-update ADR boost if different and valid
      if (suggestion.adrBoost && suggestion.adrBoost > 0 && suggestion.adrBoost !== am.adrBoost) {
        handleEditAmenity(am.id, { adrBoost: suggestion.adrBoost });
      }
      
      // Auto-update occupancy boost if different and valid
      if (suggestion.occBoost && suggestion.occBoost > 0 && suggestion.occBoost !== am.occBoost) {
        handleEditAmenity(am.id, { occBoost: suggestion.occBoost });
      }
    });
  }, [amenityCosts]);

  return (
    <div className="space-y-4 pb-20 max-w-full mx-auto animate-in fade-in duration-500 px-2">
      {/* Global Settings Section - Compact Grid */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow">
        <h2 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-tighter flex items-center gap-3">
          <div className="p-2 bg-rose-50 rounded-lg text-[#f43f5e]"><Settings size={18} /></div> 
          Global Settings
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {[{ label: 'Purchase Price $', field: 'price' }, { label: 'Down Pmt %', field: 'downPaymentPercent' }, { label: 'Mortgage Rate %', field: 'mortgageRate' }, { label: 'HELOC Funding %', field: 'helocFundingPercent' }, { label: 'HELOC Rate %', field: 'helocRate' }, { label: 'Target STR ADR $', field: 'adr' }, { label: 'Target MTR Rent $', field: 'mtrMonthlyRent' }, { label: 'Target LTR Rent $', field: 'ltrMonthlyRent' }, { label: 'STR Occupancy %', field: 'occupancyPercent' }, { label: 'Mgmt Fee %', field: 'mgmtFeePercent' }, { label: 'Maintenance %', field: 'maintenancePercent' }, { label: 'Fixed Opex / Mo $', field: 'fixedOpexMonthly' }, { label: 'Prop. Tax / Mo $', field: 'propertyTaxMonthly' }, { label: 'Prop. Tax Rate %', field: 'annualPropertyTaxRate' }, { label: 'HELOC Allocation %', field: 'helocPaydownPercent' }, { label: 'Ann. Appreciation %', field: 'annualAppreciationRate' }, { label: 'Ann. Rent Growth %', field: 'annualRentGrowthRate' }, { label: 'Ann. Inflation %', field: 'annualExpenseInflationRate' }].map(item => {
            const isAutoPopulated = autoPopulatedFields.includes(item.field);
            return (
              <div key={item.field} className={`space-y-0.5 p-2 rounded transition-colors ${isAutoPopulated ? 'bg-blue-50 border border-blue-100' : 'border border-slate-100'}`}>
                <label className="text-[9px] font-black text-slate-600 uppercase block">{item.label}</label>
                <input type="text" value={item.label.includes('$') ? new Intl.NumberFormat().format((baseConfig as any)[item.field]) : (baseConfig as any)[item.field]} onChange={(e) => handleInputChange(item.field as any, e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-[12px] font-bold text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Investment Targets Section */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Target size={18} /></div>
            Investment Targets
          </h2>
          <button
            onClick={() => setInvestmentTargets({ minCapRate: 6, minCoC: 10, minDSCR: 1.25 })}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-[9px] font-black uppercase tracking-widest"
          >
            Reset
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-0.5">
            <label className="text-[9px] font-black text-slate-600 uppercase block">Min Cap Rate %</label>
            <input
              type="number"
              value={investmentTargets.minCapRate}
              onChange={(e) => setInvestmentTargets({ ...investmentTargets, minCapRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-[12px] font-bold text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-0.5">
            <label className="text-[9px] font-black text-slate-600 uppercase block">Min Cash-on-Cash %</label>
            <input
              type="number"
              value={investmentTargets.minCoC}
              onChange={(e) => setInvestmentTargets({ ...investmentTargets, minCoC: parseFloat(e.target.value) || 0 })}
              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-[12px] font-bold text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-0.5">
            <label className="text-[9px] font-black text-slate-600 uppercase block">Min DSCR</label>
            <input
              type="number"
              step="0.01"
              value={investmentTargets.minDSCR}
              onChange={(e) => setInvestmentTargets({ ...investmentTargets, minDSCR: parseFloat(e.target.value) || 0 })}
              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-[12px] font-bold text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* Property Amenities Section - Compact List View */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
              <div className="p-2 bg-rose-50 rounded-lg text-[#f43f5e]"><Sparkles size={18} /></div> 
              Property Amenities
            </h2>
            {isEstimatingAmenityCosts && <span className="text-[9px] font-black text-slate-500 animate-pulse">Estimating costs...</span>}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAmenityEstimation || false}
              onChange={(e) => onToggleAmenityEstimation?.(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-[10px] font-black text-slate-600 uppercase whitespace-nowrap">AI Estimate</span>
          </label>
        </div>
        
        {/* Add New Amenity Section - Compact */}
        <div className="mb-4 p-3 bg-rose-50 rounded border border-rose-200">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Enter amenity name..."
              value={newAmenityName}
              onChange={(e) => setNewAmenityName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAmenity()}
              className="flex-1 px-3 py-2 bg-white border border-rose-200 rounded text-[12px] font-bold outline-none text-slate-800 placeholder-slate-400"
            />
            <button
              onClick={handleAddAmenity}
              disabled={isSuggestingAmenity || !newAmenityName}
              className="px-4 py-2 bg-[#f43f5e] hover:bg-[#e11d48] disabled:bg-slate-300 text-white rounded text-[11px] font-black uppercase tracking-wider transition-all disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isSuggestingAmenity ? 'Adding...' : 'Add'}
            </button>
          </div>
          <p className="text-[8px] font-black text-rose-700 uppercase tracking-widest">Claude auto-calculates cost & ADR impact</p>
        </div>

        {/* Amenities List - Compact Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-3 py-2 font-black text-slate-600 uppercase text-[10px]">Amenity</th>
                <th className="text-right px-3 py-2 font-black text-slate-600 uppercase text-[10px]">Cost ($)</th>
                <th className="text-right px-3 py-2 font-black text-slate-600 uppercase text-[10px]">ADR Boost ($)</th>
                <th className="text-right px-3 py-2 font-black text-slate-600 uppercase text-[10px]">Occ Boost (%)</th>
                <th className="text-center px-3 py-2 font-black text-slate-600 uppercase text-[10px]">Action</th>
              </tr>
            </thead>
            <tbody>
              {amenities.map((am, idx) => (
                <tr key={am.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-3 py-2 font-bold text-slate-900">{am.name}</td>
                  <td className="text-right px-3 py-2">
                    <input 
                      type="number" 
                      value={am.cost} 
                      onChange={(e) => handleEditAmenity(am.id, { cost: parseFloat(e.target.value) || 0 })} 
                      className="w-24 px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-bold text-slate-900 text-right outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </td>
                  <td className="text-right px-3 py-2">
                    <input 
                      type="number" 
                      value={am.adrBoost} 
                      onChange={(e) => handleEditAmenity(am.id, { adrBoost: parseFloat(e.target.value) || 0 })} 
                      className="w-24 px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-bold text-slate-900 text-right outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </td>
                  <td className="text-right px-3 py-2">
                    <input 
                      type="number" 
                      value={am.occBoost} 
                      onChange={(e) => handleEditAmenity(am.id, { occBoost: parseFloat(e.target.value) || 0 })} 
                      className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-bold text-slate-900 text-right outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </td>
                  <td className="text-center px-3 py-2">
                    {am.id !== 'furnishings' && (
                      <button
                        onClick={() => removeAmenity(am.id)}
                        className="text-slate-600 hover:text-[#f43f5e] transition-colors"
                        title="Delete amenity"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
