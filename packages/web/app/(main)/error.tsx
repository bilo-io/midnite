'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/error-fallback';

/**
 * Error boundary for the main app segment. Nested inside `(main)/layout.tsx`, so
 * a crash in a page keeps the app shell (nav, sidebar) usable and the blast
 * radius is one route rather than the whole app.
 */
export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console -- deliberate: the sole crash trace
    console.error('[midnite] unhandled render error', error);
  }, [error]);

  return <ErrorFallback error={error} reset={reset} />;
}
