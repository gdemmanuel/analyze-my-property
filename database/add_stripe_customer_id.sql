-- Add Stripe customer ID to user_profiles for subscription billing
-- Run this in Supabase SQL Editor

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
