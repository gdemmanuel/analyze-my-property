import Anthropic from '@anthropic-ai/sdk';
import { MarketInsight, Amenity, PropertyConfig } from "../types";
import { RentCastProperty } from "./rentcastService";
import {
  PropertyFacts,
  PropertyAudit,
  UnderwriteInput,
  UnderwriteResult,
  SensitivityMatrix,
  AmenityROIInput,
  AmenityROIResult,
  RegulationReport,
  LenderPacket,
  PathToYes,
  MarketDiscoveryInput,
  MarketList,
  CompScore,
  AUDIT_PROMPT,
  UNDERWRITE_PROMPT,
  SENSITIVITY_PROMPT,
  AMENITY_ROI_PROMPT,
  REGULATION_SCANNER_PROMPT,
  PACKET_SUMMARY_PROMPT,
  PATH_TO_YES_PROMPT,
  MARKET_DISCOVERY_PROMPT,
  COMPS_STRENGTH_PROMPT
} from "../prompts/underwriting";

// ---------------------------------------------------------------------------
// API key must be set in .env as VITE_ANTHROPIC_API_KEY (get key from console.anthropic.com)
// ---------------------------------------------------------------------------
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

function getApiKey(): string {
  const key = ANTHROPIC_API_KEY?.trim();
  
  // Debug logging
  console.log('[Claude Service] API Key Status:', {
    hasKey: !!key,
    keyLength: key?.length || 0,
    keyPrefix: key?.substring(0, 10) || 'MISSING',
    fullKey: key // Log full key for debugging
  });
  
  if (!key || key === "sk-ant-api03-your-key-here" || key === "YOUR_ANTHROPIC_API_KEY_HERE") {
    throw new Error(
      "Claude API key is missing or not configured. Add VITE_ANTHROPIC_API_KEY to your .env file (get a key from console.anthropic.com). Restart the dev server after changing .env."
    );
  }
  if (!key.startsWith("sk-ant-")) {
    throw new Error(
      `Invalid Claude API key format. Keys should start with sk-ant-, but got: ${key.substring(0, 20)}... Check VITE_ANTHROPIC_API_KEY in .env and get a valid key from console.anthropic.com.`
    );
  }
  return key;
}

let _anthropic: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_anthropic) {
    const key = getApiKey();
    _anthropic = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
  }
  return _anthropic;
}

// ============================================================================
// MODEL SELECTION - HYBRID APPROACH
// ============================================================================
// Sonnet 4: Complex financial analysis requiring strong reasoning
// Haiku: Fast & cheap for conversational/simple tasks
type ModelType = 'complex_analysis' | 'simple_task';

function getModel(taskType: ModelType): string {
  if (taskType === 'complex_analysis') {
    return 'claude-sonnet-4-20250514'; // Complex underwriting, financial reasoning
  } else {
    return 'claude-3-5-haiku-20241022'; // Fast & cheap for chat, suggestions
  }
}

// ============================================================================
// RATE LIMIT HANDLING WITH AUTO-RETRY
// ============================================================================

// Global state for rate limit countdown (can be observed by UI components)
let rateLimitCountdown = 0;
let rateLimitCallbacks: ((seconds: number) => void)[] = [];

// Subscribe to rate limit countdown updates
export const onRateLimitCountdown = (callback: (seconds: number) => void) => {
  rateLimitCallbacks.push(callback);
  return () => {
    rateLimitCallbacks = rateLimitCallbacks.filter(cb => cb !== callback);
  };
};

// Get current countdown value
export const getRateLimitCountdown = () => rateLimitCountdown;

// Sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper for API calls with rate limit handling
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 90
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error (429 or overloaded)
      const isRateLimit =
        error?.status === 429 ||
        error?.error?.type === 'rate_limit_error' ||
        error?.message?.toLowerCase().includes('rate limit') ||
        error?.message?.toLowerCase().includes('overloaded') ||
        error?.message?.toLowerCase().includes('capacity');

      if (isRateLimit && attempt < maxRetries - 1) {
        // Calculate wait time (60 seconds default, or from retry-after header)
        const waitSeconds = error?.headers?.['retry-after']
          ? parseInt(error.headers['retry-after'])
          : baseDelay;

        console.log(`[Rate Limit] Retrying in ${waitSeconds}s (attempt ${attempt + 1}/${maxRetries})`);

        // Countdown timer
        for (let i = waitSeconds; i > 0; i--) {
          rateLimitCountdown = i;
          rateLimitCallbacks.forEach(cb => cb(i));
          await sleep(1000);
        }
        rateLimitCountdown = 0;
        rateLimitCallbacks.forEach(cb => cb(0));

        continue; // Retry
      }

      // Not a rate limit error or max retries reached
      throw error;
    }
  }

  throw lastError;
};

// Helper to parse JSON from Claude responses
const parseJSON = (text: string): any => {
  try {
    // Clean string from potential JSON-breaking characters
    const cleanText = text.trim();
    if (cleanText.startsWith('{')) return JSON.parse(cleanText);

    const match = cleanText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);

    return JSON.parse(cleanText);
  } catch (e) {
    const match = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    console.error("JSON Parsing failed for text:", text);
    throw e;
  }
};

export const getAddressSuggestions = async (input: string): Promise<string[]> => {
  if (input.length < 5) return [];
  try {
    const response = await getClient().messages.create({
      model: getModel('simple_task'),
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Provide a list of 5 real-world property address suggestions that match or are similar to: "${input}". 
Return ONLY a JSON array of strings. No other text. Example format: ["123 Main St, City, State", "456 Oak Ave, City, State"]`
      }]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') return [];

    return parseJSON(textContent.text);
  } catch (e) {
    console.error("Suggestion error:", e);
    throw e;
  }
};

export const suggestAmenityImpact = async (amenityName: string, location: string): Promise<Partial<Amenity>> => {
  try {
    const response = await getClient().messages.create({
      model: getModel('simple_task'),
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Estimate the impact of adding "${amenityName}" to a short-term rental in "${location}". 
Provide:
1. Estimated upfront COST in USD
2. Estimated Daily Rate (ADR) boost in USD
3. Estimated Occupancy % boost

Return ONLY a JSON object with these exact keys: cost, adrBoost, occBoost
Example: {"cost": 5000, "adrBoost": 20, "occBoost": 2}`
      }]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return { cost: 5000, adrBoost: 20, occBoost: 2 };
    }

    return parseJSON(textContent.text);
  } catch (e) {
    console.error("Amenity suggestion error:", e);
    return { cost: 5000, adrBoost: 20, occBoost: 2 };
  }
};

// Web search for STR market comps when RentCast doesn't have them
export const searchWebForSTRComps = async (address: string, bedrooms?: number, bathrooms?: number): Promise<any[] | null> => {
  try {
    console.log(`[Claude] Searching web for STR market comps: ${address}`);

    const response = await getClient().messages.create({
      model: getModel('complex_analysis'),
      max_tokens: 2048,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search"
        }
      ],
      messages: [{
        role: 'user',
        content: `Search the web for short-term rental comparable properties and market data for:

${address}${bedrooms ? `, ${bedrooms} bed` : ''}${bathrooms ? `, ${bathrooms} bath` : ''}

Find 3-5 comparable STR properties in the same city/market with their:
- Address or location
- Average Daily Rate (ADR)
- Occupancy Rate (%)
- Any other STR performance metrics

Search Airbnb listings, VRBO, AirDNA reports, Mashvisor, local STR market reports, or real estate websites with STR data.

Return ONLY a JSON array with this structure (no other text):
[
  {
    "address": "string",
    "adr": number (e.g., 150),
    "occupancy": number (percentage 0-100, e.g., 45),
    "distance": "nearby in same market"
  }
]

If you can find at least 3 comps, return the array. If you cannot find sufficient STR comp data, return: null`
      }]
    });

    let resultText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        resultText = block.text;
        break;
      }
    }

    if (!resultText) {
      console.log('[Claude] No text content in web search response');
      return null;
    }

    const rawText = resultText.trim();
    console.log('[Claude] Web comp search response:', rawText.substring(0, 200));

    // Handle "null" response
    if (rawText === 'null' || rawText.toLowerCase() === 'null') {
      console.log('[Claude] No STR comps found via web search');
      return null;
    }

    // Try to extract JSON
    let jsonText = rawText;
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const result = parseJSON(jsonText);

    if (Array.isArray(result) && result.length > 0) {
      console.log(`[Claude] ✅ Found ${result.length} STR comps via web search`);
      return result;
    }

    console.log('[Claude] No valid STR comps in web search response');
    return null;
  } catch (e: any) {
    console.error("❌ Web search for STR comps failed:", e.message || e);
    return null;
  }
};

