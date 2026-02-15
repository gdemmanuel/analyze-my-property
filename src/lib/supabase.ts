import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase Client] URL:', supabaseUrl);
console.log('[Supabase Client] Has Anon Key:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase Client] Missing env vars!', {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey
  });
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database tables
export type UserProfile = {
  id: string;
  tier: 'free' | 'pro';
  created_at: string;
  updated_at: string;
};

export type Assessment = {
  id: string;
  user_id: string;
  address: string;
  config: any; // PropertyConfig
  insight: any; // MarketInsight
  selected_amenities: string[];
  strategy: string;
  cap_rate: number | null;
  cash_on_cash: number | null;
  price: number | null;
  annual_noi: number | null;
  created_at: string;
  updated_at: string;
};

export type UserSettings = {
  user_id: string;
  amenities: any[];
  default_config: any | null;
  created_at: string;
  updated_at: string;
};

export type UserUsage = {
  user_id: string;
  analyses_today: number;
  claude_calls_this_hour: number;
  last_analysis_timestamp: string | null;
  last_claude_call_timestamp: string | null;
  daily_reset_timestamp: string;
  hourly_reset_timestamp: string;
  updated_at: string;
};
