# Phase 17: Testing & Deployment Guide

## ✅ Implementation Complete

All Phase 17 code has been implemented! Here's what was done:

### Frontend Changes
- ✅ Created `AuthModal.tsx` - Sign in/Sign up UI
- ✅ Created `UserMenu.tsx` - User dropdown menu in NavBar
- ✅ Created `DataMigration.tsx` - Auto-migrates localStorage data to Supabase
- ✅ Updated `App.tsx` - Added Supabase auth state management
- ✅ Updated `NavBar.tsx` - Integrated UserMenu component
- ✅ Created `src/lib/supabase.ts` - Supabase client for frontend

### Backend Changes
- ✅ Created `server/supabaseAuth.ts` - Replaces old auth.ts with Supabase JWT verification
- ✅ Created `server/routes/user.ts` - New authenticated API routes:
  - `GET /api/user/profile` - Get user profile
  - `PUT /api/user/profile` - Update profile
  - `GET /api/user/usage` - Get usage stats
  - `GET /api/user/assessments` - Get saved assessments
  - `POST /api/user/assessments` - Save assessment
  - `DELETE /api/user/assessments/:id` - Delete assessment
  - `GET /api/user/settings` - Get settings
  - `PUT /api/user/settings` - Update settings
- ✅ Updated `server/index.ts` - Integrated Supabase auth middleware
- ✅ Updated `/api/claude/messages` - Now uses Supabase rate limiting
- ✅ Updated `/api/claude/analysis` - Now uses Supabase rate limiting

### Database
- ✅ Created `database/schema.sql` - PostgreSQL tables
- ✅ Created `database/rls-policies.sql` - Row Level Security
- ✅ Created `database/functions.sql` - Usage counter functions

---

## 🧪 Testing Phase

### Step 1: Install Dependencies

```bash
npm install
```

Verify that `@supabase/supabase-js` is installed (should be in package.json already).

### Step 2: Run the SQL Script (If Not Done)

If you haven't already, run `database/functions.sql` in Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Paste the contents of `database/functions.sql`
4. Click "Run"

### Step 3: Start Development Server

```bash
npm run dev
```

The server should start on `http://localhost:3001`.

### Step 4: Test Authentication Flow

1. **Open the app** in your browser (`http://localhost:3001`)
2. **Click "Sign In"** button in the top-right (UserMenu component)
3. **Sign Up** with a new email/password
4. **Check Supabase Dashboard** → Authentication → Users
   - You should see your new user
5. **Check Database** → Table Editor → `user_profiles`
   - Should have a row for your user with `tier: 'free'`
6. **Check `user_usage` table**
   - Should have a row with `analyses_today: 0`, `claude_calls_this_hour: 0`

### Step 5: Test Data Migration

1. **Before signing in**, add some test data to localStorage (open DevTools Console):

```javascript
localStorage.setItem('savedAssessments', JSON.stringify([
  { id: '1', address: '123 Test St', data: { test: true } },
  { id: '2', address: '456 Demo Ave', data: { test: true } }
]));

localStorage.setItem('airroi_global_settings', JSON.stringify({
  downPaymentPercent: 25,
  interestRate: 7.5
}));
```

2. **Sign in** to the app
3. **Watch the console** - you should see migration logs:
   ```
   [DataMigration] Starting migration for user: <user-id>
   [DataMigration] Migrating 2 assessments...
   [DataMigration] Assessments migrated successfully
   [DataMigration] Migrating global settings...
   [DataMigration] Settings migrated successfully
   [DataMigration] Migration complete
   ```

4. **Check Supabase** → Table Editor → `assessments`
   - Should have 2 rows with your test assessments
5. **Check `user_settings` table**
   - Should have 1 row with your settings

### Step 6: Test Rate Limiting

1. **Run a property analysis** (search for an address and run "Analyze Property")
2. **Check the database**:
   - `user_usage.analyses_today` should be `1`
   - `user_usage.claude_calls_this_hour` should increment

3. **Manually hit the limit** (in Supabase SQL Editor):

```sql
UPDATE user_usage
SET analyses_today = 3
WHERE user_id = '<your-user-id>';
```

4. **Try to run another analysis** - should get rate limit error:
   ```
   "Daily analysis limit exceeded"
   ```

5. **Reset the counter**:

