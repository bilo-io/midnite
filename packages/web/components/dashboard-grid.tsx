'use client';

import { useEffect, useMemo, useState } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import type { Layout, LayoutItem, ResponsiveLayouts } from 'react-grid-layout';
import type { Note, Project, Routine, RoutineProgress, Task, TaskCounts } from '@midnite/shared';
import { DashboardTile, TILES } from './dashboard-tiles';
import { NotesPanel } from './notes-panel';
import { ProjectCard, RECENT_LIMIT } from './recent-projects';
import { RoutinePanel } from './routine-panel';

const STORAGE_KEY = 'midnite-dashboard-layout-v2';

const ROW_HEIGHT = 44;
const MARGIN: [number, number] = [12, 12];

function item(i: string, x: number, y: number, w: number, h: number, extra?: Partial<LayoutItem>): LayoutItem {
  return { i, x, y, w, h, ...extra };
}

// Build a fresh default layout based on how many project cards exist.
function defaultLayouts(projectCount: number): ResponsiveLayouts {
  const tileY = 0;
  const projY = 3;
  const panelY = projY + (projectCount > 0 ? 5 : 0);
  const mdPanelY = panelY + (projectCount > 2 ? 5 : 0);

  const lg: LayoutItem[] = [
    item('tile-backlog',    0,  tileY, 3, 3, { minH: 2, minW: 2 }),
    item('tile-todo',       3,  tileY, 3, 3, { minH: 2, minW: 2 }),
    item('tile-inProgress', 6,  tileY, 3, 3, { minH: 2, minW: 2 }),
    item('tile-done',       9,  tileY, 3, 3, { minH: 2, minW: 2 }),
    ...Array.from({ length: projectCount }, (_, i) =>
      item(`proj-${i}`, i * 4, projY, 4, 5, { minH: 3, minW: 2 }),
    ),
    item('notes',    0, panelY, 6, 8, { minH: 4, minW: 3 }),
    item('routines', 6, panelY, 6, 8, { minH: 4, minW: 3 }),
  ];

  const md: LayoutItem[] = [
    item('tile-backlog',    0, tileY, 2, 3, { minH: 2 }),
    item('tile-todo',       2, tileY, 2, 3, { minH: 2 }),
    item('tile-inProgress', 4, tileY, 2, 3, { minH: 2 }),
    item('tile-done',       6, tileY, 2, 3, { minH: 2 }),
    ...Array.from({ length: projectCount }, (_, i) =>
      item(`proj-${i}`, (i % 2) * 4, projY + Math.floor(i / 2) * 5, 4, 5, { minH: 3 }),
    ),
    item('notes',    0, mdPanelY, 4, 8, { minH: 4 }),
    item('routines', 4, mdPanelY, 4, 8, { minH: 4 }),
  ];

  const sm: LayoutItem[] = [
    item('tile-backlog',    0, 0, 2, 3, { minH: 2 }),
    item('tile-todo',       2, 0, 2, 3, { minH: 2 }),
    item('tile-inProgress', 0, 3, 2, 3, { minH: 2 }),
    item('tile-done',       2, 3, 2, 3, { minH: 2 }),
    ...Array.from({ length: projectCount }, (_, i) =>
      item(`proj-${i}`, 0, 6 + i * 5, 4, 5, { minH: 3 }),
    ),
    item('notes',    0, 6 + projectCount * 5,     4, 8, { minH: 4 }),
    item('routines', 0, 6 + projectCount * 5 + 8, 4, 8, { minH: 4 }),
  ];

  return { lg, md, sm };
}

interface DashboardGridProps {
  counts: TaskCounts;
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  routines: Routine[];
  todayProgress: RoutineProgress[];
  error: string | null;
}

export function DashboardGrid({
  counts,
  projects,
  tasks,
  notes,
  routines,
  todayProgress,
  error,
}: DashboardGridProps) {
  const { width, mounted, containerRef } = useContainerWidth({ measureBeforeMount: true });

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, RECENT_LIMIT),
    [projects],
  );

  const total =
    (counts.backlog ?? 0) + (counts.todo ?? 0) + (counts.inProgress ?? 0) + (counts.done ?? 0);

  const defaults = useMemo(() => defaultLayouts(recentProjects.length), [recentProjects.length]);
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(defaults);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as ResponsiveLayouts;
        // Only restore if item count matches — avoids stale layouts after data changes.
        const expectedCount = 6 + recentProjects.length; // 4 tiles + N projects + 2 panels
        const savedCount = (saved.lg as Layout[] | undefined)?.length ?? 0;
        if (savedCount === expectedCount) setLayouts(saved);
      }
    } catch {
      // ignore corrupt storage
    }
  }, [recentProjects.length]);

  const handleLayoutChange = (_layout: Layout, allLayouts: ResponsiveLayouts) => {
    setLayouts(allLayouts);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
    } catch {
      // ignore
    }
  };

  return (
    <div className="container pb-48 pt-2" ref={containerRef}>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Could not reach the gateway: {error}
        </div>
      )}

      {mounted && (
        <ResponsiveGridLayout
          width={width}
          layouts={layouts}
          breakpoints={{ lg: 1024, md: 640, sm: 0 }}
          cols={{ lg: 12, md: 8, sm: 4 }}
          rowHeight={ROW_HEIGHT}
          margin={MARGIN}
          containerPadding={[0, 0]}
          dragConfig={{ handle: '.drag-handle' }}
          onLayoutChange={handleLayoutChange}
        >
          {/* ── Status tiles ─────────────────────────── */}
          {TILES.map((tile) => (
            <div key={`tile-${tile.key}`} className="dashboard-panel">
              <div className="drag-handle" aria-hidden="true" />
              <DashboardTile tile={tile} value={counts[tile.key] ?? 0} total={total} />
            </div>
          ))}

          {/* ── Project cards ────────────────────────── */}
          {recentProjects.map((project, i) => (
            <div key={`proj-${i}`} className="dashboard-panel">
              <div className="drag-handle" aria-hidden="true" />
              <ProjectCard project={project} tasks={tasks} />
            </div>
          ))}

          {/* ── Notes panel ──────────────────────────── */}
          <div key="notes" className="dashboard-panel">
            <div className="drag-handle" aria-hidden="true" />
            <div className="dashboard-panel__scroll">
              <NotesPanel notes={notes} />
            </div>
          </div>

          {/* ── Routines panel ───────────────────────── */}
          <div key="routines" className="dashboard-panel">
            <div className="drag-handle" aria-hidden="true" />
            <div className="dashboard-panel__scroll">
              <RoutinePanel routines={routines} progress={todayProgress} />
            </div>
          </div>
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
