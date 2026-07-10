'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Brain,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import type { Memory, Project } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { ConnectionStatus } from '@/components/connection-status';
import { MemoryDocPanel } from '@/components/memory/memory-doc-panel';
import { MemorySourcesPanel } from '@/components/memory/memory-sources-panel';
import { MemoryChatComposer } from '@/components/memory/memory-chat-composer';
import { MemoryStudioRail } from '@/components/memory/memory-studio-rail';
import { getMemory, getProjects } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { useApiData } from '@/lib/use-api-data';
import { useLocalStorage } from '@/lib/use-local-storage';
import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

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
                <RailToggle side="left" open={leftOpen} onClick={() => setLeftOpen(!leftOpen)} />
                <RailToggle side="right" open={rightOpen} onClick={() => setRightOpen(!rightOpen)} />
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
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* Left rail — sources. */}
          <Rail
            side="left"
            open={leftOpen}
            isMobile={isMobile}
            onToggle={() => setLeftOpen(!leftOpen)}
            title="Sources"
          >
            <MemorySourcesPanel memory={memory} onChange={applyUpdate} />
          </Rail>

          {/* Center — the doc + chat composer. */}
          <div className="min-w-0 flex-1 space-y-4">
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

          {/* Right rail — the artifact Studio. */}
          <Rail
            side="right"
            open={rightOpen}
            isMobile={isMobile}
            onToggle={() => setRightOpen(!rightOpen)}
            title="Studio"
          >
            <MemoryStudioRail />
          </Rail>
        </div>
      </div>
    </>
  );
}

function Rail({
  side,
  open,
  isMobile,
  onToggle,
  title,
  children,
}: {
  side: 'left' | 'right';
  open: boolean;
  isMobile: boolean;
  onToggle: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (isMobile && !open) return null;

  if (!open) {
    return (
      <div className="hidden w-10 shrink-0 lg:block">
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Expand ${title}`}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:text-foreground"
        >
          {side === 'left' ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        'w-full shrink-0 rounded-lg border border-border/60 bg-card/40 p-4 lg:w-72',
        side === 'left' ? 'lg:order-first' : 'lg:order-last',
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          {side === 'left' ? <Brain className="h-4 w-4 text-[hsl(262_83%_66%)]" /> : null}
          {title}
        </h2>
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Collapse ${title}`}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
        >
          {side === 'left' ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelRightClose className="h-4 w-4" />
          )}
        </button>
      </div>
      {children}
    </aside>
  );
}

function RailToggle({
  side,
  open,
  onClick,
}: {
  side: 'left' | 'right';
  open: boolean;
  onClick: () => void;
}) {
  const Icon =
    side === 'left'
      ? open
        ? PanelLeftClose
        : PanelLeftOpen
      : open
        ? PanelRightClose
        : PanelRightOpen;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Toggle ${side} panel`}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:text-foreground"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
