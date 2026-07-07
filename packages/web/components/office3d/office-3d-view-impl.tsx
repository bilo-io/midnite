'use client';

import { useEffect, useMemo, useState } from 'react';

import { useTheme } from '@/app/theme/theme-context';
import { OFFICE_ASPECT } from '@/lib/office/dimensions';
import { buildOfficePalette } from '@/lib/office/theme';
import { useOfficeStore } from '@/lib/office-store';
import { Office3DCanvas } from './office-3d-canvas';

/**
 * Phase 63 Theme A — the 3D office stage. The r3f canvas fills the panel with a
 * click-to-lock overlay over it (drei pointer-lock locks on canvas click; the
 * overlay is instructional + `pointer-events-none`, shown only while unlocked).
 *
 * The 3D view is a **client of the existing store contract**: on mount/unmount it
 * calls `reset()` so transient proximity/panel flags don't leak in from the 2D
 * office when switching tabs. Theme C wires proximity + interactions into the
 * store; this slice only guards the contract.
 */
export function Office3DViewImpl() {
  const { resolved } = useTheme();
  // buildOfficePalette() reads the live CSS design tokens, which flip with the
  // app theme — so recompute whenever `resolved` changes (the value itself isn't
  // an input, the DOM it reads is).
  const palette = useMemo(() => {
    void resolved;
    return buildOfficePalette();
  }, [resolved]);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const { reset } = useOfficeStore.getState();
    reset();
    return () => reset();
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-border bg-card"
      style={{ aspectRatio: OFFICE_ASPECT }}
    >
      <Office3DCanvas palette={palette} onLockChange={setLocked} />
      {!locked && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-6">
          <div className="rounded-lg border border-border bg-background/85 px-4 py-2 text-sm text-foreground shadow-lg backdrop-blur">
            Click to look around · <span className="font-mono font-semibold">WASD</span> to move ·{' '}
            <span className="font-mono font-semibold">Esc</span> to release
          </div>
        </div>
      )}
    </div>
  );
}
