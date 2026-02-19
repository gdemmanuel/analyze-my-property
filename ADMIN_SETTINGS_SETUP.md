# Admin Settings Persistence Setup

## Issue
Your admin tier limit changes (e.g., changing "analyses per day" from 3 to 20) are resetting when the server restarts.

## Solution
You need to create the `admin_settings` table in your Supabase database to persist these changes.

## How to Set Up

### Step 1: Open Supabase SQL Editor
1. Go to [supabase.com](https://supabase.com)
2. Log in to your project
3. Click **SQL Editor** in the sidebar
4. Click **New Query**

### Step 2: Run the Migration SQL
Copy and paste the entire contents of `database/admin_settings_schema.sql` into the SQL editor.

Then click **Run** to execute the migration.

### Step 3: Verify
After running, you should see:
- A new table `admin_settings` created
- No errors in the output

## What This Does
- Creates a `admin_settings` table that stores tier limits as JSON
- When you change tier limits in the Admin dashboard, they're saved to the database
- On server startup, tier limits are loaded from the database
- Your changes now persist across server restarts and deployments

## Testing
1. Go to Admin > Configuration > Rate Limits
2. Change "Free Tier Analyses Per Day" to 20
3. Click Save
4. Restart your server (or redeploy on Railway)
5. Check Admin > Configuration again - should still show 20 (not reset to 3)

## Troubleshooting
- If you get "relation 'admin_settings' does not exist", the SQL didn't execute properly - try again
- Make sure you're in the correct Supabase project
- Check that the SQL ran without errors (green checkmark)
