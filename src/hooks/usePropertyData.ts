import { useQuery, useQueries } from '@tanstack/react-query';
import { 
  fetchPropertyData, 
  fetchMarketStats, 
  fetchRentEstimate, 
  fetchSTRData,
  RentCastProperty 
} from '../../services/rentcastService';
import { 
  analyzeProperty, 
  searchWebForSTRData,
  runSensitivityAnalysis,
  runAmenityROI,
  calculatePathToYes,
  generateLenderPacket
} from '../../services/claudeService';
import { Amenity, PropertyConfig } from '../../types';

/**
 * Hook to fetch property data from RentCast
 */
export const usePropertyData = (address: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['property', address],
    queryFn: () => fetchPropertyData(address),
    enabled: enabled && !!address,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

/**
 * Hook to fetch market statistics
 */
export const useMarketStats = (zipCode: string | undefined, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['marketStats', zipCode],
    queryFn: () => fetchMarketStats(zipCode!),
    enabled: enabled && !!zipCode,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

/**
 * Hook to fetch rent estimate
 */
export const useRentEstimate = (address: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['rentEstimate', address],
    queryFn: () => fetchRentEstimate(address),
    enabled: enabled && !!address,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

/**
 * Hook to fetch STR data
 */
export const useSTRData = (
  address: string, 
  propertyType: string | undefined,
  bedrooms: number | undefined,
  bathrooms: number | undefined,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['strData', address, propertyType, bedrooms, bathrooms],
    queryFn: () => fetchSTRData(address, propertyType, bedrooms, bathrooms),
    enabled: enabled && !!address,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

/**
 * Hook to search web for STR data using Claude
 */
export const useWebSTRData = (
  address: string,
  bedrooms: number | undefined,
  bathrooms: number | undefined,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['webSTRData', address, bedrooms, bathrooms],
    queryFn: () => searchWebForSTRData(address, bedrooms, bathrooms),
    enabled: enabled && !!address,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1, // Only retry once for Claude calls
  });
};

/**
 * Hook to analyze property with Claude
 * Note: Query key uses only address to ensure cache hits on repeat searches
 * The data is passed to queryFn but not used in cache key
 */
export const usePropertyAnalysis = (
  address: string,
  factual: RentCastProperty | null,
  marketStats: any,
  rentEstimate: any,
  strData: any,
  strComps: any,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['propertyAnalysis', address],
    queryFn: () => analyzeProperty(address, factual, marketStats, rentEstimate, strData, strComps),
    enabled: enabled && !!address,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1, // Only retry once for Claude calls
  });
};

/**
 * Hook to run sensitivity analysis
 */
export const useSensitivityAnalysis = (
  address: string,
  config: PropertyConfig,
  amenities: Amenity[],
  selectedAmenityIds: string[],
  enabled: boolean = false // Default to false, must be explicitly enabled
) => {
  return useQuery({
    queryKey: ['sensitivityAnalysis', address, config, amenities, selectedAmenityIds],
    queryFn: () => runSensitivityAnalysis(address, config, amenities, selectedAmenityIds),
    enabled: enabled && !!address,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
};

/**
 * Hook to run amenity ROI analysis
 */
export const useAmenityROI = (
  address: string,
  config: PropertyConfig,
  amenities: Amenity[],
  selectedAmenityIds: string[],
  enabled: boolean = false
) => {
  return useQuery({
    queryKey: ['amenityROI', address, config, amenities, selectedAmenityIds],
    queryFn: () => runAmenityROI(address, config, amenities, selectedAmenityIds),
    enabled: enabled && !!address,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
};

/**
 * Hook to calculate path to yes
 */
export const usePathToYes = (
  address: string,
  config: PropertyConfig,
  amenities: Amenity[],
  selectedAmenityIds: string[],
  investmentTargets: { minCapRate: number; minCoC: number; minDSCR: number },
  enabled: boolean = false
) => {
  return useQuery({
    queryKey: ['pathToYes', address, config, amenities, selectedAmenityIds, investmentTargets],
    queryFn: () => calculatePathToYes(address, config, amenities, selectedAmenityIds, investmentTargets),
    enabled: enabled && !!address,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
};

/**
 * Hook to generate lender packet
 */
export const useLenderPacket = (
  address: string,
  config: PropertyConfig,
  amenities: Amenity[],
  selectedAmenityIds: string[],
  enabled: boolean = false
) => {
  return useQuery({
    queryKey: ['lenderPacket', address, config, amenities, selectedAmenityIds],
    queryFn: () => generateLenderPacket(address, config, amenities, selectedAmenityIds),
    enabled: enabled && !!address,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
};

/**
 * Composite hook to fetch all RentCast data in parallel
 * This replaces the manual Promise.all pattern in runAnalysis
 */
export const useRentCastData = (address: string, enabled: boolean = true) => {
  const propertyQuery = usePropertyData(address, enabled);
  const zipCode = propertyQuery.data?.zipCode;
  
  const marketStatsQuery = useMarketStats(zipCode, enabled && !!zipCode);
  const rentEstimateQuery = useRentEstimate(address, enabled);

  return {
    property: propertyQuery,
    marketStats: marketStatsQuery,
    rentEstimate: rentEstimateQuery,
    isLoading: propertyQuery.isLoading || marketStatsQuery.isLoading || rentEstimateQuery.isLoading,
    isError: propertyQuery.isError || marketStatsQuery.isError || rentEstimateQuery.isError,
    error: propertyQuery.error || marketStatsQuery.error || rentEstimateQuery.error,
  };
};
