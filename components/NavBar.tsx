import React from 'react';
import {
  LayoutDashboard, BarChart3, Calendar, TrendingUp,
  Briefcase, Shield
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
  isAdmin: boolean;
  onSignIn: () => void;
  onSettingsClick?: () => void;
  onUpgradeClick?: () => void;
  onManageSubscription?: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ activeTab, setActiveTab, strategy, setStrategy, savedCount, user, userTier, isAdmin, onSignIn, onSettingsClick, onUpgradeClick, onManageSubscription }) => {
  // Define all possible tabs
  const allTabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Audit' },
    { id: 'rentcast', icon: BarChart3, label: 'RentCast Data' },
    { id: 'analytics', icon: BarChart3, label: 'Performance' },
    { id: 'monthly', icon: Calendar, label: 'Monthly' },
    { id: 'yearly', icon: TrendingUp, label: 'Yearly' },
    { id: 'portfolio', icon: Briefcase, label: 'Portfolio' },
    { id: 'admin', icon: Shield, label: 'Admin' }
  ];

  // Filter tabs based on admin status
  const visibleTabs = isAdmin ? allTabs : allTabs.filter(tab => tab.id !== 'admin');

  return (
    <nav className="w-full h-auto bg-[#0f172a] text-white px-4 lg:px-8 py-4 fixed top-0 left-0 right-0 z-50 border-b border-slate-800 print:hidden">
      <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <button 
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity"
        >
          <img src="/logo.png" alt="Analyze My Property" className="h-8 w-8 object-contain" />
          <h1 className="text-sm font-black tracking-tighter uppercase leading-none hidden sm:block">Analyze My <span className="text-[#4CAF50]">Property</span></h1>
        </button>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {visibleTabs.map(item => (
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

        {/* User Menu */}
        <UserMenu 
          user={user} 
          userTier={userTier} 
          onSignIn={onSignIn}
          onSettingsClick={onSettingsClick}
          onUpgradeClick={onUpgradeClick}
          onManageSubscription={onManageSubscription}
        />
      </div>
    </nav>
  );
};

export default React.memo(NavBar);
