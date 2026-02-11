# Data Source: MTR & LTR Estimates

## Where MTR (Mid-Term Rental) Data Comes From

**MTR is NOT sourced from any external API.** Instead:

1. **Claude generates MTR estimates** based on:
   - LTR rent estimate (from RentCast)
   - Property characteristics (beds, baths, location)
   - Market knowledge
   - General real estate analysis

2. **Formula Claude uses** (estimated):
   - MTR is typically 15-30% higher than LTR
   - Example: If LTR = $1,500/month, MTR might be $1,725-$1,950/month
   - Reason: 30-90 day furnished rentals command premium pricing

3. **Output field:** `suggestedMTRRent` (number)

---

## Where LTR (Long-Term Rental) Data Comes From

**LTR data flow:**

```
1. RentCast API (https://api.rentcast.io/v1/avm/rent/long-term?address=...)
                              ↓
2. Returns: { rent: $1500, rentRangeLow: $1400, rentRangeHigh: $1600 }
                              ↓
3. Extracted as `rentEstimate` in App.tsx
                              ↓
4. Passed to Claude via groundTruth:
   "LONG-TERM RENTAL MARKET GROUND TRUTH:
    - Estimated Monthly LTR Rent: $1,500
    - Rent Range: $1,400 - $1,600"
                              ↓
5. Claude uses this data to:
   - Validate/calibrate its own estimates
   - Calculate MTR (usually 15-30% premium)
   - Calculate NOI and cash flow
   - Output: `suggestedLTRRent`
```

---

## Data Sources Summary

| Data Type | Source | Endpoint | Reliability |
|-----------|--------|----------|-------------|
| **LTR Rent Estimate** | RentCast API | `v1/avm/rent/long-term` | ✅ Based on MLS data |
| **LTR Rent Range** | RentCast API | `v1/avm/rent/long-term` | ✅ Based on comparable listings |
| **MTR Estimate** | Claude AI | Generated | ⚠️ Estimated based on LTR + market analysis |
| **MTR Range** | Claude AI | Generated | ⚠️ Estimated |

---

## Why MTR & LTR Are Different

- **LTR (Long-Term)**: 12-month traditional lease
  - Lower pricing
  - Stable tenant
  - Less turnover cost
  - Example: $1,500/month

- **MTR (Mid-Term)**: 30-90 day furnished rental
  - Higher pricing (premium for flexibility)
  - More frequent turnover
  - Furnished required
  - Higher cleaning costs
  - Example: $1,800-$1,950/month (20-30% premium)

---

## How They're Used in App

1. **In Financial Analysis:**
   - LTR used for conservative scenarios
   - MTR used for mixed-use or short-medium term strategies
   - Both used in sensitivity analysis

2. **In Pro-Forma Calculations:**
   - Monthly revenue calculations
   - Annual income projections
   - NOI (Net Operating Income)
   - Cash flow analysis

3. **In Underwriting:**
   - Comparing investment strategies
   - Stress testing different market conditions
   - Risk assessment

---

## Could We Improve MTR?

**Yes, we could add an MTR API source:**

Option 1: **Furnished Rental APIs**
- Airbnb API (requires approval)
- VRBO/HomeAway API
- Furnishedrentals.com API

Option 2: **Market Data Services**
- AirDNA (premium, expensive)
- Zillow API (limited MTR data)
- LocalLogic API

Option 3: **Enhanced Claude Search**
- Search for furnished rental listings in area
- Extract market MTR rates
- Compare to LTR baselines

**Current approach:** Claude estimates based on LTR + market knowledge is reasonable for initial analysis, but real MTR data would be more accurate.

---

## Current Implementation

### Code Location
- **LTR Source:** `services/rentcastService.ts` → `fetchRentEstimate()`
- **LTR Usage:** `services/claudeService.ts` → `analyzeProperty()` (line 469-471)
- **MTR Generation:** Claude prompt (line 521) - Claude generates estimate
- **Output Fields:** `suggestedMTRRent`, `suggestedLTRRent` in JSON response

### Example Flow
```typescript
// App.tsx
const rentEst = await fetchRentEstimate(address); // From RentCast
// Returns: { rent: 1500, rentRangeLow: 1400, rentRangeHigh: 1600 }

// claudeService.ts
groundTruth += `\nLONG-TERM RENTAL MARKET GROUND TRUTH:\n- Estimated Monthly LTR Rent: $${rVal}\n`;
// Claude reads this and generates MTR estimate based on it
```

---

## Recommendation

For your STR-focused app, consider:

1. ✅ Keep LTR from RentCast (good baseline data)
2. ✅ Keep MTR estimation from Claude (reasonable for now)
3. 🔄 Consider adding **AirDNA MTR data** if budget allows (most accurate for furnished rentals)
4. 🔄 Or add **Claude web search for local furnished rental rates** (free alternative)

Currently, the system works well for relative comparisons. Real MTR market data would only matter if you're comparing multiple properties or if accuracy to within ±5% is critical.
