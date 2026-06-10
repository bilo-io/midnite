'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronDown } from 'lucide-react';
import type { FilterOption } from '@/components/filter-pills';
import { cn } from '@/lib/utils';

type Rect = { top: number; left: number };

/**
 * A themed multi-select dropdown backed by the URL query string (default
 * `?project=`), mirroring FilterPills' semantics: selected values narrow the
 * view, an empty selection means "all". Built from app tokens so it tracks the
 * light/dark theme automatically.
 */
export function ProjectMultiSelect({
  options,
  paramKey = 'project',
  placeholder = 'All projects',
  className,
}: {
  options: FilterOption[];
  paramKey?: string;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const valid = new Set(options.map((o) => o.value));
  const raw = searchParams.get(paramKey);
  const active = new Set((raw ? raw.split(',') : []).filter((v) => valid.has(v)));
  const selected = options.filter((o) => active.has(o.value));

  // The menu renders in a portal with fixed positioning so it never gets clipped
  // or trapped behind sibling content (e.g. the page-reveal staged wrappers).
  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, place]);

  const apply = useCallback(
    (next: Set<string>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.size === 0) {
        params.delete(paramKey);
      } else {
        params.set(paramKey, options.filter((o) => next.has(o.value)).map((o) => o.value).join(','));
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, paramKey, options],
  );

  const toggle = (value: string) => {
    const next = new Set(active);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
  };

  const dotColor = (o: FilterOption) => o.color ?? `hsl(${o.hue})`;

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent/50',
          open && 'ring-1 ring-ring',
        )}
      >
        {selected.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          <span className="flex items-center gap-1.5 text-foreground">
            <span className="flex -space-x-1">
              {selected.slice(0, 4).map((o) => (
                <span
                  key={o.value}
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full ring-1 ring-background"
                  style={{ background: dotColor(o) }}
                />
              ))}
            </span>
            {selected.length === 1 ? selected[0]!.label : `${selected.length} projects`}
          </span>
        )}
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && rect
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              aria-multiselectable
              style={{ position: 'fixed', top: rect.top, left: rect.left }}
              className="z-[60] max-h-72 w-56 overflow-auto rounded-md border border-border bg-card p-1 shadow-lg"
            >
              <button
                type="button"
                role="option"
                aria-selected={active.size === 0}
                onClick={() => apply(new Set())}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              >
                <span className="flex h-3.5 w-3.5 items-center justify-center">
                  {active.size === 0 ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                {placeholder}
              </button>
              {options.map((o) => {
                const on = active.has(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => toggle(o.value)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent/60',
                      on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="flex h-3.5 w-3.5 items-center justify-center">
                      {on ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: dotColor(o) }}
                    />
                    <span className="truncate">{o.label}</span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
