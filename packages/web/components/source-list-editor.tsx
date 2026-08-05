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
import { useTranslations } from 'next-intl';
import type { SourceIngestState, SourceKind } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { SourceIcon } from '@/components/source-icon';
import { cn } from '@/lib/utils';

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

/** A thrown value's message, or the caller's translated fallback for a non-`Error`. */
function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
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
  /** Show the inline add row (URL input + upload). Off when adds go via a modal. */
  showAdd?: boolean;
  /** Allow drag-to-reorder. Off while a filter/search narrows the visible rows. */
  reorderable?: boolean;
  /** Open a source's detail view — makes each row's title clickable. */
  onOpen?: (source: EditableSource) => void | Promise<void>;
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
  showAdd = true,
  reorderable = true,
  onOpen,
}: Props) {
  const t = useTranslations('memory');
  const tCommon = useTranslations('common');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const atLimit = sources.length >= max;
  const fallbackError = tCommon('errorTitle');

  const upload = async (file: File | undefined) => {
    if (!file || !onUploadFile) return;
    if (atLimit) {
      setError(t('sourceEditor.atLimit', { count: max }));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onUploadFile(file);
    } catch (e) {
      setError(errMsg(e, fallbackError));
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
      setError(errMsg(e, fallbackError));
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
      setError(t('sourceEditor.invalidUrl'));
      return;
    }
    if (atLimit) {
      setError(t('sourceEditor.atLimit', { count: max }));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onAdd(u);
      setUrl('');
    } catch (e) {
      setError(errMsg(e, fallbackError));
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
      setError(errMsg(e, fallbackError));
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
    Promise.resolve(onReorder(arrayMove(ids, from, to))).catch((e) => setError(errMsg(e, fallbackError)));
  };

  return (
    <div className="space-y-2">
      {showAdd ? (
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
            placeholder={placeholder ?? t('sourceEditor.urlPlaceholder')}
            disabled={atLimit || busy || disabled}
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => void add()}
            disabled={atLimit || busy || disabled || !url.trim()}
            aria-label={t('sourceEditor.addSource')}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
          {onUploadFile ? (
            <label
              className={cn(
                'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:text-foreground',
                (atLimit || busy || disabled) && 'cursor-not-allowed opacity-50',
              )}
              title={t('sourceEditor.uploadTitle')}
              aria-label={t('sourceEditor.uploadLabel')}
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
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sources.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1.5">
            {sources.map((s) => (
              <SortableSourceRow
                key={s.id}
                source={s}
                disabled={disabled || busy}
                reorderable={reorderable}
                onRemove={() => void remove(s.id)}
                onReingest={onReingest ? () => void reingest(s.id) : undefined}
                onOpen={onOpen ? () => void onOpen(s) : undefined}
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
  reorderable = true,
  onRemove,
  onReingest,
  onOpen,
}: {
  source: EditableSource;
  disabled?: boolean;
  reorderable?: boolean;
  onRemove: () => void;
  onReingest?: () => void;
  onOpen?: () => void;
}) {
  const t = useTranslations('memory');
  const dragDisabled = disabled || !reorderable;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: s.id, disabled: dragDisabled });

  // Same untitled-source wording the detail modal falls back to.
  const label = s.title ?? s.fileName ?? s.url ?? t('sourceDetail.fallbackLabel');

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
        disabled={dragDisabled}
        aria-label={t('sourceEditor.reorder')}
        className="shrink-0 cursor-grab touch-none rounded text-muted-foreground hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <SourceIcon kind={s.kind} faviconUrl={s.faviconUrl} url={s.url} />
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          disabled={disabled}
          title={label}
          className="min-w-0 flex-1 truncate text-left text-sm hover:text-primary hover:underline disabled:opacity-40"
        >
          {label}
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      )}

      <IngestStatus source={s} onReingest={onReingest} disabled={disabled} />

      {s.url ? (
        <a
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('sourceEditor.openInNewTab')}
          onClick={(e) => e.stopPropagation()}
          className="text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={t('sourceEditor.remove')}
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
  const t = useTranslations('memory');
  if (!onReingest) return null;
  if (s.ingestState === 'pending') {
    return (
      <Loader2
        className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground"
        aria-label={t('sourceEditor.reading')}
      />
    );
  }
  if (s.ingestState === 'ready') {
    return <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-label={t('sourceEditor.read')} />;
  }
  // failed or not-yet-ingested → offer a (re)read action.
  const failed = s.ingestState === 'failed';
  const failedTitle = s.ingestError
    ? t('sourceEditor.readFailedTitleWithError', { error: s.ingestError })
    : t('sourceEditor.readFailedTitle');
  return (
    <button
      type="button"
      onClick={onReingest}
      disabled={disabled}
      aria-label={failed ? t('sourceEditor.retryRead') : t('sourceEditor.readSource')}
      title={failed ? failedTitle : t('sourceEditor.readSource')}
      className={cn(
        'shrink-0 disabled:opacity-40',
        failed ? 'text-amber-500 hover:text-amber-400' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {failed ? <AlertTriangle className="h-3.5 w-3.5" /> : <RotateCw className="h-3.5 w-3.5" />}
    </button>
  );
}
