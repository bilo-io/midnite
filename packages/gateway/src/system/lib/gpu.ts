import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

import type { GpuStats } from '@midnite/shared';

// GPU-utilization helpers.
//
// Unlike CPU and memory, GPU load has no `node:os` equivalent and no portable
// interface — every platform exposes it somewhere different, and on some hosts
// it isn't readable at all. So this module is *best-effort by contract*: the
// shared `SystemStats.gpu` field is optional, and absence means "this host can't
// tell us", never "0%". Publishing a plausible-looking zero would be the same
// mistake `os.freemem()` made for RAM (bilo-io/midnite-app#3).
//
// The deliberate constraint is that everything here must work **unprivileged**.
// The obvious macOS answer, `powermetrics --samplers gpu_power`, needs root — a
// non-starter for a desktop app we won't ask to authenticate. `ioreg`'s
// IOAccelerator node carries the same "Device Utilization %" counter and is
// world-readable, so that's what we sample.
//
// Parsing is split into pure functions so the maths is unit-testable without the
// matching hardware to sample, mirroring `./cpu` and `./memory`.

// Absolute paths on purpose: a packaged Electron app launched from Finder
// inherits a minimal environment, so never rely on PATH resolution here.
const IOREG_BIN = '/usr/sbin/ioreg';
const PROBE_TIMEOUT_MS = 2_000;

// `nvidia-smi` is the exception — it has no fixed location across distros and
// Windows installs, so this one goes through PATH.
const NVIDIA_SMI_BIN = 'nvidia-smi';
const NVIDIA_SMI_ARGS = [
  '--query-gpu=name,utilization.gpu,memory.used,memory.total',
  '--format=csv,noheader,nounits',
];

/** Where a linux kernel driver exposes a plain integer busy-percent. */
const SYSFS_BUSY_PATHS = [
  // amdgpu
  '/sys/class/drm/card0/device/gpu_busy_percent',
  '/sys/class/drm/card1/device/gpu_busy_percent',
];

/**
 * How many consecutive failures a *supported-looking* host gets before the probe
 * latches off. A one-off hiccup (driver reload, transient EBUSY) shouldn't cost
 * the reading forever, but a host that never works shouldn't spawn a doomed
 * subprocess once a second for the life of the gateway either.
 */
const MAX_CONSECUTIVE_FAILURES = 3;

const execFileAsync = promisify(execFile);

const clampPct = (n: number): number => Math.min(Math.max(n, 0), 100);

/** Pull a `"<Label>"=<integer>` pair out of `ioreg`'s flattened dictionary text. */
function ioregNumber(output: string, label: string): number | null {
  const match = new RegExp(`"${label}"=(\\d+)`).exec(output);
  return match ? Number(match[1]) : null;
}

/**
 * Parse `ioreg -r -d 1 -c IOAccelerator` (darwin) into a sample.
 *
 * `PerformanceStatistics."Device Utilization %"` is the aggregate the accelerator
 * reports — the same counter Activity Monitor's GPU history graph draws, and it
 * needs no elevation to read.
 *
 * Memory is reported as *used only*, with no total, and that asymmetry is on
 * purpose: Apple Silicon has unified memory, so there is no VRAM figure a "GPU
 * memory %" could be a percentage *of*. `Alloc system memory` is what the driver
 * has reserved, not a device capacity, so treating it as a denominator would
 * invent a ceiling that doesn't exist. Discrete-GPU hosts (nvidia-smi) do report
 * a real total, which is why the contract carries both fields optionally.
 *
 * Returns `null` if the output isn't recognisable, so the caller can report the
 * GPU as unavailable rather than publish a number derived from a guess.
 */
export function parseIoregAccelerator(output: string): GpuStats | null {
  const usage = ioregNumber(output, 'Device Utilization %');
  if (usage === null) return null;

  const memoryUsedBytes = ioregNumber(output, 'In use system memory') ?? undefined;
  // The device dict spells this one with spaces around `=`, unlike the
  // PerformanceStatistics sub-dictionary above.
  const name = /"model" = "([^"]+)"/.exec(output)?.[1]?.trim() || undefined;

  return {
    usagePct: clampPct(usage),
    ...(name ? { name } : {}),
    ...(memoryUsedBytes !== undefined ? { memoryUsedBytes } : {}),
    source: 'ioreg',
  };
}

/**
 * Parse one CSV row of `nvidia-smi --query-gpu=name,utilization.gpu,memory.used,
 * memory.total --format=csv,noheader,nounits`. Memory columns are MiB.
 *
 * Multi-GPU hosts emit one row per device; the first is taken rather than
 * averaged — an average across a busy render GPU and an idle compute one
 * describes neither, and the widget shows a single figure.
 */