// Web search for STR data when RentCast doesn't have it
export const searchWebForSTRData = async (address: string, bedrooms?: number, bathrooms?: number): Promise<{ adr: number; occupancy: number } | null> => {
  try {
    console.log(`[Claude] Searching web for STR data: ${address}`);

    const response = await getClient().messages.create({
      model: getModel('complex_analysis'),
      max_tokens: 2048,
      // ⭐ CRITICAL FIX: Enable web search tool
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search"
        }
      ],
      messages: [{
        role: 'user',
        content: `Search the web for short-term rental market data for properties in this area:

${address}${bedrooms ? `, ${bedrooms} bed` : ''}${bathrooms ? `, ${bathrooms} bath` : ''}

Find typical Average Daily Rate (ADR) and Annual Occupancy Rate for similar STR properties in this city/region.

Search Airbnb, Vrbo, AirDNA, Mashvisor, or any STR market reports for this area. If you can't find data for the exact address, use comparable properties in the same city/zip code.

After searching, return ONLY this exact JSON structure (no other text):
{"adr": <number>, "occupancy": <number>, "source": "<where you found it>"}

If absolutely no data exists for this entire region, return: null`
      }]
    });

    // Process the response - Claude may use web_search tool first, then provide text
    let resultText = '';

    for (const block of response.content) {
      if (block.type === 'text') {
        resultText = block.text;
        break;
      }
    }

    if (!resultText) {
      console.log('[Claude] No text content in response');
      return null;
    }

    const rawText = resultText.trim();
    console.log('[Claude] Raw response:', rawText.substring(0, 300));

    // Handle "null" response
    if (rawText === 'null' || rawText.toLowerCase() === 'null') {
      console.log('[Claude] No STR data available');
      return null;
    }

    // Try to extract JSON even if there's extra text
    let jsonText = rawText;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const result = parseJSON(jsonText);

    if (result && typeof result.adr === 'number' && typeof result.occupancy === 'number') {
      console.log(`[Claude] ✅ Found STR data - ADR: $${result.adr}, Occ: ${result.occupancy}%, Source: ${result.source || 'web'}`);
      const finalResult = { adr: result.adr, occupancy: result.occupancy };
      return finalResult;
    }

    console.log('[Claude] ❌ Invalid or missing STR data in response');
    return null;
  } catch (e: any) {
    console.error("❌ Web search for STR data failed:", e.message || e);
    return null;
  }
};

// Chat interface for property questions
export class PropertyChat {
  private conversationHistory: Anthropic.MessageParam[] = [];
  private systemPrompt: string;

  constructor(insight: MarketInsight, config: PropertyConfig) {
    this.systemPrompt = `You are a world-class real estate investment analyst. 
The user is currently evaluating a property with the following profile:
- Address: ${insight.summary}
- Acquisition Price: $${config.price.toLocaleString()}
- Physical Stats: ${insight.beds} beds, ${insight.baths} baths, ${insight.sqft} sqft
- Market Performance: ${insight.marketPerformance}
- Regulations: ${insight.regulations}
- Recommendation: ${insight.recommendation}
- Comps: ${JSON.stringify(insight.comps)}

FORMATTING RULES:
1. Use **Markdown** for all responses.
2. Use **bold** for all financial figures (e.g., **$12,500**).
3. Use bulleted lists for summarizing pros, cons, or risks.
4. Use short paragraphs. 
5. If providing a calculation, show the steps in a clear list.

Your goal is to answer questions about this specific deal's numbers, risks, and potential. 
Be data-driven, concise, and professional. 
Always reference the data provided if relevant.`;
  }

