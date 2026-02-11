# 🆘 Troubleshooting Guide - API Key & Visibility Issues

**Last Updated**: February 9, 2026

---

## 🔴 Problem: Still Getting API Key Error

### Checklist (in order):

#### ✅ Step 1: Verify .env File
```
Location: c:\Projects\AirROI\.env
Content should be:
VITE_ANTHROPIC_API_KEY=sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_RENTCAST_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_GOOGLE_MAPS_API_KEY=your-key-here
```

**Check**:
- [ ] File exists at correct location
- [ ] Has `VITE_` prefix (important!)
- [ ] Keys are on correct lines
- [ ] No spaces before VITE_
- [ ] No extra blank lines

#### ✅ Step 2: Restart Dev Server
```bash
# In terminal:
Ctrl+C (stop current server)
npm run dev (start fresh)
# Wait for "ready in XXXms"
```

**Check**:
- [ ] Terminal shows "VITE v6.4.1 ready"
- [ ] Shows http://localhost:3000
- [ ] No error messages

#### ✅ Step 3: Hard Refresh Browser
```
Chrome: Ctrl+Shift+R
Firefox: Ctrl+Shift+R
Safari: Cmd+Shift+R
Edge: Ctrl+Shift+R
```

**Check**:
- [ ] Page reloads completely
- [ ] Clears cached variables
- [ ] App should be fresh

#### ✅ Step 4: Check Browser Console
```
Press: F12 or Right-Click → Inspect
Go to: Console tab
```

**Look for**:
```javascript
[Claude Service] API Key Status: {
  hasKey: true,
  keyLength: 152,
  keyPrefix: "sk-ant-api03",
  fullKey: "sk-ant-api03-XXXXXXX..."
}
```

**What each field means**:
- `hasKey: true` ✅ Key is loading
- `hasKey: false` ❌ Key not loading (restart server!)
- `keyLength: 150+` ✅ Key is complete
- `keyLength: < 50` ❌ Key is truncated or wrong
- `keyPrefix: "sk-ant-"` ✅ Correct format
- `keyPrefix: "YOUR_"` ❌ Using placeholder (update .env)

#### ✅ Step 5: Test API Call
```
Enter address: 45 Blue Brook Road, Dover, VT 05356
Click: UNDERWRITE
Watch: Console for [Claude Service] log
```

**Errors to look for**:
| Error | Meaning | Solution |
|-------|---------|----------|
| `hasKey: false` | Server not restarted | Restart: Ctrl+C, npm run dev |
| `keyPrefix: "YOUR_"` | Using placeholder | Update .env with real key |
| `keyLength: 50` | Key is incomplete | Copy full key from console.anthropic.com |
| `401 error` | Invalid key | Get new key from Anthropic |
| `429 error` | Rate limited | Wait 60 seconds and retry |

---

## 🟡 Problem: Amenity Values Not Visible in Settings

### Checklist:

#### ✅ Step 1: Verify You're in Settings Tab
```
Left sidebar → Scroll to bottom
Look for: SETTINGS (should be at bottom)
Click: SETTINGS
```

**Check**:
- [ ] Tab changed to Settings
- [ ] See "Global Settings" section at top
- [ ] See "Investment Targets" section below
- [ ] See "Property Amenities" section (might need scroll)

#### ✅ Step 2: Find Property Amenities Section
```
Scroll down to: "PROPERTY AMENITIES"
Should see pink box with "Enter amenity name" input
Below that: Grid of amenity cards
```

**Check**:
- [ ] Pink add amenity input is visible
- [ ] Amenity cards below are visible
- [ ] Each card has name, cost, and ADR boost

#### ✅ Step 3: Check Cost Values Visibility
```
In each amenity card:
COST ($) [label]
5000 or similar [value]

Should appear as:
- Dark gray label (COST ($))
- BLACK NUMBER (5000)
- On WHITE background
```

**Visual Check**:
- [ ] Cost label is visible (not white on white)
- [ ] Cost value is BLACK (not gray)
- [ ] Value can be read easily
- [ ] Background is clearly white

#### ✅ Step 4: Test Input Interaction
```
1. Click on any "COST ($)" input field
2. Watch for blue ring to appear
3. See if current value is visible
4. Type a new number
```

**Check**:
- [ ] Blue focus ring appears
- [ ] Current value is visible while editing
- [ ] New value shows clearly as you type
- [ ] Value persists when you click away

#### ✅ Step 5: Hard Refresh if Still Not Working
```
Ctrl+Shift+R (or Cmd+Shift+R on Mac)
```