export function parseNvidiaSmi(output: string): GpuStats | null {
  const row = output.split('\n').find((line) => line.trim().length > 0);
  if (!row) return null;

  const [name, usage, used, total] = row.split(',').map((cell) => cell.trim());
  const usagePct = Number(usage);
  if (!Number.isFinite(usagePct)) return null;

  const usedMib = Number(used);
  const totalMib = Number(total);
  const hasMemory = Number.isFinite(usedMib) && Number.isFinite(totalMib) && totalMib > 0;

  return {
    usagePct: clampPct(usagePct),
    ...(name ? { name } : {}),
    ...(hasMemory
      ? { memoryUsedBytes: usedMib * 1024 * 1024, memoryTotalBytes: totalMib * 1024 * 1024 }
      : {}),
    source: 'nvidia-smi',
  };
}

/**
 * Parse an amdgpu `gpu_busy_percent` sysfs file — a bare integer, no memory
 * figures. `[GPU]` stays unnamed here: the sysfs node next door (`product_name`)
 * is not present on every driver version, and a missing name degrades better
 * than a wrong one.
 */
export function parseSysfsBusyPercent(output: string): GpuStats | null {
  const usagePct = Number(output.trim());
  if (!Number.isFinite(usagePct)) return null;
  return { usagePct: clampPct(usagePct), source: 'sysfs' };
}

/** Raised when the host has no readable GPU interface at all — latches the probe off. */
class GpuUnsupportedError extends Error {}

/** True for the "binary isn't installed" errno `execFile` reports. */
function isMissingBinary(err: unknown): boolean {
  return (err as NodeJS.ErrnoException | null)?.code === 'ENOENT';
}

async function readNvidiaSmi(): Promise<GpuStats | null> {
  try {
    const { stdout } = await execFileAsync(NVIDIA_SMI_BIN, NVIDIA_SMI_ARGS, {
      timeout: PROBE_TIMEOUT_MS,
    });
    return parseNvidiaSmi(stdout);
  } catch (err) {
    // No nvidia-smi on PATH is the common case on non-NVIDIA hosts, not a fault.
    if (isMissingBinary(err)) throw new GpuUnsupportedError('nvidia-smi not installed');
    throw err;
  }
}

async function readOnce(): Promise<GpuStats | null> {
  if (process.platform === 'darwin') {
    const { stdout } = await execFileAsync(IOREG_BIN, ['-r', '-d', '1', '-w', '0', '-c', 'IOAccelerator'], {
      timeout: PROBE_TIMEOUT_MS,
      // The IOAccelerator node dumps its scheduler state too, so the payload runs
      // to tens of KB. The default 1 MB cap is ample; pin it so a driver that
      // suddenly gets chatty fails loudly instead of silently truncating.
      maxBuffer: 4 * 1024 * 1024,
    });
    return parseIoregAccelerator(stdout);
  }

  if (process.platform === 'linux') {
    for (const path of SYSFS_BUSY_PATHS) {
      try {
        return parseSysfsBusyPercent(await readFile(path, 'utf8'));
      } catch {
        // Not this card (or not an amdgpu host) — fall through to nvidia-smi.
      }
    }
    return readNvidiaSmi();
  }

  if (process.platform === 'win32') return readNvidiaSmi();

  throw new GpuUnsupportedError(`no GPU probe for platform ${process.platform}`);
}

export type GpuProbe = {
  /** Sample the GPU, or `null` when this host can't report one. */
  read(): Promise<GpuStats | null>;
  /** False once the probe has latched off; exposed for assertions + logging. */
  readonly supported: boolean;
};

/**
 * Build a self-disabling GPU probe. `onUnavailable` is called **once**, with the
 * cause, at the moment the probe gives up — so the gateway logs a single line
 * explaining why the widget will read "unavailable" rather than either staying
 * silent or repeating the same warning every second forever.
 */
export function createGpuProbe(onUnavailable?: (err: unknown) => void): GpuProbe {
  let supported = true;
  let consecutiveFailures = 0;

  const disable = (err: unknown): null => {
    supported = false;
    onUnavailable?.(err);
    return null;
  };

  return {
    get supported() {
      return supported;
    },
    async read(): Promise<GpuStats | null> {
      if (!supported) return null;
      try {
        const sample = await readOnce();
        if (sample) {
          consecutiveFailures = 0;
          return sample;
        }
        // Reachable interface, unreadable output — count it like a failure so a
        // host whose format we don't understand latches off rather than
        // re-parsing the same unrecognised dump every tick.
        consecutiveFailures += 1;
      } catch (err) {
        if (err instanceof GpuUnsupportedError) return disable(err);
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) return disable(err);
      }
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        return disable(new Error('GPU output not recognised'));
      }
      return null;
    },
  };
}
