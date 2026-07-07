'use client';

import { useSearchParams } from 'next/navigation';

import { Office3DView } from '@/components/office3d/office-3d-view';
import { OfficeView } from './office-view';

/**
 * Picks the 2D (Phaser) or 3D (three.js) office from the `?view=` query param.
 * Phase 63 Theme A wires only this **escape hatch** (`?view=3d` opts into 3D;
 * anything else — including no param — stays the untouched 2D default), so the
 * new engine is reachable + Playwright-smokeable. Theme F replaces this with a
 * real 2D/3D tab strip + Phase-43 preference sync; the param is the seam it
 * builds on (`?view=` is the Phase-52 client-read query pattern under
 * `output: 'export'`). Each engine is behind its own `dynamic(ssr:false)` lazy
 * chunk, so only the active one loads.
 */
export function OfficeSurface() {
  const view = useSearchParams().get('view');
  return view === '3d' ? <Office3DView /> : <OfficeView />;
}
