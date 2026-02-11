import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import { SensitivityMatrix } from '../prompts/underwriting';

interface SensitivityTableProps {
    data: SensitivityMatrix | null;
    isLoading?: boolean;
    onRefresh?: () => void;
}

const SensitivityTable: React.FC<SensitivityTableProps> = ({ data, isLoading, onRefresh }) => {
    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-12 flex flex-col items-center justify-center shadow-lg">
                <div className="animate-spin w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full mb-4" />
                <span className="text-slate-700 font-black text-sm uppercase tracking-widest">Generating Sensitivity Analysis...</span>
                <span className="text-slate-500 text-xs mt-2">This may take 10-15 seconds</span>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 text-center shadow-lg">
                <p className="text-slate-600 font-black text-sm uppercase tracking-widest mb-4">
                    Run sensitivity analysis to see how changes in ADR, Occupancy, and Rate affect your returns
                </p>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="mt-4 px-8 py-3 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-xl transform hover:scale-105 transition-all cursor-pointer"
                    >
                        🎯 Generate Analysis
                    </button>
                )}
            </div>
        );
    }

    // Build 5x5 matrix from flat array
    const matrixGrid: { [key: string]: { ownerSurplus: number; cashOnCash: number; dscr: number } } = {};
    data.matrix.forEach((cell) => {
        const key = `${cell.adrDelta},${cell.occDelta}`;
        matrixGrid[key] = {
            ownerSurplus: cell.ownerSurplus,
            cashOnCash: cell.cashOnCash,
            dscr: cell.dscr
        };
    });

    const getCellColor = (surplus: number) => {
        if (surplus >= 5000) return 'bg-emerald-100 text-emerald-700';
        if (surplus >= 0) return 'bg-emerald-50 text-emerald-600';
        if (surplus >= -5000) return 'bg-amber-50 text-amber-600';
        return 'bg-rose-100 text-rose-700';
    };

    const formatCurrency = (val: number) =>
        val >= 0 ? `$${(val / 1000).toFixed(1)}k` : `-$${(Math.abs(val) / 1000).toFixed(1)}k`;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500">
                        <TrendingUp size={18} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Sensitivity Analysis</h3>
                </div>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest"
                    >
                        Refresh
                    </button>
                )}
            </div>

            {/* ADR vs Occupancy Matrix */}
            <div className="mb-6">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">
                    ADR vs Occupancy Impact on Owner Surplus
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-center">
                        <thead>
                            <tr>
                                <th className="p-2 text-[9px] font-black text-slate-600 uppercase">ADR ↓ / OCC →</th>
                                {data.occVariations.map((occ) => (
                                    <th key={occ} className="p-2 text-[9px] font-black text-slate-500 uppercase">
                                        {occ >= 0 ? '+' : ''}{occ}%
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.adrVariations.map((adr) => (
                                <tr key={adr}>
                                    <td className="p-2 text-[9px] font-black text-slate-500 uppercase">
                                        {adr >= 0 ? '+' : ''}{adr}%
                                    </td>
                                    {data.occVariations.map((occ) => {
                                        const cell = matrixGrid[`${adr},${occ}`];
                                        const surplus = cell?.ownerSurplus || 0;
                                        return (
                                            <td
                                                key={occ}
                                                className={`p-2 text-[11px] font-black rounded ${getCellColor(surplus)}`}
                                            >
                                                {formatCurrency(surplus)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Rate Sensitivity */}
            <div className="mb-6">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">
                    Interest Rate Sensitivity (bps)
                </p>
                <div className="flex gap-2 flex-wrap">
                    {data.rateVariations.map((rate) => (
                        <div
                            key={rate}
                            className="px-4 py-2 bg-slate-50 rounded-xl text-center"
                        >
                            <p className="text-[9px] font-black text-slate-600 uppercase">
                                {rate >= 0 ? '+' : ''}{rate} bps
                            </p>
                            <p className="text-sm font-black text-slate-700">
                                {/* Rate impact would be calculated */}
                                ~{rate >= 0 ? '-' : '+'}${Math.abs(rate * 15).toFixed(0)}/mo
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Breakpoints */}
            {data.breakpoints.length > 0 && (
                <div className="mb-4">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">
                        Critical Breakpoints
                    </p>
                    <div className="space-y-2">
                        {data.breakpoints.map((bp, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
                                <AlertTriangle size={14} className="text-amber-500" />
                                <p className="text-[11px] font-bold text-amber-700">
                                    <span className="font-black">{bp.description}:</span> {bp.threshold}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Guidance */}
            {data.guidance && (
                <div className="p-4 bg-indigo-50 rounded-xl">
                    <p className="text-[11px] font-bold text-indigo-700">{data.guidance}</p>
                </div>
            )}
        </div>
    );
};

export default SensitivityTable;
