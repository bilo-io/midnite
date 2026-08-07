'use client';

import { useEffect, useRef, useState } from 'react';
import { useSystemStats } from '@/lib/use-system-stats';

// Number of samples held in the rolling CPU/RAM/GPU charts.
export const SERIES_LEN = 32;

/** The three host metrics the charts and dials plot. */
export type SystemMetric = 'cpu' | 'ram' | 'gpu';

export type SystemTelemetry = {
  cpu: number[];
  ram: number[];
  /**
   * The GPU series, or `null` on a host that can't report GPU load. Null rather
   * than a zero-filled array on purpose: the gateway omits `stats.gpu` when it
   * can't measure, and a flat line at 0 would claim an idle GPU we never read.
   */
  gpu: number[] | null;
  cpuNow: number;
  ramNow: number;
  gpuNow: number | null;
  /** Adapter name, when the host reports one (e.g. `Apple M2 Pro`). */
  gpuName: string | null;
  /** False until the first successful sample (e.g. gateway unreachable). */
  available: boolean;
};

/**
 * Real CPU/RAM/GPU telemetry as rolling series, so the screensaver corner readout
 * and the System-monitor dashboard widgets render identical live charts. Backed by
 * the shared `useSystemStats` poll — mounting every surface still polls the host
 * just once. Replaces the earlier client-side simulation with measured values.
 *
 * GPU is the only optional one: `SystemStats.gpu` is absent on hosts with no
 * unprivileged GPU interface, and that absence is carried all the way through to
 * the UI as `null` so a widget can say "unavailable" instead of drawing a zero.
 */
export function useSystemTelemetry(): SystemTelemetry {
  const { stats } = useSystemStats();

  const [cpu, setCpu] = useState<number[]>(() => Array<number>(SERIES_LEN).fill(0));
  const [ram, setRam] = useState<number[]>(() => Array<number>(SERIES_LEN).fill(0));
  const [gpu, setGpu] = useState<number[] | null>(null);
  const lastSampledAt = useRef<string | null>(null);

  // Append each fresh sample; the first reading seeds a flat line (no ramp from 0).
  useEffect(() => {
    if (!stats || stats.sampledAt === lastSampledAt.current) return;
    const first = lastSampledAt.current === null;
    lastSampledAt.current = stats.sampledAt;
    const cpuPct = stats.cpu.usagePct;
    const ramPct = stats.memory.usagePct;
    const gpuPct = stats.gpu?.usagePct ?? null;
    setCpu((prev) => (first ? Array<number>(SERIES_LEN).fill(cpuPct) : [...prev.slice(1), cpuPct]));
    setRam((prev) => (first ? Array<number>(SERIES_LEN).fill(ramPct) : [...prev.slice(1), ramPct]));
    setGpu((prev) => {
      if (gpuPct === null) return null;
      // Seed a flat line both on the very first sample *and* the first sample
      // after the GPU becomes readable, so a late-arriving series doesn't ramp
      // in from an imaginary zero.
      return prev === null ? Array<number>(SERIES_LEN).fill(gpuPct) : [...prev.slice(1), gpuPct];
    });
  }, [stats]);

  return {
    cpu,
    ram,
    gpu,
    cpuNow: stats ? Math.round(stats.cpu.usagePct) : 0,
    ramNow: stats ? Math.round(stats.memory.usagePct) : 0,
    gpuNow: stats?.gpu ? Math.round(stats.gpu.usagePct) : null,
    gpuName: stats?.gpu?.name ?? null,
    available: Boolean(stats),
  };
}
