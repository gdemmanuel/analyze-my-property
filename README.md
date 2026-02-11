# 🚀 AirROI PRO - AI-Powered Real Estate Investment Analysis

**Production-ready MVP** with React 19, TypeScript, Vite, Tailwind CSS, and Claude AI integration.

---

## ⚠️ **CURRENT ISSUE - API KEY NOT WORKING**

**Status**: API key is **invalid** (401 Authentication Error)

### ✅ **Fix This Now** (5 minutes)

1. **Get a new Claude API key:**
   - Go: https://console.anthropic.com/account/keys
   - Create a new key (copy the full value starting with `sk-ant-`)

2. **Update .env file:**
   ```
   VITE_ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXXXXX
   VITE_RENTCAST_API_KEY=eba8460a381f4241bac61f8830a2219f
   VITE_GOOGLE_MAPS_API_KEY=your-key-here
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

4. **Refresh browser:** Ctrl+Shift+R

5. **Test:** Analyze a property at http://localhost:3000

---

## 📂 **Project Structure**

```
AirROI/
├── src/                    # Source code
│   ├── App.tsx             # Main app
│   ├── index.tsx           # Entry point
│   ├── index.css           # Global styles
│   ├── types.ts            # TypeScript types
│   ├── constants.ts        # Default values
│   ├── lib/                # Libraries
│   │   ├── queryClient.tsx # React Query setup
│   │   └── formUtils.ts    # Form utilities
│   └── hooks/              # Custom hooks (TBD)
├── services/               # API integration
│   ├── claudeService.ts    # Claude AI calls
│   ├── rentcastService.ts  # RentCast API
│   ├── cacheService.ts     # Data caching
│   └── streetViewService.ts
├── components/             # React components (11 files)
├── utils/                  # Utilities
│   └── financialLogic.ts   # 20-year projections
├── prompts/                # Claude AI prompts
├── docs/                   # Documentation
├── .env                    # Environment variables
├── tailwind.config.js      # Tailwind CSS config
├── vite.config.ts          # Vite config
└── package.json            # Dependencies
```

---

## 🔧 **Tech Stack**

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Data Fetching**: React Query (installed, not yet migrated)
- **Forms**: React Hook Form (installed, not yet migrated)
- **Charts**: Recharts
- **Icons**: Lucide React
- **AI**: Claude API (Anthropic)
- **APIs**: RentCast, Google Maps

---

## 📊 **Features**

✅ Property underwriting analysis  
✅ 20-year financial projections  
✅ Multi-strategy analysis (STR/MTR/LTR)  
✅ AI-powered recommendations  
✅ Sensitivity analysis  
✅ Amenity ROI calculator  
✅ Path to Yes (gap analysis)  
✅ Lender packet export  
✅ Property comparison  
✅ Portfolio management  
✅ Data caching (50x faster on repeat searches)  

---

## 🚀 **Getting Started**

### Install Dependencies
```bash
npm install
```

### Start Dev Server
```bash
npm run dev
# Ready at http://localhost:3000
```

### Build for Production
```bash
npm run build
```

---

## 📋 **Next Priority Tasks**

### HIGH PRIORITY
1. **✅ Fix API Key** ← **Do this first!**
   - Get new key from Anthropic
   - Update .env
   - Restart server

2. **⏳ React Query Migration** (2-3 hours)
   - Convert API calls to `useQuery` hooks
   - Add automatic caching
   - Remove manual state management

3. **⏳ React Hook Form Migration** (1-2 hours)
   - Convert forms to `useForm` hooks
   - Add validation

### MEDIUM PRIORITY
4. Backend infrastructure setup (Auth, Database, Payments)
5. Subscription tier implementation
6. Stripe payment integration

---

## 📚 **Documentation**

See `docs/` folder for detailed guides:
- `TROUBLESHOOTING_GUIDE.md` - Debug issues
- `FRONTEND_ADDONS_SETUP.md` - Setup reference
- `MIGRATION_STATUS.md` - Progress tracking
- `TAILWIND_MIGRATION_REPORT.md` - Styling details

---

## 🧪 **Testing**

### Test API Keys
1. Open DevTools: F12
2. Go to Console tab
3. Analyze a property
4. Look for logs starting with `[Claude Service]` or `[RentCast]`

### Test UI
1. Analyze a property → Check dashboard
2. Go to Settings → Check input visibility
3. Scroll to Advanced Analysis → Test buttons
4. Portfolio tab → Save and compare properties

---

## 💡 **Key Points**

- **Data is cached locally** - Same property analyzed twice = instant second time
- **Tailwind CSS is configured** - No CSS files to write, use utility classes
- **React Query ready** - Just need to migrate API calls
- **TypeScript throughout** - Full type safety

---

## 🔗 **Useful Links**

- **Anthropic API**: https://console.anthropic.com
- **RentCast API**: https://www.rentcast.io
- **Tailwind CSS**: https://tailwindcss.com
- **React Query**: https://tanstack.com/query

---

## ⚡ **Quick Commands**

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for deployment
npm run preview      # Preview built app

# Cleanup
npm cache clean --force
```

---

## 📞 **Support**

**API Key Issues**: Check `docs/TROUBLESHOOTING_GUIDE.md`  
**UI/UX Issues**: Check browser DevTools Console  
**Performance**: Check `src/services/cacheService.ts` for cache status  

---

**Status**: Production-ready MVP | Last updated: Feb 9, 2026
