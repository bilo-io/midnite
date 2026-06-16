'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import type { Layout, LayoutItem, ResponsiveLayouts } from 'react-grid-layout';
import type { Note, Project, Routine, RoutineProgress, Task, TaskCounts } from '@midnite/shared';
import {
  DASHBOARD_WIDGETS,
  DASHBOARD_WIDGETS_STORAGE_KEY,
  DEFAULT_WIDGETS,
  sizeForKey,
  type Breakpoint,
  type WidgetInstance,
  type WidgetType,
} from '@/lib/dashboard-widgets';
import { useLocalStorage } from '@/lib/use-local-storage';
import { DashboardTile, TILES } from './dashboard-tiles';
import { ClockWidget } from './clock-widget';
import { DateWidget } from './date-widget';
import { NewsWidget } from './news-widget';
import { NotesPanel } from './notes-panel';
import { ProjectCard, RECENT_LIMIT } from './recent-projects';
import { RoutinePanel } from './routine-panel';
import { WeatherWidget } from './weather-widget';
import { SessionsWidget } from './sessions-widget';
import { WorkflowsWidget } from './workflows-widget';
import { MemoriesWidget } from './memories-widget';
import { AgentsWidget } from './agents-widget';
import { CouncilsWidget } from './councils-widget';
import { ActivityWidget } from './activity-widget';
import { ThroughputWidget } from './throughput-widget';
import { HealthWidget } from './health-widget';
import { WorldClocksWidget } from './world-clocks-widget';
import { AllProjectsWidget } from './all-projects-widget';
import { KnowledgeWidget } from './knowledge-widget';
import { QuoteWidget } from './quote-widget';
import { TimerWidget } from './timer-widget';
import { CalendarWidget } from './calendar-widget';
import { ScratchpadWidget } from './scratchpad-widget';
import { LinksWidget } from './links-widget';

const STORAGE_KEY = 'midnite-dashboard-layout-v3';
const BREAKPOINTS: Breakpoint[] = ['lg', 'md', 'sm'];

const ROW_HEIGHT = 44;
const MARGIN: [number, number] = [12, 12];

function item(i: string, x: number, y: number, w: number, h: number, extra?: Partial<LayoutItem>): LayoutItem {
  return { i, x, y, w, h, ...extra };
}

