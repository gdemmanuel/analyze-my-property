import React, { useState } from 'react';
import { Settings, X, RotateCcw } from 'lucide-react';

interface InvestmentTargetsSettingsProps {
    targets: {
        minCapRate: number;
        minCoC: number;
        minDSCR: number;
    };
    onSave: (targets: { minCapRate: number; minCoC: number; minDSCR: number }) => void;
    onClose: () => void;
}

const InvestmentTargetsSettings: React.FC<InvestmentTargetsSettingsProps> = ({ targets, onSave, onClose }) => {
    const [localTargets, setLocalTargets] = useState(targets);

    const handleReset = () => {
        setLocalTargets({
            minCapRate: 6,
            minCoC: 10,
            minDSCR: 1.25
        });
    };

    const handleSave = () => {
        onSave(localTargets);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Settings size={18} className="text-slate-600" />
                        <h2 className="text-base font-bold text-slate-800">Investment Targets</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-600 hover:text-slate-600"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 mb-4">
                    Set minimum thresholds for Path to Yes evaluation.
                </p>

                {/* Input Fields */}
                <div className="space-y-3 mb-5">
                    {/* Cap Rate */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Min Cap Rate (%)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={localTargets.minCapRate}
                            onChange={(e) => setLocalTargets({ ...localTargets, minCapRate: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p className="text-[10px] text-slate-600 mt-0.5">Standard: 6-8%</p>
                    </div>

                    {/* Cash-on-Cash */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Min Cash-on-Cash (%)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={localTargets.minCoC}
                            onChange={(e) => setLocalTargets({ ...localTargets, minCoC: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p className="text-[10px] text-slate-600 mt-0.5">Standard: 8-12%</p>
                    </div>

                    {/* DSCR */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Min DSCR
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={localTargets.minDSCR}
                            onChange={(e) => setLocalTargets({ ...localTargets, minDSCR: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p className="text-[10px] text-slate-600 mt-0.5">Lender minimum: 1.20-1.25</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <button
                        onClick={handleReset}
                        className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md font-semibold text-xs text-slate-600 transition-colors flex items-center justify-center gap-1.5"
                    >
                        <RotateCcw size={14} />
                        Reset
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-xs transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InvestmentTargetsSettings;
