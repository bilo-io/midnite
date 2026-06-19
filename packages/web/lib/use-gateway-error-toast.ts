'use client';

import { useEffect, useRef } from 'react';

import { useToast } from '@/components/toast';

/**
 * Surface a failed gateway fetch as a toast instead of an inline banner. Deduped
 * per message via a ref so a stuck error doesn't re-fire on every render, and
 * cleared once the error resolves so the same failure can toast again later.
 * Pass the `error` from {@link useApiData}/{@link usePolling}.
 */
export function useGatewayErrorToast(error: string | null | undefined): void {
  const toast = useToast();
  const lastError = useRef<string | null>(null);

  useEffect(() => {
    if (error && error !== lastError.current) {
      lastError.current = error;
      toast.error(`Could not reach the gateway: ${error}`);
    }
    if (!error) lastError.current = null;
  }, [error, toast]);
}
