'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Monitor } from 'lucide-react';
import { useIsDesktop } from '@/hooks/use-media-query';

/**
 * Gates canvas-heavy surfaces (the office, the workflow editor) that have no
 * usable small-screen layout yet (Phase 24 A3, Decision §2). Below the `lg`
 * breakpoint it renders a clean "best viewed on desktop" notice instead of a
 * broken canvas; at `lg`+ it renders its children unchanged.
 *
 * A mount guard avoids a flash of the notice on desktop: `useIsDesktop` reports
 * `false` on the server / first paint (static export), so we render nothing
 * until mounted, then branch on the real viewport. The gated children are
 * client-only anyway (both consumers dynamic-import with `ssr: false`).
 */
export function DesktopOnly({
  /** What the notice says is best on desktop, e.g. "The office". */
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDesktop = useIsDesktop();

  if (!mounted) return null;
  if (isDesktop) return <>{children}</>;
  return <DesktopOnlyNotice label={label} />;
}

function DesktopOnlyNotice({ label }: { label: string }) {
  return (
    <div className="container flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Monitor className="h-7 w-7" aria-hidden />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">{label} is best viewed on desktop</h2>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          This view needs a larger screen than your phone offers. Open midnite on a
          desktop or tablet in landscape to use it.
        </p>
      </div>
    </div>
  );
}
