'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import type { Layout, LayoutItem, ResponsiveLayouts } from 'react-grid-layout';
import type {
  AgentPoolSnapshot,
  OpsSummary,
  TasksDoctorReport,
  UsageSummaryResponse,
} from '@midnite/shared';
import {
  DEFAULT_OPS_WIDGETS,
  migrateOpsWidgets,
  OPS_LAYOUT_STORAGE_KEY,
  OPS_WIDGETS,
  OPS_WIDGETS_STORAGE_KEY,
  opsSizeForKey,
  opsWidgetsNeedMigration,
  type Breakpoint,
  type OpsWidgetInstance,
  type OpsWidgetType,
} from '@/lib/ops-widgets';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  DecisionsSection,
  DurationSection,
  GaugesSection,
  OutcomesSection,
  RunTimelineDrilldown,
  SpendSection,
  ThroughputSection,
} from './ops-view';
import { CostBreakdownPanel, CostTrendPanel } from './ops-cost';
import { CycleTimePanel, FleetTrendPanel } from './ops-cycle-fleet';
import { TaskHealthPanel } from './task-health-panel';
import { RuntimeHealthPanel } from './runtime-health-panel';

const BREAKPOINTS: Breakpoint[] = ['lg', 'md', 'sm'];
const ROW_HEIGHT = 44;
const MARGIN: [number, number] = [12, 12];

function item(i: string, x: number, y: number, w: number, h: number, extra?: Partial<LayoutItem>): LayoutItem {
  return { i, x, y, w, h, ...extra };
}

// Curated arrangement for the ops board: the vertical stack the page used before
// it became a grid, with the run charts paired two-up. Other/newly-added widgets
// are reconciled (appended at the bottom) on top of this base.
function defaultLayouts(): ResponsiveLayouts {
  const lg: LayoutItem[] = [
    item('gauges', 0, 0, 12, 4, { minW: 4, minH: 3 }),
    item('throughput', 0, 4, 6, 5, { minW: 3, minH: 4 }),
    item('outcomes', 6, 4, 6, 5, { minW: 3, minH: 4 }),
    item('duration', 0, 9, 6, 5, { minW: 3, minH: 4 }),
    item('spend', 6, 9, 6, 5, { minW: 3, minH: 4 }),
    item('run-timeline', 0, 14, 12, 6, { minW: 4, minH: 4 }),
    item('cost-trend', 0, 20, 6, 7, { minW: 3, minH: 5 }),
    item('cost-breakdown', 6, 20, 6, 7, { minW: 3, minH: 5 }),
    item('cycle-time', 0, 27, 6, 7, { minW: 3, minH: 5 }),
    item('fleet-trend', 6, 27, 6, 7, { minW: 3, minH: 5 }),
    item('task-health', 0, 34, 12, 8, { minW: 4, minH: 5 }),
    item('runtime-health', 0, 42, 6, 6, { minW: 3, minH: 4 }),
    item('decisions', 0, 48, 12, 10, { minW: 4, minH: 6 }),
  ];

  const md: LayoutItem[] = [
    item('gauges', 0, 0, 8, 4, { minW: 4, minH: 3 }),
    item('throughput', 0, 4, 4, 5, { minW: 3, minH: 4 }),
    item('outcomes', 4, 4, 4, 5, { minW: 3, minH: 4 }),
    item('duration', 0, 9, 4, 5, { minW: 3, minH: 4 }),
    item('spend', 4, 9, 4, 5, { minW: 3, minH: 4 }),
    item('run-timeline', 0, 14, 8, 6, { minW: 4, minH: 4 }),
    item('cost-trend', 0, 20, 4, 7, { minW: 3, minH: 5 }),
    item('cost-breakdown', 4, 20, 4, 7, { minW: 3, minH: 5 }),
    item('cycle-time', 0, 27, 4, 7, { minW: 3, minH: 5 }),
    item('fleet-trend', 4, 27, 4, 7, { minW: 3, minH: 5 }),
    item('task-health', 0, 34, 8, 8, { minW: 4, minH: 5 }),
    item('runtime-health', 0, 42, 8, 6, { minW: 4, minH: 4 }),
    item('decisions', 0, 48, 8, 10, { minW: 4, minH: 6 }),
  ];

  // Single-column stack on the narrowest breakpoint.
  const smSpec: Array<[string, number]> = [
    ['gauges', 6],
    ['throughput', 5],
    ['outcomes', 5],
    ['duration', 5],
    ['spend', 5],
    ['run-timeline', 6],
    ['cost-trend', 7],
    ['cost-breakdown', 7],
    ['cycle-time', 7],
    ['fleet-trend', 7],
    ['task-health', 8],
    ['runtime-health', 6],
    ['decisions', 10],
  ];
  let smY = 0;
  const sm: LayoutItem[] = smSpec.map(([i, h]) => {
    const it = item(i, 0, smY, 4, h, { minW: 2, minH: Math.min(h, 4) });
    smY += h;
    return it;
  });

  return { lg, md, sm };
}

