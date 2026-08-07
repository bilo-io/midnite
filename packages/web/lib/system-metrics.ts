import { Cpu, Gauge, MemoryStick } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { SystemMetric } from '@/lib/use-system-telemetry';

/**
 * One table describing the three host metrics, so the combined chart, the three
 * single-metric charts and the three dials can't drift apart on colour, icon or
 * wording. Adding a fourth metric means adding a row here plus its registry
 * entries — not editing seven components.
 *
 * `hueVar` is the CSS custom property the series line and the dial ring both
 * read, which is what keeps a metric the same colour wherever it appears.
 * `labelKey` points at `dashboard.systemMonitor.*`; the abbreviations stay
 * catalog keys rather than literals so a locale that spells them differently
 * (e.g. `UC`/`MEV`) isn't blocked by code.
 */
export type SystemMetricSpec = {
  id: SystemMetric;
  hueVar: string;
  icon: LucideIcon;
  /** Key under the `dashboard` namespace. */
  labelKey: string;
};

export const SYSTEM_METRICS: Record<SystemMetric, SystemMetricSpec> = {
  cpu: { id: 'cpu', hueVar: '--status-wip', icon: Cpu, labelKey: 'systemMonitor.cpu' },
  ram: { id: 'ram', hueVar: '--status-todo', icon: MemoryStick, labelKey: 'systemMonitor.ram' },
  gpu: { id: 'gpu', hueVar: '--status-done', icon: Gauge, labelKey: 'systemMonitor.gpu' },
};

/** Display order wherever all three appear together (legend, combined chart). */
export const SYSTEM_METRIC_ORDER: SystemMetric[] = ['cpu', 'ram', 'gpu'];
