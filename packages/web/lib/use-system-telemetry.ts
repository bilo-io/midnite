'use client';

import { useEffect, useState } from 'react';
import { clamp } from '@/lib/utils';

// Number of samples held in the rolling CPU/RAM charts.
export const SERIES_LEN = 32;

function seedSeries(base: number): number[] {
  return Array.from({ length: SERIES_LEN }, () => clamp(base + (Math.random() - 0.5) * 18, 4, 96));
}

// Smooth random walk: drop the oldest sample, append a nudged new one.
function walkSeries(prev: number[], spread: number, lo: number, hi: number): number[] {
  const last = prev[prev.length - 1] ?? 50;
  return [...prev.slice(1), clamp(last + (Math.random() - 0.5) * spread, lo, hi)];
}

export type SystemTelemetry = { cpu: number[]; ram: number[]; cpuNow: number; ramNow: number };

/**
 * Simulated CPU/RAM telemetry: two rolling series that random-walk once a second.
 * There is no real host-metrics source yet, so the screensaver corner readout and
 * the System monitor dashboard widget share this client-side simulation to stay
 * visually identical. Each caller gets its own independent walk.
 */
export function useSystemTelemetry(): SystemTelemetry {
  const [cpu, setCpu] = useState<number[]>(() => seedSeries(38));
  const [ram, setRam] = useState<number[]>(() => seedSeries(56));

  useEffect(() => {
    const id = setInterval(() => {
      setCpu((prev) => walkSeries(prev, 22, 5, 96));
      setRam((prev) => walkSeries(prev, 9, 22, 92));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return {
    cpu,
    ram,
    cpuNow: Math.round(cpu[cpu.length - 1] ?? 0),
    ramNow: Math.round(ram[ram.length - 1] ?? 0),
  };
}
