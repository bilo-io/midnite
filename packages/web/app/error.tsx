'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/error-fallback';

/**
 * Route-segment error boundary for everything under the root layout.
 *
 * The root layout (and so the theme, locale and toast providers) is still
 * mounted here — only the failing segment is replaced — which is why this can
 * render the translated fallback. See `global-error.tsx` for the case where the
 * root layout itself is what threw.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // There is no crash reporting in this app by design (local-first, no
    // telemetry), so the console is the only place a digest is recoverable
    // from a user's devtools when they report a bug.
    // eslint-disable-next-line no-console -- deliberate: the sole crash trace
    console.error('[midnite] unhandled render error', error);
  }, [error]);

  return <ErrorFallback error={error} reset={reset} />;
}
