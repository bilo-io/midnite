import { QueryClient } from '@tanstack/react-query';

/**
 * The admin app's TanStack Query client singleton (shell never owns one — the host
 * supplies it to `<ShellProviders>`). A module-level instance so every provider
 * mount shares one cache; admin is a light read-only console, so the defaults are
 * deliberately conservative.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
