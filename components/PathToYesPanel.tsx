import React from 'react';
import { Zap, Target, ChevronRight, ArrowRight, CheckCircle, AlertTriangle, TrendingUp, AlertCircle, XCircle } from 'lucide-react';
import { PathToYes } from '../prompts/underwriting';
import InfoTooltip from './InfoTooltip';

interface PathToYesPanelProps {
    data: PathToYes | null;
    isLoading?: boolean;
    onRefresh?: () => void;
    onApplyRecommendation?: (action: string) => void;
    liveKpis?: {
        capRate: number;
        cashOnCash: number;
        dscr: number;
    };
    targets?: {
        minCapRate: number;
        minCoC: number;
        minDSCR: number;
    };
}

// 5-tier status configuration
const statusConfig: Record<string, { bg: string; border: string; text: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
    'Strong Buy': { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700', icon: TrendingUp },
    'Buy': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', icon: CheckCircle },
    'Conditional Buy': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', icon: AlertCircle },
    'Review': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', icon: AlertTriangle },
    'No-Buy': { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', icon: XCircle }
};

const PathToYesPanel: React.FC<PathToYesPanelProps> = ({ data, isLoading, onRefresh, onApplyRecommendation, liveKpis, targets }) => {
    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full" />
                <span className="ml-3 text-slate-500 font-black text-sm uppercase tracking-widest">Calculating Path to Yes...</span>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                <p className="text-slate-400 font-black text-sm uppercase tracking-widest">
                    Get actionable recommendations to make this deal work
                </p>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="mt-4 px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest"
                    >
                        Calculate Path to Yes
                    </button>
                )}
            </div>
        );
    }

    const status = data.currentStatus || 'No-Buy';
    const config = statusConfig[status] || statusConfig['No-Buy'];
    const StatusIcon = config.icon;
    const isPositive = status === 'Strong Buy' || status === 'Buy';

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${config.bg} ${config.text}`}>
                        <Target size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest">Path to Yes</h3>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${config.text}`}>
                            Current Status: {status}
                        </p>
                    </div>
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

            {/* Status Banner with statusReason */}
            <div className={`p-4 rounded-xl mb-6 ${config.bg} border ${config.border}`}>
                <div className="flex items-center gap-2 mb-2">
                    <StatusIcon size={16} className={config.text} />
                    <span className={`text-sm font-black ${config.text}`}>
                        {status === 'Strong Buy' && 'Excellent deal! All metrics significantly exceed targets.'}
                        {status === 'Buy' && 'This deal meets your investment criteria!'}
                        {status === 'Conditional Buy' && 'Good potential with minor improvements needed.'}
                        {status === 'Review' && 'This deal needs significant improvements.'}
                        {status === 'No-Buy' && 'This deal does not meet your investment criteria.'}
                    </span>
                </div>
                {data.statusReason && (
                    <p className={`text-xs ${config.text} opacity-80`}>{data.statusReason}</p>
                )}
                {data.metricsExcluded && data.metricsExcluded.length > 0 && (
                    <p className="text-xs text-slate-500 mt-2">
                        Excluded: {data.metricsExcluded.join(', ')}
                    </p>
                )}
            </div>

            {/* Target Gaps - Using LIVE KPIs */}
            {!isPositive && liveKpis && targets && (
                <div className="mb-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                        Target Gaps
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Cap Rate */}
                        <div className="p-3 bg-slate-50 rounded-xl border-2 border-slate-200">
                            <div className="flex items-center gap-1.5 mb-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    CAP RATE
                                </p>
                                <InfoTooltip content="Capitalization Rate: Annual NOI divided by purchase price. Measures return independent of financing. Higher = better." />
                            </div>
                            <div className="flex items-baseline justify-between mb-1">
                                <div>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Current</p>
                                    <span className={`text-xl font-black ${liveKpis.capRate >= targets.minCapRate ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {liveKpis.capRate.toFixed(2)}%
                                    </span>
                                </div>
                                <ArrowRight size={16} className="text-slate-300 mx-2" />
                                <div className="text-right">
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Target</p>
                                    <span className="text-xl font-black text-slate-600">{targets.minCapRate.toFixed(2)}%</span>
                                </div>
                            </div>
                            {liveKpis.capRate < targets.minCapRate && (
                                <p className="text-[10px] font-bold text-rose-600 mt-1">
                                    Need +{(targets.minCapRate - liveKpis.capRate).toFixed(2)}%
                                </p>
                            )}
                        </div>
                        {/* Cash-on-Cash */}
                        <div className="p-3 bg-slate-50 rounded-xl border-2 border-slate-200">
                            <div className="flex items-center gap-1.5 mb-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    CASH-ON-CASH
                                </p>
                                <InfoTooltip content="Cash-on-Cash Return: Annual cash flow divided by total cash invested (down payment + closing costs). Measures return on YOUR money." />
                            </div>
                            <div className="flex items-baseline justify-between mb-1">
                                <div>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Current</p>
                                    <span className={`text-xl font-black ${liveKpis.cashOnCash >= targets.minCoC ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {liveKpis.cashOnCash.toFixed(2)}%
                                    </span>
                                </div>
                                <ArrowRight size={16} className="text-slate-300 mx-2" />
                                <div className="text-right">
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Target</p>
                                    <span className="text-xl font-black text-slate-600">{targets.minCoC.toFixed(2)}%</span>
                                </div>
                            </div>
                            {liveKpis.cashOnCash < targets.minCoC && (
                                <p className="text-[10px] font-bold text-rose-600 mt-1">
                                    Need +{(targets.minCoC - liveKpis.cashOnCash).toFixed(2)}%
                                </p>
                            )}
                        </div>
                        {/* DSCR */}
                        <div className="p-3 bg-slate-50 rounded-xl border-2 border-slate-200">
                            <div className="flex items-center gap-1.5 mb-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    DSCR
                                </p>
                                <InfoTooltip content="Debt Service Coverage Ratio: NOI divided by total debt payments. Lenders require 1.25+. Higher = safer margin for loan payments." />
                            </div>
                            <div className="flex items-baseline justify-between mb-1">
                                <div>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Current</p>
                                    <span className={`text-xl font-black ${liveKpis.dscr >= targets.minDSCR ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {liveKpis.dscr.toFixed(2)}
                                    </span>
                                </div>
                                <ArrowRight size={16} className="text-slate-300 mx-2" />
                                <div className="text-right">
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Target</p>
                                    <span className="text-xl font-black text-slate-600">{targets.minDSCR.toFixed(2)}</span>
                                </div>
                            </div>
                            {liveKpis.dscr < targets.minDSCR && (
                                <p className="text-[10px] font-bold text-rose-600 mt-1">
                                    Need +{(targets.minDSCR - liveKpis.dscr).toFixed(2)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
                <div className="mb-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                        <Zap size={12} className="inline mr-1" />
                        Recommended Actions
                    </p>
                    <div className="space-y-3">
                        {data.recommendations.map((rec) => (
                            <div
                                key={rec.priority}
                                className="p-4 border border-slate-100 rounded-xl hover:border-indigo-200 transition-all group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black">
                                            P{rec.priority}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 text-sm mb-1">{rec.action}</p>
                                            <p className="text-[11px] font-bold text-emerald-600 mb-1">
                                                Impact: {rec.quantifiedImpact}
                                            </p>
                                            <p className="text-[10px] font-medium text-slate-400">
                                                {rec.implementationNotes}
                                            </p>
                                        </div>
                                    </div>
                                    {onApplyRecommendation && (
                                        <button
                                            onClick={() => onApplyRecommendation(rec.action)}
                                            className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                                        >
                                            Apply <ChevronRight size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Minimal Changes Summary */}
            {data.minimalChanges.length > 0 && (
                <div className="p-4 bg-emerald-50 rounded-xl">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">
                        Minimal Changes to Reach Buy
                    </p>
                    <ul className="space-y-1">
                        {data.minimalChanges.map((change, idx) => (
                            <li key={idx} className="text-[11px] font-bold text-emerald-700 flex items-start gap-2">
                                <CheckCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                {change}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default PathToYesPanel;
