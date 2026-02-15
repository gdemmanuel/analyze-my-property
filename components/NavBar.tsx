import React from 'react';
import {
  LayoutDashboard, BarChart3, Calendar, TrendingUp,
  Briefcase, Settings, Shield
} from 'lucide-react';
import { RentalStrategy } from '../types';
import { UserMenu } from './UserMenu';
import type { User } from '@supabase/supabase-js';

interface NavBarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  strategy: RentalStrategy;
  setStrategy: (s: RentalStrategy) => void;
  savedCount: number;
  user: User | null;
  userTier: 'free' | 'pro';
  onSignIn: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ activeTab, setActiveTab, strategy, setStrategy, savedCount, user, userTier, onSignIn }) => {
  return (
    <nav className="w-full h-auto bg-[#0f172a] text-white px-4 lg:px-8 py-4 fixed top-0 left-0 right-0 z-50 border-b border-slate-800 print:hidden">
      <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <img src="/logo.png" alt="Analyze My Property" className="h-8 w-8 object-contain" />
          <h1 className="text-sm font-black tracking-tighter uppercase leading-none hidden sm:block">Analyze My <span className="text-[#4CAF50]">Property</span></h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Audit' },
            { id: 'rentcast', icon: BarChart3, label: 'RentCast Data' },
            { id: 'analytics', icon: BarChart3, label: 'Performance' },
            { id: 'monthly', icon: Calendar, label: 'Monthly' },
            { id: 'yearly', icon: TrendingUp, label: 'Yearly' },
            { id: 'portfolio', icon: Briefcase, label: 'Portfolio' },
            { id: 'assumptions', icon: Settings, label: 'Settings' },
            { id: 'admin', icon: Shield, label: 'Admin' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg transition-all font-black text-[10px] lg:text-[11px] uppercase tracking-wider whitespace-nowrap ${activeTab === item.id ? 'bg-[#1e293b] text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <item.icon size={14} />
              <span className="hidden md:inline">{item.label}</span>
              {item.id === 'portfolio' && savedCount > 0 && (
                <span className="px-1.5 py-0.5 bg-[#f43f5e] text-white rounded-full text-[8px] font-black">{savedCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Strategy Toggle & User Menu */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Strategy Toggle */}
          <div className="flex items-center gap-1 bg-[#1e293b]/50 rounded-lg p-1 border border-white/5">
            {[
              { id: 'STR', label: 'STR', color: 'bg-[#f43f5e]' },
              { id: 'MTR', label: 'MTR', color: 'bg-blue-500' },
              { id: 'LTR', label: 'LTR', color: 'bg-[#10b981]' }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setStrategy(s.id as RentalStrategy)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${strategy === s.id ? `${s.color} text-white shadow-lg` : 'text-slate-400 hover:text-white'}`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* User Menu */}
          <UserMenu user={user} userTier={userTier} onSignIn={onSignIn} />
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
