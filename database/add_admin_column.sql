-- Add is_admin column to user_profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE user_profiles
ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Make yourself an admin (replace with your user ID)
-- Get your user ID from: SELECT id FROM auth.users WHERE email = 'gdemmanuel@yahoo.com';
-- Then run: UPDATE user_profiles SET is_admin = TRUE WHERE id = '<your-user-id>';

-- Or update by email directly:
UPDATE user_profiles
SET is_admin = TRUE
WHERE id = (SELECT id FROM auth.users WHERE email = 'gdemmanuel@yahoo.com');
