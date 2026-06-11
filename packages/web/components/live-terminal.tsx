'use client';

import '@xterm/xterm/css/xterm.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal, type ITheme } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import type {
  ApprovalDecision,
  TerminalApprovalRequestMessage,
  TerminalStatusPhase,
} from '@midnite/shared';
import { useTerminalSocket, type TerminalConnectionState } from '@/hooks/use-terminal-socket';
import { useTheme } from '@/app/theme/theme-context';
import { Button } from '@/components/ui/button';

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

type Props = {
  /** The PTY to attach to — a session id or an ad-hoc id. */
  attachId: string;
  /** Shown in the status header (e.g. a project path or CLI name). */
  label: string;
  /** Whether to surface Claude Code tool-approval prompts (session terminals only). */
  approvals?: boolean;
  /** Accessible label for the terminal region. */
  ariaLabel?: string;
};

/**
 * A live xterm view wired to the gateway PTY for `attachId`: mounts the terminal,
 * streams output, forwards input/resize, and (optionally) renders tool-approval
 * prompts. Used by both session terminals and standalone install terminals.
 */
export function LiveTerminal({ attachId, label, approvals = false, ariaLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<TerminalStatusPhase | null>(null);
  const [command, setCommand] = useState<string | null>(null);
  const [pending, setPending] = useState<TerminalApprovalRequestMessage[]>([]);

  const { resolved } = useTheme();
  const resolvedRef = useRef(resolved);
  resolvedRef.current = resolved;

  const { connectionState, sendInput, sendResize, sendApproval } = useTerminalSocket({
    attachId,
    enabled: ready,
    onOutput: (bytes) => termRef.current?.write(bytes),
    onStatus: (p, cmd) => {
      setPhase(p);
      if (cmd) setCommand(cmd);
    },
    onApprovalRequest: approvals
      ? (req) =>
          setPending((prev) =>
            prev.some((p) => p.requestId === req.requestId) ? prev : [...prev, req],
          )
      : undefined,
    onApprovalResolved: approvals
      ? (requestId) => setPending((prev) => prev.filter((p) => p.requestId !== requestId))
      : undefined,
  });

  const answer = useCallback(
    (requestId: string, decision: ApprovalDecision) => {
      sendApproval(requestId, decision);
      setPending((prev) => prev.filter((p) => p.requestId !== requestId));
    },
    [sendApproval],
  );

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
  const current = pending[0] ?? null;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="font-mono">
          {label}
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
      <div className="relative min-h-0 flex-1">
        <div
          ref={containerRef}
          role="group"
          aria-label={ariaLabel ?? 'Terminal'}
          onClick={() => termRef.current?.focus()}
          className="h-full overflow-hidden rounded-lg border border-border/60 p-2"
          style={{ background: TERMINAL_THEMES[resolved].background }}
        />
        {current ? <ApprovalOverlay request={current} onAnswer={answer} /> : null}
      </div>
    </div>
  );
}

const APPROVAL_LABELS: Record<ApprovalDecision, string> = {
  allow: 'Accept',
  'allow-session': 'Accept for session',
  deny: 'Deny',
};

function ApprovalOverlay({
  request,
  onAnswer,
}: {
  request: TerminalApprovalRequestMessage;
  onAnswer: (requestId: string, decision: ApprovalDecision) => void;
}) {
  return (
    <div className="absolute inset-x-3 bottom-3 z-10 rounded-lg border border-border bg-card/95 p-3 shadow-xl backdrop-blur">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Approval needed
      </p>
      <p className="mt-1 break-words font-mono text-sm">{request.summary}</p>
      {request.cwd ? (
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{request.cwd}</p>
      ) : null}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {request.options.map((opt) => (
          <Button
            key={opt}
            type="button"
            size="sm"
            variant={opt === 'deny' ? 'destructive' : opt === 'allow' ? 'default' : 'secondary'}
            onClick={() => onAnswer(request.requestId, opt)}
          >
            {APPROVAL_LABELS[opt]}
          </Button>
        ))}
      </div>
    </div>
  );
}
