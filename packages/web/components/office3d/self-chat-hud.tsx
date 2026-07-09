'use client';

import { useEffect, useState } from 'react';
import { usePresenceStore } from '@/lib/presence-store';
import { chatTtl } from '@/lib/presence-chat';

/**
 * Phase 64 Theme G — the first-person self-chat confirmation. In the 3D office you
 * never see your own avatar, so an over-the-head bubble (as in 2D) has nothing to
 * sit on; instead your last message shows briefly as a bottom-centre HUD bubble so
 * you get the same optimistic "you said it" feedback. Auto-hides on the message's
 * length-scaled TTL. Ephemeral — reads the store's `selfChat`, never persisted.
 */
export function SelfChatHud() {
  const selfChat = usePresenceStore((s) => s.selfChat);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!selfChat) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const remaining = chatTtl(selfChat.text) - (Date.now() - selfChat.at);
    if (remaining <= 0) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(false), remaining);
    return () => clearTimeout(t);
  }, [selfChat]);

  if (!visible || !selfChat) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center">
      <div className="max-w-[70%] rounded-lg bg-[#e5e7eb] px-3 py-1.5 text-center text-sm font-medium text-[#0b0b12] shadow-lg">
        <span className="mr-1 text-[#0b0b12]/60">You:</span>
        {selfChat.text}
      </div>
    </div>
  );
}
