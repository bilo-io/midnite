import type { TaskCounts } from '@midnite/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TILES: Array<{ key: keyof TaskCounts; label: string }> = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'inProgress', label: 'In progress' },
  { key: 'done', label: 'Done' },
];

export function DashboardTiles({ counts }: { counts: TaskCounts }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {TILES.map(({ key, label }) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle>{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tabular-nums">{counts[key]}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
