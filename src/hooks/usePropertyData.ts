import { useQuery, useQueries } from '@tanstack/react-query';
import { 
  fetchPropertyData, 
  fetchMarketStats, 
  fetchRentEstimate, 
  fetchSTRData,
  fetchRentalListings,
  RentCastProperty 
} from '../../services/rentcastService';
import { 
  analyzeProperty, 
  searchWebForSTRData
} from '../../services/claudeService';

/**
 * Hook to fetch property data from RentCast
 */
export const usePropertyData = (address: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['property', address],
    queryFn: () => fetchPropertyData(address),
    enabled: enabled && !!address,
    staleTime: 2 * 60 * 60 * 1000, // 2 hours (increased for production)
    refetchOnMount: false, // Use cache on repeat searches
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
    staleTime: 2 * 60 * 60 * 1000, // 2 hours (increased for production)
    refetchOnMount: false, // Use cache on repeat searches
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
    staleTime: 2 * 60 * 60 * 1000, // 2 hours (increased for production)
    refetchOnMount: false, // Use cache on repeat searches
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
    staleTime: 2 * 60 * 60 * 1000, // 2 hours (increased for production)
    refetchOnMount: false, // Use cache on repeat searches
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
    staleTime: 2 * 60 * 60 * 1000, // 2 hours (increased for production)
    retry: 1, // Only retry once for Claude calls
    refetchOnMount: false, // Use cache on repeat searches
  });
};

/**
 * Hook to analyze property with Claude
 * Note: Query key uses only address - enabled flag ensures we wait for strData
 * before running analysis to avoid duplicate API calls
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
    staleTime: 2 * 60 * 60 * 1000, // 2 hours (increased for production)
    retry: (failureCount, error: any) => {
      // Don't retry on 429 - backoff won't help, user should wait
      if (error?.status === 429) return false;
      return failureCount < 1;
    },
    refetchOnMount: false, // Use cache on repeat searches
  });
};

/**
 * Hook to fetch rental listings in a zip code (Tier 2J)
 */
export const useRentalListings = (
  zipCode: string | undefined,
  bedrooms: number | undefined,
  propertyType: string | undefined,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['rentalListings', zipCode, bedrooms, propertyType],
    queryFn: () => fetchRentalListings(zipCode!, bedrooms, propertyType),
    enabled: enabled && !!zipCode,
    staleTime: 2 * 60 * 60 * 1000, // 2 hours (increased for production)
    refetchOnMount: false,
  });
};

/**
 * Composite hook to fetch all RentCast data in parallel
 * This replaces the manual Promise.all pattern in runAnalysis
 */
export const useRentCastData = (address: string, enabled: boolean = true) => {
  const propertyQuery = usePropertyData(address, enabled);
  const zipCode = propertyQuery.data?.zipCode;
  const bedrooms = propertyQuery.data?.bedrooms;
  const propertyType = propertyQuery.data?.propertyType;
  
  const marketStatsQuery = useMarketStats(zipCode, enabled && !!zipCode);
  const rentEstimateQuery = useRentEstimate(address, enabled);
  const rentalListingsQuery = useRentalListings(zipCode, bedrooms, propertyType, enabled && !!zipCode);

  return {
    property: propertyQuery,
    marketStats: marketStatsQuery,
    rentEstimate: rentEstimateQuery,
    rentalListings: rentalListingsQuery,
    isLoading: propertyQuery.isLoading || marketStatsQuery.isLoading || rentEstimateQuery.isLoading,
    isError: propertyQuery.isError || marketStatsQuery.isError || rentEstimateQuery.isError,
    error: propertyQuery.error || marketStatsQuery.error || rentEstimateQuery.error,
  };
};
