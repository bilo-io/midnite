'use client';

import dynamic from 'next/dynamic';

import { TerminalStarting } from './session-terminal-starting';

// xterm.js touches the DOM/window — load it client-only. Keeping the dynamic()
// call in this thin wrapper keeps the heavy impl (and its CSS) out of the
// server graph until a terminal actually mounts.
export const SessionTerminal = dynamic(
  () => import('./session-terminal-impl').then((m) => m.SessionTerminalImpl),
  {
    ssr: false,
    loading: () => <TerminalStarting />,
  },
);