```sql
UPDATE user_usage
SET analyses_today = 0
WHERE user_id = '<your-user-id>';
```

### Step 7: Test Google OAuth (Optional)

1. In Supabase Dashboard → Authentication → Providers → Google
2. Enable Google provider
3. Add your Google OAuth credentials (Client ID, Secret)
4. In the app, click "Continue with Google"
5. Sign in with Google
6. Should create a new user and profile automatically

### Step 8: Test Tier Upgrade (Manual)

To test PRO tier features:

1. **Upgrade user to PRO** (in Supabase SQL Editor):

```sql
UPDATE user_profiles
SET tier = 'pro'
WHERE user_id = '<your-user-id>';
```

2. **Refresh the app** - UserMenu should now show "PRO" badge
3. **Check rate limits** - you should now have:
   - 50 analyses per day
   - 100 Claude calls per hour

---

## 🚀 Railway Deployment

### Step 1: Update Railway Environment Variables

Add these **new** environment variables to your Railway service:

```bash
SUPABASE_URL=https://mmqrtgvgufxqlsgfkiop.supabase.co
SUPABASE_SERVICE_KEY=<your-service-role-key-from-supabase>
VITE_SUPABASE_URL=https://mmqrtgvgufxqlsgfkiop.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key-from-supabase>
```

**Keep all existing variables** (ANTHROPIC_API_KEY, RENTCAST_API_KEY, CORS_ORIGIN, etc.)

### Step 2: Commit and Push

```bash
git add .
git commit -m "feat: Phase 17 - Implement Supabase authentication and database persistence"
git push origin master
```

Railway will automatically detect the push and start a new deployment.

### Step 3: Verify Deployment

1. Wait for Railway build to complete
2. Visit your production URL: `https://www.analyzemyproperty.com`
3. Test sign-up flow in production
4. Verify data persistence (sign out, sign back in, check saved assessments)

### Step 4: Configure Supabase for Production

1. **Add Production URL to Supabase**:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add `https://www.analyzemyproperty.com` to "Site URL"
   - Add `https://www.analyzemyproperty.com/**` to "Redirect URLs"

2. **Enable Email Confirmations** (optional):
   - Go to Authentication → Email Templates
   - Customize confirmation email
   - Enable "Confirm email" requirement

---

## 🔍 Troubleshooting

### Issue: "SUPABASE_URL is missing"

**Solution**: Make sure environment variables are set in Railway **Service Variables** (not Shared Variables).

### Issue: "Failed to fetch user profile"

**Solution**: Check that:
1. SQL scripts have been run in Supabase
2. RLS policies are enabled
3. JWT token is being sent in Authorization header

### Issue: "Migration not running"

**Solution**: 
1. Open DevTools Console and check for errors
2. Verify Supabase keys are correct in `.env` (frontend keys)
3. Check Network tab for failed API requests

### Issue: Rate limits not resetting

**Solution**: The reset logic is in the SQL functions. Check:
1. `database/functions.sql` has been executed
2. The functions are using `NOW()` to compare timestamps
3. Run manual reset query (see Step 6 above)

---

## 📊 Post-Deployment Checklist

- [ ] Users can sign up and sign in
- [ ] User profiles are created automatically
- [ ] Data migration works (localStorage → Supabase)
- [ ] Rate limits are enforced (Free: 3/day, Pro: 50/day)
- [ ] Saved assessments persist across sessions
- [ ] Settings persist across sessions
- [ ] Google OAuth works (if enabled)
- [ ] Production URL is configured in Supabase
- [ ] Railway environment variables are set

---

## 🎉 Success!

Once all tests pass, **Phase 17 is complete!** Your app now has:

- ✅ Real user authentication (Supabase Auth)
- ✅ Persistent data storage (PostgreSQL)
- ✅ User-specific rate limiting
- ✅ Secure JWT-based API access
- ✅ Automatic data migration
- ✅ Production-ready architecture

### Next Steps (Future Phases):

- **Phase 18**: Payment integration (Stripe) for PRO tier
- **Phase 19**: Email notifications and user dashboard
- **Phase 20**: Multi-property portfolio management
- **Phase 21**: Collaborative features (share assessments)

---

**Questions or issues?** Check the logs:
- Frontend: DevTools Console
- Backend: Railway logs or local terminal
- Database: Supabase Dashboard → Logs
