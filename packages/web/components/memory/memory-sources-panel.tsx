'use client';

import { useEffect, useState } from 'react';
import { MAX_SOURCES_PER_MEMORY, type Memory } from '@midnite/shared';
import { SourceListEditor, orderByIds } from '@/components/source-list-editor';
import { useConfirm } from '@/components/confirm-dialog';
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

  const add = async (url: string) => {
    setError(null);
    try {
      onChange(await addMemorySource(memory.id, url));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that source');
    }
  };

  const uploadFile = async (file: File) => {
    setError(null);
    try {
      onChange(await uploadMemorySourceFile(memory.id, file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that file');
    }
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

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Sources</span>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {memory.sources.length}/{MAX_SOURCES_PER_MEMORY}
        </span>
      </div>
      <SourceListEditor
        sources={memory.sources}
        max={MAX_SOURCES_PER_MEMORY}
        placeholder="Paste a doc, repo, or any reference link"
        onAdd={add}
        onRemove={remove}
        onReorder={reorder}
        onReingest={reingest}
        onUploadFile={uploadFile}
        uploadAccept={UPLOAD_ACCEPT}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
