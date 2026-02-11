# Cache Test Checklist - Execute Now

**App URL**: http://localhost:3001/

## Test Instructions

### Step 1: Hard Refresh
- [ ] Press `Ctrl + Shift + R` to clear browser cache
- [ ] Open Browser DevTools (F12)
- [ ] Open Console tab
- [ ] Open Network tab

### Step 2: First Search (Cache Population)
- [ ] Enter address: `2711 Oak View Ln, Tobyhanna, PA 18466`
- [ ] Click "Analyze Property"
- [ ] Start timer

**Expected Console Output:**
```
[Debug Web Data Logic] { 
  targetAddress: "2711 oak view ln, tobyhanna, pa 18466",
  needsWebData: true,
  propertyIsSuccess: true,
  isNewSearch: true
}
```

**Expected Network Activity:**
- RentCast API calls
- Claude API calls (web search + analysis)

**Expected Duration:** 90-120 seconds

- [ ] Record actual duration: __________ seconds
- [ ] Verify `needsWebData: true` in console
- [ ] Verify results displayed

### Step 3: Repeat Search (Cache Test)
- [ ] DO NOT refresh the page
- [ ] Enter SAME address: `2711 Oak View Ln, Tobyhanna, PA 18466`
- [ ] Click "Analyze Property"
- [ ] Start timer

**Expected Console Output:**
```
[Debug Web Data Logic] { 
  targetAddress: "2711 oak view ln, tobyhanna, pa 18466",
  needsWebData: false,
  propertyIsSuccess: true,
  isNewSearch: false
}
```

**Expected Network Activity:**
- NO new API calls (all from cache)

**Expected Duration:** < 1 second

- [ ] Record actual duration: __________ seconds
- [ ] Verify `needsWebData: false` in console
- [ ] Verify NO network requests in Network tab
- [ ] Verify results identical to first search

## Results

### ✅ PASS Criteria
- First search: 90-120s
- Repeat search: < 1s
- Console shows `needsWebData: false` on repeat
- No network activity on repeat

### ❌ FAIL - If repeat search > 1 second
Check:
1. Was page refreshed between searches? (clears cache)
2. Is `targetAddress` identical in both console logs?
3. Any React Query cache eviction messages?
4. Run third search attempt to verify

## After Testing

If PASS: Proceed with automated cleanup (already in progress)
If FAIL: Report console logs and actual timings for debugging