// Curated arrangement for the default widget set. Used as the placement base when
// there's no saved layout; new/removed widgets are reconciled on top of it.
function defaultLayouts(projectCount: number): ResponsiveLayouts {
  const tileY = 0;
  const projY = 3;
  const panelY = projY + (projectCount > 0 ? 5 : 0);
  const mdPanelY = panelY + (projectCount > 2 ? 5 : 0);

  const lg: LayoutItem[] = [
    item('tile-backlog',    0,  tileY, 3, 3, { minH: 2, minW: 1 }),
    item('tile-todo',       3,  tileY, 3, 3, { minH: 2, minW: 1 }),
    item('tile-inProgress', 6,  tileY, 3, 3, { minH: 2, minW: 1 }),
    item('tile-done',       9,  tileY, 3, 3, { minH: 2, minW: 1 }),
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

// The grid item keys a widget set renders to. `projects` fans out to one card per
// recent project; every other widget maps to its own type.
function deriveKeys(widgets: WidgetInstance[], projectCount: number): string[] {
  const keys: string[] = [];
  for (const w of widgets) {
    if (w.type === 'projects') {
      for (let i = 0; i < projectCount; i++) keys.push(`proj-${i}`);
    } else {
      keys.push(w.type);
    }
  }
  return keys;
}

// Reconcile a base layout against the rendered keys: keep positioned items that
// are still rendered, drop the rest, and append defaults (at the bottom) for keys
// with no position yet. Replaces the old brittle exact-count guard.
function reconcile(base: ResponsiveLayouts, renderedKeys: string[], projectCount: number): ResponsiveLayouts {
  const rendered = new Set(renderedKeys);
  const defaults = defaultLayouts(projectCount);
  const out = {} as ResponsiveLayouts;

  for (const bp of BREAKPOINTS) {
    const baseItems = (base[bp] as LayoutItem[] | undefined) ?? [];
    // Always re-stamp minW/minH from the live catalog so changes to the catalog
    // floor constraints take effect even for layouts already saved in localStorage.
    const kept: LayoutItem[] = baseItems
      .filter((it) => rendered.has(it.i))
      .map((it) => {
        const size = sizeForKey(it.i, bp);
        return { ...it, minW: size.minW, minH: size.minH };
      });
    const have = new Set(kept.map((it) => it.i));
    const defByKey = new Map(((defaults[bp] as LayoutItem[]) ?? []).map((it) => [it.i, it]));
    let maxY = kept.reduce((m, it) => Math.max(m, it.y + it.h), 0);

    for (const key of renderedKeys) {
      if (have.has(key)) continue;
      const fromDefault = defByKey.get(key);
      const size = sizeForKey(key, bp);
      kept.push(fromDefault ?? item(key, 0, maxY, size.w, size.h, { minW: size.minW, minH: size.minH }));
      maxY += fromDefault ? fromDefault.h : size.h;
      have.add(key);
    }
    out[bp] = kept;
  }
  return out;
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

  const [widgets, setWidgets] = useLocalStorage<WidgetInstance[]>(
    DASHBOARD_WIDGETS_STORAGE_KEY,
    DEFAULT_WIDGETS,
  );

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, RECENT_LIMIT),
    [projects],
  );

  const total =
    (counts.backlog ?? 0) + (counts.todo ?? 0) + (counts.inProgress ?? 0) + (counts.done ?? 0);

  const renderedKeys = useMemo(
    () => deriveKeys(widgets, recentProjects.length),
    [widgets, recentProjects.length],
  );

  // The persisted positions (null until the mount read completes).
  const [stored, setStored] = useState<ResponsiveLayouts | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setStored(JSON.parse(raw) as ResponsiveLayouts);
    } catch {
      // ignore corrupt storage
    }
  }, []);

  // Layout shown to RGL: saved positions (or the curated default) reconciled
  // against whatever widgets are currently enabled.
  const layouts = useMemo(
    () => reconcile(stored ?? defaultLayouts(recentProjects.length), renderedKeys, recentProjects.length),
    [stored, renderedKeys, recentProjects.length],
  );

  const handleLayoutChange = (_layout: Layout, allLayouts: ResponsiveLayouts) => {
    setStored(allLayouts);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
    } catch {
      // ignore
    }
  };

  const removeWidget = (key: string) => {
    const type: WidgetType = key.startsWith('proj-') ? 'projects' : (key as WidgetType);
    setWidgets((prev) => prev.filter((w) => w.type !== type));
  };

  const updateConfig = (type: WidgetType, config: WidgetInstance['config']) => {
    setWidgets((prev) => prev.map((w) => (w.type === type ? ({ type, config } as WidgetInstance) : w)));
  };

  // Inner content for one rendered grid key.
  const renderContent = (key: string): { node: React.ReactNode; scroll?: boolean } => {
    if (key.startsWith('proj-')) {
      const project = recentProjects[Number(key.slice('proj-'.length))];
      return { node: project ? <ProjectCard project={project} tasks={tasks} /> : null };
    }
    switch (key as WidgetType) {
      case 'tile-backlog':
      case 'tile-todo':
      case 'tile-inProgress':
      case 'tile-done': {
        const tile = TILES.find((t) => `tile-${t.key}` === key)!;
        return { node: <DashboardTile tile={tile} value={counts[tile.key] ?? 0} total={total} /> };
      }
      case 'notes':
        return { node: <NotesPanel notes={notes} />, scroll: true };
      case 'routines':
        return { node: <RoutinePanel routines={routines} progress={todayProgress} />, scroll: true };
      case 'news': {
        const w = widgets.find((x) => x.type === 'news');
        return {
          node:
            w?.type === 'news' ? (
              <NewsWidget config={w.config} onConfigChange={(c) => updateConfig('news', c)} />
            ) : null,
        };
      }
      case 'weather': {
        const w = widgets.find((x) => x.type === 'weather');
        return {
          node:
            w?.type === 'weather' ? (
              <WeatherWidget config={w.config} onConfigChange={(c) => updateConfig('weather', c)} />
            ) : null,
        };
      }
      case 'clock': {
        const w = widgets.find((x) => x.type === 'clock');
        return {
          node:
            w?.type === 'clock' ? (
              <ClockWidget config={w.config} onConfigChange={(c) => updateConfig('clock', c)} />
            ) : null,
        };
      }
      case 'date':
        return { node: <DateWidget /> };

      // — midnite-native —
      case 'sessions':
        return { node: <SessionsWidget /> };
      case 'workflows':
        return { node: <WorkflowsWidget /> };
      case 'memories':
        return { node: <MemoriesWidget /> };
      case 'agents':
        return { node: <AgentsWidget /> };
      case 'councils':
        return { node: <CouncilsWidget /> };

      // — live activity —
      case 'activity':
        return { node: <ActivityWidget /> };
      case 'throughput':
        return { node: <ThroughputWidget /> };
      case 'health':
        return { node: <HealthWidget /> };

      // — at-a-glance extras —
      case 'world-clocks': {
        const w = widgets.find((x) => x.type === 'world-clocks');
        return {
          node:
            w?.type === 'world-clocks' ? (
              <WorldClocksWidget config={w.config} onConfigChange={(c) => updateConfig('world-clocks', c)} />
            ) : null,
        };
      }
      case 'all-projects':
        return { node: <AllProjectsWidget /> };
      case 'knowledge':
        return { node: <KnowledgeWidget /> };
      case 'quote':
        return { node: <QuoteWidget /> };

      // — productivity tools —
      case 'timer': {
        const w = widgets.find((x) => x.type === 'timer');
        return {
          node:
            w?.type === 'timer' ? (
              <TimerWidget config={w.config} onConfigChange={(c) => updateConfig('timer', c)} />
            ) : null,
        };
      }
      case 'calendar':
        return { node: <CalendarWidget /> };
      case 'scratchpad': {
        const w = widgets.find((x) => x.type === 'scratchpad');
        return {
          node:
            w?.type === 'scratchpad' ? (
              <ScratchpadWidget config={w.config} onConfigChange={(c) => updateConfig('scratchpad', c)} />
            ) : null,
        };
      }
      case 'links': {
        const w = widgets.find((x) => x.type === 'links');
        return {
          node:
            w?.type === 'links' ? (
              <LinksWidget config={w.config} onConfigChange={(c) => updateConfig('links', c)} />
            ) : null,
        };
      }

      default:
        return { node: null };
    }
  };

  const removeLabel = (key: string): string => {
    const type: WidgetType = key.startsWith('proj-') ? 'projects' : (key as WidgetType);
    return `Remove ${DASHBOARD_WIDGETS[type]?.label ?? 'widget'}`;
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
          {renderedKeys.map((key) => {
            const { node, scroll } = renderContent(key);
            return (
              <div key={key} className="dashboard-panel group/panel relative">
                <div className="drag-handle" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => removeWidget(key)}
                  aria-label={removeLabel(key)}
                  className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-md bg-background/70 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:bg-accent hover:text-destructive group-hover/panel:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {scroll ? <div className="dashboard-panel__scroll">{node}</div> : node}
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
