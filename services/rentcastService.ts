// All RentCast API calls go through /api/rentcast/* — API key is never in the browser
const isDev = import.meta.env.DEV;

// Helper to get auth headers for API calls
async function getAuthHeaders(): Promise<Record<string, string>> {
    const { supabase } = await import('../src/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {};
    if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
}

// ============================================================================
// TYPES
// ============================================================================

export interface PropertyFeatures {
    architectureType?: string;
    cooling?: boolean;
    coolingType?: string;
    exteriorType?: string;
    fireplace?: boolean;
    fireplaceType?: string;
    floorCount?: number;
    foundationType?: string;
    garage?: boolean;
    garageSpaces?: number;
    garageType?: string;
    heating?: boolean;
    heatingType?: string;
    pool?: boolean;
    poolType?: string;
    roofType?: string;
    roomCount?: number;
    unitCount?: number;
    viewType?: string;
}

export interface SaleHistoryEntry {
    date: string;
    price: number;
    event: string;
}

export interface TaxAssessmentEntry {
    year: number;
    value: number;
    land: number;
    improvements: number;
}

export interface PropertyOwner {
    names?: string[];
    type?: 'Individual' | 'Organization';
    ownerOccupied?: boolean;
}

export interface AVMComparable {
    id?: string;
    formattedAddress: string;
    city?: string;
    state?: string;
    zipCode?: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    lotSize?: number;
    yearBuilt?: number;
    propertyType?: string;
    price?: number;
    distance?: number;
    correlation?: number;
    daysOnMarket?: number;
    listingType?: string;
    status?: string;
    listedDate?: string;
    removedDate?: string;
}

export interface ListingDetails {
    daysOnMarket?: number;
    listingType?: string;
    listedDate?: string;
    removedDate?: string;
    status?: string;
    mlsName?: string;
    mlsNumber?: string;
    listingAgent?: { name?: string; phone?: string; email?: string; website?: string };
    listingOffice?: { name?: string; phone?: string; email?: string; website?: string };
    priceHistory?: { date: string; price: number; event: string; listingType?: string; daysOnMarket?: number }[];
}

export interface MarketTrendEntry {
    date: string;
    averagePrice?: number;
    medianPrice?: number;
    averageRent?: number;
    medianRent?: number;
    totalListings?: number;
    newListings?: number;
    averageDaysOnMarket?: number;
}

export interface MarketStats {
    saleData?: {
        averagePrice?: number;
        medianPrice?: number;
        minPrice?: number;
        maxPrice?: number;
        averagePricePerSquareFoot?: number;
        medianPricePerSquareFoot?: number;
        averageDaysOnMarket?: number;
        medianDaysOnMarket?: number;
        totalListings?: number;
        newListings?: number;
        dataByBedrooms?: { bedrooms: number; medianPrice?: number; averagePrice?: number; totalListings?: number }[];
        dataByPropertyType?: { propertyType: string; medianPrice?: number; averagePrice?: number; totalListings?: number }[];
        history?: Record<string, any>;
    };
    rentalData?: {
        averageRent?: number;
        medianRent?: number;
        minRent?: number;
        maxRent?: number;
        averageRentPerSquareFoot?: number;
        medianRentPerSquareFoot?: number;
        averageDaysOnMarket?: number;
        medianDaysOnMarket?: number;
        totalListings?: number;
        newListings?: number;
        dataByBedrooms?: { bedrooms: number; medianRent?: number; averageRent?: number; totalListings?: number }[];
        dataByPropertyType?: { propertyType: string; medianRent?: number; averageRent?: number; totalListings?: number }[];
        history?: Record<string, any>;
    };
    // Legacy field names (backwards compat)
    averageRent?: number;
    minRent?: number;
    maxRent?: number;
    totalListings?: number;
}

export interface RentalListing {
    id: string;
    formattedAddress: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    price?: number;
    status?: string;
    daysOnMarket?: number;
    listedDate?: string;
    propertyType?: string;
    distance?: number;
}

export interface RentCastProperty {
    id: string;
    formattedAddress: string;
    addressLine1: string;
    city: string;
    state: string;
    zipCode: string;
    bedrooms: number;
    bathrooms: number;
    squareFootage: number;
    lotSize: number;
    yearBuilt: number;
    propertyType: string;
    lastSalePrice?: number;
    lastSaleDate?: string;
    taxMonthly?: number;
    hoaMonthly?: number;
    images?: string[];
    mainImage?: string;
    // Tier 1: New fields from existing API calls
    features?: PropertyFeatures;
    saleHistory?: SaleHistoryEntry[];
    taxAssessments?: TaxAssessmentEntry[];
    owner?: PropertyOwner;
    ownerOccupied?: boolean;
    zoning?: string;
    subdivision?: string;
    latitude?: number;
    longitude?: number;
    county?: string;
    avmValueRange?: { low: number; high: number };
    avmComparables?: AVMComparable[];
    listingDetails?: ListingDetails;
}

export const fetchPropertyData = async (address: string): Promise<RentCastProperty | null> => {
    try {
        const cleanAddress = address.trim();
        const encodedAddress = encodeURIComponent(cleanAddress);

        if (isDev) console.log(`[RentCast] Fetching data for: ${cleanAddress}`);

        // Get auth headers
        const headers = await getAuthHeaders();
        
        // Fetch listings, AVM, and property record in parallel (they're independent)
        const [listingRes, avmRes, propRes] = await Promise.all([
            fetch(`/api/rentcast/listings/sale?address=${encodedAddress}&status=Active`, { headers }),
            fetch(`/api/rentcast/avm/value?address=${encodedAddress}`, { headers }).catch(() => null),
            fetch(`/api/rentcast/properties?address=${encodedAddress}`, { headers }),
        ]);

        // 1. Active Listings (most accurate for current Price)
        let listingData: any;
        let listingDetails: ListingDetails | undefined;
        if (listingRes.ok) {
            const listings = await listingRes.json();
            if (listings && listings.length > 0) {
                listingData = listings[0];
                if (isDev) console.log(`[RentCast] Found active listing price: $${listingData.price}`);
                // Extract listing details (Tier 1E)
                listingDetails = {
                    daysOnMarket: listingData.daysOnMarket,
                    listingType: listingData.listingType,
                    listedDate: listingData.listedDate,
                    removedDate: listingData.removedDate,
                    status: listingData.status,
                    mlsName: listingData.mlsName,
                    mlsNumber: listingData.mlsNumber,
                    listingAgent: listingData.listingAgent,
                    listingOffice: listingData.listingOffice,
                };
                // Extract price history from listing history
                if (listingData.history) {
                    listingDetails.priceHistory = Object.entries(listingData.history)
                        .map(([date, entry]: [string, any]) => ({
                            date,
                            price: entry.price,
                            event: entry.event || 'Sale Listing',
                            listingType: entry.listingType,
                            daysOnMarket: entry.daysOnMarket,
                        }))
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                }
                if (isDev && listingDetails.listingType) console.log(`[RentCast] Listing Type: ${listingDetails.listingType}, DOM: ${listingDetails.daysOnMarket || 'N/A'}`);
            }
        }

        // 2. Valuation (AVM) endpoint — extract price, range, and sale comparables
        let avmPrice: number | undefined;
        let avmValueRange: { low: number; high: number } | undefined;
        let avmComparables: AVMComparable[] | undefined;
        if (avmRes && avmRes.ok) {
            const avm = await avmRes.json();
            avmPrice = avm.price;
            if (avm.priceRangeLow && avm.priceRangeHigh) {
                avmValueRange = { low: avm.priceRangeLow, high: avm.priceRangeHigh };
            }
            if (avm.comparables && Array.isArray(avm.comparables) && avm.comparables.length > 0) {
                avmComparables = avm.comparables.map((c: any) => ({
                    id: c.id,
                    formattedAddress: c.formattedAddress,
                    city: c.city,
                    state: c.state,
                    zipCode: c.zipCode,
                    bedrooms: c.bedrooms,
                    bathrooms: c.bathrooms,
                    squareFootage: c.squareFootage,
                    lotSize: c.lotSize,
                    yearBuilt: c.yearBuilt,
                    propertyType: c.propertyType,
                    price: c.price,
                    distance: c.distance,
                    correlation: c.correlation,
                    daysOnMarket: c.daysOnMarket,
                    listingType: c.listingType,
                    status: c.status,
                    listedDate: c.listedDate,
                    removedDate: c.removedDate,
                }));
                if (isDev) console.log(`[RentCast] AVM Comparables: ${avmComparables.length} sale comps`);
            }
            if (isDev) console.log(`[RentCast] AVM Estimate: $${avmPrice}${avmValueRange ? ` (range: $${avmValueRange.low}-$${avmValueRange.high})` : ''}`);
        }

        if (!propRes.ok) {
            const errorText = await propRes.text();
            console.error(`RentCast API Error: ${propRes.status} - ${errorText}`);
            if (listingData) {
                const result = {
                    id: listingData.id || 'N/A',
                    formattedAddress: listingData.formattedAddress || cleanAddress,
                    addressLine1: listingData.addressLine1 || '',
                    city: listingData.city || '',
                    state: listingData.state || '',
                    zipCode: listingData.zipCode || '',
                    bedrooms: listingData.bedrooms || 0,
                    bathrooms: listingData.bathrooms || 0,
                    squareFootage: listingData.squareFootage || 0,
                    lotSize: listingData.lotSize || 0,
                    yearBuilt: listingData.yearBuilt || 0,
                    propertyType: listingData.propertyType || '',
                    lastSalePrice: listingData.price
                };
                return result;
            }
            return null;
        }

        const propData = await propRes.json();

        if (propData && propData.length > 0) {
            const property = propData[0];
            const finalPrice = listingData?.price || avmPrice || property.lastSalePrice;

            // Extract Tax - Get the most recent tax record
            let taxMonthly = 0;
            if (property.propertyTaxes) {
                const years = Object.keys(property.propertyTaxes).sort((a, b) => parseInt(b) - parseInt(a));
                if (years.length > 0) {
                    const latestTax = property.propertyTaxes[years[0]].total;
                    taxMonthly = Math.round(latestTax / 12);
                    if (isDev) console.log(`[RentCast] Found Tax for ${years[0]}: $${latestTax} ($${taxMonthly}/mo)`);
                }
            }

            // Extract HOA
            let hoaMonthly = 0;
            if (property.hoa && property.hoa.fee) {
                hoaMonthly = property.hoa.fee;
                if (isDev) console.log(`[RentCast] Found HOA Fee: $${hoaMonthly}/mo`);
            }

            const finalImages = listingData?.images && listingData.images.length > 0 ? listingData.images : (property.images || []);
            const finalMainImage = listingData?.propertyImage || (listingData?.images && listingData.images[0]) || (property.images && property.images[0]);

            if (isDev) console.log(`[RentCast] Image Data:`, {
                listingImages: listingData?.images?.length || 0,
                propertyImages: property.images?.length || 0,
                finalMainImage: finalMainImage ? 'Found' : 'Missing'
            });

            // Extract property features (Tier 1C)
            let features: PropertyFeatures | undefined;
            if (property.features) {
                features = {
                    architectureType: property.features.architectureType,
                    cooling: property.features.cooling,
                    coolingType: property.features.coolingType,
                    exteriorType: property.features.exteriorType,
                    fireplace: property.features.fireplace,
                    fireplaceType: property.features.fireplaceType,
                    floorCount: property.features.floorCount,
                    foundationType: property.features.foundationType,
                    garage: property.features.garage,
                    garageSpaces: property.features.garageSpaces,
                    garageType: property.features.garageType,
                    heating: property.features.heating,
                    heatingType: property.features.heatingType,
                    pool: property.features.pool,
                    poolType: property.features.poolType,
                    roofType: property.features.roofType,
                    roomCount: property.features.roomCount,
                    unitCount: property.features.unitCount,
                    viewType: property.features.viewType,
                };
                if (isDev) console.log(`[RentCast] Features:`, Object.entries(features).filter(([, v]) => v != null).map(([k]) => k));
            }

            // Extract sale transaction history (Tier 1D)
            let saleHistory: SaleHistoryEntry[] | undefined;
            if (property.history) {
                saleHistory = Object.entries(property.history)
                    .map(([date, entry]: [string, any]) => ({
                        date: entry.date || date,
                        price: entry.price,
                        event: entry.event || 'Sale',
                    }))
                    .filter((e) => e.price > 0)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                if (isDev && saleHistory.length > 0) console.log(`[RentCast] Sale History: ${saleHistory.length} transactions`);
            }

            // Extract tax assessments (Tier 3L)
            let taxAssessmentEntries: TaxAssessmentEntry[] | undefined;
            if (property.taxAssessments) {
                taxAssessmentEntries = Object.entries(property.taxAssessments)
                    .map(([year, entry]: [string, any]) => ({
                        year: parseInt(year),
                        value: entry.value || 0,
                        land: entry.land || 0,
                        improvements: entry.improvements || 0,
                    }))
                    .sort((a, b) => b.year - a.year);
            }

            // Extract owner info (Tier 3K)
            let ownerInfo: PropertyOwner | undefined;
            if (property.owner) {
                ownerInfo = {
                    names: property.owner.names,
                    type: property.owner.type,
                };
            }

            const result = {
                ...property,
                bedrooms: listingData?.bedrooms || property.bedrooms,
                bathrooms: listingData?.bathrooms || property.bathrooms,
                squareFootage: listingData?.squareFootage || property.squareFootage,
                lastSalePrice: finalPrice,
                taxMonthly,
                hoaMonthly,
                images: finalImages,
                mainImage: finalMainImage,
                // New Tier 1 fields
                features,
                saleHistory,
                taxAssessments: taxAssessmentEntries,
                owner: ownerInfo,
                ownerOccupied: property.ownerOccupied,
                zoning: property.zoning,
                subdivision: property.subdivision,
                latitude: property.latitude,
                longitude: property.longitude,
                county: property.county,
                avmValueRange,
                avmComparables,
                listingDetails,
            } as RentCastProperty;

            return result;
        }

        return null;
    } catch (error) {
        console.error("Failed to fetch property data from RentCast", error);
        return null;
    }
};

export const fetchMarketStats = async (zipCode: string): Promise<MarketStats | null> => {
    try {
        const headers = await getAuthHeaders();
        // Tier 2G: Request all data types (sale + rental) for comprehensive market view
        const response = await fetch(`/api/rentcast/markets?zipCode=${zipCode}&dataType=All`, { headers });

        if (!response.ok) {
            console.error(`RentCast Market Stats Error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        
        if (isDev) {
            const saleMonths = data.saleData?.history ? Object.keys(data.saleData.history).length : 0;
            const rentalMonths = data.rentalData?.history ? Object.keys(data.rentalData.history).length : 0;
            console.log(`[RentCast] Market Stats:`, {
                hasSaleData: !!data.saleData,
                hasRentalData: !!data.rentalData,
                saleHistoryMonths: saleMonths,
                rentalHistoryMonths: rentalMonths,
                medianPrice: data.saleData?.medianPrice,
                medianRent: data.rentalData?.medianRent,
            });
        }
        
        return data as MarketStats;
    } catch (error) {
        console.error("Failed to fetch market stats from RentCast", error);
        return null;
    }
};

export const fetchRentEstimate = async (address: string): Promise<any | null> => {
    try {
        const headers = await getAuthHeaders();
        const encodedAddress = encodeURIComponent(address);
        const response = await fetch(`/api/rentcast/avm/rent/long-term?address=${encodedAddress}`, { headers });

        if (!response.ok) {
            console.error(`RentCast Rent Estimate Error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        
        if (isDev) console.log(`[RentCast] Rent Estimate Response:`, {
            rent: data.rent,
            hasComps: data.comparableProperties ? data.comparableProperties.length : 0
        });
        
        return data;
    } catch (error) {
        console.error("Failed to fetch rent estimate from RentCast", error);
        return null;
    }
};

/**
 * Tier 2J: Fetch active rental listings in a zip code for LTR/MTR comp data
 */
export const fetchRentalListings = async (
    zipCode: string,
    bedrooms?: number,
    propertyType?: string
): Promise<RentalListing[] | null> => {
    try {
        const headers = await getAuthHeaders();
        let url = `/api/rentcast/listings/rental/long-term?zipCode=${zipCode}&status=Active&limit=10`;
        if (bedrooms) url += `&bedrooms=${bedrooms}`;
        if (propertyType) url += `&propertyType=${encodeURIComponent(propertyType)}`;

        if (isDev) console.log(`[RentCast] Fetching rental listings for zip ${zipCode}`);

        const response = await fetch(url, { headers });
        if (!response.ok) {
            console.error(`RentCast Rental Listings Error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) return null;

        const listings: RentalListing[] = data.map((l: any) => ({
            id: l.id,
            formattedAddress: l.formattedAddress,
            bedrooms: l.bedrooms,
            bathrooms: l.bathrooms,
            squareFootage: l.squareFootage,
            price: l.price,
            status: l.status,
            daysOnMarket: l.daysOnMarket,
            listedDate: l.listedDate,
            propertyType: l.propertyType,
        }));

        if (isDev) console.log(`[RentCast] Found ${listings.length} rental listings`);
        return listings;
    } catch (error) {
        console.error("Failed to fetch rental listings from RentCast", error);
        return null;
    }
};

/**
 * Extract market trend time series from /markets response for charting
 */
export const extractMarketTrends = (marketStats: MarketStats | null): { saleTrends: MarketTrendEntry[]; rentalTrends: MarketTrendEntry[] } => {
    const saleTrends: MarketTrendEntry[] = [];
    const rentalTrends: MarketTrendEntry[] = [];

    if (marketStats?.saleData?.history) {
        Object.entries(marketStats.saleData.history)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([key, entry]: [string, any]) => {
                saleTrends.push({
                    date: key,
                    averagePrice: entry.averagePrice,
                    medianPrice: entry.medianPrice,
                    totalListings: entry.totalListings,
                    newListings: entry.newListings,
                    averageDaysOnMarket: entry.averageDaysOnMarket,
                });
            });
    }

    if (marketStats?.rentalData?.history) {
        Object.entries(marketStats.rentalData.history)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([key, entry]: [string, any]) => {
                rentalTrends.push({
                    date: key,
                    averageRent: entry.averageRent,
                    medianRent: entry.medianRent,
                    totalListings: entry.totalListings,
                    newListings: entry.newListings,
                    averageDaysOnMarket: entry.averageDaysOnMarket,
                });
            });
    }

    return { saleTrends, rentalTrends };
};

/**
 * Get bedroom-matched stats from market data (Tier 2I)
 */
export const getBedroomMatchedStats = (
    marketStats: MarketStats | null,
    bedrooms: number
): { sale?: any; rental?: any } => {
    const sale = marketStats?.saleData?.dataByBedrooms?.find(d => d.bedrooms === bedrooms);
    const rental = marketStats?.rentalData?.dataByBedrooms?.find(d => d.bedrooms === bedrooms);
    return { sale, rental };
};

/**
 * RentCast does not provide STR (short-term rental) data.
 * Use searchWebForSTRData() from claudeService.ts instead.
 */
export const fetchSTRData = async (address: string, propertyType?: string, bedrooms?: number, bathrooms?: number): Promise<any | null> => {
    if (isDev) console.log('[RentCast] Note: RentCast does not support short-term rental data. Using Claude web search instead.');
    return null;
}

export const fetchSTRComps = async (address: string, propertyType?: string, bedrooms?: number, bathrooms?: number): Promise<any | null> => {
    if (isDev) console.log('[RentCast] STR comps not available via API - Claude will use general market knowledge');
    return null;
}
