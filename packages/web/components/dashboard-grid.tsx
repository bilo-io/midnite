'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import type { Layout, LayoutItem, ResponsiveLayouts } from 'react-grid-layout';
import type { Note, Project, Routine, RoutineProgress, Task, TaskCounts } from '@midnite/shared';
import {
  DASHBOARD_WIDGETS,
  DEFAULT_WIDGETS,
  QUOTE_DEFAULTS,
  sizeForKey,
  type Breakpoint,
  type MarketAssetConfig,
  type MarketWatchlistConfig,
  type WidgetInstance,
  type WidgetType,
} from '@/lib/dashboard-widgets';
import { layoutKey, useDashboardTabs, widgetsKey } from '@/lib/dashboard-tabs';
import { useLocalStorage } from '@/lib/use-local-storage';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { DashboardTabs } from './dashboard-tabs';
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
import { UsageWidget } from './usage-widget';
import { ShippedWidget } from './shipped-widget';
import { SystemMonitorWidget } from './system-monitor-widget';
import { WorldClocksWidget } from './world-clocks-widget';
import { AllProjectsWidget } from './all-projects-widget';
import { QuoteWidget } from './quote-widget';
import { TimerWidget } from './timer-widget';
import { CalendarWidget } from './calendar-widget';
import { ScratchpadWidget } from './scratchpad-widget';
import { LinksWidget } from './links-widget';
import { FinancesWidget } from './finances-widget';
import { MarketAssetWidget } from './market-asset-widget';
import { MarketWatchlistWidget } from './market-watchlist-widget';

const BREAKPOINTS: Breakpoint[] = ['lg', 'md', 'sm'];

const ROW_HEIGHT = 44;
const MARGIN: [number, number] = [12, 12];

function item(i: string, x: number, y: number, w: number, h: number, extra?: Partial<LayoutItem>): LayoutItem {
  return { i, x, y, w, h, ...extra };
}

// Curated arrangement for the default widget set (the lone `proj-default-project`
// card from DEFAULT_WIDGETS). Used as the placement base when there's no saved
// layout; other project/widget instances are reconciled (appended) on top.
function defaultLayouts(): ResponsiveLayouts {
  const tileY = 0;
  const projY = 3;
  const panelY = 8;

  const lg: LayoutItem[] = [
    item('tile-backlog',    0,  tileY, 3, 3, { minH: 2, minW: 1 }),
    item('tile-todo',       3,  tileY, 3, 3, { minH: 2, minW: 1 }),
    item('tile-inProgress', 6,  tileY, 3, 3, { minH: 2, minW: 1 }),
    item('tile-done',       9,  tileY, 3, 3, { minH: 2, minW: 1 }),
    item('proj-default-project', 0, projY, 4, 5, { minH: 3, minW: 2 }),
    item('notes',    0, panelY, 6, 8, { minH: 4, minW: 3 }),
    item('routines', 6, panelY, 6, 8, { minH: 4, minW: 3 }),
  ];

  const md: LayoutItem[] = [
    item('tile-backlog',    0, tileY, 2, 3, { minH: 2 }),
    item('tile-todo',       2, tileY, 2, 3, { minH: 2 }),
    item('tile-inProgress', 4, tileY, 2, 3, { minH: 2 }),
    item('tile-done',       6, tileY, 2, 3, { minH: 2 }),
    item('proj-default-project', 0, projY, 4, 5, { minH: 3 }),
    item('notes',    0, panelY, 4, 8, { minH: 4 }),
    item('routines', 4, panelY, 4, 8, { minH: 4 }),
  ];

  const sm: LayoutItem[] = [
    item('tile-backlog',    0, 0, 2, 3, { minH: 2 }),
    item('tile-todo',       2, 0, 2, 3, { minH: 2 }),
    item('tile-inProgress', 0, 3, 2, 3, { minH: 2 }),
    item('tile-done',       2, 3, 2, 3, { minH: 2 }),
    item('proj-default-project', 0, 6, 4, 5, { minH: 3 }),
    item('notes',    0, 11, 4, 8, { minH: 4 }),
    item('routines', 0, 19, 4, 8, { minH: 4 }),
  ];

  return { lg, md, sm };
}

// The grid item keys a widget set renders to. Multi-instance widgets render under
// `<type>-<id>` (projects use the `proj-` prefix); single-instance widgets map to
// their own type. The `'id' in w` fallbacks cover legacy instances saved before a
// widget became multi-instance (the grid migrates them on mount).
function deriveKeys(widgets: WidgetInstance[]): string[] {
  const keys: string[] = [];
  for (const w of widgets) {
    if (w.type === 'projects') {
      keys.push(`proj-${'id' in w ? w.id : 'default-project'}`);
    } else if (
      w.type === 'scratchpad' ||
      w.type === 'finances' ||
      w.type === 'market-asset' ||
      w.type === 'market-watchlist'
    ) {
      keys.push(`${w.type}-${'id' in w ? w.id : ''}`);
    } else {
      keys.push(w.type);
    }
  }
  return keys;
}

