'use client';

import { useCallback, useEffect, useState } from 'react';
import { sanitizeChatText } from '@midnite/shared';
import { usePresence } from '@/hooks/use-presence';
import { setPresenceSampler } from '@/lib/presence-bridge';
import { loadGhost, loadGuestIdentity, saveGuestName } from '@/lib/presence-identity';
import { usePresenceStore } from '@/lib/presence-store';

/**
 * Phase 64 — the office↔presence wiring shared by both engines (2D Phaser + 3D
 * three.js). Mounts `use-presence`, registers its throttled `sendMove` with the
 * scene bridge (`setPresenceSampler`) so whichever scene is active publishes the
 * player's position, owns the first-visit guest-name prompt state, and exposes
 * `emote` (Theme E) + `chat` (Theme G) actions — each optimistically records your
 * own bubble for local render + sends it to the team. Each office view calls this
 * once and renders `<PresenceNameDialog {...dialog}>` + `<PresenceHud …>`.
 */
export function useOfficePresence(): {
  dialog: { open: boolean; defaultName: string; onSubmit: (name: string) => void; onSkip: () => void };
  emote: (emoji: string) => void;
  chat: (text: string) => void;
} {
  const [identity] = useState(() => loadGuestIdentity());
  const [name, setName] = useState(identity.name);
  const [open, setOpen] = useState(identity.isDefault);

  const { sendMove, sendEmote, sendChat } = usePresence(true, name);
  useEffect(() => {
    setPresenceSampler(sendMove);
    return () => setPresenceSampler(null);
  }, [sendMove]);

  // Restore the persisted ghost-mode choice on entry (the hello re-sends when it
  // changes, and the server enforces exclusion).
  useEffect(() => {
    usePresenceStore.getState().setGhost(loadGhost());
  }, []);

  const emote = useCallback(
    (emoji: string) => {
      usePresenceStore.getState().setSelfEmote(emoji, Date.now());
      sendEmote(emoji);
    },
    [sendEmote],
  );

  const chat = useCallback(
    (text: string) => {
      const clean = sanitizeChatText(text);
      if (!clean) return;
      usePresenceStore.getState().setSelfChat(clean, Date.now());
      sendChat(clean);
    },
    [sendChat],
  );

  const onSubmit = useCallback((chosen: string) => {
    setName(saveGuestName(chosen) || chosen);
    setOpen(false);
  }, []);
  const onSkip = useCallback(() => {
    saveGuestName(identity.name); // persist the default so we don't re-prompt
    setOpen(false);
  }, [identity.name]);

  return { dialog: { open, defaultName: identity.name, onSubmit, onSkip }, emote, chat };
}
