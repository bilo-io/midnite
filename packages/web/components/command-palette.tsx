'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  BrainCircuit,
  CirclePile,
  Clock,
  Folder,
  ListChecks,
  LoaderCircle,
  MessageSquare,
  Milestone,
  Newspaper,
  Search,
  Settings,
  StickyNote,
  Terminal,
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
import { usePaletteCommands, type PaletteCommand } from '@/lib/palette-commands';
import { taskModalHref } from '@/lib/task-route';
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help';
import { ChatBar } from '@/components/chat-bar';
import { useChatCommand } from '@/hooks/use-chat-command';
import { cn } from '@/lib/utils';

/** Leading char that switches the palette into chat-to-board mode (Phase 59 E). */
const CHAT_PREFIX = '>';

// ── Recent items ──────────────────────────────────────────────────────────────

const RECENT_STORAGE_KEY = 'midnite.recent';
const RECENT_MAX = 10;

type RecentItem = { route: string; label: string };

function readRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch {
    return [];
  }
}

function pushRecent(item: RecentItem) {
  try {
    const prev = readRecent().filter((r) => r.route !== item.route);
    const next = [item, ...prev].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

// ── Navigation commands ───────────────────────────────────────────────────────

type NavCommand = { href: string; label: string; hint?: string; Icon: LucideIcon };

const ALWAYS_ON: NavCommand[] = [
  { href: '/settings/agents', label: 'Agents', Icon: Bot },
  { href: '/settings/user', label: 'Profile', Icon: UserRound },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

// ── Search result icons ───────────────────────────────────────────────────────

const TYPE_META: Record<SearchType, { label: string; Icon: LucideIcon }> = {
  task: { label: 'Tasks', Icon: ListChecks },
  project: { label: 'Projects', Icon: Folder },
  memory: { label: 'Memory', Icon: BrainCircuit },
  note: { label: 'Notes', Icon: StickyNote },
  council: { label: 'Councils', Icon: CirclePile },
  workflow: { label: 'Workflows', Icon: Workflow },
  milestone: { label: 'Milestones', Icon: Milestone },
  digest: { label: 'Digests', Icon: Newspaper },
};

const GROUP_CAP = 5;
const SEARCH_LIMIT = 30;
const DEBOUNCE_MS = 200;

// ── Flat item types for keyboard navigation ───────────────────────────────────

type FlatItem =
  | { kind: 'nav'; route: string; cmd: NavCommand }
  | { kind: 'recent'; route: string; item: RecentItem }
  | { kind: 'palette'; cmd: PaletteCommand }
  | { kind: 'result'; route: string; result: SearchResult };

type Section = {
  key: string;
  label: string;
  items: FlatItem[];
  moreCount: number;
};

/**
 * ⌘K / Ctrl+K command palette: a fast switcher across navigation, registered
 * palette commands, recent items, and full-text content search (Phase 20 FTS5).
 *
 * Navigation and palette commands are instant (local); content results come from
 * a debounced, abort-on-keystroke `GET /search`. Mounted once in the (main)
 * layout via `PaletteCommandsProvider`.
 */
export function CommandPalette() {
  const router = useRouter();
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<SearchResponse>(EMPTY_SEARCH_RESPONSE);
  const [searching, setSearching] = useState(false);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // A one-shot query seed applied by the open effect (chat mode entry).
  const seedRef = useRef<string | null>(null);

  const paletteCommands = usePaletteCommands();
  const chat = useChatCommand();
  // Hold the latest chat.reset so the open effect can call it without taking the
  // whole (per-render) chat object as a dependency.
  const chatResetRef = useRef(chat.reset);
  chatResetRef.current = chat.reset;

  // Chat-to-board mode: the query starts with `>`; the rest is the NL command.
  const chatMode = query.startsWith(CHAT_PREFIX);
  const chatCommand = chatMode ? query.slice(CHAT_PREFIX.length) : '';

  const navCommands = useMemo<NavCommand[]>(() => {
    const pages = FEATURES.filter((f) => isFeatureEnabled(settings.features, f.key)).map((f) => ({
      href: f.href,
      label: f.label,
      hint: f.description,
      Icon: f.Icon,
    }));
    return [...pages, ...ALWAYS_ON];
  }, [settings.features]);

  // Open on ⌘K / Ctrl+K; open help on `midnite:open-help` custom event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onHelp = () => setHelpOpen(true);
    // Nav chat icon (or any surface) opens the palette pre-seeded into chat mode.
    // The open effect resets the query, so stash the seed in a ref it reads.
    const onChat = () => {
      seedRef.current = CHAT_PREFIX;
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('midnite:open-help', onHelp);
    window.addEventListener('midnite:open-chat', onChat);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('midnite:open-help', onHelp);
      window.removeEventListener('midnite:open-chat', onChat);
    };
  }, []);

  // Reset + load recent on open; abort pending search on close.
  useEffect(() => {
    if (open) {
      setQuery(seedRef.current ?? '');
      seedRef.current = null;
      setActive(0);
      setResults(EMPTY_SEARCH_RESPONSE);
      setSearching(false);
      setRecent(readRecent());
      chatResetRef.current();
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    abortRef.current?.abort();
    abortRef.current = null;
    return undefined;
  }, [open]);

  // Debounced FTS5 search. Skipped entirely in chat mode (`>` prefix).
  useEffect(() => {
    if (!open || chatMode) return undefined;
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
        setResults(EMPTY_SEARCH_RESPONSE);
        setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [open, query, chatMode]);

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navCommands;
    return navCommands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q),
    );
  }, [navCommands, query]);

  const filteredPalette = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return paletteCommands;
    return paletteCommands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords?.some((k) => k.toLowerCase().includes(q)),
    );
  }, [paletteCommands, query]);

  const filteredRecent = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recent;
    return recent.filter((r) => r.label.toLowerCase().includes(q));
  }, [recent, query]);

  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [];
    // Recent items shown before typing, filtered on query.
    if (filteredRecent.length > 0) {
      out.push({
        key: 'recent',
        label: 'Recent',
        items: filteredRecent.map((item) => ({ kind: 'recent', route: item.route, item })),
        moreCount: 0,
      });
    }
    if (filteredPalette.length > 0) {
      out.push({
        key: 'commands',
        label: 'Commands',
        items: filteredPalette.map((cmd) => ({ kind: 'palette', cmd })),
        moreCount: 0,
      });
    }
    if (filteredNav.length > 0) {
      out.push({
        key: 'nav',
        label: 'Navigation',
        items: filteredNav.map((cmd) => ({ kind: 'nav', route: cmd.href, cmd })),
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
        // A task hit routes to the in-app modal (`?task=`, Phase 42 B) rather
        // than the bare `/tasks` board the gateway emits for the type.
        items: shown.map((result) => ({
          kind: 'result',
          route: result.type === 'task' ? taskModalHref(result.id) : result.route,
          result,
        })),
        moreCount: Math.max(0, total - shown.length),
      });
    }
    return out;
  }, [filteredNav, filteredPalette, filteredRecent, results]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, flat.length - 1)));
  }, [flat.length]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = useCallback(
    (route: string, label?: string) => {
      setOpen(false);
      if (label) pushRecent({ route, label });
      router.push(route);
    },
    [router],
  );

  const activate = useCallback(
    (item: FlatItem) => {
      if (item.kind === 'palette') {
        setOpen(false);
        item.cmd.action();
        return;
      }
      go(item.route, item.kind === 'nav' ? item.cmd.label : item.kind === 'recent' ? item.item.label : item.result.title);
    },
    [go],
  );

  if (!open) return (
    <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
  );

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // In an active confirm/result step, Escape clears the chat step; else close.
      if (chatMode && chat.phase !== 'idle') {
        chat.reset();
      } else {
        setOpen(false);
      }
    } else if (chatMode) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (chat.phase === 'confirm') chat.confirm();
        else if (chat.phase === 'idle' || chat.phase === 'done' || chat.phase === 'error') chat.submit(chatCommand);
      }
      // Arrow keys are inert in chat mode (no result list to navigate).
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = flat[active];
      if (target) activate(target);
    }
  };

  const isShortQuery = query.trim().length > 0 && query.trim().length < MIN_SEARCH_QUERY_LENGTH;
  const showNoMatches = flat.length === 0 && !searching && !isShortQuery;

  let rowIndex = -1;

  return (
    <>
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
            {chatMode ? (
              <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKey}
              placeholder={chatMode ? 'Tell the board what to do…' : 'Jump to, search, or run a command…'}
              className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              aria-label={chatMode ? 'Chat with the board' : 'Search commands and content'}
              // Combobox pattern (Phase 60 I): focus stays in the input while the
              // arrow keys move the active option; SR announces it via
              // aria-activedescendant instead of moving DOM focus into the list.
              role={chatMode ? undefined : 'combobox'}
              aria-controls={chatMode ? undefined : 'command-palette-listbox'}
              aria-expanded={chatMode ? undefined : !showNoMatches}
              aria-autocomplete={chatMode ? undefined : 'list'}
              aria-activedescendant={
                chatMode || showNoMatches ? undefined : `command-palette-option-${active}`
              }
            />
            {searching && (
              <LoaderCircle
                className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
                aria-label="Searching"
              />
            )}
            <button
              type="button"
              onClick={() => { setOpen(false); setHelpOpen(true); }}
              title="Keyboard shortcuts (?)"
              className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center rounded border border-border bg-muted px-1.5 text-[10px] font-mono font-medium">
                ?
              </kbd>
            </button>
          </div>
          {chatMode ? (
            <ChatBar command={chatCommand} state={chat} />
          ) : (
          <ul
            id="command-palette-listbox"
            // Only a populated list is a `listbox` (its children are options); the
            // empty state is a plain <ul> so a bare "No matches." <li> isn't an
            // invalid non-option child. The id stays either way so the input's
            // aria-controls always resolves (Phase 60 I).
            role={showNoMatches ? undefined : 'listbox'}
            aria-label={showNoMatches ? undefined : 'Results'}
            className="max-h-[60vh] overflow-auto py-1"
          >
            {showNoMatches ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</li>
            ) : (
              sections.map((section) => (
                <li key={section.key} role="presentation">
                  <p
                    aria-hidden
                    className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {section.label}
                  </p>
                  {/* group on the <ul> (not the <li>) — axe disallows role=group
                      on a listitem; the label names the option group for AT. */}
                  <ul role="group" aria-label={section.label}>
                    {section.items.map((item) => {
                      rowIndex += 1;
                      const i = rowIndex;
                      const selected = i === active;
                      const RowIcon: LucideIcon =
                        item.kind === 'nav'
                          ? item.cmd.Icon
                          : item.kind === 'recent'
                          ? Clock
                          : item.kind === 'palette'
                          ? (item.cmd.Icon as LucideIcon) ?? Terminal
                          : TYPE_META[item.result.type].Icon;
                      const key =
                        item.kind === 'nav'
                          ? `nav:${item.cmd.href}`
                          : item.kind === 'recent'
                          ? `recent:${item.item.route}`
                          : item.kind === 'palette'
                          ? `cmd:${item.cmd.id}`
                          : `${item.result.type}:${item.result.id}`;
                      return (
                        <li key={key} role="presentation">
                          <button
                            ref={selected ? activeRef : undefined}
                            type="button"
                            id={`command-palette-option-${i}`}
                            role="option"
                            aria-selected={selected}
                            onClick={() => activate(item)}
                            onMouseMove={() => setActive(i)}
                            className={cn(
                              'flex w-full items-center gap-3 px-3 py-2 text-left text-sm',
                              selected ? 'bg-accent text-accent-foreground' : 'text-foreground',
                            )}
                          >
                            <RowIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            {item.kind === 'nav' ? (
                              <>
                                <span className="shrink-0 font-medium">{item.cmd.label}</span>
                                {item.cmd.hint && (
                                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                                    {item.cmd.hint}
                                  </span>
                                )}
                              </>
                            ) : item.kind === 'recent' ? (
                              <span className="shrink-0 font-medium">{item.item.label}</span>
                            ) : item.kind === 'palette' ? (
                              <span className="shrink-0 font-medium">{item.cmd.label}</span>
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
                              undefined,
                            )
                          }
                          className="w-full px-3 py-1.5 pl-10 text-left text-xs text-muted-foreground hover:text-foreground"
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
          )}
        </div>
      </div>
      <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
