# Supabase Setup Instructions

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/log in
2. Click "New Project"
3. Enter project details:
   - **Name**: `analyze-my-property`
   - **Database Password**: (generate a strong password - save it!)
   - **Region**: `East US (North Virginia)` (closest to Railway)
4. Click "Create new project"
5. Wait 2-3 minutes for project initialization

## Step 2: Get API Keys

Once your project is created:

1. Go to **Settings** → **API** in the left sidebar
2. Copy these values (you'll need them):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Starts with `eyJhb...` (for frontend)
   - **service_role key**: Starts with `eyJhb...` (for backend, keep secret!)

## Step 3: Add to Environment Variables

### Local Development (`.env`):
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb... (your anon key)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhb... (your service role key)
```

### Railway (Variables tab):
Add these variables:
- `VITE_SUPABASE_URL` = your project URL
- `VITE_SUPABASE_ANON_KEY` = your anon key
- `SUPABASE_URL` = your project URL
- `SUPABASE_SERVICE_KEY` = your service role key

## Step 4: Create Database Tables

1. In Supabase dashboard, go to **SQL Editor** in the left sidebar
2. Click "New query"
3. Copy and paste the SQL from `database/schema.sql` (will be created next)
4. Click "Run" to execute

## Step 5: Enable Row Level Security

After creating tables, run the RLS policies from `database/rls-policies.sql`

## Next Steps

Once you've completed these steps:
1. Verify the tables were created in **Database** → **Tables**
2. Check that RLS is enabled (green shield icon next to each table)
3. Return to the terminal and continue with the implementation

---

**Important**: Keep your `service_role` key secret! Never commit it to git or expose it in client-side code.
