'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { MAX_SOURCES_PER_MEMORY, type Memory, type SourceKind } from '@midnite/shared';
import { SourceListEditor, orderByIds, type EditableSource } from '@/components/source-list-editor';
import { SourceKindMultiSelect } from '@/components/source-kind-multi-select';
import { AddSourceModal } from '@/components/memory/add-source-modal';
import { SourceDetailModal } from '@/components/memory/source-detail-modal';
import { useConfirm } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  addMemorySource,
  getMemory,
  removeMemorySource,
  reingestMemorySource,
  reorderMemorySources,
  uploadMemorySourceFile,
} from '@/lib/api';

/** Upload types the input accepts (mirrors SOURCE_UPLOAD_MIME_TYPES). */
const UPLOAD_ACCEPT = '.pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain';

/**
 * Live sources editor for an existing memory (Phase 65 A/B). Add a link, upload a
 * file (PDF/md/txt), remove, reorder — all persist immediately. Each source shows
 * its ingestion status; while any source is still ingesting, the panel polls the
 * memory so the status resolves without a manual refresh.
 */
export function MemorySourcesPanel({
  memory,
  onChange,
}: {
  memory: Memory;
  /** Called with the updated memory after any source mutation. */
  onChange: (memory: Memory) => void;
}) {
  const confirm = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [kinds, setKinds] = useState<SourceKind[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<EditableSource | null>(null);

  // The kinds actually present — the filter only offers real options.
  const availableKinds = useMemo(
    () => [...new Set(memory.sources.map((s) => s.kind))],
    [memory.sources],
  );

  const filterActive = query.trim() !== '' || kinds.length > 0;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return memory.sources.filter((s) => {
      const matchesQuery =
        q === '' ||
        [s.title, s.fileName, s.url].some((f) => f?.toLowerCase().includes(q));
      const matchesKind = kinds.length === 0 || kinds.includes(s.kind);
      return matchesQuery && matchesKind;
    });
  }, [memory.sources, query, kinds]);

  // Poll while any source is mid-ingest so pending → ready/failed resolves live.
  const pending = memory.sources.some((s) => s.ingestState === 'pending');
  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const fresh = await getMemory(memory.id);
        if (!cancelled) onChange(fresh);
      } catch {
        // transient — the next tick retries
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pending, memory.id, onChange]);

  // Adds/uploads flow through the AddSourceModal, which surfaces the error inline
  // and stays open — so these rethrow rather than swallowing into panel state.
  const add = async (url: string) => {
    setError(null);
    onChange(await addMemorySource(memory.id, url));
  };

  const uploadFile = async (file: File) => {
    setError(null);
    onChange(await uploadMemorySourceFile(memory.id, file));
  };

  const reingest = async (id: string) => {
    setError(null);
    try {
      onChange(await reingestMemorySource(memory.id, id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not re-read that source');
    }
  };

  const remove = async (id: string) => {
    const ok = await confirm({
      title: 'Remove this source?',
      description: 'It will be detached from this memory.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    setError(null);
    try {
      onChange(await removeMemorySource(memory.id, id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove that source');
    }
  };

  const reorder = async (ids: string[]) => {
    // Optimistic: reflect the new order immediately, roll back on failure.
    onChange({ ...memory, sources: orderByIds(memory.sources, ids) });
    try {
      onChange(await reorderMemorySources(memory.id, ids));
    } catch (e) {
      onChange(memory);
      setError(e instanceof Error ? e.message : 'Could not reorder sources');
    }
  };

  const remaining = MAX_SOURCES_PER_MEMORY - memory.sources.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Sources</span>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {memory.sources.length}/{MAX_SOURCES_PER_MEMORY}
        </span>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={() => setAddOpen(true)}
        disabled={remaining <= 0}
      >
        <Plus className="h-4 w-4" /> Add sources
      </Button>

      {memory.sources.length > 0 ? (
        <div className="space-y-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sources…"
              aria-label="Search sources"
              className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          {availableKinds.length > 1 ? (
            <SourceKindMultiSelect available={availableKinds} value={kinds} onChange={setKinds} />
          ) : null}
        </div>
      ) : null}

      {filtered.length === 0 && filterActive ? (
        <p className="px-1 py-2 text-xs text-muted-foreground">No sources match your filter.</p>
      ) : (
        <SourceListEditor
          sources={filtered}
          max={MAX_SOURCES_PER_MEMORY}
          showAdd={false}
          reorderable={!filterActive}
          onAdd={add}
          onRemove={remove}
          onReorder={reorder}
          onReingest={reingest}
          onUploadFile={uploadFile}
          uploadAccept={UPLOAD_ACCEPT}
          onOpen={setDetail}
        />
      )}
      {filterActive ? (
        <p className={cn('px-1 text-[11px] text-muted-foreground')}>
          Reordering is paused while filtering.
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {addOpen ? (
        <AddSourceModal
          onAddUrl={add}
          onUploadFile={uploadFile}
          remaining={remaining}
          onClose={() => setAddOpen(false)}
        />
      ) : null}
      {detail ? (
        <SourceDetailModal memoryId={memory.id} source={detail} onClose={() => setDetail(null)} />
      ) : null}
    </div>
  );
}
