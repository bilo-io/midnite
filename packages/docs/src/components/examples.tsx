import { useState } from 'react';

import { Input, Switch, Tabs, type TabOption } from '@midnite/ui';

// Controlled wrappers so the stateful primitives are genuinely interactive inside
// the (otherwise static) MDX pages — the reader toggles the real component.

export function SwitchDemo() {
  const [on, setOn] = useState(false);
  return <Switch checked={on} onCheckedChange={setOn} aria-label="Demo toggle" />;
}

type DemoView = 'board' | 'office' | 'workflows';

const VIEW_OPTIONS: TabOption<DemoView>[] = [
  { value: 'board', label: 'Board' },
  { value: 'office', label: 'Office' },
  { value: 'workflows', label: 'Workflows' },
];

export function TabsDemo() {
  const [view, setView] = useState<DemoView>('board');
  return <Tabs<DemoView> ariaLabel="Demo view" options={VIEW_OPTIONS} value={view} onChange={setView} />;
}

export function InputDemo() {
  return <Input placeholder="you@example.com" aria-label="Email" className="max-w-xs" />;
}
