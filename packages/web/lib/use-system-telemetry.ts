'use client';

import { useEffect, useRef, useState } from 'react';
import { useSystemStats } from '@/lib/use-system-stats';

// Number of samples held in the rolling CPU/RAM charts.
export const SERIES_LEN = 32;

export type SystemTelemetry = {
  cpu: number[];
  ram: number[];
  cpuNow: number;
  ramNow: number;
  /** False until the first successful sample (e.g. gateway unreachable). */
  available: boolean;
};

/**
 * Real CPU/RAM telemetry as two rolling series, so the screensaver corner readout
 * and the System-monitor dashboard widget render identical live charts. Backed by
 * the shared `useSystemStats` poll — mounting both surfaces still polls the host
 * just once. Replaces the earlier client-side simulation with measured values.
 */
export function useSystemTelemetry(): SystemTelemetry {
  const { stats } = useSystemStats();

  const [cpu, setCpu] = useState<number[]>(() => Array<number>(SERIES_LEN).fill(0));
  const [ram, setRam] = useState<number[]>(() => Array<number>(SERIES_LEN).fill(0));
  const lastSampledAt = useRef<string | null>(null);

  // Append each fresh sample; the first reading seeds a flat line (no ramp from 0).
  useEffect(() => {
    if (!stats || stats.sampledAt === lastSampledAt.current) return;
    const first = lastSampledAt.current === null;
    lastSampledAt.current = stats.sampledAt;
    const cpuPct = stats.cpu.usagePct;
    const ramPct = stats.memory.usagePct;
    setCpu((prev) => (first ? Array<number>(SERIES_LEN).fill(cpuPct) : [...prev.slice(1), cpuPct]));
    setRam((prev) => (first ? Array<number>(SERIES_LEN).fill(ramPct) : [...prev.slice(1), ramPct]));
  }, [stats]);

  return {
    cpu,
    ram,
    cpuNow: stats ? Math.round(stats.cpu.usagePct) : 0,
    ramNow: stats ? Math.round(stats.memory.usagePct) : 0,
    available: Boolean(stats),
  };
}
