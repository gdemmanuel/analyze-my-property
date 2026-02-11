# RentCast Comps: Why They Were Missing & Fix Applied

## The Problem

You noticed that RentCast shows rental comps in their UI, but our app wasn't picking them up consistently. The issue was:

1. **We disabled `fetchSTRComps`** thinking it called a non-existent endpoint
2. **We didn't extract comps from `rentEstimate`** even though the endpoint returns them
3. **Comps were available but we weren't using them**

---

## Where RentCast Comps Actually Come From

RentCast provides rental comps through **TWO separate endpoints:**

### Option 1: Rent Estimate Endpoint (Returns Comps Embedded)
```
Endpoint: GET https://api.rentcast.io/v1/avm/rent/long-term?address=...

Response contains:
{
  "rent": 1500,
  "rentRangeLow": 1400,
  "rentRangeHigh": 1600,
  "comparableProperties": [        ← COMPS ARE HERE!
    {
      "address": "...",
      "rent": 1450,
      "bedrooms": 4,
      "bathrooms": 2.5
    },
    // ... more comps
  ]
}
```

### Option 2: Rental Listings Endpoint (Get Comps Directly)
```
Endpoint: GET https://api.rentcast.io/v1/listings/rental/long-term?address=...&radius=5

Response returns array of rental listings:
[
  {
    "address": "...",
    "rent": 1450,
    "bedrooms": 4,
    "bathrooms": 2.5,
    "listedPrice": 1450
  },
  // ... more listings
]
```

**We were already calling Option 1** (`fetchRentEstimate`), but **we weren't extracting the `comparableProperties`** field!

---

## The Fix Applied

### Change 1: Extract Comps from Rent Estimate
**File:** `services/claudeService.ts`

Added code to extract comparable properties from the rent estimate response:

```typescript
if (re.comparableProperties && Array.isArray(re.comparableProperties) && re.comparableProperties.length > 0) {
  groundTruth += `\nLONG-TERM RENTAL COMPARABLES (FROM RENT ESTIMATE):\n`;
  re.comparableProperties.slice(0, 3).forEach((comp: any, i: number) => {
    const addr = comp.formattedAddress || comp.address || 'N/A';
    const rent = comp.rent || comp.listedPrice || 'N/A';
    const beds = comp.bedrooms || 'N/A';
    const baths = comp.bathrooms || 'N/A';
    groundTruth += `${i + 1}. ${addr} (${beds}bd/${baths}ba): $${rent}/mo\n`;
  });
  console.log(`[Claude] ✅ Found ${re.comparableProperties.length} rental comps from Rent Estimate endpoint`);
}
```

### Change 2: Re-enabled Direct Comps Endpoint
**File:** `services/rentcastService.ts`

Re-enabled `fetchSTRComps` to call the dedicated rental listings endpoint:

```typescript
export const fetchSTRComps = async (...): Promise<any | null> => {
  // Fetch from dedicated rental listings endpoint
  const url = `https://api.rentcast.io/v1/listings/rental/long-term?address=${encodedAddress}&radius=5&limit=5`;
  // ... returns rental listings that can be used as comps
}
```

### Change 3: Added Logging
**File:** `services/rentcastService.ts`

Enhanced `fetchRentEstimate` to log whether comps were found:

```typescript
console.log(`[RentCast] Rent Estimate Response:`, {
  rent: data.rent,
  hasComps: data.comparableProperties ? data.comparableProperties.length : 0
});
```

---

## Why Comps Sometimes Don't Show

There are several reasons comps might not always appear:

### 1. **RentCast API Limitations**
- Not all addresses have comparable data available
- Sparse markets may not have enough rental listings
- New listings may not have comps populated yet
- API sometimes has rate limits (returns errors)

### 2. **Data Quality Issues**
- If only 1-2 comps exist, we might skip them
- Incomplete data (missing rent, address, etc.)
- Very recent listings without comparable data

### 3. **Geographic Factors**
- Rural areas have fewer rentals
- Very specific property types may lack comps
- Radius (5 miles) might be too small for some areas

### 4. **Fallback Chain**
Our app now has a fallback chain:
```
1. Try RentCast Rent Estimate comps
   ↓ (if empty or error)
2. Try RentCast Rental Listings endpoint
   ↓ (if empty or error)
3. Use Claude Web Search for STR/rental market data
   ↓ (if empty)
4. Claude estimates based on general market knowledge
```

---

## Data Source Priority (Updated)

| Priority | Source | Endpoint | Data Type |
|----------|--------|----------|-----------|
| 1 | RentCast Rent Estimate | `v1/avm/rent/long-term` | LTR rent + comps |
| 2 | RentCast Rental Listings | `v1/listings/rental/long-term` | Direct rental comps |
| 3 | Claude Web Search | `searchWebForSTRComps()` | STR market data |
| 4 | Claude Estimation | AI generated | Best guess |

---

## What You're Seeing Now

When you run analysis:

### Console Logs Should Show:
```
[RentCast] Rent Estimate Response: {
  rent: 1500,
  hasComps: 3
}
[Claude] ✅ Found 3 rental comps from Rent Estimate endpoint
[Claude] ✅ Using rental comps for market calibration
```

### In Ground Truth for Claude:
```
LONG-TERM RENTAL MARKET GROUND TRUTH:
- Estimated Monthly LTR Rent: $1500
- Rent Range: $1400 - $1600

LONG-TERM RENTAL COMPARABLES (FROM RENT ESTIMATE):
1. 4160 Hickory Rd (4bd/2.5ba): $1450/mo
2. 1144 7 Nations Dr (4bd/2.5ba): $1400/mo
3. 494 Country Place Dr (4bd/2.5ba): $1475/mo
```

---

## Important Distinction

### LTR vs STR Comps

**What RentCast has:**
- ✅ Long-Term Rental comps ($1,400-$1,600/month)
- ✅ Used for LTR scenarios and validation

**What RentCast doesn't have:**
- ❌ Short-Term Rental/Airbnb comps
- ✅ We get those from Claude web search

---

## Why This Matters

1. **More accurate LTR estimates** - We now use real comparable listings from RentCast
2. **Better calibration** - Claude can validate its estimates against real market data
3. **More realistic scenarios** - Pro-forma calculations are based on actual market rates
4. **Consistency** - When RentCast has comps, we use them automatically

---

## Testing the Fix

To verify the fix is working:

1. Run analysis for a property in an active rental market (like Tobyhanna, PA)
2. Open browser DevTools (F12) and check Console
3. Look for: `Found X rental comps from Rent Estimate endpoint`
4. If found, comps will be in the analysis output

---

## Next Steps

The app will now:
- ✅ Automatically extract comps from Rent Estimate
- ✅ Try direct Rental Listings endpoint as backup
- ✅ Fall back to web search for STR data
- ✅ Use comps to calibrate all rental estimates

No code changes needed on your end - just test with a new property analysis!
