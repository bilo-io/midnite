'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { UNASSIGNED_PROJECT_ID } from '@midnite/shared';
import { getProjects } from '@/lib/api';
import { useProjectFilterStore } from '@/lib/project-filter-store';
import { ProjectTag } from '@/components/project-tag';
import { cn } from '@/lib/utils';

type Rect = { top: number; left: number };

/**
 * The titlebar's global project filter (replaces the per-view `?project=`
 * dropdown tasks/sessions/slides used to render — see
 * {@link useProjectFilterStore}). Same look as `ProjectMultiSelect`, except
 * the trigger renders each selection as a {@link ProjectTag} pill instead of a
 * plain colour dot, so the active filter reads the same way it does
 * everywhere else a project is shown.
 */
export function GlobalProjectFilter({ className }: { className?: string }) {
  const t = useTranslations('common');
  const tBoard = useTranslations('board');
  const { data } = useQuery({ queryKey: ['global-project-filter', 'projects'], queryFn: () => getProjects() });
  const projects = data ?? [];
  const selected = useProjectFilterStore((s) => s.selected);
  const toggle = useProjectFilterStore((s) => s.toggle);
  const clear = useProjectFilterStore((s) => s.clear);

  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const unassignedOption = { id: UNASSIGNED_PROJECT_ID, tag: tBoard('unassigned'), color: '#94a3b8' };
  const options = [unassignedOption, ...projects];
  const activeOptions = options.filter((o) => selected.includes(o.id));

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    place();
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
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

  if (projects.length === 0) return null;

  const MAX_PILLS = 2;
  const visiblePills = activeOptions.slice(0, MAX_PILLS);
  const overflowCount = activeOptions.length - visiblePills.length;

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('filterByProject')}
        className={cn(
          'inline-flex h-7 max-w-[14rem] items-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium transition-colors hover:bg-accent/50',
          open && 'ring-1 ring-ring',
        )}
      >
        {activeOptions.length === 0 ? (
          <span className="text-muted-foreground">{t('allProjects')}</span>
        ) : (
          <span className="flex min-w-0 items-center gap-1">
            {visiblePills.map((o) => (
              <ProjectTag key={o.id} tag={o.tag} color={o.color} className="shrink-0" />
            ))}
            {overflowCount > 0 && (
              <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                +{overflowCount}
              </span>
            )}
          </span>
        )}
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && rect
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              aria-multiselectable
              style={{ position: 'fixed', top: rect.top, left: rect.left }}
              className="z-[70] max-h-72 w-56 overflow-auto rounded-md border border-border bg-card p-1 shadow-lg"
            >
              <button
                type="button"
                role="option"
                aria-selected={activeOptions.length === 0}
                onClick={clear}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              >
                <span className="flex h-3.5 w-3.5 items-center justify-center">
                  {activeOptions.length === 0 ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                {t('allProjects')}
              </button>
              {options.map((o) => {
                const on = selected.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => toggle(o.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent/60',
                      on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="flex h-3.5 w-3.5 items-center justify-center">
                      {on ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                    <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: o.color }} />
                    <span className="truncate">{o.tag}</span>
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
