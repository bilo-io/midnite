'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePresence } from '@/hooks/use-presence';
import { setPresenceSampler } from '@/lib/presence-bridge';
import { loadGuestIdentity, saveGuestName } from '@/lib/presence-identity';

/**
 * Phase 64 — the office↔presence wiring shared by both engines (2D Phaser + 3D
 * three.js). Mounts `use-presence`, registers its throttled `sendMove` with the
 * scene bridge (`setPresenceSampler`) so whichever scene is active publishes the
 * player's position, and owns the first-visit guest-name prompt state. Each office
 * view calls this once and renders `<PresenceNameDialog {...dialog}>`.
 */
export function useOfficePresence(): {
  dialog: { open: boolean; defaultName: string; onSubmit: (name: string) => void; onSkip: () => void };
} {
  const [identity] = useState(() => loadGuestIdentity());
  const [name, setName] = useState(identity.name);
  const [open, setOpen] = useState(identity.isDefault);

  const { sendMove } = usePresence(true, name);
  useEffect(() => {
    setPresenceSampler(sendMove);
    return () => setPresenceSampler(null);
  }, [sendMove]);

  const onSubmit = useCallback((chosen: string) => {
    setName(saveGuestName(chosen) || chosen);
    setOpen(false);
  }, []);
  const onSkip = useCallback(() => {
    saveGuestName(identity.name); // persist the default so we don't re-prompt
    setOpen(false);
  }, [identity.name]);

  return { dialog: { open, defaultName: identity.name, onSubmit, onSkip } };
}
