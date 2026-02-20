import { jsonrepair } from "jsonrepair";
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
  COMPS_STRENGTH_PROMPT,
  AMENITY_PRICING_PROMPT,
  CUSTOM_AMENITY_PRICING_PROMPT
} from "../prompts/underwriting";

// ============================================================================
// MODEL SELECTION - HYBRID APPROACH
// ============================================================================
// Sonnet 4.6: Latest model with improved agentic search and reasoning
// Haiku 4.5: Fast & cost-effective for simple tasks
type ModelType = 'complex_analysis' | 'simple_task' | 'premium_analysis';

function getModel(taskType: ModelType): string {
  if (taskType === 'premium_analysis') {
    return 'claude-sonnet-4-6';
  } else if (taskType === 'complex_analysis') {
    return 'claude-sonnet-4-6';
  } else {
    return 'claude-haiku-4-5-20251001';
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
        error?.type === 'rate_limit_error' ||
        error?.message?.toLowerCase().includes('rate limit') ||
        error?.message?.toLowerCase().includes('overloaded') ||
        error?.message?.toLowerCase().includes('capacity');

      if (isRateLimit && attempt < maxRetries - 1) {
        // Parse retry-after header (could be seconds or a date)
        let waitSeconds = baseDelay;
        if (error?.retryAfter) {
          const retryAfter = error.retryAfter;
          // If it's a number, check if it's milliseconds (> 1000) or seconds
          if (typeof retryAfter === 'number' || !isNaN(Number(retryAfter))) {
            const num = Number(retryAfter);
            waitSeconds = num > 1000 ? Math.ceil(num / 1000) : num; // Convert ms to seconds if needed
          } else {
            // If it's a date string, calculate seconds until that time
            const retryDate = new Date(retryAfter);
            waitSeconds = Math.max(1, Math.ceil((retryDate.getTime() - Date.now()) / 1000));
          }
          // Cap at 5 minutes max to avoid absurdly long waits
          waitSeconds = Math.min(waitSeconds, 300);
        }

        if (import.meta.env.DEV) console.log(`[Rate Limit] Retrying in ${waitSeconds}s (attempt ${attempt + 1}/${maxRetries})`);

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

// ============================================================================
// PROXY HELPERS — all Claude calls go through /api/claude/*
// ============================================================================

/**
 * Send a message to Claude via the backend proxy server.
 * Replaces direct Anthropic SDK calls — API key is never in the browser.
 */
async function claudeProxy(params: {
  model: string;
  max_tokens: number;
  messages: { role: string; content: string }[];
  tools?: any[];
  system?: string;
}, endpoint: string = '/api/claude/messages'): Promise<{ type: string; text: string }[]> {
  // Get auth token from Supabase session
  const { supabase } = await import('../src/lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  
  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    const error: any = new Error(err.error || `Server error ${res.status}`);
    error.status = res.status;
    error.type = err.type;
    error.retryAfter = err.retryAfter;
    throw error;
  }

  const data = await res.json();
  return data.content;
}

/** Extract first text block from Claude response content array */
function extractText(content: { type: string; text: string }[]): string {
  // Find ALL text blocks - with tool use, Claude returns multiple text blocks:
  // block 1: "I'll search..." (preamble), block 2: actual analysis with ADR data
  const textBlocks = content.filter((c: any) => c.type === 'text');
  if (textBlocks.length === 0) {
    throw new Error('No text response from Claude');
  }
  // Join all text blocks so we capture the final analysis after tool results
  return textBlocks.map((b: any) => b.text).join('\n');
}

// Helper to parse JSON from Claude responses (handles markdown wrappers and truncated/malformed JSON)
const parseJSON = (text: string): any => {
  const extractCandidates = (raw: string): string[] => {
    const trimmed = raw.trim();
    const candidates: string[] = [];
    const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) candidates.push(codeBlock[1].trim());
    const braceMatch = trimmed.match(/\{[\s\S]*\}/);
    if (braceMatch) candidates.push(braceMatch[0]);
    if (trimmed.startsWith('{')) candidates.push(trimmed);
    return candidates;
  };

  const tryParse = (str: string): any => {
    try {
      return JSON.parse(str);
    } catch {
      return undefined;
    }
  };

  for (const candidate of extractCandidates(text)) {
    const parsed = tryParse(candidate);
    if (parsed !== undefined) return parsed;
  }

  for (const candidate of extractCandidates(text)) {
    try {
      return JSON.parse(jsonrepair(candidate));
    } catch {
      continue;
    }
  }
  try {
    return JSON.parse(jsonrepair(text.trim()));
  } catch (e) {
    console.error("JSON Parsing failed for text:", text?.slice?.(0, 500) + (text?.length > 500 ? '…' : ''));
    throw e;
  }
};

// ============================================================================
// PUBLIC API FUNCTIONS (unchanged signatures, now use proxy internally)
// ============================================================================

export const getAddressSuggestions = async (input: string): Promise<string[]> => {
  if (input.length < 5) return [];
  try {
    const content = await claudeProxy({
      model: getModel('simple_task'),
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Provide a list of 5 real-world property address suggestions that match or are similar to: "${input}". 
Return ONLY a JSON array of strings. No other text. Example format: ["123 Main St, City, State", "456 Oak Ave, City, State"]`
      }]
    });
    return parseJSON(extractText(content));
  } catch (e) {
    console.error("Suggestion error:", e);
    throw e;
  }
};

export const suggestAmenityImpact = async (amenityName: string, location: string): Promise<Partial<Amenity>> => {
  try {
    const content = await claudeProxy({
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
    return parseJSON(extractText(content));
  } catch (e) {
    console.error("Amenity suggestion error:", e);
    return { cost: 5000, adrBoost: 20, occBoost: 2 };
  }
};

// Web search for STR market comps when RentCast doesn't have them
export const searchWebForSTRComps = async (address: string, bedrooms?: number, bathrooms?: number): Promise<any[] | null> => {
  try {
    if (import.meta.env.DEV) console.log(`[Claude] Searching web for STR market comps: ${address}`);

    const content = await claudeProxy({
      model: getModel('complex_analysis'),
      max_tokens: 2048,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
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

    const resultText = extractText(content);
    const rawText = resultText.trim();
    if (import.meta.env.DEV) console.log('[Claude] Web comp search response:', rawText.substring(0, 200));

    if (rawText === 'null' || rawText.toLowerCase() === 'null') {
      if (import.meta.env.DEV) console.log('[Claude] No STR comps found via web search');
      return null;
    }

    let jsonText = rawText;
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const result = parseJSON(jsonText);

    if (Array.isArray(result) && result.length > 0) {
      if (import.meta.env.DEV) console.log(`[Claude] ✅ Found ${result.length} STR comps via web search`);
      return result;
    }

    if (import.meta.env.DEV) console.log('[Claude] No valid STR comps in web search response');
    return null;
  } catch (e: any) {
    console.error("❌ Web search for STR comps failed:", e.message || e);
    return null;
  }
};

// Web search for STR data when RentCast doesn't have it
export const searchWebForSTRData = async (address: string, bedrooms?: number, bathrooms?: number): Promise<{ adr: number; occupancy: number } | null> => {
  try {
    console.log(`[AirROI STR] Searching web for: ${address}`);

    const content = await claudeProxy({
      model: getModel('complex_analysis'),
      max_tokens: 4096,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{
        role: 'user',
        content: `Search the web for short-term rental (Airbnb/Vrbo) market data for this property: ${address}${bedrooms ? `, ${bedrooms} bedrooms` : ''}${bathrooms ? `, ${bathrooms} bathrooms` : ''}

Find the Average Daily Rate (ADR) - the nightly rate guests pay on Airbnb/VRBO - and the typical annual occupancy rate for this area.

After searching, extract and return the data in this exact JSON format on the LAST line of your response:
{"adr": <average_nightly_rate>, "occupancy": <annual_occupancy_percentage>}

For example, if you find ADR of $350/night and 38% occupancy, return:
{"adr": 350, "occupancy": 38}`
      }]
    });

    const resultText = extractText(content);
    const rawText = resultText.trim();
    const last500 = rawText.slice(-500);
    console.log('[AirROI STR] Response last 500 chars:', last500);

    // Pattern 1: Look for JSON with adr and occupancy keys anywhere in response
    const jsonMatches = rawText.match(/\{[^{}]*"adr"\s*:\s*\d+[^{}]*"occupancy"\s*:\s*\d+[^{}]*\}/g) ||
                        rawText.match(/\{[^{}]*"occupancy"\s*:\s*\d+[^{}]*"adr"\s*:\s*\d+[^{}]*\}/g);
    
    if (jsonMatches && jsonMatches.length > 0) {
      const jsonText = jsonMatches[jsonMatches.length - 1];
      console.log('[AirROI STR] Found JSON:', jsonText);
      const result = parseJSON(jsonText);
      if (result && typeof result.adr === 'number' && typeof result.occupancy === 'number') {
        if (result.adr >= 50 && result.adr <= 1500 && result.occupancy > 0 && result.occupancy <= 100) {
          console.log(`[AirROI STR] ✅ Parsed JSON - ADR: $${result.adr}, Occ: ${result.occupancy}%`);
          return { adr: result.adr, occupancy: result.occupancy };
        }
      }
    }
    
    // Pattern 2: Extract numbers directly from text - wider range for ADR (up to 4 digits)
    const adrMatch = rawText.match(/(?:ADR|average daily rate|nightly rate)[:\s]*\$?(\d{2,4})/i) ||
                     rawText.match(/\$(\d{2,4})(?:\s*[-–]\s*\$?\d+)?\s*(?:\/night|per night|nightly)/i) ||
                     rawText.match(/(?:Average Daily Rate)[^\d]*\$?(\d{2,4})/i);
    const occMatch = rawText.match(/(?:occupancy|occ)[:\s]*(\d{1,2})(?:\s*%|\s*percent)/i) ||
                     rawText.match(/(\d{1,2})\s*%\s*(?:occupancy|occ)/i);
    
    console.log('[AirROI STR] Text extraction - adrMatch:', adrMatch?.[1], 'occMatch:', occMatch?.[1]);
    
    if (adrMatch && occMatch) {
      const adr = parseInt(adrMatch[1]);
      const occ = parseInt(occMatch[1]);
      if (adr >= 50 && adr <= 1500 && occ > 0 && occ <= 100) {
        console.log(`[AirROI STR] ✅ Extracted from text - ADR: $${adr}, Occ: ${occ}%`);
        return { adr, occupancy: occ };
      }
    }

    console.log('[AirROI STR] ⚠️ Could not extract STR data, returning null');
    return null;
  } catch (e: any) {
    console.error('[AirROI STR] ❌ Failed:', e.message || e);
    return null;
  }
};

// Chat interface for property questions
export class PropertyChat {
  private conversationHistory: { role: string; content: string }[] = [];
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
    this.conversationHistory.push({ role: 'user', content: userMessage });

    try {
      const content = await claudeProxy({
        model: getModel('simple_task'),
        max_tokens: 4096,
        system: this.systemPrompt,
        messages: this.conversationHistory,
      });

      const assistantMessage = extractText(content);
      this.conversationHistory.push({ role: 'assistant', content: assistantMessage });
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
${factualData.avmValueRange ? `- AVM Value Range: $${factualData.avmValueRange.low} - $${factualData.avmValueRange.high} (85% confidence)` : ''}
${factualData.county ? `- County: ${factualData.county}` : ''}
${factualData.zoning ? `- Zoning: ${factualData.zoning}` : ''}
${factualData.ownerOccupied !== undefined ? `- Owner Occupied: ${factualData.ownerOccupied ? 'Yes' : 'No'}` : ''}
` : '';

    // Add property features to ground truth (Tier 1C)
    if (factualData?.features) {
      const f = factualData.features;
      const featureList: string[] = [];
      if (f.pool) featureList.push(`Pool (${f.poolType || 'Yes'})`);
      if (f.garage) featureList.push(`Garage (${f.garageSpaces || '?'} spaces, ${f.garageType || 'Unknown type'})`);
      if (f.fireplace) featureList.push(`Fireplace (${f.fireplaceType || 'Yes'})`);
      if (f.coolingType) featureList.push(`Cooling: ${f.coolingType}`);
      if (f.heatingType) featureList.push(`Heating: ${f.heatingType}`);
      if (f.architectureType) featureList.push(`Architecture: ${f.architectureType}`);
      if (f.floorCount) featureList.push(`${f.floorCount} Floors`);
      if (f.viewType) featureList.push(`View: ${f.viewType}`);
      if (featureList.length > 0) {
        groundTruth += `\nPROPERTY FEATURES: ${featureList.join(', ')}\n`;
      }
    }

    // Add sale history to ground truth (Tier 1D)
    if (factualData?.saleHistory && factualData.saleHistory.length > 0) {
      groundTruth += `\nSALE TRANSACTION HISTORY:\n`;
      factualData.saleHistory.slice(0, 5).forEach((sale, i) => {
        const saleDate = new Date(sale.date).toLocaleDateString();
        groundTruth += `${i + 1}. ${saleDate}: $${sale.price.toLocaleString()}\n`;
      });
    }

    // Add listing details to ground truth (Tier 1E)
    if (factualData?.listingDetails) {
      const ld = factualData.listingDetails;
      if (ld.daysOnMarket || ld.listingType) {
        groundTruth += `\nLISTING DETAILS:\n`;
        if (ld.listingType) groundTruth += `- Listing Type: ${ld.listingType}\n`;
        if (ld.daysOnMarket) groundTruth += `- Days on Market: ${ld.daysOnMarket}\n`;
        if (ld.listedDate) groundTruth += `- Listed: ${new Date(ld.listedDate).toLocaleDateString()}\n`;
        if (ld.priceHistory && ld.priceHistory.length > 1) {
          groundTruth += `- Price Changes: ${ld.priceHistory.length} price points recorded\n`;
        }
      }
    }

    // Add AVM sale comparables to ground truth (Tier 1B)
    if (factualData?.avmComparables && factualData.avmComparables.length > 0) {
      groundTruth += `\nAVM SALE COMPARABLES (with correlation scores):\n`;
      factualData.avmComparables.slice(0, 5).forEach((comp, i) => {
        groundTruth += `${i + 1}. ${comp.formattedAddress} (${comp.bedrooms || '?'}bd/${comp.bathrooms || '?'}ba, ${comp.squareFootage || '?'}sqft): $${comp.price?.toLocaleString() || 'N/A'}`;
        if (comp.correlation) groundTruth += ` [${(comp.correlation * 100).toFixed(0)}% match]`;
        if (comp.daysOnMarket) groundTruth += ` [${comp.daysOnMarket} DOM]`;
        if (comp.listingType && comp.listingType !== 'Standard') groundTruth += ` [${comp.listingType}]`;
        groundTruth += `\n`;
      });
    }

    if (rentEstimate) {
      const re = rentEstimate;
      const rVal = re.rent || re.price || re.estimatedRent;
      if (rVal) {
        groundTruth += `\nLONG-TERM RENTAL MARKET GROUND TRUTH:\n- Estimated Monthly LTR Rent: $${rVal}\n`;
        if (re.rentRangeLow) groundTruth += `- Rent Range: $${re.rentRangeLow} - $${re.rentRangeHigh}\n`;
      }
      
      if (re.comparableProperties && Array.isArray(re.comparableProperties) && re.comparableProperties.length > 0) {
        groundTruth += `\nLONG-TERM RENTAL COMPARABLES (FROM RENT ESTIMATE):\n`;
        re.comparableProperties.slice(0, 3).forEach((comp: any, i: number) => {
          const addr = comp.formattedAddress || comp.address || 'N/A';
          const rent = comp.rent || comp.listedPrice || 'N/A';
          const beds = comp.bedrooms || 'N/A';
          const baths = comp.bathrooms || 'N/A';
          const corr = comp.correlation ? ` [${(comp.correlation * 100).toFixed(0)}% match]` : '';
          groundTruth += `${i + 1}. ${addr} (${beds}bd/${baths}ba): $${rent}/mo${corr}\n`;
        });
      }
    }

    if (strData) {
      groundTruth += `\nRECENT STR COMPARABLES:\n- Estimated ADR (Average Daily Rate): $${strData.rent}\n- Estimated Occupancy Rate: ${Math.round(strData.occupancy * 100)}%\n- ADR Range: $${strData.rentRangeLow} - $${strData.rentRangeHigh}\n`;
    }

    if (strComps && strComps.length > 0) {
      groundTruth += `\nSALES COMPARABLES (MARKET VALUATION):\n`;
      strComps.slice(0, 3).forEach((comp: any, i: number) => {
        const address = comp.formattedAddress || comp.address || 'N/A';
        const price = comp.price || comp.salePrice || 'N/A';
        const beds = comp.bedrooms || 'N/A';
        const baths = comp.bathrooms || 'N/A';
        const sqft = comp.squareFootage || 'N/A';
        groundTruth += `${i + 1}. ${address} (${beds}bd/${baths}ba, ${sqft}sqft): Sale Price $${price}\n`;
      });
    }

    if (marketStats) {
      // Support both old and new field names
      const rd = marketStats.rentalData;
      const sd = marketStats.saleData;
      const rm = rd || marketStats.rentalMarket || (marketStats.averageRent ? marketStats : null);
      if (rm) {
        groundTruth += `\nLOCAL RENTAL MARKET STATISTICS (ZIP ${factualData?.zipCode || 'N/A'}):\n`;
        groundTruth += `- Avg Rent: $${rm.averageRent || 'N/A'}\n`;
        if (rm.medianRent) groundTruth += `- Median Rent: $${rm.medianRent}\n`;
        groundTruth += `- Rent Range: $${rm.minRent || 'N/A'} - $${rm.maxRent || 'N/A'}\n`;
        groundTruth += `- Total Rental Listings: ${rm.totalListings || 'N/A'}\n`;
        if (rm.averageDaysOnMarket) groundTruth += `- Avg Days on Market (Rental): ${rm.averageDaysOnMarket}\n`;
      }
      if (sd) {
        groundTruth += `\nLOCAL SALE MARKET STATISTICS (ZIP ${factualData?.zipCode || 'N/A'}):\n`;
        if (sd.medianPrice) groundTruth += `- Median Sale Price: $${sd.medianPrice.toLocaleString()}\n`;
        if (sd.averagePrice) groundTruth += `- Avg Sale Price: $${sd.averagePrice.toLocaleString()}\n`;
        if (sd.averageDaysOnMarket) groundTruth += `- Avg Days on Market (Sale): ${sd.averageDaysOnMarket}\n`;
        if (sd.totalListings) groundTruth += `- Total Sale Listings: ${sd.totalListings}\n`;
        if (sd.medianPricePerSquareFoot) groundTruth += `- Median Price/SqFt: $${sd.medianPricePerSquareFoot}\n`;
      }
    }

    const content = await withRetry(() => claudeProxy({
      model: getModel('complex_analysis'),
      max_tokens: 8192,
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
    }, '/api/claude/analysis'));

    const rawData = parseJSON(extractText(content));

    // Normalize occupancy to percentage if needed
    if (rawData.suggestedOccupancy !== undefined) {
      if (rawData.suggestedOccupancy > 0 && rawData.suggestedOccupancy <= 1) {
        rawData.suggestedOccupancy = Math.round(rawData.suggestedOccupancy * 100);
      } else {
        rawData.suggestedOccupancy = Math.round(rawData.suggestedOccupancy);
      }
    }

    // Track data sources
    const adrSrc: 'RentCast' | 'Web Search' | 'AI Estimate' = (strData && strData.rent) ? (strData.source === 'web_search' ? 'Web Search' : 'RentCast') : 'AI Estimate';
    const occSrc: 'RentCast' | 'Web Search' | 'AI Estimate' = (strData && strData.occupancy) ? (strData.source === 'web_search' ? 'Web Search' : 'RentCast') : 'AI Estimate';
    const compsSrc: 'RentCast' | 'AI Generated' = (strComps && strComps.length > 0) ? 'RentCast' : 'AI Generated';
    const dataSource = {
      adrSource: adrSrc,
      occupancySource: occSrc,
      compsSource: compsSrc,
      hasRentCastData: !!(strData && strData.source !== 'web_search') || !!(strComps)
    };

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

export const runPropertyAudit = async (address: string, knownFacts?: PropertyFacts): Promise<PropertyAudit> => {
  try {
    if (import.meta.env.DEV) console.log('[Claude] Running property audit for:', address);
    const content = await claudeProxy({
      model: getModel('complex_analysis'),
      max_tokens: 4096,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: 'user', content: AUDIT_PROMPT(address, knownFacts) }]
    });
    return parseJSON(extractText(content));
  } catch (e) {
    console.error("Property audit failed:", e);
    throw e;
  }
};

export const runUnderwriteAnalysis = async (input: UnderwriteInput): Promise<UnderwriteResult> => {
  try {
    if (import.meta.env.DEV) console.log('[Claude] Running underwrite analysis:', input.strategy);
    const content = await claudeProxy({
      model: getModel('complex_analysis'),
      max_tokens: 8192,
      messages: [{ role: 'user', content: UNDERWRITE_PROMPT(input) }]
    });
    return parseJSON(extractText(content));
  } catch (e) {
    console.error("Underwrite analysis failed:", e);
    throw e;
  }
};

export const runSensitivityAnalysis = async (baseKPIs: {
  adr: number;
  occupancy: number;
  rate: number;
  ownerSurplus: number;
  cashOnCash: number;
  dscr: number;
}): Promise<SensitivityMatrix> => {
  try {
    if (import.meta.env.DEV) console.log('[Claude] Running sensitivity analysis');
    const content = await claudeProxy({
      model: getModel('complex_analysis'),
      max_tokens: 4096,
      messages: [{ role: 'user', content: SENSITIVITY_PROMPT(baseKPIs) }]
    });
    return parseJSON(extractText(content));
  } catch (e) {
    console.error("Sensitivity analysis failed:", e);
    throw e;
  }
};

export const runAmenityROI = async (input: AmenityROIInput): Promise<AmenityROIResult> => {
  try {
    if (import.meta.env.DEV) console.log('[Claude] Running amenity ROI analysis');
    const content = await claudeProxy({
      model: getModel('complex_analysis'),
      max_tokens: 4096,
      messages: [{ role: 'user', content: AMENITY_ROI_PROMPT(input) }]
    });
    return parseJSON(extractText(content));
  } catch (e) {
    console.error("Amenity ROI analysis failed:", e);
    throw e;
  }
};

export const scanRegulations = async (city: string): Promise<RegulationReport> => {
  try {
    if (import.meta.env.DEV) console.log('[Claude] Scanning regulations for:', city);
    const content = await claudeProxy({
      model: getModel('complex_analysis'),
      max_tokens: 4096,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: 'user', content: REGULATION_SCANNER_PROMPT(city) }]
    });
    return parseJSON(extractText(content));
  } catch (e) {
    console.error("Regulation scan failed:", e);
    throw e;
  }
};

export const generateLenderPacket = async (analysis: {
  address: string;
  strategy: string;
  kpis: { noi: number; dscr: number; capRate: number; cashOnCash: number };
  ownerSurplus: number;
  assumptions: Record<string, any>;
  amenities: { name: string; cost: number; paybackMonths: number }[];
  propertyDetails?: any;
  marketData?: any;
  compsData?: any[];
  risks: string[];
  sources: { title: string; url: string }[];
}): Promise<LenderPacket> => {
  try {
    if (import.meta.env.DEV) console.log('[Claude] Generating lender packet for:', analysis.address);
    const content = await claudeProxy({
      model: getModel('complex_analysis'),
      max_tokens: 4096,
      messages: [{ role: 'user', content: PACKET_SUMMARY_PROMPT(analysis) }]
    });
    return parseJSON(extractText(content));
  } catch (e) {
    console.error("Lender packet generation failed:", e);
    throw e;
  }
};

export const calculatePathToYes = async (current: {
  kpis: { capRate: number; cashOnCash: number; dscr: number; ownerSurplus: number };
  targets: { minCapRate: number; minCoC: number; minDSCR: number };
  assumptions: Record<string, any>;
  cashInvested?: number;
}): Promise<PathToYes> => {
  try {
    if (import.meta.env.DEV) console.log('[Claude] Calculating path to yes');
    const content = await claudeProxy({
      model: getModel('complex_analysis'),
      max_tokens: 4096,
      messages: [{ role: 'user', content: PATH_TO_YES_PROMPT(current) }]
    });
    return parseJSON(extractText(content));
  } catch (e) {
    console.error("Path to yes calculation failed:", e);
    throw e;
  }
};

export const discoverMarkets = async (input: MarketDiscoveryInput): Promise<MarketList> => {
  try {
    if (import.meta.env.DEV) console.log('[Claude] Discovering markets for budget:', input.budget);
    const content = await claudeProxy({
      model: getModel('premium_analysis'), // Use Sonnet-4 for complex market comparison
      max_tokens: 4096,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: 'user', content: MARKET_DISCOVERY_PROMPT(input) }]
    });
    return parseJSON(extractText(content));
  } catch (e) {
    console.error("Market discovery failed:", e);
    throw e;
  }
};

