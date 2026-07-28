'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { UNASSIGNED_PROJECT_ID } from '@midnite/shared';
import { getProjects } from '@/lib/api';
import { useProjectFilterStore } from '@/lib/project-filter-store';
import { ProjectTag } from '@/components/project-tag';
import { Button } from '@/components/ui/button';
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
  const router = useRouter();
  const { data } = useQuery({ queryKey: ['global-project-filter', 'projects'], queryFn: () => getProjects() });
  const projects = data ?? [];
  const selected = useProjectFilterStore((s) => s.selected);
  const toggle = useProjectFilterStore((s) => s.toggle);
  const clear = useProjectFilterStore((s) => s.clear);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rect, setRect] = useState<Rect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const unassignedOption = { id: UNASSIGNED_PROJECT_ID, tag: tBoard('unassigned'), color: '#94a3b8' };

  // "Unassigned" is pinned above the real projects, which are sorted A→Z by tag.
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.tag.localeCompare(b.tag)),
    [projects],
  );
  const options = useMemo(() => [unassignedOption, ...sortedProjects], [unassignedOption, sortedProjects]);
  const activeOptions = options.filter((o) => selected.includes(o.id));

  // Free-text search over the pinned/real options (matches tag or name); the
  // "All projects" reset row is always shown so the no-filter default is one
  // click away regardless of the query.
  const q = query.trim().toLowerCase();
  const visibleOptions = q
    ? options.filter((o) => {
        const name = (o as { name?: string }).name ?? '';
        return o.tag.toLowerCase().includes(q) || name.toLowerCase().includes(q);
      })
    : options;

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left });
  }, []);

  const createNewProject = useCallback(() => {
    setOpen(false);
    router.push('/projects?new=1');
  }, [router]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return undefined;
    }
    place();
    // Focus the search box once the menu is mounted.
    const focusTimer = requestAnimationFrame(() => searchRef.current?.focus());
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
      cancelAnimationFrame(focusTimer);
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
              style={{ position: 'fixed', top: rect.top, left: rect.left }}
              className="z-[70] flex max-h-80 w-56 flex-col overflow-hidden rounded-md border border-border bg-card shadow-lg"
            >
              <div className="flex items-center gap-2 border-b border-border/60 px-2.5 py-1.5">
                <Search aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('searchProjects')}
                  aria-label={t('searchProjects')}
                  className="min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              <div role="listbox" aria-multiselectable className="min-h-0 flex-1 overflow-auto p-1">
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
                {visibleOptions.map((o) => {
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
                {q && visibleOptions.length === 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                    {t('noProjectsMatch')}
                  </p>
                ) : null}
              </div>

              <div className="shrink-0 border-t border-border/60 p-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="w-full justify-center"
                  onClick={createNewProject}
                >
                  <Plus className="h-4 w-4" />
                  {t('newProject')}
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
