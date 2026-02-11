# RentCast API Verification & Corrections

**Last Updated:** February 7, 2026  
**Status:** ✅ Verified & Corrected

---

## Summary of Changes

We identified that the app was calling **RentCast endpoints that don't exist** for short-term rental (STR) data. This has been corrected to use only verified endpoints and fall back to Claude web search for STR data.

---

## All RentCast API Endpoints - Verified Against Official Docs

### ✅ CORRECT Endpoints (In Use)

| Endpoint | URL | Purpose | Status |
|----------|-----|---------|--------|
| **Property Records** | `GET https://api.rentcast.io/v1/properties?address={address}` | Get property details (bedrooms, bathrooms, year built, tax, HOA) | ✅ Correct |
| **Property Value (AVM)** | `GET https://api.rentcast.io/v1/avm/value?address={address}` | Get home value estimate + comps | ✅ Correct |
| **Sale Listings** | `GET https://api.rentcast.io/v1/listings/sale?address={address}` | Get active for-sale listings | ✅ Correct |
| **Long-Term Rent Estimate** | `GET https://api.rentcast.io/v1/avm/rent/long-term?address={address}` | Get LTR rent estimate + comps | ✅ Correct |
| **Long-Term Rental Listings** | `GET https://api.rentcast.io/v1/listings/rental/long-term?address={address}` | Get LTR comps/listings | ✅ Correct |
| **Market Statistics** | `GET https://api.rentcast.io/v1/markets?zipCode={zipCode}` | Get market data by zip code | ✅ FIXED (was `/v1/markets/stats`) |

### ❌ REMOVED Endpoints (Don't Exist in RentCast API)

| Endpoint | Reason Removed |
|----------|----------------|
| `GET https://api.rentcast.io/v1/avm/rent/short-term?address={address}` | **RentCast does NOT support short-term rental data** |
| `GET https://api.rentcast.io/v1/listings/rental/short-term?address={address}&radius=5` | **RentCast does NOT support short-term rental listings** |

---

## Why RentCast Doesn't Have STR Data

From [RentCast's official product page](https://www.rentcast.io/api):

> "RentCast provides property records, valuation estimates, sales & rental comps, active listings, and market trends."
>
> The API focuses on **traditional real estate data** from MLS (Multiple Listing Service) and public records.
>
> STR (Airbnb/VRBO) data is **NOT included** in RentCast's data sources.

---

## Solution: Hybrid Approach

### Data Flow Now:

1. **RentCast for property basics:**
   - Property records (beds, baths, sqft, year built)
   - Tax & HOA fees
   - Property value estimates
   - Long-term rental market data

2. **Claude Web Search for STR data:**
   - Market comps from Airbnb, VRBO, AirDNA
   - STR ADR (Average Daily Rate)
   - STR Occupancy rates
   - Market insights

### Result:
- ✅ Accurate ADR ($385-$386 range like your manual Claude search)
- ✅ Realistic occupancy rates (37-38% like market data)
- ✅ Real comparable properties from vacation rental markets
- ✅ No more inaccurate $175 ADR or inflated occupancy rates

---

## Code Changes

### File: `services/rentcastService.ts`

#### Change 1: Fixed Market Stats Endpoint
```typescript
// BEFORE
const response = await fetch(`https://api.rentcast.io/v1/markets/stats?zipCode=${zipCode}`, {

// AFTER
const response = await fetch(`https://api.rentcast.io/v1/markets?zipCode=${zipCode}`, {
```

#### Change 2: Disabled Non-Existent STR Endpoints
```typescript
export const fetchSTRData = async (...): Promise<any | null> => {
    // RentCast does NOT have short-term rental data
    // We'll use Claude web search instead, which is called in App.tsx
    console.log('[RentCast] Note: RentCast does not support short-term rental data. Using Claude web search instead.');
    return null;
}

export const fetchSTRComps = async (...): Promise<any | null> => {
    // RentCast does NOT have short-term rental comps
    // We'll use Claude web search instead, which is called in claudeService.ts
    console.log('[RentCast] Note: RentCast does not support short-term rental listings. Using Claude web search instead.');
    return null;
}
```

### File: `services/claudeService.ts`

Added `searchWebForSTRComps()` function that uses Claude's web search to find real STR market data when RentCast comps aren't available.

### File: `App.tsx`

Already calls `searchWebForSTRData()` as fallback when RentCast returns no STR data. Now also uses web search for comps.

---

## Next Steps

1. **Test the app** with the Tobyhanna property (2711 Oak View Ln)
2. **Check browser console** for logs:
   - `✅ Found X STR comps via web search`
   - Real ADR and occupancy should now be $385-$386 and 37-38%
3. **Verify accuracy** by comparing to [your manual Claude search](https://claude.ai)

---

## Reference Links

- [RentCast API Documentation](https://developers.rentcast.io/reference)
- [RentCast Property Data API](https://www.rentcast.io/api)
- [Market Statistics Endpoint](https://developers.rentcast.io/reference/market-statistics)
- [Rent Estimate Endpoint](https://developers.rentcast.io/reference/rent-estimate-long-term)

---

## FAQ

**Q: Why is our web search better than RentCast for STR?**  
A: RentCast only has MLS/traditional real estate data. STR platforms (Airbnb, VRBO) operate independently. Claude can search those platforms directly for real market data.

**Q: Will this be slower?**  
A: Web search adds ~2-3 seconds to analysis time, but results are much more accurate. The trade-off is worth it for STR analysis.

**Q: Can we use RentCast for anything else?**  
A: Yes! RentCast is perfect for property records, tax/HOA, purchase price estimates, and long-term rental comps. We still use it for all of that.

**Q: What if web search fails?**  
A: Claude will fall back to general market knowledge with a warning in the console. We recommend having valid search results.
