
const RENTCAST_API_KEY = import.meta.env.VITE_RENTCAST_API_KEY;

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
}

export const fetchPropertyData = async (address: string): Promise<RentCastProperty | null> => {
    if (!RENTCAST_API_KEY) {
        console.warn("RentCast API Key missing. Please add VITE_RENTCAST_API_KEY to your .env file.");
        return null;
    }

    try {
        const cleanAddress = address.trim();
        const encodedAddress = encodeURIComponent(cleanAddress);

        console.log(`[RentCast] Fetching data for: ${cleanAddress}`);

        // 1. Try to get Active Listings (the most accurate for current Price)
        const listingRes = await fetch(`https://api.rentcast.io/v1/listings/sale?address=${encodedAddress}&status=Active`, {
            headers: { 'X-Api-Key': RENTCAST_API_KEY, 'Accept': 'application/json' }
        });

        let listingData: any;
        if (listingRes.ok) {
            const listings = await listingRes.json();
            if (listings && listings.length > 0) {
                listingData = listings[0];
                console.log(`[RentCast] Found active listing price: $${listingData.price}`);
            }
        }

        // 2. Try Valuation (AVM) endpoint - often has more recent prices
        let avmPrice: number | undefined;
        try {
            const avmRes = await fetch(`https://api.rentcast.io/v1/avm/value?address=${encodedAddress}`, {
                headers: { 'X-Api-Key': RENTCAST_API_KEY, 'Accept': 'application/json' }
            });
            if (avmRes.ok) {
                const avm = await avmRes.json();
                avmPrice = avm.price;
                console.log(`[RentCast] AVM Estimate: $${avmPrice}`);
            }
        } catch (e) {
            console.warn("[RentCast] AVM fetch failed", e);
        }

        // 3. Get Property Record (for structural details and TAX/HOA)
        const propRes = await fetch(`https://api.rentcast.io/v1/properties?address=${encodedAddress}`, {
            headers: { 'X-Api-Key': RENTCAST_API_KEY, 'Accept': 'application/json' }
        });

        if (!propRes.ok) {
            const errorText = await propRes.text();
            console.error(`RentCast API Error: ${propRes.status} - ${errorText}`);
            if (listingData) {
                return {
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
                    console.log(`[RentCast] Found Tax for ${years[0]}: $${latestTax} ($${taxMonthly}/mo)`);
                }
            }

            // Extract HOA
            let hoaMonthly = 0;
            if (property.hoa && property.hoa.fee) {
                hoaMonthly = property.hoa.fee;
                console.log(`[RentCast] Found HOA Fee: $${hoaMonthly}/mo`);
            }

            const finalImages = listingData?.images && listingData.images.length > 0 ? listingData.images : (property.images || []);
            const finalMainImage = listingData?.propertyImage || (listingData?.images && listingData.images[0]) || (property.images && property.images[0]);

            console.log(`[RentCast] Image Data:`, {
                listingImages: listingData?.images?.length || 0,
                propertyImages: property.images?.length || 0,
                finalMainImage: finalMainImage ? 'Found' : 'Missing'
            });

            return {
                ...property,
                bedrooms: listingData?.bedrooms || property.bedrooms,
                bathrooms: listingData?.bathrooms || property.bathrooms,
                squareFootage: listingData?.squareFootage || property.squareFootage,
                lastSalePrice: finalPrice,
                taxMonthly,
                hoaMonthly,
                images: finalImages,
                mainImage: finalMainImage
            } as RentCastProperty;
        }

        return null;
    } catch (error) {
        console.error("Failed to fetch property data from RentCast", error);
        return null;
    }
};

export const fetchMarketStats = async (zipCode: string): Promise<any | null> => {
    if (!RENTCAST_API_KEY) return null;

    try {
        const response = await fetch(`https://api.rentcast.io/v1/markets/stats?zipCode=${zipCode}`, {
            headers: { 'X-Api-Key': RENTCAST_API_KEY, 'Accept': 'application/json' }
        });

        if (!response.ok) {
            console.error(`RentCast Market Stats Error: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("Failed to fetch market stats from RentCast", error);
        return null;
    }
};

export const fetchRentEstimate = async (address: string): Promise<any | null> => {
    if (!RENTCAST_API_KEY) return null;

    try {
        const encodedAddress = encodeURIComponent(address);
        const response = await fetch(`https://api.rentcast.io/v1/avm/rent/long-term?address=${encodedAddress}`, {
            headers: { 'X-Api-Key': RENTCAST_API_KEY, 'Accept': 'application/json' }
        });

        if (!response.ok) {
            console.error(`RentCast Rent Estimate Error: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("Failed to fetch rent estimate from RentCast", error);
        return null;
    }
};

export const fetchSTRData = async (address: string, propertyType?: string, bedrooms?: number, bathrooms?: number): Promise<any | null> => {
    if (!RENTCAST_API_KEY) return null;

    try {
        const encodedAddress = encodeURIComponent(address);
        let url = `https://api.rentcast.io/v1/avm/rent/short-term?address=${encodedAddress}`;
        if (propertyType) url += `&propertyType=${encodeURIComponent(propertyType)}`;
        if (bedrooms) url += `&bedrooms=${bedrooms}`;
        if (bathrooms) url += `&bathrooms=${bathrooms}`;

        const response = await fetch(url, {
            headers: { 'X-Api-Key': RENTCAST_API_KEY, 'Accept': 'application/json' }
        });

        if (!response.ok) {
            console.error(`RentCast STR Data Error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        console.log(`[RentCast] STR AVM: ADR=$${data.rent}, Occ=${Math.round(data.occupancy * 100)}%`);
        return data;
    } catch (error) {
        console.error("Failed to fetch STR data from RentCast", error);
        return null;
    }
}

export const fetchSTRComps = async (address: string, propertyType?: string, bedrooms?: number, bathrooms?: number): Promise<any | null> => {
    if (!RENTCAST_API_KEY) return null;

    try {
        const encodedAddress = encodeURIComponent(address);
        let url = `https://api.rentcast.io/v1/listings/rental/short-term?address=${encodedAddress}&radius=5&limit=5`;
        if (propertyType) url += `&propertyType=${encodeURIComponent(propertyType)}`;
        if (bedrooms) url += `&bedrooms=${bedrooms}`;

        const response = await fetch(url, {
            headers: { 'X-Api-Key': RENTCAST_API_KEY, 'Accept': 'application/json' }
        });

        if (!response.ok) {
            console.error(`RentCast STR Comps Error: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("Failed to fetch STR comps from RentCast", error);
        return null;
    }
}
