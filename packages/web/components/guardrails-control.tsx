'use client';

import { useState } from 'react';
import { OctagonX, Pause, Play, ShieldCheck } from 'lucide-react';
import type { GuardrailSettings } from '@midnite/shared';
import { emergencyStopGuardrails, pauseGuardrails } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/confirm-dialog';
import { useToast } from '@/components/toast';
import { cn } from '@/lib/utils';

const GLOBAL = { kind: 'global' } as const;

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Guardrail change failed';
}

type Props = {
  guardrails: GuardrailSettings;
  onChange: (next: GuardrailSettings) => void;
};

/**
 * Phase 50 A — a compact global pause / emergency-stop control for the board
 * toolbar. Pausing is a soft scheduling gate (running agents finish); an
 * emergency stop also aborts in-flight agents (requeued to todo). The actual
 * authorization is enforced server-side (admin-only); a non-admin sees the error.
 */
export function GuardrailsControl({ guardrails, onChange }: Props) {
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const run = async (fn: () => Promise<GuardrailSettings>, ok: string) => {
    setBusy(true);
    try {
      onChange(await fn());
      toast.success(ok);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  if (guardrails.pausedGlobal) {
    return (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => void run(() => pauseGuardrails(GLOBAL, false), 'Scheduling resumed')}
        className="h-8 gap-1.5 border border-amber-500/40 text-amber-600 dark:text-amber-400"
      >
        <Play className="h-3.5 w-3.5" /> Resume
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Safety controls"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="h-8 w-8 text-muted-foreground"
      >
        <ShieldCheck className="h-4 w-4" />
      </Button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-1 w-52 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => void run(() => pauseGuardrails(GLOBAL, true), 'Scheduling paused')}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
            >
              <Pause className="h-3.5 w-3.5 text-muted-foreground" />
              Pause scheduling
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() =>
                void (async () => {
                  const okd = await confirm({
                    title: 'Emergency stop?',
                    description:
                      'Pauses all scheduling and aborts every in-flight agent. Aborted tasks return to Todo and re-run when you resume.',
                    confirmLabel: 'Emergency stop',
                  });
                  if (okd) await run(() => emergencyStopGuardrails(GLOBAL), 'Emergency stop — agents aborted');
                })()
              }
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs',
                'text-red-600 hover:bg-destructive/15 dark:text-red-400',
              )}
            >
              <OctagonX className="h-3.5 w-3.5" />
              Emergency stop
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * Full-width paused banner shown on the board whenever scheduling is halted
 * (global, or any repo/team scope). Resume clears a global pause inline.
 */
export function GuardrailsBanner({ guardrails, onChange }: Props) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const scoped = guardrails.pausedRepos.length + guardrails.pausedTeams.length;

  if (!guardrails.pausedGlobal && scoped === 0) return null;

  const resumeGlobal = async () => {
    setBusy(true);
    try {
      onChange(await pauseGuardrails(GLOBAL, false));
      toast.success('Scheduling resumed');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
    >
      <Pause className="h-4 w-4 shrink-0" />
      <span className="font-medium">
        {guardrails.pausedGlobal
          ? 'Scheduling paused — no new agents will start.'
          : `Scheduling paused for ${scoped} scope${scoped === 1 ? '' : 's'}.`}
      </span>
      {guardrails.pausedGlobal ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void resumeGlobal()}
          className="ml-auto h-6 gap-1 px-2 text-[11px]"
        >
          <Play className="h-3 w-3" /> Resume
        </Button>
      ) : null}
    </div>
  );
}
