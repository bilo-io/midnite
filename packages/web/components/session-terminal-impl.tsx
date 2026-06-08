'use client';

import '@xterm/xterm/css/xterm.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal, type ITheme } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Send } from 'lucide-react';
import type {
  ApprovalDecision,
  SessionSummary,
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

export function SessionTerminalImpl({ session }: { session: SessionSummary }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<TerminalStatusPhase | null>(null);
  const [command, setCommand] = useState<string | null>(null);
  const [pending, setPending] = useState<TerminalApprovalRequestMessage[]>([]);
  const [draft, setDraft] = useState('');

  const { resolved } = useTheme();
  const resolvedRef = useRef(resolved);
  resolvedRef.current = resolved;

  const { connectionState, sendInput, sendResize, sendApproval } = useTerminalSocket({
    sessionId: session.id,
    enabled: ready,
    onOutput: (bytes) => termRef.current?.write(bytes),
    onStatus: (p, cmd) => {
      setPhase(p);
      if (cmd) setCommand(cmd);
    },
    onApprovalRequest: (req) =>
      setPending((prev) =>
        prev.some((p) => p.requestId === req.requestId) ? prev : [...prev, req],
      ),
    onApprovalResolved: (requestId) =>
      setPending((prev) => prev.filter((p) => p.requestId !== requestId)),
  });

  const answer = useCallback(
    (requestId: string, decision: ApprovalDecision) => {
      sendApproval(requestId, decision);
      setPending((prev) => prev.filter((p) => p.requestId !== requestId));
    },
    [sendApproval],
  );

  const send = useCallback(() => {
    if (connectionState !== 'open') return;
    sendInput(draft + '\r'); // a CR submits to the shell or to Claude's prompt
    setDraft('');
  }, [connectionState, draft, sendInput]);

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
      <div className="relative min-h-0 flex-1">
        <div
          ref={containerRef}
          role="group"
          aria-label="Session terminal"
          onClick={() => termRef.current?.focus()}
          className="h-full overflow-hidden rounded-lg border border-border/60 bg-[#0d0d12] p-2 dark:bg-[#0d0d12]"
        />
        {current ? <ApprovalOverlay request={current} onAnswer={answer} /> : null}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Message the session — Enter to send, Shift+Enter for newline"
          className="max-h-32 min-h-[2.25rem] flex-1 resize-y rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button
          type="button"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={send}
          disabled={connectionState !== 'open'}
          aria-label="Send to session"
        >
          <Send className="h-4 w-4" />
        </Button>
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
