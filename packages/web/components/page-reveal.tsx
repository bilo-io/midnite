'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

// Wraps page content so it replays a staggered reveal on every client-side navigation:
// keying the wrapper on the pathname remounts the subtree, which restarts the CSS
// animations defined for `.page-reveal` in globals.css. The cascade targets the content
// sibling(s) after the sticky page header, so the header keeps its own typewriter intro.
//
// Opt-outs: the dashboard runs its own bespoke cascade (tiles + composer), and the
// full-screen workflow editor (`/workflows/:id`) manages its own layout.
export function PageReveal({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const optOut = pathname === '/dashboard' || /^\/workflows\/.+/.test(pathname);
  if (optOut) return <>{children}</>;
  // Settings sub-pages share one key: switching categories must keep the hub
  // shell (header + category list) mounted and only re-reveal the content pane
  // (see settings/settings-pane.tsx) — a per-pathname key here would remount
  // and re-animate the whole settings layout on every category click.
  const key = pathname === '/settings' || pathname.startsWith('/settings/') ? '/settings' : pathname;
  return (
    <div key={key} className="page-reveal">
      {children}
    </div>
  );
}
