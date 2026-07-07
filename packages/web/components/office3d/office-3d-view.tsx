'use client';

import dynamic from 'next/dynamic';

import { Spinner } from '@/components/spinner';
import { OFFICE_ASPECT } from '@/lib/office/dimensions';

// three.js touches window/WebGL — load the whole 3D office client-only + lazy,
// mirroring the 2D office's `office-view.tsx` (Phaser) pattern. Keeps three out
// of the prerender and in its own chunk so the 2D-only path never pays for it
// (Phase 34 discipline; Theme F verifies the split with the bundle analyzer).
export const Office3DView = dynamic(() => import('./office-3d-view-impl').then((m) => m.Office3DViewImpl), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-xl border border-border bg-card"
      style={{ aspectRatio: OFFICE_ASPECT }}
    >
      <Spinner />
    </div>
  ),
});
