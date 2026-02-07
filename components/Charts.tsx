
import React, { useState, useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, BarChart, Bar, ReferenceLine, ComposedChart
} from 'recharts';
import { MonthlyProjection } from '../types';
import { TrendingUp, DollarSign, BarChart3, Rocket, Target, Zap, TrendingDown, Activity } from 'lucide-react';
import InfoTooltip from './InfoTooltip';

interface ChartProps {
  data: MonthlyProjection[];
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 p-6 border border-white/10 shadow-2xl rounded-[2rem] text-[11px] text-white backdrop-blur-xl ring-1 ring-white/10">
        <p className="font-black text-rose-500 mb-4 border-b border-white/10 pb-2 uppercase tracking-[0.2em]">{label}</p>
        <div className="space-y-3">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex justify-between items-center gap-12">
              <span className="flex items-center gap-2.5 font-bold uppercase tracking-widest text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}
              </span>
              <span className="font-mono font-black text-white">{typeof entry.value === 'number' ? (entry.name.includes('%') ? `${entry.value.toFixed(2)}%` : formatCurrency(entry.value)) : entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const Charts: React.FC<ChartProps> = ({ data }) => {
  const [timeframe, setTimeframe] = useState<12 | 36 | 60 | 120 | 240>(60);
  const filteredData = useMemo(() => data.slice(0, timeframe), [data, timeframe]);

  // Calculate ROI metrics for each month
  const roiData = useMemo(() => {
    return filteredData.map((month, idx) => {
      const initialInvestment = data[0]?.propertyValue ? (data[0].propertyValue * 0.25) : 100000; // Assume 25% down
      const equity = month.propertyValue - month.mortgageBalance;
      const totalReturn = equity + month.cumulativeNetCash - initialInvestment;
      const roi = initialInvestment > 0 ? (totalReturn / initialInvestment) * 100 : 0;

      return {
        ...month,
        roi,
        equity,
        monthlyROI: month.cashFlowAfterDebt / initialInvestment * 100
      };
    });
  }, [filteredData, data]);

  // Break-even analysis - factors in HELOC payoff
  const initialHelocBalance = data[0]?.helocBalance || 0;
  const hasHeloc = initialHelocBalance > 0;

  const breakEvenMonth = useMemo(() => {
    if (hasHeloc) {
      // With HELOC: break-even when HELOC is fully paid off
      return filteredData.findIndex(m => m.helocBalance <= 0);
    } else {
      // No HELOC: break-even when cumulative cash flow is positive
      return filteredData.findIndex(m => m.cumulativeNetCash >= 0);
    }
  }, [filteredData, hasHeloc]);

  const TimeframeSelector = ({ current, onChange }: any) => (
    <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-200 shadow-inner overflow-x-auto no-scrollbar">
      {[12, 36, 60, 120, 240].map((t) => (
        <button
          key={t}
          onClick={() => onChange(t as any)}
          className={`px-5 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest whitespace-nowrap ${current === t ? 'bg-white text-slate-900 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}
        >
          {t / 12}Y
        </button>
      ))}
    </div>
  );

  const lastMonth = filteredData[filteredData.length - 1];
  const totalEquity = (lastMonth?.propertyValue || 0) - (lastMonth?.mortgageBalance || 0);
  const avgMonthlyCashFlow = filteredData.reduce((sum, m) => sum + m.cashFlowAfterDebt, 0) / filteredData.length;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 mx-auto px-4 lg:px-0">

      {/* 1. CASH FLOW ANALYSIS */}
      <div className="bg-white p-8 lg:p-12 rounded-[4rem] shadow-xl border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600"><Activity size={24} /></div>
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Monthly Performance</h3>
              <p className="text-3xl font-black text-slate-800 tracking-tighter">Cash Flow Analysis</p>
            </div>
          </div>
          <TimeframeSelector current={timeframe} onChange={setTimeframe} />
        </div>
        <div className="h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 800 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 800 }} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: 30 }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              <Bar dataKey="cashFlowAfterDebt" name="Monthly Cash Flow" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
              <Line type="monotone" dataKey="cumulativeNetCash" name="Cumulative Profit" stroke="#6366f1" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className={`mt-8 pt-8 border-t border-slate-50 grid ${hasHeloc ? 'grid-cols-4' : 'grid-cols-3'} gap-6`}>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Monthly CF</p>
            <p className={`text-2xl font-black tracking-tighter ${avgMonthlyCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(avgMonthlyCashFlow)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Profit (Y{timeframe / 12})</p>
            <p className="text-2xl font-black text-indigo-600 tracking-tighter">{formatCurrency(lastMonth?.cumulativeNetCash || 0)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Break-Even</p>
              <InfoTooltip content="The month when cumulative cash flow turns positive. 'Immediate' means you're profitable from month 1." />
            </div>
            <p className="text-2xl font-black text-slate-800 tracking-tighter">
              {cashFlowBreakEven === 0 ? 'Immediate' : cashFlowBreakEven > 0 ? formatTimespan(cashFlowBreakEven + 1) : `>${timeframe / 12}Y`}
            </p>
          </div>
          {hasHeloc && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">HELOC Payoff</p>
                <InfoTooltip content="The month when your HELOC balance reaches $0. Since you funded the down payment with HELOC, you're not truly 'even' until it's paid off." />
              </div>
              <p className="text-2xl font-black text-rose-600 tracking-tighter">
                {helocPayoffMonth === 0 ? 'Immediate' : helocPayoffMonth > 0 ? formatTimespan(helocPayoffMonth + 1) : `>${timeframe / 12}Y`}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* 2. ROI METRICS DASHBOARD */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-10 lg:p-12 rounded-[3.5rem] shadow-2xl flex flex-col text-white">
          <div className="flex items-center gap-5 mb-12">
            <div className="p-4 bg-white/10 rounded-2xl text-white"><Target size={24} /></div>
            <div>
              <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] mb-1">Return Metrics</h3>
              <p className="text-2xl font-black text-white tracking-tighter">ROI Performance</p>
            </div>
          </div>
          <div className="flex-1 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={roiData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" hide />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)', fontWeight: 800 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="roi" stroke="#fbbf24" strokeWidth={4} dot={false} name="Total ROI %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 pt-8 border-t border-white/20 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">Current ROI</p>
              <p className="text-3xl font-black text-amber-300 tracking-tighter">{roiData[roiData.length - 1]?.roi.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">Total Equity</p>
              <p className="text-3xl font-black text-white tracking-tighter">{formatCurrency(totalEquity)}</p>
            </div>
          </div>
        </div>

        {/* 3. EQUITY BUILDUP */}
        <div className="bg-white p-10 lg:p-12 rounded-[3.5rem] shadow-xl border border-slate-100 flex flex-col">
          <div className="flex items-center gap-5 mb-12">
            <div className="p-4 bg-blue-50 rounded-2xl text-blue-600"><Rocket size={24} /></div>
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Wealth Accumulation</h3>
              <p className="text-2xl font-black text-slate-800 tracking-tighter">Equity Buildup</p>
            </div>
          </div>
          <div className="flex-1 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" hide />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 800 }} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey={(d) => d.propertyValue - d.mortgageBalance} stroke="#3b82f6" strokeWidth={4} fill="url(#colorEquity)" name="Home Equity" />
                <Line type="monotone" dataKey="propertyValue" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Property Value" />
                <Line type="monotone" dataKey="mortgageBalance" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Mortgage Balance" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Equity (Y{timeframe / 12})</p>
                <p className="text-3xl font-black text-blue-600 tracking-tighter">{formatCurrency(totalEquity)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Property Value</p>
                <p className="text-xl font-black text-slate-600 tracking-tighter">{formatCurrency(lastMonth?.propertyValue || 0)}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Charts;
