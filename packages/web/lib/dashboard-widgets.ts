import {
  Activity,
  BarChart3,
  Bot,
  Brain,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  CloudSun,
  Cpu,
  FolderKanban,
  Globe,
  HeartPulse,
  Inbox,
  LayoutGrid,
  LineChart,
  Link as LinkIcon,
  ListTodo,
  Loader,
  Newspaper,
  NotebookPen,
  PlusCircle,
  Quote,
  Rocket,
  Star,
  StickyNote,
  TerminalSquare,
  Timer,
  Users,
  Wallet,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { NEWS_MAX_COUNT, type AssetKind } from '@midnite/shared';
import type { WordmarkFontKey } from './wordmark-fonts';

// A widget's stable type doubles as its react-grid-layout item key `i`. The
// exceptions are the multi-instance widgets (e.g. `projects` → `proj-<id>`,
// `scratchpad` → `scratchpad-<id>`), keyed per instance (see the grid).
export type WidgetType =
  | 'tile-backlog'
  | 'tile-todo'
  | 'tile-inProgress'
  | 'tile-done'
  | 'quick-capture'
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
  | 'usage'
  | 'shipped'
  | 'system-monitor'
  // at-a-glance extras
  | 'world-clocks'
  | 'all-projects'
  | 'quote'
  // productivity tools
  | 'timer'
  | 'calendar'
  | 'scratchpad'
  | 'links'
  | 'finances'
  // market data
  | 'market-asset'
  | 'market-watchlist';

export type WeatherUnits = 'c' | 'f';
export type ClockMode = 'digital' | 'analogue';
/** How the Hacker News widget arranges its stories. */
export type NewsLayout = 'list' | 'grid';

/** Manual location fallback when geolocation is denied/unavailable. */
export type WeatherLocation = { lat: number; lon: number; label?: string };

/** A single named timezone shown by the world-clocks widget. */
export type WorldClockZone = { label: string; tz: string };

/** A single bookmark shown by the quick-links widget. `faviconUrl` is captured
 *  from link metadata at add-time and rendered before the label. */
export type QuickLink = { label: string; url: string; faviconUrl?: string };

/** Quote text size and the bounds for its auto-cycle interval. */
export type QuoteSize = 'sm' | 'md' | 'lg';
export const QUOTE_CYCLE_MIN_MS = 15_000;
export const QUOTE_CYCLE_DEFAULT_MS = 60_000;
export const QUOTE_CYCLE_MAX_MS = 3_600_000;

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

/** A reference to a tradeable asset: ticker (stocks) or CoinGecko coin id (crypto) + display name. */
export type MarketAsset = { kind: AssetKind; symbol: string; name: string };

/** One single-asset card. An empty `symbol` means "not configured yet" — show the picker. */
export type MarketAssetConfig = MarketAsset;

/** One watchlist card: a title and a short list of assets (capped at MARKET_WATCHLIST_MAX). */
export type MarketWatchlistConfig = { title: string; assets: MarketAsset[] };

// Per-widget configuration persisted alongside the instance. Widgets without
// settings carry no config.
export type WidgetConfig = {
  news: { count: number; layout: NewsLayout };
  weather: { units: WeatherUnits; location: WeatherLocation | null };
  clock: { mode: ClockMode };
  'world-clocks': { zones: WorldClockZone[]; mode: ClockMode };
  timer: { workMin: number; breakMin: number };
  // One scratchpad card: an editable title + freeform text.
  scratchpad: { title: string; text: string };
  // One project card: which project to show (null = most recently updated).
  projects: { projectId: string | null };
  links: { links: QuickLink[] };
  // `font: 'system'` renders the quote in the app's normal UI font; otherwise a wordmark face.
  quote: { size: QuoteSize; typingSpeedMs: number; cycleMs: number; font: WordmarkFontKey | 'system' };
  finances: FinanceConfig;
  'market-asset': MarketAssetConfig;
  'market-watchlist': MarketWatchlistConfig;
};

/** Widget types that carry settings (have a `WidgetConfig` entry). */
export type ConfigurableWidget = keyof WidgetConfig;

export type WidgetInstance =
  | { type: 'news'; config: WidgetConfig['news'] }
  | { type: 'weather'; config: WidgetConfig['weather'] }
  | { type: 'clock'; config: WidgetConfig['clock'] }
  | { type: 'world-clocks'; config: WidgetConfig['world-clocks'] }
  | { type: 'timer'; config: WidgetConfig['timer'] }
  | { type: 'links'; config: WidgetConfig['links'] }
  | { type: 'quote'; config: WidgetConfig['quote'] }
  // Multi-instance: each card carries a stable `id` (others are keyed by type alone).
  | { type: 'projects'; id: string; config: WidgetConfig['projects'] }
  | { type: 'scratchpad'; id: string; config: WidgetConfig['scratchpad'] }
  | { type: 'finances'; id: string; config: WidgetConfig['finances'] }
  | { type: 'market-asset'; id: string; config: WidgetConfig['market-asset'] }
  | { type: 'market-watchlist'; id: string; config: WidgetConfig['market-watchlist'] }
  | { type: Exclude<WidgetType, ConfigurableWidget>; config?: undefined };

export type WidgetSize = { w: number; h: number; minW: number; minH: number };
export type Breakpoint = 'lg' | 'md' | 'sm';

/** The section a widget is filed under in the "add widget" picker. */
export type WidgetCategory =
  | 'tasks'
  | 'agents'
  | 'activity'
  | 'system'
  | 'datetime'
  | 'finance'
  | 'info'
  | 'productivity';

/** Picker section order + display labels. Every widget's `category` must appear here. */
export const WIDGET_CATEGORIES: readonly { key: WidgetCategory; label: string }[] = [
  { key: 'tasks', label: 'Tasks & projects' },
  { key: 'agents', label: 'Agents' },
  { key: 'activity', label: 'Activity' },
  { key: 'system', label: 'System' },
  { key: 'datetime', label: 'Date & time' },
  { key: 'finance', label: 'Finance & markets' },
  { key: 'info', label: 'News & weather' },
  { key: 'productivity', label: 'Productivity' },
];

type WidgetMeta = {
  label: string;
  description: string;
  icon: LucideIcon;
  /** Section in the add-widget picker. */
  category: WidgetCategory;
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
  'tile-backlog': { label: 'Backlog', description: 'Count of parked or ambiguous tasks', icon: Inbox, category: 'tasks', sizes: tileSizes },
  'tile-todo': { label: 'Todo', description: 'Count of queued, ready-to-start tasks', icon: ListTodo, category: 'tasks', sizes: tileSizes },
  'tile-inProgress': { label: 'In progress', description: 'Count of running or waiting tasks', icon: Loader, category: 'tasks', sizes: tileSizes },
  'tile-done': { label: 'Done', description: 'Count of completed tasks', icon: CheckCircle2, category: 'tasks', sizes: tileSizes },
  'quick-capture': {
    label: 'Quick capture',
    description: 'Add a task (or paste a list) without leaving the dashboard',
    icon: PlusCircle,
    category: 'tasks',
    sizes: {
      lg: { w: 4, h: 4, minW: 2, minH: 3 },
      md: { w: 4, h: 4, minW: 2, minH: 3 },
      sm: { w: 4, h: 4, minW: 2, minH: 3 },
    },
  },
  projects: {
    label: 'Recent projects',
    description: 'Cards for your most recently updated projects',
    icon: FolderKanban,
    category: 'tasks',
    sizes: {
      lg: { w: 4, h: 5, minW: 2, minH: 3 },
      md: { w: 4, h: 5, minW: 2, minH: 3 },
      sm: { w: 4, h: 5, minW: 2, minH: 3 },
    },
  },
  notes: { label: 'Notes', description: 'Quick notes with speech-to-text', icon: StickyNote, category: 'productivity', sizes: panelSizes },
  routines: { label: 'Routines', description: 'Track your daily routines', icon: CalendarCheck, category: 'productivity', sizes: panelSizes },
  news: {
    label: 'Hacker News',
    description: 'Top stories from Hacker News',
    icon: Newspaper,
    category: 'info',
    sizes: { lg: { w: 4, h: 8, minW: 3, minH: 4 }, md: { w: 4, h: 8, minW: 3, minH: 4 }, sm: { w: 4, h: 8, minW: 3, minH: 4 } },
  },
  weather: {
    label: 'Weather',
    description: 'Current conditions and today’s outlook',
    icon: CloudSun,
    category: 'info',
    sizes: { lg: { w: 3, h: 5, minW: 2, minH: 2 }, md: { w: 3, h: 5, minW: 2, minH: 2 }, sm: { w: 2, h: 5, minW: 2, minH: 2 } },
  },
  clock: {
    label: 'Clock',
    description: 'Digital or analogue clock',
    icon: Clock,
    category: 'datetime',
    sizes: { lg: { w: 3, h: 4, minW: 2, minH: 3 }, md: { w: 3, h: 4, minW: 2, minH: 3 }, sm: { w: 2, h: 4, minW: 2, minH: 3 } },
  },
  date: {
    label: 'Date',
    description: 'Today’s date',
    icon: Calendar,
    category: 'datetime',
    sizes: { lg: { w: 3, h: 2, minW: 2, minH: 2 }, md: { w: 2, h: 2, minW: 2, minH: 2 }, sm: { w: 2, h: 2, minW: 2, minH: 2 } },
  },

  // — midnite-native ————————————————————————————————————————————————
  sessions: { label: 'Live sessions', description: 'Active agent sessions and their status', icon: TerminalSquare, category: 'agents', sizes: panelSizes },
  workflows: { label: 'Workflows', description: 'Workflow definitions and last-run status', icon: Workflow, category: 'agents', sizes: panelSizes },
  memories: { label: 'Recent memories', description: 'Most recently updated agent memories', icon: Brain, category: 'agents', sizes: panelSizes },
  agents: { label: 'Agent pool', description: 'Primary agent, model and sub-agents', icon: Bot, category: 'agents', sizes: mediumSizes },
  councils: { label: 'Councils', description: 'Your councils and their participants', icon: Users, category: 'agents', sizes: panelSizes },

  // — live activity —————————————————————————————————————————————————
  activity: { label: 'Activity feed', description: 'Recent task status changes', icon: Activity, category: 'activity', sizes: panelSizes },
  throughput: {
    label: 'Throughput',
    description: 'Tasks completed over the last two weeks',
    icon: BarChart3,
    category: 'activity',
    sizes: { lg: { w: 4, h: 4, minW: 3, minH: 3 }, md: { w: 4, h: 4, minW: 3, minH: 3 }, sm: { w: 4, h: 4, minW: 3, minH: 3 } },
  },
  health: {
    label: 'System health',
    description: 'Gateway reachability and agent status',
    icon: HeartPulse,
    category: 'system',
    sizes: { lg: { w: 4, h: 4, minW: 2, minH: 3 }, md: { w: 4, h: 4, minW: 2, minH: 3 }, sm: { w: 4, h: 4, minW: 2, minH: 3 } },
  },
  usage: {
    label: 'LLM cost & usage',
    description: 'Estimated spend by day, provider and feature',
    icon: Wallet,
    category: 'activity',
    sizes: panelSizes,
  },
  shipped: {
    label: 'Shipped',
    description: 'Recently completed tasks with their PR links',
    icon: Rocket,
    category: 'tasks',
    sizes: panelSizes,
  },
  'system-monitor': {
    label: 'System monitor',
    description: 'Live CPU and memory usage',
    icon: Cpu,
    category: 'system',
    sizes: { lg: { w: 4, h: 4, minW: 2, minH: 3 }, md: { w: 4, h: 4, minW: 2, minH: 3 }, sm: { w: 4, h: 4, minW: 2, minH: 3 } },
  },

  // — at-a-glance extras ————————————————————————————————————————————
  'world-clocks': {
    label: 'World clocks',
    description: 'Current time across multiple timezones',
    icon: Globe,
    category: 'datetime',
    sizes: { lg: { w: 4, h: 4, minW: 2, minH: 3 }, md: { w: 4, h: 4, minW: 2, minH: 3 }, sm: { w: 4, h: 4, minW: 2, minH: 3 } },
  },
  'all-projects': { label: 'All projects', description: 'Every project with its task breakdown', icon: LayoutGrid, category: 'tasks', sizes: panelSizes },
  quote: {
    label: 'Quote',
    description: 'A quote that changes daily',
    icon: Quote,
    category: 'productivity',
    sizes: { lg: { w: 4, h: 3, minW: 2, minH: 2 }, md: { w: 4, h: 3, minW: 2, minH: 2 }, sm: { w: 4, h: 3, minW: 2, minH: 2 } },
  },

  // — productivity tools ————————————————————————————————————————————
  timer: {
    label: 'Focus timer',
    description: 'Pomodoro-style work / break countdown',
    icon: Timer,
    category: 'productivity',
    sizes: { lg: { w: 3, h: 5, minW: 2, minH: 4 }, md: { w: 3, h: 5, minW: 2, minH: 4 }, sm: { w: 2, h: 5, minW: 2, minH: 4 } },
  },
  calendar: {
    label: 'Calendar',
    description: 'Mini month calendar',
    icon: CalendarDays,
    category: 'datetime',
    sizes: { lg: { w: 4, h: 6, minW: 3, minH: 5 }, md: { w: 4, h: 6, minW: 3, minH: 5 }, sm: { w: 4, h: 6, minW: 3, minH: 5 } },
  },
  scratchpad: { label: 'Scratchpad', description: 'Freeform notepad saved on this device', icon: NotebookPen, category: 'productivity', sizes: panelSizes },
  links: {
    label: 'Quick links',
    description: 'Your own grid of bookmarks',
    icon: LinkIcon,
    category: 'productivity',
    sizes: mediumSizes,
  },
  finances: {
    label: 'Finances',
    description: 'Income vs expenses with the leftover — one card per budget',
    icon: Wallet,
    category: 'finance',
    sizes: mediumSizes,
  },

  // — market data ———————————————————————————————————————————————————
  'market-asset': {
    label: 'Stock / Crypto',
    description: 'Live price, OHLC and a historic area chart for one asset',
    icon: LineChart,
    category: 'finance',
    sizes: mediumSizes,
  },
  'market-watchlist': {
    label: 'Watchlist',
    description: 'A handful of stocks or coins with price and gain/loss',
    icon: Star,
    category: 'finance',
    sizes: mediumSizes,
  },
};

/**
 * Widget types that may appear more than once on the board. Unlike single-instance
 * widgets (keyed by their type), these carry a per-instance `id` and render under a
 * `<type>-<id>` grid key — mirroring how `projects` fans out to `proj-N`.
 */
export const MULTI_INSTANCE = new Set<WidgetType>([
  'projects',
  'scratchpad',
  'finances',
  'market-asset',
  'market-watchlist',
]);

export const ALL_WIDGET_TYPES = Object.keys(DASHBOARD_WIDGETS) as WidgetType[];

/** localStorage key for the enabled-widgets list, shared by the grid and the header "+". */
export const DASHBOARD_WIDGETS_STORAGE_KEY = 'midnite.dashboard.widgets';

/** Default board: the current hardcoded set (status tiles + projects + notes + routines). */
export const DEFAULT_WIDGETS: WidgetInstance[] = [
  { type: 'tile-backlog' },
  { type: 'tile-todo' },
  { type: 'tile-inProgress' },
  { type: 'tile-done' },
  { type: 'projects', id: 'default-project', config: { projectId: null } },
  { type: 'notes' },
  { type: 'routines' },
];

/**
 * Seed for a freshly-added dashboard tab: a near-empty board with just the time
 * and date in the top-left (the grid auto-places them at x=0). Only the first
 * tab uses the fuller {@link DEFAULT_WIDGETS}.
 */
export const NEW_TAB_WIDGETS: WidgetInstance[] = [
  { type: 'clock', config: { mode: 'digital' } },
  { type: 'date' },
];

/** One react-grid-layout item, keyed by the grid item id (the widget type here). */
type SeedLayoutItem = { i: string; x: number; y: number; w: number; h: number; minW: number; minH: number };

/**
 * Matching seed layout for {@link NEW_TAB_WIDGETS}: the clock and date sit side by
 * side, equal size, in the top-left (rather than the grid's default top-stacked
 * auto-placement). Persisted to the new tab's layout key; the grid reconciles it.
 */
export const NEW_TAB_LAYOUT: Record<Breakpoint, SeedLayoutItem[]> = {
  lg: [
    { i: 'clock', x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 3 },
    { i: 'date', x: 3, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  ],
  md: [
    { i: 'clock', x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 3 },
    { i: 'date', x: 3, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  ],
  sm: [
    { i: 'clock', x: 0, y: 0, w: 2, h: 3, minW: 2, minH: 3 },
    { i: 'date', x: 2, y: 0, w: 2, h: 3, minW: 2, minH: 2 },
  ],
};

/** Default quote settings: medium text, a brisk type-out, a 1-minute cycle, and
 *  the SignPainter wordmark face. */
export const QUOTE_DEFAULTS: WidgetConfig['quote'] = {
  size: 'md',
  typingSpeedMs: 40,
  cycleMs: QUOTE_CYCLE_DEFAULT_MS,
  font: 'signpainter',
};

/** A fresh instance (with default config) for a type just added from the catalogue. */
export function newInstance(type: WidgetType): WidgetInstance {
  switch (type) {
    case 'news':
      return { type, config: { count: NEWS_MAX_COUNT, layout: 'list' } };
    case 'weather':
      return { type, config: { units: 'c', location: null } };
    case 'clock':
      return { type, config: { mode: 'digital' } };
    case 'world-clocks':
      return {
        type,
        config: {
          mode: 'digital',
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
      return { type, id: crypto.randomUUID(), config: { title: 'Scratchpad', text: '' } };
    case 'projects':
      return { type, id: crypto.randomUUID(), config: { projectId: null } };
    case 'links':
      return { type, config: { links: [] } };
    case 'quote':
      return { type, config: { ...QUOTE_DEFAULTS } };
    case 'finances':
      return {
        type,
        id: crypto.randomUUID(),
        config: { title: 'Finances', income: [], expenses: [], showDetail: true },
      };
    case 'market-asset':
      return { type, id: crypto.randomUUID(), config: { kind: 'crypto', symbol: '', name: '' } };
    case 'market-watchlist':
      return { type, id: crypto.randomUUID(), config: { title: 'Watchlist', assets: [] } };
    default:
      return { type } as WidgetInstance;
  }
}

/** A catalogue entry: registry metadata plus whether it's already on the board. */
export type WidgetCatalogEntry = { type: WidgetType; added: boolean } & WidgetMeta;

/**
 * Every widget in registry order, each tagged with `added` so the menu can show
 * the full catalogue and grey out what's already placed. Multi-instance widgets
 * (e.g. finances) are never `added` — you can always add another.
 */
export function widgetCatalog(enabled: WidgetInstance[]): WidgetCatalogEntry[] {
  const present = new Set(enabled.map((w) => w.type));
  return ALL_WIDGET_TYPES.map((type) => ({
    type,
    added: !MULTI_INSTANCE.has(type) && present.has(type),
    ...DASHBOARD_WIDGETS[type],
  }));
}

/** One section of the add-widget picker: a category and the entries filed under it. */
export type WidgetCatalogGroup = { category: WidgetCategory; label: string; items: WidgetCatalogEntry[] };

/**
 * Filter a catalogue by a search query (matched case-insensitively against label
 * and description), then bucket the survivors into {@link WIDGET_CATEGORIES} order.
 * Empty sections are dropped, so an empty result means "nothing matched".
 */
export function groupWidgetCatalog(
  entries: WidgetCatalogEntry[],
  query: string,
): WidgetCatalogGroup[] {
  const q = query.trim().toLowerCase();
  const matched = entries.filter(
    (e) =>
      !q || e.label.toLowerCase().includes(q) || e.description.toLowerCase().includes(q),
  );
  return WIDGET_CATEGORIES.map(({ key, label }) => ({
    category: key,
    label,
    items: matched.filter((e) => e.category === key),
  })).filter((group) => group.items.length > 0);
}

/** Default footprint for a rendered grid key (`proj-N` maps to the `projects` size). */
export function sizeForKey(key: string, bp: Breakpoint): WidgetSize {
  let type: WidgetType;
  if (key.startsWith('proj-')) type = 'projects';
  else if (key.startsWith('scratchpad-')) type = 'scratchpad';
  else if (key.startsWith('finances-')) type = 'finances';
  else if (key.startsWith('market-asset-')) type = 'market-asset';
  else if (key.startsWith('market-watchlist-')) type = 'market-watchlist';
  else type = key as WidgetType;
  return (DASHBOARD_WIDGETS[type] ?? DASHBOARD_WIDGETS.notes).sizes[bp];
}
