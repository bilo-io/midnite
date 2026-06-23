import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn, Input } from '@midnite/ui';

import { searchDocs } from '../content/search';
import { searchIndex } from '../content/search-index';

const MAX_RESULTS = 8;

// Client-side doc search (Phase 26 Theme D) — a static filter over the page
// titles + markdown headings indexed in content/search-index.ts. No server, no
// network: the whole index ships in the bundle. A title/heading hit navigates to
// the page (hash router). Modelled on web's search-bar pattern, not a dependency.
export function DocSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = query.trim() ? searchDocs(searchIndex, query).slice(0, MAX_RESULTS) : [];

  // Close the results popover on an outside click.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function go(path: string) {
    navigate(path);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        type="search"
        value={query}
        placeholder="Search docs…"
        aria-label="Search docs"
        autoComplete="off"
        className="h-9 w-36 sm:w-56"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
            event.currentTarget.blur();
          } else if (event.key === 'Enter' && results[0]) {
            go(results[0].path);
          }
        }}
      />

      {open && query.trim() ? (
        <ul
          role="listbox"
          aria-label="Search results"
          className="absolute right-0 z-30 mt-1 max-h-80 w-72 max-w-[80vw] overflow-y-auto rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">No results</li>
          ) : (
            results.map((result) => (
              <li key={`${result.path}:${result.match}`} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => go(result.path)}
                  className={cn(
                    'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left',
                    'hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none',
                  )}
                >
                  <span className="text-sm font-medium">{result.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {result.section}
                    {result.match !== result.title ? ` · ${result.match}` : ''}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