// Reconcile a base layout against the rendered keys: keep positioned items that
// are still rendered, drop the rest, and append defaults (at the bottom) for keys
// with no position yet. Replaces the old brittle exact-count guard.
function reconcile(base: ResponsiveLayouts, renderedKeys: string[]): ResponsiveLayouts {
  const rendered = new Set(renderedKeys);
  const defaults = defaultLayouts();
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
  useGatewayErrorToast(error);
  const { width, mounted, containerRef } = useContainerWidth({ measureBeforeMount: true });

  // The active dashboard tab — its id keys this board's widget list and layout,
  // so switching tabs swaps to an independent board.
  const { activeId } = useDashboardTabs();

  const [widgets, setWidgets, widgetsHydrated] = useLocalStorage<WidgetInstance[]>(
    widgetsKey(activeId),
    DEFAULT_WIDGETS,
  );

  // Backfill ids/config for widgets that became multi-instance (projects,
  // scratchpad) so boards saved before the change keep rendering. Runs once per
  // tab after its stored widgets hydrate.
  useEffect(() => {
    if (!widgetsHydrated) return;
    let changed = false;
    const migrated = widgets.map((w) => {
      if (w.type === 'projects' && !('id' in w && w.id)) {
        changed = true;
        return { type: 'projects', id: crypto.randomUUID(), config: { projectId: null } } as WidgetInstance;
      }
      if (w.type === 'scratchpad' && !('id' in w && w.id)) {
        changed = true;
        const text = (w as { config?: { text?: string } }).config?.text ?? '';
        return {
          type: 'scratchpad',
          id: crypto.randomUUID(),
          config: { title: 'Scratchpad', text },
        } as WidgetInstance;
      }
      return w;
    });
    if (changed) setWidgets(migrated);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- migrate once per tab after hydration
  }, [widgetsHydrated, activeId]);

  // A stable random entrance delay (0.5–2s) per card key, so cards fade in
  // staggered. Cached per key so re-renders/drags neither reshuffle nor replay it.
  const cardDelaysRef = useRef(new Map<string, number>());
  const cardDelayMs = (key: string): number => {
    const cache = cardDelaysRef.current;
    let delay = cache.get(key);
    if (delay === undefined) {
      delay = 500 + Math.random() * 1500;
      cache.set(key, delay);
    }
    return delay;
  };

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, RECENT_LIMIT),
    [projects],
  );

  const total =
    (counts.backlog ?? 0) + (counts.todo ?? 0) + (counts.inProgress ?? 0) + (counts.done ?? 0);

  const renderedKeys = useMemo(() => deriveKeys(widgets), [widgets]);

  // The persisted positions for the active tab (null until the read completes).
  // Re-read whenever the active tab changes; reset first so one board's positions
  // never bleed into another mid-switch.
  const [stored, setStored] = useState<ResponsiveLayouts | null>(null);
  useEffect(() => {
    setStored(null);
    try {
      const raw = localStorage.getItem(layoutKey(activeId));
      if (raw) setStored(JSON.parse(raw) as ResponsiveLayouts);
    } catch {
      // ignore corrupt storage
    }
  }, [activeId]);

  // Layout shown to RGL: saved positions (or the curated default) reconciled
  // against whatever widgets are currently enabled.
  const layouts = useMemo(
    () => reconcile(stored ?? defaultLayouts(), renderedKeys),
    [stored, renderedKeys],
  );

  const handleLayoutChange = (_layout: Layout, allLayouts: ResponsiveLayouts) => {
    setStored(allLayouts);
    try {
      localStorage.setItem(layoutKey(activeId), JSON.stringify(allLayouts));
    } catch {
      // ignore
    }
  };

  // Multi-instance widgets render under a `<type>-<id>` key (projects use `proj-`);
  // map one back to its parts.
  const parseInstanceKey = (key: string): { type: WidgetType; id: string } | null => {
    if (key.startsWith('proj-')) return { type: 'projects', id: key.slice('proj-'.length) };
    for (const type of ['market-asset', 'market-watchlist', 'finances', 'scratchpad'] as const) {
      const prefix = `${type}-`;
      if (key.startsWith(prefix)) return { type, id: key.slice(prefix.length) };
    }
    return null;
  };

  const removeWidget = (key: string) => {
    const inst = parseInstanceKey(key);
    if (inst) {
      setWidgets((prev) => prev.filter((w) => !(w.type === inst.type && 'id' in w && w.id === inst.id)));
      return;
    }
    setWidgets((prev) => prev.filter((w) => w.type !== (key as WidgetType)));
  };

  const updateConfig = (type: WidgetType, config: WidgetInstance['config']) => {
    setWidgets((prev) => prev.map((w) => (w.type === type ? ({ type, config } as WidgetInstance) : w)));
  };

  // Patch one multi-instance card's config by id, preserving its discriminant + id.
  const updateInstance = (type: WidgetType, id: string, config: WidgetInstance['config']) => {
    setWidgets((prev) =>
      prev.map((w) => (w.type === type && 'id' in w && w.id === id ? ({ ...w, config } as WidgetInstance) : w)),
    );
  };

  // Inner content for one rendered grid key.
  const renderContent = (key: string): { node: React.ReactNode; scroll?: boolean } => {
    if (key.startsWith('proj-')) {
      const id = key.slice('proj-'.length);
      const w = widgets.find((x) => x.type === 'projects' && 'id' in x && x.id === id);
      const projectId = w?.type === 'projects' ? w.config.projectId : null;
      // Pinned project, or the most-recently-updated one as a sensible default.
      const project = projectId
        ? projects.find((p) => p.id === projectId)
        : recentProjects[0];
      return {
        node: (
          <ProjectCard
            project={project}
            tasks={tasks}
            projects={projects}
            onSelectProject={(pid) => updateInstance('projects', id, { projectId: pid })}
          />
        ),
      };
    }
    if (key.startsWith('scratchpad-')) {
      const id = key.slice('scratchpad-'.length);
      const w = widgets.find((x) => x.type === 'scratchpad' && 'id' in x && x.id === id);
      return {
        node:
          w?.type === 'scratchpad' ? (
            <ScratchpadWidget config={w.config} onConfigChange={(c) => updateInstance('scratchpad', id, c)} />
          ) : null,
      };
    }
    if (key.startsWith('finances-')) {
      const id = key.slice('finances-'.length);
      const w = widgets.find((x) => x.type === 'finances' && x.id === id);
      return {
        node:
          w?.type === 'finances' ? (
            <FinancesWidget config={w.config} onConfigChange={(c) => updateInstance('finances', id, c)} />
          ) : null,
      };
    }
    if (key.startsWith('market-asset-')) {
      const id = key.slice('market-asset-'.length);
      const w = widgets.find((x) => x.type === 'market-asset' && x.id === id);
      return {
        node:
          w?.type === 'market-asset' ? (
            <MarketAssetWidget
              config={w.config}
              onConfigChange={(c: MarketAssetConfig) => updateInstance('market-asset', id, c)}
            />
          ) : null,
      };
    }
    if (key.startsWith('market-watchlist-')) {
      const id = key.slice('market-watchlist-'.length);
      const w = widgets.find((x) => x.type === 'market-watchlist' && x.id === id);
      return {
        node:
          w?.type === 'market-watchlist' ? (
            <MarketWatchlistWidget
              config={w.config}
              onConfigChange={(c: MarketWatchlistConfig) => updateInstance('market-watchlist', id, c)}
            />
          ) : null,
      };
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
      case 'usage':
        return { node: <UsageWidget /> };
      case 'shipped':
        return { node: <ShippedWidget /> };
      case 'system-monitor':
        return { node: <SystemMonitorWidget /> };

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
      case 'quote': {
        const w = widgets.find((x) => x.type === 'quote');
        // Merge over defaults so quote instances saved before it gained settings still render.
        return {
          node:
            w?.type === 'quote' ? (
              <QuoteWidget
                config={{ ...QUOTE_DEFAULTS, ...w.config }}
                onConfigChange={(c) => updateConfig('quote', c)}
              />
            ) : null,
        };
      }

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
    const inst = parseInstanceKey(key);
    if (inst) {
      if (inst.type === 'finances') {
        const w = widgets.find((x) => x.type === 'finances' && x.id === inst.id);
        return `Remove ${(w?.type === 'finances' && w.config.title) || 'Finances'}`;
      }
      return `Remove ${DASHBOARD_WIDGETS[inst.type]?.label ?? 'widget'}`;
    }
    const type: WidgetType = key.startsWith('proj-') ? 'projects' : (key as WidgetType);
    return `Remove ${DASHBOARD_WIDGETS[type]?.label ?? 'widget'}`;
  };

  return (
    <div className="container pb-48 pt-2" ref={containerRef}>
      <DashboardTabs />
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
              <div
                key={key}
                className="dashboard-panel group/panel relative"
                style={{ animationDelay: `${cardDelayMs(key)}ms` }}
              >
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
