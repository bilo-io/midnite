'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, List, Table2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { IdeaTable } from '@/components/ideas/IdeaTable';
import { IdeaList } from '@/components/ideas/IdeaList';
import { IdeaGrid } from '@/components/ideas/IdeaGrid';
import { listIdeas, createIdea } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useIdeaEvents } from '@/hooks/use-idea-events';
import { useLocalStorage } from '@/lib/use-local-storage';
import { cn } from '@/lib/utils';

type ViewMode = 'table' | 'list' | 'grid';

const VIEW_ICONS: Record<ViewMode, typeof Table2> = {
  table: Table2,
  list: List,
  grid: LayoutGrid,
};

export default function IdeasPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('ideas-view-mode', 'list');
  const [creating, setCreating] = useState(false);

  const { data, error } = useApiData(() => listIdeas());
  const ideas = data?.ideas ?? [];

  useIdeaEvents();

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      // No blank-page create form: spin up an empty draft and drop straight into
      // the chat composer (?chat=open), where the idea is fleshed out by talking.
      const res = await createIdea({ title: 'Untitled idea' });
      router.push(`/ideas/view?id=${res.idea.id}&chat=open`);
    } catch {
      // noop — surfaced by the list's error state on next load
    } finally {
      setCreating(false);
    }
  }, [router]);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      <PageHeader
        title="Ideas"
        icon="Lightbulb"
        description="Capture ideas, refine them with AI, and promote into projects."
        actions={
          <div className="flex items-center gap-2">
            <SearchBar placeholder="Search ideas" />
            <ViewToggle current={viewMode} onToggle={setViewMode} />
            <button
              onClick={handleCreate}
              disabled={creating}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
                'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
                'disabled:opacity-50 disabled:pointer-events-none',
              )}
            >
              <Plus className="h-4 w-4" />
              New idea
            </button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="container py-4 pb-8">
          {error && (
            <p className="mb-4 text-sm text-destructive">{error}</p>
          )}
          {viewMode === 'table' && <IdeaTable ideas={ideas} />}
          {viewMode === 'list' && <IdeaList ideas={ideas} />}
          {viewMode === 'grid' && <IdeaGrid ideas={ideas} />}
        </div>
      </div>
    </div>
  );
}

function ViewToggle({
  current,
  onToggle,
}: {
  current: ViewMode;
  onToggle: (m: ViewMode) => void;
}) {
  const modes: ViewMode[] = ['list', 'grid', 'table'];
  return (
    <div className="flex items-center rounded-md border border-border/60 p-0.5">
      {modes.map((mode) => {
        const Icon = VIEW_ICONS[mode];
        return (
          <button
            key={mode}
            onClick={() => onToggle(mode)}
            className={cn(
              'rounded p-1.5 transition-colors',
              current === mode
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label={`${mode} view`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
