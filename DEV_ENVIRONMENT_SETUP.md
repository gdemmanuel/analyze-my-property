# Running the Development Environment

## Quick Start

To run both the frontend and backend during development, use:

```bash
npm run dev:full
```

This will automatically start:
- **Backend Server**: http://localhost:3002
  - Handles all `/api/*` endpoints
  - Claude proxy, RentCast proxy, admin endpoints
  
- **Frontend (Vite)**: http://localhost:3000
  - React development server with hot reload

## Alternative: Manual Start (Two Terminals)

**Terminal 1 - Backend:**
```bash
npm run server
```
Starts Express server on http://localhost:3002

**Terminal 2 - Frontend:**
```bash
npm run dev
```
Starts Vite on http://localhost:3000

## What Happens with Each Setup

### ✅ `npm run dev:full` (Recommended)
- Both servers run concurrently
- Frontend can reach `/api/*` endpoints
- Admin tab shows costs, pricing, rate limits
- Everything works as expected

### ❌ `npm run dev` alone
- Only Vite frontend runs (port 3000)
- No backend server running
- `/api/*` calls return 404
- Admin cost data won't load

## Port Information

- **Frontend**: 3000 (Vite dev server)
- **Backend**: 3002 (Express API server)
- The backend on 3002 serves the production build via `express.static(distPath)`

## Troubleshooting API Endpoints

If you see 404 errors for `/api/admin/costs` or other endpoints:

1. **Check if server is running**: You should see two logs:
   ```
   ✅ AirROI API Server running on http://localhost:3002
   ✨ Vite dev server listening on http://localhost:3000
   ```

2. **If only one log appears**: You're not running `dev:full`. Stop and run:
   ```bash
   npm run dev:full
   ```

3. **If still failing**: Kill all Node processes and restart:
   ```bash
   npm run dev:full
   ```

## Production

For production, the app runs as a single Express server:
```bash
npm run build    # Build frontend
npm run server   # Start server (serves frontend + API)
```

Then visit http://localhost:3002
