'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * A URL-backed search box (writes `?q=`). Each page's view reads `q` and filters
 * its own content, so the bar lives in the view's control bar (left of the view
 * toggles) and the view stays the source of truth — consistent with the filter pills.
 *
 * Collapses to an icon-only button when idle and empty, expanding to the full
 * input on click/focus — keeps the control bar compact instead of every page
 * spending 176px+ of width on a search box up front. Stays expanded while
 * focused or holding an active query, so an active filter is never silently
 * hidden by a blur.
 */
export function SearchBar({
  placeholder = 'Search…',
  clearLabel = 'Clear search',
}: {
  placeholder?: string;
  /** aria-label for the clear (×) button — pass a translated string from the caller. */
  clearLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get('q') ?? '';
  const [value, setValue] = useState(current);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reflect external URL changes (e.g. back/forward).
  useEffect(() => {
    setValue(current);
  }, [current]);

  // Debounce writes to the query string.
  useEffect(() => {
    if (value === current) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set('q', value);
      else params.delete('q');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 200);
    return () => clearTimeout(t);
  }, [value, current, pathname, router, searchParams]);

  const expanded = focused || value.length > 0;

  return (
    <div className="relative">
      <Search
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground',
          // Expanded: sit inside the input's left text padding (pl-8).
          // Collapsed: centre the icon in the square icon-button.
          expanded ? 'left-2.5' : 'left-1/2 -translate-x-1/2',
        )}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) setValue('');
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        data-tour="search-input"
        className={cn(
          'h-8 rounded-md pl-8 text-sm placeholder:text-muted-foreground transition-[width] duration-200 ease-in-out focus-visible:outline-none motion-reduce:transition-none',
          expanded ? 'w-44 cursor-text pr-7 sm:w-56' : 'w-8 cursor-pointer pr-2 hover:bg-accent',
          // Focused (always expanded too) wears the same primary gradient as the
          // "+ New" buttons, but only on the border, with a slow drifting glow —
          // otherwise a plain input border, so the effect reads as "active".
          // A single self-sufficient class — see its comment in globals.css for
          // why it can't be combined with the base `.accent-gradient-border`.
          focused
            ? 'accent-gradient-border--spin'
            : 'border border-input bg-background focus-visible:ring-1 focus-visible:ring-ring',
        )}
      />
      {expanded && value ? (
        <button
          type="button"
          onClick={() => {
            setValue('');
            inputRef.current?.focus();
          }}
          aria-label={clearLabel}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
