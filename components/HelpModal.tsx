import React, { useState } from 'react';
import { X, BookOpen, Calculator, Home, HelpCircle } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Section = 'howto' | 'calculations' | 'strategies' | 'faq';

const sections: { id: Section; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { id: 'howto', label: "How-To's", icon: BookOpen },
  { id: 'calculations', label: 'Calculations', icon: Calculator },
  { id: 'strategies', label: 'STR / MTR / LTR', icon: Home },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
];

const HowTo: React.FC = () => (
  <div className="space-y-6">
    <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">How-To's</h2>

    <div className="space-y-5">
      <div className="border border-slate-100 rounded-xl p-4">
        <h3 className="text-sm font-black text-slate-800 mb-2">Run a Property Analysis</h3>
        <ol className="space-y-1.5 text-sm text-slate-600 list-decimal list-inside">
          <li>Type a full property address in the search bar at the top of the page.</li>
          <li>Click the <span className="font-bold text-slate-800">Underwrite</span> button (or press Enter).</li>
          <li>The app fetches RentCast data, runs a live STR web search, and sends everything to the AI for analysis. This typically takes 10–30 seconds for a fresh property.</li>
          <li>Once complete, the <span className="font-bold text-slate-800">Audit</span> tab opens automatically with your results.</li>
        </ol>
        <p className="text-xs text-slate-400 mt-2">Note: Previously analyzed properties load from cache instantly and do not count against your daily limit.</p>
      </div>

      <div className="border border-slate-100 rounded-xl p-4">
        <h3 className="text-sm font-black text-slate-800 mb-2">Save a Property</h3>
        <ol className="space-y-1.5 text-sm text-slate-600 list-decimal list-inside">
          <li>Run an analysis on a property.</li>
          <li>Click the <span className="font-bold text-slate-800">Save</span> button in the top-right of the Audit tab.</li>
          <li>The property is saved to your account and appears in the <span className="font-bold text-slate-800">Portfolio</span> tab.</li>
          <li>Saved properties persist across sign-outs and devices.</li>
        </ol>
      </div>

      <div className="border border-slate-100 rounded-xl p-4">
        <h3 className="text-sm font-black text-slate-800 mb-2">Switch Between STR / MTR / LTR</h3>
        <ol className="space-y-1.5 text-sm text-slate-600 list-decimal list-inside">
          <li>After running an analysis, find the <span className="font-bold text-slate-800">STR / MTR / LTR</span> toggle in the top-right of the Audit hero card.</li>
          <li>Click a strategy to instantly recalculate all KPIs using that strategy's revenue model.</li>
          <li>STR uses the Average Daily Rate (ADR) and occupancy. MTR and LTR use monthly rent figures.</li>
        </ol>
      </div>

      <div className="border border-slate-100 rounded-xl p-4">
        <h3 className="text-sm font-black text-slate-800 mb-2">Export a Lender Packet</h3>
        <ol className="space-y-1.5 text-sm text-slate-600 list-decimal list-inside">
          <li>Run an analysis on a property.</li>
          <li>Click the <span className="font-bold text-slate-800">Export PDF</span> button in the Audit tab.</li>
          <li>The app generates a professional lender-ready PDF with all KPIs, projections, and comparables.</li>
        </ol>
      </div>

      <div className="border border-slate-100 rounded-xl p-4">
        <h3 className="text-sm font-black text-slate-800 mb-2">Add Custom Amenities</h3>
        <ol className="space-y-1.5 text-sm text-slate-600 list-decimal list-inside">
          <li>Click your profile avatar and select <span className="font-bold text-slate-800">Account Settings</span>.</li>
          <li>Scroll to the <span className="font-bold text-slate-800">Revenue Amenities</span> section.</li>
          <li>Add custom amenities with their estimated cost and ADR/revenue impact.</li>
          <li>Your custom amenities will appear in the Revenue Amenities section on every analysis.</li>
        </ol>
      </div>
    </div>
  </div>
);

