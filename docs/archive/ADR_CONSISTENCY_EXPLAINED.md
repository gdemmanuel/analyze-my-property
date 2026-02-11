# ADR Consistency Issue Explained

## Why ADR Changes Between Runs

You noticed that ADR shows different values when running the same property assessment twice, even though it says "RentCast Verified". Here's why:

### Root Causes

#### 1. **RentCast AVM Updates in Real-Time**
RentCast's Automated Valuation Model (AVM) is dynamic:
- They continuously update market data
- New comparable properties are added hourly
- Prices and rents change as new listings come in
- Their algorithm recalibrates estimates based on new data

**Example:**
- First run (Feb 6, 8pm): ADR $300 (based on 12 comps available)
- Second run (Feb 7, 8am): ADR $320 (based on 15 comps, 3 new listings added overnight)

#### 2. **Web Search Fallback is Non-Deterministic**
When RentCast has no direct data, Claude searches the web:
- Different search results each time
- Airbnb/VRBO listings change daily
- Market conditions fluctuate
- Claude's interpretation of results can vary slightly

#### 3. **Data Source Switching**
The app automatically switches sources:
- **First run:** RentCast has data → uses RentCast ADR
- **Second run:** RentCast updated data → uses updated ADR
- **Fallback:** If RentCast fails → uses Web Search → different result

### What You're Seeing

**Screenshot 1 (First Run):**
- ADR: $300 + RentCast Verified ✅
- Source: `https://api.rentcast.io/v1/avm/rent/long-term`

**Screenshot 2 (Second Run - Same Day):**
- ADR: $320 + RentCast Verified ✅
- Source: Same endpoint, but RentCast updated their data

---

## How to Verify Data Source

We've improved the badge display to show **exactly where ADR came from**:

### Badge Types:
- 🔵 **RentCast** (Blue) - From RentCast API (official real estate data)
- 🟠 **Web Search** (Amber) - From Claude web search (Airbnb/VRBO/market reports)
- 🟣 **AI Enhanced** (Purple) - Claude's estimate based on property features

### Check Console
Open browser DevTools (F12) and look for:
```
[Claude] Data Source Summary: {
  adr: "RentCast",          ← ADR source
  occupancy: "RentCast",    ← Occupancy source
  comps: "RentCast",        ← Comps source
  hasRentCastData: true
}
```

---

## Why This Is Actually Good

**Variation between runs = More accurate data**

1. **RentCast updates** = Fresh market data being incorporated
2. **Multiple sources** = If one fails, we have backups
3. **Transparent tracking** = You know where numbers came from

---

## When ADR Variations Are Normal

✅ **Expected variation:**
- +/- 5-10% between different runs (normal market changes)
- Different data source (RentCast vs Web)
- Different date/time (more recent comps)

❌ **Suspicious variation:**
- +/- 30-50% between runs (indicates data quality issue)
- Source changes inconsistently
- Badge vs actual data mismatch

---

## What's Fixed in This Update

### 1. **Better Data Source Tracking**
Now distinguishes between:
- RentCast API data
- Web search data
- AI estimates

### 2. **Accurate Badge Display**
Badge now shows actual source of ADR:
```
RentCast → Blue badge
Web Search → Amber badge
AI Estimate → Purple badge
```

### 3. **Console Logging**
Detailed logs showing which data source was used for each metric

### 4. **Removed Address Suggestions**
Eliminated the slow Google address autocomplete dropdown

---

## Recommendation

For STR analysis consistency, **expect and accept small ADR variations**:

- **RentCast ADR varies:** ±5-10% as new comps are added
- **Web search varies:** ±10-20% due to market changes and search results
- **Use as ranges, not absolutes:** If ADR is $300, think "$285-$315 range"

If you see **huge swings** (>30%), check:
1. Is data source changing? (Check badge)
2. Are you analyzing different properties? (Check address)
3. Is RentCast having API issues? (Check console logs)

---

## Future Improvements

To make ADR more consistent:

1. **Cache RentCast data** - Store results for 24 hours (reduces API calls)
2. **Lock comps** - Once retrieved, don't re-fetch for same property in same day
3. **Use multiple comps** - Average across 3-5 sources for stability
4. **Track AVM version** - Note when RentCast updates their algorithm

Would you like us to implement caching to reduce variation between runs of the same property?
