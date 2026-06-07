'use client';

import '@xterm/xterm/css/xterm.css';
import { useEffect, useRef, useState } from 'react';
import { Terminal, type ITheme } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import type { SessionSummary, TerminalStatusPhase } from '@midnite/shared';
import { useTerminalSocket, type TerminalConnectionState } from '@/hooks/use-terminal-socket';
import { useTheme } from '@/app/theme/theme-context';

// Palettes track the app's card surface (globals.css --card / --foreground).
const TERMINAL_THEMES: Record<'light' | 'dark', ITheme> = {
  dark: {
    background: '#0d0d12',
    foreground: '#fafafa',
    cursor: '#fafafa',
    selectionBackground: '#ffffff33',
  },
  light: {
    background: '#ffffff',
    foreground: '#0a0a0b',
    cursor: '#0a0a0b',
    selectionBackground: '#00000022',
  },
};

const STATUS_HINT: Record<TerminalConnectionState, string> = {
  connecting: 'Connecting…',
  open: 'Live',
  closed: 'Disconnected',
  error: 'Connection error',
};

export function SessionTerminalImpl({ session }: { session: SessionSummary }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<TerminalStatusPhase | null>(null);
  const [command, setCommand] = useState<string | null>(null);

  const { resolved } = useTheme();
  const resolvedRef = useRef(resolved);
  resolvedRef.current = resolved;

  const { connectionState, sendInput, sendResize } = useTerminalSocket({
    sessionId: session.id,
    enabled: ready,
    onOutput: (bytes) => termRef.current?.write(bytes),
    onStatus: (p, cmd) => {
      setPhase(p);
      if (cmd) setCommand(cmd);
    },
  });

  // Stable across the once-only terminal effect.
  const sendInputRef = useRef(sendInput);
  sendInputRef.current = sendInput;
  const sendResizeRef = useRef(sendResize);
  sendResizeRef.current = sendResize;

  useEffect(() => {
    const container = containerRef.current;
    if (termRef.current || !container) return;

    const term = new Terminal({
      convertEol: false,
      cursorBlink: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 13,
      theme: TERMINAL_THEMES[resolvedRef.current],
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);
    fit.fit();
    term.focus();
    termRef.current = term;
    fitRef.current = fit;

    const dataSub = term.onData((d) => sendInputRef.current(d));
    sendResizeRef.current(term.cols, term.rows); // seed geometry for attach
    setReady(true);

    const observer = new ResizeObserver(() => {
      if (!fitRef.current || !termRef.current) return;
      try {
        fitRef.current.fit();
        sendResizeRef.current(termRef.current.cols, termRef.current.rows);
      } catch {
        // container not measurable yet
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      dataSub.dispose();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      setReady(false);
    };
  }, []);

  // Re-theme in place when the app theme flips.
  useEffect(() => {
    if (termRef.current) termRef.current.options.theme = TERMINAL_THEMES[resolved];
  }, [resolved]);

  const exited = phase === 'exited';

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="font-mono">
          {session.projectDisplay}
          {command ? ` · ${command.split('/').pop()}` : ''}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background:
                connectionState === 'open'
                  ? 'hsl(142 71% 45%)'
                  : connectionState === 'error'
                    ? 'hsl(0 72% 55%)'
                    : 'hsl(38 92% 50%)',
            }}
          />
          {exited ? 'Session ended' : STATUS_HINT[connectionState]}
        </span>
      </div>
      <div
        ref={containerRef}
        role="group"
        aria-label="Session terminal"
        onClick={() => termRef.current?.focus()}
        className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border/60 bg-[#0d0d12] p-2 dark:bg-[#0d0d12]"
      />
    </div>
  );
}
