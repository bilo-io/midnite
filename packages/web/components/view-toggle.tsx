'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Columns3, Rows3, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TaskView = 'board' | 'table';

const VIEWS: Array<{ value: TaskView; label: string; Icon: LucideIcon }> = [
  { value: 'board', label: 'Board', Icon: Columns3 },
  { value: 'table', label: 'Table', Icon: Rows3 },
];

/**
 * Segmented control switching the Tasks page between the kanban board and the
 * grouped table. The active view is held in the `?view=` query param so it is
 * shareable and survives reloads; "board" is the default (param omitted).
 */
export function ViewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current: TaskView = searchParams.get('view') === 'table' ? 'table' : 'board';

  const select = useCallback(
    (view: TaskView) => {
      const params = new URLSearchParams(searchParams.toString());
      if (view === 'board') params.delete('view');
      else params.set('view', view);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border/60 bg-card/60 p-0.5">
      {VIEWS.map(({ value, label, Icon }) => {
        const on = current === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => select(value)}
            aria-pressed={on}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              on
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
