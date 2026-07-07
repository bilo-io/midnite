'use client';

import { useEffect, useMemo, useState } from 'react';

import { useTheme } from '@/app/theme/theme-context';
import { OfficeHud } from '@/components/office/office-hud';
import { PresenceHud } from '@/components/office/presence-hud';
import { PresenceNameDialog } from '@/components/office/presence-name-dialog';
import { useOfficeAgents } from '@/components/office/use-office-agents';
import { useOfficePresence } from '@/hooks/use-office-presence';
import { OFFICE_ASPECT } from '@/lib/office/dimensions';
import { buildOfficePalette } from '@/lib/office/theme';
import { useOfficeStore } from '@/lib/office-store';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { Office3DCanvas } from './office-3d-canvas';

/**
 * Phase 63 Theme A/C — the 3D office stage. The r3f canvas fills the panel with a
 * click-to-lock overlay over it (drei pointer-lock locks on canvas click; the
 * overlay is instructional + `pointer-events-none`, shown only while unlocked).
 *
 * The 3D view is a **client of the existing store contract**: `useOfficeAgents`
 * feeds the same live sessions into the store the 2D office uses (Theme C), the
 * canvas writes proximity + interaction transitions, and the shared `<OfficeHud>`
 * renders the *exact same* proximity prompts + modals — untouched — over the
 * canvas. On mount/unmount it calls `reset()` so transient flags don't leak across
 * a 2D↔3D tab switch.
 */
export function Office3DViewImpl() {
  const { error } = useOfficeAgents();
  useGatewayErrorToast(error);
  const { resolved } = useTheme();
  // buildOfficePalette() reads the live CSS design tokens, which flip with the
  // app theme — so recompute whenever `resolved` changes (the value itself isn't
  // an input, the DOM it reads is).
  const palette = useMemo(() => {
    void resolved;
    return buildOfficePalette();
  }, [resolved]);
  const [locked, setLocked] = useState(false);
  const { dialog, emote } = useOfficePresence();

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
      {locked && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-white/30 shadow" />
      )}
      {!locked && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-6">
          <div className="rounded-lg border border-border bg-background/85 px-4 py-2 text-sm text-foreground shadow-lg backdrop-blur">
            Click to look around · <span className="font-mono font-semibold">WASD</span> to move ·{' '}
            <span className="font-mono font-semibold">E</span> to interact ·{' '}
            <span className="font-mono font-semibold">Esc</span> to release
          </div>
        </div>
      )}
      <OfficeHud />
      <PresenceHud emote={emote} />
      <PresenceNameDialog {...dialog} />
    </div>
  );
}
