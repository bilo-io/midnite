import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import { promisify } from 'node:util';

// Physical-memory helpers.
//
// `os.freemem()` is not what a user means by "free". On darwin and linux it maps
// to the kernel's *truly free* page count, which excludes the file cache, the
// inactive list and (on darwin) the compressor — memory the OS will hand back on
// demand. Deriving `used = total - freemem()` therefore reads ~99% on a perfectly
// healthy machine, which is what bilo-io/midnite-app#3 reported against Activity
// Monitor. The fix is to compute *available* memory per platform and derive used
// from that. Parsing is split out as pure functions so the byte maths is
// unit-testable without a host to sample, mirroring `./cpu`.
//
// Windows is the exception: there libuv's `uv_get_free_memory` already returns
// `MEMORYSTATUSEX.ullAvailPhys` (available, not free), so `os.freemem()` is
// correct and is used directly.

const VM_STAT_TIMEOUT_MS = 2_000;

const execFileAsync = promisify(execFile);

export type MemorySample = {
  totalBytes: number;
  /** Memory genuinely committed — what Activity Monitor calls "Memory Used". */
  usedBytes: number;
  /** Memory the OS can hand out without paging (free + reclaimable cache). */
  availableBytes: number;
  /** `usedBytes / totalBytes` as 0–100, one decimal place. */
  usagePct: number;
};

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Build a sample from a total and an available figure, clamping both into the
 * range the shared contract promises (`usagePct` 0–100, byte counts
 * non-negative) so an implausible host reading can never fail zod validation.
 */
export function fromAvailable(totalBytes: number, availableBytes: number): MemorySample {
  const available = Math.min(Math.max(availableBytes, 0), Math.max(totalBytes, 0));
  const used = Math.max(totalBytes, 0) - available;
  return {
    totalBytes,
    usedBytes: used,
    availableBytes: available,
    usagePct: totalBytes > 0 ? round1((used / totalBytes) * 100) : 0,
  };
}

/** Pull `<count>` out of a `<Label>: <count>.` line of `vm_stat` output. */
function vmStatPages(output: string, label: string): number | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^${escaped}:\\s+(\\d+)\\.?\\s*$`, 'm').exec(output);
  return match ? Number(match[1]) : null;
}

/**
 * Parse `vm_stat` (darwin) into a sample, using Activity Monitor's own
 * definition of "Memory Used" — App Memory (anonymous pages minus the purgeable
 * ones) + Wired + Compressed. Notably that counts *inactive anonymous* pages as
 * used (they can only be compressed or swapped, never simply dropped) while
 * excluding every file-backed page (pure cache, reclaimable at will).
 *
 * Returns `null` if the output isn't recognisable — the caller then degrades to
 * `os.freemem()` rather than publishing a number derived from a guess. The page
 * size is read from the header for the same reason: assuming 4 KiB would be
 * wrong by 4× on Apple Silicon.
 */
export function parseVmStat(output: string, totalBytes: number): MemorySample | null {
  const pageSize = Number(/page size of (\d+) bytes/.exec(output)?.[1] ?? 0);
  if (!pageSize) return null;

  const anonymous = vmStatPages(output, 'Anonymous pages');
  const purgeable = vmStatPages(output, 'Pages purgeable');
  const wired = vmStatPages(output, 'Pages wired down');
  const compressed = vmStatPages(output, 'Pages occupied by compressor');
  if (anonymous === null || purgeable === null || wired === null || compressed === null) return null;

  const usedPages = Math.max(anonymous - purgeable, 0) + wired + compressed;
  return fromAvailable(totalBytes, totalBytes - usedPages * pageSize);
}

/** Pull `<Label>: <n> kB` out of `/proc/meminfo`, in bytes. */
function memInfoBytes(output: string, label: string): number | null {
  const match = new RegExp(`^${label}:\\s+(\\d+)\\s*kB`, 'm').exec(output);
  return match ? Number(match[1]) * 1024 : null;
}

/**
 * Parse `/proc/meminfo` (linux) into a sample. `MemAvailable` is the kernel's
 * own estimate of what can be allocated without swapping — the same number
 * `free` prints in its "available" column — so it is used verbatim when present.
 * Kernels older than 3.14 don't export it; there we approximate the way `free`
 * itself used to, with free + buffers + cached.
 */
export function parseMemInfo(output: string): MemorySample | null {
  const totalBytes = memInfoBytes(output, 'MemTotal');
  if (totalBytes === null) return null;

  const available = memInfoBytes(output, 'MemAvailable');
  if (available !== null) return fromAvailable(totalBytes, available);

  const free = memInfoBytes(output, 'MemFree');
  if (free === null) return null;
  const buffers = memInfoBytes(output, 'Buffers') ?? 0;
  const cached = memInfoBytes(output, 'Cached') ?? 0;
  return fromAvailable(totalBytes, free + buffers + cached);
}

/**
 * Sample host memory, degrading to `os.freemem()` on any platform we can't probe
 * (or when the probe fails). `onDegrade` is called with the cause so the caller
 * can log it once — a failed probe is expected on exotic hosts, not fatal.
 */
export async function readMemory(onDegrade?: (err: unknown) => void): Promise<MemorySample> {
  const totalBytes = os.totalmem();
  try {
    if (process.platform === 'darwin') {
      const { stdout } = await execFileAsync('vm_stat', [], { timeout: VM_STAT_TIMEOUT_MS });
      const sample = parseVmStat(stdout, totalBytes);
      if (sample) return sample;
      onDegrade?.(new Error('vm_stat output not recognised'));
    } else if (process.platform === 'linux') {
      const sample = parseMemInfo(await readFile('/proc/meminfo', 'utf8'));
      if (sample) return sample;
      onDegrade?.(new Error('/proc/meminfo output not recognised'));
    }
  } catch (err) {
    onDegrade?.(err);
  }
  // On win32 this is already available memory; elsewhere it's a pessimistic
  // floor, which beats reporting nothing.
  return fromAvailable(totalBytes, os.freemem());
}
