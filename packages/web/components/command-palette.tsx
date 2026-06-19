'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Search, Settings, UserRound, type LucideIcon } from 'lucide-react';
import { FEATURES, isFeatureEnabled } from '@/lib/features';
import { AppSettings, DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '@/lib/app-settings';
import { useLocalStorage } from '@/lib/use-local-storage';
import { cn } from '@/lib/utils';

type Command = { href: string; label: string; hint?: string; Icon: LucideIcon };

// Always-reachable destinations that aren't toggleable features.
const ALWAYS_ON: Command[] = [
  { href: '/agents', label: 'Agents', Icon: Bot },
  { href: '/profile', label: 'Profile', Icon: UserRound },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

/**
 * ⌘K / Ctrl+K command palette: a fast switcher across every enabled surface.
 * Navigation-only for v1 (the app has many pages and no unified jump-to); the
 * command list is extensible, so content search can slot in later. Mounted once
 * in the (main) layout.
 */
export function CommandPalette() {
  const router = useRouter();
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const pages = FEATURES.filter((f) => isFeatureEnabled(settings.features, f.key)).map((f) => ({
      href: f.href,
      label: f.label,
      hint: f.description,
      Icon: f.Icon,
    }));
    return [...pages, ...ALWAYS_ON];
  }, [settings.features]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q),
    );
  }, [commands, query]);

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

  // Reset + focus on open.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [open]);

  // Keep the highlighted row in range as results shrink.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, results.length - 1)));
  }, [results.length]);

  if (!open) return null;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[active];
      if (target) go(target.href);
    }
  };

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
            placeholder="Jump to…"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search commands"
          />
        </div>
        <ul className="max-h-[50vh] overflow-auto py-1">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</li>
          ) : (
            results.map((c, i) => (
              <li key={c.href}>
                <button
                  type="button"
                  onClick={() => go(c.href)}
                  onMouseMove={() => setActive(i)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-left text-sm',
                    i === active ? 'bg-accent text-accent-foreground' : 'text-foreground',
                  )}
                >
                  <c.Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="shrink-0 font-medium">{c.label}</span>
                  {c.hint && (
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {c.hint}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
