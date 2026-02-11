import { formatCurrency } from './formatCurrency';
import { MarketInsight, PropertyConfig, RentalStrategy } from '../types';

interface ExportReportParams {
  insight: MarketInsight;
  displayedAddress: string;
  strategy: RentalStrategy;
  finalConfig: PropertyConfig;
  capRate: number;
  cashOnCash: number;
  cashPortion: number;
  annualNoi: number;
  annualGross: number;
  annualProfit: number;
  annualSurplus: number;
  grossYield: number;
  downPayment: number;
  helocPortion: number;
  totalUpfrontCapital: number;
  year1Data: any;
}

export const exportUnderwritingReport = (params: ExportReportParams) => {
  const {
    insight, displayedAddress, strategy, finalConfig,
    capRate, cashOnCash, cashPortion, annualNoi, annualGross,
    annualProfit, annualSurplus, grossYield, downPayment,
    helocPortion, totalUpfrontCapital, year1Data
  } = params;

  if (!insight || !year1Data) return;

  const formatAsBullets = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const trimmed = line.trim();
      const cleaned = trimmed.replace(/^[•\-\*]\s*/, '');
      return `<li>${cleaned}</li>`;
    }).join('');
  };

  const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Property Underwriting Report - ${displayedAddress}</title>
  <style>
    @media print {
      @page { margin: 0.5in; size: letter; }
      body { margin: 0; padding: 0; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1e293b;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; font-weight: 900; }
    .header .subtitle { opacity: 0.8; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }
    .section { margin-bottom: 25px; page-break-inside: avoid; }
    .section-title {
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #f43f5e;
      border-bottom: 2px solid #f43f5e;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .metric-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background: #f8fafc;
      border-radius: 6px;
    }
    .info-label { font-weight: 700; color: #64748b; font-size: 12px; }
    .info-value { font-weight: 900; color: #0f172a; font-size: 12px; }
    .analysis-box {
      background: #f8fafc;
      border-left: 4px solid #f43f5e;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 15px;
    }
    .analysis-box h3 {
      margin: 0 0 10px 0;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      color: #f43f5e;
    }
    .analysis-box ul {
      margin: 0;
      padding-left: 20px;
      list-style-type: disc;
    }
    .analysis-box li {
      font-size: 11px;
      line-height: 1.6;
      margin-bottom: 6px;
      color: #1e293b;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${displayedAddress}</h1>
    <div class="subtitle">${strategy} Investment Analysis • Generated ${new Date().toLocaleDateString()}</div>
  </div>

  <div class="section">
    <div class="section-title">Property Details</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Address</span><span class="info-value">${displayedAddress}</span></div>
      <div class="info-row"><span class="info-label">Property Type</span><span class="info-value">Single Family</span></div>
      <div class="info-row"><span class="info-label">Bedrooms</span><span class="info-value">${insight.beds}</span></div>
      <div class="info-row"><span class="info-label">Bathrooms</span><span class="info-value">${insight.baths}</span></div>
      <div class="info-row"><span class="info-label">Square Footage</span><span class="info-value">${insight.sqft.toLocaleString()} sqft</span></div>
      <div class="info-row"><span class="info-label">Acquisition Price</span><span class="info-value">${formatCurrency(finalConfig.price)}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Key Performance Metrics</div>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Cap Rate</div>
        <div class="metric-value">${capRate.toFixed(2)}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Cash-on-Cash</div>
        <div class="metric-value">${cashPortion >= 1000 ? `${cashOnCash.toFixed(2)}%` : '∞'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Net NOI</div>
        <div class="metric-value">${formatCurrency(annualNoi)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Gross Yield</div>
        <div class="metric-value">${grossYield.toFixed(2)}%</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Financial Summary (Year 1)</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Annual Revenue</span><span class="info-value">${formatCurrency(annualGross)}</span></div>
      <div class="info-row"><span class="info-label">Annual NOI</span><span class="info-value">${formatCurrency(annualNoi)}</span></div>
      <div class="info-row"><span class="info-label">Annual Profit</span><span class="info-value">${formatCurrency(annualProfit)}</span></div>
      <div class="info-row"><span class="info-label">Owner Surplus</span><span class="info-value">${formatCurrency(annualSurplus)}</span></div>
      <div class="info-row"><span class="info-label">Average Daily Rate</span><span class="info-value">${formatCurrency(year1Data.adr)}</span></div>
      <div class="info-row"><span class="info-label">Occupancy Rate</span><span class="info-value">${year1Data.occupancy.toFixed(0)}%</span></div>
      <div class="info-row"><span class="info-label">Management Fee</span><span class="info-value">${formatCurrency(year1Data.mgmtFee)}</span></div>
      <div class="info-row"><span class="info-label">Maintenance</span><span class="info-value">${formatCurrency(year1Data.maintenance)}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Capital Structure</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Down Payment</span><span class="info-value">${formatCurrency(downPayment)}</span></div>
      <div class="info-row"><span class="info-label">Cash Invested</span><span class="info-value">${formatCurrency(cashPortion)}</span></div>
      <div class="info-row"><span class="info-label">HELOC Funding</span><span class="info-value">${formatCurrency(helocPortion)}</span></div>
      <div class="info-row"><span class="info-label">Total Upfront Capital</span><span class="info-value">${formatCurrency(totalUpfrontCapital)}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">AI Analysis</div>
    <div class="analysis-box">
      <h3>Market Snapshot</h3>
      <ul>${formatAsBullets(insight.snapshot)}</ul>
    </div>
    <div class="analysis-box">
      <h3>Regulations & Compliance</h3>
      <ul>${formatAsBullets(insight.regulations)}</ul>
    </div>
    <div class="analysis-box">
      <h3>Break-Even Analysis</h3>
      <ul>${formatAsBullets(insight.breakEvenAnalysis)}</ul>
    </div>
    <div class="analysis-box">
      <h3>Recommendation</h3>
      <ul>${formatAsBullets(insight.recommendation)}</ul>
    </div>
  </div>

  <div class="footer">
    ${insight.sources && insight.sources.length > 0 ? `
      <div style="margin-bottom: 20px; text-align: left;">
        <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Data Sources & Citations</div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
          ${insight.sources.map(s => `<div style="font-size: 9px; color: #475569;">• ${s.title}: <span style="color: #64748b;">${s.uri}</span></div>`).join('')}
        </div>
      </div>
    ` : ''}
    <p><strong>AirROI PRO</strong> • Property Investment Analysis Platform</p>
    <p>This report is for informational purposes only and does not constitute financial advice.</p>
  </div>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};