const Calculations: React.FC = () => (
  <div className="space-y-6">
    <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">How Things Are Calculated</h2>

    <div className="space-y-4">
      {[
        {
          term: 'Cap Rate',
          formula: 'Net NOI ÷ Acquisition Price × 100',
          description: 'Measures the property\'s annual return independent of financing. A higher cap rate means a better return relative to price. Typically 6–12% is considered healthy for STR markets.',
        },
        {
          term: 'Cash-on-Cash Return',
          formula: 'Annual Cash Flow After Debt ÷ Cash Invested × 100',
          description: 'Measures the actual return on the cash you put in (down payment + closing costs + furnishings). This is the most important metric for leveraged investors.',
        },
        {
          term: 'Net NOI (Net Operating Income)',
          formula: 'Gross Revenue − Platform Fees − Management Fees − Operating Expenses',
          description: 'The annual income the property generates after all operating costs, before mortgage payments. Does not include financing costs.',
        },
        {
          term: 'Gross Yield',
          formula: 'Gross Annual Revenue ÷ Acquisition Price × 100',
          description: 'A quick top-line measure of how much revenue the property generates relative to its price, before any expenses.',
        },
        {
          term: 'ADR (Average Daily Rate)',
          formula: 'Total STR Revenue ÷ Total Nights Booked',
          description: 'The average nightly rate paid by guests on platforms like Airbnb and VRBO. Sourced from live web search market data for the specific area and property size. Updated each time you run an analysis.',
        },
        {
          term: 'Occupancy Rate',
          formula: 'Nights Booked ÷ Total Available Nights × 100',
          description: 'The percentage of available nights that are booked. Sourced from market data. A 35–55% annual occupancy is typical for most STR markets.',
        },
        {
          term: 'DSCR (Debt Service Coverage Ratio)',
          formula: 'Net NOI ÷ Annual Debt Service',
          description: 'Measures whether the property generates enough income to cover its mortgage payments. A DSCR above 1.0 means the property covers its own debt. Lenders typically require 1.25+.',
        },
        {
          term: 'Annual Gross Revenue (STR)',
          formula: 'ADR × Occupancy Rate × 365',
          description: 'The total revenue generated from guest bookings before any platform fees or expenses.',
        },
        {
          term: 'Annual Gross Revenue (MTR/LTR)',
          formula: 'Monthly Rent × 12',
          description: 'For medium and long-term rentals, annual revenue is simply the monthly rent multiplied by 12.',
        },
      ].map(({ term, formula, description }) => (
        <div key={term} className="border border-slate-100 rounded-xl p-4">
          <h3 className="text-sm font-black text-slate-800">{term}</h3>
          <p className="text-xs font-mono bg-slate-50 text-slate-700 px-2 py-1 rounded mt-1 mb-2">{formula}</p>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
      ))}
    </div>
  </div>
);

const Strategies: React.FC = () => (
  <div className="space-y-6">
    <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">STR / MTR / LTR Explained</h2>

    <div className="space-y-4">
      <div className="border-l-4 border-[#f43f5e] rounded-xl p-4 bg-rose-50">
        <h3 className="text-sm font-black text-slate-800 mb-1">STR — Short-Term Rental</h3>
        <p className="text-xs text-slate-500 mb-2">Typical stay: 1–29 nights · Platforms: Airbnb, VRBO</p>
        <p className="text-sm text-slate-600 mb-3">Guests pay a nightly rate (ADR). Revenue is driven by occupancy and pricing strategy. STR typically generates the highest gross revenue but requires active management, furnishing, and compliance with local STR regulations.</p>
        <p className="text-xs font-bold text-slate-700">Best for: Tourist markets, ski/beach destinations, high-demand urban areas with permissive STR laws.</p>
      </div>

      <div className="border-l-4 border-blue-500 rounded-xl p-4 bg-blue-50">
        <h3 className="text-sm font-black text-slate-800 mb-1">MTR — Medium-Term Rental</h3>
        <p className="text-xs text-slate-500 mb-2">Typical stay: 30–90 nights · Platforms: Furnished Finder, Airbnb monthly</p>
        <p className="text-sm text-slate-600 mb-3">Guests pay a monthly rate for furnished stays. Popular with traveling nurses, remote workers, and relocating professionals. MTR requires furnishing but has lower turnover than STR and avoids most short-term rental regulations.</p>
        <p className="text-xs font-bold text-slate-700">Best for: Markets near hospitals, corporate campuses, universities, or areas with STR restrictions.</p>
      </div>

      <div className="border-l-4 border-[#10b981] rounded-xl p-4 bg-emerald-50">
        <h3 className="text-sm font-black text-slate-800 mb-1">LTR — Long-Term Rental</h3>
        <p className="text-xs text-slate-500 mb-2">Typical stay: 12+ months · Traditional lease</p>
        <p className="text-sm text-slate-600 mb-3">Tenants pay a fixed monthly rent under a 12-month lease. LTR generates the most predictable income with the lowest management overhead. Revenue is lower than STR/MTR but expenses and vacancy risk are also lower.</p>
        <p className="text-xs font-bold text-slate-700">Best for: Stable residential markets, investors who prefer passive income with less active management.</p>
      </div>

      <div className="border border-slate-100 rounded-xl p-4">
        <h3 className="text-sm font-black text-slate-800 mb-2">How to Compare Strategies</h3>
        <p className="text-sm text-slate-600">Use the STR / MTR / LTR toggle in the Audit tab to instantly see how the same property performs under each strategy. Pay attention to:</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-600 list-disc list-inside">
          <li><span className="font-bold">Cap Rate</span> — which strategy produces the best return on price</li>
          <li><span className="font-bold">Cash-on-Cash</span> — which puts the most money in your pocket relative to what you invested</li>
          <li><span className="font-bold">DSCR</span> — which strategy most comfortably covers the mortgage</li>
        </ul>
      </div>
    </div>
  </div>
);

