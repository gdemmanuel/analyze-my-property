/**
 * Google Street View Static API Service
 * Generates Street View images for property addresses
 */

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * Generate a Google Street View image URL for a given address
 * @param address - Full property address
 * @param width - Image width in pixels (default: 600)
 * @param height - Image height in pixels (default: 400)
 * @returns Street View image URL
 */
export const getStreetViewImage = (
    address: string,
    width: number = 600,
    height: number = 400
): string => {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
        console.warn('[StreetView] No Google Maps API key configured');
        return '';
    }

    const encodedAddress = encodeURIComponent(address);

    // Google Street View Static API endpoint
    const url = `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&location=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}&fov=90&pitch=0`;

    return url;
};

/**
 * Check if a Street View image exists for an address
 * Uses the Street View Metadata API
 * @param address - Full property address
 * @returns Promise<boolean> - true if Street View is available
 */
export const checkStreetViewAvailability = async (address: string): Promise<boolean> => {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
        return false;
    }

    try {
        const encodedAddress = encodeURIComponent(address);
        const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(metadataUrl);
        const data = await response.json();

        return data.status === 'OK';
    } catch (error) {
        console.error('[StreetView] Error checking availability:', error);
        return false;
    }
};
