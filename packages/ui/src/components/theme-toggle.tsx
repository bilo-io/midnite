'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Clock, Laptop, Moon, Sun } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './button';
import { useTheme, type ThemePreference } from '../theme/theme-context';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Laptop },
  { value: 'time', label: 'Time', Icon: Clock },
];

export function ThemeToggle({ expanded }: { expanded?: boolean }) {
  const { preference, resolved, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const TriggerIcon = resolved === 'dark' ? Moon : Sun;

  return (
    <div ref={rootRef} className="group relative">
      {expanded ? (
        <button
          type="button"
          aria-label="Toggle theme"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
        >
          <TriggerIcon className="h-4 w-4 shrink-0" />
          <span className="truncate text-sm">Theme</span>
        </button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <TriggerIcon className="h-4 w-4" />
        </Button>
      )}
      {!open && !expanded ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border/80 bg-card px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover:opacity-100"
        >
          Theme
        </span>
      ) : null}
      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute z-50 rounded-md border bg-card text-card-foreground p-1 shadow-md',
            // Expanded: the dropup spans the sidenav's full width; collapsed: a
            // fixed-width flyout to the right of the icon rail.
            expanded ? 'bottom-full left-0 mb-1 w-full' : 'bottom-0 left-full ml-2 min-w-[10rem]',
          )}
        >
          {OPTIONS.map(({ value, label, Icon }) => {
            const active = preference === value;
            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setPreference(value);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  active && 'bg-accent text-accent-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {active ? <Check className="ml-auto h-4 w-4" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
