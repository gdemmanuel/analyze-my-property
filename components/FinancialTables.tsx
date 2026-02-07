
import React, { useState } from 'react';
import { MonthlyProjection } from '../types';
import InfoTooltip from './InfoTooltip';

interface TableProps {
  data: MonthlyProjection[];
  title: string;
  isYearly?: boolean;
}

const FinancialTables: React.FC<TableProps> = ({ data, title, isYearly = false }) => {
  const [widths, setWidths] = useState<Record<string, number>>({
    timeline: 100,
    gross: 100,
    mgmt: 90,
    maint: 90,
    tax: 90,
    opex: 100,
    occ: 70,
    adr: 90,
    mortgage: 100,
    helocInt: 110,
    profit: 110,
    helocPrinc: 100,
    helocBal: 120,
    mktValue: 120,
    net: 130,
    cumNet: 140
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const startResize = (col: string, e: React.MouseEvent) => {
    const startX = e.clientX;
    const startWidth = widths[col];
    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(70, startWidth + (moveEvent.clientX - startX));
      setWidths(prev => ({ ...prev, [col]: newWidth }));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const Resizer = ({ col }: { col: string }) => (
    <div onMouseDown={(e) => startResize(col, e)} className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-rose-500/80 transition-colors z-50 group">
      <div className="hidden group-hover:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-rose-500 rounded-full border-2 border-white shadow-lg" />
    </div>
  );

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 w-full mb-10 overflow-visible">
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center backdrop-blur-md">
        <h3 className="font-black text-slate-800 uppercase tracking-[0.2em] text-xs">{title}</h3>
        <div className="flex gap-2">
          <span className="text-[9px] text-slate-400 font-bold uppercase border border-slate-200 px-3 py-1 rounded-full">{data.length} {isYearly ? 'Periods' : 'Months'}</span>
          <span className="text-[10px] text-rose-500 font-black uppercase tracking-[0.1em] bg-rose-50 px-3 py-1 rounded-full border border-rose-100">{isYearly ? 'Annual aggregate' : 'Monthly projection'}</span>
        </div>
      </div>

      <div className="relative">
        <table className="w-full text-left text-[10px] border-separate border-spacing-0">
          <thead className="sticky top-0 z-40 bg-slate-900">
            <tr className="text-white font-black uppercase tracking-widest">
              <th className="p-0 bg-slate-900 sticky left-0 z-50 border-r border-slate-800" style={{ width: widths.timeline }}>
                <div className="px-3 py-6 relative h-full flex flex-col items-center justify-center text-center break-words leading-tight whitespace-normal overflow-hidden min-h-[80px]">
                  Timeline <Resizer col="timeline" />
                </div>
              </th>
              <th className="p-0 bg-slate-900" style={{ width: widths.gross }}>
                <div className="px-2 py-6 relative h-full flex flex-col items-center justify-center text-center break-words leading-tight whitespace-normal overflow-visible">
                  <div className="flex items-center gap-1">Gross Revenue <InfoTooltip content="Total rental income collected before any expenses or fees." direction="down" /></div>
                  <Resizer col="gross" />
                </div>
              </th>
              <th className="p-0 bg-slate-900" style={{ width: widths.mgmt }}>
                <div className="px-2 py-6 relative h-full flex flex-col items-center justify-center text-center break-words leading-tight whitespace-normal overflow-visible">
                  <div className="flex items-center gap-1">Mgmt Fee <InfoTooltip content="Service fees paid to property management (usually 10-25% of gross revenue)." direction="down" /></div>
                  <Resizer col="mgmt" />
                </div>
              </th>
              <th className="p-0 bg-slate-900" style={{ width: widths.maint }}>
                <div className="px-2 py-6 relative h-full flex flex-col items-center justify-center text-center break-words leading-tight whitespace-normal overflow-visible">
                  <div className="flex items-center gap-1">Maintenance <InfoTooltip content="Reserved budget for property repairs and upkeep. Calculated as a % of revenue." direction="down" /></div>
                  <Resizer col="maint" />
                </div>
              </th>
              <th className="p-0 bg-slate-900" style={{ width: widths.tax }}>
                <div className="px-2 py-6 relative h-full flex flex-col items-center justify-center text-center break-words leading-tight whitespace-normal overflow-visible">
                  <div className="flex items-center gap-1">Prop. Tax <InfoTooltip content="Annual property taxes divided by 12, scaling with property appreciation." direction="down" /></div>
                  <Resizer col="tax" />
                </div>
              </th>
              <th className="p-0 bg-slate-900" style={{ width: widths.opex }}>
                <div className="px-2 py-6 relative h-full flex flex-col items-center justify-center text-center break-words leading-tight whitespace-normal overflow-visible">
                  <div className="flex items-center gap-1">Fixed Opex <InfoTooltip content="Insurance, Utilities, Internet, and HOA. These are recurring fixed costs." direction="down" /></div>
                  <Resizer col="opex" />
                </div>
              </th>
              <th className="p-0 bg-slate-900" style={{ width: widths.occ }}>
                <div className="px-2 py-6 relative h-full flex flex-col items-center justify-center text-center break-words leading-tight whitespace-normal overflow-visible">
                  <div className="flex items-center gap-1">Occ % <InfoTooltip content="Percentage of nights booked in a given month." direction="down" /></div>
                  <Resizer col="occ" />
                </div>
              </th>
              <th className="p-0 bg-indigo-900 text-indigo-100" style={{ width: widths.adr }}>
                <div className="px-2 py-6 relative h-full flex flex-col items-center justify-center text-center break-words leading-tight whitespace-normal overflow-visible">
                  <div className="flex items-center gap-1 text-indigo-300">Rent / ADR <InfoTooltip content="Average Daily Rate (for STR) or Monthly Rent (for LTR/MTR)." direction="down" /></div>
                  <Resizer col="adr" />
                </div>
              </th>
              <th className="p-0 bg-[#334155] text-slate-300" style={{ width: widths.mortgage }}>
                <div className="px-2 py-6 relative h-full flex flex-col items-center justify-center text-center break-words leading-tight whitespace-normal overflow-visible">
                  <div className="flex items-center gap-1">Mortgage Pmt <InfoTooltip content="Total monthly bank payment (Principal + Interest)." direction="down" /></div>
                  <Resizer col="mortgage" />
                </div>
              </th>
              <th className="p-0 bg-slate-900 text-rose-400" style={{ width: widths.helocInt }}>
                <div className="px-2 py-6 relative h-full flex flex-col items-center justify-center text-center break-words leading-tight whitespace-normal overflow-visible">
                  <div className="flex items-center gap-1">HELOC Interest <InfoTooltip content="Cost of borrowing for upfront capital (furniture, closing costs, etc)." direction="down" /></div>
                  <Resizer col="helocInt" />
                </div>
              </th>
              <th className={`p-0 font-black ${isYearly ? 'bg-emerald-900 text-emerald-100' : 'bg-blue-900 text-blue-100'}`} style={{ width: widths.profit }}>
                <div className="px-2 py-6 relative h-full flex flex-col items-center justify-center text-center break-words leading-tight whitespace-normal overflow-visible">
                  <div className="flex items-center gap-1 uppercase">Accounting Profit <InfoTooltip content="Revenue minus expenses and interest. IMPORTANT: This figure does NOT subtract Mortgage Principal. The gap between this and your Cash Flow is the equity you are building in the property." direction="down" /></div>
                  <Resizer col="profit" />
                </div>
              </th>
              <th className="p-0 bg-slate-900 text-emerald-400" style={{ width: widths.helocPrinc }}>
                <div className="px-2 py-6 relative h-full flex flex-col items-center justify-center text-center break-words leading-tight whitespace-normal overflow-visible">
                  <div className="flex items-center gap-1">HELOC Principal <InfoTooltip content="Excess cash used to pay down the line of credit." direction="down" /></div>
                  <Resizer col="helocPrinc" />
                </div>
              </th>
              <th className="p-0 bg-slate-800" style={{ width: widths.helocBal }}>
                <div className="px-2 py-6 relative h-full flex flex-col items-center justify-center text-center break-words leading-tight whitespace-normal overflow-visible">
                  <div className="flex items-center gap-1">HELOC Balance <InfoTooltip content="Remaining amount owed on the upfront capital loan." direction="down" /></div>
                  <Resizer col="helocBal" />
                </div>
              </th>
              <th className="p-0 bg-indigo-900 text-indigo-100" style={{ width: widths.mktValue }}>
                <div className="px-2 py-6 relative h-full flex flex-col items-center justify-center text-center break-words leading-tight whitespace-normal overflow-visible">
                  <div className="flex items-center gap-1 text-indigo-300">Property Value <InfoTooltip content="Estimated market value of the home based on your appreciation settings." direction="down" /></div>
                  <Resizer col="mktValue" />
                </div>
              </th>
              <th className={`p-0 font-black sticky right-0 z-50 border-l border-slate-800 shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.1)] bg-emerald-800 text-white`} style={{ width: widths.net }}>
                <div className="px-2 py-6 relative h-full flex flex-col items-center justify-center text-center break-words leading-tight whitespace-normal overflow-visible">
                  <div className="flex items-center gap-1 uppercase">Owner Surplus <InfoTooltip content="Actual cash hitting your bank account after ALL debt, fees, and recovery." direction="down" /></div>
                  <Resizer col="net" />
                </div>
              </th>
              <th className={`p-0 font-black sticky right-0 z-50 bg-[#064e3b] text-white`} style={{ width: widths.cumNet }}>
                <div className="px-2 py-6 relative h-full flex flex-col items-center justify-center text-center break-words leading-tight whitespace-normal overflow-visible">
                  <div className="flex items-center gap-1 uppercase">Cumulative Bank <InfoTooltip content="Total running tally of cash profit earned since day one." direction="down" /></div>
                  <Resizer col="cumNet" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                <td className="px-4 py-5 font-black text-slate-900 sticky left-0 z-20 bg-white group-hover:bg-slate-50 border-r border-slate-100 text-xs text-center">{row.date}</td>
                <td className="px-2 py-5 font-bold text-slate-600 text-center">{formatCurrency(row.revenue)}</td>
                <td className="px-2 py-5 text-slate-500 text-center">{formatCurrency(row.mgmtFee)}</td>
                <td className="px-2 py-5 text-slate-500 text-center">{formatCurrency(row.maintenance)}</td>
                <td className="px-2 py-5 text-slate-500 text-center">{formatCurrency(row.propertyTax)}</td>
                <td className="px-2 py-5 text-slate-400 font-medium text-center">{formatCurrency(row.fixedOpex + row.hoa)}</td>
                <td className="px-2 py-5 font-black text-slate-800 text-center">{row.occupancy.toFixed(0)}%</td>
                <td className="px-2 py-5 bg-indigo-50/20 font-bold text-indigo-600 text-center">{formatCurrency(row.adr)}</td>
                <td className="px-2 py-5 text-slate-500 text-center">{formatCurrency(row.mortgagePayment)}</td>
                <td className="px-2 py-5 text-rose-500 font-medium text-center">{formatCurrency(row.helocInterest)}</td>
                <td className={`px-2 py-5 font-black text-center ${isYearly ? 'text-emerald-700 bg-emerald-50/30' : 'text-blue-700 bg-blue-50/30'} ${row.cashFlowAfterDebt < 0 ? 'text-rose-600' : ''}`}>{formatCurrency(row.cashFlowAfterDebt)}</td>
                <td className="px-2 py-5 text-emerald-600 font-bold text-center">{formatCurrency(row.helocPrincipalPaydown)}</td>
                <td className="px-2 py-5 font-mono font-black text-slate-900 bg-slate-50/50 text-center">{formatCurrency(row.helocBalance)}</td>
                <td className="px-2 py-5 font-bold text-indigo-600 bg-indigo-50/20 text-center">{formatCurrency(row.propertyValue)}</td>
                <td className={`px-2 py-5 font-black text-center sticky right-0 z-20 border-l border-slate-100 bg-emerald-50/50 shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.05)]`}>{formatCurrency(row.netCashToOwner)}</td>
                <td className={`px-2 py-5 font-black text-center sticky right-0 z-20 bg-emerald-900 text-white shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.1)]`}>{formatCurrency(row.cumulativeNetCash)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinancialTables;
