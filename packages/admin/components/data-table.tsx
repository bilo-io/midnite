import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** One column definition for {@link DataTable}. `render` maps a row → a cell. */
export type Column<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  /** Extra classes for both the header cell and the body cells (e.g. alignment). */
  className?: string;
};

/**
 * A generic, token-styled table (Phase 73 Theme F). Horizontally scrollable so a
 * wide table never overflows the page body. Reused by every operator page that
 * lists rows (users, teams, usage breakdown, audit). Row keys come from `rowKey`.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  className,
}: {
  columns: ReadonlyArray<Column<T>>;
  rows: readonly T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-lg border border-border/70', className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/70 bg-muted/30">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-border/40 last:border-b-0',
                onRowClick && 'cursor-pointer hover:bg-accent/40',
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-3 py-2 align-middle text-foreground', col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
