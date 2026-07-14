import {
  Activity,
  BarChart3,
  Clock,
  Coins,
  Gauge,
  HeartPulse,
  ListChecks,
  PieChart,
  Stethoscope,
  Timer,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/**
 * The Ops board's widget catalogue. Deliberately **separate** from the dashboard's
 * `lib/dashboard-widgets.ts` registry: the two boards keep independent catalogues,
 * storage keys, and pickers so their add/remove options never overlap (mutually
 * exclusive for now). Each type doubles as its react-grid-layout item key `i`.
 *
 * Every ops widget is single-instance and config-less — the sections either take
 * page-level data as props (gauges/throughput/…) or self-poll (cost/decisions/…),
 * so there's nothing per-instance to persist beyond "is it on the board".
 */
export type OpsWidgetType =
  | 'gauges'
  | 'throughput'
  | 'outcomes'
  | 'duration'
  | 'spend'
  | 'cost'
  | 'cycle-fleet'
  | 'run-timeline'
  | 'task-health'
  | 'runtime-health'
  | 'decisions';

/** One enabled ops widget on the board. */
export type OpsWidgetInstance = { type: OpsWidgetType };

export type Breakpoint = 'lg' | 'md' | 'sm';
export type WidgetSize = { w: number; h: number; minW: number; minH: number };

/** The section an ops widget is filed under in the "add widget" picker. */
export type OpsWidgetCategory = 'fleet' | 'runs' | 'cost' | 'health';

/** Picker section order + display labels. Every widget's `category` appears here. */
export const OPS_WIDGET_CATEGORIES: readonly { key: OpsWidgetCategory; label: string }[] = [
  { key: 'fleet', label: 'Fleet' },
  { key: 'runs', label: 'Runs & throughput' },
  { key: 'cost', label: 'Cost & spend' },
  { key: 'health', label: 'Health & audit' },
];

type OpsWidgetMeta = {
  label: string;
  description: string;
  icon: LucideIcon;
  category: OpsWidgetCategory;
  /** Default grid footprint per breakpoint (cols: lg 12, md 8, sm 4). */
  sizes: Record<Breakpoint, WidgetSize>;
};

/** A wide, short readout band. */
const bandSizes: Record<Breakpoint, WidgetSize> = {
  lg: { w: 12, h: 4, minW: 4, minH: 3 },
  md: { w: 8, h: 4, minW: 4, minH: 3 },
  sm: { w: 4, h: 6, minW: 2, minH: 4 },
};

/** A half-width chart card. */
const chartSizes: Record<Breakpoint, WidgetSize> = {
  lg: { w: 6, h: 5, minW: 3, minH: 4 },
  md: { w: 4, h: 5, minW: 3, minH: 4 },
  sm: { w: 4, h: 5, minW: 2, minH: 4 },
};

/** A tall, full-width composite panel (two stacked cards + its own controls). */
const compositeSizes: Record<Breakpoint, WidgetSize> = {
  lg: { w: 12, h: 12, minW: 5, minH: 8 },
  md: { w: 8, h: 12, minW: 5, minH: 8 },
  sm: { w: 4, h: 14, minW: 2, minH: 8 },
};

/** A full-width panel (table / list). */
const panelSizes: Record<Breakpoint, WidgetSize> = {
  lg: { w: 12, h: 8, minW: 4, minH: 5 },
  md: { w: 8, h: 8, minW: 4, minH: 5 },
  sm: { w: 4, h: 8, minW: 2, minH: 5 },
};

export const OPS_WIDGETS: Record<OpsWidgetType, OpsWidgetMeta> = {
  gauges: {
    label: 'Live fleet state',
    description: 'Slot utilization, queue depth and scheduler tick latency',
    icon: Gauge,
    category: 'fleet',
    sizes: bandSizes,
  },
  throughput: {
    label: 'Throughput',
    description: 'Server-recorded runs completed per day',
    icon: BarChart3,
    category: 'runs',
    sizes: chartSizes,
  },
  outcomes: {
    label: 'Run outcomes',
    description: 'Done / abandoned / failed / cancelled breakdown',
    icon: PieChart,
    category: 'runs',
    sizes: chartSizes,
  },
  duration: {
    label: 'Run duration',
    description: 'Distribution of run durations across buckets',
    icon: Timer,
    category: 'runs',
    sizes: chartSizes,
  },
  spend: {
    label: 'LLM spend',
    description: 'Estimated LLM spend over the last 30 days',
    icon: Wallet,
    category: 'cost',
    sizes: chartSizes,
  },
  cost: {
    label: 'Cost by dimension',
    description: 'Agent-session spend trend and per-repo/project/provider breakdown',
    icon: Coins,
    category: 'cost',
    sizes: compositeSizes,
  },
  'cycle-fleet': {
    label: 'Cycle time & fleet trend',
    description: 'Wait-vs-work percentiles and a gauge series over time',
    icon: Activity,
    category: 'runs',
    sizes: compositeSizes,
  },
  'run-timeline': {
    label: 'Run timeline',
    description: 'Drill into a single task’s agent-run strip by id',
    icon: Clock,
    category: 'runs',
    sizes: {
      lg: { w: 12, h: 6, minW: 4, minH: 4 },
      md: { w: 8, h: 6, minW: 4, minH: 4 },
      sm: { w: 4, h: 6, minW: 2, minH: 4 },
    },
  },
  'task-health': {
    label: 'Task health',
    description: 'What’s wedged — stuck, aged, waiting and recently failed tasks',
    icon: Stethoscope,
    category: 'health',
    sizes: panelSizes,
  },
  'runtime-health': {
    label: 'Runtime health',
    description: 'Gateway preflight checks and uptime',
    icon: HeartPulse,
    category: 'health',
    sizes: {
      lg: { w: 6, h: 6, minW: 3, minH: 4 },
      md: { w: 8, h: 6, minW: 4, minH: 4 },
      sm: { w: 4, h: 6, minW: 2, minH: 4 },
    },
  },
  decisions: {
    label: 'Decisions',
    description: 'Approval audit log — tool, resolution and who decided',
    icon: ListChecks,
    category: 'health',
    sizes: {
      lg: { w: 12, h: 10, minW: 4, minH: 6 },
      md: { w: 8, h: 10, minW: 4, minH: 6 },
      sm: { w: 4, h: 10, minW: 2, minH: 6 },
    },
  },
};

export const ALL_OPS_WIDGET_TYPES = Object.keys(OPS_WIDGETS) as OpsWidgetType[];

/** localStorage keys for the ops board (kept distinct from the dashboard's). */
export const OPS_WIDGETS_STORAGE_KEY = 'midnite.ops.widgets';
export const OPS_LAYOUT_STORAGE_KEY = 'midnite-ops-layout';

/**
 * Default ops board: the sections the page rendered before it became a grid —
 * live gauges, the run charts, cost/cycle composites, the run-timeline drill-down,
 * and the two health panels. `decisions` (previously behind a tab) is available in
 * the picker but off by default.
 */
export const DEFAULT_OPS_WIDGETS: OpsWidgetInstance[] = [
  { type: 'gauges' },
  { type: 'throughput' },
  { type: 'outcomes' },
  { type: 'duration' },
  { type: 'spend' },
  { type: 'run-timeline' },
  { type: 'cost' },
  { type: 'cycle-fleet' },
  { type: 'task-health' },
  { type: 'runtime-health' },
];

/** A catalogue entry: registry metadata plus whether it's already on the board. */
export type OpsWidgetCatalogEntry = { type: OpsWidgetType; added: boolean } & OpsWidgetMeta;

/** Every ops widget in registry order, tagged with `added` so the picker can grey
 *  out what's already placed (all ops widgets are single-instance). */
export function opsWidgetCatalog(enabled: OpsWidgetInstance[]): OpsWidgetCatalogEntry[] {
  const present = new Set(enabled.map((w) => w.type));
  return ALL_OPS_WIDGET_TYPES.map((type) => ({
    type,
    added: present.has(type),
    ...OPS_WIDGETS[type],
  }));
}

/** One section of the add-widget picker: a category and the entries filed under it. */
export type OpsWidgetCatalogGroup = {
  category: OpsWidgetCategory;
  label: string;
  items: OpsWidgetCatalogEntry[];
};

/**
 * Filter a catalogue by a search query (matched against label + description), then
 * bucket survivors into {@link OPS_WIDGET_CATEGORIES} order. Empty sections drop.
 */
export function groupOpsWidgetCatalog(
  entries: OpsWidgetCatalogEntry[],
  query: string,
): OpsWidgetCatalogGroup[] {
  const q = query.trim().toLowerCase();
  const matched = entries.filter(
    (e) => !q || e.label.toLowerCase().includes(q) || e.description.toLowerCase().includes(q),
  );
  return OPS_WIDGET_CATEGORIES.map(({ key, label }) => ({
    category: key,
    label,
    items: matched.filter((e) => e.category === key),
  })).filter((group) => group.items.length > 0);
}

/** Default footprint for a rendered grid key at a breakpoint. */
export function opsSizeForKey(key: string, bp: Breakpoint): WidgetSize {
  return (OPS_WIDGETS[key as OpsWidgetType] ?? OPS_WIDGETS.throughput).sizes[bp];
}
