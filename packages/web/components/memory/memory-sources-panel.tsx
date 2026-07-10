'use client';

import { useState } from 'react';
import { MAX_SOURCES_PER_MEMORY, type Memory } from '@midnite/shared';
import { SourceListEditor, orderByIds } from '@/components/source-list-editor';
import { useConfirm } from '@/components/confirm-dialog';
import { addMemorySource, removeMemorySource, reorderMemorySources } from '@/lib/api';

/**
 * Live sources editor for an existing memory (Phase 65 A). Add/remove/reorder
 * persist immediately and reflect optimistically. Shared by the workspace's
 * left rail; the create modal stages source URLs client-side instead (no id yet).
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

  const add = async (url: string) => {
    setError(null);
    try {
      onChange(await addMemorySource(memory.id, url));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that source');
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
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
