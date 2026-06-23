import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton QueryClient — shared between `QueryClientProvider` (in the layout)
 * and `invalidateData()` (called from mutations outside React). Keeping it in a
 * module ensures both sides reference the same instance.
 *
 * Config: staleTime 0 + no retries match the existing `useApiData`/`usePolling`
 * behaviour. Mutations always re-fetch immediately after.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});
