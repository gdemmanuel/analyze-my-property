# Email Upgrade Links Fix

## Problem
When users clicked "See Pro features" or "Upgrade to Pro" links in confirmation/trial emails, they were redirected to the homepage instead of opening the Stripe checkout flow.

## Root Cause
The emails correctly link to `?upgrade=true`, but `App.tsx` only handled:
- `?upgrade=success` (Stripe checkout return, already working)
- `?upgrade=cancelled` (Stripe checkout cancellation, already working)

There was no handler for `?upgrade=true` to trigger the initial checkout flow.

## Solution
Added a new condition in the `useEffect` that handles URL parameters in `App.tsx` (line 210):

```typescript
else if (params.get('upgrade') === 'true') {
  // User clicked upgrade link (e.g., from email) — trigger checkout flow
  window.history.replaceState({}, '', window.location.pathname);
  handleUpgrade();
}
```

Now when users click any "Upgrade" link in emails, the app will:
1. Detect the `?upgrade=true` parameter
2. Clean up the URL (remove query string)
3. Call `handleUpgrade()` to redirect to Stripe Checkout
4. Users can sign in/sign up and complete payment

## Email Links Affected
- ✅ Confirmation email: "See Pro features →" button
- ✅ Trial expiring email: "Upgrade to Pro" button
- ✅ Trial expired email: "Upgrade to Pro" button
- ✅ Manual profile menu upgrades: "See Pro features →" button (if using `?upgrade=true`)

## No Supabase Config Needed
The Supabase email template already uses `{{ .SiteURL }}?upgrade=true` correctly. You don't need to make any changes in the Supabase dashboard.