**Check**:
- [ ] Page completely reloads
- [ ] All styles refresh
- [ ] Values now visible

---

## 🟢 Verification - Everything Should Work

### API Key Working ✅
```
✅ Console shows: [Claude Service] API Key Status: {hasKey: true, ...}
✅ Can enter property address
✅ UNDERWRITE button works
✅ Analysis completes without 401 error
```

### Amenity Settings Visible ✅
```
✅ Settings tab opens
✅ Amenity cards visible with cost values
✅ Cost values are BLACK and readable
✅ Can click inputs and edit values
✅ Values persist after editing
```

### Overall App Status ✅
```
✅ Dev server running at http://localhost:3000
✅ No console errors for API key
✅ All input fields readable
✅ App is fully functional
```

---

## 🆘 Still Having Issues?

### Issue: API Key Error Still Appears

**Solution A: Fully Clear Everything**
```bash
# 1. Stop server (Ctrl+C)
# 2. Clear npm cache
npm cache clean --force

# 3. Start fresh
npm run dev

# 4. Hard refresh browser (Ctrl+Shift+R)
```

**Solution B: Verify Your API Key**
```
1. Go to: https://console.anthropic.com
2. Login to your account
3. Copy your actual API key (should start with sk-ant-)
4. Update .env file with the exact key
5. Restart server (Ctrl+C, npm run dev)
6. Refresh browser
```

**Solution C: Check for Whitespace**
```
.env file issue: Extra spaces or newlines
Fix:
1. Open .env in editor
2. Make sure no leading/trailing spaces
3. Line 1: VITE_ANTHROPIC_API_KEY=sk-ant-...
4. Line 2: VITE_RENTCAST_API_KEY=...
5. Save file
6. Restart server
```

### Issue: Amenity Values Still Not Visible

**Solution A: Clear Browser Cache**
```
Chrome: Settings → Privacy → Clear browsing data → All time
Firefox: Privacy → Clear Data → Everything
Safari: Develop → Empty Web Caches
```

**Solution B: Check Screen Zoom**
```
Zoom to 100%:
Chrome: Ctrl+0
Firefox: Ctrl+0
Safari: Cmd+0
Edge: Ctrl+0
```

**Solution C: Try Different Browser**
```
If Chrome doesn't work, try:
- Firefox
- Edge
- Safari
This helps identify if it's a browser-specific issue
```

---

## 📞 Debug Information to Collect

If issues persist, collect this information:

### 1. Browser Console Logs
```
F12 → Console tab → Copy everything related to:
- [Claude Service] API Key Status
- Any error messages
```

### 2. Network Errors
```
F12 → Network tab
Try to analyze a property
Look for failed requests (red)
Check the response/error message
```

### 3. Browser & OS Info
```
Browser: Chrome 130 (or whatever you're using)
OS: Windows 11
Node version: (run: node --version)
NPM version: (run: npm --version)
```

### 4. Screenshot
```
Take screenshot showing:
- The error message
- DevTools console
- Amenity settings if applicable
```

---

## 🎯 Common Issues & Quick Fixes

| Issue | Quick Fix | Time |
|-------|-----------|------|
| "Invalid API key" | Restart server (Ctrl+C, npm run dev) | 1 min |
| Amenity values invisible | Ctrl+Shift+R (hard refresh) | 30 sec |
| API key still wrong | Check .env has VITE_ prefix | 2 min |
| Button not responding | Server might be down, restart | 1 min |
| Can't see anything | Browser zoom to 100% (Ctrl+0) | 30 sec |
| App looks broken | Clear browser cache (Ctrl+Shift+R) | 1 min |

---

## ✅ Final Checklist Before Continuing

Before moving to React Query migration:

- [ ] API key error is gone
- [ ] Can analyze properties without errors
- [ ] Amenity values visible in Settings
- [ ] Can edit amenity costs
- [ ] All input fields readable
- [ ] No console errors related to API key
- [ ] App functions normally

**Once all boxes checked**: Ready to continue with React Query migration! 🚀

---

## 📚 Additional Resources

### Anthropic (Claude API)
- API Key: https://console.anthropic.com
- Documentation: https://docs.anthropic.com
- Status: https://status.anthropic.com

### RentCast API
- API Key: https://www.rentcast.io/admin/api
- Documentation: https://docs.rentcast.io

### Vite Environment Variables
- Docs: https://vitejs.dev/guide/env-and-modes

### Browser DevTools
- Chrome: https://developer.chrome.com/docs/devtools/
- Firefox: https://firefox-source-docs.mozilla.org/devtools/

---

**Last Update**: February 9, 2026
**Status**: All fixes applied and documented
