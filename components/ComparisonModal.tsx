import React from 'react';
import { SavedAssessment, RentalStrategy } from '../types';

interface ComparisonModalProps {
  savedAssessments: SavedAssessment[];
  selectedForComparison: string[];
  onClose: () => void;
  // Navigation handlers
  setPropertyInput: (v: string) => void;
  setDisplayedAddress: (v: string) => void;
  setStrategy: (s: RentalStrategy) => void;
  setActiveTab: (tab: any) => void;
  runAnalysis: () => void;
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({
  savedAssessments, selectedForComparison, onClose,
  setPropertyInput, setDisplayedAddress, setStrategy, setActiveTab, runAnalysis
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#0f172a] text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tighter">Property Comparison</h2>
            <p className="text-sm text-slate-600 mt-1">Comparing {selectedForComparison.length} properties</p>
          </div>
          <button
            onClick={onClose}
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
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-600">
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
                      onClose();
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
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
