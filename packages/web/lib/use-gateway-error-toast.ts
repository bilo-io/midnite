'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { useToast } from '@/components/toast';

/**
 * Surface a failed gateway fetch as a toast instead of an inline banner. Deduped
 * per message via a ref so a stuck error doesn't re-fire on every render, and
 * cleared once the error resolves so the same failure can toast again later.
 * Pass the `error` from {@link useApiData}/{@link usePolling}.
 *
 * The wrapper phrasing lives in `common.gatewayUnreachable` (Phase 82 Theme D, ops slice).
 * This is a `.ts` module, so the `jsx-text-only` gate never looked at it — yet it fires on
 * every page that polls, which is how an English toast survived onto an otherwise French
 * ops board. The interpolated `error` is the gateway's own message and stays as-is.
 */
export function useGatewayErrorToast(error: string | null | undefined): void {
  const t = useTranslations('common');
  const toast = useToast();
  const lastError = useRef<string | null>(null);

  useEffect(() => {
    if (error && error !== lastError.current) {
      lastError.current = error;
      toast.error(t('gatewayUnreachable', { error }));
    }
    if (!error) lastError.current = null;
  }, [error, toast, t]);
}
