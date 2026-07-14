'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { resolveGuide } from '@/lib/guide/steps';
import { useGuide } from '@/lib/guide/use-guide';

/**
 * Starts a guide queued for replay once its home route mounts (Phase 67 C).
 *
 * The "All guides" index navigates to an off-route guide's home surface and sets
 * `useGuide.pending`; this watcher (mounted once in the `(main)` shell) starts it
 * as soon as `resolveGuide(pathname)` matches the pending guide — so the guide's
 * `data-tour` anchors are already on the page and the overlay doesn't auto-skip
 * through steps that haven't mounted yet. Renders nothing.
 */
export function GuidePendingReplay(): null {
  const pathname = usePathname();
  const pending = useGuide((s) => s.pending);
  const start = useGuide((s) => s.start);

  useEffect(() => {
    if (!pending || !pathname) return;
    if (resolveGuide(pathname)?.id === pending.id) start(pending);
  }, [pending, pathname, start]);

  return null;
}
