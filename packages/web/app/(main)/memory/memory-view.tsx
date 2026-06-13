'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, List, Plus } from 'lucide-react';
import type { Memory, Project } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { FilterPills, type FilterOption } from '@/components/filter-pills';
import { MemoryCard } from '@/components/memory-card';
import { MemoryModal } from '@/components/memory-modal';

type View = 'list' | 'grid';
const VIEWS: readonly View[] = ['list', 'grid'];
const VIEW_STORAGE_KEY = 'midnite.memory.view';

/** The scope pill for global memories — violet, to match the brain. */
const GLOBAL_HUE = '262 83% 66%';
const GLOBAL_SCOPE = 'global';

export function MemoryView({ initial, projects }: { initial: Memory[]; projects: Project[] }) {
  const router = useRouter();
  const [view, setView] = useState<View>('grid');
  const [creating, setCreating] = useState(false);
  // Scope to preselect when creating from a `?create=<id>` deep link (e.g. the
  // project modal's "create a memory" link). null = global.
  const [createScope, setCreateScope] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored && (VIEWS as readonly string[]).includes(stored)) setView(stored as View);
  }, []);

  const onSetView = useCallback((next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }, []);

  const refresh = useCallback(() => router.refresh(), [router]);

  const projectById = new Map(projects.map((p) => [p.id, p]));

  // Only offer pills for scopes that exist: Global plus projects that hold at
  // least one memory (an all-projects list would crowd the row for nothing).
  const scopeOptions: FilterOption[] = [
    { value: GLOBAL_SCOPE, label: 'Global', hue: GLOBAL_HUE },
    ...projects
      .filter((p) => initial.some((m) => m.projectId === p.id))
      .map((p) => ({ value: p.id, label: p.name, color: p.color })),
  ];

  const searchParams = useSearchParams();

  // A `?create=<id>` deep link opens the create modal pre-scoped, then strips
  // the param so a refresh/back doesn't reopen it.
  const createParam = searchParams.get('create');
  useEffect(() => {
    if (createParam === null) return;
    setCreating(true);
    setCreateScope(createParam === GLOBAL_SCOPE ? null : createParam);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete('create');
    router.replace(`/memory${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  }, [createParam, searchParams, router]);

  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const scopeRaw = searchParams.get('scope');
  const valid = new Set(scopeOptions.map((o) => o.value));
  const scopes = new Set((scopeRaw ? scopeRaw.split(',') : []).filter((v) => valid.has(v)));

  const filtered = initial.filter((m) => {
    if (scopes.size > 0 && !scopes.has(m.projectId ?? GLOBAL_SCOPE)) return false;
    if (!q) return true;
    const projectName = m.projectId ? projectById.get(m.projectId)?.name ?? '' : 'global';
    return [m.title, m.content, projectName].some((f) => f.toLowerCase().includes(q));
  });

  const editMemory = initial.find((m) => m.id === editId) ?? null;
  const modalOpen = creating || editMemory !== null;

  const closeModal = useCallback(() => {
    setCreating(false);
    setCreateScope(null);
    setEditId(null);
  }, []);

  return (
    <div className="space-y-4">
      <div className="reveal-controls flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {filtered.length} memor{filtered.length === 1 ? 'y' : 'ies'}
          </p>
          <FilterPills options={scopeOptions} paramKey="scope" allLabel="All" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="List view"
              aria-pressed={view === 'list'}
              onClick={() => onSetView('list')}
              className={view === 'list' ? 'h-7 w-7 bg-accent text-accent-foreground' : 'h-7 w-7'}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              onClick={() => onSetView('grid')}
              className={view === 'grid' ? 'h-7 w-7 bg-accent text-accent-foreground' : 'h-7 w-7'}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New memory
          </Button>
        </div>
      </div>

      <div className="reveal-content">
        {initial.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No memories yet. Write down conventions, context and decisions your agents should
              never forget.
            </p>
            <Button type="button" size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              New memory
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
            No memories match{q ? ` “${q}”` : ' the current filters'}.
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((m) => (
              <MemoryCard
                key={m.id}
                memory={m}
                project={m.projectId ? projectById.get(m.projectId) : undefined}
                layout="grid"
                onOpen={() => setEditId(m.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((m) => (
              <MemoryCard
                key={m.id}
                memory={m}
                project={m.projectId ? projectById.get(m.projectId) : undefined}
                layout="list"
                onOpen={() => setEditId(m.id)}
              />
            ))}
          </div>
        )}
      </div>

      {modalOpen ? (
        <MemoryModal
          memory={creating ? null : editMemory}
          projects={projects}
          initialProjectId={creating ? createScope : undefined}
          onClose={closeModal}
          onSaved={refresh}
        />
      ) : null}
    </div>
  );
}
