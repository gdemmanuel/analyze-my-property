import React from 'react';
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
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  baseConfig, handleInputChange, investmentTargets, setInvestmentTargets,
  amenities, newAmenityName, setNewAmenityName, isSuggestingAmenity,
  handleAddAmenity, handleEditAmenity, removeAmenity
}) => {
  return (
    <div className="space-y-6 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
        <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tighter flex items-center gap-4"><div className="p-3 bg-rose-50 rounded-xl text-[#f43f5e]"><Settings size={24} /></div> Global Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
          {[{ label: 'Purchase Price $', field: 'price' }, { label: 'Down Pmt %', field: 'downPaymentPercent' }, { label: 'Mortgage Rate %', field: 'mortgageRate' }, { label: 'HELOC Funding %', field: 'helocFundingPercent' }, { label: 'HELOC Rate %', field: 'helocRate' }, { label: 'Target STR ADR $', field: 'adr' }, { label: 'Target MTR Rent $', field: 'mtrMonthlyRent' }, { label: 'Target LTR Rent $', field: 'ltrMonthlyRent' }, { label: 'STR Occupancy %', field: 'occupancyPercent' }, { label: 'Mgmt Fee %', field: 'mgmtFeePercent' }, { label: 'Maintenance %', field: 'maintenancePercent' }, { label: 'Fixed Opex / Mo $', field: 'fixedOpexMonthly' }, { label: 'Prop. Tax / Mo $', field: 'propertyTaxMonthly' }, { label: 'Prop. Tax Rate %', field: 'annualPropertyTaxRate' }, { label: 'HELOC Allocation %', field: 'helocPaydownPercent' }, { label: 'Ann. Appreciation %', field: 'annualAppreciationRate' }, { label: 'Ann. Rent Growth %', field: 'annualRentGrowthRate' }, { label: 'Ann. Inflation %', field: 'annualExpenseInflationRate' }].map(item => (
            <div key={item.field} className="space-y-1.5"><label className="text-[10px] font-black text-slate-600 uppercase">{item.label}</label><input type="text" value={item.label.includes('$') ? new Intl.NumberFormat().format((baseConfig as any)[item.field]) : (baseConfig as any)[item.field]} onChange={(e) => handleInputChange(item.field as any, e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl font-black text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></div>
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
            <label className="text-[10px] font-black text-slate-600 uppercase">Min Cap Rate %</label>
            <input
              type="number"
              value={investmentTargets.minCapRate}
              onChange={(e) => setInvestmentTargets({ ...investmentTargets, minCapRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl font-black text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 uppercase">Min Cash-on-Cash %</label>
            <input
              type="number"
              value={investmentTargets.minCoC}
              onChange={(e) => setInvestmentTargets({ ...investmentTargets, minCoC: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl font-black text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 uppercase">Min DSCR</label>
            <input
              type="number"
              step="0.01"
              value={investmentTargets.minDSCR}
              onChange={(e) => setInvestmentTargets({ ...investmentTargets, minDSCR: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl font-black text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          These targets are used by Path to Yes to determine deal status. Changes are saved automatically.
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
        <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tighter flex items-center gap-4"><div className="p-3 bg-rose-50 rounded-xl text-[#f43f5e]"><Sparkles size={24} /></div> Property Amenities</h2>
        
        {/* Add New Amenity Section */}
        <div className="mb-8 p-6 bg-rose-50 rounded-2xl border-2 border-rose-200">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter amenity name (e.g., Hot Tub, Smart TV, Pool)..."
              value={newAmenityName}
              onChange={(e) => setNewAmenityName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAmenity()}
              className="flex-1 px-4 py-3 bg-white border border-rose-200 rounded-xl font-black outline-none text-slate-800 placeholder-slate-400"
            />
            <button
              onClick={handleAddAmenity}
              disabled={isSuggestingAmenity || !newAmenityName}
              className="px-6 py-3 bg-[#f43f5e] hover:bg-[#e11d48] disabled:bg-slate-300 text-white rounded-xl font-black uppercase tracking-wider transition-all disabled:cursor-not-allowed"
            >
              {isSuggestingAmenity ? 'Adding...' : 'Add'}
            </button>
          </div>
          <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest mt-3">Claude will auto-calculate cost, ADR boost, and occupancy impact</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {amenities.map(am => (
            <div key={am.id} className="p-6 border-2 border-slate-200 rounded-2xl bg-white shadow-lg">
              <div className="flex justify-between mb-4">
                <p className="font-black uppercase text-slate-900">{am.name}</p>
                {am.id !== 'furnishings' && (
                  <button
                    onClick={() => removeAmenity(am.id)}
                    className="text-slate-600 hover:text-[#f43f5e] transition-colors"
                  >
                    <Trash size={16} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-600">COST ($)</label><input type="number" value={am.cost} onChange={(e) => handleEditAmenity(am.id, { cost: parseFloat(e.target.value) || 0 })} className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-2 font-black text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-600">ADR BOOST</label><input type="number" value={am.adrBoost} onChange={(e) => handleEditAmenity(am.id, { adrBoost: parseFloat(e.target.value) || 0 })} className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-2 font-black text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
