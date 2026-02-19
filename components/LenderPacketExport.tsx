import React, { useState } from 'react';
import { FileText, Download, Loader2, Building2, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Award, AlertCircle } from 'lucide-react';
import { LenderPacket } from '../prompts/underwriting';
import { PanelLoadingState } from './ui/LoadingSpinner';

interface LenderPacketExportProps {
  packet: LenderPacket | null;
  isLoading?: boolean;
  onGenerate?: () => void;
  error?: string | null;
  isSample?: boolean; // Add flag to indicate sample mode
}

const LenderPacketExport: React.FC<LenderPacketExportProps> = ({ packet, isLoading, onGenerate, error, isSample = false }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'financial' | 'market' | 'risks'>('summary');

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const getSeverityColor = (severity: 'Low' | 'Medium' | 'High') => {
    switch (severity) {
      case 'Low': return 'text-emerald-600 bg-emerald-50';
      case 'Medium': return 'text-amber-600 bg-amber-50';
      case 'High': return 'text-rose-600 bg-rose-50';
    }
  };

  const getRecommendationStyle = (rec: string) => {
    if (rec === 'Strong Buy') return 'bg-gradient-to-r from-emerald-500 to-green-600 text-white';
    if (rec === 'Buy') return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white';
    return 'bg-gradient-to-r from-slate-400 to-slate-500 text-white';
  };

  const handleExportPDF = async () => {
    if (!packet) return;
    setIsExporting(true);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Investment Analysis - ${packet.propertyOverview.address}</title>
        <style>
          @page { size: letter; margin: 0.5in; }
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.5; font-size: 11px; }
          .header { text-align: center; border-bottom: 3px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { font-size: 22px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 2px; color: #0f172a; }
          .header .subtitle { color: #64748b; font-size: 10px; margin: 8px 0 0 0; font-weight: 600; }
          .recommendation-banner { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px 20px; border-radius: 8px; text-align: center; margin: 15px 0; }
          .recommendation-banner .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; }
          .recommendation-banner .value { font-size: 24px; font-weight: 900; margin-top: 3px; }
          .section { margin-bottom: 20px; page-break-inside: avoid; }
          .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
          .metric-box { background: #f8fafc; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0; }
          .metric-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
          .metric-value { font-size: 18px; font-weight: 900; color: #0f172a; }
          .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 10px; }
          .info-label { color: #64748b; font-weight: 600; }
          .info-value { font-weight: 700; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 10px 0; }
          th { text-align: left; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; padding: 8px 6px; border-bottom: 2px solid #e2e8f0; background: #f8fafc; }
          td { padding: 8px 6px; border-bottom: 1px solid #f1f5f9; }
          .highlight-list { list-style: none; padding: 0; margin: 10px 0; }
          .highlight-list li { padding: 6px 0 6px 20px; position: relative; font-size: 10px; line-height: 1.6; }
          .highlight-list li:before { content: "✓"; position: absolute; left: 0; color: #10b981; font-weight: 900; }
          .risk-item { display: flex; gap: 8px; padding: 8px; background: #fef2f2; border-left: 3px solid #ef4444; margin: 6px 0; border-radius: 4px; font-size: 10px; }
          .risk-severity { padding: 2px 8px; border-radius: 4px; font-size: 8px; font-weight: 700; text-transform: uppercase; }
          .severity-low { background: #d1fae5; color: #065f46; }
          .severity-medium { background: #fef3c7; color: #92400e; }
          .severity-high { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 25px; padding-top: 15px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 8px; color: #94a3b8; }
          .page-break { page-break-after: always; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Professional Investment Analysis</h1>
          <p class="subtitle">Prepared by Analyze My Property • ${packet.generatedDate}</p>
        </div>

        <!-- Executive Summary -->
        <div class="recommendation-banner" style="background: ${packet.executiveSummary.recommendation === 'Strong Buy' ? 'linear-gradient(135deg, #10b981, #059669)' : packet.executiveSummary.recommendation === 'Buy' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #64748b, #475569)'}">
          <div class="label">Investment Recommendation</div>
          <div class="value">${packet.executiveSummary.recommendation}</div>
        </div>

        <div class="section">
          <div class="section-title">Executive Summary</div>
          <ul class="highlight-list">
            ${packet.executiveSummary.highlights.map(h => `<li>${h}</li>`).join('')}
          </ul>
          <div class="grid-4" style="margin-top: 15px;">
            <div class="metric-box">
              <div class="metric-label">Acquisition</div>
              <div class="metric-value">${formatCurrency(packet.executiveSummary.dealSnapshot.acquisitionPrice)}</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Cash Required</div>
              <div class="metric-value">${formatCurrency(packet.executiveSummary.dealSnapshot.totalCashRequired)}</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Cap Rate</div>
              <div class="metric-value">${packet.executiveSummary.dealSnapshot.projectedCapRate.toFixed(2)}%</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Cash-on-Cash</div>
              <div class="metric-value">${packet.executiveSummary.dealSnapshot.projectedCoC.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        <!-- Property Overview -->
        <div class="section">
          <div class="section-title">Property Overview</div>
          <div class="grid-2">
            <div>
              <div class="info-row"><span class="info-label">Address</span><span class="info-value">${packet.propertyOverview.address}</span></div>
              <div class="info-row"><span class="info-label">Property Type</span><span class="info-value">${packet.propertyOverview.propertyType}</span></div>
              <div class="info-row"><span class="info-label">Bedrooms</span><span class="info-value">${packet.propertyOverview.beds}</span></div>
              <div class="info-row"><span class="info-label">Bathrooms</span><span class="info-value">${packet.propertyOverview.baths}</span></div>
            </div>
            <div>
              <div class="info-row"><span class="info-label">Square Feet</span><span class="info-value">${packet.propertyOverview.sqft.toLocaleString()}</span></div>
              <div class="info-row"><span class="info-label">Year Built</span><span class="info-value">${packet.propertyOverview.yearBuilt}</span></div>
              <div class="info-row"><span class="info-label">Lot Size</span><span class="info-value">${packet.propertyOverview.lotSize}</span></div>
              <div class="info-row"><span class="info-label">Zoning</span><span class="info-value">${packet.propertyOverview.zoning}</span></div>
            </div>
          </div>
          ${packet.propertyOverview.notableFeatures.length > 0 ? `
          <div style="margin-top: 10px;">
            <p style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Notable Features</p>
            <p style="font-size: 10px; line-height: 1.6;">${packet.propertyOverview.notableFeatures.join(' • ')}</p>
          </div>
          ` : ''}
        </div>

        <div class="page-break"></div>

        <!-- Financial Analysis -->
        <div class="section">
          <div class="section-title">Financial Analysis</div>
          
          <p style="font-size: 10px; font-weight: 700; margin: 12px 0 8px 0;">Purchase Analysis</p>
          <div class="grid-2">
            <div class="info-row"><span class="info-label">List Price</span><span class="info-value">${formatCurrency(packet.financialAnalysis.purchaseAnalysis.listPrice)}</span></div>
            <div class="info-row"><span class="info-label">Acquisition Price</span><span class="info-value">${formatCurrency(packet.financialAnalysis.purchaseAnalysis.acquisitionPrice)}</span></div>
            <div class="info-row"><span class="info-label">Down Payment (${packet.financialAnalysis.purchaseAnalysis.downPaymentPercent}%)</span><span class="info-value">${formatCurrency(packet.financialAnalysis.purchaseAnalysis.downPaymentAmount)}</span></div>
            <div class="info-row"><span class="info-label">Loan Amount</span><span class="info-value">${formatCurrency(packet.financialAnalysis.purchaseAnalysis.loanAmount)}</span></div>
            <div class="info-row"><span class="info-label">Closing Costs</span><span class="info-value">${formatCurrency(packet.financialAnalysis.purchaseAnalysis.estimatedClosingCosts)}</span></div>
            <div class="info-row"><span class="info-label">Total Cash Required</span><span class="info-value">${formatCurrency(packet.financialAnalysis.purchaseAnalysis.totalCashRequired)}</span></div>
          </div>

          <p style="font-size: 10px; font-weight: 700; margin: 15px 0 8px 0;">Operating Performance (Annual)</p>
          <div class="grid-2">
            <div class="info-row"><span class="info-label">Gross Revenue</span><span class="info-value">${formatCurrency(packet.financialAnalysis.operatingPerformance.projectedGrossRevenue)}</span></div>
            <div class="info-row"><span class="info-label">Operating Expenses</span><span class="info-value">${formatCurrency(packet.financialAnalysis.operatingPerformance.operatingExpenses)}</span></div>
            <div class="info-row"><span class="info-label">Net Operating Income</span><span class="info-value">${formatCurrency(packet.financialAnalysis.operatingPerformance.noi)}</span></div>
            <div class="info-row"><span class="info-label">Debt Service</span><span class="info-value">${formatCurrency(packet.financialAnalysis.operatingPerformance.annualDebtService)}</span></div>
          </div>
          <div style="background: #f0fdf4; padding: 10px; border-radius: 6px; margin-top: 8px; border-left: 3px solid #10b981;">
            <div class="info-row" style="border: none;"><span class="info-label">Cash Flow After Debt</span><span class="info-value" style="color: #10b981; font-size: 16px;">${formatCurrency(packet.financialAnalysis.operatingPerformance.cashFlowAfterDebt)}</span></div>
          </div>

          <p style="font-size: 10px; font-weight: 700; margin: 15px 0 8px 0;">Investment Metrics</p>
          <div class="grid-3">
            <div class="metric-box">
              <div class="metric-label">Cap Rate</div>
              <div class="metric-value">${packet.financialAnalysis.investmentMetrics.capRate.toFixed(2)}%</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Cash-on-Cash</div>
              <div class="metric-value">${packet.financialAnalysis.investmentMetrics.cashOnCash.toFixed(1)}%</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">DSCR</div>
              <div class="metric-value">${packet.financialAnalysis.investmentMetrics.dscr.toFixed(2)}</div>
            </div>
          </div>

          <p style="font-size: 10px; font-weight: 700; margin: 15px 0 8px 0;">5-Year Financial Projections</p>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Revenue</th>
                <th>Expenses</th>
                <th>Cash Flow</th>
                <th>Equity</th>
                <th>Cumulative Return</th>
              </tr>
            </thead>
            <tbody>
              ${packet.financialAnalysis.fiveYearProjections.map(proj => `
                <tr>
                  <td style="font-weight: 700;">Year ${proj.year}</td>
                  <td>${formatCurrency(proj.revenue)}</td>
                  <td>${formatCurrency(proj.expenses)}</td>
                  <td style="color: #10b981; font-weight: 700;">${formatCurrency(proj.cashFlow)}</td>
                  <td>${formatCurrency(proj.equity)}</td>
                  <td style="font-weight: 700;">${formatCurrency(proj.cumulativeReturn)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="page-break"></div>

        <!-- Market Analysis -->
        <div class="section">
          <div class="section-title">Market Analysis</div>
          
          <p style="font-size: 10px; font-weight: 700; margin: 12px 0 8px 0;">Comparable Properties</p>
          <table>
            <thead>
              <tr>
                <th>Address</th>
                <th>Beds/Baths</th>
                <th>ADR</th>
                <th>Occupancy</th>
                <th>Distance</th>
              </tr>
            </thead>
            <tbody>
              ${packet.marketAnalysis.comparables.map(comp => `
                <tr>
                  <td>${comp.address}</td>
                  <td>${comp.beds}/${comp.baths}</td>
                  <td>${formatCurrency(comp.adr)}</td>
                  <td>${comp.occupancy}%</td>
                  <td>${comp.distance}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <p style="font-size: 10px; font-weight: 700; margin: 15px 0 8px 0;">Market Trends</p>
          <div class="grid-2">
            <div class="info-row"><span class="info-label">Average ADR</span><span class="info-value">${formatCurrency(packet.marketAnalysis.marketTrends.avgADR)}</span></div>
            <div class="info-row"><span class="info-label">Average Occupancy</span><span class="info-value">${packet.marketAnalysis.marketTrends.avgOccupancy}%</span></div>
            <div class="info-row"><span class="info-label">Seasonality</span><span class="info-value">${packet.marketAnalysis.marketTrends.seasonality}</span></div>
            <div class="info-row"><span class="info-label">Growth Trend</span><span class="info-value">${packet.marketAnalysis.marketTrends.growthTrend}</span></div>
          </div>

          <p style="font-size: 10px; font-weight: 700; margin: 15px 0 8px 0;">Competitive Position</p>
          <p style="font-size: 10px; line-height: 1.6; background: #f8fafc; padding: 10px; border-radius: 6px;">${packet.marketAnalysis.competitivePosition}</p>
        </div>

        <!-- Revenue Strategy -->
        <div class="section">
          <div class="section-title">Revenue Strategy</div>
          <p style="font-size: 10px; line-height: 1.6; margin-bottom: 12px;"><strong>Strategy:</strong> ${packet.revenueStrategy.strategy}</p>
          
          <div class="grid-3">
            <div class="metric-box">
              <div class="metric-label">Peak Season ADR</div>
              <div class="metric-value">${formatCurrency(packet.revenueStrategy.pricingStrategy.peakSeasonADR)}</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Off-Season ADR</div>
              <div class="metric-value">${formatCurrency(packet.revenueStrategy.pricingStrategy.offSeasonADR)}</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Average ADR</div>
              <div class="metric-value">${formatCurrency(packet.revenueStrategy.pricingStrategy.avgADR)}</div>
            </div>
          </div>

          ${packet.revenueStrategy.amenityImpact.length > 0 ? `
          <p style="font-size: 10px; font-weight: 700; margin: 15px 0 8px 0;">Amenity Impact Analysis</p>
          <table>
            <thead>
              <tr>
                <th>Amenity</th>
                <th>ADR Increase</th>
                <th>Investment</th>
                <th>Payback Period</th>
              </tr>
            </thead>
            <tbody>
              ${packet.revenueStrategy.amenityImpact.map(amenity => `
                <tr>
                  <td style="font-weight: 600;">${amenity.name}</td>
                  <td style="color: #10b981; font-weight: 700;">+${formatCurrency(amenity.adrIncrease)}</td>
                  <td>${formatCurrency(amenity.cost)}</td>
                  <td>${amenity.paybackMonths.toFixed(1)} months</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}
        </div>

        <div class="page-break"></div>

        <!-- Risk Assessment -->
        <div class="section">
          <div class="section-title">Risk Assessment & Mitigation</div>
          
          ${Object.entries({
      'Regulatory Risks': packet.riskAssessment.regulatoryRisks,
      'Market Risks': packet.riskAssessment.marketRisks,
      'Property Risks': packet.riskAssessment.propertyRisks,
      'Financial Risks': packet.riskAssessment.financialRisks
    }).map(([category, risks]) => `
            <p style="font-size: 10px; font-weight: 700; margin: 12px 0 8px 0;">${category}</p>
            ${risks.map(risk => `
              <div class="risk-item">
                <span class="risk-severity severity-${risk.severity.toLowerCase()}">${risk.severity}</span>
                <div style="flex: 1;">
                  <p style="font-weight: 700; margin: 0 0 4px 0;">${risk.risk}</p>
                  <p style="margin: 0; color: #475569;"><strong>Mitigation:</strong> ${risk.mitigation}</p>
                </div>
              </div>
            `).join('')}
          `).join('')}
        </div>

        <!-- Sources -->
        ${packet.sources.length > 0 ? `
        <div class="section">
          <div class="section-title">Data Sources</div>
          ${packet.sources.map(source => `
            <p style="font-size: 9px; color: #64748b; margin: 4px 0;">• ${source.title}: ${source.url}</p>
          `).join('')}
        </div>
        ` : ''}

        <div class="footer">
          <p><strong>Analyze My Property</strong> • Professional Short-Term Rental Investment Analysis Platform</p>
          <p>This document is for informational purposes only and does not constitute financial or investment advice. All projections are estimates based on current market conditions and assumptions.</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        setIsExporting(false);
      };
    } else {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-12 shadow-lg">
        <PanelLoadingState message="Generating Professional Lender Packet..." color="indigo" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border-2 border-rose-200 p-8 text-center shadow-lg">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="text-rose-500" size={32} />
          <p className="text-rose-600 font-black text-sm uppercase tracking-widest">{error}</p>
          {onGenerate && (
            <button
              onClick={onGenerate}
              className="mt-2 px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!packet) {
    return (
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 shadow-lg">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-500 mb-4">
            <FileText size={32} />
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-2">Professional Lender Packet</h3>
          <p className="text-[10px] font-bold text-slate-600 mb-6">MLS-style investment analysis report</p>
          {onGenerate && (
            <button
              onClick={onGenerate}
              className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all cursor-pointer"
            >
              <FileText size={14} />
              📄 Generate Report
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500">
            <FileText size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Professional Lender Packet</h3>
            <p className="text-[10px] font-bold text-slate-600">Generated {packet.generatedDate}</p>
          </div>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={isExporting || isSample}
          className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isExporting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          {isSample ? 'Pro Only' : 'Export PDF'}
        </button>
      </div>

      {/* Recommendation Banner */}
      <div className={`p-6 rounded-2xl mb-6 ${getRecommendationStyle(packet.executiveSummary.recommendation)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-90 mb-1">Investment Recommendation</p>
            <p className="text-3xl font-black">{packet.executiveSummary.recommendation}</p>
          </div>
          <Award size={40} className="opacity-80" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {[
          { id: 'summary', label: 'Executive Summary' },
          { id: 'financial', label: 'Financial Analysis' },
          { id: 'market', label: 'Market & Strategy' },
          { id: 'risks', label: 'Risk Assessment' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-600'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'summary' && (
          <>
            {/* Highlights */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Investment Highlights</h4>
              <ul className="space-y-2">
                {packet.executiveSummary.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Deal Snapshot */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Deal Snapshot</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Acquisition Price</p>
                  <p className="text-lg font-black text-slate-800">{formatCurrency(packet.executiveSummary.dealSnapshot.acquisitionPrice)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Cash Required</p>
                  <p className="text-lg font-black text-slate-800">{formatCurrency(packet.executiveSummary.dealSnapshot.totalCashRequired)}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Cap Rate</p>
                  <p className="text-lg font-black text-emerald-600">{packet.executiveSummary.dealSnapshot.projectedCapRate.toFixed(2)}%</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-[8px] font-black text-blue-600 uppercase mb-1">Cash-on-Cash</p>
                  <p className="text-lg font-black text-blue-600">{packet.executiveSummary.dealSnapshot.projectedCoC.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* Property Overview */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Property Details</h4>
              <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-semibold">Address</span>
                  <span className="font-black">{packet.propertyOverview.address}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-semibold">Type</span>
                  <span className="font-black">{packet.propertyOverview.propertyType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-semibold">Beds/Baths</span>
                  <span className="font-black">{packet.propertyOverview.beds} / {packet.propertyOverview.baths}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-semibold">Square Feet</span>
                  <span className="font-black">{packet.propertyOverview.sqft.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-semibold">Year Built</span>
                  <span className="font-black">{packet.propertyOverview.yearBuilt}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'financial' && (
          <>
            {/* Investment Metrics */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Key Investment Metrics</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
                  <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Cap Rate</p>
                  <p className="text-2xl font-black text-emerald-600">{packet.financialAnalysis.investmentMetrics.capRate.toFixed(2)}%</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <p className="text-[8px] font-black text-blue-600 uppercase mb-1">Cash-on-Cash</p>
                  <p className="text-2xl font-black text-blue-600">{packet.financialAnalysis.investmentMetrics.cashOnCash.toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                  <p className="text-[8px] font-black text-purple-600 uppercase mb-1">DSCR</p>
                  <p className="text-2xl font-black text-purple-600">{packet.financialAnalysis.investmentMetrics.dscr.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* 5-Year Projections */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">5-Year Financial Projections</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-2 px-3 text-[9px] font-black uppercase text-slate-500">Year</th>
                      <th className="text-right py-2 px-3 text-[9px] font-black uppercase text-slate-500">Revenue</th>
                      <th className="text-right py-2 px-3 text-[9px] font-black uppercase text-slate-500">Cash Flow</th>
                      <th className="text-right py-2 px-3 text-[9px] font-black uppercase text-slate-500">Equity</th>
                      <th className="text-right py-2 px-3 text-[9px] font-black uppercase text-slate-500">Total Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packet.financialAnalysis.fiveYearProjections.map(proj => (
                      <tr key={proj.year} className="border-b border-slate-100">
                        <td className="py-2 px-3 font-black">Year {proj.year}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(proj.revenue)}</td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-bold">{formatCurrency(proj.cashFlow)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(proj.equity)}</td>
                        <td className="py-2 px-3 text-right font-black">{formatCurrency(proj.cumulativeReturn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'market' && (
          <>
            {/* Market Trends */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Market Trends</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Avg ADR</p>
                  <p className="text-lg font-black">{formatCurrency(packet.marketAnalysis.marketTrends.avgADR)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Avg Occupancy</p>
                  <p className="text-lg font-black">{packet.marketAnalysis.marketTrends.avgOccupancy}%</p>
                </div>
              </div>
              <p className="mt-3 text-sm p-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="font-black text-blue-900">Competitive Position:</span> {packet.marketAnalysis.competitivePosition}
              </p>
            </div>

            {/* Revenue Strategy */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Pricing Strategy</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-[8px] font-black text-amber-600 uppercase mb-1">Peak Season</p>
                  <p className="text-lg font-black text-amber-600">{formatCurrency(packet.revenueStrategy.pricingStrategy.peakSeasonADR)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Average</p>
                  <p className="text-lg font-black">{formatCurrency(packet.revenueStrategy.pricingStrategy.avgADR)}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-[8px] font-black text-blue-600 uppercase mb-1">Off-Season</p>
                  <p className="text-lg font-black text-blue-600">{formatCurrency(packet.revenueStrategy.pricingStrategy.offSeasonADR)}</p>
                </div>
              </div>
            </div>

            {/* Amenity Impact */}
            {packet.revenueStrategy.amenityImpact.length > 0 && (
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Top Amenity Investments</h4>
                <div className="space-y-2">
                  {packet.revenueStrategy.amenityImpact.slice(0, 5).map((amenity, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="font-black text-sm">{amenity.name}</p>
                        <p className="text-[10px] text-slate-500">Payback: {amenity.paybackMonths.toFixed(1)} months</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-600 font-black">+{formatCurrency(amenity.adrIncrease)}</p>
                        <p className="text-[10px] text-slate-500">{formatCurrency(amenity.cost)} investment</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'risks' && (
          <>
            {Object.entries({
              'Regulatory Risks': packet.riskAssessment.regulatoryRisks,
              'Market Risks': packet.riskAssessment.marketRisks,
              'Property Risks': packet.riskAssessment.propertyRisks,
              'Financial Risks': packet.riskAssessment.financialRisks
            }).map(([category, risks]) => (
              <div key={category}>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">{category}</h4>
                <div className="space-y-3">
                  {risks.map((risk, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border-l-4 border-rose-500">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-black text-sm flex-1">{risk.risk}</p>
                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${getSeverityColor(risk.severity)}`}>
                          {risk.severity}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        <span className="font-bold">Mitigation:</span> {risk.mitigation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default LenderPacketExport;
