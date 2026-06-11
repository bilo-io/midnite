'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import {
  AGENT_CLIS,
  AGENT_CLI_LABEL,
  type AgentCli,
  type CouncilParticipant,
} from '@midnite/shared';
import { AgentCliLogo } from '@/components/agent-cli-logo';
import { Button } from '@/components/ui/button';
import {
  createCouncilParticipant,
  deleteCouncilParticipant,
  updateCouncilParticipant,
} from '@/lib/api';

const SAVE_DEBOUNCE_MS = 600;

const inputClass =
  'flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
const textareaClass =
  'flex min-h-[72px] w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

type Props = {
  councilId: string;
  participants: CouncilParticipant[];
  /** The CLI that judges the anonymized takes. */
  verdictProvider: AgentCli;
  /** Edits are locked while a run is live — the run snapshots at start. */
  disabled: boolean;
  onChanged: (participants: CouncilParticipant[]) => void;
  onVerdictProviderChange: (cli: AgentCli) => void;
};

/**
 * Right-side panel managing the council's standing participants: per
 * participant a name, a provider (agent CLI), and a free-text perspective.
 * Saves are debounced per participant (pattern: agents-view subagent editor).
 */
export function CouncilParticipantsPanel({
  councilId,
  participants,
  verdictProvider,
  disabled,
  onChanged,
  onVerdictProviderChange,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(participants);
  latest.current = participants;

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of pending.values()) clearTimeout(t);
      clearTimeout(savedTimer.current);
    };
  }, []);

  const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Save failed');

  const flashSaved = () => {
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1500);
  };

  const scheduleSave = (id: string) => {
    const existing = timers.current.get(id);
    if (existing) clearTimeout(existing);
    timers.current.set(
      id,
      setTimeout(() => {
        const p = latest.current.find((x) => x.id === id);
        if (!p) return;
        updateCouncilParticipant(councilId, id, {
          name: p.name,
          provider: p.provider,
          perspective: p.perspective,
        })
          .then(flashSaved)
          .catch((e) => setError(errMsg(e)));
      }, SAVE_DEBOUNCE_MS),
    );
  };

  const edit = (id: string, patch: Partial<CouncilParticipant>) => {
    onChanged(latest.current.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    scheduleSave(id);
  };

  const add = async () => {
    setError(null);
    try {
      const created = await createCouncilParticipant(councilId, {});
      onChanged([...latest.current, created]);
      flashSaved();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const remove = async (id: string) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setError(null);
    try {
      await deleteCouncilParticipant(councilId, id);
      onChanged(latest.current.filter((p) => p.id !== id));
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <aside className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Participants</h2>
        <div className="flex items-center gap-2">
          {saved ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3 w-3" /> Saved
            </span>
          ) : null}
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void add()}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/40 p-3">
        <label
          htmlFor="council-verdict-provider"
          className="text-xs font-medium text-muted-foreground"
        >
          Verdict by
        </label>
        <div className="flex items-center gap-2">
          <AgentCliLogo cli={verdictProvider} className="h-4 w-4 shrink-0" />
          <select
            id="council-verdict-provider"
            className={inputClass}
            value={verdictProvider}
            disabled={disabled}
            onChange={(e) => onVerdictProviderChange(e.target.value as AgentCli)}
          >
            {AGENT_CLIS.map((cli) => (
              <option key={cli} value={cli}>
                {AGENT_CLI_LABEL[cli]}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Weighs the anonymized takes and writes the verdict — it never sees who said what.
        </p>
      </div>

      {participants.length < 2 ? (
        <p className="text-xs text-muted-foreground">
          Add at least 2 participants — each argues the topic from its own perspective.
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-3">
        {participants.map((p, i) => (
          <div key={p.id} className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="flex items-center gap-2">
              <input
                aria-label={`Participant ${i + 1} name`}
                className={inputClass}
                value={p.name}
                disabled={disabled}
                onChange={(e) => edit(p.id, { name: e.target.value })}
                placeholder={`Participant ${i + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${p.name.trim() || `participant ${i + 1}`}`}
                disabled={disabled}
                onClick={() => void remove(p.id)}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <AgentCliLogo cli={p.provider} className="h-4 w-4 shrink-0" />
              <select
                aria-label={`Participant ${i + 1} provider`}
                className={inputClass}
                value={p.provider}
                disabled={disabled}
                onChange={(e) => edit(p.id, { provider: e.target.value as AgentCli })}
              >
                {AGENT_CLIS.map((cli) => (
                  <option key={cli} value={cli}>
                    {AGENT_CLI_LABEL[cli]}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              aria-label={`Participant ${i + 1} perspective`}
              className={textareaClass}
              value={p.perspective}
              disabled={disabled}
              onChange={(e) => edit(p.id, { perspective: e.target.value })}
              placeholder="Perspective on the matter — e.g. “Argue for the smallest change that ships this quarter.”"
            />
          </div>
        ))}
      </div>
    </aside>
  );
}
