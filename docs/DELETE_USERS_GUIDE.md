# User Deletion Guide for Testing

## Quick Reference

### Method 1: API Endpoint (Recommended)

**From Browser Console (while logged in as admin):**

```javascript
// Step 1: Get your auth token
const token = (await supabase.auth.getSession()).data.session.access_token;

// Step 2: Get user ID from AdminTab or copy from Supabase dashboard
const userIdToDelete = 'USER_ID_HERE';

// Step 3: Delete the user
const result = await fetch(`/api/user/${userIdToDelete}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

console.log(result); // { success: true, message: 'User deleted successfully' }
```

**What it deletes:**
- User from Supabase Auth (`auth.users`)
- User profile (`user_profiles`)
- User usage data (`user_usage`)
- User settings (`user_settings`)
- All saved assessments (`assessments`)

---

### Method 2: Supabase Dashboard (Manual)

1. Go to: **Supabase Dashboard → Authentication → Users**
2. Find the test user by email
3. Click the three dots (•••) → **Delete user**
4. Go to: **Table Editor** and manually delete orphaned rows if needed

---

### Method 3: Gmail Plus-Addressing (No deletion needed!)

Instead of deleting users, use Gmail's `+` addressing for unlimited test emails:

- `youremail+test1@gmail.com`
- `youremail+test2@gmail.com`
- `youremail+test3@gmail.com`
- etc.

All emails go to `youremail@gmail.com` but Supabase treats each as a unique user.

---

## Security Notes

- The DELETE endpoint requires admin authentication
- Only accessible by users with `is_admin: true` in their profile
- All related data is cleaned up automatically
- Action is logged to server console
