'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Brain } from 'lucide-react';
import type { Memory, Project } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { ConnectionStatus } from '@/components/connection-status';
import { MemoryDocPanel } from '@/components/memory/memory-doc-panel';
import { MemorySourcesPanel } from '@/components/memory/memory-sources-panel';
import { MemoryChatComposer } from '@/components/memory/memory-chat-composer';
import { MemoryStudioRail } from '@/components/memory/memory-studio-rail';
import { RailShell, RailHeaderToggle } from '@/components/rail-shell';
import { getMemory, getProjects } from '@/lib/api';
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
  const scopeLabel = memory.projectId ? project?.name ?? 'Project' : 'Global';

  // A local mutation updates our copy and refreshes list-backed views.
  const applyUpdate = (updated: Memory) => {
    setMemory(updated);
    onChanged();
    invalidateData();
  };

  return (
    <>
      <PageHeader
        title={memory.title}
        icon="BrainCircuit"
        description={scopeLabel}
        actions={
          <div className="flex items-center gap-2">
            <ConnectionStatus variant="compact" />
            {isMobile ? (
              <>
                <RailHeaderToggle side="left" open={leftOpen} onClick={() => setLeftOpen(!leftOpen)} />
                <RailHeaderToggle side="right" open={rightOpen} onClick={() => setRightOpen(!rightOpen)} />
              </>
            ) : null}
            <Link
              href="/memory"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Memories
            </Link>
          </div>
        }
      />

      <div className="reveal-staged container space-y-5 pb-8 pt-2">
        <RailShell
          isMobile={isMobile}
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
            content: <MemoryStudioRail />,
          }}
        >
          {/* Center — the doc + chat composer. */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-card/40 p-4">
              <MemoryDocPanel
                memory={memory}
                projects={projects}
                onSaved={applyUpdate}
                onDeleted={() => router.push('/memory')}
              />
            </div>
            <MemoryChatComposer />
          </div>
        </RailShell>
      </div>
    </>
  );
}