export const scoreCompStrength = async (
  comps: { address: string; beds: number; baths: number; sqft: number; adr: number; occupancy: number; distance: number; daysOnMarket?: number }[],
  subject: { beds: number; baths: number; sqft: number; amenities: string[] }
): Promise<CompScore> => {
  try {
    if (import.meta.env.DEV) console.log('[Claude] Scoring comp strength');
    const content = await claudeProxy({
      model: getModel('premium_analysis'), // Use Sonnet-4 for nuanced comparison
      max_tokens: 2048,
      messages: [{ role: 'user', content: COMPS_STRENGTH_PROMPT(comps, subject) }]
    });
    return parseJSON(extractText(content));
  } catch (e) {
    console.error("Comp strength scoring failed:", e);
    throw e;
  }
};

// Cache for amenity cost estimates (keyed by address to avoid repeated Claude calls)
const amenityCostCache = new Map<string, { data: any; timestamp: number }>();
const AMENITY_CACHE_DURATION = 1000 * 60 * 60 * 2; // 2 hours (increased for production)
let lastAmenityCostEstimationTime = 0;
const AMENITY_ESTIMATION_THROTTLE = 5000; // Minimum 5 seconds between estimations

export const estimateAmenityCosts = async (address: string, propertyType: string, marketData: any) => {
  try {
    // Check cache first
    const cached = amenityCostCache.get(address);
    if (cached && Date.now() - cached.timestamp < AMENITY_CACHE_DURATION) {
      if (import.meta.env.DEV) console.log('[Claude] Using cached amenity costs for:', address);
      return cached.data;
    }

    // Throttle rapid calls to avoid rate limiting
    const timeSinceLastEstimation = Date.now() - lastAmenityCostEstimationTime;
    if (timeSinceLastEstimation < AMENITY_ESTIMATION_THROTTLE) {
      const waitTime = AMENITY_ESTIMATION_THROTTLE - timeSinceLastEstimation;
      if (import.meta.env.DEV) console.log(`[Claude] Throttling amenity estimation, waiting ${waitTime}ms`);
      await sleep(waitTime);
    }

    if (import.meta.env.DEV) console.log('[Claude] Estimating amenity costs for:', address);
    lastAmenityCostEstimationTime = Date.now();
    
    const content = await claudeProxy({
      model: getModel('simple_task'), // Fast + cheap (Haiku)
      max_tokens: 800,
      messages: [{ role: 'user', content: AMENITY_PRICING_PROMPT(address, propertyType, marketData) }]
    });
    const text = extractText(content);
    const result = parseJSON(text);
    
    // Cache the result
    amenityCostCache.set(address, { data: result, timestamp: Date.now() });
    
    if (import.meta.env.DEV) console.log('[Claude] Amenity costs estimated:', result);
    return result;
  } catch (e) {
    console.error('Amenity cost estimation failed:', e);
    return null; // Fallback to hardcoded values
  }
};

export const estimateCustomAmenityCost = async (amenityName: string, address: string, propertyType: string, marketData: any) => {
  try {
    if (import.meta.env.DEV) console.log('[Claude] Estimating cost for custom amenity:', amenityName);
    const content = await claudeProxy({
      model: getModel('simple_task'), // Fast + cheap (Haiku)
      max_tokens: 400,
      messages: [{ role: 'user', content: CUSTOM_AMENITY_PRICING_PROMPT(amenityName, address, propertyType, marketData) }]
    });
    const text = extractText(content);
    const result = parseJSON(text);
    if (import.meta.env.DEV) console.log('[Claude] Custom amenity cost estimated:', result);
    return result;
  } catch (e) {
    console.error('Custom amenity cost estimation failed:', e);
    return null;
  }
};
