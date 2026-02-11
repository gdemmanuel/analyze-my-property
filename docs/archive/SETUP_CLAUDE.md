# Property Analyzer - Claude Migration Guide

## ✅ What Changed

Your Property Analyzer app has been successfully converted from Google Gemini to Anthropic Claude!

### Files Modified:
- ✅ `services/claudeService.ts` - New Claude service (replaces geminiService.ts)
- ✅ `components/PropertyChat.tsx` - Updated to use Claude chat
- ✅ `App.tsx` - Updated imports
- ✅ `package.json` - Updated dependencies

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```bash
npm install
```

This will install the new `@anthropic-ai/sdk` package.

---

### Step 2: Create `.env` File

In your project root (same folder as `package.json`), create a file named `.env`:

```env
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

**Replace `sk-ant-api03-your-key-here` with your actual API key from console.anthropic.com**

**IMPORTANT:** 
- ✅ Make sure `.env` is in your `.gitignore` (it already should be)
- ❌ NEVER commit your API key to GitHub
- ✅ The `VITE_` prefix is required for Vite to expose it to your app

---

### Step 3: Run Your App

```bash
npm run dev
```

Your app will be available at `http://localhost:5173` (or the port Vite assigns)

---

## 🎯 What Models Are Being Used

Your app now uses a **hybrid model approach** for optimal cost/quality balance:

### **🚀 Haiku (Fast & Cheap) - Simple Tasks:**
- Model: `claude-3-5-haiku-20241022`
- Cost: ~$0.0001-0.001 per request
- Uses:
  - Address autocomplete suggestions
  - Amenity impact estimates
  - Property chat responses

### **🧠 Sonnet 4 (Smart & Accurate) - Complex Analysis:**
- Model: `claude-sonnet-4-20250514`
- Cost: ~$0.01-0.05 per request
- Uses:
  - Property analysis & underwriting
  - Financial KPI calculations
  - Sensitivity analysis
  - Path to Yes evaluation
  - Amenity ROI analysis
  - Lender packet generation
  - Market discovery
  - Regulation scanning
  - Comp strength scoring

**Cost Savings**: ~40-50% reduction compared to all-Sonnet model while maintaining quality for critical analysis tasks.

---

## 🔧 Testing Your App

1. **Start the dev server:** `npm run dev`
2. **Enter a property address** (e.g., "123 Main St, Austin, TX")
3. **Click "Analyze Property"** - Claude will analyze it
4. **Try the chat feature** - Ask questions about the property
5. **Add amenities** - Test the amenity suggestion feature

---

## ⚠️ Important Notes

### Web Search Not Included
Your Gemini service used Google Search integration. Claude's API doesn't have built-in web search.

**Options to add web search:**
1. Use a separate search API (Brave, SerpAPI, etc.)
2. Use Claude's web search tool (requires additional setup)
3. Remove the "sources" feature (it's currently empty in the conversion)

### API Key Security
- The API key is exposed in the browser (it's client-side)
- For production, consider setting up a backend proxy to hide your key
- Set up usage limits in your Anthropic console to prevent unexpected charges

### Cost Management
- Monitor usage at console.anthropic.com
- Set up billing alerts
- Your current setup uses the best models for each task to balance cost/quality

---

## 📊 Cost Estimates (Rough)

**Light usage (testing):** ~$1-5/month
**Medium usage (active development):** ~$10-30/month
**Production (depends on traffic):** $50+/month

Set up billing alerts in your Anthropic console!

---

## 🐛 Troubleshooting

### "API key not found" error
- Check `.env` file exists in project root
- Verify it starts with `VITE_ANTHROPIC_API_KEY=`
- Restart dev server after creating `.env`

### "CORS error" or "Network error"
- Make sure you're using `dangerouslyAllowBrowser: true` (already set)
- This is needed for client-side API calls

### Chat not working
- Check browser console for errors
- Verify API key has correct permissions

---

## 🎉 You're Ready!

Run `npm install` → Create `.env` → `npm run dev` → Test your app!

Questions? Just ask me in the chat!
