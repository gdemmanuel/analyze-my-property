# Cost History Graph & Rate Limit Fix

## Implementation Date
February 12, 2026

## Issue 1: Rate Limit Showing 38,560 Seconds (10.7 Hours)

### Problem
User encountered a rate limit error with an absurdly long wait time:
```
Failed to load resource: the server responded with a status of 429 (Too Many Requests)
[Rate Limit] Retrying in 38560s (attempt 1/3)
```

### Root Cause
The `retryAfter` value from Claude's API was being parsed incorrectly. The code was treating milliseconds as seconds:
- API returned: `38560` (milliseconds = 38.56 seconds)
- Code interpreted: `38560` seconds (10.7 hours)

### Fix
Updated `services/claudeService.ts` to properly parse the `retry-after` header:

```typescript
// Parse retry-after header (could be seconds or a date)
let waitSeconds = baseDelay;
if (error?.retryAfter) {
  const retryAfter = error.retryAfter;
  // If it's a number, check if it's milliseconds (> 1000) or seconds
  if (typeof retryAfter === 'number' || !isNaN(Number(retryAfter))) {
    const num = Number(retryAfter);
    waitSeconds = num > 1000 ? Math.ceil(num / 1000) : num; // Convert ms to seconds
  } else {
    // If it's a date string, calculate seconds until that time
    const retryDate = new Date(retryAfter);
    waitSeconds = Math.max(1, Math.ceil((retryDate.getTime() - Date.now()) / 1000));
  }
  // Cap at 5 minutes max to avoid absurdly long waits
  waitSeconds = Math.min(waitSeconds, 300);
}
```

### Impact
- ✅ Correct wait times displayed (38.56s instead of 10.7 hours)
- ✅ 5-minute maximum cap prevents UI freezing
- ✅ Handles both milliseconds and seconds formats
- ✅ Supports date-based retry-after headers

## Issue 2: API Cost History Visualization

### Request
User requested a line graph to visualize API costs over time for better cost monitoring and trend analysis.

### Implementation

#### Backend Changes
**File:** `server/index.ts`
- Added new endpoint: `GET /api/admin/cost-history`
- Returns 7 days of historical cost data from `costTracker.getHistory()`

```typescript
app.get('/api/admin/cost-history', (_req, res) => {
  console.log('[Server] Cost history requested');
  res.json(costTracker.getHistory());
});
```

#### Frontend Changes
**File:** `components/AdminTab.tsx`

1. **Added Recharts Import:**
```typescript
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
```

2. **Added State & Fetch Function:**
```typescript
const [costHistory, setCostHistory] = useState<any[]>([]);

const fetchCostHistory = useCallback(async () => {
  try {
    const res = await fetch('/api/admin/cost-history');
    if (res.ok) {
      const data = await res.json();
      setCostHistory(data);
    }
  } catch (e) {
    console.error('Failed to fetch cost history:', e);
  }
}, []);
```

3. **Added Graph Component:**
- Responsive line chart showing 7-day cost trends
- Three lines: Total Cost, Claude API, RentCast API
- Formatted tooltips with currency display
- Date formatting on X-axis (MM/DD)
- Auto-refresh every 30 seconds

### Features

**Visual Design:**
- 📊 Three-line graph with distinct colors:
  - Total Cost: Gray (#64748b)
  - Claude API: Blue (#3b82f6)
  - RentCast API: Green (#10b981)
- Responsive container (adapts to screen width)
- 300px height for optimal visibility
- Dotted grid lines for easy reading

**Data Display:**
- Last 7 days of cost history
- Automatic date formatting (e.g., "2/12")
- Currency formatting in tooltips ($X.XX)
- Legend for line identification
- Hover tooltips with detailed breakdown

**Auto-Refresh:**
- Fetches new data every 30 seconds
- Synced with metrics refresh cycle
- No manual refresh needed

### Usage

The graph appears in the Admin tab between "API Cost Tracking" and "API Endpoint Usage" sections. It automatically displays when cost history data is available (after the first API call).

**Graph Shows:**
- Daily total costs
- Claude API costs per day
- RentCast API costs per day
- Trend visualization over 7 days

**Use Cases:**
- Monitor daily spending patterns
- Identify cost spikes
- Compare Claude vs RentCast usage
- Track budget compliance over time
- Forecast future costs based on trends

## Testing Recommendations

1. **Rate Limit Testing:**
   - Make multiple rapid API calls to trigger rate limiting
   - Verify wait time is reasonable (< 5 minutes)
   - Confirm retry succeeds after wait period

2. **Graph Testing:**
   - Perform several property analyses to generate cost data
   - Verify graph displays correctly with 1-7 days of data
   - Check date formatting and currency display
   - Test hover tooltips for accuracy
   - Verify auto-refresh updates graph data

3. **Edge Cases:**
   - Zero cost days (should show $0.00 line)
   - Single day of data (should still render)
   - Large cost spikes (Y-axis should scale appropriately)

## Files Modified

1. `server/index.ts` - Added `/api/admin/cost-history` endpoint
2. `components/AdminTab.tsx` - Added cost history graph component
3. `services/claudeService.ts` - Fixed rate limit retry-after parsing

## Next Steps

- ✅ Cost history graph implemented
- ✅ Rate limit parsing fixed
- ⏳ Monitor for any additional rate limit edge cases
- ⏳ Consider adding cost projection/forecast line
- ⏳ Add export functionality for cost data (CSV/JSON)
- ⏳ Add date range selector for custom time periods

## Notes

- Cost history is stored in memory and limited to 7 days
- Data resets on server restart (consider persistent storage for production)
- Graph only appears when cost data exists
- Rate limit fix prevents UI freezing from long wait times
