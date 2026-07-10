'use client';

import { useState } from 'react';
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
  AlertTriangle,
  Check,
  ExternalLink,
  GripVertical,
  Loader2,
  Plus,
  RotateCw,
  Upload,
  X,
} from 'lucide-react';
import type { SourceIngestState, SourceKind } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { SourceIcon } from '@/components/source-icon';
import { cn } from '@/lib/utils';

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

/** The minimal shape this editor needs from a source row. */
export type EditableSource = {
  id: string;
  /** Absent for an uploaded file source. */
  url?: string;
  kind: SourceKind;
  title?: string;
  faviconUrl?: string;
  /** Uploaded-file name (Phase 65 B). */
  fileName?: string;
  /** Ingestion status (Phase 65 B): null/undefined = not ingested. */
  ingestState?: SourceIngestState | null;
  ingestError?: string | null;
};

/** Reorder a list of items to match an explicit id order (drops unknown ids). */
export function orderByIds<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return ids.map((id) => byId.get(id)).filter((x): x is T => x != null);
}

type Props = {
  /** Rendered in the given order — the parent owns the canonical order. */
  sources: EditableSource[];
  /** Hard cap; the input disables once reached. */
  max: number;
  disabled?: boolean;
  placeholder?: string;
  /** Add a URL. May be async (live) or sync (create-mode staging). */
  onAdd: (url: string) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
  /** Persist a new order. The parent should apply it optimistically. */
  onReorder: (orderedIds: string[]) => void | Promise<void>;
  /** Re-run ingestion for a source (Phase 65 B). Enables status + retry UI. */
  onReingest?: (id: string) => void | Promise<void>;
  /** Upload a file as a source (Phase 65 B). Enables the upload affordance. */
  onUploadFile?: (file: File) => void | Promise<void>;
  /** `accept` for the upload input (e.g. ".pdf,.md,.txt"). */
  uploadAccept?: string;
};

/**
 * The shared sources editor: paste a URL to add, drag the grip to reorder, and
 * remove. Controlled — `sources` is the source of truth and the parent applies
 * reorders optimistically. Used by projects and memories.
 */
export function SourceListEditor({
  sources,
  max,
  disabled,
  placeholder,
  onAdd,
  onRemove,
  onReorder,
  onReingest,
  onUploadFile,
  uploadAccept,
}: Props) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const atLimit = sources.length >= max;

  const upload = async (file: File | undefined) => {
    if (!file || !onUploadFile) return;
    if (atLimit) {
      setError(`Up to ${max} sources`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onUploadFile(file);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const reingest = async (id: string) => {
    if (!onReingest) return;
    setError(null);
    try {
      await onReingest(id);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const add = async () => {
    const u = url.trim();
    if (!u) return;
    try {
      new URL(u);
    } catch {
      setError('Enter a full URL, including https://');
      return;
    }
    if (atLimit) {
      setError(`Up to ${max} sources`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onAdd(u);
      setUrl('');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    setBusy(true);
    try {
      await onRemove(id);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = sources.map((s) => s.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    setError(null);
    Promise.resolve(onReorder(arrayMove(ids, from, to))).catch((e) => setError(errMsg(e)));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          className={inputClass}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void add();
            }
          }}
          placeholder={placeholder ?? 'Paste a GitHub, Notion, Google Docs or any link'}
          disabled={atLimit || busy || disabled}
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => void add()}
          disabled={atLimit || busy || disabled || !url.trim()}
          aria-label="Add source"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
        {onUploadFile ? (
          <label
            className={cn(
              'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:text-foreground',
              (atLimit || busy || disabled) && 'cursor-not-allowed opacity-50',
            )}
            title="Upload a file (PDF, Markdown, text)"
            aria-label="Upload a file source"
          >
            <Upload className="h-4 w-4" />
            <input
              type="file"
              accept={uploadAccept}
              className="sr-only"
              disabled={atLimit || busy || disabled}
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        ) : null}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sources.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1.5">
            {sources.map((s) => (
              <SortableSourceRow
                key={s.id}
                source={s}
                disabled={disabled || busy}
                onRemove={() => void remove(s.id)}
                onReingest={onReingest ? () => void reingest(s.id) : undefined}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

/** One draggable source row: grip reorders, icon + title, ingest status, open, remove. */
function SortableSourceRow({
  source: s,
  disabled,
  onRemove,
  onReingest,
}: {
  source: EditableSource;
  disabled?: boolean;
  onRemove: () => void;
  onReingest?: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: s.id, disabled });

  const label = s.title ?? s.fileName ?? s.url ?? 'Source';

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5',
        isDragging && 'relative z-10 shadow-lg',
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label="Reorder source"
        className="shrink-0 cursor-grab touch-none rounded text-muted-foreground hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <SourceIcon kind={s.kind} faviconUrl={s.faviconUrl} url={s.url} />
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>

      <IngestStatus source={s} onReingest={onReingest} disabled={disabled} />

      {s.url ? (
        <a
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open source in new tab"
          className="text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Remove source"
        className="text-muted-foreground hover:text-destructive disabled:opacity-40"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

/** The per-source ingestion indicator (Phase 65 B). Hidden when ingestion isn't
 *  wired for this list (no `onReingest`). */
function IngestStatus({
  source: s,
  onReingest,
  disabled,
}: {
  source: EditableSource;
  onReingest?: () => void;
  disabled?: boolean;
}) {
  if (!onReingest) return null;
  if (s.ingestState === 'pending') {
    return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" aria-label="Reading source" />;
  }
  if (s.ingestState === 'ready') {
    return <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-label="Source read" />;
  }
  // failed or not-yet-ingested → offer a (re)read action.
  const failed = s.ingestState === 'failed';
  return (
    <button
      type="button"
      onClick={onReingest}
      disabled={disabled}
      aria-label={failed ? 'Retry reading source' : 'Read source'}
      title={failed ? `Failed to read${s.ingestError ? `: ${s.ingestError}` : ''} — retry` : 'Read source'}
      className={cn(
        'shrink-0 disabled:opacity-40',
        failed ? 'text-amber-500 hover:text-amber-400' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {failed ? <AlertTriangle className="h-3.5 w-3.5" /> : <RotateCw className="h-3.5 w-3.5" />}
    </button>
  );
}
