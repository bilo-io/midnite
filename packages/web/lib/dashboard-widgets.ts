import {
  Activity,
  BarChart3,
  BookMarked,
  Bot,
  Brain,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  CloudSun,
  FolderKanban,
  Globe,
  HeartPulse,
  Inbox,
  LayoutGrid,
  Link as LinkIcon,
  ListTodo,
  Loader,
  Newspaper,
  NotebookPen,
  Quote,
  StickyNote,
  TerminalSquare,
  Timer,
  Users,
  Wallet,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { NEWS_MAX_COUNT } from '@midnite/shared';

// A widget's stable type doubles as its react-grid-layout item key `i`. The one
// exception is `projects`, which expands to one `proj-N` grid item per recent
// project (see the grid's key derivation).
export type WidgetType =
  | 'tile-backlog'
  | 'tile-todo'
  | 'tile-inProgress'
  | 'tile-done'
  | 'projects'
  | 'notes'
  | 'routines'
  | 'news'
  | 'weather'
  | 'clock'
  | 'date'
  // midnite-native
  | 'sessions'
  | 'workflows'
  | 'memories'
  | 'agents'
  | 'councils'
  // live activity
  | 'activity'
  | 'throughput'
  | 'health'
  // at-a-glance extras
  | 'world-clocks'
  | 'all-projects'
  | 'knowledge'
  | 'quote'
  // productivity tools
  | 'timer'
  | 'calendar'
  | 'scratchpad'
  | 'links'
  | 'finances';

export type WeatherUnits = 'c' | 'f';
export type ClockMode = 'digital' | 'analogue';

/** Manual location fallback when geolocation is denied/unavailable. */
export type WeatherLocation = { lat: number; lon: number; label?: string };

/** A single named timezone shown by the world-clocks widget. */
export type WorldClockZone = { label: string; tz: string };

/** A single bookmark shown by the quick-links widget. */
export type QuickLink = { label: string; url: string };

/** A single income or expense row on a finances card. */
export type FinanceEntry = { id: string; label: string; amount: number };

/** State for one finances card: a title, income/expense rows, and a list⇄totals toggle. */
export type FinanceConfig = {
  title: string;
  income: FinanceEntry[];
  expenses: FinanceEntry[];
  /** true = show the line-item list, false = show totals only. */
  showDetail: boolean;
};

// Per-widget configuration persisted alongside the instance. Widgets without
// settings carry no config.
export type WidgetConfig = {
  news: { count: number };
  weather: { units: WeatherUnits; location: WeatherLocation | null };
  clock: { mode: ClockMode };
  'world-clocks': { zones: WorldClockZone[] };
  timer: { workMin: number; breakMin: number };
  scratchpad: { text: string };
  links: { links: QuickLink[] };
  finances: FinanceConfig;
};

/** Widget types that carry settings (have a `WidgetConfig` entry). */
export type ConfigurableWidget = keyof WidgetConfig;

export type WidgetInstance =
  | { type: 'news'; config: WidgetConfig['news'] }
  | { type: 'weather'; config: WidgetConfig['weather'] }
  | { type: 'clock'; config: WidgetConfig['clock'] }
  | { type: 'world-clocks'; config: WidgetConfig['world-clocks'] }
  | { type: 'timer'; config: WidgetConfig['timer'] }
  | { type: 'scratchpad'; config: WidgetConfig['scratchpad'] }
  | { type: 'links'; config: WidgetConfig['links'] }
  // Multi-instance: each finances card carries a stable `id` (others are keyed by type alone).
  | { type: 'finances'; id: string; config: WidgetConfig['finances'] }
  | { type: Exclude<WidgetType, ConfigurableWidget>; config?: undefined };

export type WidgetSize = { w: number; h: number; minW: number; minH: number };
export type Breakpoint = 'lg' | 'md' | 'sm';

type WidgetMeta = {
  label: string;
  description: string;
  icon: LucideIcon;
  /** Default grid footprint per breakpoint (cols: lg 12, md 8, sm 4). */
  sizes: Record<Breakpoint, WidgetSize>;
};

const tileSizes: Record<Breakpoint, WidgetSize> = {
  lg: { w: 3, h: 3, minW: 1, minH: 2 },
  md: { w: 2, h: 3, minW: 1, minH: 2 },
  sm: { w: 2, h: 3, minW: 1, minH: 2 },
};

const panelSizes: Record<Breakpoint, WidgetSize> = {
  lg: { w: 6, h: 8, minW: 3, minH: 4 },
  md: { w: 4, h: 8, minW: 3, minH: 4 },
  sm: { w: 4, h: 8, minW: 3, minH: 4 },
};

/** A medium card: roughly weather/clock sized, comfortable for a short list or readout. */
const mediumSizes: Record<Breakpoint, WidgetSize> = {
  lg: { w: 4, h: 5, minW: 2, minH: 3 },
  md: { w: 4, h: 5, minW: 2, minH: 3 },
  sm: { w: 4, h: 5, minW: 2, minH: 3 },
};

export const DASHBOARD_WIDGETS: Record<WidgetType, WidgetMeta> = {
  'tile-backlog': { label: 'Backlog', description: 'Count of parked or ambiguous tasks', icon: Inbox, sizes: tileSizes },
  'tile-todo': { label: 'Todo', description: 'Count of queued, ready-to-start tasks', icon: ListTodo, sizes: tileSizes },
  'tile-inProgress': { label: 'In progress', description: 'Count of running or waiting tasks', icon: Loader, sizes: tileSizes },
  'tile-done': { label: 'Done', description: 'Count of completed tasks', icon: CheckCircle2, sizes: tileSizes },
  projects: {
    label: 'Recent projects',
    description: 'Cards for your most recently updated projects',
    icon: FolderKanban,
    sizes: {
      lg: { w: 4, h: 5, minW: 2, minH: 3 },
      md: { w: 4, h: 5, minW: 2, minH: 3 },
      sm: { w: 4, h: 5, minW: 2, minH: 3 },
    },
  },
  notes: { label: 'Notes', description: 'Quick notes with speech-to-text', icon: StickyNote, sizes: panelSizes },
  routines: { label: 'Routines', description: 'Track your daily routines', icon: CalendarCheck, sizes: panelSizes },
  news: {
    label: 'Hacker News',
    description: 'Top stories from Hacker News',
    icon: Newspaper,
    sizes: { lg: { w: 4, h: 8, minW: 3, minH: 4 }, md: { w: 4, h: 8, minW: 3, minH: 4 }, sm: { w: 4, h: 8, minW: 3, minH: 4 } },
  },
  weather: {
    label: 'Weather',
    description: 'Current conditions and today’s outlook',
    icon: CloudSun,
    sizes: { lg: { w: 3, h: 5, minW: 2, minH: 2 }, md: { w: 3, h: 5, minW: 2, minH: 2 }, sm: { w: 2, h: 5, minW: 2, minH: 2 } },
  },
  clock: {
    label: 'Clock',
    description: 'Digital or analogue clock',
    icon: Clock,
    sizes: { lg: { w: 3, h: 4, minW: 2, minH: 3 }, md: { w: 3, h: 4, minW: 2, minH: 3 }, sm: { w: 2, h: 4, minW: 2, minH: 3 } },
  },
  date: {
    label: 'Date',
    description: 'Today’s date',
    icon: Calendar,
    sizes: { lg: { w: 3, h: 2, minW: 2, minH: 2 }, md: { w: 2, h: 2, minW: 2, minH: 2 }, sm: { w: 2, h: 2, minW: 2, minH: 2 } },
  },

  // — midnite-native ————————————————————————————————————————————————
  sessions: { label: 'Live sessions', description: 'Active Claude Code sessions and their status', icon: TerminalSquare, sizes: panelSizes },
  workflows: { label: 'Workflows', description: 'Workflow definitions and last-run status', icon: Workflow, sizes: panelSizes },
  memories: { label: 'Recent memories', description: 'Most recently updated agent memories', icon: Brain, sizes: panelSizes },
  agents: { label: 'Agent pool', description: 'Primary agent, model and sub-agents', icon: Bot, sizes: mediumSizes },
  councils: { label: 'Councils', description: 'Your councils and their participants', icon: Users, sizes: panelSizes },

  // — live activity —————————————————————————————————————————————————
  activity: { label: 'Activity feed', description: 'Recent task status changes', icon: Activity, sizes: panelSizes },
  throughput: {
    label: 'Throughput',
    description: 'Tasks completed over the last two weeks',
    icon: BarChart3,
    sizes: { lg: { w: 4, h: 4, minW: 3, minH: 3 }, md: { w: 4, h: 4, minW: 3, minH: 3 }, sm: { w: 4, h: 4, minW: 3, minH: 3 } },
  },
  health: {
    label: 'System health',
    description: 'Gateway reachability and agent status',
    icon: HeartPulse,
    sizes: { lg: { w: 4, h: 4, minW: 2, minH: 3 }, md: { w: 4, h: 4, minW: 2, minH: 3 }, sm: { w: 4, h: 4, minW: 2, minH: 3 } },
  },

  // — at-a-glance extras ————————————————————————————————————————————
  'world-clocks': {
    label: 'World clocks',
    description: 'Current time across multiple timezones',
    icon: Globe,
    sizes: { lg: { w: 4, h: 4, minW: 2, minH: 3 }, md: { w: 4, h: 4, minW: 2, minH: 3 }, sm: { w: 4, h: 4, minW: 2, minH: 3 } },
  },
  'all-projects': { label: 'All projects', description: 'Every project with its task breakdown', icon: LayoutGrid, sizes: panelSizes },
  knowledge: { label: 'Knowledge sources', description: 'Indexed global knowledge sources', icon: BookMarked, sizes: panelSizes },
  quote: {
    label: 'Quote',
    description: 'A quote that changes daily',
    icon: Quote,
    sizes: { lg: { w: 4, h: 3, minW: 2, minH: 2 }, md: { w: 4, h: 3, minW: 2, minH: 2 }, sm: { w: 4, h: 3, minW: 2, minH: 2 } },
  },

  // — productivity tools ————————————————————————————————————————————
  timer: {
    label: 'Focus timer',
    description: 'Pomodoro-style work / break countdown',
    icon: Timer,
    sizes: { lg: { w: 3, h: 5, minW: 2, minH: 4 }, md: { w: 3, h: 5, minW: 2, minH: 4 }, sm: { w: 2, h: 5, minW: 2, minH: 4 } },
  },
  calendar: {
    label: 'Calendar',
    description: 'Mini month calendar',
    icon: CalendarDays,
    sizes: { lg: { w: 4, h: 6, minW: 3, minH: 5 }, md: { w: 4, h: 6, minW: 3, minH: 5 }, sm: { w: 4, h: 6, minW: 3, minH: 5 } },
  },
  scratchpad: { label: 'Scratchpad', description: 'Freeform notepad saved on this device', icon: NotebookPen, sizes: panelSizes },
  links: {
    label: 'Quick links',
    description: 'Your own grid of bookmarks',
    icon: LinkIcon,
    sizes: mediumSizes,
  },
  finances: {
    label: 'Finances',
    description: 'Income vs expenses with the leftover — one card per budget',
    icon: Wallet,
    sizes: mediumSizes,
  },
};

/**
 * Widget types that may appear more than once on the board. Unlike single-instance
 * widgets (keyed by their type), these carry a per-instance `id` and render under a
 * `<type>-<id>` grid key — mirroring how `projects` fans out to `proj-N`.
 */
export const MULTI_INSTANCE = new Set<WidgetType>(['finances']);

export const ALL_WIDGET_TYPES = Object.keys(DASHBOARD_WIDGETS) as WidgetType[];

/** localStorage key for the enabled-widgets list, shared by the grid and the header "+". */
export const DASHBOARD_WIDGETS_STORAGE_KEY = 'midnite.dashboard.widgets';

/** Default board: the current hardcoded set (status tiles + projects + notes + routines). */
export const DEFAULT_WIDGETS: WidgetInstance[] = [
  { type: 'tile-backlog' },
  { type: 'tile-todo' },
  { type: 'tile-inProgress' },
  { type: 'tile-done' },
  { type: 'projects' },
  { type: 'notes' },
  { type: 'routines' },
];

/** A fresh instance (with default config) for a type just added from the catalogue. */
export function newInstance(type: WidgetType): WidgetInstance {
  switch (type) {
    case 'news':
      return { type, config: { count: NEWS_MAX_COUNT } };
    case 'weather':
      return { type, config: { units: 'c', location: null } };
    case 'clock':
      return { type, config: { mode: 'digital' } };
    case 'world-clocks':
      return {
        type,
        config: {
          zones: [
            { label: 'London', tz: 'Europe/London' },
            { label: 'New York', tz: 'America/New_York' },
            { label: 'Tokyo', tz: 'Asia/Tokyo' },
          ],
        },
      };
    case 'timer':
      return { type, config: { workMin: 25, breakMin: 5 } };
    case 'scratchpad':
      return { type, config: { text: '' } };
    case 'links':
      return { type, config: { links: [] } };
    case 'finances':
      return {
        type,
        id: crypto.randomUUID(),
        config: { title: 'Finances', income: [], expenses: [], showDetail: true },
      };
    default:
      return { type } as WidgetInstance;
  }
}

/** Registry entries for widgets not yet on the board, in registry order. */
export function widgetCatalog(enabled: WidgetInstance[]): Array<{ type: WidgetType } & WidgetMeta> {
  const present = new Set(enabled.map((w) => w.type));
  // Multi-instance widgets stay in the catalogue even once placed, so you can add more.
  return ALL_WIDGET_TYPES.filter((t) => MULTI_INSTANCE.has(t) || !present.has(t)).map((type) => ({
    type,
    ...DASHBOARD_WIDGETS[type],
  }));
}

/** Default footprint for a rendered grid key (`proj-N` maps to the `projects` size). */
export function sizeForKey(key: string, bp: Breakpoint): WidgetSize {
  let type: WidgetType;
  if (key.startsWith('proj-')) type = 'projects';
  else if (key.startsWith('finances-')) type = 'finances';
  else type = key as WidgetType;
  return (DASHBOARD_WIDGETS[type] ?? DASHBOARD_WIDGETS.notes).sizes[bp];
}
