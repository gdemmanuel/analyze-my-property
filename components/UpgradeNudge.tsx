import React from 'react';
import { Lock, Zap, TrendingUp, Star, FileText, Lightbulb } from 'lucide-react';

interface UpgradeNudgeProps {
  analysesUsed: number;
  analysesLimit: number;
  onUpgrade: () => void;
}

const PRO_FEATURES = [
  {
    icon: Zap,
    label: '50 analyses / day',
    description: 'Up from 3/day on free',
  },
  {
    icon: TrendingUp,
    label: 'Sensitivity Analysis',
    description: 'See how ADR & occupancy changes affect ROI',
  },
  {
    icon: Star,
    label: 'Amenity ROI Panel',
    description: 'Calculate payback periods for each upgrade',
  },
  {
    icon: FileText,
    label: 'Lender Packet Export',
    description: 'Polished PDF reports for lenders',
  },
  {
    icon: Lightbulb,
    label: 'Path to Yes',
    description: 'AI finds ways to make any deal work',
  },
];

const UpgradeNudge: React.FC<UpgradeNudgeProps> = ({ analysesUsed, analysesLimit, onUpgrade }) => {
  const usedClamped = Math.min(analysesUsed, analysesLimit);
  const progressPct = analysesLimit > 0 ? (usedClamped / analysesLimit) * 100 : 0;
  const isAtLimit = usedClamped >= analysesLimit;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-[#0f172a] px-4 py-3 flex items-center gap-2">
        <Lock size={13} className="text-[#4CAF50] shrink-0" />
        <span className="text-xs font-black text-white uppercase tracking-widest">Upgrade to Pro</span>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Usage counter */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Today's Analyses</span>
            <span className={`text-xs font-black ${isAtLimit ? 'text-[#f43f5e]' : 'text-slate-900'}`}>
              {usedClamped} / {analysesLimit}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isAtLimit ? 'bg-[#f43f5e]' : 'bg-[#4CAF50]'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {isAtLimit && (
            <p className="text-[10px] font-semibold text-[#f43f5e] mt-1">Daily limit reached</p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* Pro features list */}
        <div className="space-y-3">
          {PRO_FEATURES.map(({ icon: Icon, label, description }) => (
            <div key={label} className="flex items-start gap-2">
              <div className="mt-0.5 shrink-0 w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center">
                <Icon size={11} className="text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 leading-tight">{label}</p>
                <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onUpgrade}
          className="w-full bg-[#4CAF50] hover:bg-[#43a047] text-white text-xs font-black uppercase tracking-widest py-2.5 rounded-xl transition-colors"
        >
          Upgrade — $29/mo
        </button>

        <p className="text-[10px] text-slate-400 text-center leading-snug">
          Cancel anytime. Instant access.
        </p>
      </div>
    </div>
  );
};

export default UpgradeNudge;
