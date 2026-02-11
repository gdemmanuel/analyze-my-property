# Quick Reference: RentCast API Endpoints

## ✅ Verified Correct Endpoints

```
Property Records:      GET https://api.rentcast.io/v1/properties?address=...
Property Value (AVM):  GET https://api.rentcast.io/v1/avm/value?address=...
Sale Listings:         GET https://api.rentcast.io/v1/listings/sale?address=...
Rent Estimate (LTR):   GET https://api.rentcast.io/v1/avm/rent/long-term?address=...
Rental Listings (LTR): GET https://api.rentcast.io/v1/listings/rental/long-term?address=...
Market Statistics:     GET https://api.rentcast.io/v1/markets?zipCode=...
```

## ❌ Non-Existent Endpoints (Removed)

```
❌ https://api.rentcast.io/v1/avm/rent/short-term (DOES NOT EXIST)
❌ https://api.rentcast.io/v1/listings/rental/short-term (DOES NOT EXIST)
```

## 🔄 Fallback for STR Data

Use Claude web search via `searchWebForSTRComps()` and `searchWebForSTRData()` for:
- Airbnb/VRBO market data
- STR ADR estimates
- STR occupancy rates
- Real comparable properties

---

See `RENTCAST_API_VERIFICATION.md` for full details.