const FAQ: React.FC = () => (
  <div className="space-y-6">
    <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Frequently Asked Questions</h2>

    <div className="space-y-4">
      {[
        {
          q: 'What counts as a daily analysis?',
          a: 'Each time you run a fresh analysis on a property you have not analyzed before (or one that is not cached), it counts as one analysis toward your daily limit. Cached properties — ones you have already analyzed recently — reload instantly and do not count against your limit.',
        },
        {
          q: 'Where does the ADR data come from?',
          a: 'The ADR (Average Daily Rate) is sourced from a live web search using market data from sources like AirDNA and Mashvisor for the specific area and bedroom count. It is fetched fresh each time you run an analysis and represents the market-wide average nightly rate, not a theoretical maximum.',
        },
        {
          q: 'Why does the ADR change between runs?',
          a: 'The web search retrieves live market data, which can vary slightly between calls depending on what sources Claude finds. It always represents a current market estimate rather than a fixed historical figure.',
        },
        {
          q: 'What is a cached property?',
          a: 'When you analyze a property for the first time, the AI analysis result is cached for up to 2 hours. If you search the same address again within that window, the cached result loads instantly without making a new AI call, saving your daily limit.',
        },
        {
          q: 'Why are my saved properties gone after signing out?',
          a: 'Saved properties are stored in your account database and load automatically when you sign back in. If they are not appearing, try refreshing the page after signing in.',
        },
        {
          q: 'What is the difference between Net NOI and Profit (Y1)?',
          a: 'Net NOI is income after operating costs but before debt service (mortgage + HELOC). Profit (Y1) is Net NOI minus all debt service payments — it is your actual annual cash flow after paying the mortgage.',
        },
        {
          q: 'What does Owner Surplus mean?',
          a: 'Owner Surplus is the cash left over after all expenses including debt service, after accounting for a management fee. It represents what you net if the property is fully managed.',
        },
        {
          q: 'How is the furnishing cost calculated?',
          a: 'The AI calculates a professional mid-range furnishing budget based on bedroom and bathroom count: $3,500 per bedroom, $1,000 per bathroom, $4,500 for living room, $2,500 for kitchen and dining, and $1,500 for tech and decor.',
        },
        {
          q: 'What is a DSCR loan and why does it matter?',
          a: 'DSCR (Debt Service Coverage Ratio) loans are investment property mortgages where qualification is based on the property\'s rental income rather than your personal income. A DSCR above 1.25 is typically required. The Audit tab shows your DSCR for each strategy.',
        },
        {
          q: 'Can I upgrade from Free to Pro?',
          a: 'Yes. Click your profile avatar and select Upgrade to Pro. Pro accounts receive higher daily analysis limits and access to advanced features.',
        },
      ].map(({ q, a }) => (
        <div key={q} className="border border-slate-100 rounded-xl p-4">
          <h3 className="text-sm font-black text-slate-800 mb-1.5">{q}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{a}</p>
        </div>
      ))}
    </div>
  </div>
);

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<Section>('howto');

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeSection) {
      case 'howto': return <HowTo />;
      case 'calculations': return <Calculations />;
      case 'strategies': return <Strategies />;
      case 'faq': return <FAQ />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0f172a] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-black uppercase tracking-widest">Help & Guide</h2>
            <p className="text-xs text-slate-400 mt-0.5">How-to's, calculations, strategies, and FAQs</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-44 shrink-0 bg-slate-50 border-r border-slate-100 py-4 flex flex-col gap-1 px-2">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  activeSection === id
                    ? 'bg-[#0f172a] text-white'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Icon size={14} className="shrink-0" />
                <span className="text-xs font-bold">{label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
