'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Check,
  ChevronDown,
  GripVertical,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Scale,
  Trash2,
  Users,
} from 'lucide-react';
import {
  AGENT_CLIS,
  AGENT_CLI_LABEL,
  type AgentCli,
  type CouncilParticipant,
} from '@midnite/shared';
import { AgentCliLogo } from '@/components/agent-cli-logo';
import { Button } from '@/components/ui/button';
import { Collapse } from '@/components/ui/collapse';
import { Select, type SelectOption } from '@/components/ui/select';
import {
  createCouncilParticipant,
  deleteCouncilParticipant,
  reorderCouncilParticipants,
  updateCouncilParticipant,
} from '@/lib/api';
import { cn } from '@/lib/utils';

const SAVE_DEBOUNCE_MS = 600;

const textareaClass =
  'flex min-h-[72px] w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

/** Provider choices with their brand mark, shared by the verdict + participant dropdowns. */
const PROVIDER_OPTIONS: SelectOption<AgentCli>[] = AGENT_CLIS.map((cli) => ({
  value: cli,
  label: AGENT_CLI_LABEL[cli],
  icon: <AgentCliLogo cli={cli} className="h-4 w-4" />,
}));

type Props = {
  councilId: string;
  participants: CouncilParticipant[];
  /** The CLI that judges the anonymized takes. */
  verdictProvider: AgentCli;
  /** Edits are locked while a run is live — the run snapshots at start. */
  disabled: boolean;
  onChanged: (participants: CouncilParticipant[]) => void;
  onVerdictProviderChange: (cli: AgentCli) => void;
  open: boolean;
  onToggle: () => void;
};

/**
 * Collapsible right-side panel managing the council's standing participants.
 * Each participant collapses to a compact chevron + logo + name row and
 * expands to the full form (name, provider, perspective). Saves are debounced
 * per participant (pattern: agents-view subagent editor).
 */
export function CouncilParticipantsPanel({
  councilId,
  participants,
  verdictProvider,
  disabled,
  onChanged,
  onVerdictProviderChange,
  open,
  onToggle,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Compact by default; a participant opens for editing (new ones auto-open).
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
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

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      setExpanded((prev) => new Set(prev).add(created.id));
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

  // Drag a participant to reorder; this order drives the run's tab order. Apply
  // optimistically, persist, and roll back to the pre-drag order on failure.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const prev = latest.current;
    const from = prev.findIndex((p) => p.id === active.id);
    const to = prev.findIndex((p) => p.id === over.id);
    if (from === -1 || to === -1) return;
    const reordered = arrayMove(prev, from, to);
    setError(null);
    onChanged(reordered);
    reorderCouncilParticipants(councilId, reordered.map((p) => p.id))
      .then(onChanged)
      .catch((e) => {
        onChanged(prev);
        setError(errMsg(e));
      });
  };

  if (!open) {
    return (
      <aside className="hidden shrink-0 lg:sticky lg:top-16 lg:block">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Expand participants"
          title={`Participants (${participants.length})`}
          onClick={onToggle}
          className="h-9 w-9 text-muted-foreground"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4 lg:sticky lg:top-16 lg:max-h-[calc(100dvh-4.5rem)] lg:w-[320px] lg:overflow-y-auto">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Users className="h-4 w-4 text-muted-foreground" />
          Participants
        </h2>
        <div className="flex items-center gap-1.5">
          {saved ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3 w-3" /> Saved
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => void add()}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Collapse participants"
            onClick={onToggle}
            className="h-7 w-7 text-muted-foreground"
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* The judge — visually set apart from the debating participants. */}
      <div className="space-y-2 rounded-lg border border-foreground/15 bg-accent/40 p-3 shadow-sm">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          <Scale className="h-3.5 w-3.5" />
          Verdict by
        </span>
        <Select
          aria-label="Verdict provider"
          options={PROVIDER_OPTIONS}
          value={verdictProvider}
          onChange={onVerdictProviderChange}
          disabled={disabled}
        />
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={participants.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {participants.map((p, i) => (
              <SortableParticipant
                key={p.id}
                participant={p}
                index={i}
                isOpen={expanded.has(p.id)}
                disabled={disabled}
                onToggle={() => toggleExpanded(p.id)}
                onEdit={(patch) => edit(p.id, patch)}
                onRemove={() => void remove(p.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </aside>
  );
}

/** One draggable participant: a grip handle reorders, the title region toggles
 *  the body, the name edits inline, and a hover-revealed button removes it. */
function SortableParticipant({
  participant: p,
  index,
  isOpen,
  disabled,
  onToggle,
  onEdit,
  onRemove,
}: {
  participant: CouncilParticipant;
  index: number;
  isOpen: boolean;
  disabled: boolean;
  onToggle: () => void;
  onEdit: (patch: Partial<CouncilParticipant>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: p.id, disabled });
  const name = p.name.trim() || `Participant ${index + 1}`;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group rounded-lg border border-border/60 bg-background/40 transition-colors',
        isOpen && 'bg-background/60',
        isDragging && 'relative z-10 shadow-lg',
      )}
    >
      {/* Title region: grip drags, chevron+logo toggles, the name edits inline,
          and the remove button reveals on hover/focus at the far right. */}
      <div className="flex items-center gap-1.5 p-2.5">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label={`Reorder ${name}`}
          className="shrink-0 cursor-grab touch-none rounded text-muted-foreground/50 hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${name}`}
          className="flex shrink-0 items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', !isOpen && '-rotate-90')} />
          <AgentCliLogo cli={p.provider} className="h-4 w-4" />
        </button>
        <input
          aria-label={`${name} name`}
          value={p.name}
          disabled={disabled}
          onChange={(e) => onEdit({ name: e.target.value })}
          placeholder={`Participant ${index + 1}`}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove ${name}`}
          disabled={disabled}
          onClick={onRemove}
          className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Collapse open={isOpen}>
        <div className="space-y-2 px-2.5 pb-2.5">
          <Select
            aria-label={`${name} provider`}
            options={PROVIDER_OPTIONS}
            value={p.provider}
            disabled={disabled}
            onChange={(provider) => onEdit({ provider })}
          />

          <textarea
            aria-label={`${name} perspective`}
            className={textareaClass}
            value={p.perspective}
            disabled={disabled}
            onChange={(e) => onEdit({ perspective: e.target.value })}
            placeholder="Perspective on the matter — e.g. “Argue for the smallest change that ships this quarter.”"
          />
        </div>
      </Collapse>
    </div>
  );
}
