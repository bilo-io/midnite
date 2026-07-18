'use client';

import { useState } from 'react';
import { OctagonX, Pause, Play } from 'lucide-react';
import type { GuardrailSettings } from '@midnite/shared';
import { emergencyStopGuardrails, pauseGuardrails } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { HoverExpandButton } from '@/components/hover-expand-button';
import { useConfirm } from '@/components/confirm-dialog';
import { useToast } from '@/components/toast';

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

  const run = async (fn: () => Promise<GuardrailSettings>, ok: string) => {
    setBusy(true);
    try {
      onChange(await fn());
      toast.success(ok);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // Paused: a single amber Resume affordance (the full-width banner announces the
  // paused state below the toolbar).
  if (guardrails.pausedGlobal) {
    return (
      <HoverExpandButton
        icon={<Play className="h-3.5 w-3.5" />}
        label="Resume scheduling"
        variant="secondary"
        disabled={busy}
        onClick={() => void run(() => pauseGuardrails(GLOBAL, false), 'Scheduling resumed')}
        className="border border-amber-500/40 text-amber-600 dark:text-amber-400"
      />
    );
  }

  // Running: pause + emergency-stop surfaced directly (Phase 50 A) as icon-only
  // controls that reveal their label on hover/focus — no dropdown.
  const emergencyStop = () =>
    void (async () => {
      const okd = await confirm({
        title: 'Emergency stop?',
        description:
          'Pauses all scheduling and aborts every in-flight agent. Aborted tasks return to Todo and re-run when you resume.',
        confirmLabel: 'Emergency stop',
      });
      if (okd) await run(() => emergencyStopGuardrails(GLOBAL), 'Emergency stop — agents aborted');
    })();

  return (
    <div className="flex items-center gap-1">
      <HoverExpandButton
        icon={<Pause className="h-3.5 w-3.5" />}
        label="Pause scheduling"
        variant="ghost"
        disabled={busy}
        onClick={() => void run(() => pauseGuardrails(GLOBAL, true), 'Scheduling paused')}
        className="text-muted-foreground"
      />
      <HoverExpandButton
        icon={<OctagonX className="h-3.5 w-3.5" />}
        label="Emergency stop"
        variant="ghost"
        disabled={busy}
        onClick={emergencyStop}
        className="text-red-600 hover:bg-destructive/15 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400"
      />
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
