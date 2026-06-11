import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { FilterPills, type FilterOption } from './filter-pills';
import { COLUMNS } from './task-columns';

const statusOptions: FilterOption[] = COLUMNS.map((c) => ({
  value: c.status,
  label: c.label,
  hue: `var(${c.hueVar})`,
}));

const projectOptions: FilterOption[] = [
  { value: 'proj-web', label: 'Midnite Web', color: '#7c3aed' },
  { value: 'proj-gw', label: 'Gateway', color: '#0ea5e9' },
  { value: 'proj-docs', label: 'Docs', color: '#facc15' },
];

const meta = {
  title: 'Components/FilterPills',
  component: FilterPills,
  // The query param is the source of truth. Storybook's router mock logs
  // `router.replace` to the Actions panel but doesn't feed it back into
  // `useSearchParams`, so each story pins a URL state instead of toggling live.
  parameters: {
    nextjs: { navigation: { pathname: '/tasks' } },
  },
} satisfies Meta<typeof FilterPills>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No query param set — the "All" pill is active. */
export const NoneSelected: Story = {
  args: { options: statusOptions },
};

/** `/tasks?status=todo,wip` — two status pills lit with their column hues. */
export const SomeSelected: Story = {
  args: { options: statusOptions },
  parameters: {
    nextjs: { navigation: { pathname: '/tasks', query: { status: 'todo,wip' } } },
  },
};

/** Project pills carry raw hex colors instead of status hues. */
export const ProjectColors: Story = {
  args: { options: projectOptions, paramKey: 'project', allLabel: 'All projects' },
  parameters: {
    nextjs: { navigation: { pathname: '/tasks', query: { project: 'proj-web' } } },
  },
};