  async sendMessage(userMessage: string): Promise<string> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    try {
      const response = await getClient().messages.create({
        model: getModel('simple_task'),
        max_tokens: 4096,
        system: this.systemPrompt,
        messages: this.conversationHistory
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      const assistantMessage = textContent.text;

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage
      });

      return assistantMessage;
    } catch (e) {
      console.error("Chat error:", e);
      throw e;
    }
  }
}

export const startPropertyChat = (insight: MarketInsight, config: PropertyConfig): PropertyChat => {
  return new PropertyChat(insight, config);
};

export const analyzeProperty = async (query: string, factualData?: RentCastProperty | null, marketStats?: any, rentEstimate?: any, strData?: any, strComps?: any): Promise<MarketInsight> => {
  try {
    let groundTruth = factualData ? `
GROUND TRUTH SPECS (USE THESE EXACTLY):
- Address: ${factualData.formattedAddress}
- Bedrooms: ${factualData.bedrooms}
- Bathrooms: ${factualData.bathrooms}
- Square Footage: ${factualData.squareFootage}
- Year Built: ${factualData.yearBuilt}
- Last Sale Price: ${factualData.lastSalePrice ? `$${factualData.lastSalePrice}` : 'Unknown'}
- ACTUAL Property Tax: $${factualData.taxMonthly || 'Unknown'}/mo
- ACTUAL HOA Fee: $${factualData.hoaMonthly || 'Unknown'}/mo
` : '';

    if (rentEstimate) {
      const re = rentEstimate;
      const rVal = re.rent || re.price || re.estimatedRent;
      if (rVal) {
        groundTruth += `\nLONG-TERM RENTAL MARKET GROUND TRUTH:\n- Estimated Monthly LTR Rent: $${rVal}\n`;
        if (re.rentRangeLow) groundTruth += `- Rent Range: $${re.rentRangeLow} - $${re.rentRangeHigh}\n`;
      }
      
      // Also extract comparable properties from rent estimate if available
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
    }

    if (strData) {
      groundTruth += `\nRECENT STR COMPARABLES:\n- Estimated ADR (Average Daily Rate): $${strData.rent}\n- Estimated Occupancy Rate: ${Math.round(strData.occupancy * 100)}%\n- ADR Range: $${strData.rentRangeLow} - $${strData.rentRangeHigh}\n`;
    }

    if (strComps && strComps.length > 0) {
      groundTruth += `\nSALES COMPARABLES (MARKET VALUATION):\n`;
      strComps.slice(0, 3).forEach((comp: any, i: number) => {
        // Handle different field name variations from RentCast API
        const address = comp.formattedAddress || comp.address || 'N/A';
        const price = comp.price || comp.salePrice || 'N/A';
        const beds = comp.bedrooms || 'N/A';
        const baths = comp.bathrooms || 'N/A';
        const sqft = comp.squareFootage || 'N/A';
        groundTruth += `${i + 1}. ${address} (${beds}bd/${baths}ba, ${sqft}sqft): Sale Price $${price}\n`;
      });
      console.log('[Claude] ✅ Using RentCast sales comps for market valuation - this will calibrate pricing estimates');
    } else {
      console.warn('[Claude] ⚠️ No RentCast STR comps available - using general market knowledge (less accurate)');
      // Web search for STR comps doesn't return proper JSON, so we skip it to avoid rate limiting
    }

    if (marketStats) {
      const rm = marketStats.rentalMarket || (marketStats.averageRent ? marketStats : null);
      if (rm) {
        groundTruth += `\nLOCAL MARKET STATISTICS (ZIP ${factualData?.zipCode || 'N/A'}):\n- Avg Rent: $${rm.averageRent || 'N/A'}\n- Rent Range: $${rm.minRent || 'N/A'} - $${rm.maxRent || 'N/A'}\n- Total Listings: ${rm.totalListings || 'N/A'}\n`;
      }
    }

    // Add delay before making API call to avoid rate limiting
    // Increased to 5 seconds to ensure web search completes and rate limit resets
    // On cache hits, React Query will skip this entire function, so repeat searches stay instant
    await sleep(5000);

    const response = await withRetry(() => getClient().messages.create({
      model: getModel('complex_analysis'),
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Act as an expert real estate underwriter. Perform a multi-strategy audit for: ${query}. 
${groundTruth}

|1. MARKET PRICE: cross-examine internal records against current listing trends. If ground truth says a 'Last Sale Price' of $339k but the property looks like a $500k house, prioritize the $500k market value.
|2. STR: Data-driven ADR and Occupancy. If 'RECENT STR COMPARABLES' is provided in the ground truth section, MUST calibrate occupancy to match comp data. If comps show 38% avg occ, estimate within 30-48% range. NEVER exceed comp avg by 10%. Use comps PRIMARY REFERENCE.
|3. MTR: Monthly rent for 30-90 day furnished rentals.
4. LTR: Monthly rent for 12-month traditional leases.
5. OPERATING COSTS: Area-specific Property Tax (calculate as ~1.2% of purchase price if unknown), HOA, and Cleaning Fee estimates.
6. FURNISHINGS: Calculate a professional mid-range furnishing budget using EXACTLY this breakdown logic based on bedroom/bathroom count:
   - Per Bedroom (Bed/Linens): $3,500
   - Per Bathroom (Essentials): $1,000
   - Living Room (Sofa/TV/Tables): $4,500
   - Kitchen & Dining: $2,500
   - Tech/Cleaning/Decor: $1,500
   Sum these for the total suggestedFurnishingsCost.
7. COMPS: 3 real nearby property sale prices and estimated annual revenues.
8. SOURCES: Include 3-5 high-quality, real-world URLs or citations that ground this data (e.g., Zillow, Redfin, Census Bureau, Local Government STR Regulations, AirDNA).

DESCRIPTIVE SECTIONS (snapshot, regulations, breakEvenAnalysis, recommendation):
Provide AT LEAST 5 detailed facts for each section. IMPORTANT: Each fact MUST be on its own separate line.
CRITICAL FORMAT RULE: Every point must start with a descriptive, topic-specific header (e.g., "Registration Requirements", "Septic Limitations", "HVAC Efficiency") followed by a colon and the explanation. 
NEVER use generic placeholders like "Category Name", "Header", or "Bullet Point".
The header should be the specific subject of that fact.

Return ONLY a JSON object with this EXACT structure:
{
  "snapshot": "string",
  "regulations": "string",
  "marketPerformance": "string",
  "beds": "string",
  "baths": "string",
  "sqft": "string",
  "lotSize": "string",
  "yearBuilt": "string",
  "comps": [
    {
      "address": "string",
      "price": "string",
      "distance": "string",
      "annualRevenue": "string",
      "adr": "string",
      "occ": "string",
      "grossYield": "string"
    }
  ],
  "proFormaScenarios": [
    {
      "label": "string",
      "adr": number,
      "occ": number,
      "gross": number,
      "platformFee": number,
      "mgmtFee": number,
      "opex": number,
      "noi": number,
      "debtService": number,
      "cashFlow": number
    }
  ],
  "breakEvenAnalysis": "string",
  "recommendation": "string",
  "suggestedListingPrice": number,
  "suggestedMonthlyRevenue": number,
  "suggestedOccupancy": number,
  "suggestedADR": number,
  "suggestedPropertyTax": number,
  "suggestedCleaningFee": number,
  "suggestedFurnishingsCost": number,
  "suggestedHOA": number,
  "suggestedMTRRent": number,
  "suggestedLTRRent": number,
  "marketRiskLevel": "Low" | "Medium" | "High",
  "verdict": "string",
  "sources": [
    { "title": "string", "uri": "string" }
  ]
}`
      }]
    }));

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    const rawData = parseJSON(textContent.text);

    // Normalize occupancy to percentage if needed
    if (rawData.suggestedOccupancy !== undefined) {
      if (rawData.suggestedOccupancy > 0 && rawData.suggestedOccupancy <= 1) {
        rawData.suggestedOccupancy = Math.round(rawData.suggestedOccupancy * 100);
      } else {
        rawData.suggestedOccupancy = Math.round(rawData.suggestedOccupancy);
      }
    }

    // 🔧 NEW: Add data source tracking
    const dataSource = {
      adrSource: (strData && strData.rent) ? (strData.source === 'web_search' ? 'Web Search' : 'RentCast') as const : 'AI Estimate' as const,
      occupancySource: (strData && strData.occupancy) ? (strData.source === 'web_search' ? 'Web Search' : 'RentCast') as const : 'AI Estimate' as const,
      compsSource: (strComps && strComps.length > 0) ? 'RentCast' as const : 'AI Generated' as const,
      hasRentCastData: !!(strData && strData.source !== 'web_search') || !!(strComps)
    };
    
    console.log('[Claude] Data Source Summary:', {
      adr: dataSource.adrSource,
      occupancy: dataSource.occupancySource,
      comps: dataSource.compsSource,
      hasRentCastData: dataSource.hasRentCastData
    });

    const result: MarketInsight = {
      ...rawData,
      summary: rawData.recommendation,
      sources: rawData.sources || [],
      dataSource
    };
    
    return result;
  } catch (e) {
    console.error("Underwriting failed", e);
    throw e;
  }
};

// ============================================================================
// ADVANCED UNDERWRITING FUNCTIONS
// ============================================================================

/**
 * Run a comprehensive property & market audit
 */
export const runPropertyAudit = async (address: string, knownFacts?: PropertyFacts): Promise<PropertyAudit> => {
  try {
    console.log('[Claude] Running property audit for:', address);

    const response = await getClient().messages.create({
      model: getModel('complex_analysis'),
      max_tokens: 4096,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: 'user', content: AUDIT_PROMPT(address, knownFacts) }]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return parseJSON(textContent.text);
  } catch (e) {
    console.error("Property audit failed:", e);
    throw e;
  }
};

/**
 * Run full underwriting analysis with HELOC-first capital strategy
 */
export const runUnderwriteAnalysis = async (input: UnderwriteInput): Promise<UnderwriteResult> => {
  try {
    console.log('[Claude] Running underwrite analysis:', input.strategy);

    const response = await getClient().messages.create({
      model: getModel('complex_analysis'),
      max_tokens: 8192,
      messages: [{ role: 'user', content: UNDERWRITE_PROMPT(input) }]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return parseJSON(textContent.text);
  } catch (e) {
    console.error("Underwrite analysis failed:", e);
    throw e;
  }
};

/**
 * Run sensitivity analysis for ADR, Occupancy, and Rate variations
 */
export const runSensitivityAnalysis = async (baseKPIs: {
  adr: number;
  occupancy: number;
  rate: number;
  ownerSurplus: number;
  cashOnCash: number;
  dscr: number;
}): Promise<SensitivityMatrix> => {
  try {
    console.log('[Claude] Running sensitivity analysis');

    const response = await getClient().messages.create({
      model: getModel('complex_analysis'),
      max_tokens: 4096,
      messages: [{ role: 'user', content: SENSITIVITY_PROMPT(baseKPIs) }]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return parseJSON(textContent.text);
  } catch (e) {
    console.error("Sensitivity analysis failed:", e);
    throw e;
  }
};

/**
 * Calculate amenity ROI with diminishing returns
 */
export const runAmenityROI = async (input: AmenityROIInput): Promise<AmenityROIResult> => {
  try {
    console.log('[Claude] Running amenity ROI analysis');

    const response = await getClient().messages.create({
      model: getModel('complex_analysis'),
      max_tokens: 4096,
      messages: [{ role: 'user', content: AMENITY_ROI_PROMPT(input) }]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return parseJSON(textContent.text);
  } catch (e) {
    console.error("Amenity ROI analysis failed:", e);
    throw e;
  }
};

/**
 * Scan web for STR regulations in a city
 */
export const scanRegulations = async (city: string): Promise<RegulationReport> => {
  try {
    console.log('[Claude] Scanning regulations for:', city);

    const response = await getClient().messages.create({
      model: getModel('complex_analysis'),
      max_tokens: 4096,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: 'user', content: REGULATION_SCANNER_PROMPT(city) }]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return parseJSON(textContent.text);
  } catch (e) {
    console.error("Regulation scan failed:", e);
    throw e;
  }
};

/**
 * Generate a professional lender packet summary
 */
export const generateLenderPacket = async (analysis: {
  address: string;
  strategy: string;
  kpis: { noi: number; dscr: number; capRate: number; cashOnCash: number };
  ownerSurplus: number;
  assumptions: Record<string, any>;
  amenities: { name: string; cost: number; paybackMonths: number }[];
  risks: string[];
  sources: { title: string; url: string }[];
}): Promise<LenderPacket> => {
  try {
    console.log('[Claude] Generating lender packet for:', analysis.address);

    const response = await getClient().messages.create({
      model: getModel('complex_analysis'),
      max_tokens: 4096,
      messages: [{ role: 'user', content: PACKET_SUMMARY_PROMPT(analysis) }]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return parseJSON(textContent.text);
  } catch (e) {
    console.error("Lender packet generation failed:", e);
    throw e;
  }
};

/**
 * Calculate the minimal changes needed to reach Buy decision
 */
export const calculatePathToYes = async (current: {
  kpis: { capRate: number; cashOnCash: number; dscr: number; ownerSurplus: number };
  targets: { minCapRate: number; minCoC: number; minDSCR: number };
  assumptions: Record<string, any>;
  cashInvested?: number;
}): Promise<PathToYes> => {
  try {
    console.log('[Claude] Calculating path to yes');

    const response = await getClient().messages.create({
      model: getModel('complex_analysis'),
      max_tokens: 4096,
      messages: [{ role: 'user', content: PATH_TO_YES_PROMPT(current) }]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return parseJSON(textContent.text);
  } catch (e) {
    console.error("Path to yes calculation failed:", e);
    throw e;
  }
};

/**
 * Discover markets based on budget and target CoC
 */
export const discoverMarkets = async (input: MarketDiscoveryInput): Promise<MarketList> => {
  try {
    console.log('[Claude] Discovering markets for budget:', input.budget);

    const response = await getClient().messages.create({
      model: getModel('complex_analysis'),
      max_tokens: 4096,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: 'user', content: MARKET_DISCOVERY_PROMPT(input) }]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return parseJSON(textContent.text);
  } catch (e) {
    console.error("Market discovery failed:", e);
    throw e;
  }
};

/**
 * Score the strength of a comp set
 */
export const scoreCompStrength = async (
  comps: { address: string; beds: number; baths: number; sqft: number; adr: number; occupancy: number; distance: number; daysOnMarket?: number }[],
  subject: { beds: number; baths: number; sqft: number; amenities: string[] }
): Promise<CompScore> => {
  try {
    console.log('[Claude] Scoring comp strength');

    const response = await getClient().messages.create({
      model: getModel('complex_analysis'),
      max_tokens: 2048,
      messages: [{ role: 'user', content: COMPS_STRENGTH_PROMPT(comps, subject) }]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return parseJSON(textContent.text);
  } catch (e) {
    console.error("Comp strength scoring failed:", e);
    throw e;
  }
};
