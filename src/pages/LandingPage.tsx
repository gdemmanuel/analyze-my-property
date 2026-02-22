import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, TrendingUp, Shield, Zap, DollarSign,
  Building2, CheckCircle2, ArrowRight, Star, Clock, Database
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            <span className="font-bold text-lg tracking-tight">Analyze My Property</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/sample')}
              className="text-sm text-slate-400 hover:text-slate-100 transition-colors"
            >
              See Sample Analysis
            </button>
            <button
              onClick={() => navigate('/app')}
              className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 text-indigo-300 text-sm px-4 py-1.5 rounded-full mb-8">
          <Zap className="w-3.5 h-3.5" />
          AI-Powered Real Estate Underwriting
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          Underwrite any property<br />
          <span className="text-indigo-400">in 60 seconds</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          Institutional-grade STR, MTR, and LTR analysis powered by Claude AI and real-time RentCast data — at a fraction of the cost of traditional tools.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl text-base font-semibold transition-colors shadow-lg shadow-indigo-900/50"
          >
            Analyze a Property Free
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/sample')}
            className="flex items-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white px-8 py-3.5 rounded-xl text-base font-medium transition-colors"
          >
            See a Sample Analysis
          </button>
        </div>
        <p className="mt-5 text-sm text-slate-500">Free trial — no credit card required</p>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-slate-800 bg-slate-900/50 py-5">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-400">
          <div className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Trusted by STR investors</div>
          <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-400" /> 60-second analysis</div>
          <div className="flex items-center gap-2"><Database className="w-4 h-4 text-indigo-400" /> Real-time RentCast data</div>
          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-400" /> 20-year projections</div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything you need to evaluate a deal</h2>
          <p className="text-slate-400 max-w-xl mx-auto">No spreadsheets. No guesswork. Just data-driven decisions.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-600 transition-colors">
              <div className="w-10 h-10 bg-indigo-950 rounded-lg flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-900/50 border-y border-slate-800 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-slate-400">From address to investment decision in three steps.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.title} className="text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-slate-100 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-slate-400">Fraction of the cost of AirDNA or Mashvisor.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <div className="text-sm text-slate-400 font-medium mb-2">Free</div>
            <div className="text-4xl font-extrabold mb-1">$0<span className="text-lg font-normal text-slate-400">/mo</span></div>
            <p className="text-sm text-slate-500 mb-6">7-day full trial, then 3 analyses/day</p>
            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/app')}
              className="w-full border border-slate-700 hover:border-slate-500 text-slate-300 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Get Started Free
            </button>
          </div>
          {/* Pro */}
          <div className="bg-indigo-950 border border-indigo-700 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Most Popular</div>
            <div className="text-sm text-indigo-300 font-medium mb-2">Pro</div>
            <div className="text-4xl font-extrabold mb-1">$29<span className="text-lg font-normal text-indigo-300">/mo</span></div>
            <p className="text-sm text-indigo-400 mb-6">50 analyses/day, full feature access</p>
            <ul className="space-y-3 mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/app')}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              Start Free Trial
            </button>
          </div>
        </div>
        <p className="text-center text-sm text-slate-500 mt-6">vs. $99–$399/mo for AirDNA, Mashvisor, and Rabbu</p>
      </section>

      {/* CTA Banner */}
      <section className="bg-indigo-950 border-y border-indigo-900 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to find your next deal?</h2>
          <p className="text-indigo-300 mb-8">Enter any address and get a full AI-powered underwriting report in under 60 seconds.</p>
          <button
            onClick={() => navigate('/app')}
            className="inline-flex items-center gap-2 bg-white text-indigo-900 hover:bg-indigo-50 px-8 py-3.5 rounded-xl text-base font-semibold transition-colors"
          >
            Analyze a Property Free
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>Analyze My Property</span>
          </div>
          <p>© {new Date().getFullYear()} Analyze My Property. For informational purposes only. Not financial advice.</p>
        </div>
      </footer>

    </div>
  );
};

const FEATURES = [
  {
    icon: Zap,
    title: 'AI-Powered Analysis',
    description: 'Claude AI (Sonnet) audits each property with web search for current STR data, regulations, and market conditions.',
  },
  {
    icon: TrendingUp,
    title: 'Multi-Strategy Comparison',
    description: 'Instantly compare STR, MTR, and LTR scenarios side-by-side with a single click — unique in the market.',
  },
  {
    icon: BarChart3,
    title: '20-Year Projections',
    description: 'Full amortization with HELOC modeling, seasonality, appreciation, and inflation built in.',
  },
  {
    icon: Database,
    title: 'RentCast Market Data',
    description: 'Real-time AVM valuations, rental comps, market trends, active listings, and owner information.',
  },
  {
    icon: DollarSign,
    title: 'Sensitivity Analysis',
    description: 'Stress-test your deal across ADR, occupancy, and interest rate scenarios to find your risk thresholds.',
  },
  {
    icon: Building2,
    title: 'Lender-Ready Packet',
    description: 'Auto-generate a professional PDF report with AI analysis, comps, and financial projections for lenders.',
  },
];

const STEPS = [
  {
    title: 'Enter an address',
    description: 'Type any US property address. We pull real-time data from RentCast across 6 data sources in seconds.',
  },
  {
    title: 'AI underwrites the deal',
    description: 'Claude AI searches the web for current STR data, regulations, and comparable properties, then builds a full pro forma.',
  },
  {
    title: 'Make your decision',
    description: 'Review KPIs, 20-year projections, sensitivity tables, and a clear recommendation — then save or export.',
  },
];

const FREE_FEATURES = [
  'STR, MTR & LTR comparison',
  '20-year financial projections',
  'RentCast market data',
  'AI property audit',
  'Portfolio (save up to 5 properties)',
  '3 analyses/day after 7-day trial',
];

const PRO_FEATURES = [
  'Everything in Free',
  '50 analyses/day',
  'Sensitivity Analysis',
  'Amenity ROI Calculator',
  'Path to Yes scenarios',
  'Lender Packet PDF export',
];

export default LandingPage;
