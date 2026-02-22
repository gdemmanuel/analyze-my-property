# Testing Trial Emails Guide

## Overview
Trial emails are triggered automatically by a backend system (Stripe webhooks or scheduled tasks). For local testing, you'll need to **manually trigger them** or **manipulate the database directly**.

---

## Option 1: Manual Database Manipulation (Fastest for Testing)

### A. Test "Trial Expiring" Email (6 days after signup)

**Step 1: Find a test user**
- Go to Supabase Dashboard → Table Editor → `user_profiles`
- Note the `id` of a test user (copy their user ID)
- Check their `created_at` timestamp

**Step 2: Modify the user's creation date**
- Calculate when they signed up: if `created_at` is too recent, you need to backdate it
- For a 7-day trial, the "expiring" email should trigger around day 6
- Update the `created_at` to 6 days ago:
  ```sql
  UPDATE user_profiles
  SET created_at = NOW() - INTERVAL '6 days'
  WHERE id = 'USER_ID_HERE';
  ```

**Step 3: Trigger the email manually**
- Open your browser console (while logged in as admin)
- Run this to call the trial expiry email function:
  ```javascript
  const token = (await supabase.auth.getSession()).data.session.access_token;
  
  await fetch('/api/admin/send-trial-expiry-email', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'USER_ID_HERE' })
  }).then(r => r.json()).then(console.log);
  ```

> **Note:** The endpoint above doesn't exist yet. You'd need to create it, or...

---

## Option 2: Direct Function Call (Better for Development)

Since the endpoints don't exist yet, the **easiest way** is to add a temporary admin debug endpoint:

### Add a Debug Email Endpoint

In `server/routes/user.ts`, add this temporary route:

```typescript
/**
 * POST /api/debug/send-trial-email (ADMIN ONLY, DEV ONLY)
 * Temporarily send trial emails for testing
 */
router.post('/debug/send-trial-email', requireAuth, async (req: Request, res: Response) => {
  // Check if admin
  const { getUserProfile } = await import('../supabaseAuth');
  const profile = await getUserProfile(req.user.id);
  if (!profile || !profile.is_admin) {
    return res.status(403).json({ error: 'Admin only' });
  }

  const { emailType, userId } = req.body;
  // emailType: 'expiring' | 'expired'
  
  if (!emailType || !userId) {
    return res.status(400).json({ error: 'emailType and userId required' });
  }

  const { supabaseAdmin } = await import('../supabaseAuth');
  
  // Get user email
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('id', userId)
    .single();
  
  if (profileError || !profile) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email;
  
  if (!email) {
    return res.status(404).json({ error: 'User email not found' });
  }

  const { sendTrialExpiryEmail, sendTrialExpiredEmail } = await import('../emailService');
  
  let sent = false;
  if (emailType === 'expiring') {
    sent = await sendTrialExpiryEmail(email, 1); // 1 day left
  } else if (emailType === 'expired') {
    sent = await sendTrialExpiredEmail(email);
  }

  return res.json({ success: sent, email });
});
```

Then from browser console:

```javascript
// Get token
const token = (await supabase.auth.getSession()).data.session.access_token;

// Send trial expiring email
await fetch('/api/debug/send-trial-email', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ emailType: 'expiring', userId: 'USER_ID_HERE' })
}).then(r => r.json()).then(console.log);

// Send trial expired email
await fetch('/api/debug/send-trial-email', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ emailType: 'expired', userId: 'USER_ID_HERE' })
}).then(r => r.json()).then(console.log);
```

---

## Option 3: Mailbox/Email Preview (Best UX Test)

### Check Resend Dashboard

1. Go to [Resend Dashboard](https://resend.com/emails)
2. Click **"Emails"** in the sidebar
3. Filter by recipient email to see all emails sent to a test user
4. Click any email to preview the full HTML rendering
5. **Click links in the preview** to test the "See Pro features" button

This is the **best way** to see exactly what users see and test interactive elements.

---

## Option 4: Real Trigger (Production Testing)

For true end-to-end testing in production, you'd need to:

1. Create a test user
2. Wait until:
   - Day 6 of their 7-day trial → "Trial expiring" email triggered
   - Day 8 → "Trial expired" email triggered

Or manually update the `user_profiles.created_at` to simulate days passing.

---

## Testing Checklist

After sending any trial email, verify:

- [ ] Email arrives in inbox (check Resend dashboard if using temp email)
- [ ] Subject line is correct
- [ ] Free plan features are clearly listed
- [ ] "Upgrade to Pro" button is prominent
- [ ] Pro features list is accurate
- [ ] "Upgrade to Pro" link works → opens Stripe checkout
- [ ] Footer branding is correct
- [ ] No broken images or formatting issues

---

## Recommended Testing Approach

1. **Create a test user** with a Gmail `+` address (e.g., `youremail+trialemail@gmail.com`)
2. **Check Resend dashboard** to see the exact email rendering
3. **Manually trigger** using Option 2 (debug endpoint) or **modify database** using Option 1
4. **Click the "Upgrade to Pro" link** in the email to test the checkout flow
5. **Verify link works** by ensuring you're redirected to Stripe Checkout (not just homepage)

---

## Cleanup After Testing

Don't forget to:
1. Delete test users from Supabase (use the DELETE endpoint you just added!)
2. Revert any database date changes
3. Remove the debug endpoint when done testing (if you added it)
