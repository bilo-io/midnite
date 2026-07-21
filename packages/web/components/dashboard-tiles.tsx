import Link from 'next/link';
import type { TaskCounts } from '@midnite/shared';

export const TILES: Array<{
  key: keyof TaskCounts;
  label: string;
  hint: string;
  hueVar: string;
  href: string;
}> = [
  { key: 'backlog',    label: 'Backlog',      hint: 'Parked or ambiguous',          hueVar: '--status-backlog', href: '/tasks?status=backlog' },
  { key: 'todo',       label: 'Todo',         hint: 'Queued, ready to start',       hueVar: '--status-todo',    href: '/tasks?status=todo' },
  { key: 'inProgress', label: 'In progress',  hint: 'Running or waiting on input',  hueVar: '--status-wip',     href: '/tasks?status=wip,waiting' },
  { key: 'done',       label: 'Done',         hint: 'Completed',                    hueVar: '--status-done',    href: '/tasks?status=done' },
];

interface DashboardTileProps {
  tile: (typeof TILES)[number];
  value: number;
  total: number;
}

export function DashboardTile({ tile, value, total }: DashboardTileProps) {
  const { label, hint, hueVar, href } = tile;
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border surface-glass-interactive p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{ ['--tile-hue' as string]: `var(${hueVar})` }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ backgroundImage: 'linear-gradient(to right, transparent, hsl(var(--tile-hue) / 0.7), transparent)' }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity group-hover:opacity-60"
        style={{ background: 'hsl(var(--tile-hue) / 0.35)' }}
      />
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-2 w-2 rounded-full"
          style={{ background: 'hsl(var(--tile-hue))', boxShadow: '0 0 10px -1px hsl(var(--tile-hue) / 0.7)' }}
        />
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</h3>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-4xl font-semibold tabular-nums tracking-tight">{value}</div>
        {total > 0 && <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Link>
  );
}

export function DashboardTiles({ counts }: { counts: TaskCounts }) {
  const total =
    (counts.backlog ?? 0) + (counts.todo ?? 0) + (counts.inProgress ?? 0) + (counts.done ?? 0);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TILES.map(({ key }) => (
        <DashboardTile
          key={key}
          tile={TILES.find((t) => t.key === key)!}
          value={counts[key] ?? 0}
          total={total}
        />
      ))}
    </div>
  );
}
