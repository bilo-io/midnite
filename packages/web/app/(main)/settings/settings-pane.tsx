'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/**
 * The settings content column. Keyed by pathname so switching categories
 * remounts (and re-reveals) ONLY this pane — the hub shell around it (header +
 * category sidebar) persists, because PageReveal keys the whole settings
 * subtree under one stable `/settings` key.
 */
export function SettingsPane({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="settings-pane-reveal min-w-0 flex-1 md:max-w-3xl">
      {children}
    </div>
  );
}
