'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  BrainCircuit,
  CirclePile,
  Folder,
  ListChecks,
  LoaderCircle,
  Search,
  Settings,
  StickyNote,
  UserRound,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import {
  EMPTY_SEARCH_RESPONSE,
  MIN_SEARCH_QUERY_LENGTH,
  SEARCH_TYPES,
  type SearchResponse,
  type SearchResult,
  type SearchType,
} from '@midnite/shared';
import { searchAll } from '@/lib/api';
import { renderSnippet } from '@/lib/highlight';
import { FEATURES, isFeatureEnabled } from '@/lib/features';
import { AppSettings, DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '@/lib/app-settings';
import { useLocalStorage } from '@/lib/use-local-storage';
import { cn } from '@/lib/utils';

type Command = { href: string; label: string; hint?: string; Icon: LucideIcon };

// Always-reachable settings destinations that aren't toggleable features. The
// Agents/Profile labels jump straight to their settings category by old muscle
// memory.
const ALWAYS_ON: Command[] = [
  { href: '/settings/agents', label: 'Agents', Icon: Bot },
  { href: '/settings/user', label: 'Profile', Icon: UserRound },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

/** How the six searchable domains render: group heading + a row icon. */
const TYPE_META: Record<SearchType, { label: string; Icon: LucideIcon }> = {
  task: { label: 'Tasks', Icon: ListChecks },
  project: { label: 'Projects', Icon: Folder },
  memory: { label: 'Memory', Icon: BrainCircuit },
  note: { label: 'Notes', Icon: StickyNote },
  council: { label: 'Councils', Icon: CirclePile },
  workflow: { label: 'Workflows', Icon: Workflow },
};

/** Per-type row cap inside the palette — more than this and we show a "+N more". */
const GROUP_CAP = 5;
/** Enough hits to fill a few groups without over-fetching (server max is 100). */
const SEARCH_LIMIT = 30;
/** Matches the URL-backed search bar's debounce so the two feel consistent. */
const DEBOUNCE_MS = 200;

/** A keyboard-selectable row — either a navigation command or a search hit. */
type FlatItem =
  | { kind: 'command'; route: string; cmd: Command }
  | { kind: 'result'; route: string; result: SearchResult };

/** A rendered group: a heading, its selectable rows, and any hidden overflow. */
type Section = { key: string; label: string; items: FlatItem[]; moreCount: number };

/**
 * ⌘K / Ctrl+K command palette: a fast switcher across every enabled surface and,
 * since Phase 20 Theme C, full-text content search across tasks, projects,
 * memory, notes, councils and workflows. Navigation stays instant and local;
 * content results stream in from a debounced, abort-on-keystroke `GET /search`
 * and render grouped by type beneath the page jumps. Mounted once in the (main)
 * layout.
 */
export function CommandPalette() {
  const router = useRouter();
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<SearchResponse>(EMPTY_SEARCH_RESPONSE);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const commands = useMemo<Command[]>(() => {
    const pages = FEATURES.filter((f) => isFeatureEnabled(settings.features, f.key)).map((f) => ({
      href: f.href,
      label: f.label,
      hint: f.description,
      Icon: f.Icon,
    }));
    return [...pages, ...ALWAYS_ON];
  }, [settings.features]);

  // Navigation commands filtered locally — instant, never blocked on the network.
  const pageCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Sections in display order: page jumps first, then a group per type that hit.
  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [];
    if (pageCommands.length > 0) {
      out.push({
        key: 'pages',
        label: 'Pages',
        items: pageCommands.map((cmd) => ({ kind: 'command', route: cmd.href, cmd })),
        moreCount: 0,
      });
    }
    for (const type of SEARCH_TYPES) {
      const hits = results.results.filter((r) => r.type === type);
      if (hits.length === 0) continue;
      const shown = hits.slice(0, GROUP_CAP);
      const total = results.byType[type] ?? hits.length;
      out.push({
        key: type,
        label: TYPE_META[type].label,
        items: shown.map((result) => ({ kind: 'result', route: result.route, result })),
        moreCount: Math.max(0, total - shown.length),
      });
    }
    return out;
  }, [pageCommands, results]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  // Global open shortcut (⌘K / Ctrl+K).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Reset + focus on open; abort any stray request on close.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setResults(EMPTY_SEARCH_RESPONSE);
      setSearching(false);
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    abortRef.current?.abort();
    abortRef.current = null;
    return undefined;
  }, [open]);

  // Debounced, abort-on-keystroke content search. Short/blank queries skip the
  // network entirely and clear any prior hits, keeping page-jump instant.
  useEffect(() => {
    if (!open) return undefined;
    const q = query.trim();
    if (q.length < MIN_SEARCH_QUERY_LENGTH) {
      abortRef.current?.abort();
      abortRef.current = null;
      setResults(EMPTY_SEARCH_RESPONSE);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await searchAll(q, { limit: SEARCH_LIMIT, signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        setResults(res);
        setSearching(false);
      } catch (err) {
        if (ctrl.signal.aborted || (err as Error)?.name === 'AbortError') return;
        // A failed search shouldn't break the palette — page jumps still work.
        setResults(EMPTY_SEARCH_RESPONSE);
        setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [open, query]);

  // Keep the highlighted row in range as the result set changes.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, flat.length - 1)));
  }, [flat.length]);

  // Scroll the active row into view when navigating with the keyboard.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const go = (route: string) => {
    setOpen(false);
    router.push(route);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = flat[active];
      if (target) go(target.route);
    }
  };

  const isShortQuery = query.trim().length > 0 && query.trim().length < MIN_SEARCH_QUERY_LENGTH;
  const showNoMatches = flat.length === 0 && !searching && !isShortQuery;

  // Running index across sections so each row knows its position in `flat`.
  let rowIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Jump to or search…"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search commands and content"
          />
          {searching && (
            <LoaderCircle
              className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
              aria-label="Searching"
            />
          )}
        </div>
        <ul className="max-h-[60vh] overflow-auto py-1">
          {showNoMatches ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</li>
          ) : (
            sections.map((section) => (
              <li key={section.key}>
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.label}
                </p>
                <ul>
                  {section.items.map((item) => {
                    rowIndex += 1;
                    const i = rowIndex;
                    const selected = i === active;
                    const RowIcon =
                      item.kind === 'command' ? item.cmd.Icon : TYPE_META[item.result.type].Icon;
                    const key =
                      item.kind === 'command'
                        ? item.cmd.href
                        : `${item.result.type}:${item.result.id}`;
                    return (
                      <li key={key}>
                        <button
                          ref={selected ? activeRef : undefined}
                          type="button"
                          onClick={() => go(item.route)}
                          onMouseMove={() => setActive(i)}
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-2 text-left text-sm',
                            selected ? 'bg-accent text-accent-foreground' : 'text-foreground',
                          )}
                        >
                          <RowIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {item.kind === 'command' ? (
                            <>
                              <span className="shrink-0 font-medium">{item.cmd.label}</span>
                              {item.cmd.hint && (
                                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                                  {item.cmd.hint}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{item.result.title}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {renderSnippet(item.result.snippet)}
                              </span>
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                  {section.moreCount > 0 && (
                    <li>
                      <button
                        type="button"
                        onClick={() =>
                          go(
                            `/search?q=${encodeURIComponent(query.trim())}&type=${section.key}`,
                          )
                        }
                        className="w-full px-3 py-1.5 pl-10 text-left text-xs text-muted-foreground/80 hover:text-foreground"
                      >
                        +{section.moreCount} more {section.label.toLowerCase()} — see all in Search
                      </button>
                    </li>
                  )}
                </ul>
              </li>
            ))
          )}
          {isShortQuery && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Type at least {MIN_SEARCH_QUERY_LENGTH} characters to search.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
