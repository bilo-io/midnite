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
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import {
  AGENT_CLIS,
  AGENT_CLI_LABEL,
  BRAINSTORM_SYNTH_MODES,
  BRAINSTORM_SYNTH_MODE_LABEL,
  type AgentCli,
  type BrainstormContributor,
  type BrainstormSynthMode,
} from '@midnite/shared';
import { AgentCliLogo } from '@/components/agent-cli-logo';
import { Button } from '@/components/ui/button';
import { Collapse } from '@/components/ui/collapse';
import { Select, type SelectOption } from '@/components/ui/select';
import {
  createBrainstormContributor,
  deleteBrainstormContributor,
  reorderBrainstormContributors,
  updateBrainstormContributor,
} from '@/lib/api';
import { cn } from '@/lib/utils';

const SAVE_DEBOUNCE_MS = 600;

const textareaClass =
  'flex min-h-[72px] w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

/** Provider choices with their brand mark, shared by the synthesizer + contributor dropdowns. */
const PROVIDER_OPTIONS: SelectOption<AgentCli>[] = AGENT_CLIS.map((cli) => ({
  value: cli,
  label: AGENT_CLI_LABEL[cli],
  icon: <AgentCliLogo cli={cli} className="h-4 w-4" />,
}));

const MODE_OPTIONS: SelectOption<BrainstormSynthMode>[] = BRAINSTORM_SYNTH_MODES.map((m) => ({
  value: m,
  label: BRAINSTORM_SYNTH_MODE_LABEL[m],
}));

type Props = {
  brainstormId: string;
  contributors: BrainstormContributor[];
  /** The CLI that distills the pooled ideas into the synthesis. */
  synthProvider: AgentCli;
  /** Mode pre-selected for new runs. */
  defaultMode: BrainstormSynthMode;
  /** Edits are locked while a run is live — the run snapshots at start. */
  disabled: boolean;
  onChanged: (contributors: BrainstormContributor[]) => void;
  onSynthProviderChange: (cli: AgentCli) => void;
  onDefaultModeChange: (mode: BrainstormSynthMode) => void;
  open: boolean;
  onToggle: () => void;
};

/**
 * Collapsible right-side panel managing the brainstorm's standing contributors.
 * Each contributor collapses to a compact chevron + logo + name row and expands
 * to the full form (name, provider, lens). Saves are debounced per contributor
 * (pattern: council participants panel).
 */
export function BrainstormContributorsPanel({
  brainstormId,
  contributors,
  synthProvider,
  defaultMode,
  disabled,
  onChanged,
  onSynthProviderChange,
  onDefaultModeChange,
  open,
  onToggle,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Compact by default; a contributor opens for editing (new ones auto-open).
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(contributors);
  latest.current = contributors;

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
        const c = latest.current.find((x) => x.id === id);
        if (!c) return;
        updateBrainstormContributor(brainstormId, id, {
          name: c.name,
          provider: c.provider,
          lens: c.lens,
        })
          .then(flashSaved)
          .catch((e) => setError(errMsg(e)));
      }, SAVE_DEBOUNCE_MS),
    );
  };

  const edit = (id: string, patch: Partial<BrainstormContributor>) => {
    onChanged(latest.current.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    scheduleSave(id);
  };

  const add = async () => {
    setError(null);
    try {
      const created = await createBrainstormContributor(brainstormId, {});
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
      await deleteBrainstormContributor(brainstormId, id);
      onChanged(latest.current.filter((c) => c.id !== id));
    } catch (e) {
      setError(errMsg(e));
    }
  };

  // Drag a contributor to reorder; this order drives the run's tab order. Apply
  // optimistically, persist, and roll back to the pre-drag order on failure.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const prev = latest.current;
    const from = prev.findIndex((c) => c.id === active.id);
    const to = prev.findIndex((c) => c.id === over.id);
    if (from === -1 || to === -1) return;
    const reordered = arrayMove(prev, from, to);
    setError(null);
    onChanged(reordered);
    reorderBrainstormContributors(brainstormId, reordered.map((c) => c.id))
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
          aria-label="Expand contributors"
          title={`Contributors (${contributors.length})`}
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
          Contributors
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
            aria-label="Collapse contributors"
            onClick={onToggle}
            className="h-7 w-7 text-muted-foreground"
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* The synthesizer — visually set apart from the contributors. */}
      <div className="space-y-2 rounded-lg border border-foreground/15 bg-accent/40 p-3 shadow-sm">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" />
          Synthesize with
        </span>
        <Select
          aria-label="Synthesizer provider"
          options={PROVIDER_OPTIONS}
          value={synthProvider}
          onChange={onSynthProviderChange}
          disabled={disabled}
        />
        <span className="block pt-1 text-[11px] font-medium text-muted-foreground">Default mode</span>
        <Select
          aria-label="Default synthesis mode"
          options={MODE_OPTIONS}
          value={defaultMode}
          onChange={onDefaultModeChange}
          disabled={disabled}
        />
        <p className="text-[11px] leading-snug text-muted-foreground">
          Distills the pooled ideas. The mode is pre-selected for new runs and can be switched per run —
          and re-run over the same ideas.
        </p>
      </div>

      {contributors.length < 1 ? (
        <p className="text-xs text-muted-foreground">
          Add at least 1 contributor — each generates ideas through its own lens.
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={contributors.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {contributors.map((c, i) => (
              <SortableContributor
                key={c.id}
                contributor={c}
                index={i}
                isOpen={expanded.has(c.id)}
                disabled={disabled}
                onToggle={() => toggleExpanded(c.id)}
                onEdit={(patch) => edit(c.id, patch)}
                onRemove={() => void remove(c.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </aside>
  );
}

/** One draggable contributor: a grip handle reorders, the title region toggles
 *  the body, the name edits inline, and a hover-revealed button removes it. */
function SortableContributor({
  contributor: c,
  index,
  isOpen,
  disabled,
  onToggle,
  onEdit,
  onRemove,
}: {
  contributor: BrainstormContributor;
  index: number;
  isOpen: boolean;
  disabled: boolean;
  onToggle: () => void;
  onEdit: (patch: Partial<BrainstormContributor>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: c.id, disabled });
  const name = c.name.trim() || `Contributor ${index + 1}`;

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
          <AgentCliLogo cli={c.provider} className="h-4 w-4" />
        </button>
        <input
          aria-label={`${name} name`}
          value={c.name}
          disabled={disabled}
          onChange={(e) => onEdit({ name: e.target.value })}
          placeholder={`Contributor ${index + 1}`}
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
            value={c.provider}
            disabled={disabled}
            onChange={(provider) => onEdit({ provider })}
          />

          <textarea
            aria-label={`${name} lens`}
            className={textareaClass}
            value={c.lens}
            disabled={disabled}
            onChange={(e) => onEdit({ lens: e.target.value })}
            placeholder="Lens to generate ideas through — e.g. “Reason up from first principles.”"
          />
        </div>
      </Collapse>
    </div>
  );
}
