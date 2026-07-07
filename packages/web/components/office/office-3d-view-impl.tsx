'use client';

import { Box } from 'lucide-react';

import { OFFICE_ASPECT } from '@/lib/office/dimensions';

/**
 * Phase 63 F — the 3D office **placeholder stage** (dynamic, client-only). Theme
 * F builds the engine switcher (tabs, `?view=` routing, preference, isolation +
 * teardown) around this; the real first-person three.js world replaces this file
 * in Theme A. Kept dependency-free on purpose: adding the `three`/`@react-three/*`
 * type stack now pulls `@types/three`'s transitive global type packages
 * (`@webgpu/types`/`@types/webxr`) into the whole web typecheck and breaks
 * unrelated JSX inference — that r3f + React-19 JSX setup belongs in Theme A,
 * with the world that needs it.
 */
export function Office3DViewImpl() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card text-center"
      style={{ aspectRatio: OFFICE_ASPECT }}
      data-testid="office-3d"
    >
      <Box className="h-10 w-10 text-muted-foreground" aria-hidden />
      <div className="max-w-sm px-6">
        <p className="text-sm font-medium text-foreground">3D office — coming soon</p>
        <p className="mt-1 text-xs text-muted-foreground">
          A first-person walk through the same six rooms, at eye level. The engine switcher is live;
          the world lands next.
        </p>
      </div>
    </div>
  );
}
