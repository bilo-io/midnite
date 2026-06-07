'use client';

import dynamic from 'next/dynamic';

// xterm.js touches the DOM/window — load it client-only. Keeping the dynamic()
// call in this thin wrapper keeps the heavy impl (and its CSS) out of the
// server graph until a terminal actually mounts.
export const SessionTerminal = dynamic(
  () => import('./session-terminal-impl').then((m) => m.SessionTerminalImpl),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Starting terminal…
      </div>
    ),
  },
);
