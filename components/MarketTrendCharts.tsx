import React, { useState, useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, ComposedChart, Bar
} from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { MarketTrendEntry } from '../services/rentcastService';
import { formatCurrency } from '../utils/formatCurrency';

interface MarketTrendChartsProps {
  saleTrends: MarketTrendEntry[];
  rentalTrends: MarketTrendEntry[];
  zipCode?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 p-4 border border-white/10 shadow-2xl rounded-xl text-[10px] text-white backdrop-blur-xl">
        <p className="font-black text-rose-500 mb-2 border-b border-white/10 pb-1 uppercase tracking-widest">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex justify-between items-center gap-8">
              <span className="flex items-center gap-2 font-bold text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}
              </span>
              <span className="font-mono font-black text-white">
                {typeof entry.value === 'number'
                  ? entry.name.toLowerCase().includes('days') || entry.name.toLowerCase().includes('listing')
                    ? Math.round(entry.value)
                    : formatCurrency(entry.value)
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const MarketTrendCharts: React.FC<MarketTrendChartsProps> = ({ saleTrends, rentalTrends, zipCode }) => {
  const [activeChart, setActiveChart] = useState<'price' | 'rent'>('price');

  const hasSaleData = saleTrends.length > 2;
  const hasRentalData = rentalTrends.length > 2;

  // Format date labels for charts
  const formattedSaleData = useMemo(() => {
    return saleTrends.map(d => ({
      ...d,
      label: d.date.length >= 7 ? d.date.substring(0, 7) : d.date,
    }));
  }, [saleTrends]);

  const formattedRentalData = useMemo(() => {
    return rentalTrends.map(d => ({
      ...d,
      label: d.date.length >= 7 ? d.date.substring(0, 7) : d.date,
    }));
  }, [rentalTrends]);

  // Calculate appreciation rates
  const saleAppreciation = useMemo(() => {
    if (saleTrends.length < 2) return null;
    const first = saleTrends[0]?.medianPrice || saleTrends[0]?.averagePrice;
    const last = saleTrends[saleTrends.length - 1]?.medianPrice || saleTrends[saleTrends.length - 1]?.averagePrice;
    if (!first || !last) return null;
    const months = saleTrends.length;
    const annualized = ((last / first) ** (12 / months) - 1) * 100;
    return annualized;
  }, [saleTrends]);

  const rentGrowth = useMemo(() => {
    if (rentalTrends.length < 2) return null;
    const first = rentalTrends[0]?.medianRent || rentalTrends[0]?.averageRent;
    const last = rentalTrends[rentalTrends.length - 1]?.medianRent || rentalTrends[rentalTrends.length - 1]?.averageRent;
    if (!first || !last) return null;
    const months = rentalTrends.length;
    const annualized = ((last / first) ** (12 / months) - 1) * 100;
    return annualized;
  }, [rentalTrends]);

  if (!hasSaleData && !hasRentalData) return null;

  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-100 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500"><TrendingUp size={16} /></div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Market Trends</h3>
            <p className="text-[9px] text-slate-500 font-bold">ZIP {zipCode || ''} Historical Data</p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg gap-0.5">
          {hasSaleData && (
            <button
              onClick={() => setActiveChart('price')}
              className={`px-3 py-1.5 text-[9px] font-black rounded-md uppercase tracking-widest transition-all ${
                activeChart === 'price' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sale Prices
            </button>
          )}
          {hasRentalData && (
            <button
              onClick={() => setActiveChart('rent')}
              className={`px-3 py-1.5 text-[9px] font-black rounded-md uppercase tracking-widest transition-all ${
                activeChart === 'rent' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Rental Rates
            </button>
          )}
        </div>
      </div>

      {/* Sale Price Trend Chart */}
      {activeChart === 'price' && hasSaleData && (
        <div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedSaleData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMedianPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }}
                  interval={Math.max(0, Math.floor(formattedSaleData.length / 6))}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="medianPrice" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorMedianPrice)" name="Median Price" />
                {formattedSaleData.some(d => d.averagePrice) && (
                  <Line type="monotone" dataKey="averagePrice" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Avg Price" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-4 pt-3 border-t border-slate-50">
            {saleAppreciation !== null && (
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">ANNUALIZED APPRECIATION</p>
                <p className={`text-lg font-black tracking-tight ${saleAppreciation >= 0 ? 'text-emerald-600' : 'text-[#f43f5e]'}`}>
                  {saleAppreciation >= 0 ? '+' : ''}{saleAppreciation.toFixed(1)}%
                </p>
              </div>
            )}
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">DATA POINTS</p>
              <p className="text-lg font-black text-slate-700 tracking-tight">{saleTrends.length} months</p>
            </div>
          </div>
        </div>
      )}

      {/* Rental Rate Trend Chart */}
      {activeChart === 'rent' && hasRentalData && (
        <div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedRentalData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMedianRent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }}
                  interval={Math.max(0, Math.floor(formattedRentalData.length / 6))}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }}
                  tickFormatter={(v) => `$${v.toLocaleString()}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="medianRent" stroke="#10b981" strokeWidth={2.5} fill="url(#colorMedianRent)" name="Median Rent" />
                {formattedRentalData.some(d => d.averageRent) && (
                  <Line type="monotone" dataKey="averageRent" stroke="#6ee7b7" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Avg Rent" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-4 pt-3 border-t border-slate-50">
            {rentGrowth !== null && (
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">ANNUALIZED RENT GROWTH</p>
                <p className={`text-lg font-black tracking-tight ${rentGrowth >= 0 ? 'text-emerald-600' : 'text-[#f43f5e]'}`}>
                  {rentGrowth >= 0 ? '+' : ''}{rentGrowth.toFixed(1)}%
                </p>
              </div>
            )}
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">DATA POINTS</p>
              <p className="text-lg font-black text-slate-700 tracking-tight">{rentalTrends.length} months</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(MarketTrendCharts);
