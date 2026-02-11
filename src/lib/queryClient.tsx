import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * React Query Configuration
 * Provides global caching, deduplication, and request management
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 24 hours
      gcTime: 24 * 60 * 60 * 1000,
      
      // Keep data fresh but allow stale data to be served immediately
      staleTime: 5 * 60 * 1000, // 5 minutes
      
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Don't refetch on window focus (property data doesn't change frequently)
      refetchOnWindowFocus: false,
      
      // Don't refetch on reconnect
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

/**
 * QueryClientProvider Wrapper
 * Wrap your app with this to enable React Query
 */
export interface ReactQueryProviderProps {
  children: React.ReactNode;
}

export const ReactQueryProvider: React.FC<ReactQueryProviderProps> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

/**
 * Example Hook - Use this pattern for all API calls
 * 
 * import { useQuery } from '@tanstack/react-query';
 * 
 * export const useProperty = (address: string) => {
 *   return useQuery({
 *     queryKey: ['property', address],
 *     queryFn: () => fetchPropertyData(address),
 *     enabled: !!address, // Don't fetch if address is empty
 *   });
 * };
 */
