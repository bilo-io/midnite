'use client';

import { useTranslations } from 'next-intl';
import { Columns3, Workflow, type LucideIcon } from 'lucide-react';
import type { Project, TaskSummary } from '@midnite/shared';
import { RoadmapBoard } from '@/components/roadmap/roadmap-board';
import { MilestoneGraphView } from '@/components/roadmap/milestone-graph-view';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/lib/use-local-storage';
import { cn } from '@/lib/utils';

type Props = {
  project: Project;
  onSelectTask: (task: TaskSummary) => void;
};

type RoadmapViewMode = 'board' | 'graph';
const VIEW_STORAGE_KEY = 'midnite.roadmap.view';
const VIEW_ICONS: Array<{ value: RoadmapViewMode; Icon: LucideIcon }> = [
  { value: 'board', Icon: Columns3 },
  { value: 'graph', Icon: Workflow },
];

/**
 * Phase 58 E — the Roadmap tab on the project cockpit: milestones as lanes with
 * progress + a backlog, drag-to-assign, inline milestone CRUD — plus a graph
 * view (the milestone dependency DAG) toggled the same way the Tasks page
 * switches list/board/graph.
 */
export function ProjectRoadmapPanel({ project, onSelectTask }: Props) {
  const t = useTranslations('projects');
  const tagInfo = { tag: project.tag, color: project.color };
  const [view, setView] = useLocalStorage<RoadmapViewMode>(VIEW_STORAGE_KEY, 'board');

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
          {VIEW_ICONS.map(({ value, Icon }) => (
            <Button
              key={value}
              type="button"
              variant="ghost"
              size="icon"
              aria-label={value === 'board' ? t('detail.roadmapBoardView') : t('detail.roadmapGraphView')}
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={cn('h-7 w-7', view === value && 'bg-accent text-accent-foreground')}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </div>
      {view === 'graph' ? (
        <MilestoneGraphView projectId={project.id} onSelectTask={onSelectTask} />
      ) : (
        <RoadmapBoard projectId={project.id} project={tagInfo} onSelectTask={onSelectTask} />
      )}
    </div>
  );
}