// Reconcile a base layout against the rendered keys: keep positioned items still
// rendered, drop the rest, append defaults (at the bottom) for keys with no
// position yet, and re-stamp minW/minH from the live catalog.
function reconcile(base: ResponsiveLayouts, renderedKeys: string[]): ResponsiveLayouts {
  const rendered = new Set(renderedKeys);
  const defaults = defaultLayouts();
  const out = {} as ResponsiveLayouts;

  for (const bp of BREAKPOINTS) {
    const baseItems = (base[bp] as LayoutItem[] | undefined) ?? [];
    const kept: LayoutItem[] = baseItems
      .filter((it) => rendered.has(it.i))
      .map((it) => {
        const size = opsSizeForKey(it.i, bp);
        return { ...it, minW: size.minW, minH: size.minH };
      });
    const have = new Set(kept.map((it) => it.i));
    const defByKey = new Map(((defaults[bp] as LayoutItem[]) ?? []).map((it) => [it.i, it]));
    let maxY = kept.reduce((m, it) => Math.max(m, it.y + it.h), 0);

    for (const key of renderedKeys) {
      if (have.has(key)) continue;
      const fromDefault = defByKey.get(key);
      const size = opsSizeForKey(key, bp);
      kept.push(fromDefault ?? item(key, 0, maxY, size.w, size.h, { minW: size.minW, minH: size.minH }));
      maxY += fromDefault ? fromDefault.h : size.h;
      have.add(key);
    }
    out[bp] = kept;
  }
  return out;
}

interface OpsGridProps {
  pool: AgentPoolSnapshot | null;
  summary: OpsSummary | null;
  usage: UsageSummaryResponse | null;
  doctor: TasksDoctorReport | null | undefined;
  loading: boolean;
}

export function OpsGrid({ pool, summary, usage, doctor, loading }: OpsGridProps) {
  const { width, mounted, containerRef } = useContainerWidth({ measureBeforeMount: true });

  const [widgets, setWidgets] = useLocalStorage<OpsWidgetInstance[]>(
    OPS_WIDGETS_STORAGE_KEY,
    DEFAULT_OPS_WIDGETS,
  );

  // Boards saved before the cost/cycle composites were split still store the
  // retired `cost`/`cycle-fleet` instances — expand them into per-card widgets on
  // mount so those cells render (reconcile then positions the new keys). One-shot.
  useEffect(() => {
    if (opsWidgetsNeedMigration(widgets)) setWidgets((prev) => migrateOpsWidgets(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- migrate once on mount
  }, []);

  // A stable random entrance delay per card key, so cards fade in staggered.
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

  const renderedKeys = useMemo(() => widgets.map((w) => w.type as string), [widgets]);

  // The persisted positions (null until the read completes).
  const [stored, setStored] = useState<ResponsiveLayouts | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPS_LAYOUT_STORAGE_KEY);
      if (raw) setStored(JSON.parse(raw) as ResponsiveLayouts);
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const layouts = useMemo(
    () => reconcile(stored ?? defaultLayouts(), renderedKeys),
    [stored, renderedKeys],
  );

  const handleLayoutChange = (_layout: Layout, allLayouts: ResponsiveLayouts) => {
    setStored(allLayouts);
    try {
      localStorage.setItem(OPS_LAYOUT_STORAGE_KEY, JSON.stringify(allLayouts));
    } catch {
      // ignore
    }
  };

  const removeWidget = (type: OpsWidgetType) => {
    setWidgets((prev) => prev.filter((w) => w.type !== type));
  };

  const renderContent = (key: OpsWidgetType): React.ReactNode => {
    switch (key) {
      case 'gauges':
        return <GaugesSection pool={pool} summary={summary} loading={loading} />;
      case 'throughput':
        return <ThroughputSection summary={summary} loading={loading} />;
      case 'outcomes':
        return <OutcomesSection summary={summary} loading={loading} />;
      case 'duration':
        return <DurationSection summary={summary} loading={loading} />;
      case 'spend':
        return <SpendSection usage={usage} loading={loading} />;
      case 'cost-trend':
        return <CostTrendPanel />;
      case 'cost-breakdown':
        return <CostBreakdownPanel />;
      case 'cycle-time':
        return <CycleTimePanel />;
      case 'fleet-trend':
        return <FleetTrendPanel />;
      case 'run-timeline':
        return <RunTimelineDrilldown />;
      case 'task-health':
        return <TaskHealthPanel report={doctor} />;
      case 'runtime-health':
        return <RuntimeHealthPanel />;
      case 'decisions':
        return <DecisionsSection />;
      default:
        return null;
    }
  };

  return (
    <div className="reveal-staged container pb-8 pt-2" ref={containerRef}>
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
          {renderedKeys.map((key) => (
            <div
              key={key}
              className="dashboard-panel group/panel relative"
              style={{ animationDelay: `${cardDelayMs(key)}ms` }}
            >
              <div className="drag-handle" aria-hidden="true" />
              <button
                type="button"
                onClick={() => removeWidget(key as OpsWidgetType)}
                aria-label={`Remove ${OPS_WIDGETS[key as OpsWidgetType]?.label ?? 'widget'}`}
                className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-md bg-background/70 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:bg-accent hover:text-destructive group-hover/panel:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="dashboard-panel__scroll">{renderContent(key as OpsWidgetType)}</div>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
