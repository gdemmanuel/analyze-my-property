import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserMenuProps {
  user: SupabaseUser;
  tier: 'free' | 'pro';
}

export const UserMenu: React.FC<UserMenuProps> = ({ user, tier }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
  };

  const userEmail = user.email || 'User';
  const displayEmail = userEmail.length > 20 ? `${userEmail.slice(0, 17)}...` : userEmail;

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <User size={18} className="text-white" />
        </div>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-xs text-white font-medium">{displayEmail}</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              tier === 'pro'
                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            {tier.toUpperCase()}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">{user.email}</p>
            <p className="text-xs text-gray-500 mt-1">
              {tier === 'pro' ? 'Pro Plan' : 'Free Plan'}
            </p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Navigate to account settings
                alert('Account settings coming soon!');
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Settings size={16} />
              Account Settings
            </button>

            {tier === 'free' && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  // TODO: Navigate to upgrade page
                  alert('Upgrade to Pro coming soon!');
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <span className="text-lg">⭐</span>
                Upgrade to Pro
              </button>
            )}

            <div className="border-t border-gray-200 my-1"></div>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
