'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Brain, MoreHorizontal } from 'lucide-react';
import type { Memory, Project } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { MemorySourcesPanel } from '@/components/memory/memory-sources-panel';
import { MemoryChatComposer } from '@/components/memory/memory-chat-composer';
import { MemoryMetadataModal } from '@/components/memory/memory-metadata-modal';
import { MemoryScopeChip } from '@/components/memory/memory-scope';
import { MemoryStudioRail } from '@/components/memory/memory-studio-rail';
import { RailShell, RailHeaderToggle } from '@midnite/ui';
import { getMemory, getProjects, updateMemory } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { useApiData } from '@/lib/use-api-data';
import { useLocalStorage } from '@/lib/use-local-storage';
import { useIsMobile } from '@/hooks/use-media-query';

/**
 * Container (Phase 65 A): reads `?id=`, fetches the memory + projects, and
 * renders the workspace — with inline loading / not-found states so a bookmarked
 * deep link resolves standalone.
 */
export function MemoryDetailContainer() {
  const id = useSearchParams().get('id') ?? '';
  const { data, loading, error, refresh } = useApiData(async () => {
    if (!id) return null;
    const [memory, projects] = await Promise.all([getMemory(id), getProjects().catch(() => [])]);
    return { memory, projects };
  }, [id]);

  const back = (
    <Link
      href="/memory"
      className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      All memories
    </Link>
  );

  if (!id || error || (!loading && !data)) {
    return (
      <div className="container max-w-3xl py-6 pb-12">
        {back}
        <div className="rounded-xl border border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground">
          Memory not found.
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container max-w-3xl py-6 pb-12">
        {back}
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return <MemoryDetailView memory={data.memory} projects={data.projects} onChanged={refresh} />;
}

/**
 * The memory workspace (Phase 65 A): a center doc + chat composer flanked by two
 * independently collapsible, state-persisted rails — sources (left) and the
 * artifact Studio (right). On mobile the rails become header-toggled drawers and
 * the center goes full-width. Chat + Studio are scaffolded here (Themes C–E).
 */
export function MemoryDetailView({
  memory: initial,
  projects,
  onChanged,
}: {
  memory: Memory;
  projects: Project[];
  onChanged: () => void;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [memory, setMemory] = useState(initial);
  const [leftOpen, setLeftOpen] = useLocalStorage<boolean>('midnite.memory.leftOpen', true);
  const [rightOpen, setRightOpen] = useLocalStorage<boolean>('midnite.memory.rightOpen', true);
  const [metaOpen, setMetaOpen] = useState(false);

  // Re-seed when the container re-fetches (e.g. navigating between memories).
  useEffect(() => setMemory(initial), [initial]);

  useEffect(() => {
    const previous = document.title;
    document.title = `${memory.title} · midnite`;
    return () => {
      document.title = previous;
    };
  }, [memory.title]);

  const project = memory.projectId ? projects.find((p) => p.id === memory.projectId) : undefined;

  // A local mutation updates our copy and refreshes list-backed views.
  const applyUpdate = (updated: Memory) => {
    setMemory(updated);
    onChanged();
    invalidateData();
  };

  // Inline title rename from the header breadcrumb — optimistic via applyUpdate.
  const saveTitle = (next: string) => {
    if (next === memory.title) return;
    updateMemory(memory.id, { title: next })
      .then(applyUpdate)
      .catch(() => {
        // Best-effort; the field re-seeds from the unchanged title on the next render.
      });
  };

  // The metadata button — floated by the center's top-right on desktop (next to
  // the Studio toggle) and surfaced in the header on mobile.
  const metadataButton = (
    <button
      type="button"
      onClick={() => setMetaOpen(true)}
      aria-label="Edit memory metadata"
      title="Edit memory"
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-card/80 text-muted-foreground shadow-sm backdrop-blur transition-colors duration-200 hover:bg-accent hover:text-foreground"
    >
      <MoreHorizontal className="h-4 w-4" />
    </button>
  );

  return (
    <>
      <PageHeader
        title={memory.title}
        icon="BrainCircuit"
        titleNode={
          <span className="flex min-w-0 items-center gap-1.5">
            <Link
              href="/memory"
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              Memories
            </Link>
            <span aria-hidden className="shrink-0 text-muted-foreground/50">
              /
            </span>
            <InlineMemoryTitle title={memory.title} onCommit={saveTitle} />
          </span>
        }
        description={<MemoryScopeChip project={project} />}
        actions={
          <div className="flex items-center gap-2">
            {isMobile ? (
              <>
                <RailHeaderToggle side="left" open={leftOpen} onClick={() => setLeftOpen(!leftOpen)} />
                <RailHeaderToggle side="right" open={rightOpen} onClick={() => setRightOpen(!rightOpen)} />
                {metadataButton}
              </>
            ) : null}
          </div>
        }
      />

      {/* pb-48 clears the fixed composer bar so the last of the thread and the
          rails stay reachable above it (dashboard/council-style). */}
      <div className="reveal-staged container space-y-5 pb-48 pt-2">
        <RailShell
          isMobile={isMobile}
          centerActions={metadataButton}
          left={{
            title: 'Sources',
            icon: <Brain className="h-4 w-4 text-[hsl(262_83%_66%)]" />,
            open: leftOpen,
            onToggle: () => setLeftOpen(!leftOpen),
            content: <MemorySourcesPanel memory={memory} onChange={applyUpdate} />,
          }}
          right={{
            title: 'Studio',
            open: rightOpen,
            onToggle: () => setRightOpen(!rightOpen),
            content: <MemoryStudioRail memoryId={memory.id} />,
          }}
        >
          {/* Center — the chat thread with the knowledge base. */}
          <MemoryChatComposer memory={memory} />
        </RailShell>
      </div>

      {metaOpen ? (
        <MemoryMetadataModal
          memory={memory}
          projects={projects}
          onSaved={applyUpdate}
          onDeleted={() => router.push('/memory')}
          onClose={() => setMetaOpen(false)}
        />
      ) : null}
    </>
  );
}

/**
 * The memory title, editable in place from the header breadcrumb. Commits on
 * Enter or blur; Escape reverts. The field auto-sizes to its content so it reads
 * as heading text, not a boxed input.
 */
function InlineMemoryTitle({
  title,
  onCommit,
}: {
  title: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState(title);
  useEffect(() => setDraft(title), [title]);

  const commit = () => {
    const next = draft.trim();
    if (!next || next === title) {
      setDraft(title); // revert empty / no-op edits
      return;
    }
    onCommit(next);
  };

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          setDraft(title);
          e.currentTarget.blur();
        }
      }}
      aria-label="Memory title"
      placeholder="Untitled memory"
      size={Math.max(draft.length, 1)}
      className="-mx-1 min-w-0 max-w-full rounded px-1 font-semibold text-foreground outline-none transition-colors hover:bg-accent/40 focus:bg-accent/40 focus:ring-1 focus:ring-ring"
    />
  );
}

