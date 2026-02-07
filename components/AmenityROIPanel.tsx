import React from 'react';
import { TrendingUp, Award, Clock, AlertCircle, DollarSign } from 'lucide-react';
import { AmenityROIResult } from '../prompts/underwriting';

interface AmenityROIPanelProps {
    data: AmenityROIResult | null;
    isLoading?: boolean;
    onRefresh?: () => void;
}

const AmenityROIPanel: React.FC<AmenityROIPanelProps> = ({ data, isLoading, onRefresh }) => {
    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full" />
                <span className="ml-3 text-slate-500 font-black text-sm uppercase tracking-widest">Analyzing Amenity ROI...</span>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                <p className="text-slate-400 font-black text-sm uppercase tracking-widest">
                    Calculate ROI for potential amenity upgrades with diminishing returns analysis
                </p>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="mt-4 px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest"
                    >
                        Analyze Amenities
                    </button>
                )}
            </div>
        );
    }

    const getRankBadge = (rank: number) => {
        if (rank === 1) return 'bg-amber-100 text-amber-700 border-amber-200';
        if (rank === 2) return 'bg-slate-100 text-slate-600 border-slate-200';
        if (rank === 3) return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-slate-50 text-slate-500 border-slate-100';
    };

    const getPaybackColor = (months: number) => {
        if (months <= 12) return 'text-emerald-600';
        if (months <= 24) return 'text-amber-600';
        return 'text-rose-600';
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500">
                        <Award size={18} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Amenity ROI Analysis</h3>
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

            {/* Ranked List */}
            <div className="space-y-3 mb-6">
                {data.rankedList.map((amenity) => (
                    <div
                        key={amenity.name}
                        className="p-4 border border-slate-100 rounded-xl hover:border-slate-200 transition-all"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase border ${getRankBadge(amenity.rank)}`}>
                                    #{amenity.rank}
                                </div>
                                <div>
                                    <p className="font-black text-slate-800 uppercase text-sm">{amenity.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400">Setup: {formatCurrency(amenity.setupCost)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-emerald-600">+{formatCurrency(amenity.deltaRevenue)}/yr</p>
                                <p className={`text-[10px] font-black uppercase ${getPaybackColor(amenity.paybackMonths)}`}>
                                    <Clock size={10} className="inline mr-1" />
                                    {amenity.paybackMonths.toFixed(1)} mo payback
                                </p>
                            </div>
                        </div>

                        {/* Confidence Range Bar */}
                        <div className="mt-2">
                            <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                                <span>{amenity.confidenceRange.low} mo</span>
                                <span className="text-slate-600">90% Confidence Range</span>
                                <span>{amenity.confidenceRange.high} mo</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                                <div
                                    className="absolute h-full bg-emerald-200 rounded-full"
                                    style={{
                                        left: `${(amenity.confidenceRange.low / amenity.confidenceRange.high) * 50}%`,
                                        right: '0%',
                                        width: `${100 - (amenity.confidenceRange.low / amenity.confidenceRange.high) * 50}%`
                                    }}
                                />
                                <div
                                    className="absolute h-full w-1 bg-emerald-500 rounded-full"
                                    style={{ left: `${(amenity.paybackMonths / amenity.confidenceRange.high) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Diminishing Returns Note */}
                        {amenity.diminishingReturnsNote && (
                            <div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                                <AlertCircle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                <p className="text-[10px] font-bold text-amber-700">{amenity.diminishingReturnsNote}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Stacking Recommendations */}
            {data.stackingRecommendations.length > 0 && (
                <div className="p-4 bg-indigo-50 rounded-xl">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">
                        <DollarSign size={12} className="inline mr-1" />
                        Stacking Recommendations
                    </p>
                    <ul className="space-y-1">
                        {data.stackingRecommendations.map((rec, idx) => (
                            <li key={idx} className="text-[11px] font-bold text-indigo-700 flex items-start gap-2">
                                <span className="text-indigo-400">•</span>
                                {rec}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default AmenityROIPanel;
