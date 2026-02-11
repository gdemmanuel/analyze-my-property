
import React from 'react';
import { SavedAssessment } from '../types';
import { Trash, ExternalLink, ArrowRight, BarChart4 } from 'lucide-react';

interface Props {
  saved: SavedAssessment[];
  onDelete: (id: string) => void;
  onLoad: (assessment: SavedAssessment) => void;
}

const ComparisonReport: React.FC<Props> = ({ saved, onDelete, onLoad }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  if (saved.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[4rem] border-4 border-dashed border-slate-200">
        <BarChart4 size={60} className="text-slate-200 mb-6" />
        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">No Comparisons Found</h3>
        <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Underwrite and save some deals to generate comparative reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center mb-8 px-4">
        <div>
           <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Portfolio Matchup</h2>
           <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-2">Side-by-side analysis of your saved underwriting assessments.</p>
        </div>
        <span className="px-5 py-2.5 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-xl">
           {saved.length} Deals in Tracker
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {saved.map((item) => {
          const strategyColor = item.strategy === 'STR' ? 'bg-rose-500' : (item.strategy === 'MTR' ? 'bg-blue-500' : 'bg-emerald-500');
          return (
            <div key={item.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden group hover:shadow-2xl transition-all border-b-8 hover:border-b-rose-500">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <span className={`px-4 py-1.5 ${strategyColor} text-white text-[9px] font-black rounded-full uppercase tracking-widest`}>
                    {item.strategy} Strategy
                  </span>
                  <button onClick={() => onDelete(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash size={18} /></button>
                </div>
                
                <h3 className="text-xl font-black text-slate-800 tracking-tighter mb-1 truncate">{item.address.split(',')[0]}</h3>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-6">{new Date(item.timestamp).toLocaleDateString()}</p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center py-3 border-b border-slate-50">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Acquisition</span>
                    <span className="font-bold text-slate-800">{formatCurrency(item.config.price)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-slate-50">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Target Revenue</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(item.insight.suggestedMonthlyRevenue || 0)}/mo</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-slate-50">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Est. CashFlow</span>
                    <span className="font-bold text-indigo-500">{formatCurrency(item.insight.proFormaScenarios?.[1]?.cashFlow || 0)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                   <button onClick={() => onLoad(item)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all">
                      Load Audit <ArrowRight size={14} className="text-rose-500" />
                   </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ComparisonReport;
